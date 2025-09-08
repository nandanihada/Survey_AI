"""
JWT Authentication middleware for Flask routes
"""
from functools import wraps
from flask import request, jsonify, g
from auth_service import AuthService

auth_service = AuthService()

def get_token_from_request():
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ')[1]

def requireAuth(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = get_token_from_request()
            if not token:
                return jsonify({'error': 'Authorization token required'}), 401
            
            user = auth_service.get_user_from_token(token)
            if not user:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Attach user to request context
            g.current_user = user
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
    
    return decorated_function

def requireAdmin(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = get_token_from_request()
            if not token:
                return jsonify({'error': 'Authorization token required'}), 401
            
            user = auth_service.get_user_from_token(token)
            if not user:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            if user.get('role') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            
            # Attach user to request context
            g.current_user = user
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
    
    return decorated_function

def requireFeature(feature_name):
    """Decorator to require specific feature access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                token = get_token_from_request()
                if not token:
                    return jsonify({'error': 'Authorization token required'}), 401
                
                user = auth_service.get_user_from_token(token)
                if not user:
                    return jsonify({'error': 'Invalid or expired token'}), 401
                
                from role_manager import RoleManager
                if not RoleManager.has_feature_access(user.get('role'), feature_name):
                    return jsonify({
                        'error': f'Access denied. This feature requires {feature_name} access.',
                        'required_feature': feature_name,
                        'user_role': user.get('role')
                    }), 403
                
                # Attach user to request context
                g.current_user = user
                return f(*args, **kwargs)
                
            except Exception as e:
                return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
        
        return decorated_function
    return decorator

def requireRole(minimum_role):
    """Decorator to require minimum role level"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                token = get_token_from_request()
                if not token:
                    return jsonify({'error': 'Authorization token required'}), 401
                
                user = auth_service.get_user_from_token(token)
                if not user:
                    return jsonify({'error': 'Invalid or expired token'}), 401
                
                from role_manager import RoleManager, UserRole
                user_role = user.get('role')
                
                # Define role hierarchy levels
                role_levels = {
                    'basic': 1,
                    'premium': 2,
                    'enterprise': 3,
                    'admin': 4
                }
                
                user_level = role_levels.get(user_role, 0)
                required_level = role_levels.get(minimum_role, 0)
                
                if user_level < required_level:
                    return jsonify({
                        'error': f'Access denied. This feature requires {minimum_role} role or higher.',
                        'required_role': minimum_role,
                        'user_role': user_role
                    }), 403
                
                # Attach user to request context
                g.current_user = user
                return f(*args, **kwargs)
                
            except Exception as e:
                return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
        
        return decorated_function
    return decorator

def optionalAuth(f):
    """Decorator for optional authentication (user attached if token present)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = get_token_from_request()
            if token:
                user = auth_service.get_user_from_token(token)
                g.current_user = user
            else:
                g.current_user = None
            
            return f(*args, **kwargs)
            
        except Exception as e:
            # If token is invalid, continue without user
            g.current_user = None
            return f(*args, **kwargs)
    
    return decorated_function

def get_current_user():
    """Get current user from request context or token"""
    # First check if user is already in request context
    if hasattr(g, 'current_user') and g.current_user:
        return g.current_user
    
    # Otherwise try to get from token
    try:
        token = get_token_from_request()
        if not token:
            return None
        
        user = auth_service.get_user_from_token(token)
        return user
    except Exception:
        return None

# Legacy function names for backward compatibility
require_auth = requireAuth
require_admin = requireAdmin
optional_auth = optionalAuth
require_feature = requireFeature
require_role = requireRole
