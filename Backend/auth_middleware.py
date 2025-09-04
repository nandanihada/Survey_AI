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

# Legacy function names for backward compatibility
require_auth = requireAuth
require_admin = requireAdmin
optional_auth = optionalAuth
