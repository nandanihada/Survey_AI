#!/usr/bin/env python3

import requests
import json

def test_profile_api():
    """Test the profile API endpoints"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🧪 TESTING PROFILE API ENDPOINTS")
    print("="*50)
    
    # First, let's find a user to test with
    from mongodb_config import db
    
    users = list(db.users.find({}).limit(3))
    if not users:
        print("❌ No users found in database")
        print("💡 Create an account first at /signup")
        return
    
    test_user = users[0]
    user_id = str(test_user['_id'])
    
    print(f"🧪 Testing with user: {test_user.get('name', 'Unknown')} ({test_user.get('email', 'No email')})")
    print(f"   User ID: {user_id}")
    
    # Test 1: GET Profile
    print(f"\n📋 TEST 1: GET Profile")
    try:
        response = requests.get(f"{BASE_URL}/api/user/profile?user_id={user_id}", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ GET Profile successful!")
            print(f"   Name: {data.get('name', 'N/A')}")
            print(f"   Email: {data.get('email', 'N/A')}")
            print(f"   Postback URL: {data.get('postbackUrl', 'N/A')}")
            print(f"   Parameter mappings: {data.get('parameterMappings', {})}")
        elif response.status_code == 404:
            print("❌ Profile endpoint not found - backend needs restart")
        else:
            print(f"❌ GET Profile failed: {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test 2: PUT Profile Update
    print(f"\n📋 TEST 2: PUT Profile Update")
    
    update_data = {
        "user_id": user_id,
        "name": "Updated Test User",
        "website": "https://updated-website.com",
        "postbackUrl": "https://updated-website.com/postback?id={transaction_id}&user={username}",
        "parameterMappings": {
            "transaction_id": "conversion_id",
            "username": "customer_name",
            "status": "result_status"
        }
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/user/profile",
            headers={"Content-Type": "application/json"},
            data=json.dumps(update_data),
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ PUT Profile update successful!")
            result = response.json()
            print(f"   Message: {result.get('message', 'N/A')}")
        elif response.status_code == 404:
            print("❌ Profile update endpoint not found - backend needs restart")
        else:
            print(f"❌ PUT Profile update failed: {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Verify Update
    print(f"\n📋 TEST 3: Verify Update")
    try:
        response = requests.get(f"{BASE_URL}/api/user/profile?user_id={user_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Profile verification successful!")
            print(f"   Updated Name: {data.get('name', 'N/A')}")
            print(f"   Updated Website: {data.get('website', 'N/A')}")
            print(f"   Updated Postback URL: {data.get('postbackUrl', 'N/A')}")
            print(f"   Updated Mappings: {data.get('parameterMappings', {})}")
        else:
            print(f"❌ Profile verification failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print(f"\n🧪 PROFILE API TEST COMPLETE")
    print("="*50)
    
    print(f"\n💡 Next steps:")
    print("   1. If endpoints return 404: Restart backend server")
    print("   2. If successful: Try updating profile in frontend")
    print("   3. Check profile page at http://localhost:5173/profile")

if __name__ == "__main__":
    test_profile_api()
