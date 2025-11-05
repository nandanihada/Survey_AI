#!/usr/bin/env python3

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from mongodb_config import db
from datetime import datetime
from bson import ObjectId
import uuid

user_postback_bp = Blueprint('user_postback_bp', __name__)

# Helper to convert ObjectId to string
def convert_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

@user_postback_bp.route('/auth/signup', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def signup_user():
    """Create a new user account with postback configuration"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'website', 'postbackUrl']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Validate password length
        if len(data.get('password', '')) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Check if user already exists
        existing_user = db.users.find_one({"email": data['email']})
        if existing_user:
            return jsonify({"error": "User with this email already exists"}), 409
        
        # Create new user (password should be hashed in production)
        user_data = {
            "name": data['name'],
            "email": data['email'],
            "password": data['password'],  # TODO: Hash password in production
            "website": data['website'],
            "postbackUrl": data['postbackUrl'],
            "parameterMappings": data.get('parameterMappings', {}),
            "role": "user",
            "status": "active",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "totalSurveys": 0,
            "totalResponses": 0
        }
        
        result = db.users.insert_one(user_data)
        user_data['id'] = str(result.inserted_id)
        del user_data['_id']
        
        print(f"✅ New PepperAds user created: {user_data['email']} with postback URL: {user_data['postbackUrl']}")
        
        return jsonify({
            "message": "PepperAds account created successfully",
            "user": user_data
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/user/login', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def login_user():
    """Login user with email and password"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Find user in database
        print(f"🔍 Looking for user with email: {email}")
        user = db.users.find_one({"email": email})
        if not user:
            print(f"❌ User not found: {email}")
            return jsonify({"error": "Invalid email or password"}), 401
        
        print(f"✅ User found: {user.get('name', 'N/A')}")
        print(f"🔐 Stored password: {user.get('password', 'N/A')}")
        print(f"🔐 Provided password: {password}")
        
        # Check password (in production, this should be hashed)
        if user.get('password') != password:
            print(f"❌ Password mismatch")
            return jsonify({"error": "Invalid email or password"}), 401
        
        print(f"✅ Password matches!")
        
        # Return user data (excluding password)
        user_data = {
            "id": str(user['_id']),
            "name": user.get('name', ''),
            "email": user.get('email', ''),
            "role": user.get('role', 'user'),
            "website": user.get('website', ''),
            "postbackUrl": user.get('postbackUrl', ''),
            "parameterMappings": user.get('parameterMappings', {})
        }
        
        print(f"✅ User logged in: {user_data['email']}")
        
        return jsonify({
            "message": "Login successful",
            "user": user_data
        }), 200
        
    except Exception as e:
        print(f"❌ Error during login: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/user/profile', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "PUT", "POST", "DELETE", "OPTIONS"]
)
def get_user_profile():
    """Get user profile with postback configuration"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200
        
    try:
        # Get user ID from query parameter (simple auth for now)
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "User ID required"}), 401
        
        user = db.users.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get user statistics
        total_surveys = db.surveys.count_documents({"ownerUserId": user_id})
        total_responses = db.responses.count_documents({"survey_creator_id": user_id})
        
        profile_data = {
            "id": str(user['_id']),
            "name": user.get('name', ''),
            "email": user.get('email', ''),
            "website": user.get('website', ''),
            "postbackUrl": user.get('postbackUrl', ''),
            "postbackMethod": user.get('postbackMethod', 'POST'),
            "includeResponses": user.get('includeResponses', True),
            "parameterMappings": user.get('parameterMappings', {}),
            "createdAt": user.get('createdAt', datetime.utcnow()).isoformat(),
            "totalSurveys": total_surveys,
            "totalResponses": total_responses
        }
        
        return jsonify(profile_data)
        
    except Exception as e:
        print(f"❌ Error getting user profile: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/user/profile', methods=['PUT', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "PUT", "POST", "DELETE", "OPTIONS"]
)
def update_user_profile():
    """Update user profile and postback configuration"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Get user ID from request data (simple auth for now)
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({"error": "User ID required"}), 401
        
        # Validate user exists
        user = db.users.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update user data
        update_data = {
            "updatedAt": datetime.utcnow()
        }
        
        if 'name' in data:
            update_data['name'] = data['name']
        if 'website' in data:
            update_data['website'] = data['website']
        if 'postbackUrl' in data:
            update_data['postbackUrl'] = data['postbackUrl']
        if 'postbackMethod' in data:
            update_data['postbackMethod'] = data['postbackMethod']
        if 'includeResponses' in data:
            update_data['includeResponses'] = data['includeResponses']
        if 'parameterMappings' in data:
            update_data['parameterMappings'] = data['parameterMappings']
        
        db.users.update_one(
            {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id},
            {"$set": update_data}
        )
        
        print(f"✅ User profile updated: {user['email']}")
        
        return jsonify({"message": "Profile updated successfully"})
        
    except Exception as e:
        print(f"❌ Error updating user profile: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/admin/users', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "OPTIONS"]
)
def get_all_users():
    """Get all users for admin panel"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # TODO: Verify admin authentication
        
        users_cursor = db.users.find()
        users = []
        
        for user in users_cursor:
            # Get user statistics
            user_id = str(user['_id'])
            total_surveys = db.surveys.count_documents({"ownerUserId": user_id})
            total_responses = db.responses.count_documents({"survey_creator_id": user_id})
            
            user_data = {
                "id": user_id,
                "name": user.get('name', ''),
                "email": user.get('email', ''),
                "website": user.get('website', ''),
                "postbackUrl": user.get('postbackUrl', ''),
                "parameterMappings": user.get('parameterMappings', {}),
                "role": user.get('role', 'user'),
                "status": user.get('status', 'active'),
                "createdAt": user.get('createdAt', datetime.utcnow()).isoformat(),
                "totalSurveys": total_surveys,
                "totalResponses": total_responses
            }
            users.append(user_data)
        
        return jsonify({
            "users": users,
            "total": len(users)
        })
        
    except Exception as e:
        print(f"❌ Error getting users: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/admin/users/<user_id>/postback', methods=['PUT', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["PUT", "OPTIONS"]
)
def admin_update_user_postback(user_id):
    """Admin endpoint to update user's postback configuration"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # TODO: Verify admin authentication
        
        # Validate user exists
        user = db.users.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update postback configuration
        update_data = {
            "updatedAt": datetime.utcnow()
        }
        
        if 'postbackUrl' in data:
            update_data['postbackUrl'] = data['postbackUrl']
        if 'parameterMappings' in data:
            update_data['parameterMappings'] = data['parameterMappings']
        
        db.users.update_one(
            {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id},
            {"$set": update_data}
        )
        
        print(f"✅ Admin updated postback for user: {user['email']}")
        
        return jsonify({"message": "User postback configuration updated successfully"})
        
    except Exception as e:
        print(f"❌ Error updating user postback: {str(e)}")
        return jsonify({"error": str(e)}), 500
