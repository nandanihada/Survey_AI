#!/usr/bin/env python3

import requests
import json

def test_simple_auth_system():
    """Test the simple authentication system"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🧪 TESTING SIMPLE AUTHENTICATION SYSTEM")
    print("="*60)
    
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
    
    # Test 1: Survey Generation with Authorization Header
    print(f"\n📋 TEST 1: Survey Generation with Simple Auth")
    
    survey_data = {
        "prompt": "Test survey about customer satisfaction",
        "template_type": "customer_feedback",
        "question_count": 5,
        "theme": {
            "font": "Inter",
            "intent": "professional",
            "colors": {
                "primary": "#3B82F6",
                "background": "#FFFFFF",
                "text": "#1F2937"
            }
        }
    }
    
    try:
        # Test with Authorization header (Bearer token format)
        response = requests.post(
            f"{BASE_URL}/generate",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {user_id}"
            },
            data=json.dumps(survey_data),
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Survey generation successful!")
            print(f"   Survey ID: {result.get('survey_id', 'N/A')}")
            print(f"   Questions: {len(result.get('questions', []))}")
            print(f"   Shareable Link: {result.get('shareable_link', 'N/A')}")
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
            print(f"❌ Survey generation failed: {response.status_code}")
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
    
    # Test 2: Survey Fetching
    print(f"\n📋 TEST 2: Survey Fetching with Simple Auth")
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/surveys",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {user_id}"
            },
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Survey fetching successful!")
            surveys = result.get('surveys', [])
            print(f"   Total surveys: {len(surveys)}")
            if surveys:
                print(f"   Latest survey: {surveys[0].get('prompt', 'No prompt')[:50]}...")
        elif response.status_code == 401:
            print("❌ Authentication failed")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
        else:
            print(f"❌ Survey fetching failed: {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Test without authentication
    print(f"\n📋 TEST 3: Test without authentication (should fail)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate",
            headers={"Content-Type": "application/json"},
            data=json.dumps(survey_data),
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Correctly rejected unauthenticated request")
            try:
                error = response.json()
                print(f"   Error message: {error.get('error', 'Unknown error')}")
            except:
                pass
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print(f"\n🧪 SIMPLE AUTH TEST COMPLETE")
    print("="*60)
    
    print(f"\n💡 Next steps:")
    print("   1. If tests pass: Try survey generation in frontend")
    print("   2. If 404 errors: Restart backend server")
    print("   3. If auth fails: Check user_id in localStorage")

if __name__ == "__main__":
    test_simple_auth_system()
