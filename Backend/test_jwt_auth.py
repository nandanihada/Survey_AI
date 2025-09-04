#!/usr/bin/env python3
"""
Test script for JWT authentication system
"""
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_auth_flow():
    print("🧪 Testing JWT Authentication System")
    print("=" * 50)
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "password": "testpass123",
        "name": "Test User"
    }
    
    # Test 1: Register user
    print("\n1️⃣ Testing user registration...")
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Registration successful!")
            print(f"User ID: {data['user']['id']}")
            print(f"Token received: {data['token'][:20]}...")
            token = data['token']
        else:
            print(f"❌ Registration failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return
    
    # Test 2: Login with same credentials
    print("\n2️⃣ Testing user login...")
    try:
        login_data = {"email": test_user["email"], "password": test_user["password"]}
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful!")
            print(f"Token received: {data['token'][:20]}...")
            token = data['token']  # Use login token
        else:
            print(f"❌ Login failed: {response.text}")
    except Exception as e:
        print(f"❌ Login error: {e}")
    
    # Test 3: Access protected route
    print("\n3️⃣ Testing protected route access...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Protected route access successful!")
            print(f"User: {data['user']['name']} ({data['user']['email']})")
            print(f"Role: {data['user']['role']}")
        else:
            print(f"❌ Protected route failed: {response.text}")
    except Exception as e:
        print(f"❌ Protected route error: {e}")
    
    # Test 4: Access without token
    print("\n4️⃣ Testing access without token...")
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('user') is None:
                print(f"✅ Correctly returned no user without token")
            else:
                print(f"❌ Should not return user without token")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ No token test error: {e}")
    
    # Test 5: Test survey creation (protected route)
    print("\n5️⃣ Testing survey creation...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        survey_data = {
            "title": "Test Survey",
            "description": "A test survey",
            "questions": [
                {"id": "q1", "question": "How are you?", "type": "multiple_choice", "options": ["Good", "Bad"]}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/surveys/", json=survey_data, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Survey creation successful!")
            print(f"Survey ID: {data['survey']['_id']}")
        else:
            print(f"❌ Survey creation failed: {response.text}")
    except Exception as e:
        print(f"❌ Survey creation error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Authentication test completed!")

if __name__ == "__main__":
    test_auth_flow()
