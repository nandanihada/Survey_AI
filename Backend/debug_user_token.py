#!/usr/bin/env python3
"""
Debug script to check user token and features
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
from auth_service import AuthService
from role_manager import RoleManager

def debug_user_token():
    """Debug user token generation and features"""
    print("🔍 Debugging User Token and Features")
    print("=" * 50)
    
    # Initialize auth service
    auth_service = AuthService()
    
    try:
        # Get database connection
        db = auth_service.get_db_connection()
        users_collection = db.users
        
        # Find a test user or create one
        test_email = "test@example.com"
        user = users_collection.find_one({'email': test_email})
        
        if not user:
            print(f"Creating test user: {test_email}")
            user = auth_service.register_user(test_email, "password123", "Test User")
        
        print(f"\n📋 User Info:")
        print(f"   Email: {user['email']}")
        print(f"   Role: {user.get('role', 'basic')}")
        print(f"   Status: {user.get('status', 'approved')}")
        
        # Generate JWT token
        token = auth_service.generate_jwt_token(user)
        print(f"\n🔑 Generated Token (first 50 chars): {token[:50]}...")
        
        # Verify token and check payload
        payload = auth_service.verify_jwt_token(token)
        print(f"\n📦 Token Payload:")
        for key, value in payload.items():
            if key not in ['exp', 'iat']:  # Skip timestamps for readability
                print(f"   {key}: {value}")
        
        # Check features from role manager
        user_role = user.get('role', 'basic')
        features = RoleManager.get_user_features(user_role)
        print(f"\n🎯 Features from RoleManager:")
        for feature in features:
            print(f"   - {feature}")
        
        # Test feature access
        test_features = ['create', 'survey', 'analytics', 'postback', 'pass_fail', 'test_lab']
        print(f"\n✅ Feature Access Test:")
        for feature in test_features:
            has_access = RoleManager.has_feature_access(user_role, feature)
            status = "✅" if has_access else "❌"
            print(f"   {status} {feature}")
        
        return token, payload
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

def test_different_roles():
    """Test token generation for different roles"""
    print("\n🎭 Testing Different Roles")
    print("=" * 30)
    
    auth_service = AuthService()
    db = auth_service.get_db_connection()
    users_collection = db.users
    
    roles = ['basic', 'premium', 'enterprise', 'admin']
    
    for role in roles:
        print(f"\n🔸 Testing {role.upper()} role:")
        
        # Create or update test user for this role
        test_email = f"{role}@example.com"
        
        # Update or create user with specific role
        users_collection.update_one(
            {'email': test_email},
            {
                '$set': {
                    'email': test_email,
                    'name': f"{role.title()} User",
                    'role': role,
                    'status': 'approved',
                    'passwordHash': auth_service.hash_password('password123'),
                    'createdAt': datetime.utcnow()
                }
            },
            upsert=True
        )
        
        user = users_collection.find_one({'email': test_email})
        token = auth_service.generate_jwt_token(user)
        payload = auth_service.verify_jwt_token(token)
        
        print(f"   Features: {payload.get('features', [])}")
        
        # Test specific feature access
        key_features = ['create', 'postback', 'test_lab']
        for feature in key_features:
            has_access = feature in payload.get('features', [])
            status = "✅" if has_access else "❌"
            print(f"   {status} {feature}")

if __name__ == "__main__":
    debug_user_token()
    test_different_roles()
    
    print("\n🚀 Debug complete!")
    print("Check the frontend to see if features are now accessible.")
