#!/usr/bin/env python3

"""
Test which endpoints are available on the deployed backend
"""

import requests
import json

def test_deployed_endpoints():
    """Test what endpoints are available on the deployed backend"""
    
    BASE_URL = "https://api.theinterwebsite.space"
    
    print("🧪 TESTING DEPLOYED BACKEND ENDPOINTS")
    print("="*60)
    print(f"Backend URL: {BASE_URL}")
    
    endpoints_to_test = [
        # Auth endpoints
        ("/api/auth/login", "POST"),
        ("/api/auth/register", "POST"),
        ("/api/auth/signup", "POST"),
        ("/api/user/login", "POST"),
        ("/api/user/signup", "POST"),
        
        # Survey endpoints
        ("/api/surveys", "GET"),
        ("/api/surveys/", "GET"),
        ("/generate", "POST"),
        ("/api/generate", "POST"),
        
        # Admin endpoints
        ("/api/admin/users", "GET"),
        ("/api/surveys/admin/all", "GET"),
    ]
    
    print(f"\n📋 Testing {len(endpoints_to_test)} endpoints:")
    
    available_endpoints = []
    unavailable_endpoints = []
    
    for endpoint, method in endpoints_to_test:
        try:
            url = f"{BASE_URL}{endpoint}"
            
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                # Send OPTIONS request first to check CORS
                options_response = requests.options(url, timeout=10)
                print(f"   OPTIONS {endpoint}: {options_response.status_code}")
                
                # Then try POST with minimal data
                response = requests.post(
                    url, 
                    json={"test": "data"}, 
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
            
            print(f"   {method} {endpoint}: {response.status_code}")
            
            # Check content type
            content_type = response.headers.get('content-type', '')
            if 'application/json' in content_type:
                print(f"      ✅ Returns JSON")
                available_endpoints.append((endpoint, method, response.status_code))
            elif 'text/html' in content_type:
                print(f"      ❌ Returns HTML (404 page)")
                unavailable_endpoints.append((endpoint, method, "HTML"))
            else:
                print(f"      ⚠️ Returns: {content_type}")
                available_endpoints.append((endpoint, method, response.status_code))
                
        except requests.exceptions.Timeout:
            print(f"   {method} {endpoint}: ⏱️ TIMEOUT")
            unavailable_endpoints.append((endpoint, method, "TIMEOUT"))
        except requests.exceptions.ConnectionError:
            print(f"   {method} {endpoint}: 🔌 CONNECTION ERROR")
            unavailable_endpoints.append((endpoint, method, "CONNECTION_ERROR"))
        except Exception as e:
            print(f"   {method} {endpoint}: ❌ ERROR: {e}")
            unavailable_endpoints.append((endpoint, method, str(e)))
    
    print(f"\n📊 RESULTS SUMMARY:")
    print(f"✅ Available endpoints: {len(available_endpoints)}")
    for endpoint, method, status in available_endpoints:
        print(f"   {method} {endpoint} - Status: {status}")
    
    print(f"\n❌ Unavailable endpoints: {len(unavailable_endpoints)}")
    for endpoint, method, error in unavailable_endpoints:
        print(f"   {method} {endpoint} - Error: {error}")
    
    print(f"\n💡 RECOMMENDATIONS:")
    
    # Check auth endpoints
    auth_available = any(endpoint.startswith('/api/auth') for endpoint, _, _ in available_endpoints)
    if auth_available:
        print("   ✅ Some auth endpoints are available")
    else:
        print("   ❌ No auth endpoints available - authentication will fail")
    
    # Check survey endpoints
    survey_available = any('/surveys' in endpoint or '/generate' in endpoint for endpoint, _, _ in available_endpoints)
    if survey_available:
        print("   ✅ Some survey endpoints are available")
    else:
        print("   ❌ No survey endpoints available - survey functionality will fail")
    
    print(f"\n🔧 NEXT STEPS:")
    if not auth_available:
        print("   1. Deploy backend with auth endpoints")
        print("   2. Or implement client-side only authentication")
    
    if not survey_available:
        print("   1. Deploy backend with survey endpoints")
        print("   2. Or use mock data for testing")
    
    print("   3. Update frontend to use only available endpoints")
    print("   4. Add proper error handling for unavailable features")

if __name__ == "__main__":
    test_deployed_endpoints()
