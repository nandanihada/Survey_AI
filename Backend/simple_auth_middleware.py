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
    Simple authentication decorator that works with our localStorage login system
    Expects user_id in request headers or body
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Try to get user_id from different sources
            user_id = None
            
            # 1. Try Authorization header (Bearer token format)
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                user_id = auth_header.replace('Bearer ', '')
            
            # 2. Try X-User-ID header
            if not user_id:
                user_id = request.headers.get('X-User-ID')
            
            # 3. Try request body (for POST requests)
            if not user_id and request.is_json:
                data = request.get_json()
                if data:
                    user_id = data.get('user_id')
            
            # 4. Try query parameter
            if not user_id:
                user_id = request.args.get('user_id')
            
            if not user_id:
                print("❌ No user_id found in request")
                return jsonify({'error': 'Authorization token required'}), 401
            
            # Find user in database
            user = None
            
            # Try different ways to find the user
            try:
                # Try as ObjectId first
                if ObjectId.is_valid(user_id):
                    user = db.users.find_one({"_id": ObjectId(user_id)})
            except Exception as e:
                print(f"ObjectId lookup failed: {e}")
            
            # If ObjectId lookup failed, try as string
            if not user:
                try:
                    user = db.users.find_one({"_id": user_id})
                except Exception as e:
                    print(f"String ID lookup failed: {e}")
            
            # If still not found, try by email (fallback)
            if not user and '@' in user_id:
                try:
                    user = db.users.find_one({"email": user_id})
                except Exception as e:
                    print(f"Email lookup failed: {e}")
            
            if not user:
                print(f"❌ User not found: {user_id}")
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            print(f"✅ Authenticated user: {user.get('email', 'Unknown')} (ID: {user_id})")
            
            # Attach user to request context (compatible with existing code)
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
