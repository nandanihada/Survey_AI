#!/usr/bin/env python3

"""
Verify CORS configuration on deployed backend
"""

import requests

def verify_deployed_cors():
    """Check if deployed backend has proper CORS configuration"""
    
    DEPLOYED_URL = "https://api.theinterwebsite.space"
    FRONTEND_URL = "https://pepperadsresponses.web.app"
    
    print("🔍 VERIFYING DEPLOYED BACKEND CORS")
    print("="*60)
    print(f"Backend: {DEPLOYED_URL}")
    print(f"Frontend: {FRONTEND_URL}")
    
    # Test OPTIONS request (preflight)
    print(f"\n📋 Testing OPTIONS preflight request to /api/auth/login")
    
    try:
        response = requests.options(
            f"{DEPLOYED_URL}/api/auth/login",
            headers={
                "Origin": FRONTEND_URL,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
        )
        
        print(f"Status: {response.status_code}")
        print(f"\n📋 Response Headers:")
        
        # Check CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        }
        
        for header, value in cors_headers.items():
            if value:
                print(f"   ✅ {header}: {value}")
            else:
                print(f"   ❌ {header}: MISSING")
        
        # Verify the origin is allowed
        allowed_origin = response.headers.get('Access-Control-Allow-Origin')
        if allowed_origin == FRONTEND_URL or allowed_origin == '*':
            print(f"\n✅ CORS IS CONFIGURED CORRECTLY!")
            print(f"   Frontend {FRONTEND_URL} is allowed")
        else:
            print(f"\n❌ CORS IS NOT CONFIGURED!")
            print(f"   Expected: {FRONTEND_URL}")
            print(f"   Got: {allowed_origin}")
            print(f"\n🔧 SOLUTION:")
            print(f"   1. The deployed backend doesn't have updated CORS")
            print(f"   2. You need to redeploy with the updated auth_routes.py")
            print(f"   3. Or add CORS configuration to your deployment")
            
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")
    
    # Test actual POST request
    print(f"\n📋 Testing actual POST request to /api/auth/login")
    
    try:
        response = requests.post(
            f"{DEPLOYED_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "test123"},
            headers={
                "Origin": FRONTEND_URL,
                "Content-Type": "application/json"
            }
        )
        
        print(f"Status: {response.status_code}")
        
        allowed_origin = response.headers.get('Access-Control-Allow-Origin')
        if allowed_origin:
            print(f"✅ CORS header present: {allowed_origin}")
        else:
            print(f"❌ CORS header MISSING in actual response!")
            
    except Exception as e:
        print(f"❌ Error testing POST: {e}")
    
    print(f"\n💡 DIAGNOSIS:")
    print("="*60)
    
    if response.headers.get('Access-Control-Allow-Origin'):
        print("✅ Backend has CORS configured")
        print("   If you still see errors, try:")
        print("   1. Clear browser cache")
        print("   2. Use incognito/private browsing")
        print("   3. Check browser console for exact error")
    else:
        print("❌ Backend DOES NOT have proper CORS")
        print("\n🔧 TO FIX:")
        print("   1. Ensure auth_routes.py has @cross_origin decorator")
        print("   2. Ensure app.py has CORS configured")
        print("   3. Redeploy backend")
        print("   4. Restart backend service")
        print("\n📝 Files to check on deployed backend:")
        print("   - auth_routes.py (has @cross_origin)")
        print("   - app.py (CORS initialization)")
        print("   - All routes have proper CORS decorators")

if __name__ == "__main__":
    verify_deployed_cors()
