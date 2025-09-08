#!/usr/bin/env python3
"""
Debug script to check user simpleUserId in database and JWT tokens
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
from auth_service import AuthService

def debug_user_simple_ids():
    """Debug user simpleUserId values"""
    print("🔍 Debugging User simpleUserId Values")
    print("=" * 50)
    
    # Initialize auth service
    auth_service = AuthService()
    
    try:
        # Get database connection
        db = auth_service.get_db_connection()
        users_collection = db.users
        
        # Find all users and check their simpleUserId
        users = list(users_collection.find({}, {'email': 1, 'simpleUserId': 1, 'role': 1}))
        
        print(f"📋 Found {len(users)} users:")
        for user in users:
            simple_id = user.get('simpleUserId', 'MISSING')
            print(f"   Email: {user['email']}")
            print(f"   Role: {user.get('role', 'basic')}")
            print(f"   simpleUserId: {simple_id}")
            
            # Generate JWT token and check if simpleUserId is included
            token = auth_service.generate_jwt_token(user)
            payload = auth_service.verify_jwt_token(token)
            
            print(f"   JWT simpleUserId: {payload.get('simpleUserId', 'MISSING')}")
            print("   ---")
        
        return users
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def fix_missing_simple_ids():
    """Fix users that don't have simpleUserId"""
    print("\n🔧 Fixing Missing simpleUserId Values")
    print("=" * 40)
    
    auth_service = AuthService()
    
    try:
        from utils.short_id import generate_simple_user_id
        
        db = auth_service.get_db_connection()
        users_collection = db.users
        
        # Find users without simpleUserId
        users_without_id = list(users_collection.find({'simpleUserId': {'$exists': False}}))
        
        if not users_without_id:
            print("✅ All users already have simpleUserId")
            return
        
        print(f"Found {len(users_without_id)} users without simpleUserId")
        
        for user in users_without_id:
            # Generate unique simple user ID
            while True:
                simple_user_id = generate_simple_user_id()
                # Check if this ID already exists
                if not users_collection.find_one({'simpleUserId': simple_user_id}):
                    break
            
            # Update user with simpleUserId
            users_collection.update_one(
                {'_id': user['_id']},
                {'$set': {'simpleUserId': simple_user_id}}
            )
            
            print(f"✅ Updated {user['email']} with simpleUserId: {simple_user_id}")
        
    except Exception as e:
        print(f"❌ Error fixing simpleUserId: {e}")

if __name__ == "__main__":
    debug_user_simple_ids()
    fix_missing_simple_ids()
    
    print("\n🚀 Debug complete!")
    print("Now try creating a survey to see if user_id is included in the URL.")
