import requests
import json
from datetime import datetime
from mongodb_config import db
from integrations import forward_survey_data_to_partners

def test_postback_functionality():
    print("=== POSTBACK FUNCTIONALITY TEST ===")
    
    # Test data similar to what would be sent
    test_response_data = {
        "transaction_id": "test-123",
        "survey_id": "test-survey-456",
        "email": "test@example.com",
        "username": "testuser",
        "responses": {"Q1": "Yes", "Q2": "Good"},
        "status": "completed",
        "reward": "0.1",
        "currency": "USD",
        "session_id": "test-session-789",
        "complete_id": "test-complete-101",
        "submitted_at": datetime.utcnow()
    }
    
    # Get active partners
    print("\n1. Checking active partners...")
    partners = list(db.partners.find({"status": "active"}))
    print(f"Found {len(partners)} active partners")
    
    for partner in partners:
        print(f"Partner: {partner.get('name')} - {partner.get('url')}")
    
    if not partners:
        print("❌ No active partners found!")
        return
    
    # Test URL processing
    print("\n2. Testing URL parameter replacement...")
    for partner in partners:
        url = partner.get('url', '')
        print(f"Original URL: {url}")
        
        # Test the URL replacement function
        try:
            from integrations import replace_postback_parameters
            processed_url = replace_postback_parameters(url, test_response_data)
            print(f"Processed URL: {processed_url}")
        except Exception as e:
            print(f"❌ URL processing error: {e}")
            continue
    
    # Test actual network request
    print("\n3. Testing network connectivity...")
    for partner in partners:
        partner_name = partner.get('name', 'Unknown')
        url = partner.get('url', '')
        
        try:
            from integrations import replace_postback_parameters
            processed_url = replace_postback_parameters(url, test_response_data)
            
            print(f"Testing connection to {partner_name}...")
            print(f"URL: {processed_url}")
            
            # Make the request with a longer timeout
            response = requests.get(processed_url, timeout=30)
            print(f"✅ Response from {partner_name}: HTTP {response.status_code}")
            print(f"Response text: {response.text[:200]}...")
            
        except requests.exceptions.Timeout:
            print(f"⏰ Timeout error for {partner_name}")
        except requests.exceptions.ConnectionError as e:
            print(f"🔌 Connection error for {partner_name}: {e}")
        except requests.exceptions.RequestException as e:
            print(f"📡 Request error for {partner_name}: {e}")
        except Exception as e:
            print(f"❌ Unexpected error for {partner_name}: {e}")
    
    # Test the full integration function
    print("\n4. Testing full integration function...")
    try:
        result = forward_survey_data_to_partners(test_response_data)
        if result:
            print("✅ Integration function completed successfully")
        else:
            print("❌ Integration function failed")
    except Exception as e:
        print(f"❌ Integration function error: {e}")

if __name__ == "__main__":
    test_postback_functionality()
