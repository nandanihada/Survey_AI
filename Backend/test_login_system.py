#!/usr/bin/env python3

import requests
import json

def test_login_system():
    """Test the new login system with the created account"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🔐 TESTING LOGIN SYSTEM")
    print("="*50)
    
    # Test login with the account you created
    login_data = {
        "email": "hasirqa@gmail.com",  # The email from your screenshot
        "password": "password123"      # You'll need to use the actual password you created
    }
    
    try:
        print("📤 Attempting login...")
        print(f"   Email: {login_data['email']}")
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            headers={"Content-Type": "application/json"},
            data=json.dumps(login_data),
            timeout=10
        )
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ LOGIN SUCCESSFUL!")
            print(f"   User ID: {result.get('user', {}).get('id', 'N/A')}")
            print(f"   Name: {result.get('user', {}).get('name', 'N/A')}")
            print(f"   Email: {result.get('user', {}).get('email', 'N/A')}")
            print(f"   Role: {result.get('user', {}).get('role', 'N/A')}")
            print(f"   Postback URL: {result.get('user', {}).get('postbackUrl', 'N/A')}")
        elif response.status_code == 401:
            error_data = response.json()
            print(f"❌ LOGIN FAILED: {error_data.get('error', 'Invalid credentials')}")
            print("   Check if:")
            print("   1. Email is correct")
            print("   2. Password matches what you used during signup")
            print("   3. Account was created successfully")
        elif response.status_code == 404:
            print("❌ LOGIN ENDPOINT NOT FOUND")
            print("   Backend needs restart to load new API endpoints")
        else:
            try:
                error_data = response.json()
                print(f"❌ LOGIN FAILED: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"❌ LOGIN FAILED: HTTP {response.status_code}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("   Make sure backend is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print(f"\n🔐 LOGIN SYSTEM TEST COMPLETE")
    print("="*50)
    print("\n💡 If login fails:")
    print("   1. Restart backend server to load new API endpoints")
    print("   2. Check if account was created with correct password")
    print("   3. Try creating a new account with known password")

if __name__ == "__main__":
    test_login_system()
