#!/usr/bin/env python3
"""
Test role refresh and feature access after role updates
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_role_update_and_refresh():
    """Test that role updates work and permissions refresh correctly"""
    print("=== Testing Role Update & Permission Refresh ===")
    
    # Test user credentials
    test_email = "test@example.com"
    test_password = "password123"
    
    # 1. Register/Login user
    print("1. Registering test user...")
    register_data = {
        "email": test_email,
        "password": test_password,
        "name": "Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code == 201:
            print("✅ User registered successfully")
        else:
            print(f"Registration response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Registration error: {e}")
    
    # 2. Login user
    print("2. Logging in user...")
    login_data = {
        "email": test_email,
        "password": test_password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            user_token = data.get('token')
            print("✅ User logged in successfully")
            print(f"Initial role: {data.get('user', {}).get('role', 'unknown')}")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"Login error: {e}")
        return
    
    # 3. Check initial permissions
    print("3. Checking initial permissions...")
    headers = {"Authorization": f"Bearer {user_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        if response.status_code == 200:
            permissions = response.json()
            print(f"✅ Initial permissions: Role={permissions.get('role')}, Features={permissions.get('features')}")
        else:
            print(f"Failed to get permissions: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Permissions error: {e}")
    
    # 4. Get user ID for admin operations
    print("4. Getting user ID...")
    try:
        # First, we need admin access - let's make the first user admin
        from pymongo import MongoClient
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/survey_db')
        client = MongoClient(MONGODB_URI)
        db = client.get_default_database()
        
        # Find the test user
        user_doc = db.users.find_one({'email': test_email})
        if user_doc:
            user_id = str(user_doc['_id'])
            print(f"✅ Found user ID: {user_id}")
            
            # Make user admin temporarily for testing
            db.users.update_one(
                {'_id': user_doc['_id']},
                {'$set': {'role': 'admin'}}
            )
            print("✅ Temporarily made user admin for testing")
            
            # 5. Test role update via API
            print("5. Testing role update via admin API...")
            admin_headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
            
            # Update role to premium
            role_update_data = {"role": "premium"}
            response = requests.put(
                f"{BASE_URL}/api/admin/users/{user_id}/role",
                headers=admin_headers,
                json=role_update_data
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Role updated successfully: {result.get('message')}")
            else:
                print(f"❌ Role update failed: {response.status_code} - {response.text}")
            
            # 6. Check permissions after role update
            print("6. Checking permissions after role update...")
            response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
            if response.status_code == 200:
                new_permissions = response.json()
                print(f"✅ Updated permissions: Role={new_permissions.get('role')}, Features={new_permissions.get('features')}")
                
                # Compare features
                old_features = permissions.get('features', [])
                new_features = new_permissions.get('features', [])
                added_features = set(new_features) - set(old_features)
                if added_features:
                    print(f"✅ New features gained: {list(added_features)}")
                else:
                    print("⚠️  No new features detected - user may need to refresh token")
            else:
                print(f"❌ Failed to get updated permissions: {response.status_code} - {response.text}")
        
        else:
            print("❌ User not found in database")
            
    except Exception as e:
        print(f"Database operation error: {e}")
    
    print("\n" + "="*50)
    print("🎯 Key Findings:")
    print("- If 'No new features detected', users need to log out and back in")
    print("- Or implement automatic token refresh mechanism")
    print("- Role updates work at database level but tokens need refresh")

if __name__ == "__main__":
    test_role_update_and_refresh()
