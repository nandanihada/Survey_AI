#!/usr/bin/env python3

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from mongodb_config import db
from datetime import datetime, timedelta
from bson import ObjectId
import uuid

user_postback_bp = Blueprint('user_postback_bp', __name__)

# Helper to convert ObjectId to string
def convert_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

@user_postback_bp.route('/auth/send-confirmation', methods=['POST', 'OPTIONS'])
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
def send_confirmation():
    """Send signup confirmation email (NEW signup flow)"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Required fields
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        if len(data.get('password', '')) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        email = data['email'].strip().lower()
        
        # Check if user already exists (active)
        existing_user = db.users.find_one({"email": email, "status": "active"})
        if existing_user:
            return jsonify({"error": "User with this email already exists"}), 409
        
        # Check pending signup
        existing_pending = db.pending_users.find_one({"email": email})
        if existing_pending:
            return jsonify({"message": "Confirmation email resent", "email": email}), 200
        
        # Store pending user
        token = str(uuid.uuid4())
        expires = datetime.utcnow() + timedelta(hours=24)
        
        pending_data = {
            "email": email,
            "name": data.get('name', ''),
            "password": data['password'],  # Hash in production
            "website": data.get('website', ''),
            "postbackUrl": data.get('postbackUrl', ''),
            "parameterMappings": data.get('parameterMappings', {}),
            "responseContext": data.get('responseContext', {}),  # From ResponseLogs
            "token": token,
            "expires": expires,
            "createdAt": datetime.utcnow()
        }
        
        db.pending_users.insert_one(pending_data)
        print(f"📧 Pending user stored: {email}")
        
        # Send confirmation email
        from email_trigger_service import email_trigger_service
        frontend_url = "http://localhost:5173" if os.getenv("FLASK_ENV") == "development" else "https://pepperadsresponses.web.app"
        confirm_link = f"{frontend_url}/confirm?token={token}"
        
        subject = "✅ Confirm Your PepperAds Account"
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <img src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png" alt="PepperAds" style="width: 60px; height: 60px; filter: drop-shadow(0 0 10px rgba(255,0,0,0.5));">
                <h1 style="color: white; margin: 20px 0 10px; font-size: 28px; font-weight: 700;">Welcome to PepperAds!</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Complete your account setup</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 20px 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 10px;">Hi {pending_data['name'] or 'there'},</h2>
                <p style="color: #6b7280; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
                    Thanks for signing up! Click the button below to verify your email and activate your account.
                </p>
                <a href="{confirm_link}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 25px rgba(239,68,68,0.4); transition: all 0.3s;">
                    Verify Email & Activate Account
                </a>
                <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0; line-height: 1.5;">
                    Or copy this link: <br><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-size: 12px; word-break: break-all;">{confirm_link}</code>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                    Didn't request this? <strong>Ignore this email.</strong><br>
                    Token expires in 24 hours.
                </p>
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 PepperAds. All rights reserved.</p>
                </div>
            </div>
        </div>
        """
        
        email_sent = email_trigger_service.send_email(email, subject, html_body, is_html=True)
        
        if email_sent:
            print(f"✅ Confirmation email sent to {email}")
            return jsonify({
                "message": "Confirmation email sent! Check your inbox.",
                "email": email,
                "resendIn": 30000  # 30s delay for frontend
            }), 201
        else:
            print(f"❌ Failed to send confirmation email to {email}")
            # Don't delete pending user even if email fails
            return jsonify({"message": "Account created! Email delivery failed - contact support."}), 201
            
    except Exception as e:
        print(f"❌ Send confirmation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/auth/confirm', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app", 
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"]
)
def confirm_user():
    """Confirm user account from email link"""
    if request.method == 'OPTIONS':
        return '', 200
    
    token = request.args.get('token') or request.json.get('token')
    if not token:
        return jsonify({"error": "Token required"}), 400
    
    try:
        # Find pending user
        pending = db.pending_users.find_one({"token": token})
        if not pending:
            return jsonify({"error": "Invalid or expired token"}), 400
        
        if pending['expires'] < datetime.utcnow():
            return jsonify({"error": "Token expired. Please request new confirmation."}), 400
        
        # Create real user from pending data
        user_data = {
            "name": pending['name'],
            "email": pending['email'],
            "password": pending['password'],  # Hash in prod
            "website": pending.get('website', ''),
            "postbackUrl": pending.get('postbackUrl', ''),
            "parameterMappings": pending.get('parameterMappings', {}),
            "responseContext": pending.get('responseContext', {}),
            "role": "user",
            "status": "active",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "totalSurveys": 0,
            "totalResponses": 0
        }
        
        result = db.users.insert_one(user_data)
        user_data['id'] = str(result.inserted_id)
        
        # Cleanup pending
        db.pending_users.delete_one({"_id": pending['_id']})
        
        print(f"✅ User confirmed: {pending['email']}")
        print(f"Response context: {user_data.get('responseContext', {})}")
        
        return jsonify({
            "message": "Account confirmed successfully! Welcome to PepperAds.",
            "user": user_data,
            "surveyId": user_data['responseContext'].get('surveyId'),
            "responseId": user_data['responseContext'].get('responseId')
        }), 200
        
    except Exception as e:
        print(f"❌ Confirm error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user_postback_bp.route('/auth/resend-confirmation', methods=['POST', 'OPTIONS'])
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
def resend_confirmation():
    """Resend confirmation for existing pending user"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"error": "Email required"}), 400
        
        pending = db.pending_users.find_one({"email": email})
        if not pending:
            return jsonify({"error": "No pending confirmation found"}), 404
        
        if pending['expires'] < datetime.utcnow():
            return jsonify({"error": "Confirmation expired. Please signup again."}), 400
        
        # Resend email (reuse existing token)
        from email_trigger_service import email_trigger_service
        frontend_url = "http://localhost:5173" if os.getenv("FLASK_ENV") == "development" else "https://pepperadsresponses.web.app"
        confirm_link = f"{frontend_url}/confirm?token={pending['token']}"
        
        subject = "✅ Re: Confirm Your PepperAds Account"
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <img src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png" alt="PepperAds" style="width: 60px; height: 60px; filter: drop-shadow(0 0 10px rgba(255,0,0,0.5));">
                <h1 style="color: white; margin: 20px 0 10px; font-size: 28px; font-weight: 700;">Resend Confirmation</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 20px 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
                <p style="color: #1f2937; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                    Hi {pending['name']},<br><br>
                    Here's your confirmation link again:
                </p>
                <a href="{confirm_link}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 25px rgba(239,68,68,0.4);">
                    Verify & Activate Account
                </a>
                <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0; line-height: 1.5;">
                    Or: <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-size: 12px; word-break: break-all;">{confirm_link}</code>
                </p>
            </div>
        </div>
        """
        
        email_sent = email_trigger_service.send_email(email, subject, html_body, True)
        
        return jsonify({
            "message": "Confirmation resent! Check your inbox.",
            "email": email
        })
        
    except Exception as e:
        print(f"❌ Resend error: {str(e)}")
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
