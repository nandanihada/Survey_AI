"""
Referral / Refer-and-Earn API
Handles: promoter registration, summary, activity, admin views, payouts
"""
from flask import Blueprint, request, jsonify, g
from auth_middleware import requireAuth, requireAdmin
from mongodb_config import db
from datetime import datetime, timedelta
import random
import string
from bson import ObjectId

referral_bp = Blueprint('referral', __name__)

# Return 200 for every OPTIONS preflight before any auth decorator runs
@referral_bp.before_request
def handle_options():
    if request.method == 'OPTIONS':
        from flask import make_response
        resp = make_response('', 200)
        return resp

# ─── Helpers ──────────────────────────────────────────────────────────────────

SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   # no 0/O 1/I/L

def _gen_code(length=7):
    return ''.join(random.choices(SAFE_CHARS, k=length))

def _unique_code():
    for _ in range(10):
        code = _gen_code()
        if not db.promoters.find_one({'ref_code': code}):
            return code
    raise RuntimeError('Could not generate unique ref_code after 10 attempts')

def _oid(doc):
    """Safely convert _id to str in a dict."""
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

def _fmt_user_id(user):
    """Return consistent string user id from a user doc."""
    return str(user.get('_id', ''))

# ─── Ensure indexes exist (called at startup) ─────────────────────────────────

def setup_referral_indexes():
    try:
        db.promoters.create_index('ref_code', unique=True)
        db.promoters.create_index('user_id', unique=True)
        db.referral_attributions.create_index('visitor_id', unique=True)
        db.referral_attributions.create_index([('ref_code', 1), ('first_seen', -1)])
        db.referral_attributions.create_index('user_id')
        db.referral_events.create_index([('ref_code', 1), ('status', 1)])
        db.referral_events.create_index(
            [('status', 1), ('eligible_at', 1)],
            partialFilterExpression={'status': 'pending'}
        )
        # Idempotency: one credit per subscription per billing month
        db.referral_events.create_index(
            [('subscription_id', 1), ('billing_period', 1)],
            unique=True,
            partialFilterExpression={'type': {'$in': ['subscription_monthly', 'subscription_annual']},
                                     'subscription_id': {'$exists': True},
                                     'billing_period': {'$exists': True}}
        )
        # One signup credit per user ever
        db.referral_events.create_index(
            [('user_id', 1)],
            unique=True,
            partialFilterExpression={'type': 'signup'}
        )
        db.referral_payouts.create_index('ref_code')
        print('✅ Referral indexes ensured')
    except Exception as e:
        print(f'⚠️ Referral index setup warning: {e}')

# ─── Partner (promoter-facing) endpoints ──────────────────────────────────────

@referral_bp.route('/api/partner/join', methods=['POST', 'OPTIONS'])
@requireAuth
def join_program():
    """Register the current user as a promoter and get their ref_code."""
    if request.method == 'OPTIONS':
        return '', 200

    user = g.current_user
    uid = _fmt_user_id(user)

    existing = db.promoters.find_one({'user_id': uid})
    if existing:
        return jsonify({
            'ref_code': existing['ref_code'],
            'link': _make_link(existing['ref_code']),
            'already_member': True
        }), 200

    ref_code = _unique_code()
    doc = {
        'user_id':      uid,
        'ref_code':     ref_code,
        'display_name': user.get('name') or user.get('email', '').split('@')[0],
        'payout_method': {},
        'status':       'active',
        'created_at':   datetime.utcnow(),
    }
    db.promoters.insert_one(doc)
    return jsonify({'ref_code': ref_code, 'link': _make_link(ref_code), 'already_member': False}), 201


@referral_bp.route('/api/partner/summary', methods=['GET', 'OPTIONS'])
@requireAuth
def partner_summary():
    if request.method == 'OPTIONS':
        return '', 200

    user   = g.current_user
    uid    = _fmt_user_id(user)
    promo  = db.promoters.find_one({'user_id': uid})
    if not promo or promo.get('status') != 'active':
        return jsonify({'error': 'Not a promoter'}), 404

    rc = promo['ref_code']

    # Clicks
    clicks_total  = db.referral_events.count_documents({'ref_code': rc, 'type': 'session'})
    clicks_unique = db.referral_attributions.count_documents({'ref_code': rc})

    # Signups
    signups_confirmed = db.referral_events.count_documents(
        {'ref_code': rc, 'type': 'signup', 'status': 'approved'})
    signups_pending   = db.referral_events.count_documents(
        {'ref_code': rc, 'type': 'signup', 'status': 'pending'})

    # Subscriptions
    subs_active = db.referral_events.count_documents(
        {'ref_code': rc, 'type': 'subscription_monthly', 'status': {'$in': ['pending', 'approved']}})
    mrr_cents = subs_active * 400

    # Balance
    bal_available = _available_balance(rc)
    bal_pending   = _pending_balance(rc)

    return jsonify({
        'ref_code':               rc,
        'link':                   _make_link(rc),
        'clicks_total':           clicks_total,
        'clicks_unique':          clicks_unique,
        'signups_confirmed':      signups_confirmed,
        'signups_pending':        signups_pending,
        'subscriptions_active':   subs_active,
        'mrr_cents':              mrr_cents,
        'balance_available_cents': bal_available,
        'balance_pending_cents':  bal_pending,
    })


@referral_bp.route('/api/partner/activity', methods=['GET', 'OPTIONS'])
@requireAuth
def partner_activity():
    if request.method == 'OPTIONS':
        return '', 200

    user  = g.current_user
    uid   = _fmt_user_id(user)
    promo = db.promoters.find_one({'user_id': uid})
    if not promo:
        return jsonify([])

    rc     = promo['ref_code']
    limit  = min(int(request.args.get('limit', 50)), 200)
    cursor = request.args.get('cursor')

    query = {'ref_code': rc}
    if cursor:
        query['_id'] = {'$lt': ObjectId(cursor)}

    events = list(
        db.referral_events.find(query)
        .sort('occurred_at', -1)
        .limit(limit)
    )

    rows = []
    counter = 1
    for ev in events:
        attr = db.referral_attributions.find_one({'_id': ev.get('attribution_id')}) or {}
        rows.append({
            'visitor_label':  f'Visitor #{counter:04d}',
            'occurred_at':    ev['occurred_at'].isoformat() if isinstance(ev['occurred_at'], datetime) else ev['occurred_at'],
            'city':           attr.get('city') or ev.get('city', ''),
            'country':        attr.get('country') or ev.get('country', ''),
            'signup_status':  _signup_status(ev),
            'plan':           _plan_label(ev),
            'amount_cents':   ev.get('amount_cents', 0),
        })
        counter += 1

    return jsonify(rows)

@referral_bp.route('/api/partner/payout', methods=['POST', 'OPTIONS'])
@requireAuth
def request_payout():
    if request.method == 'OPTIONS':
        return '', 200

    user  = g.current_user
    uid   = _fmt_user_id(user)
    promo = db.promoters.find_one({'user_id': uid})
    if not promo:
        return jsonify({'error': 'Not a promoter'}), 404

    # Require at least one payment method
    payout_method = promo.get('payout_method', {})
    has_method = any([
        payout_method.get('bank', {}).get('account_number'),
        payout_method.get('paypal', {}).get('email'),
        payout_method.get('crypto', {}).get('wallet_address'),
    ])
    if not has_method:
        return jsonify({'error': 'Please add a payment method before requesting payout'}), 400

    rc      = promo['ref_code']
    amount  = _available_balance(rc)
    if amount < 2500:   # €25 minimum
        return jsonify({'error': 'Minimum payout is €25.00. Keep earning!'}), 400

    # Find all approved unpaid events
    paid_event_ids = set(
        pe['event_id'] for pe in db.referral_payout_events.find({}, {'event_id': 1})
    )
    eligible = list(db.referral_events.find({
        'ref_code': rc, 'status': 'approved',
        '_id': {'$nin': list(paid_event_ids)}
    }))
    if not eligible:
        return jsonify({'error': 'No approved earnings available'}), 400

    payout_doc = {
        'ref_code':     rc,
        'amount_cents': amount,
        'status':       'requested',
        'method':       payout_method,
        'requested_at': datetime.utcnow(),
    }
    payout_res = db.referral_payouts.insert_one(payout_doc)
    payout_id  = payout_res.inserted_id

    # Link events to payout
    db.referral_payout_events.insert_many([
        {'payout_id': payout_id, 'event_id': ev['_id']} for ev in eligible
    ])

    return jsonify({
        'payout_id':    str(payout_id),
        'amount_cents': amount,
        'status':       'requested',
    }), 201


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@referral_bp.route('/api/admin/referrals/liability', methods=['GET', 'OPTIONS'])
@requireAdmin
def admin_liability():
    if request.method == 'OPTIONS':
        return '', 200

    # Payable now
    paid_ids   = set(pe['event_id'] for pe in db.referral_payout_events.find({}, {'event_id': 1}))
    payable_pipeline = [
        {'$match': {'status': 'approved', '_id': {'$nin': list(paid_ids)}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount_cents'}}}
    ]
    payable_res = list(db.referral_events.aggregate(payable_pipeline))
    payable_now = payable_res[0]['total'] if payable_res else 0

    # Recurring liability (active monthly sub events × 400)
    active_monthly = db.referral_events.count_documents({
        'type': 'subscription_monthly',
        'status': {'$in': ['pending', 'approved']}
    })

    # Signups on hold
    hold_pipeline = [
        {'$match': {'type': 'signup', 'status': 'pending'}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount_cents'}, 'count': {'$sum': 1}}}
    ]
    hold_res = list(db.referral_events.aggregate(hold_pipeline))
    signups_hold_cents = hold_res[0]['total'] if hold_res else 0
    signups_hold_count = hold_res[0]['count'] if hold_res else 0

    # Churned (subscriptions that were active but now have no recent event)
    churned = db.referral_events.count_documents({'type': 'subscription_monthly', 'status': 'reversed'})

    # Surveys created (real activations proxy)
    surveys_count = db.surveys.count_documents({})

    return jsonify({
        'payable_now_cents':          payable_now,
        'recurring_liability_cents':  active_monthly * 400,
        'signups_on_hold_cents':      signups_hold_cents,
        'signups_on_hold_count':      signups_hold_count,
        'churned_count':              churned,
        'surveys_created_count':      surveys_count,
    })


@referral_bp.route('/api/admin/referrals/events', methods=['GET', 'OPTIONS'])
@requireAdmin
def admin_events():
    if request.method == 'OPTIONS':
        return '', 200

    ref_code = request.args.get('ref_code')
    status   = request.args.get('status')
    flagged  = request.args.get('flagged')

    query = {}
    if ref_code:
        query['ref_code'] = ref_code
    if status and status != 'all':
        query['status'] = status
    if flagged == 'true':
        query['flags'] = {'$not': {'$size': 0}}

    events = list(db.referral_events.find(query).sort('occurred_at', -1).limit(200))
    rows   = []
    for ev in events:
        flags_count = len(ev.get('flags', []))
        attr = db.referral_attributions.find_one({'_id': ev.get('attribution_id')}) or {}
        rows.append({
            'id':              str(ev['_id']),
            'session_id':      ev.get('session_id', '—'),
            'ref_code':        ev.get('ref_code', ''),
            'signup_email':    _safe_email(ev.get('user_id')),
            'signup_status':   _signup_status(ev),
            'subscription_id': ev.get('subscription_id'),
            'sub_amount_cents': ev.get('amount_cents') if ev.get('type', '').startswith('subscription') else None,
            'ip_display':      attr.get('ip_hash', '—')[:15] if attr.get('ip_hash') else '—',
            'city':            attr.get('city') or ev.get('city', '—'),
            'flags_count':     flags_count,
            'status':          ev.get('status', 'pending'),
            'occurred_at':     ev['occurred_at'].isoformat() if isinstance(ev.get('occurred_at'), datetime) else str(ev.get('occurred_at', '')),
        })
    return jsonify(rows)


@referral_bp.route('/api/admin/referrals/promoters', methods=['GET', 'OPTIONS'])
@requireAdmin
def admin_promoters():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        promos = list(db.promoters.find({}))
        result = []
        for p in promos:
            rc = p['ref_code']

            pm = p.get('payout_method', {})
            methods_saved = []
            if pm.get('bank', {}).get('account_number'):
                methods_saved.append('bank')
            if pm.get('paypal', {}).get('email'):
                methods_saved.append('paypal')
            if pm.get('crypto', {}).get('wallet_address'):
                methods_saved.append('crypto')

            bal_available = _available_balance(rc)
            bal_pending   = _pending_balance(rc)

            total_clicks  = db.referral_events.count_documents({'ref_code': rc, 'type': 'session'})
            total_signups = db.referral_events.count_documents({'ref_code': rc, 'type': 'signup'})

            user_email = ''
            try:
                user = db.users.find_one({'_id': ObjectId(str(p['user_id']))}, {'email': 1})
                if user:
                    user_email = user.get('email', '')
            except Exception:
                pass

            created = p.get('created_at')
            result.append({
                'ref_code':                rc,
                'display_name':            p.get('display_name', ''),
                'user_email':              user_email,
                'status':                  p.get('status', 'active'),
                'created_at':              created.isoformat() if isinstance(created, datetime) else str(created or ''),
                'methods_saved':           methods_saved,
                'has_payment':             len(methods_saved) > 0,
                'balance_available_cents': bal_available,
                'balance_pending_cents':   bal_pending,
                'total_clicks':            total_clicks,
                'total_signups':           total_signups,
                'link':                    _make_link(rc),
            })

        result.sort(key=lambda x: (not x['has_payment'], x['created_at']))
        return jsonify(result)

    except Exception as e:
        import traceback
        print(f'❌ admin_promoters error: {traceback.format_exc()}')
        return jsonify({'error': str(e)}), 500


@referral_bp.route('/api/admin/referrals/promoters/<ref_code>/payment', methods=['GET', 'OPTIONS'])
@requireAdmin
def admin_promoter_payment(ref_code):
    """Return full (unmasked) payment details for a specific promoter. Admin only."""
    if request.method == 'OPTIONS':
        return '', 200

    promo = db.promoters.find_one({'ref_code': ref_code})
    if not promo:
        return jsonify({'error': 'Promoter not found'}), 404

    pm = promo.get('payout_method', {})
    return jsonify({
        'ref_code':      ref_code,
        'display_name':  promo.get('display_name', ''),
        'bank':   pm.get('bank'),
        'paypal': pm.get('paypal'),
        'crypto': pm.get('crypto'),
    })



    if request.method == 'OPTIONS':
        return '', 200

    data   = request.json or {}
    reason = data.get('reason', '').strip()
    if not reason:
        return jsonify({'error': 'reason is required'}), 400

    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify({'error': 'Invalid event id'}), 400

    ev = db.referral_events.find_one({'_id': oid})
    if not ev:
        return jsonify({'error': 'Event not found'}), 404
    if ev.get('status') == 'reversed':
        return jsonify({'error': 'Already reversed'}), 409

    # Mark original as reversed
    db.referral_events.update_one({'_id': oid}, {
        '$set': {
            'status':      'reversed',
            'reviewed_at': datetime.utcnow(),
            'reject_reason': reason,
        }
    })
    # Insert compensating row
    compensating = {
        'ref_code':       ev['ref_code'],
        'attribution_id': ev.get('attribution_id'),
        'type':           ev['type'],
        'status':         'reversed',
        'amount_cents':   -ev['amount_cents'],
        'currency':       ev.get('currency', 'EUR'),
        'session_id':     ev.get('session_id'),
        'user_id':        ev.get('user_id'),
        'subscription_id': ev.get('subscription_id'),
        'billing_period': ev.get('billing_period'),
        'occurred_at':    datetime.utcnow(),
        'eligible_at':    None,
        'reject_reason':  f'Compensating row for reversal of {event_id}: {reason}',
        'flags':          [],
        'created_at':     datetime.utcnow(),
    }
    db.referral_events.insert_one(compensating)
    return jsonify({'success': True})


@referral_bp.route('/api/admin/referrals/events/<event_id>/restore', methods=['POST', 'OPTIONS'])
@requireAdmin
def admin_restore_event(event_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify({'error': 'Invalid event id'}), 400
    db.referral_events.update_one({'_id': oid}, {'$set': {'status': 'pending', 'reviewed_at': datetime.utcnow()}})
    return jsonify({'success': True})


@referral_bp.route('/api/admin/referrals/bulk-reverse', methods=['POST', 'OPTIONS'])
@requireAdmin
def admin_bulk_reverse():
    if request.method == 'OPTIONS':
        return '', 200
    data   = request.json or {}
    ids    = data.get('event_ids', [])
    reason = data.get('reason', 'bulk admin reversal')
    count  = 0
    for eid in ids:
        try:
            oid = ObjectId(eid)
            ev  = db.referral_events.find_one({'_id': oid})
            if ev and ev.get('status') != 'reversed':
                db.referral_events.update_one({'_id': oid}, {
                    '$set': {'status': 'reversed', 'reviewed_at': datetime.utcnow(), 'reject_reason': reason}
                })
                count += 1
        except Exception:
            pass
    return jsonify({'reversed_count': count})


@referral_bp.route('/api/admin/referrals/promoter-view/<ref_code>', methods=['GET', 'OPTIONS'])
@requireAdmin
def admin_promoter_view(ref_code):
    """Admin viewing a specific promoter's data."""
    if request.method == 'OPTIONS':
        return '', 200

    promo = db.promoters.find_one({'ref_code': ref_code})
    if not promo:
        return jsonify({'error': 'Promoter not found'}), 404

    clicks_total  = db.referral_events.count_documents({'ref_code': ref_code, 'type': 'session'})
    clicks_unique = db.referral_attributions.count_documents({'ref_code': ref_code})
    subs_active   = db.referral_events.count_documents(
        {'ref_code': ref_code, 'type': 'subscription_monthly', 'status': {'$in': ['pending', 'approved']}})
    bal_available = _available_balance(ref_code)
    bal_pending   = _pending_balance(ref_code)

    events = list(db.referral_events.find({'ref_code': ref_code}).sort('occurred_at', -1).limit(100))
    activity = []
    for i, ev in enumerate(events):
        attr = db.referral_attributions.find_one({'_id': ev.get('attribution_id')}) or {}
        activity.append({
            'visitor_label': f'Visitor #{i+1:04d}',
            'occurred_at':   ev['occurred_at'].isoformat() if isinstance(ev.get('occurred_at'), datetime) else '',
            'city':          attr.get('city') or ev.get('city', ''),
            'country':       attr.get('country') or ev.get('country', ''),
            'signup_status': _signup_status(ev),
            'plan':          _plan_label(ev),
            'amount_cents':  ev.get('amount_cents', 0),
        })

    return jsonify({
        'ref_code':               ref_code,
        'display_name':           promo.get('display_name', ''),
        'link':                   _make_link(ref_code),
        'clicks_total':           clicks_total,
        'clicks_unique':          clicks_unique,
        'subscriptions_active':   subs_active,
        'mrr_cents':              subs_active * 400,
        'balance_available_cents': bal_available,
        'balance_pending_cents':  bal_pending,
        'activity':               activity,
    })

# ─── Private helpers ──────────────────────────────────────────────────────────

def _make_link(ref_code):
    import os
    base = os.getenv('FRONTEND_URL', 'https://survey.pepperwahl.com')
    return f'{base}/signup?ref={ref_code}'

def _available_balance(ref_code):
    paid_ids = set(pe['event_id'] for pe in db.referral_payout_events.find({}, {'event_id': 1}))
    pipeline = [
        {'$match': {'ref_code': ref_code, 'status': 'approved', '_id': {'$nin': list(paid_ids)}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount_cents'}}}
    ]
    res = list(db.referral_events.aggregate(pipeline))
    return res[0]['total'] if res else 0

def _pending_balance(ref_code):
    pipeline = [
        {'$match': {'ref_code': ref_code, 'status': 'pending'}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount_cents'}}}
    ]
    res = list(db.referral_events.aggregate(pipeline))
    return res[0]['total'] if res else 0

def _signup_status(ev):
    if ev.get('type') != 'signup':
        return None
    if ev.get('status') == 'approved':
        return 'confirmed'
    if ev.get('status') == 'pending':
        # Check eligible_at to show days remaining
        eligible_at = ev.get('eligible_at')
        if eligible_at:
            days_left = (eligible_at - datetime.utcnow()).days
            if days_left > 0:
                return f'{days_left}d left'
        return 'in_review'
    return None

def _plan_label(ev):
    t = ev.get('type', '')
    if t == 'subscription_monthly':
        return 'monthly'
    if t == 'subscription_annual':
        return 'annual'
    return None

def _safe_email(user_id):
    """Return email for admin views. Never exposed to partner views."""
    if not user_id:
        return None
    try:
        user = db.users.find_one({'_id': ObjectId(str(user_id))}, {'email': 1})
        return user.get('email') if user else None
    except Exception:
        return None


# ─── Signup attribution helper (called from auth_routes) ─────────────────────

def _record_signup_attribution(user_id, ref_code, req):
    """Called from auth_routes after new user email is confirmed (or OAuth signup).
    Thread-safe, idempotent."""
    import hashlib
    from datetime import datetime, timedelta
    import requests as http_req

    # 1. Validate the promoter exists and is active
    promoter = db.promoters.find_one({'ref_code': ref_code, 'status': 'active'})
    if not promoter:
        return

    # 2. Self-referral check
    if str(promoter['user_id']) == str(user_id):
        return

    # 3. For email/password signups — only proceed if email is confirmed
    try:
        from bson import ObjectId as _OID
        user_doc = db.users.find_one({'_id': _OID(str(user_id))}, {'status': 1})
        if user_doc and user_doc.get('status') not in ('approved', 'active'):
            print(f"ℹ️ Referral attribution skipped — user {user_id} not yet confirmed (status: {user_doc.get('status')})")
            return
    except Exception:
        pass  # If we can't check, proceed anyway (OAuth users are always approved)

    # 3. Build visitor_id fingerprint
    ip = req.headers.get('X-Forwarded-For', req.remote_addr or '').split(',')[0].strip()
    ua = req.headers.get('User-Agent', '')
    visitor_id = hashlib.sha256(f"{ip}:{ua}:{ref_code}".encode()).hexdigest()[:32]

    # 4. First-touch attribution
    existing_attr = db.referral_attributions.find_one({'visitor_id': visitor_id})
    if existing_attr:
        attr_id = existing_attr['_id']
        db.referral_attributions.update_one({'_id': attr_id}, {'$set': {'user_id': user_id}})
    else:
        # Geo lookup
        try:
            geo_resp = http_req.get(f"http://ip-api.com/json/{ip}?fields=country,city", timeout=3)
            geo = geo_resp.json() if geo_resp.status_code == 200 else {}
        except Exception:
            geo = {}

        attr_doc = {
            'ref_code':   ref_code,
            'visitor_id': visitor_id,
            'user_id':    user_id,
            'first_seen': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(days=90),
            'ip_hash':    hashlib.sha256((ip + datetime.utcnow().strftime('%Y-%m-%d')).encode()).hexdigest()[:32],
            'user_agent': ua[:200],
            'country':    geo.get('countryCode', ''),
            'city':       geo.get('city', ''),
        }
        try:
            result = db.referral_attributions.insert_one(attr_doc)
            attr_id = result.inserted_id
        except Exception:
            existing = db.referral_attributions.find_one({'visitor_id': visitor_id})
            if existing:
                attr_id = existing['_id']
                db.referral_attributions.update_one({'_id': attr_id}, {'$set': {'user_id': user_id}})
            else:
                return

    # 5. Insert signup event (idempotent via unique index on user_id/type=signup)
    try:
        db.referral_events.insert_one({
            'ref_code':      ref_code,
            'attribution_id': attr_id,
            'type':          'signup',
            'status':        'pending',
            'amount_cents':  70,
            'currency':      'EUR',
            'user_id':       user_id,
            'occurred_at':   datetime.utcnow(),
            'eligible_at':   datetime.utcnow() + timedelta(days=14),
            'flags':         [],
            'created_at':    datetime.utcnow(),
        })
        print(f"✅ Referral signup event created: {ref_code} → user {user_id}")
    except Exception as e:
        print(f"ℹ️ Referral signup already exists for user {user_id}: {e}")


# ─── Public: session click tracking ──────────────────────────────────────────

@referral_bp.route('/api/referral/track-click', methods=['POST', 'OPTIONS'])
def track_referral_click():
    """
    POST /api/referral/track-click
    body: { ref_code, visitor_id (optional), page }
    No auth required — public endpoint.
    """
    import hashlib

    data     = request.json or {}
    ref_code = data.get('ref_code', '').strip().upper()
    page     = data.get('page', '')

    if not ref_code:
        return jsonify({'credited': False, 'reason': 'ref_code required'}), 400

    promoter = db.promoters.find_one({'ref_code': ref_code, 'status': 'active'})
    if not promoter:
        return jsonify({'credited': False, 'reason': 'invalid ref_code'}), 400

    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()
    ua = request.headers.get('User-Agent', '')

    visitor_id = data.get('visitor_id') or \
        hashlib.sha256(f"{ip}:{ua}:{ref_code}".encode()).hexdigest()[:32]
    ip_hash    = hashlib.sha256((ip + datetime.utcnow().strftime('%Y-%m-%d')).encode()).hexdigest()[:32]
    today_str  = datetime.utcnow().strftime('%Y-%m-%d')

    # Anti-spam check 1: same visitor_id only earns 1 session credit per calendar day
    already_today = db.referral_events.find_one({
        'type':       'session',
        'visitor_id': visitor_id,
        'day_key':    today_str,
    })
    if already_today:
        return jsonify({'credited': False, 'reason': 'already_credited_today'})

    # Anti-spam check 2: same ip_hash max 3 session credits in last 24h
    window_start = datetime.utcnow() - timedelta(hours=24)
    ip_count = db.referral_events.count_documents({
        'type':       'session',
        'ip_hash':    ip_hash,
        'occurred_at': {'$gte': window_start},
    })
    if ip_count >= 3:
        return jsonify({'credited': False, 'reason': 'ip_burst_limit'})

    # Get or create attribution record
    existing_attr = db.referral_attributions.find_one({'visitor_id': visitor_id})
    if existing_attr:
        attr_id = existing_attr['_id']
    else:
        try:
            import requests as http_req
            geo_resp = http_req.get(f"http://ip-api.com/json/{ip}?fields=country,city", timeout=3)
            geo = geo_resp.json() if geo_resp.status_code == 200 else {}
        except Exception:
            geo = {}

        attr_doc = {
            'ref_code':   ref_code,
            'visitor_id': visitor_id,
            'user_id':    None,
            'first_seen': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(days=90),
            'ip_hash':    ip_hash,
            'user_agent': ua[:200],
            'country':    geo.get('countryCode', ''),
            'city':       geo.get('city', ''),
        }
        try:
            res_insert = db.referral_attributions.insert_one(attr_doc)
            attr_id = res_insert.inserted_id
        except Exception:
            existing = db.referral_attributions.find_one({'visitor_id': visitor_id})
            attr_id = existing['_id'] if existing else None

    # Insert session event
    try:
        db.referral_events.insert_one({
            'ref_code':      ref_code,
            'attribution_id': attr_id,
            'type':          'session',
            'status':        'pending',
            'amount_cents':  2,
            'currency':      'EUR',
            'visitor_id':    visitor_id,
            'ip_hash':       ip_hash,
            'day_key':       today_str,
            'page':          page,
            'occurred_at':   datetime.utcnow(),
            'eligible_at':   datetime.utcnow(),
            'flags':         [],
            'created_at':    datetime.utcnow(),
        })
        return jsonify({'credited': True, 'reason': 'ok'})
    except Exception as e:
        return jsonify({'credited': False, 'reason': str(e)}), 500


# ─── Partner: payment methods ────────────────────────────────────────────────

@referral_bp.route('/api/partner/payment-methods', methods=['GET', 'OPTIONS'])
@requireAuth
def get_payment_methods():
    if request.method == 'OPTIONS':
        return '', 200

    user  = g.current_user
    uid   = _fmt_user_id(user)
    promo = db.promoters.find_one({'user_id': uid})
    if not promo:
        return jsonify({'error': 'Not a promoter'}), 404

    raw = promo.get('payout_method', {})
    masked = {}

    if raw.get('bank'):
        b = raw['bank']
        acc = b.get('account_number', '')
        masked['bank'] = {
            'account_name':   b.get('account_name', ''),
            'account_number': '****' + acc[-4:] if len(acc) >= 4 else acc,
            'ifsc':           b.get('ifsc', ''),
            'bank_name':      b.get('bank_name', ''),
        }

    if raw.get('paypal'):
        masked['paypal'] = {'email': raw['paypal'].get('email', '')}

    if raw.get('crypto'):
        c = raw['crypto']
        wallet = c.get('wallet_address', '')
        masked['crypto'] = {
            'wallet_address': wallet[:6] + '...' + wallet[-4:] if len(wallet) > 10 else wallet,
            'network':        c.get('network', ''),
        }

    return jsonify(masked)


@referral_bp.route('/api/partner/payment-methods', methods=['POST'])
@requireAuth
def save_payment_methods():
    user  = g.current_user
    uid   = _fmt_user_id(user)
    promo = db.promoters.find_one({'user_id': uid})
    if not promo:
        return jsonify({'error': 'Not a promoter'}), 404

    data  = request.json or {}
    bank  = data.get('bank')
    paypal = data.get('paypal')
    crypto = data.get('crypto')

    # Validate at least one method has required fields
    valid = False
    payout_method = {}

    if bank:
        if bank.get('account_name') and bank.get('account_number'):
            payout_method['bank'] = {
                'account_name':   str(bank['account_name'])[:100],
                'account_number': str(bank['account_number'])[:50],
                'ifsc':           str(bank.get('ifsc', ''))[:20],
                'bank_name':      str(bank.get('bank_name', ''))[:100],
            }
            valid = True
        else:
            return jsonify({'error': 'Bank method requires account_name and account_number'}), 400

    if paypal:
        if paypal.get('email'):
            payout_method['paypal'] = {'email': str(paypal['email'])[:200]}
            valid = True
        else:
            return jsonify({'error': 'PayPal method requires email'}), 400

    if crypto:
        if crypto.get('wallet_address') and crypto.get('network'):
            payout_method['crypto'] = {
                'wallet_address': str(crypto['wallet_address'])[:200],
                'network':        str(crypto['network'])[:50],
            }
            valid = True
        else:
            return jsonify({'error': 'Crypto method requires wallet_address and network'}), 400

    if not valid:
        return jsonify({'error': 'At least one payment method with required fields is needed'}), 400

    # Merge with existing (only update provided methods)
    existing = promo.get('payout_method', {})
    existing.update(payout_method)

    db.promoters.update_one({'user_id': uid}, {'$set': {'payout_method': existing}})
    return jsonify({'success': True, 'message': 'Payment method saved'})


# ─── Partner: payout history ─────────────────────────────────────────────────

@referral_bp.route('/api/partner/payouts', methods=['GET', 'OPTIONS'])
@requireAuth
def partner_payouts():
    if request.method == 'OPTIONS':
        return '', 200

    user  = g.current_user
    uid   = _fmt_user_id(user)
    promo = db.promoters.find_one({'user_id': uid})
    if not promo:
        return jsonify([])

    rc = promo['ref_code']
    docs = list(db.referral_payouts.find({'ref_code': rc}).sort('requested_at', -1).limit(50))
    rows = []
    for d in docs:
        method_type = ''
        m = d.get('method', {})
        if m.get('bank'):
            method_type = 'bank'
        elif m.get('paypal'):
            method_type = 'paypal'
        elif m.get('crypto'):
            method_type = 'crypto'

        txn = d.get('transaction_id', '')
        rows.append({
            'id':            str(d['_id']),
            'amount_cents':  d.get('amount_cents', 0),
            'status':        d.get('status', 'requested'),
            'method_type':   method_type,
            'requested_at':  d['requested_at'].isoformat() if isinstance(d.get('requested_at'), datetime) else '',
            'paid_at':       d['paid_at'].isoformat() if isinstance(d.get('paid_at'), datetime) else None,
            'transaction_id': ('****' + txn[-4:]) if len(txn) >= 4 else txn,
            'admin_message': d.get('admin_message', ''),
        })
    return jsonify(rows)


# ─── Patch payout endpoint to enforce payment method ─────────────────────────
# NOTE: The existing request_payout() function above is extended below via a
# replacement — we keep the original intact and override the check at the top.
# Instead of replacing, we add the check by monkey-patching is complex;
# the cleanest approach is to update request_payout() in-place. Since we cannot
# use str_replace twice on the same block without risking conflicts, this note
# documents that the payout_method check is embedded directly in request_payout().
# See updated request_payout() above (it already has the promo.get('payout_method', {})
# reference — we just need to ensure the route validates the field).


# ─── Admin: list all payouts ──────────────────────────────────────────────────

@referral_bp.route('/api/admin/referrals/payouts', methods=['GET', 'OPTIONS'])
@requireAdmin
def admin_list_payouts():
    if request.method == 'OPTIONS':
        return '', 200

    docs = list(db.referral_payouts.find().sort('requested_at', -1).limit(200))
    rows = []
    for d in docs:
        promo = db.promoters.find_one({'ref_code': d.get('ref_code', '')}, {'display_name': 1}) or {}
        method_type = ''
        m = d.get('method', {})
        if m.get('bank'):
            method_type = 'bank'
        elif m.get('paypal'):
            method_type = 'paypal'
        elif m.get('crypto'):
            method_type = 'crypto'

        txn = d.get('transaction_id', '')
        rows.append({
            'id':            str(d['_id']),
            'ref_code':      d.get('ref_code', ''),
            'display_name':  promo.get('display_name', ''),
            'amount_cents':  d.get('amount_cents', 0),
            'status':        d.get('status', 'requested'),
            'method_type':   method_type,
            'requested_at':  d['requested_at'].isoformat() if isinstance(d.get('requested_at'), datetime) else '',
            'paid_at':       d['paid_at'].isoformat() if isinstance(d.get('paid_at'), datetime) else None,
            'transaction_id': txn,
            'admin_message': d.get('admin_message', ''),
        })
    return jsonify(rows)


@referral_bp.route('/api/admin/referrals/payouts/<payout_id>/mark-paid', methods=['POST', 'OPTIONS'])
@requireAdmin
def admin_mark_payout_paid(payout_id):
    if request.method == 'OPTIONS':
        return '', 200

    try:
        oid = ObjectId(payout_id)
    except Exception:
        return jsonify({'error': 'Invalid payout_id'}), 400

    payout = db.referral_payouts.find_one({'_id': oid})
    if not payout:
        return jsonify({'error': 'Payout not found'}), 404

    data = request.json or {}
    transaction_id = data.get('transaction_id', '').strip()
    if not transaction_id:
        return jsonify({'error': 'transaction_id is required'}), 400

    db.referral_payouts.update_one({'_id': oid}, {'$set': {
        'status':         'paid',
        'paid_at':        datetime.utcnow(),
        'transaction_id': transaction_id,
        'admin_message':  data.get('message', ''),
    }})
    return jsonify({'success': True})
