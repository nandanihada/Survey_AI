#!/usr/bin/env python3
"""
Test script to debug survey creation and URL generation
"""
import requests
import json

def test_survey_creation():
    """Test survey creation with authentication"""
    print("🧪 Testing Survey Creation with Authentication")
    print("=" * 50)
    
    BASE_URL = "http://localhost:5000"
    
    # First, login to get a token
    print("1. Logging in...")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "nandanihada2003@gmail.com",  # Using admin user from debug output
        "password": "your_password_here"  # You'll need to provide the correct password
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        return
    
    login_data = login_response.json()
    token = login_data.get('token')
    user = login_data.get('user', {})
    
    print(f"✅ Login successful")
    print(f"   User: {user.get('email')}")
    print(f"   Role: {user.get('role')}")
    print(f"   Simple User ID: {user.get('simpleUserId', 'NOT FOUND')}")
    
    # Now create a survey
    print("\n2. Creating survey...")
    headers = {"Authorization": f"Bearer {token}"}
    survey_data = {
        "prompt": "Test survey for debugging user_id",
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
    
    survey_response = requests.post(f"{BASE_URL}/generate", 
                                  json=survey_data, 
                                  headers=headers)
    
    if survey_response.status_code != 200:
        print(f"❌ Survey creation failed: {survey_response.text}")
        return
    
    survey_result = survey_response.json()
    
    print("✅ Survey created successfully!")
    print(f"   Survey ID: {survey_result.get('survey_id')}")
    print(f"   Shareable Link: {survey_result.get('shareable_link')}")
    print(f"   Public Link: {survey_result.get('public_link')}")
    
    # Check if user_id is in the URL
    shareable_link = survey_result.get('shareable_link', '')
    if 'user_id=' in shareable_link:
        user_id_part = shareable_link.split('user_id=')[1].split('&')[0]
        print(f"✅ user_id found in URL: {user_id_part}")
    else:
        print("❌ user_id NOT found in URL!")
        print("   This indicates the issue is in the backend survey creation")

if __name__ == "__main__":
    print("Note: You need to update the password in this script to test")
    print("Or run this manually with the correct credentials")
    # test_survey_creation()  # Uncomment after setting password
