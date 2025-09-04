#!/usr/bin/env python3
"""
Simple test API to check survey listing functionality
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from mongodb_config import db
from auth_middleware import requireAuth, optionalAuth
from auth_service import AuthService
from flask import g

app = Flask(__name__)
CORS(app, supports_credentials=True)

auth_service = AuthService()

@app.route('/test/surveys', methods=['GET'])
@requireAuth
def test_get_surveys():
    """Test endpoint to get user surveys"""
    try:
        user = g.current_user
        user_id = str(user['_id'])
        
        print(f"Current user: {user.get('email')} (ID: {user_id})")
        
        # Get surveys for this user
        surveys = list(db.surveys.find({
            'ownerUserId': user_id
        }).sort('created_at', -1))
        
        print(f"Found {len(surveys)} surveys for user {user_id}")
        
        # Convert ObjectIds to strings
        for survey in surveys:
            survey['_id'] = str(survey['_id'])
            if 'created_at' in survey:
                survey['created_at'] = survey['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'user_email': user.get('email'),
            'surveys': surveys,
            'total': len(surveys)
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/test/all-surveys', methods=['GET'])
def test_get_all_surveys():
    """Test endpoint to get all surveys"""
    try:
        surveys = list(db.surveys.find({}, {
            'prompt': 1, 
            'ownerUserId': 1, 
            'created_at': 1,
            '_id': 1
        }).sort('created_at', -1))
        
        print(f"Total surveys in database: {len(surveys)}")
        
        # Convert ObjectIds to strings
        for survey in surveys:
            survey['_id'] = str(survey['_id'])
            if 'created_at' in survey:
                survey['created_at'] = survey['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'surveys': surveys,
            'total': len(surveys)
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/test/users', methods=['GET'])
def test_get_users():
    """Test endpoint to get all users"""
    try:
        users = list(db.users.find({}, {
            'email': 1, 
            'name': 1, 
            'simpleUserId': 1,
            '_id': 1
        }))
        
        print(f"Total users in database: {len(users)}")
        
        # Convert ObjectIds to strings
        for user in users:
            user['_id'] = str(user['_id'])
        
        return jsonify({
            'success': True,
            'users': users,
            'total': len(users)
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting test API server...")
    app.run(debug=True, port=5001)
