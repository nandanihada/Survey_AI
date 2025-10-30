#!/usr/bin/env python3

import requests
import json

def test_signup_form():
    """Test the new signup form with password fields"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🧪 TESTING SIGNUP FORM WITH PASSWORD FIELDS")
    print("="*50)
    
    # Test data
    signup_data = {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "password": "password123",
        "website": "https://johndoe.com",
        "postbackUrl": "https://johndoe.com/postback?txn_id={transaction_id}&status={status}",
        "parameterMappings": {
            "transaction_id": "txn_id",
            "status": "status",
            "responses": "survey_data"
        }
    }
    
    try:
        print("📤 Sending signup request...")
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            headers={"Content-Type": "application/json"},
            data=json.dumps(signup_data),
            timeout=10
        )
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("✅ SIGNUP SUCCESSFUL!")
            print(f"   User ID: {result.get('user', {}).get('id', 'N/A')}")
            print(f"   Name: {result.get('user', {}).get('name', 'N/A')}")
            print(f"   Email: {result.get('user', {}).get('email', 'N/A')}")
            print(f"   Postback URL: {result.get('user', {}).get('postbackUrl', 'N/A')}")
        elif response.status_code == 404:
            print("❌ ENDPOINT NOT FOUND - Backend needs restart")
        elif response.status_code == 409:
            print("⚠️ USER ALREADY EXISTS - Try different email")
        else:
            try:
                error_data = response.json()
                print(f"❌ SIGNUP FAILED: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"❌ SIGNUP FAILED: HTTP {response.status_code}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("   Make sure backend is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print(f"\n🎯 SIGNUP FORM TEST COMPLETE")
    print("="*50)

if __name__ == "__main__":
    test_signup_form()
