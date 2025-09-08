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
    """Get all users"""
    try:
        users = list(db.users.find().sort('createdAt', -1))
        
        # Convert ObjectIds to strings and remove sensitive data
        for user in users:
            convert_objectid_to_string(user)
        
        return jsonify({
            'users': users,
            'total': len(users)
        })
        
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
