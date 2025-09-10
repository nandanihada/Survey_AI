#!/usr/bin/env python3

import requests
import json
from datetime import datetime
import time

def test_outbound_postback_system():
    """Test the outbound postback system after fixes"""
    print("🧪 Testing Outbound Postback System After Fixes")
    print("=" * 60)
    
    base_url = "http://localhost:5000"
    
    # Test 1: Check if outbound postback API is working
    print("\n1️⃣ Testing outbound postback API endpoint...")
    try:
        test_data = {
            "transaction_id": f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "reward": "10.50",
            "currency": "USD",
            "username": "test_user_fix",
            "session_id": f"session_{int(time.time())}",
            "complete_id": f"complete_{int(time.time())}",
            "survey_id": "TEST_SURVEY_FIX",
            "email": "testfix@example.com",
            "status": "completed",
            "responses": {"q1": "Fixed answer", "q2": "Working now"},
            "submitted_at": datetime.now().isoformat()
        }
        
        response = requests.post(
            f"{base_url}/api/outbound-postback/test",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("   ✅ Outbound postback API is working!")
        else:
            print("   ❌ Outbound postback API failed!")
            
    except Exception as e:
        print(f"   ❌ Error testing outbound API: {str(e)}")
    
    # Test 2: Check if we can send to a specific partner
    print("\n2️⃣ Testing send to specific partner...")
    try:
        partner_data = {
            "partner_url": "https://httpbin.org/get?test=outbound&transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
            "partner_name": "Test Partner Fix",
            "transaction_id": f"FIX_TEST_{int(time.time())}",
            "reward": "15.75",
            "currency": "USD",
            "username": "fix_test_user",
            "status": "completed"
        }
        
        response = requests.post(
            f"{base_url}/api/outbound-postback/send-to-partner",
            json=partner_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:300]}...")
        
        if response.status_code == 200:
            print("   ✅ Send to partner is working!")
        else:
            print("   ❌ Send to partner failed!")
            
    except Exception as e:
        print(f"   ❌ Error testing send to partner: {str(e)}")
    
    # Test 3: Check postback logs
    print("\n3️⃣ Testing postback logs retrieval...")
    try:
        response = requests.get(
            f"{base_url}/api/postback-logs",
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            logs = response.json()
            print(f"   ✅ Retrieved {len(logs)} log entries")
            if logs:
                latest_log = logs[0]
                print(f"   Latest log: {latest_log.get('partnerName', 'Unknown')} - {latest_log.get('status', 'Unknown')}")
        else:
            print(f"   ❌ Failed to retrieve logs: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error testing logs: {str(e)}")
    
    # Test 4: Check active partners
    print("\n4️⃣ Testing active partners retrieval...")
    try:
        response = requests.get(
            f"{base_url}/api/outbound-postback/partners",
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            partners = data.get('partners', [])
            print(f"   ✅ Found {len(partners)} active partners")
            for partner in partners[:3]:  # Show first 3
                print(f"   - {partner.get('name', 'Unknown')}: {partner.get('url', 'No URL')}")
        else:
            print(f"   ❌ Failed to retrieve partners: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error testing partners: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 Test completed! Check results above.")
    print("If all tests show ✅, the outbound postback system is working correctly.")

if __name__ == "__main__":
    test_outbound_postback_system()
