#!/usr/bin/env python3
"""
Comprehensive test for Role-Based Access Control system
"""
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:5000"

def test_user_registration_and_login():
    """Test user registration and login"""
    print("=== Testing User Registration & Login ===")
    
    # Test user data
    test_users = [
        {"email": "basic@test.com", "password": "password123", "name": "Basic User"},
        {"email": "premium@test.com", "password": "password123", "name": "Premium User"},
        {"email": "enterprise@test.com", "password": "password123", "name": "Enterprise User"},
        {"email": "admin@test.com", "password": "password123", "name": "Admin User"}
    ]
    
    tokens = {}
    
    for user in test_users:
        # Register user
        try:
            response = requests.post(f"{BASE_URL}/api/auth/register", json=user)
            if response.status_code == 201:
                print(f"✅ Registered {user['email']}")
            else:
                print(f"⚠️  Registration failed for {user['email']}: {response.text}")
        except Exception as e:
            print(f"❌ Registration error for {user['email']}: {e}")
        
        # Login user
        try:
            login_data = {"email": user["email"], "password": user["password"]}
            response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                tokens[user['email']] = data.get('token')
                print(f"✅ Logged in {user['email']}")
            else:
                print(f"❌ Login failed for {user['email']}: {response.text}")
        except Exception as e:
            print(f"❌ Login error for {user['email']}: {e}")
    
    return tokens

def test_admin_operations(admin_token):
    """Test admin operations"""
    print("\n=== Testing Admin Operations ===")
    
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # Get all users
    try:
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        if response.status_code == 200:
            users = response.json().get('users', [])
            print(f"✅ Retrieved {len(users)} users")
            
            # Test role updates
            for user in users[:3]:  # Test first 3 users
                user_id = user.get('_id')
                email = user.get('email')
                
                if email == 'basic@test.com':
                    new_role = 'premium'
                elif email == 'premium@test.com':
                    new_role = 'enterprise'
                elif email == 'enterprise@test.com':
                    new_role = 'basic'
                else:
                    continue
                
                # Update role
                role_response = requests.put(
                    f"{BASE_URL}/api/admin/users/{user_id}/role",
                    headers=headers,
                    json={"role": new_role}
                )
                
                if role_response.status_code == 200:
                    print(f"✅ Updated {email} role to {new_role}")
                else:
                    print(f"❌ Failed to update {email} role: {role_response.text}")
                
                # Update status
                status_response = requests.put(
                    f"{BASE_URL}/api/admin/users/{user_id}/status",
                    headers=headers,
                    json={"status": "approved"}
                )
                
                if status_response.status_code == 200:
                    print(f"✅ Updated {email} status to approved")
                else:
                    print(f"❌ Failed to update {email} status: {status_response.text}")
        
        else:
            print(f"❌ Failed to get users: {response.text}")
    
    except Exception as e:
        print(f"❌ Admin operations error: {e}")

def test_role_hierarchy():
    """Test role hierarchy endpoint"""
    print("\n=== Testing Role Hierarchy ===")
    
    try:
        response = requests.get(f"{BASE_URL}/api/admin/roles")
        if response.status_code == 200:
            data = response.json()
            print("✅ Role hierarchy retrieved:")
            print(f"   Valid roles: {data.get('valid_roles')}")
            print(f"   Valid statuses: {data.get('valid_statuses')}")
            
            roles = data.get('roles', {})
            for role, features in roles.items():
                print(f"   {role}: {features}")
        else:
            print(f"❌ Failed to get role hierarchy: {response.text}")
    
    except Exception as e:
        print(f"❌ Role hierarchy error: {e}")

def test_permissions_endpoint(tokens):
    """Test permissions endpoint for different users"""
    print("\n=== Testing Permissions Endpoint ===")
    
    for email, token in tokens.items():
        if not token:
            continue
            
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {email} permissions:")
                print(f"   Role: {data.get('role')}")
                print(f"   Status: {data.get('status')}")
                print(f"   Features: {data.get('features', [])}")
            else:
                print(f"❌ Failed to get permissions for {email}: {response.text}")
        
        except Exception as e:
            print(f"❌ Permissions error for {email}: {e}")

def main():
    """Run complete RBAC test suite"""
    print("🚀 Starting Complete RBAC Test Suite")
    print("=" * 50)
    
    # Test registration and login
    tokens = test_user_registration_and_login()
    
    # Get admin token (assume first user becomes admin)
    admin_token = None
    for email, token in tokens.items():
        if token:
            admin_token = token
            break
    
    if not admin_token:
        print("❌ No valid tokens found, cannot continue tests")
        return
    
    # Test role hierarchy
    test_role_hierarchy()
    
    # Test permissions
    test_permissions_endpoint(tokens)
    
    # Test admin operations
    test_admin_operations(admin_token)
    
    print("\n" + "=" * 50)
    print("🎉 RBAC Test Suite Complete!")
    print("\nNext steps:")
    print("1. Check your admin dashboard in the browser")
    print("2. Try changing roles and statuses")
    print("3. Test feature access with different user roles")

if __name__ == "__main__":
    main()
