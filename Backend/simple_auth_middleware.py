#!/usr/bin/env python3

"""
Simple Authentication Middleware
Works with localStorage-based login system
"""

from functools import wraps
from flask import request, jsonify, g
from mongodb_config import db
from bson import ObjectId

def simple_auth_required(f):
    """
    Hybrid authentication decorator that works with BOTH JWT tokens and raw user IDs
    Compatible with both old and new authentication systems
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Try to get token/user_id from Authorization header
            auth_header = request.headers.get('Authorization', '')
            token_or_id = None
            
            if auth_header.startswith('Bearer '):
                token_or_id = auth_header.replace('Bearer ', '').strip()
            
            if not token_or_id:
                # Try X-User-ID header
                token_or_id = request.headers.get('X-User-ID')
            
            if not token_or_id and request.is_json:
                # Try request body
                data = request.get_json()
                if data:
                    token_or_id = data.get('user_id')
            
            if not token_or_id:
                # Try query parameter
                token_or_id = request.args.get('user_id')
            
            if not token_or_id:
                print("❌ No token or user_id found in request")
                return jsonify({'error': 'Authorization token required'}), 401
            
            user = None
            
            # STEP 1: Try as JWT token first (deployed backend uses JWT)
            try:
                from auth_service import AuthService
                auth_service = AuthService()
                user = auth_service.get_user_from_token(token_or_id)
                if user:
                    print(f"✅ Authenticated via JWT: {user.get('email', 'Unknown')}")
                    g.current_user = user
                    return f(*args, **kwargs)
            except Exception as e:
                print(f"JWT verification failed (will try as user ID): {e}")
            
            # STEP 2: Try as raw user_id (fallback for simple auth)
            user_id = token_or_id
            
            # Try as ObjectId
            try:
                if ObjectId.is_valid(user_id):
                    user = db.users.find_one({"_id": ObjectId(user_id)})
            except Exception as e:
                print(f"ObjectId lookup failed: {e}")
            
            # Try as string ID
            if not user:
                try:
                    user = db.users.find_one({"_id": user_id})
                except Exception as e:
                    print(f"String ID lookup failed: {e}")
            
            # Try by simpleUserId
            if not user:
                try:
                    simple_id = int(user_id)
                    user = db.users.find_one({"simpleUserId": simple_id})
                except Exception as e:
                    print(f"SimpleUserId lookup failed: {e}")
            
            # Try by email as last resort
            if not user and '@' in user_id:
                try:
                    user = db.users.find_one({"email": user_id})
                except Exception as e:
                    print(f"Email lookup failed: {e}")
            
            if not user:
                print(f"❌ User not found with token/ID: {token_or_id}")
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            print(f"✅ Authenticated via user ID: {user.get('email', 'Unknown')}")
            
            # Attach user to request context
            g.current_user = user
            
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
    
    return decorated_function

def optional_auth(f):
    """
    Optional authentication - sets g.current_user if authenticated, None if not
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Try to get user_id from different sources
            user_id = None
            
            # 1. Try Authorization header
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                user_id = auth_header.replace('Bearer ', '')
            
            # 2. Try X-User-ID header
            if not user_id:
                user_id = request.headers.get('X-User-ID')
            
            # 3. Try request body
            if not user_id and request.is_json:
                data = request.get_json()
                if data:
                    user_id = data.get('user_id')
            
            # 4. Try query parameter
            if not user_id:
                user_id = request.args.get('user_id')
            
            if user_id:
                # Find user in database
                try:
                    user = db.users.find_one({"_id": ObjectId(user_id)})
                except:
                    user = db.users.find_one({"_id": user_id})
                
                if user:
                    g.current_user = user
                    print(f"✅ Optional auth: {user.get('email', 'Unknown')}")
                else:
                    g.current_user = None
                    print("⚠️ Optional auth: User not found")
            else:
                g.current_user = None
                print("ℹ️ Optional auth: No user_id provided")
            
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"⚠️ Optional auth error: {e}")
            g.current_user = None
            return f(*args, **kwargs)
    
    return decorated_function
