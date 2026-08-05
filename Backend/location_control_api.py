"""
Location Control API
Admin-controlled location collection settings.

Hierarchy (evaluated top-to-bottom, first OFF wins):
  1. global_location_enabled      — master switch
  2. signup_location_enabled      — controls signup GPS popup
  3. all_surveys_location_enabled — applies to every survey
  4. survey.collect_location      — per-survey flag (only writable if user has location_feature_enabled)
  5. user.location_feature_enabled — whether the user can toggle #4 themselves
"""
from flask import Blueprint, request, jsonify
from auth_middleware import requireAdmin
from mongodb_config import db
from bson import ObjectId
from datetime import datetime

location_bp = Blueprint('location', __name__, url_prefix='/api/admin/location')

# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_settings() -> dict:
    """Return the site-wide location settings document (creates it if absent)."""
    doc = db.site_settings.find_one({'key': 'location_control'})
    if not doc:
        doc = {
            'key': 'location_control',
            # Master kill-switch – everything off by default
            'global_location_enabled': False,
            # Sub-controls (only take effect when global is ON)
            'signup_location_enabled': False,
            'all_surveys_location_enabled': False,
            'updated_at': datetime.utcnow(),
        }
        db.site_settings.insert_one(doc)
    return doc


def _save_settings(patch: dict) -> dict:
    patch['updated_at'] = datetime.utcnow()
    db.site_settings.update_one(
        {'key': 'location_control'},
        {'$set': patch},
        upsert=True,
    )
    return _get_settings()


# ── Public endpoint (no auth) used by frontend ───────────────────────────────

@location_bp.route('/public-config', methods=['GET'])
def get_public_config():
    """
    Called by frontend (survey templates, signup page) to check what's allowed.
    Returns only boolean flags – no sensitive data.
    """
    s = _get_settings()
    return jsonify({
        'global_location_enabled': bool(s.get('global_location_enabled', False)),
        'signup_location_enabled': bool(s.get('signup_location_enabled', False)),
        'all_surveys_location_enabled': bool(s.get('all_surveys_location_enabled', False)),
    })


# ── Admin: read / write global settings ──────────────────────────────────────

@location_bp.route('/settings', methods=['GET'])
@requireAdmin
def get_location_settings():
    """Get all location control settings."""
    s = _get_settings()
    s.pop('_id', None)
    s['updated_at'] = s.get('updated_at', datetime.utcnow()).isoformat() if hasattr(s.get('updated_at'), 'isoformat') else str(s.get('updated_at', ''))
    return jsonify(s)


@location_bp.route('/settings', methods=['POST'])
@requireAdmin
def update_location_settings():
    """
    Update one or more global location settings.
    Body: { global_location_enabled, signup_location_enabled, all_surveys_location_enabled }
    All fields are optional – only provided keys are updated.
    """
    data = request.json or {}
    allowed = ('global_location_enabled', 'signup_location_enabled', 'all_surveys_location_enabled')
    patch = {k: bool(v) for k, v in data.items() if k in allowed}
    if not patch:
        return jsonify({'error': 'No valid fields provided'}), 400

    updated = _save_settings(patch)
    updated.pop('_id', None)
    return jsonify({'message': 'Settings updated', 'settings': updated})


# ── Admin: per-user location feature access ───────────────────────────────────

@location_bp.route('/users', methods=['GET'])
@requireAdmin
def list_users_location():
    """List all users with their location_feature_enabled status."""
    users = list(db.users.find({}, {
        '_id': 1, 'email': 1, 'name': 1, 'role': 1,
        'location_feature_enabled': 1,
    }).sort('email', 1))
    for u in users:
        u['_id'] = str(u['_id'])
        u.setdefault('location_feature_enabled', False)
    return jsonify({'users': users})


@location_bp.route('/users/<user_id>', methods=['PUT'])
@requireAdmin
def set_user_location_access(user_id):
    """
    Enable or disable the location toggle for a specific user.
    Body: { "enabled": true | false }
    """
    data = request.json or {}
    if 'enabled' not in data:
        return jsonify({'error': '"enabled" field required'}), 400

    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user ID'}), 400

    result = db.users.update_one(
        {'_id': oid},
        {'$set': {'location_feature_enabled': bool(data['enabled']), 'updatedAt': datetime.utcnow()}},
    )
    if result.matched_count == 0:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'message': f'Location feature {"enabled" if data["enabled"] else "disabled"} for user'})


# ── Admin: per-survey location override ──────────────────────────────────────

@location_bp.route('/surveys', methods=['GET'])
@requireAdmin
def list_surveys_location():
    """List all surveys with their collect_location status."""
    surveys = list(db.surveys.find({}, {
        '_id': 1, 'short_id': 1, 'title': 1, 'status': 1,
        'collect_location': 1, 'ownerUserId': 1,
    }).sort('title', 1))
    for s in surveys:
        # _id is already a string short_id in this DB schema
        # Expose it both as _id and mongo_id so frontend PUT calls work with either
        raw_id = s['_id']
        if hasattr(raw_id, '__str__') and not isinstance(raw_id, str):
            s['_id'] = str(raw_id)
        s['mongo_id'] = s['_id']  # same value, used by frontend for PUT URL
        s.setdefault('collect_location', False)
    return jsonify({'surveys': surveys})


@location_bp.route('/surveys/<survey_id>', methods=['PUT'])
@requireAdmin
def set_survey_location(survey_id):
    """
    Admin override for a specific survey's collect_location flag.
    Body: { "collect_location": true | false }
    """
    data = request.json or {}
    if 'collect_location' not in data:
        return jsonify({'error': '"collect_location" field required'}), 400

    new_val = bool(data['collect_location'])

    # Surveys in this DB use a string short_id as _id (not ObjectId).
    # Try string _id match first, then ObjectId, then short_id field.
    result = db.surveys.update_one(
        {'_id': survey_id},
        {'$set': {'collect_location': new_val}},
    )

    if result.matched_count == 0:
        # Try as ObjectId (some surveys might use ObjectId)
        try:
            oid = ObjectId(survey_id)
            result = db.surveys.update_one(
                {'_id': oid},
                {'$set': {'collect_location': new_val}},
            )
        except Exception:
            pass

    if result.matched_count == 0:
        # Last resort: try short_id field
        result = db.surveys.update_one(
            {'short_id': survey_id},
            {'$set': {'collect_location': new_val}},
        )

    if result.matched_count == 0:
        return jsonify({'error': 'Survey not found'}), 404

    return jsonify({'message': f'Survey location collection {"enabled" if new_val else "disabled"}'})


# ── Helper used by other backend modules ─────────────────────────────────────

def is_location_globally_enabled() -> bool:
    """Check master switch. Call from survey submission / session tracking."""
    s = db.site_settings.find_one({'key': 'location_control'}) or {}
    return bool(s.get('global_location_enabled', False))


def should_collect_for_survey(survey_doc: dict) -> bool:
    """
    Returns True if a survey should trigger GPS location collection.
    Respects the full hierarchy.
    """
    s = db.site_settings.find_one({'key': 'location_control'}) or {}
    if not s.get('global_location_enabled', False):
        return False
    if s.get('all_surveys_location_enabled', False):
        return True
    return bool(survey_doc.get('collect_location', False))


def should_collect_at_signup() -> bool:
    """Returns True if the signup GPS popup should be shown."""
    s = db.site_settings.find_one({'key': 'location_control'}) or {}
    if not s.get('global_location_enabled', False):
        return False
    return bool(s.get('signup_location_enabled', False))
