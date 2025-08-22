#!/usr/bin/env python3
"""
Test script to verify the complete 10-parameter postback system with unique ID URLs
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
POSTBACK_API_URL = f"{BASE_URL}/api/postback-shares"

def test_create_postback_share():
    """Test creating a new postback share with automatic UUID generation"""
    print("🧪 Testing postback share creation with automatic UUID generation...")
    
    test_data = {
        "third_party_name": "Test Partner UUID",
        "third_party_contact": "test@example.com",
        "postback_type": "global",
        "parameters": {
            "click_id": {"enabled": True, "customName": "click_id"},
            "payout": {"enabled": True, "customName": "payout"},
            "currency": {"enabled": True, "customName": "currency"},
            "offer_id": {"enabled": True, "customName": "offer_id"},
            "conversion_status": {"enabled": True, "customName": "status"},
            "transaction_id": {"enabled": True, "customName": "txn_id"},
            "sub1": {"enabled": True, "customName": "sub1"},
            "sub2": {"enabled": True, "customName": "sub2"},
            "event_name": {"enabled": True, "customName": "event"},
            "timestamp": {"enabled": True, "customName": "ts"}
        },
        "notes": "Test share for UUID system verification"
    }
    
    try:
        response = requests.post(POSTBACK_API_URL, json=test_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            share_data = response.json()
            print(f"✅ Successfully created postback share!")
            print(f"   Share ID: {share_data.get('id')}")
            print(f"   Unique Postback ID: {share_data.get('unique_postback_id')}")
            return share_data.get('id'), share_data.get('unique_postback_id')
        else:
            print(f"❌ Failed to create share: {response.text}")
            return None, None
            
    except Exception as e:
        print(f"❌ Error creating postback share: {e}")
        return None, None

def test_generate_url(share_id):
    """Test URL generation with unique ID"""
    print(f"\n🧪 Testing URL generation for share {share_id}...")
    
    try:
        url = f"{POSTBACK_API_URL}/{share_id}/generate-url"
        response = requests.post(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            url_data = response.json()
            generated_url = url_data.get('postback_url')
            print(f"✅ Successfully generated URL!")
            print(f"   URL: {generated_url}")
            
            # Verify URL contains unique ID in path
            if "/postback-handler/" in generated_url:
                print("✅ URL contains unique ID in path structure")
                return generated_url
            else:
                print("❌ URL does not contain expected unique ID structure")
                return None
        else:
            print(f"❌ Failed to generate URL: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error generating URL: {e}")
        return None

def test_postback_endpoint(postback_url, unique_id):
    """Test the postback endpoint with the generated URL"""
    print(f"\n🧪 Testing postback endpoint with unique ID: {unique_id}...")
    
    # Extract base URL and add test parameters
    if "?" in postback_url:
        base_url = postback_url.split("?")[0]
    else:
        base_url = postback_url
    
    # Test parameters (all 10 fixed parameters)
    test_params = {
        "click_id": "test_click_123",
        "payout": "5.50",
        "currency": "USD",
        "offer_id": "offer_456",
        "status": "confirmed",
        "txn_id": "txn_789",
        "sub1": "sub1_value",
        "sub2": "sub2_value",
        "event": "conversion",
        "ts": str(int(time.time()))
    }
    
    try:
        response = requests.get(base_url, params=test_params)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Postback endpoint responded successfully!")
            return True
        else:
            print(f"❌ Postback endpoint failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing postback endpoint: {e}")
        return False

def test_list_shares():
    """Test listing postback shares to verify unique ID is stored"""
    print(f"\n🧪 Testing postback shares listing...")
    
    try:
        response = requests.get(POSTBACK_API_URL)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            shares = response.json()
            print(f"✅ Successfully retrieved {len(shares)} shares")
            
            for share in shares:
                if share.get('third_party_name') == 'Test Partner UUID':
                    print(f"   Found test share with unique ID: {share.get('unique_postback_id')}")
                    return True
            
            print("❌ Test share not found in listing")
            return False
        else:
            print(f"❌ Failed to list shares: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error listing shares: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 TESTING 10-PARAMETER POSTBACK SYSTEM WITH UNIQUE IDs")
    print("=" * 60)
    
    # Test 1: Create postback share with automatic UUID
    share_id, unique_id = test_create_postback_share()
    if not share_id or not unique_id:
        print("❌ Cannot continue tests - share creation failed")
        return
    
    # Test 2: Generate URL with unique ID
    postback_url = test_generate_url(share_id)
    if not postback_url:
        print("❌ Cannot continue tests - URL generation failed")
        return
    
    # Test 3: Test postback endpoint
    test_postback_endpoint(postback_url, unique_id)
    
    # Test 4: List shares to verify unique ID storage
    test_list_shares()
    
    print("\n" + "=" * 60)
    print("🏁 TESTING COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()
