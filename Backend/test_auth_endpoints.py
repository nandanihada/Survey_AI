#!/usr/bin/env python3
"""
Test script to verify authentication endpoints are working
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_auth_endpoints():
    print("🧪 Testing Authentication Endpoints")
    print("=" * 50)
    
    # Test 1: Register a new user
    print("\n1. Testing user registration...")
    register_data = {
        "name": "Test User",
        "email": "test@example.com", 
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print("✅ Registration successful")
            print(f"User ID: {data.get('user', {}).get('uid')}")
            token = data.get('token')
            print(f"Token received: {token[:20]}..." if token else "No token")
        else:
            print(f"❌ Registration failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None
    
    # Test 2: Login with the user
    print("\n2. Testing user login...")
    login_data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful")
            token = data.get('token')
            print(f"Token: {token[:20]}..." if token else "No token")
            return token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_survey_endpoints(token):
    print("\n🧪 Testing Survey Endpoints")
    print("=" * 50)
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Get user surveys
    print("\n1. Testing get user surveys...")
    try:
        response = requests.get(f"{BASE_URL}/api/surveys/", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Survey fetch successful")
            print(f"Number of surveys: {data.get('total', 0)}")
        else:
            print(f"❌ Survey fetch failed: {response.text}")
    except Exception as e:
        print(f"❌ Survey fetch error: {e}")
    
    # Test 2: Create a test survey
    print("\n2. Testing survey creation...")
    survey_data = {
        "title": "Test Survey",
        "description": "A test survey for authentication",
        "questions": [
            {
                "id": "q1",
                "text": "How do you feel?",
                "type": "multiple_choice",
                "options": ["Good", "Bad", "Neutral"]
            }
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/surveys/", json=survey_data, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print("✅ Survey creation successful")
            print(f"Survey ID: {data.get('survey_id')}")
        else:
            print(f"❌ Survey creation failed: {response.text}")
    except Exception as e:
        print(f"❌ Survey creation error: {e}")

def test_cors():
    print("\n🧪 Testing CORS Configuration")
    print("=" * 50)
    
    # Test OPTIONS request (preflight)
    print("\n1. Testing OPTIONS preflight request...")
    headers = {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
    }
    
    try:
        response = requests.options(f"{BASE_URL}/api/surveys/", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"CORS Headers: {dict(response.headers)}")
        if response.status_code == 200:
            print("✅ CORS preflight successful")
        else:
            print(f"❌ CORS preflight failed")
    except Exception as e:
        print(f"❌ CORS test error: {e}")

if __name__ == "__main__":
    print("🚀 Starting Authentication System Tests")
    print("Make sure the backend server is running on localhost:5000")
    print()
    
    # Test CORS first
    test_cors()
    
    # Test authentication
    token = test_auth_endpoints()
    
    if token:
        # Test survey endpoints with valid token
        test_survey_endpoints(token)
    
    print("\n" + "=" * 50)
    print("🏁 Tests completed!")
