#!/usr/bin/env python3
"""
Simple test to check survey endpoints
"""
import requests
import json

def test_survey_endpoints():
    BASE_URL = "http://localhost:5000"
    
    # Test if server is running
    try:
        response = requests.get(f"{BASE_URL}/")
        print("✅ Server is running")
    except:
        print("❌ Server not running - start with: python app.py")
        return
    
    # Test user login
    login_data = {
        "email": "hadanandani14@gmail.com",
        "password": "your_password_here"  # You'll need to provide the actual password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get('token')
            user = data.get('user', {})
            print(f"✅ Login successful - User ID: {user.get('id')}")
            
            # Test survey listing
            headers = {"Authorization": f"Bearer {token}"}
            survey_response = requests.get(f"{BASE_URL}/api/surveys/", headers=headers)
            
            if survey_response.status_code == 200:
                surveys = survey_response.json()
                print(f"📋 Found {surveys.get('total', 0)} surveys for user")
                print(f"User role: {surveys.get('user_role', 'unknown')}")
                
                for survey in surveys.get('surveys', [])[:3]:
                    print(f"  - {survey.get('prompt', 'No prompt')[:50]}...")
            else:
                print(f"❌ Survey listing failed: {survey_response.text}")
        else:
            print(f"❌ Login failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_survey_endpoints()
