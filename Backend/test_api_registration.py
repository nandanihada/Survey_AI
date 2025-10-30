#!/usr/bin/env python3

import requests
import time

def test_api_endpoints():
    """Test if the new API endpoints are registered"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🧪 TESTING API ENDPOINT REGISTRATION")
    print("="*50)
    
    # Wait for server to be ready
    print("Waiting for server to be ready...")
    time.sleep(2)
    
    endpoints_to_test = [
        "/api/user/profile",
        "/api/admin/users",
        "/api/auth/signup"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            print(f"\n🔍 Testing {endpoint}...")
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            
            if response.status_code == 404:
                print(f"❌ {endpoint} - NOT FOUND (404)")
            elif response.status_code == 405:
                print(f"⚠️ {endpoint} - Method not allowed (405) - Endpoint exists but wrong method")
            elif response.status_code in [200, 401, 403]:
                print(f"✅ {endpoint} - Endpoint registered (Status: {response.status_code})")
            else:
                print(f"🔄 {endpoint} - Status: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to server at {BASE_URL}")
            break
        except requests.exceptions.Timeout:
            print(f"⏰ {endpoint} - Request timeout")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    print(f"\n🎯 API ENDPOINT TEST COMPLETE")
    print("="*50)

if __name__ == "__main__":
    test_api_endpoints()
