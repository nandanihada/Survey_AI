#!/usr/bin/env python3
"""
Quick test script for role-based authentication system
Run this after starting both frontend and backend servers
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_registration():
    """Test user registration"""
    print("🔐 Testing User Registration...")
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "testuser@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Registration successful")
        print(f"   Role: {data.get('user', {}).get('role', 'unknown')}")
        return data.get('token')
    else:
        print(f"❌ Registration failed: {response.text}")
        return None

def test_permissions(token):
    """Test permissions endpoint"""
    print("\n🔍 Testing Permissions Endpoint...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
    
    if response.status_code == 200:
        permissions = response.json()
        print("✅ Permissions retrieved:")
        print(f"   Role: {permissions.get('role')}")
        print(f"   Status: {permissions.get('status')}")
        print(f"   Features: {permissions.get('features', [])}")
        print(f"   Admin Access: {permissions.get('can_access_admin')}")
        return permissions
    else:
        print(f"❌ Permissions failed: {response.text}")
        return None

def test_role_hierarchy():
    """Test role hierarchy locally"""
    print("\n📊 Testing Role Hierarchy...")
    
    try:
        from role_manager import RoleManager
        
        roles = RoleManager.get_valid_roles()
        print(f"Valid roles: {roles}")
        
        for role in roles:
            features = RoleManager.get_user_features(role)
            print(f"\n{role.upper()} features:")
            for feature in features:
                display_name = RoleManager.get_feature_display_name(feature)
                print(f"  - {display_name}")
                
    except Exception as e:
        print(f"❌ Role hierarchy test failed: {e}")

def test_status_blocking():
    """Test status message system"""
    print("\n🚫 Testing Status Blocking...")
    
    try:
        from role_manager import RoleManager
        
        statuses = ["approved", "disapproved", "locked"]
        
        for status in statuses:
            can_login, message = RoleManager.can_login(status)
            print(f"\nStatus '{status}':")
            print(f"  Can Login: {can_login}")
            if message:
                print(f"  Message: {message.message}")
                
    except Exception as e:
        print(f"❌ Status blocking test failed: {e}")

def main():
    print("🚀 Quick Role-Based Authentication Test")
    print("=" * 50)
    
    # Test local role system first
    test_role_hierarchy()
    test_status_blocking()
    
    # Test API endpoints
    print(f"\n🌐 Testing API at {BASE_URL}")
    
    try:
        # Test server connectivity
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print("✅ Backend server is running")
    except:
        print("❌ Backend server not accessible")
        print("   Make sure backend is running on port 5000")
        return
    
    # Test registration and permissions
    token = test_registration()
    if token:
        test_permissions(token)
    
    print("\n✅ Quick test completed!")
    print("\nNext steps:")
    print("1. Check frontend at http://localhost:5173")
    print("2. Test role changes through admin interface")
    print("3. Test feature-based UI components")

if __name__ == "__main__":
    main()
