"""
Admin routes for user management
"""
from flask import Blueprint, request, jsonify, g
from auth_middleware import requireAdmin
from mongodb_config import db
from bson import ObjectId
from datetime import datetime
from role_manager import RoleManager, UserRole, UserStatus

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def convert_objectid_to_string(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, dict):
                convert_objectid_to_string(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_objectid_to_string(item)
    return doc

@admin_bp.route('/users', methods=['GET'])
@requireAdmin
def get_all_users():
    """Get all users with enhanced profile data including last login location"""
    try:
        users = list(db.users.find().sort('createdAt', -1))

        # Batch-fetch most recent login event per user (already has location stored at login time)
        user_ids = [str(u['_id']) for u in users]
        pipeline = [
            {'$match': {'user_id': {'$in': user_ids}}},
            {'$sort': {'created_at': -1}},
            {'$group': {
                '_id': '$user_id',
                'location': {'$first': '$location'},
                'ip_address': {'$first': '$ip_address'},
                'login_method': {'$first': '$login_method'},
            }}
        ]
        login_map = {doc['_id']: doc for doc in db.login_events.aggregate(pipeline)}

        # Serialize and attach location
        for user in users:
            uid = str(user['_id'])
            convert_objectid_to_string(user)
            for field in ('createdAt', 'lastLogin', 'updatedAt'):
                val = user.get(field)
                if val and hasattr(val, 'isoformat'):
                    user[field] = val.isoformat()
            if 'authProvider' not in user:
                user['authProvider'] = 'email' if user.get('passwordHash') else 'unknown'
            login_info = login_map.get(uid, {})
            loc = login_info.get('location') or {}
            user['last_login_location'] = {
                'city': loc.get('city', ''),
                'region': loc.get('region', ''),
                'country': loc.get('country', ''),
                'ip_address': login_info.get('ip_address', ''),
            }
            user.pop('passwordHash', None)
            user.pop('confirmationToken', None)
            user.pop('resetPasswordToken', None)
            user.pop('resetPasswordExpiry', None)

        return jsonify({'users': users, 'total': len(users)})

    except Exception as e:
        return jsonify({'error': f'Failed to get users: {str(e)}'}), 500

@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
@requireAdmin
def update_user_role(user_id):
    """Update user role"""
    try:
        data = request.json
        new_role = data.get('role')
        
        if not RoleManager.is_valid_role(new_role):
            valid_roles = RoleManager.get_valid_roles()
            return jsonify({'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}), 400
        
        # Update user role
        try:
            object_id = ObjectId(user_id)
            result = db.users.update_one(
                {'_id': object_id},
                {'$set': {'role': new_role, 'updatedAt': datetime.utcnow()}}
            )
        except:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': f'User role updated to {RoleManager.get_role_display_name(new_role)}'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to update user role: {str(e)}'}), 500

@admin_bp.route('/users/<user_id>/status', methods=['PUT'])
@requireAdmin
def update_user_status(user_id):
    """Update user account status"""
    try:
        data = request.json
        new_status = data.get('status')
        
        if not RoleManager.is_valid_status(new_status):
            valid_statuses = RoleManager.get_valid_statuses()
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        # Update user status
        try:
            object_id = ObjectId(user_id)
            result = db.users.update_one(
                {'_id': object_id},
                {'$set': {'status': new_status, 'updatedAt': datetime.utcnow()}}
            )
        except:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': f'User status updated to {new_status}'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to update user status: {str(e)}'}), 500

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@requireAdmin
def delete_user(user_id):
    """Delete a user and their surveys"""
    try:
        # Find user first
        try:
            object_id = ObjectId(user_id)
            user = db.users.find_one({'_id': object_id})
        except:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't allow deleting the last admin
        if user.get('role') == 'admin':
            admin_count = db.users.count_documents({'role': 'admin'})
            if admin_count <= 1:
                return jsonify({'error': 'Cannot delete the last admin user'}), 400
        
        # Delete user's surveys and responses
        user_surveys = list(db.surveys.find({'ownerUserId': user_id}))
        for survey in user_surveys:
            db.responses.delete_many({'survey_id': str(survey['_id'])})
        db.surveys.delete_many({'ownerUserId': user_id})
        
        # Delete user
        db.users.delete_one({'_id': object_id})
        
        return jsonify({'message': 'User and associated data deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500

@admin_bp.route('/stats', methods=['GET'])
@requireAdmin
def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        # Count users
        total_users = db.users.count_documents({})
        admin_users = db.users.count_documents({'role': 'admin'})
        
        # Count surveys
        total_surveys = db.surveys.count_documents({})
        published_surveys = db.surveys.count_documents({'status': 'published'})
        draft_surveys = db.surveys.count_documents({'status': 'draft'})
        
        # Count responses
        total_responses = db.responses.count_documents({})
        
        # Recent activity (last 7 days)
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        new_users_week = db.users.count_documents({'createdAt': {'$gte': week_ago}})
        new_surveys_week = db.surveys.count_documents({'created_at': {'$gte': week_ago}})
        new_responses_week = db.responses.count_documents({'submitted_at': {'$gte': week_ago}})
        
        return jsonify({
            'stats': {
                'users': {
                    'total': total_users,
                    'admins': admin_users,
                    'new_this_week': new_users_week
                },
                'surveys': {
                    'total': total_surveys,
                    'published': published_surveys,
                    'drafts': draft_surveys,
                    'new_this_week': new_surveys_week
                },
                'responses': {
                    'total': total_responses,
                    'new_this_week': new_responses_week
                }
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get stats: {str(e)}'}), 500

@admin_bp.route('/roles', methods=['GET'])
@requireAdmin
def get_role_hierarchy():
    """Get role hierarchy and feature mapping"""
    try:
        return jsonify({
            'roles': RoleManager.get_role_hierarchy(),
            'valid_roles': RoleManager.get_valid_roles(),
            'valid_statuses': RoleManager.get_valid_statuses(),
            'role_display_names': {
                role: RoleManager.get_role_display_name(role) 
                for role in RoleManager.get_valid_roles()
            },
            'feature_display_names': {
                feature: RoleManager.get_feature_display_name(feature)
                for role_features in RoleManager.get_role_hierarchy().values()
                for feature in role_features
            }
        })
    except Exception as e:
        return jsonify({'error': f'Failed to get role hierarchy: {str(e)}'}), 500

@admin_bp.route('/users/bulk-update', methods=['PUT'])
@requireAdmin
def bulk_update_users():
    """Bulk update user roles or statuses"""
    try:
        data = request.json
        user_ids = data.get('user_ids', [])
        update_type = data.get('type')  # 'role' or 'status'
        new_value = data.get('value')
        
        if not user_ids:
            return jsonify({'error': 'No user IDs provided'}), 400
        
        if update_type not in ['role', 'status']:
            return jsonify({'error': 'Invalid update type. Must be "role" or "status"'}), 400
        
        # Validate the new value
        if update_type == 'role' and not RoleManager.is_valid_role(new_value):
            return jsonify({'error': f'Invalid role: {new_value}'}), 400
        elif update_type == 'status' and not RoleManager.is_valid_status(new_value):
            return jsonify({'error': f'Invalid status: {new_value}'}), 400
        
        # Convert user IDs to ObjectIds
        try:
            object_ids = [ObjectId(uid) for uid in user_ids]
        except:
            return jsonify({'error': 'Invalid user ID format'}), 400
        
        # Perform bulk update
        result = db.users.update_many(
            {'_id': {'$in': object_ids}},
            {'$set': {update_type: new_value, 'updatedAt': datetime.utcnow()}}
        )
        
        return jsonify({
            'message': f'Updated {result.modified_count} users',
            'modified_count': result.modified_count
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to bulk update users: {str(e)}'}), 500

@admin_bp.route('/surveys/comprehensive', methods=['GET'])
@requireAdmin
def get_comprehensive_survey_data():
    """Get comprehensive survey data with detailed user information for admin dashboard"""
    try:
        # Build aggregation pipeline to get surveys with user details and session info
        pipeline = [
            # Join with users collection to get creator details
            {
                '$lookup': {
                    'from': 'users',
                    'let': {'owner_id': {'$toObjectId': '$ownerUserId'}},
                    'pipeline': [
                        {'$match': {'$expr': {'$eq': ['$_id', '$$owner_id']}}}
                    ],
                    'as': 'creator'
                }
            },
            # Join with survey_sessions to get session data
            {
                '$lookup': {
                    'from': 'survey_sessions',
                    'localField': 'short_id',
                    'foreignField': 'survey_id',
                    'as': 'sessions'
                }
            },
            # Join with responses to get response count
            {
                '$lookup': {
                    'from': 'responses',
                    'localField': 'short_id',
                    'foreignField': 'survey_id',
                    'as': 'responses'
                }
            },
            # Add computed fields
            {
                '$addFields': {
                    'creator_info': {'$arrayElemAt': ['$creator', 0]},
                    'total_sessions': {'$size': '$sessions'},
                    'total_responses': {'$size': '$responses'},
                    'unique_ips': {
                        '$size': {
                            '$setUnion': [
                                {'$map': {
                                    'input': '$sessions',
                                    'as': 'session',
                                    'in': '$$session.user_info.ip_address'
                                }}, 
                                []
                            ]
                        }
                    },
                    'latest_session': {
                        '$arrayElemAt': [
                            {'$sortArray': {
                                'input': '$sessions',
                                'sortBy': {'timestamps.session_started': -1}
                            }}, 
                            0
                        ]
                    }
                }
            },
            # Project final fields
            {
                '$project': {
                    '_id': 1,
                    'short_id': 1,
                    'title': 1,
                    'status': 1,
                    'created_at': 1,
                    'ownerUserId': 1,
                    'creator_email': 1,
                    'creator_name': 1,
                    'total_sessions': 1,
                    'total_responses': 1,
                    'unique_ips': 1,
                    'creator_info': {
                        '_id': 1,
                        'uid': 1,
                        'email': 1,
                        'name': 1,
                        'role': 1,
                        'status': 1,
                        'createdAt': 1,
                        'last_login': 1,
                        'simpleUserId': 1
                    },
                    'latest_session_info': {
                        'session_id': '$latest_session.session_id',
                        'ip_address': '$latest_session.user_info.ip_address',
                        'user_agent': '$latest_session.user_info.user_agent',
                        'click_id': '$latest_session.user_info.click_id',
                        'session_started': '$latest_session.timestamps.session_started',
                        'survey_completed': '$latest_session.timestamps.survey_completed',
                        'evaluation_status': '$latest_session.evaluation_result.status'
                    }
                }
            },
            # Sort by creation date (newest first)
            {'$sort': {'created_at': -1}}
        ]
        
        # Execute aggregation
        surveys_data = list(db.surveys.aggregate(pipeline))
        
        # Convert ObjectIds to strings for JSON serialization
        for survey in surveys_data:
            convert_objectid_to_string(survey)
            if survey.get('creator_info') and survey['creator_info'].get('_id'):
                survey['creator_info']['_id'] = str(survey['creator_info']['_id'])
        
        # Get additional statistics
        stats = {
            'total_surveys': len(surveys_data),
            'surveys_with_sessions': len([s for s in surveys_data if s['total_sessions'] > 0]),
            'surveys_with_responses': len([s for s in surveys_data if s['total_responses'] > 0]),
            'total_sessions_all': sum(s['total_sessions'] for s in surveys_data),
            'total_responses_all': sum(s['total_responses'] for s in surveys_data)
        }
        
        return jsonify({
            'surveys': surveys_data,
            'stats': stats,
            'total': len(surveys_data)
        })
        
    except Exception as e:
        print(f"Error in comprehensive survey data: {e}")
        return jsonify({'error': f'Failed to get comprehensive survey data: {str(e)}'}), 500


# ── Survey Click Tracking (admin-wide) ───────────────────────────────────────

@admin_bp.route('/survey-clicks', methods=['GET'])
@requireAdmin
def get_admin_survey_clicks():
    """
    Return click records across all surveys (or filtered by survey_id / submission_status).
    Query params:
      survey_id   - filter to a specific survey short_id
      status      - 'all' (default) | 'submitted' | 'not_submitted'
      limit       - max records (default 500)
      page        - 1-based page number (default 1)
    """
    try:
        survey_id = request.args.get('survey_id', '').strip()
        status_filter = request.args.get('status', 'all').strip()
        limit = min(int(request.args.get('limit', 500)), 2000)
        page = max(int(request.args.get('page', 1)), 1)
        skip = (page - 1) * limit

        query = {}
        if survey_id:
            query['survey_id'] = survey_id
        if status_filter and status_filter != 'all':
            query['submission_status'] = status_filter

        total = db.survey_clicks.count_documents(query)
        records = list(
            db.survey_clicks.find(query)
            .sort('first_click_time', -1)
            .skip(skip)
            .limit(limit)
        )

        # Serialize datetimes and trim click_history
        raw_ids = {}  # str_id -> original_id for DB update
        for r in records:
            orig_id = r.get('_id')
            if isinstance(orig_id, ObjectId):
                r['_id'] = str(orig_id)
            raw_ids[r['_id']] = orig_id  # keep original for update_one
            for field in ('first_click_time', 'last_click_time', 'last_submission_time', 'created_at', 'updated_at'):
                val = r.get(field)
                if val and hasattr(val, 'isoformat'):
                    r[field] = val.isoformat()
            if 'click_history' in r:
                r['click_history'] = r['click_history'][-5:]

        # ── Batch geo enrichment for records missing location ──────────────
        # 1. Collect unique IPs that need resolution
        SKIP_IPS = {'unknown', '127.0.0.1', '::1', 'localhost', '0.0.0.0', ''}
        ip_to_geo: dict = {}
        ips_needed: set = set()
        for r in records:
            if not (r.get('location') and (r['location'].get('city') or r['location'].get('country'))):
                ip = r.get('ip_address', '')
                # Skip private / internal IPs — they can never be resolved
                if ip and ip not in SKIP_IPS and not ip.startswith(('10.', '172.', '192.168.')):
                    ips_needed.add(ip)

        # 2. Resolve unique IPs (cap at 80 to stay under ip-api free rate limit)
        import requests as _req
        for ip in list(ips_needed)[:80]:
            try:
                geo_r = _req.get(
                    f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city",
                    timeout=2
                )
                if geo_r.status_code == 200:
                    gd = geo_r.json()
                    if gd.get('status') == 'success':
                        ip_to_geo[ip] = {
                            'city': gd.get('city', ''),
                            'region': gd.get('regionName', ''),
                            'country': gd.get('country', ''),
                        }
            except Exception:
                pass

        # 3. Apply resolved locations to records and persist back to DB
        for r in records:
            if not (r.get('location') and (r['location'].get('city') or r['location'].get('country'))):
                ip = r.get('ip_address', '')
                geo = ip_to_geo.get(ip)
                if geo:
                    r['location'] = geo
                    # Persist using the original _id (ObjectId or string)
                    orig_id = raw_ids.get(r['_id'], r['_id'])
                    try:
                        db.survey_clicks.update_one(
                            {'_id': orig_id},
                            {'$set': {'location': geo}}
                        )
                    except Exception:
                        pass

        # Aggregate summary stats
        pipeline_summary = [
            {'$match': query if query else {}},
            {'$group': {
                '_id': None,
                'total_clicks': {'$sum': '$click_count'},
                'unique_users': {'$sum': 1},
                'submitted': {'$sum': {'$cond': [{'$eq': ['$submission_status', 'submitted']}, 1, 0]}},
                'not_submitted': {'$sum': {'$cond': [{'$eq': ['$submission_status', 'not_submitted']}, 1, 0]}},
            }}
        ]
        summary_result = list(db.survey_clicks.aggregate(pipeline_summary))
        summary = summary_result[0] if summary_result else {
            'total_clicks': 0, 'unique_users': 0, 'submitted': 0, 'not_submitted': 0
        }
        summary.pop('_id', None)
        summary['conversion_rate'] = round(
            summary['submitted'] / summary['unique_users'] * 100, 1
        ) if summary.get('unique_users', 0) > 0 else 0

        return jsonify({
            'records': records,
            'total': total,
            'page': page,
            'limit': limit,
            'summary': summary
        })
    except Exception as e:
        return jsonify({'error': f'Failed to get survey clicks: {str(e)}'}), 500


@admin_bp.route('/survey-clicks/surveys-list', methods=['GET'])
@requireAdmin
def get_clicked_surveys_list():
    """Return distinct survey IDs that have click records, with title lookup."""
    try:
        pipeline = [
            {'$group': {
                '_id': '$survey_id',
                'total_clicks': {'$sum': '$click_count'},
                'unique_visitors': {'$sum': 1},
                'submitted': {'$sum': {'$cond': [{'$eq': ['$submission_status', 'submitted']}, 1, 0]}},
                'last_click': {'$max': '$last_click_time'},
            }},
            {'$sort': {'last_click': -1}}
        ]
        grouped = list(db.survey_clicks.aggregate(pipeline))

        # Enrich with survey title
        for item in grouped:
            sid = item['_id']
            survey = db.surveys.find_one(
                {'$or': [{'short_id': sid}, {'id': sid}]},
                {'title': 1, 'status': 1}
            )
            item['title'] = survey.get('title', 'Unknown') if survey else 'Unknown'
            item['survey_status'] = survey.get('status', 'unknown') if survey else 'unknown'
            item['conversion_rate'] = round(
                item['submitted'] / item['unique_visitors'] * 100, 1
            ) if item.get('unique_visitors', 0) > 0 else 0
            # Serialize datetime
            if item.get('last_click') and hasattr(item['last_click'], 'isoformat'):
                item['last_click'] = item['last_click'].isoformat()

        return jsonify({'surveys': grouped, 'total': len(grouped)})
    except Exception as e:
        return jsonify({'error': f'Failed to get surveys list: {str(e)}'}), 500


# ── Notification endpoints ──────────────────────────────────────────────────

@admin_bp.route('/notifications', methods=['POST'])
@requireAdmin
def send_notification():
    """Admin sends a notification to all users or a specific user"""
    try:
        data = request.json
        message = (data.get('message') or '').strip()
        title = (data.get('title') or 'Support Notification').strip()
        target = data.get('target', 'all')  # 'all' or a specific user email/uid

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        notification = {
            'title': title,
            'message': message,
            'target': target,  # 'all' or user email
            'created_at': datetime.utcnow(),
            'read_by': []  # list of user emails who dismissed it
        }

        result = db.notifications.insert_one(notification)

        return jsonify({
            'success': True,
            'notification_id': str(result.inserted_id),
            'message': 'Notification sent successfully'
        })

    except Exception as e:
        return jsonify({'error': f'Failed to send notification: {str(e)}'}), 500


# ── Additional admin routes for frontend ──────────────────────────────────────────

@admin_bp.route('/notifications', methods=['GET'])
@requireAdmin
def list_notifications():
    """List all notifications (admin view)"""
    try:
        notifications = list(db.notifications.find().sort('created_at', -1).limit(50))
        for n in notifications:
            convert_objectid_to_string(n)
        return jsonify({'notifications': notifications})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/suggestion-filters', methods=['GET'])
@requireAdmin
def get_suggestion_filters():
    """Get all suggestion filters"""
    try:
        filters = list(db.suggestion_filters.find({}))
        for filter_item in filters:
            convert_objectid_to_string(filter_item)
        return jsonify({"filters": filters})
    except Exception as e:
        return jsonify({'error': f'Failed to get suggestion filters: {str(e)}'}), 500

@admin_bp.route('/surveys-with-config', methods=['GET'])
@requireAdmin
def get_surveys_with_config():
    """Get surveys with configuration"""
    try:
        surveys = list(db.surveys.find({}))
        for survey in surveys:
            convert_objectid_to_string(survey)
        return jsonify({"surveys": surveys})
    except Exception as e:
        return jsonify({'error': f'Failed to get surveys with config: {str(e)}'}), 500

@admin_bp.route('/criteria', methods=['GET'])
@requireAdmin
def get_criteria_sets():
    """Get criteria sets"""
    try:
        criteria = list(db.criteria_sets.find({}))
        for crit in criteria:
            convert_objectid_to_string(crit)
        return jsonify({"criteria": criteria})
    except Exception as e:
        return jsonify({'error': f'Failed to get criteria sets: {str(e)}'}), 500

@admin_bp.route('/pepperads/offers', methods=['GET'])
@requireAdmin
def get_pepperads_offers():
    """Get PepperAds offers"""
    try:
        offers = list(db.pepperads_offers.find({}))
        for offer in offers:
            convert_objectid_to_string(offer)
        return jsonify({"offers": offers})
    except Exception as e:
        return jsonify({'error': f'Failed to get PepperAds offers: {str(e)}'}), 500


@admin_bp.route('/notifications/<notification_id>', methods=['DELETE'])
@requireAdmin
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        db.notifications.delete_one({'_id': ObjectId(notification_id)})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────
#  Platform-wide configuration (admin-only)
#  Stored as a single document in db.platform_config
# ─────────────────────────────────────────────────────────

PLATFORM_CONFIG_ID = 'global'

DEFAULT_PLATFORM_CONFIG = {
    '_id': PLATFORM_CONFIG_ID,
    # If False, the Back button is hidden on all survey pages and
    # browser-back is intercepted with an email-capture fallback.
    'back_button_enabled': True,
    'updated_at': None,
    'updated_by': None,
}


def _get_platform_config():
    """Retrieve the singleton platform config document, creating defaults if missing."""
    config = db.platform_config.find_one({'_id': PLATFORM_CONFIG_ID})
    if not config:
        db.platform_config.insert_one(dict(DEFAULT_PLATFORM_CONFIG))
        config = dict(DEFAULT_PLATFORM_CONFIG)
    return config


@admin_bp.route('/platform-config', methods=['GET'])
@requireAdmin
def get_platform_config():
    """Return the current platform-wide configuration."""
    try:
        config = _get_platform_config()
        config.pop('_id', None)
        return jsonify({'config': config})
    except Exception as e:
        return jsonify({'error': f'Failed to get platform config: {str(e)}'}), 500


@admin_bp.route('/platform-config', methods=['PUT'])
@requireAdmin
def update_platform_config():
    """Update platform-wide configuration (admin only)."""
    try:
        user = g.current_user
        data = request.get_json() or {}

        allowed_keys = {'back_button_enabled'}
        update = {k: v for k, v in data.items() if k in allowed_keys}
        if not update:
            return jsonify({'error': 'No valid fields to update'}), 400

        update['updated_at'] = datetime.utcnow().isoformat()
        update['updated_by'] = str(user.get('email', user.get('_id', 'unknown')))

        db.platform_config.update_one(
            {'_id': PLATFORM_CONFIG_ID},
            {'$set': update},
            upsert=True,
        )
        config = _get_platform_config()
        config.pop('_id', None)
        return jsonify({'message': 'Platform config updated', 'config': config})
    except Exception as e:
        return jsonify({'error': f'Failed to update platform config: {str(e)}'}), 500


# Public endpoint — no auth required — so the survey page can read it
# Prefix is /api/admin but we expose it without auth for the survey renderer
@admin_bp.route('/platform-config/public', methods=['GET'])
def get_platform_config_public():
    """Return safe, public-facing subset of the platform config."""
    try:
        config = _get_platform_config()
        return jsonify({
            'back_button_enabled': config.get('back_button_enabled', True),
        })
    except Exception as e:
        return jsonify({'error': f'Failed to get platform config: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────
#  Per-survey back button override (admin-only)
# ─────────────────────────────────────────────────────────

@admin_bp.route('/surveys/<survey_id>/back-button', methods=['PUT'])
@requireAdmin
def set_survey_back_button(survey_id):
    """Override back-button setting for a specific survey."""
    try:
        data = request.get_json() or {}
        use_global = data.get('use_global', False)

        from bson import ObjectId as ObjId
        survey = (
            db.surveys.find_one({'short_id': survey_id}) or
            db.surveys.find_one({'id': survey_id})
        )
        if not survey:
            try:
                survey = db.surveys.find_one({'_id': ObjId(survey_id)})
            except Exception:
                pass
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404

        if use_global:
            db.surveys.update_one(
                {'_id': survey['_id']},
                {'$unset': {'back_button_enabled': ''}}
            )
            return jsonify({'message': 'Survey back button reset to global', 'back_button_enabled': None})

        if 'back_button_enabled' not in data:
            return jsonify({'error': 'back_button_enabled field required'}), 400

        enabled = bool(data['back_button_enabled'])
        db.surveys.update_one(
            {'_id': survey['_id']},
            {'$set': {'back_button_enabled': enabled, 'updated_at': datetime.utcnow()}}
        )
        return jsonify({'message': 'Survey back button updated', 'back_button_enabled': enabled})
    except Exception as e:
        return jsonify({'error': f'Failed to update: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────
#  Per-user back button override (admin-only)
# ─────────────────────────────────────────────────────────

@admin_bp.route('/users/<user_id>/back-button', methods=['PUT'])
@requireAdmin
def set_user_back_button(user_id):
    """Override back-button setting for a specific user (all their surveys)."""
    try:
        data = request.get_json() or {}
        if 'back_button_enabled' not in data:
            return jsonify({'error': 'back_button_enabled field required'}), 400

        enabled = bool(data['back_button_enabled'])
        use_global = data.get('use_global', False)  # True = remove override, fall back to global

        from bson import ObjectId as ObjId
        try:
            oid = ObjId(user_id)
        except Exception:
            return jsonify({'error': 'Invalid user ID'}), 400

        if use_global:
            db.users.update_one({'_id': oid}, {'$unset': {'back_button_enabled': ''}})
            return jsonify({'message': 'User back button reset to global default'})

        db.users.update_one(
            {'_id': oid},
            {'$set': {'back_button_enabled': enabled}}
        )
        return jsonify({'message': 'User back button updated', 'back_button_enabled': enabled})
    except Exception as e:
        return jsonify({'error': f'Failed to update: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────
#  Public endpoint — resolved back-button for a survey
#  Precedence: survey-level > user-level > global
# ─────────────────────────────────────────────────────────

@admin_bp.route('/back-button-config/<survey_id>', methods=['GET'])
def get_back_button_config(survey_id):
    """
    Return the effective back-button setting for a survey.
    Resolution order: survey override → owner user override → global default.
    No auth required — called by the public survey page.
    """
    try:
        from bson import ObjectId as ObjId

        # 1. Find the survey
        survey = (
            db.surveys.find_one({'short_id': survey_id}, {'back_button_enabled': 1, 'ownerUserId': 1}) or
            db.surveys.find_one({'id': survey_id}, {'back_button_enabled': 1, 'ownerUserId': 1})
        )
        if not survey:
            try:
                survey = db.surveys.find_one(
                    {'_id': ObjId(survey_id)},
                    {'back_button_enabled': 1, 'ownerUserId': 1}
                )
            except Exception:
                pass

        # 2. Survey-level override takes highest priority
        if survey and 'back_button_enabled' in survey:
            return jsonify({
                'back_button_enabled': bool(survey['back_button_enabled']),
                'source': 'survey'
            })

        # 3. User-level override
        if survey and survey.get('ownerUserId'):
            try:
                user = db.users.find_one(
                    {'_id': ObjId(survey['ownerUserId'])},
                    {'back_button_enabled': 1}
                )
                if user and 'back_button_enabled' in user:
                    return jsonify({
                        'back_button_enabled': bool(user['back_button_enabled']),
                        'source': 'user'
                    })
            except Exception:
                pass

        # 4. Global default
        config = _get_platform_config()
        return jsonify({
            'back_button_enabled': config.get('back_button_enabled', True),
            'source': 'global'
        })
    except Exception as e:
        return jsonify({'back_button_enabled': True, 'source': 'default', 'error': str(e)})


# ─────────────────────────────────────────────────────────
#  Back-exit email captures (admin view)
# ─────────────────────────────────────────────────────────

@admin_bp.route('/back-exits', methods=['GET'])
@requireAdmin
def get_back_exits():
    """Return all back-exit email captures, most recent first."""
    try:
        limit = int(request.args.get('limit', 500))
        exits = list(
            db.back_exit_emails
            .find({}, {'_id': 1, 'email': 1, 'survey_id': 1, 'submitted_at': 1, 'ip': 1})
            .sort('submitted_at', -1)
            .limit(limit)
        )
        for e in exits:
            e['_id'] = str(e['_id'])
            if e.get('submitted_at'):
                e['submitted_at'] = e['submitted_at'].isoformat()
        return jsonify({'exits': exits, 'total': len(exits)})
    except Exception as ex:
        return jsonify({'error': str(ex)}), 500
