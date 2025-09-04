#!/usr/bin/env python3
"""
Test script to verify the complete survey creation and listing flow
"""
import sys
import os
import requests
import json

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db

def test_survey_flow():
    """Test the complete survey creation and listing flow"""
    
    print("🧪 TESTING SURVEY FLOW\n")
    
    BASE_URL = "http://localhost:5000"
    
    # Test 1: Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/")
        print("✅ Backend server is running")
    except:
        print("❌ Backend server is not running - please start it first")
        return
    
    # Test 2: Create a test user (if needed)
    print("\n📝 Testing user registration...")
    test_user_data = {
        "email": "testuser@example.com",
        "password": "password123",
        "name": "Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=test_user_data)
        if response.status_code == 200:
            print("✅ User registered successfully")
            user_data = response.json()
            token = user_data.get('token')
        else:
            # Try login instead
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            })
            if response.status_code == 200:
                print("✅ User login successful")
                user_data = response.json()
                token = user_data.get('token')
            else:
                print(f"❌ Authentication failed: {response.text}")
                return
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return
    
    # Test 3: Create a survey with authentication
    print("\n📋 Testing survey creation...")
    survey_data = {
        "prompt": "Customer satisfaction survey for testing",
        "template_type": "customer_feedback",
        "question_count": 5,
        "theme": {
            "colors": {
                "primary": "#007bff",
                "background": "#ffffff",
                "text": "#333333"
            }
        }
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/generate", json=survey_data, headers=headers)
        if response.status_code == 200:
            print("✅ Survey created successfully")
            survey_response = response.json()
            survey_id = survey_response.get('survey_id')
            print(f"   Survey ID: {survey_id}")
        else:
            print(f"❌ Survey creation failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Survey creation error: {e}")
        return
    
    # Test 4: List user surveys
    print("\n📂 Testing survey listing...")
    try:
        response = requests.get(f"{BASE_URL}/api/surveys/", headers=headers)
        if response.status_code == 200:
            surveys_data = response.json()
            surveys = surveys_data.get('surveys', [])
            print(f"✅ User has {len(surveys)} surveys")
            
            if len(surveys) > 0:
                print("   Recent surveys:")
                for survey in surveys[:3]:
                    prompt = survey.get('prompt', 'No prompt')[:50] + '...'
                    owner = survey.get('creator_email', 'Unknown')
                    print(f"   - {prompt} (Owner: {owner})")
            else:
                print("   ⚠️ No surveys found for this user")
        else:
            print(f"❌ Survey listing failed: {response.text}")
    except Exception as e:
        print(f"❌ Survey listing error: {e}")
    
    # Test 5: Check database directly
    print("\n🔍 Direct database check...")
    user_email = test_user_data["email"]
    user = db.users.find_one({"email": user_email})
    if user:
        user_id_str = str(user['_id'])
        user_surveys = list(db.surveys.find({
            '$or': [
                {'ownerUserId': user_id_str},
                {'user_id': user_id_str},
                {'creator_email': user_email}
            ]
        }))
        print(f"✅ Database shows {len(user_surveys)} surveys for user {user_email}")
        
        for survey in user_surveys:
            prompt = survey.get('prompt', 'No prompt')[:50] + '...'
            owner_id = survey.get('ownerUserId', 'None')
            print(f"   - {prompt} (OwnerID: {owner_id})")
    else:
        print("❌ User not found in database")

if __name__ == "__main__":
    test_survey_flow()
