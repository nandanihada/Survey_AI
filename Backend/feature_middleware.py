"""
Feature-based access control middleware
"""
from functools import wraps
from flask import request, jsonify, g
from auth_middleware import get_current_user
from role_manager import RoleManager

def requireFeature(feature_name):
    """Decorator to require specific feature access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check if user is authenticated
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Check if user has access to the feature
            user_role = user.get('role', 'basic')
            if not RoleManager.has_feature_access(user_role, feature_name):
                return jsonify({
                    'error': f'Access denied. This feature requires a higher subscription level.',
                    'required_feature': feature_name,
                    'user_role': user_role,
                    'user_features': RoleManager.get_user_features(user_role)
                }), 403
            
            # Store user in g for use in the route
            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def requireRole(required_role):
    """Decorator to require specific role or higher"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check if user is authenticated
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            user_role = user.get('role', 'basic')
            
            # Check role hierarchy
            role_hierarchy = ['basic', 'premium', 'enterprise', 'admin']
            try:
                user_level = role_hierarchy.index(user_role)
                required_level = role_hierarchy.index(required_role)
                
                if user_level < required_level:
                    return jsonify({
                        'error': f'Access denied. Requires {required_role} role or higher.',
                        'user_role': user_role,
                        'required_role': required_role
                    }), 403
            except ValueError:
                return jsonify({'error': 'Invalid role configuration'}), 500
            
            # Store user in g for use in the route
            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def requireStatus(allowed_statuses):
    """Decorator to require specific account status"""
    if isinstance(allowed_statuses, str):
        allowed_statuses = [allowed_statuses]
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check if user is authenticated
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            user_status = user.get('status', 'approved')
            if user_status not in allowed_statuses:
                can_login, status_message = RoleManager.can_login(user_status)
                if not can_login:
                    return jsonify({
                        'error': status_message.message,
                        'title': status_message.title,
                        'user_status': user_status
                    }), 403
            
            # Store user in g for use in the route
            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_user_permissions():
    """Get current user's permissions for frontend"""
    user = get_current_user()
    if not user:
        return {
            'authenticated': False,
            'role': None,
            'status': None,
            'features': []
        }
    
    user_role = user.get('role', 'basic')
    user_status = user.get('status', 'approved')
    
    return {
        'authenticated': True,
        'role': user_role,
        'status': user_status,
        'features': RoleManager.get_user_features(user_role),
        'can_access_admin': RoleManager.can_access_admin_features(user_role),
        'role_display_name': RoleManager.get_role_display_name(user_role)
    }
