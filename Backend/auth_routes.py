"""
Authentication routes for Flask app 
"""
from flask import Blueprint, request, jsonify, make_response
from auth_service import AuthService
from auth_middleware import requireAuth, optionalAuth
from feature_middleware import get_user_permissions
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
auth_service = AuthService()

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    """Register a new user"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = auth_service.register_user(email, password, name)
        token = auth_service.generate_jwt_token(user)
        
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """Login user with email and password"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = auth_service.authenticate_user(email, password)
        token = auth_service.generate_jwt_token(user)
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/verify-token', methods=['POST', 'OPTIONS'])
def verify_token():
    """Verify JWT token"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        user = auth_service.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        
        return jsonify({
            'message': 'Token valid',
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Token verification failed: {str(e)}'}), 401

@auth_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    """Logout user (client-side token removal)"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@auth_bp.route('/me', methods=['GET', 'OPTIONS'])
def get_current_user():
    """Get current user information"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'user': None}), 200
        
        token = auth_header.split(' ')[1]
        user = auth_service.get_user_from_token(token)
        
        if not user:
            return jsonify({'user': None}), 200
        
        user_data = {
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'simpleUserId': user.get('simpleUserId', 0),
            'role': user['role'],
            'createdAt': user['createdAt'].isoformat() if user.get('createdAt') else None
        }
        
        return jsonify({'user': user_data})
        
    except Exception as e:
        return jsonify({'error': f'Failed to get user: {str(e)}'}), 500

@auth_bp.route('/check', methods=['GET', 'OPTIONS'])
def check_auth():
    """Check if user is authenticated"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'authenticated': False}), 200
        
        token = auth_header.split(' ')[1]
        user = auth_service.get_user_from_token(token)
        
        return jsonify({
            'authenticated': user is not None,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            } if user else None
        })
        
    except Exception as e:
        return jsonify({'error': f'Auth check failed: {str(e)}'}), 500

@auth_bp.route('/permissions', methods=['GET', 'OPTIONS'])
def get_permissions():
    """Get current user's permissions and feature access"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        permissions = get_user_permissions()
        return jsonify(permissions)
        
    except Exception as e:
        return jsonify({'error': f'Failed to get permissions: {str(e)}'}), 500
