"""
Survey Sharing Earnings API
Handles: survey share links, click tracking, completion recording,
         per-survey payout config, global earnings config (Ways to Earn rates).
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from auth_middleware import requireAuth, requireAdmin
from mongodb_config import db
from datetime import datetime, timedelta
from bson import ObjectId
import hashlib
import random
import string

survey_sharing_bp = Blueprint('survey_sharing', __name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://pepperadsresponses.web.app",
    "https://hostsliceresponse.web.app",
    "https://theinterwebsite.space",
    "https://dashboard.pepperwahl.com",
    "https://pepperwahl.com",
]


def _oid_str(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


def _ensure_promoter(user_id: str, display_name: str = ''):
    """Auto-create promoter record if one doesn't exist yet."""
    existing = db.promoters.find_one({'user_id': user_id})
    if existing:
        return existing['ref_code']

    SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    for _ in range(15):
        code = ''.join(random.choices(SAFE_CHARS, k=7))
        if not db.promoters.find_one({'ref_code': code}):
            db.promoters.insert_one({
                'user_id': user_id,
                'ref_code': code,
                'display_name': display_name or user_id,
                'payout_method': {},
                'status': 'active',
                'created_at': datetime.utcnow(),
            })
            return code
    raise RuntimeError('Could not generate unique ref_code')


def _get_earnings_config():
    """Return the global earnings config doc, with defaults if not set."""
    cfg = db.earnings_config.find_one({'_id': 'global'})
    defaults = {
        'click_cents': 2,          # €0.02 per referral link click
        'signup_cents': 70,        # €0.70 per signup
        'monthly_sub_cents': 400,  # €4.00 per monthly plan
        'annual_sub_cents': 4000,  # €40.00 per annual plan
        'video_bonus_cents': 500,  # €5.00 for creating a video
        'video_bonus_label': 'Create a video about Pepperwahl',
        'video_bonus_description': 'Upload a review/tutorial video about Pepperwahl to YouTube or social media and earn a one-time bonus. Contact us with the link.',
        'survey_share_description': 'Share any of your surveys with friends. Earn the payout set per survey when someone completes it through your link.',
        'signup_description': 'Earn when someone creates a free account through your referral link.',
        'plan_description': 'Earn when your referred user subscribes to any paid plan. Monthly plans pay every month they stay active.',
        'click_description': 'Earn a small amount for every unique daily click on your referral link.',
        'updated_at': None,
    }
    if not cfg:
        return defaults
    defaults.update({k: v for k, v in cfg.items() if k != '_id'})
    return defaults


# ─── Global Earnings Config ───────────────────────────────────────────────────

@survey_sharing_bp.route('/api/earnings-config', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["GET", "OPTIONS"])
def get_earnings_config():
    """Public: anyone can read the earnings config to display Ways to Earn rates."""
    if request.method == 'OPTIONS':
        return '', 200
    cfg = _get_earnings_config()
    return jsonify(cfg)


@survey_sharing_bp.route('/api/admin/earnings-config', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["PUT", "OPTIONS"])
@requireAdmin
def update_earnings_config():
    """Admin: update global earnings rates for Ways to Earn."""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.json or {}

    allowed_fields = [
        'click_cents', 'signup_cents', 'monthly_sub_cents', 'annual_sub_cents',
        'video_bonus_cents', 'video_bonus_label', 'video_bonus_description',
        'survey_share_description', 'signup_description', 'plan_description',
        'click_description',
    ]
    update = {'updated_at': datetime.utcnow()}
    for field in allowed_fields:
        if field in data:
            val = data[field]
            # Cents fields must be non-negative integers
            if field.endswith('_cents'):
                try:
                    val = max(0, int(val))
                except (ValueError, TypeError):
                    return jsonify({'error': f'{field} must be a non-negative integer (cents)'}), 400
            update[field] = val

    db.earnings_config.update_one(
        {'_id': 'global'},
        {'$set': update},
        upsert=True
    )
    return jsonify({'success': True, 'config': _get_earnings_config()})


# ─── Survey Share Link ────────────────────────────────────────────────────────

@survey_sharing_bp.route('/api/surveys/<survey_id>/share-link', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["GET", "OPTIONS"])
@requireAuth
def get_survey_share_link(survey_id):
    """
    Return (or create) the current user's personal share link for a survey.
    Auto-registers the user as a promoter if not already one.
    """
    if request.method == 'OPTIONS':
        return '', 200

    user = g.current_user
    user_id = str(user.get('_id', ''))
    display_name = user.get('name') or user.get('email', '').split('@')[0]

    # Ensure survey exists
    survey = None
    try:
        survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
    except Exception:
        pass
    if not survey:
        survey = db.surveys.find_one({'short_id': survey_id}) or db.surveys.find_one({'id': survey_id})
    if not survey:
        return jsonify({'error': 'Survey not found'}), 404

    canonical_id = survey.get('short_id') or str(survey['_id'])

    # Auto-register promoter
    try:
        ref_code = _ensure_promoter(user_id, display_name)
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500

    import os
    frontend_base = os.getenv('FRONTEND_URL', 'https://survey.pepperwahl.com')
    share_link = f"{frontend_base}/s/{canonical_id}?sharer={ref_code}"

    # Stats for this specific survey + sharer
    clicks = db.survey_share_clicks.count_documents({
        'survey_id': canonical_id,
        'sharer_ref_code': ref_code
    })
    completions = db.survey_share_completions.count_documents({
        'survey_id': canonical_id,
        'sharer_ref_code': ref_code
    })
    earned_pipeline = [
        {'$match': {
            'survey_id': canonical_id,
            'sharer_ref_code': ref_code,
            'status': {'$in': ['pending', 'approved']}
        }},
        {'$group': {'_id': None, 'total': {'$sum': '$earned_cents'}}}
    ]
    earned_res = list(db.survey_share_completions.aggregate(earned_pipeline))
    earned_cents = earned_res[0]['total'] if earned_res else 0

    # Get payout config for this survey
    payout_cents = survey.get('share_payout_cents', 0)
    payout_enabled = survey.get('share_payout_enabled', False)

    return jsonify({
        'share_link': share_link,
        'ref_code': ref_code,
        'survey_id': canonical_id,
        'survey_title': survey.get('title') or survey.get('prompt', 'Survey')[:80],
        'payout_cents': payout_cents,
        'payout_enabled': payout_enabled,
        'stats': {
            'clicks': clicks,
            'completions': completions,
            'earned_cents': earned_cents,
        }
    })


# ─── Public: Track Share Click ────────────────────────────────────────────────

@survey_sharing_bp.route('/api/surveys/<survey_id>/track-share-click', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins="*",
              allow_headers=["Content-Type", "Authorization"], methods=["POST", "OPTIONS"])
def track_share_click(survey_id):
    """
    Called when someone opens a survey via a share link (?sharer=CODE).
    No auth required — public endpoint. Anti-spam: 1 click per visitor per day.
    """
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json or {}
    sharer_code = (data.get('sharer') or '').strip().upper()
    if not sharer_code:
        return jsonify({'tracked': False, 'reason': 'sharer required'}), 400

    promoter = db.promoters.find_one({'ref_code': sharer_code, 'status': 'active'})
    if not promoter:
        return jsonify({'tracked': False, 'reason': 'invalid sharer'}), 400

    # Resolve canonical survey ID (short_id preferred)
    survey_doc = None
    try:
        survey_doc = db.surveys.find_one({'_id': ObjectId(survey_id)})
    except Exception:
        pass
    if not survey_doc:
        survey_doc = db.surveys.find_one({'short_id': survey_id}) or db.surveys.find_one({'id': survey_id})

    # Use canonical_id for storage so stats always aggregate correctly
    canonical_survey_id = survey_id  # fallback if survey not found
    if survey_doc:
        canonical_survey_id = survey_doc.get('short_id') or str(survey_doc['_id'])

    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()
    ua = request.headers.get('User-Agent', '')
    today = datetime.utcnow().strftime('%Y-%m-%d')
    visitor_id = hashlib.sha256(f"{ip}:{ua}:{sharer_code}:{survey_id}".encode()).hexdigest()[:32]

    # One click credit per visitor per survey per day
    already = db.survey_share_clicks.find_one({
        'visitor_id': visitor_id,
        'survey_id': canonical_survey_id,
        'day_key': today,
    })
    if already:
        return jsonify({'tracked': False, 'reason': 'already_tracked_today'})

    db.survey_share_clicks.insert_one({
        'survey_id': canonical_survey_id,
        'sharer_ref_code': sharer_code,
        'sharer_user_id': str(promoter['user_id']),
        'visitor_id': visitor_id,
        'day_key': today,
        'ip_hash': hashlib.sha256(ip.encode()).hexdigest()[:16],
        'occurred_at': datetime.utcnow(),
    })

    return jsonify({'tracked': True})


# ─── Record Survey Completion (called from survey submit) ─────────────────────

@survey_sharing_bp.route('/api/surveys/<survey_id>/record-share-completion', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins="*",
              allow_headers=["Content-Type", "Authorization"], methods=["POST", "OPTIONS"])
def record_share_completion(survey_id):
    """
    Called internally after a survey is submitted when ?sharer=CODE is present in URL.
    Anti-fraud: one completion credit per device fingerprint per survey per sharer.
    """
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json or {}
    sharer_code = (data.get('sharer') or '').strip().upper()
    session_id = data.get('session_id', '')
    device_fp = data.get('device_fingerprint', '')

    if not sharer_code:
        return jsonify({'credited': False, 'reason': 'sharer required'}), 400

    promoter = db.promoters.find_one({'ref_code': sharer_code, 'status': 'active'})
    if not promoter:
        return jsonify({'credited': False, 'reason': 'invalid sharer'}), 400

    # Fetch survey
    survey = None
    try:
        survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
    except Exception:
        pass
    if not survey:
        survey = db.surveys.find_one({'short_id': survey_id}) or db.surveys.find_one({'id': survey_id})
    if not survey:
        return jsonify({'credited': False, 'reason': 'survey not found'}), 404

    canonical_id = survey.get('short_id') or str(survey['_id'])
    payout_cents = survey.get('share_payout_cents', 0)
    payout_enabled = survey.get('share_payout_enabled', False)
    if not payout_enabled or payout_cents <= 0:
        return jsonify({'credited': False, 'reason': 'payout_not_enabled'})

    # Prevent self-crediting (survey owner sharing their own survey)
    survey_owner_id = str(survey.get('ownerUserId', ''))
    if survey_owner_id and survey_owner_id == str(promoter['user_id']):
        return jsonify({'credited': False, 'reason': 'self_share_not_eligible'})

    # Idempotency: one credit per device fingerprint per survey per sharer
    fp_key = device_fp or session_id
    if fp_key:
        already = db.survey_share_completions.find_one({
            'survey_id': canonical_id,
            'sharer_ref_code': sharer_code,
            'device_fp': fp_key,
        })
        if already:
            return jsonify({'credited': False, 'reason': 'already_credited'})

    # Also check by IP as a secondary guard
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    window_start = datetime.utcnow() - timedelta(hours=24)
    ip_recent = db.survey_share_completions.count_documents({
        'survey_id': canonical_id,
        'sharer_ref_code': sharer_code,
        'ip_hash': ip_hash,
        'completed_at': {'$gte': window_start},
    })
    if ip_recent >= 2:
        return jsonify({'credited': False, 'reason': 'ip_burst_limit'})

    doc = {
        'survey_id': canonical_id,
        'sharer_ref_code': sharer_code,
        'sharer_user_id': str(promoter['user_id']),
        'session_id': session_id,
        'device_fp': fp_key,
        'ip_hash': ip_hash,
        'earned_cents': payout_cents,
        'status': 'approved',   # Auto-approved
        'eligible_at': datetime.utcnow(),
        'completed_at': datetime.utcnow(),
        'created_at': datetime.utcnow(),
    }
    db.survey_share_completions.insert_one(doc)

    # Immediately credit the sharer's withdrawable balance
    try:
        db.referral_events.insert_one({
            'ref_code':      sharer_code,
            'type':          'survey_share_completion',
            'status':        'approved',
            'amount_cents':  payout_cents,
            'currency':      'EUR',
            'survey_id':     canonical_id,
            'session_id':    session_id,
            'occurred_at':   datetime.utcnow(),
            'eligible_at':   datetime.utcnow(),
            'flags':         [],
            'created_at':    datetime.utcnow(),
        })
    except Exception as e:
        print(f"⚠️ Balance credit skipped: {e}")

    print(f"✅ Survey share completion auto-approved: survey={canonical_id} sharer={sharer_code} payout={payout_cents}¢")
    return jsonify({'credited': True, 'earned_cents': payout_cents})


# ─── User: My Survey Earnings Report ─────────────────────────────────────────

@survey_sharing_bp.route('/api/partner/survey-earnings', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["GET", "OPTIONS"])
@requireAuth
def my_survey_earnings():
    """
    Return the current user's survey-sharing earnings breakdown, survey by survey.
    Shows BOTH:
      - Surveys the user created (direct responses count)
      - Surveys the user shared via their ref link (share completions + clicks)
    """
    if request.method == 'OPTIONS':
        return '', 200

    user = g.current_user
    user_id = str(user.get('_id', ''))

    promoter = db.promoters.find_one({'user_id': user_id})
    ref_code = promoter['ref_code'] if promoter else None

    # ── A. Surveys the user CREATED — show direct response counts ────────────
    owned_surveys = list(db.surveys.find({'ownerUserId': user_id}).sort('created_at', -1))

    # Build a mapping of all canonical IDs → survey doc for fast lookup
    survey_map = {}
    for s in owned_surveys:
        for key in [s.get('short_id'), s.get('id'), str(s.get('_id', ''))]:
            if key:
                survey_map[key] = s

    # Count responses for each owned survey (try all ID variants)
    owned_rows = []
    for s in owned_surveys:
        canonical_id = s.get('short_id') or str(s['_id'])
        all_ids = list({s.get('short_id'), s.get('id'), str(s.get('_id', ''))} - {None, ''})
        if len(all_ids) == 1:
            response_count = db.responses.count_documents({'survey_id': all_ids[0]})
        else:
            response_count = db.responses.count_documents({'survey_id': {'$in': all_ids}})

        title = s.get('title') or s.get('prompt', 'Untitled Survey')
        if len(title) > 60:
            title = title[:57] + '...'

        owned_rows.append({
            'survey_id': canonical_id,
            'survey_title': title,
            'type': 'owned',          # this user CREATED it
            'response_count': response_count,
            'share_payout_enabled': s.get('share_payout_enabled', False),
            'payout_per_completion_cents': s.get('share_payout_cents', 0),
            'clicks': 0,
            'completions': 0,
            'earned_cents': 0,
            'pending_cents': 0,
            'latest_at': None,
        })

    # ── B. Share-link completions & clicks (via ref_code) ────────────────────
    share_rows = []
    if ref_code:
        # Completions grouped by survey — all approved now (no pending)
        comp_pipeline = [
            {'$match': {'sharer_ref_code': ref_code}},
            {'$group': {
                '_id': '$survey_id',
                'completions': {'$sum': 1},
                'earned_cents': {'$sum': {'$cond': [{'$eq': ['$status', 'approved']}, '$earned_cents', 0]}},
                'pending_cents': {'$sum': {'$cond': [{'$eq': ['$status', 'pending']}, '$earned_cents', 0]}},
                'latest': {'$max': '$completed_at'},
            }}
        ]
        completion_groups = {agg_doc['_id']: agg_doc for agg_doc in db.survey_share_completions.aggregate(comp_pipeline)}

        # Clicks grouped by survey
        click_pipeline = [
            {'$match': {'sharer_ref_code': ref_code}},
            {'$group': {'_id': '$survey_id', 'clicks': {'$sum': 1}}}
        ]
        click_groups = {agg_doc['_id']: agg_doc['clicks'] for agg_doc in db.survey_share_clicks.aggregate(click_pipeline)}

        all_share_ids = set(list(completion_groups.keys()) + list(click_groups.keys()))

        for sid in all_share_ids:
            # Look up survey (may or may not be owned by this user)
            survey = db.surveys.find_one({'short_id': sid})
            if not survey:
                try:
                    survey = db.surveys.find_one({'_id': ObjectId(sid)})
                except Exception:
                    pass
            title = 'Unknown Survey'
            payout_cents = 0
            if survey:
                title = survey.get('title') or survey.get('prompt', 'Survey')
                if len(title) > 60:
                    title = title[:57] + '...'
                payout_cents = survey.get('share_payout_cents', 0)

            cg = completion_groups.get(sid, {})
            share_rows.append({
                'survey_id': sid,
                'survey_title': title,
                'type': 'shared',     # this user SHARED it via their link
                'response_count': None,
                'share_payout_enabled': True,
                'payout_per_completion_cents': payout_cents,
                'clicks': click_groups.get(sid, 0),
                'completions': cg.get('completions', 0),
                'earned_cents': cg.get('earned_cents', 0),
                'pending_cents': cg.get('pending_cents', 0),
                'latest_at': cg.get('latest').isoformat() if cg.get('latest') else None,
            })

    # Sort share rows by earnings desc
    share_rows.sort(key=lambda r: r['earned_cents'] + r['pending_cents'], reverse=True)
    # Sort owned rows by response count desc
    owned_rows.sort(key=lambda r: r['response_count'], reverse=True)

    totals = {
        'clicks': sum(r['clicks'] for r in share_rows),
        'completions': sum(r['completions'] for r in share_rows),
        'earned_cents': sum(r['earned_cents'] for r in share_rows),
        'pending_cents': sum(r['pending_cents'] for r in share_rows),
        'total_responses': sum(r['response_count'] for r in owned_rows),
    }

    return jsonify({
        'owned_surveys': owned_rows,
        'share_rows': share_rows,
        'totals': totals,
        # Legacy field — keep for backward compat
        'rows': share_rows,
    })


# ─── Admin: Combined Survey Report ───────────────────────────────────────────

@survey_sharing_bp.route('/api/admin/surveys/combined-report', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["GET", "OPTIONS"])
@requireAdmin
def admin_combined_survey_report():
    """
    Admin: Full combined report per survey.
    Returns all surveys with: creator info, direct responses, share clicks,
    share completions (pending/approved), total earnings due.
    """
    if request.method == 'OPTIONS':
        return '', 200

    # All surveys
    surveys = list(db.surveys.find({}).sort('created_at', -1))

    # Pre-aggregate real clicks from survey_clicks (all opens, not just share-link ones)
    # sum click_count across all records per survey
    all_clicks_map = {}
    for agg_doc in db.survey_clicks.aggregate([
        {'$group': {'_id': '$survey_id', 'total': {'$sum': '$click_count'}}}
    ]):
        all_clicks_map[agg_doc['_id']] = agg_doc['total']

    # Pre-aggregate share-link specific clicks per survey_id
    share_click_map = {}
    for agg_doc in db.survey_share_clicks.aggregate([
        {'$group': {'_id': '$survey_id', 'clicks': {'$sum': 1}}}
    ]):
        share_click_map[agg_doc['_id']] = agg_doc['clicks']

    # Pre-aggregate share completions per survey_id
    comp_map = {}
    for agg_doc in db.survey_share_completions.aggregate([
        {'$group': {
            '_id': '$survey_id',
            'total': {'$sum': 1},
            'pending': {'$sum': {'$cond': [{'$eq': ['$status', 'pending']}, 1, 0]}},
            'approved': {'$sum': {'$cond': [{'$eq': ['$status', 'approved']}, 1, 0]}},
            'earnings_due_cents': {'$sum': {'$cond': [
                {'$in': ['$status', ['pending', 'approved']]}, '$earned_cents', 0
            ]}},
        }}
    ]):
        comp_map[agg_doc['_id']] = agg_doc

    rows = []
    for s in surveys:
        canonical_id = s.get('short_id') or str(s['_id'])
        all_ids = list({s.get('short_id'), s.get('id'), str(s.get('_id', ''))} - {None, ''})

        # Direct response count
        if len(all_ids) == 1:
            resp_count = db.responses.count_documents({'survey_id': all_ids[0]})
        else:
            resp_count = db.responses.count_documents({'survey_id': {'$in': all_ids}})

        # Owner info
        owner_email, owner_name = '', ''
        try:
            owner = db.users.find_one({'_id': ObjectId(str(s.get('ownerUserId', '')))}, {'email': 1, 'name': 1})
            if owner:
                owner_email = owner.get('email', '')
                owner_name = owner.get('name', '')
        except Exception:
            pass

        cg = comp_map.get(canonical_id, {})
        title = s.get('title') or s.get('prompt', 'Untitled Survey')
        if len(title) > 80:
            title = title[:77] + '...'

        # Try all ID variants for click lookup
        all_clicks = 0
        for vid in all_ids:
            all_clicks = max(all_clicks, all_clicks_map.get(vid, 0))
        if all_clicks == 0:
            all_clicks = sum(all_clicks_map.get(vid, 0) for vid in all_ids)

        share_clicks = 0
        for vid in all_ids:
            share_clicks += share_click_map.get(vid, 0)

        rows.append({
            'survey_id': canonical_id,
            'title': title,
            'status': s.get('status', 'draft'),
            'created_at': s['created_at'].isoformat() if isinstance(s.get('created_at'), datetime) else '',
            'owner_email': owner_email,
            'owner_name': owner_name,
            # Direct responses (no share link needed)
            'direct_responses': resp_count,
            # All clicks (from survey_clicks collection — every survey open)
            'all_clicks': all_clicks,
            # Share-link specific clicks
            'share_clicks': share_clicks,
            'share_completions_total': cg.get('total', 0),
            'share_completions_pending': cg.get('pending', 0),
            'share_completions_approved': cg.get('approved', 0),
            'share_earnings_due_cents': cg.get('earnings_due_cents', 0),
            # Config
            'share_payout_cents': s.get('share_payout_cents', 0),
            'share_payout_enabled': s.get('share_payout_enabled', False),
        })

    # Summary totals
    totals = {
        'total_surveys': len(rows),
        'total_direct_responses': sum(r['direct_responses'] for r in rows),
        'total_all_clicks': sum(r['all_clicks'] for r in rows),
        'total_share_clicks': sum(r['share_clicks'] for r in rows),
        'total_share_completions': sum(r['share_completions_total'] for r in rows),
        'total_earnings_due_cents': sum(r['share_earnings_due_cents'] for r in rows),
    }

    return jsonify({'surveys': rows, 'totals': totals})


# ─── Admin: List surveys with share payout config ────────────────────────────

@survey_sharing_bp.route('/api/admin/surveys/share-payouts', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["GET", "OPTIONS"])
@requireAdmin
def admin_list_share_payouts():
    """Admin: list all surveys with creator info + share payout config + stats."""
    if request.method == 'OPTIONS':
        return '', 200

    surveys = list(db.surveys.find({}).sort('created_at', -1).limit(200))

    # Aggregate completions counts
    comp_pipeline = [
        {'$group': {'_id': '$survey_id', 'completions': {'$sum': 1},
                    'pending': {'$sum': {'$cond': [{'$eq': ['$status', 'pending']}, 1, 0]}},
                    'approved': {'$sum': {'$cond': [{'$eq': ['$status', 'approved']}, 1, 0]}}}}
    ]
    comp_map = {agg_doc['_id']: agg_doc for agg_doc in db.survey_share_completions.aggregate(comp_pipeline)}

    click_pipeline = [
        {'$group': {'_id': '$survey_id', 'clicks': {'$sum': 1}}}
    ]
    click_map = {agg_doc['_id']: agg_doc['clicks'] for agg_doc in db.survey_share_clicks.aggregate(click_pipeline)}

    rows = []
    for s in surveys:
        sid = s.get('short_id') or str(s['_id'])
        owner_id = s.get('ownerUserId', '')
        owner_email = ''
        owner_name = ''
        try:
            owner = db.users.find_one({'_id': ObjectId(str(owner_id))}, {'email': 1, 'name': 1})
            if owner:
                owner_email = owner.get('email', '')
                owner_name = owner.get('name', '')
        except Exception:
            pass

        cg = comp_map.get(sid, {})
        rows.append({
            'survey_id': sid,
            'title': s.get('title') or s.get('prompt', 'Untitled')[:60],
            'status': s.get('status', 'draft'),
            'created_at': s['created_at'].isoformat() if isinstance(s.get('created_at'), datetime) else '',
            'owner_id': owner_id,
            'owner_email': owner_email,
            'owner_name': owner_name,
            'share_payout_cents': s.get('share_payout_cents', 0),
            'share_payout_enabled': s.get('share_payout_enabled', False),
            'stats': {
                'clicks': click_map.get(sid, 0),
                'completions': cg.get('completions', 0),
                'pending_completions': cg.get('pending', 0),
                'approved_completions': cg.get('approved', 0),
            }
        })

    return jsonify({'surveys': rows, 'total': len(rows)})


@survey_sharing_bp.route('/api/admin/surveys/<survey_id>/share-payout', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["PUT", "OPTIONS"])
@requireAdmin
def admin_set_share_payout(survey_id):
    """Admin: set the share payout amount and enable/disable sharing earnings for a survey."""
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json or {}

    # Find the survey
    survey = None
    try:
        survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
    except Exception:
        pass
    if not survey:
        survey = db.surveys.find_one({'short_id': survey_id}) or db.surveys.find_one({'id': survey_id})
    if not survey:
        return jsonify({'error': 'Survey not found'}), 404

    update = {'updated_at': datetime.utcnow()}

    if 'share_payout_cents' in data:
        try:
            cents = max(0, int(data['share_payout_cents']))
            update['share_payout_cents'] = cents
        except (ValueError, TypeError):
            return jsonify({'error': 'share_payout_cents must be a non-negative integer'}), 400

    if 'share_payout_enabled' in data:
        update['share_payout_enabled'] = bool(data['share_payout_enabled'])

    db.surveys.update_one({'_id': survey['_id']}, {'$set': update})
    return jsonify({'success': True, 'survey_id': survey_id, 'updated': update})


# ─── Admin: Approve/Reject share completion events ───────────────────────────

@survey_sharing_bp.route('/api/admin/share-completions', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["GET", "OPTIONS"])
@requireAdmin
def admin_list_share_completions():
    """Admin: list pending/approved share completion events."""
    if request.method == 'OPTIONS':
        return '', 200

    status_filter = request.args.get('status', 'pending')
    query = {} if status_filter == 'all' else {'status': status_filter}

    docs = list(db.survey_share_completions.find(query).sort('completed_at', -1).limit(200))
    rows = []
    for d in docs:
        promo = db.promoters.find_one({'ref_code': d.get('sharer_ref_code', '')}, {'display_name': 1, 'user_id': 1}) or {}
        user_email = ''
        try:
            u = db.users.find_one({'_id': ObjectId(str(promo.get('user_id', '')))}, {'email': 1})
            if u:
                user_email = u.get('email', '')
        except Exception:
            pass

        rows.append({
            'id': str(d['_id']),
            'survey_id': d.get('survey_id', ''),
            'sharer_ref_code': d.get('sharer_ref_code', ''),
            'sharer_display_name': promo.get('display_name', ''),
            'sharer_email': user_email,
            'earned_cents': d.get('earned_cents', 0),
            'status': d.get('status', 'pending'),
            'completed_at': d['completed_at'].isoformat() if isinstance(d.get('completed_at'), datetime) else '',
            'eligible_at': d['eligible_at'].isoformat() if isinstance(d.get('eligible_at'), datetime) else '',
        })

    return jsonify(rows)


@survey_sharing_bp.route('/api/admin/share-completions/<completion_id>/approve', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["POST", "OPTIONS"])
@requireAdmin
def admin_approve_completion(completion_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        oid = ObjectId(completion_id)
    except Exception:
        return jsonify({'error': 'Invalid id'}), 400

    completion = db.survey_share_completions.find_one({'_id': oid})
    if not completion:
        return jsonify({'error': 'Completion not found'}), 404
    if completion.get('status') == 'approved':
        return jsonify({'error': 'Already approved'}), 409

    # Mark the completion as approved
    db.survey_share_completions.update_one(
        {'_id': oid},
        {'$set': {'status': 'approved', 'reviewed_at': datetime.utcnow()}}
    )

    # ── Credit the sharer's withdrawable balance ──────────────────────────────
    # Insert a referral_event of type 'survey_share_completion' so it appears
    # in _available_balance() and shows up in the partner summary.
    ref_code   = completion.get('sharer_ref_code', '')
    earn_cents = completion.get('earned_cents', 0)

    if ref_code and earn_cents > 0:
        try:
            db.referral_events.insert_one({
                'ref_code':       ref_code,
                'type':           'survey_share_completion',
                'status':         'approved',
                'amount_cents':   earn_cents,
                'currency':       'EUR',
                'survey_id':      completion.get('survey_id', ''),
                'completion_id':  str(oid),  # idempotency reference
                'occurred_at':    datetime.utcnow(),
                'eligible_at':    datetime.utcnow(),
                'flags':          [],
                'created_at':     datetime.utcnow(),
            })
            print(f"✅ Balance credited: {ref_code} +{earn_cents}¢ (survey_share_completion)")
        except Exception as e:
            # Duplicate prevention: if already credited, log but don't fail
            print(f"⚠️  Balance credit skipped (possibly duplicate): {e}")

    return jsonify({'success': True, 'credited_cents': earn_cents})


@survey_sharing_bp.route('/api/admin/share-completions/<completion_id>/reject', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["POST", "OPTIONS"])
@requireAdmin
def admin_reject_completion(completion_id):
    """Revert a completion — marks it rejected and inserts a compensating negative referral_event."""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.json or {}
    try:
        oid = ObjectId(completion_id)
    except Exception:
        return jsonify({'error': 'Invalid id'}), 400

    completion = db.survey_share_completions.find_one({'_id': oid})
    if not completion:
        return jsonify({'error': 'Not found'}), 404
    if completion.get('status') == 'rejected':
        return jsonify({'error': 'Already reverted'}), 409

    db.survey_share_completions.update_one(
        {'_id': oid},
        {'$set': {'status': 'rejected', 'reviewed_at': datetime.utcnow(),
                  'reject_reason': data.get('reason', 'Admin manual revert')}}
    )

    # Insert a compensating negative referral_event to deduct the balance
    ref_code   = completion.get('sharer_ref_code', '')
    earn_cents = completion.get('earned_cents', 0)
    if ref_code and earn_cents > 0:
        try:
            db.referral_events.insert_one({
                'ref_code':       ref_code,
                'type':           'survey_share_completion_reversal',
                'status':         'approved',
                'amount_cents':   -earn_cents,   # negative = deduct
                'currency':       'EUR',
                'survey_id':      completion.get('survey_id', ''),
                'completion_id':  str(oid),
                'occurred_at':    datetime.utcnow(),
                'eligible_at':    datetime.utcnow(),
                'flags':          [],
                'created_at':     datetime.utcnow(),
            })
            print(f"💸 Balance deducted: {ref_code} -{earn_cents}¢ (revert completion {completion_id})")
        except Exception as e:
            print(f"⚠️  Balance deduction error: {e}")

    return jsonify({'success': True})


# ─── Internal helper: record completion for ANY response ─────────────────────

def _record_completion_for_response(survey, survey_id, response_id, session_id,
                                    device_fingerprint='', ip=''):
    """
    Called from the survey submission handler after every successful response save.
    If the survey has share_payout_enabled=True, credits the survey OWNER's ref_code
    with a completion event — regardless of whether a ?sharer= param was present.

    This means: every real response on an active earning survey = 1 completion credit
    for the survey creator.

    Idempotency: one credit per response_id (stored in device_fp field as 'response:<id>').
    """
    import hashlib

    if not survey.get('share_payout_enabled'):
        return  # Sharing not enabled for this survey

    payout_cents = survey.get('share_payout_cents', 0)
    if payout_cents <= 0:
        return  # No payout configured

    owner_id = str(survey.get('ownerUserId', ''))
    if not owner_id:
        return

    # Get or create the owner's promoter record (ref_code)
    promoter = db.promoters.find_one({'user_id': owner_id})
    if not promoter:
        return  # Owner has not joined the partner program yet

    ref_code = promoter['ref_code']

    # Resolve canonical survey ID
    canonical_id = survey.get('short_id') or str(survey.get('_id', survey_id))

    # Idempotency key: one credit per response_id
    fp_key = f"response:{response_id}"
    already = db.survey_share_completions.find_one({
        'survey_id': canonical_id,
        'sharer_ref_code': ref_code,
        'device_fp': fp_key,
    })
    if already:
        print(f"ℹ️ Share completion already recorded for response {response_id}")
        return

    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16] if ip else ''

    doc = {
        'survey_id':        canonical_id,
        'sharer_ref_code':  ref_code,
        'sharer_user_id':   owner_id,
        'session_id':       session_id,
        'device_fp':        fp_key,
        'ip_hash':          ip_hash,
        'earned_cents':     payout_cents,
        'status':           'approved',   # Auto-approved — no manual review needed
        'eligible_at':      datetime.utcnow(),
        'completed_at':     datetime.utcnow(),
        'created_at':       datetime.utcnow(),
        'source':           'direct_response',  # distinguishes from ?sharer= link completions
    }
    db.survey_share_completions.insert_one(doc)

    # Immediately credit the owner's withdrawable balance
    try:
        db.referral_events.insert_one({
            'ref_code':      ref_code,
            'type':          'survey_share_completion',
            'status':        'approved',
            'amount_cents':  payout_cents,
            'currency':      'EUR',
            'survey_id':     canonical_id,
            'response_id':   response_id,
            'occurred_at':   datetime.utcnow(),
            'eligible_at':   datetime.utcnow(),
            'flags':         [],
            'created_at':    datetime.utcnow(),
        })
    except Exception as e:
        print(f"⚠️  Balance credit skipped (possibly duplicate): {e}")

    print(f"✅ Share completion (direct) auto-approved: survey={canonical_id} "
          f"owner_ref={ref_code} payout={payout_cents}¢ response={response_id}")


# ─── Admin: Sync completions from existing responses ─────────────────────────

@survey_sharing_bp.route('/api/admin/surveys/<survey_id>/sync-completions', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=CORS_ORIGINS,
              allow_headers=["Content-Type", "Authorization"], methods=["POST", "OPTIONS"])
@requireAdmin
def admin_sync_completions(survey_id):
    """
    Admin: Create completion credits for ALL existing responses on a survey
    that don't already have a credit. Useful when sharing was enabled after
    responses were already collected.
    """
    if request.method == 'OPTIONS':
        return '', 200

    # Find survey
    survey = None
    try:
        survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
    except Exception:
        pass
    if not survey:
        survey = db.surveys.find_one({'short_id': survey_id}) or db.surveys.find_one({'id': survey_id})
    if not survey:
        return jsonify({'error': 'Survey not found'}), 404

    if not survey.get('share_payout_enabled') or not survey.get('share_payout_cents', 0):
        return jsonify({'error': 'Survey sharing is not enabled or payout not set'}), 400

    owner_id = str(survey.get('ownerUserId', ''))
    if not owner_id:
        return jsonify({'error': 'Survey has no owner'}), 400

    promoter = db.promoters.find_one({'user_id': owner_id})
    if not promoter:
        return jsonify({'error': 'Survey owner has not joined the partner program'}), 400

    ref_code     = promoter['ref_code']
    payout_cents = survey.get('share_payout_cents', 0)
    canonical_id = survey.get('short_id') or str(survey['_id'])

    # Get all existing response IDs for this survey
    all_ids = list({survey.get('short_id'), survey.get('id'), str(survey.get('_id', ''))} - {None, ''})
    if len(all_ids) == 1:
        responses = list(db.responses.find({'survey_id': all_ids[0]}, {'_id': 1}))
    else:
        responses = list(db.responses.find({'survey_id': {'$in': all_ids}}, {'_id': 1}))

    # Get already-credited response IDs (stored in device_fp as 'response:<id>')
    existing_fps = set()
    for comp in db.survey_share_completions.find(
        {'survey_id': canonical_id, 'sharer_ref_code': ref_code, 'device_fp': {'$regex': '^response:'}},
        {'device_fp': 1}
    ):
        existing_fps.add(comp.get('device_fp', ''))

    created = 0
    for resp in responses:
        resp_id = str(resp['_id'])
        fp_key  = f"response:{resp_id}"
        if fp_key in existing_fps:
            continue   # Already credited

        doc = {
            'survey_id':       canonical_id,
            'sharer_ref_code': ref_code,
            'sharer_user_id':  owner_id,
            'session_id':      '',
            'device_fp':       fp_key,
            'ip_hash':         '',
            'earned_cents':    payout_cents,
            'status':          'approved',
            'eligible_at':     datetime.utcnow(),
            'completed_at':    datetime.utcnow(),
            'created_at':      datetime.utcnow(),
            'source':          'admin_sync',
        }
        db.survey_share_completions.insert_one(doc)

        # Credit balance immediately
        try:
            db.referral_events.insert_one({
                'ref_code':     ref_code,
                'type':         'survey_share_completion',
                'status':       'approved',
                'amount_cents': payout_cents,
                'currency':     'EUR',
                'survey_id':    canonical_id,
                'response_id':  resp_id,
                'occurred_at':  datetime.utcnow(),
                'eligible_at':  datetime.utcnow(),
                'flags':        [],
                'created_at':   datetime.utcnow(),
            })
        except Exception:
            pass

        created += 1

    return jsonify({
        'success': True,
        'created': created,
        'total_responses': len(responses),
        'already_credited': len(responses) - created,
        'payout_per_completion_cents': payout_cents,
        'total_credited_cents': created * payout_cents,
    })


# ─── Setup indexes ────────────────────────────────────────────────────────────

def setup_sharing_indexes():
    try:
        db.survey_share_clicks.create_index([('survey_id', 1), ('sharer_ref_code', 1)])
        db.survey_share_clicks.create_index([('visitor_id', 1), ('survey_id', 1), ('day_key', 1)])
        db.survey_share_completions.create_index([('survey_id', 1), ('sharer_ref_code', 1)])
        db.survey_share_completions.create_index('status')
        db.survey_share_completions.create_index('completed_at')
        print('✅ Survey sharing indexes ensured')
    except Exception as e:
        print(f'⚠️  Survey sharing index warning: {e}')
