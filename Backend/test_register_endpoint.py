#!/usr/bin/env python3

"""
Test if register endpoint is available on deployed backend
"""

import requests

def test_register_endpoint():
    """Test register endpoint on deployed backend"""
    
    DEPLOYED_URL = "https://api.theinterwebsite.space"
    FRONTEND_URL = "https://hostsliceresponse.web.app"
    
    print("🧪 TESTING REGISTER ENDPOINT")
    print("="*60)
    
    # Test OPTIONS preflight
    print("\n📋 Testing OPTIONS preflight...")
    try:
        options_response = requests.options(
            f"{DEPLOYED_URL}/api/auth/register",
            headers={
                "Origin": FRONTEND_URL,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        print(f"Status: {options_response.status_code}")
        print(f"CORS Origin: {options_response.headers.get('Access-Control-Allow-Origin')}")
        
        if options_response.status_code == 200:
            print("✅ OPTIONS request successful")
        else:
            print(f"❌ OPTIONS failed: {options_response.status_code}")
            
    except Exception as e:
        print(f"❌ OPTIONS error: {e}")
    
    # Test actual POST
    print("\n📋 Testing POST to /api/auth/register...")
    try:
        register_response = requests.post(
            f"{DEPLOYED_URL}/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "Test123!",
                "name": "Test User"
            },
            headers={
                "Origin": FRONTEND_URL,
                "Content-Type": "application/json"
            }
        )
        
        print(f"Status: {register_response.status_code}")
        print(f"Content-Type: {register_response.headers.get('content-type')}")
        
        if 'application/json' in register_response.headers.get('content-type', ''):
            print("✅ Returns JSON (endpoint exists)")
            print(f"Response: {register_response.json()}")
        elif 'text/html' in register_response.headers.get('content-type', ''):
            print("❌ Returns HTML (endpoint NOT found - 404 page)")
            print("   Backend needs to be redeployed!")
        else:
            print(f"⚠️ Unexpected content type")
            
    except Exception as e:
        print(f"❌ POST error: {e}")
    
    print("\n💡 SUMMARY:")
    print("="*60)
    if 'application/json' in register_response.headers.get('content-type', ''):
        print("✅ Register endpoint is WORKING on deployed backend!")
        print("   If signup still fails, clear browser cache and try again")
    else:
        print("❌ Register endpoint NOT available on deployed backend")
        print("   ACTION NEEDED:")
        print("   1. Go to Render dashboard")
        print("   2. Check if deployment is in progress")
        print("   3. If not, trigger manual deploy")
        print("   4. Wait for deployment to complete")
        print("   5. Run this test again")

if __name__ == "__main__":
    test_register_endpoint()
