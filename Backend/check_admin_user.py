#!/usr/bin/env python3
"""
Check current admin user and token validation
"""
import os
from pymongo import MongoClient
from bson import ObjectId
from auth_service import AuthService

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/survey_db')
client = MongoClient(MONGODB_URI)
db = client.get_default_database()

def check_admin_users():
    """Check which users have admin role"""
    print("=== Admin Users Check ===")
    
    # Find all admin users
    admin_users = list(db.users.find({'role': 'admin'}))
    print(f"Found {len(admin_users)} admin users:")
    
    for user in admin_users:
        print(f"  - {user.get('email')} (ID: {user.get('_id')}, Role: {user.get('role')}, Status: {user.get('status', 'NOT_SET')})")
    
    # Also check for old 'admin' role users
    old_admin_users = list(db.users.find({'role': {'$in': ['admin', 'user']}}))
    print(f"\nAll users with role 'admin' or 'user':")
    for user in old_admin_users:
        print(f"  - {user.get('email')} (Role: {user.get('role')}, Status: {user.get('status', 'approved')})")

def test_token_validation():
    """Test JWT token validation"""
    print("\n=== Token Validation Test ===")
    
    # Get first admin user
    admin_user = db.users.find_one({'role': 'admin'})
    if not admin_user:
        print("No admin user found!")
        return
    
    print(f"Testing with admin user: {admin_user.get('email')}")
    
    # Generate token
    auth_service = AuthService()
    token = auth_service.generate_jwt_token(admin_user)
    print(f"Generated token: {token[:50]}...")
    
    # Verify token
    try:
        payload = auth_service.verify_jwt_token(token)
        print(f"Token payload: {payload}")
        
        # Test get_user_from_token
        user_from_token = auth_service.get_user_from_token(token)
        if user_from_token:
            print(f"User from token: {user_from_token.get('email')} (Role: {user_from_token.get('role')})")
        else:
            print("Failed to get user from token!")
            
    except Exception as e:
        print(f"Token validation failed: {e}")

if __name__ == "__main__":
    check_admin_users()
    test_token_validation()
