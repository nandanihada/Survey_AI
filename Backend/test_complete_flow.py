#!/usr/bin/env python3

import requests
import json
import time

def test_complete_signup_login_flow():
    """Test the complete signup and login flow"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🔄 TESTING COMPLETE SIGNUP → LOGIN FLOW")
    print("="*60)
    
    # Test data
    test_user = {
        "name": "Test User",
        "email": "testuser123@example.com",
        "password": "password123",
        "website": "https://testuser.com",
        "postbackUrl": "https://testuser.com/postback?txn_id={transaction_id}&status={status}",
        "parameterMappings": {
            "transaction_id": "txn_id",
            "status": "status"
        }
    }
    
    print("STEP 1: Testing Signup")
    print("-" * 30)
    
    try:
        # Test signup
        print(f"📤 Creating account for: {test_user['email']}")
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_user),
            timeout=10
        )
        
        print(f"📊 Signup Status: {signup_response.status_code}")
        
        if signup_response.status_code == 201:
            result = signup_response.json()
            print("✅ SIGNUP SUCCESSFUL!")
            print(f"   User ID: {result.get('user', {}).get('id', 'N/A')}")
            print(f"   Message: {result.get('message', 'N/A')}")
        elif signup_response.status_code == 409:
            print("⚠️ User already exists - continuing with login test")
        else:
            error_data = signup_response.json()
            print(f"❌ SIGNUP FAILED: {error_data.get('error', 'Unknown error')}")
            return
            
    except Exception as e:
        print(f"❌ Signup error: {e}")
        return
    
    print(f"\nSTEP 2: Testing Login")
    print("-" * 30)
    
    # Wait a moment for database consistency
    time.sleep(1)
    
    try:
        # Test login
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        
        print(f"🔐 Attempting login for: {login_data['email']}")
        login_response = requests.post(
            f"{BASE_URL}/api/user/login",
            headers={"Content-Type": "application/json"},
            data=json.dumps(login_data),
            timeout=10
        )
        
        print(f"📊 Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            result = login_response.json()
            print("✅ LOGIN SUCCESSFUL!")
            print(f"   User ID: {result.get('user', {}).get('id', 'N/A')}")
            print(f"   Name: {result.get('user', {}).get('name', 'N/A')}")
            print(f"   Email: {result.get('user', {}).get('email', 'N/A')}")
            print(f"   Role: {result.get('user', {}).get('role', 'N/A')}")
            print(f"   Postback URL: {result.get('user', {}).get('postbackUrl', 'N/A')}")
        else:
            error_data = login_response.json()
            print(f"❌ LOGIN FAILED: {error_data.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Login error: {e}")
    
    print(f"\n🔄 COMPLETE FLOW TEST FINISHED")
    print("="*60)
    
    print("\n💡 For your original account:")
    print("   1. Go to http://localhost:5173/signup")
    print("   2. Create account with hasirqa@gmail.com again")
    print("   3. Remember the password you use")
    print("   4. Try logging in with those credentials")

if __name__ == "__main__":
    test_complete_signup_login_flow()
