#!/usr/bin/env python3

import requests
import json

def test_survey_list_auth():
    """Test the survey list endpoint with simple auth"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🧪 TESTING SURVEY LIST AUTHENTICATION")
    print("="*50)
    
    # Get a user to test with
    from mongodb_config import db
    
    users = list(db.users.find({}).limit(1))
    if not users:
        print("❌ No users found in database")
        return
    
    test_user = users[0]
    user_id = str(test_user['_id'])
    
    print(f"🧪 Testing with user: {test_user.get('name', 'Unknown')} ({test_user.get('email', 'No email')})")
    print(f"   User ID: {user_id}")
    
    # Test survey list endpoint
    print(f"\n📋 Testing /api/surveys endpoint")
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/surveys/",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {user_id}"
            },
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Survey list successful!")
            surveys = result.get('surveys', [])
            print(f"   Total surveys: {len(surveys)}")
            if surveys:
                print(f"   First survey: {surveys[0].get('prompt', 'No prompt')[:50]}...")
        elif response.status_code == 401:
            print("❌ Authentication failed")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
        elif response.status_code == 404:
            print("❌ Endpoint not found - backend needs restart")
        else:
            print(f"❌ Request failed: {response.status_code}")
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
    
    print(f"\n🧪 SURVEY LIST AUTH TEST COMPLETE")
    print("="*50)

if __name__ == "__main__":
    test_survey_list_auth()
