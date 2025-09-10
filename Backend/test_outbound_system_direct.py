#!/usr/bin/env python3

import requests
import json
from datetime import datetime

def test_outbound_postback_system():
    """Test the outbound postback system directly"""
    print("🧪 Testing Outbound Postback System - Direct API Calls")
    print("=" * 70)
    
    base_url = "https://api.theinterwebsite.space"
    
    # Test 1: Check if outbound postback API is accessible
    print("\n1️⃣ Testing outbound postback API accessibility...")
    try:
        test_data = {
            "partner_url": "https://httpbin.org/get?test=outbound&transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
            "partner_name": "Direct Test Partner",
            "transaction_id": f"DIRECT_TEST_{int(datetime.now().timestamp())}",
            "reward": "25.50",
            "currency": "USD",
            "username": "direct_test_user",
            "survey_id": "DIRECT_TEST_SURVEY",
            "click_id": f"click_{int(datetime.now().timestamp())}",
            "offer_id": "DIRECT_OFFER",
            "conversion_status": "confirmed"
        }
        
        print(f"   📤 Sending POST to: {base_url}/api/outbound-postback/send-to-partner")
        print(f"   📋 Data: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(
            f"{base_url}/api/outbound-postback/send-to-partner",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"   📊 Status Code: {response.status_code}")
        print(f"   📄 Response Headers: {dict(response.headers)}")
        print(f"   📝 Response Text: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ API Response Success: {result.get('success', False)}")
            print(f"   🎯 Message: {result.get('message', 'No message')}")
            if result.get('url_sent'):
                print(f"   🔗 URL Sent: {result['url_sent']}")
        else:
            print(f"   ❌ API call failed with status {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error testing outbound API: {str(e)}")
    
    # Test 2: Check outbound logs API
    print("\n2️⃣ Testing outbound logs API...")
    try:
        response = requests.get(
            f"{base_url}/api/postback-logs",
            timeout=30
        )
        
        print(f"   📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            logs = response.json()
            print(f"   ✅ Retrieved {len(logs)} log entries")
            if logs:
                latest_log = logs[0]
                print(f"   📋 Latest log: {latest_log.get('partnerName', 'Unknown')} - {latest_log.get('status', 'Unknown')}")
                print(f"   ⏰ Timestamp: {latest_log.get('timestamp_str', 'No timestamp')}")
        else:
            print(f"   ❌ Failed to retrieve logs: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error testing logs API: {str(e)}")
    
    # Test 3: Check partners API
    print("\n3️⃣ Testing partners API...")
    try:
        response = requests.get(
            f"{base_url}/api/outbound-postback/partners",
            timeout=30
        )
        
        print(f"   📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            partners = data.get('partners', [])
            print(f"   ✅ Found {len(partners)} active partners")
            for partner in partners[:3]:  # Show first 3
                print(f"   - {partner.get('name', 'Unknown')}: {partner.get('url', 'No URL')[:50]}...")
        else:
            print(f"   ❌ Failed to retrieve partners: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error testing partners API: {str(e)}")
    
    # Test 4: Test the general outbound test endpoint
    print("\n4️⃣ Testing general outbound test endpoint...")
    try:
        test_data = {
            "transaction_id": f"GENERAL_TEST_{int(datetime.now().timestamp())}",
            "reward": "15.75",
            "currency": "USD",
            "username": "general_test_user",
            "survey_id": "GENERAL_TEST_SURVEY",
            "status": "completed"
        }
        
        response = requests.post(
            f"{base_url}/api/outbound-postback/test",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"   📊 Status Code: {response.status_code}")
        print(f"   📝 Response: {response.text[:300]}...")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ General test success: {result.get('success', False)}")
        else:
            print(f"   ❌ General test failed")
            
    except Exception as e:
        print(f"   ❌ Error testing general endpoint: {str(e)}")
    
    print("\n" + "=" * 70)
    print("🏁 Direct API Test completed!")
    print("Check the results above to identify any issues.")

if __name__ == "__main__":
    test_outbound_postback_system()
