"""
Simple authentication test without Firebase dependencies
"""
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import secrets
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = 'test-secret-key'

CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:5173", "http://localhost:3000"],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Simple in-memory storage for testing
sessions = {}
users = {
    'test-user-123': {
        'uid': 'test-user-123',
        'email': 'test@example.com',
        'name': 'Test User',
        'role': 'user',
        'created_at': datetime.utcnow().isoformat()
    },
    'admin-user-456': {
        'uid': 'admin-user-456', 
        'email': 'admin@example.com',
        'name': 'Admin User',
        'role': 'admin',
        'created_at': datetime.utcnow().isoformat()
    }
}

@app.route('/auth/test-login', methods=['POST'])
def test_login():
    """Test login endpoint"""
    data = request.json
    user_type = data.get('user_type', 'user')  # 'user' or 'admin'
    
    # Select test user
    if user_type == 'admin':
        user = users['admin-user-456']
    else:
        user = users['test-user-123']
    
    # Create session
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        'user_id': user['uid'],
        'expires_at': datetime.utcnow() + timedelta(days=7)
    }
    
    # Create response with cookie
    response = make_response(jsonify({
        'message': 'Test login successful',
        'user': user
    }))
    
    response.set_cookie(
        'session_id',
        session_id,
        max_age=7*24*60*60,
        httponly=True,
        secure=False,  # False for local testing
        samesite='Lax'
    )
    
    return response

@app.route('/auth/me', methods=['GET'])
def get_current_user():
    """Get current user"""
    session_id = request.cookies.get('session_id')
    
    if not session_id or session_id not in sessions:
        return jsonify({'user': None}), 200
    
    session_data = sessions[session_id]
    
    # Check if session expired
    if datetime.utcnow() > session_data['expires_at']:
        del sessions[session_id]
        return jsonify({'user': None}), 200
    
    user = users.get(session_data['user_id'])
    return jsonify({'user': user})

@app.route('/auth/check', methods=['GET'])
def check_auth():
    """Check authentication status"""
    session_id = request.cookies.get('session_id')
    
    if not session_id or session_id not in sessions:
        return jsonify({'authenticated': False, 'user': None})
    
    session_data = sessions[session_id]
    
    # Check if session expired
    if datetime.utcnow() > session_data['expires_at']:
        del sessions[session_id]
        return jsonify({'authenticated': False, 'user': None})
    
    user = users.get(session_data['user_id'])
    return jsonify({'authenticated': True, 'user': user})

@app.route('/auth/logout', methods=['POST'])
def logout():
    """Logout"""
    session_id = request.cookies.get('session_id')
    
    if session_id and session_id in sessions:
        del sessions[session_id]
    
    response = make_response(jsonify({'message': 'Logged out'}))
    response.set_cookie('session_id', '', expires=0, httponly=True)
    
    return response

@app.route('/api/surveys', methods=['GET'])
def get_surveys():
    """Test protected endpoint"""
    session_id = request.cookies.get('session_id')
    
    if not session_id or session_id not in sessions:
        return jsonify({'error': 'Authentication required'}), 401
    
    session_data = sessions[session_id]
    user = users.get(session_data['user_id'])
    
    # Mock survey data
    mock_surveys = [
        {
            '_id': '1',
            'short_id': 'abc123',
            'title': 'Customer Satisfaction Survey',
            'description': 'Help us improve our service',
            'status': 'published',
            'created_at': datetime.utcnow().isoformat(),
            'owner_user_id': user['uid']
        }
    ]
    
    return jsonify({'surveys': mock_surveys, 'total': 1, 'user_role': user['role']})

if __name__ == '__main__':
    print("Starting simple auth test server...")
    print("Test endpoints:")
    print("- POST /auth/test-login (body: {\"user_type\": \"user\"} or {\"user_type\": \"admin\"})")
    print("- GET /auth/me")
    print("- GET /auth/check") 
    print("- POST /auth/logout")
    print("- GET /api/surveys")
    app.run(debug=True, port=5001)
