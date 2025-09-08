#!/usr/bin/env python3
"""
Debug the 500 error in /generate endpoint
"""
import requests
import json

def test_generate_with_curl():
    """Test the generate endpoint with a simple request"""
    print("🔍 Testing /generate endpoint with actual HTTP request")
    
    BASE_URL = "http://localhost:5000"
    
    # First login to get token
    try:
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nandanihada2003@gmail.com",
            "password": "your_password"  # You'll need to provide this
        }, timeout=10)
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
        
        token = login_response.json().get('token')
        print("✅ Login successful, got token")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Now test generate endpoint
    try:
        headers = {"Authorization": f"Bearer {token}"}
        survey_data = {
            "prompt": "Simple test survey",
            "template_type": "customer_feedback",
            "question_count": 3,
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
        
        print("📤 Sending generate request...")
        response = requests.post(f"{BASE_URL}/generate", 
                               json=survey_data, 
                               headers=headers,
                               timeout=30)
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ 500 Internal Server Error")
            print("Response text:", response.text)
            
            # Try to get more details
            try:
                error_data = response.json()
                print("Error JSON:", json.dumps(error_data, indent=2))
            except:
                print("Could not parse error as JSON")
        else:
            print("✅ Request successful!")
            result = response.json()
            print("Survey created:", result.get('survey_id'))
            print("Link:", result.get('shareable_link'))
            
    except Exception as e:
        print(f"❌ Generate request error: {e}")

if __name__ == "__main__":
    print("Note: Update the password in this script to test")
    print("Or check the backend console for the actual error details")
    # test_generate_with_curl()  # Uncomment after setting password
