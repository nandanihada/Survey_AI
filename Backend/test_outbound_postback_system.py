#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json
from datetime import datetime
from mongodb_config import db
from integrations import forward_survey_data_to_partners

def test_outbound_postback_system():
    """Comprehensive test of the outbound postback system"""
    print("🚀 Testing Outbound Postback System")
    print("=" * 50)
    
    # Step 1: Check if we have active partners
    print("\n1. Checking for active partners...")
    try:
        partners_cursor = db.partners.find({"status": "active"})
        partners = list(partners_cursor)
        print(f"   Found {len(partners)} active partners")
        
        if len(partners) == 0:
            print("   ⚠️ No active partners found. Creating test partner...")
            create_test_partner()
            partners_cursor = db.partners.find({"status": "active"})
            partners = list(partners_cursor)
            print(f"   Now have {len(partners)} active partners")
        
        for partner in partners:
            print(f"   - {partner.get('name', 'Unknown')}: {partner.get('url', 'No URL')}")
            
    except Exception as e:
        print(f"   ❌ Error checking partners: {e}")
        return False
    
    # Step 2: Test the integration function directly
    print("\n2. Testing integration function...")
    test_data = {
        "transaction_id": f"TEST_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "reward": "5.00",
        "currency": "USD",
        "username": "test_user",
        "session_id": f"session_{datetime.utcnow().timestamp()}",
        "complete_id": f"complete_{datetime.utcnow().timestamp()}",
        "survey_id": "TEST_SURVEY",
        "email": "test@example.com",
        "status": "completed",
        "responses": {"q1": "answer1", "q2": "answer2"},
        "submitted_at": datetime.utcnow().isoformat()
    }
    
    try:
        success = forward_survey_data_to_partners(test_data)
        if success:
            print("   ✅ Integration function completed successfully")
        else:
            print("   ⚠️ Integration function completed but no successful postbacks")
    except Exception as e:
        print(f"   ❌ Error in integration function: {e}")
        return False
    
    # Step 3: Test the API endpoint
    print("\n3. Testing API endpoint...")
    try:
        response = requests.post(
            'https://api.theinterwebsite.space/api/outbound-postback/test',
            json=test_data,
            timeout=15
        )
        
        print(f"   API Response Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   API Response: {result.get('message', 'No message')}")
            print(f"   Success: {result.get('success', False)}")
        else:
            print(f"   API Error: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error testing API: {e}")
    
    # Step 4: Check outbound logs
    print("\n4. Checking outbound logs...")
    try:
        logs_count = db.outbound_postback_logs.count_documents({})
        print(f"   Total outbound logs: {logs_count}")
        
        if logs_count > 0:
            recent_logs = list(db.outbound_postback_logs.find().sort("timestamp", -1).limit(3))
            print("   Recent logs:")
            for log in recent_logs:
                print(f"   - {log.get('partnerName', 'Unknown')}: {log.get('status', 'Unknown')} ({log.get('status_code', 'N/A')})")
        
    except Exception as e:
        print(f"   ❌ Error checking logs: {e}")
    
    # Step 5: Test specific partner endpoint
    print("\n5. Testing specific partner endpoint...")
    try:
        test_partner_data = {
            "partner_url": "https://httpbin.org/get?transaction_id=[TRANSACTION_ID]&reward=[REWARD]&currency=[CURRENCY]",
            "partner_name": "HTTPBin Test",
            "transaction_id": f"SPECIFIC_TEST_{datetime.utcnow().strftime('%H%M%S')}",
            "reward": "3.50",
            "currency": "USD"
        }
        
        response = requests.post(
            'https://api.theinterwebsite.space/api/outbound-postback/send-to-partner',
            json=test_partner_data,
            timeout=15
        )
        
        print(f"   Specific Partner API Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   Partner: {result.get('partner_name', 'Unknown')}")
            print(f"   Success: {result.get('success', False)}")
            print(f"   Status Code: {result.get('status_code', 'N/A')}")
            print(f"   URL Sent: {result.get('url_sent', 'N/A')}")
        else:
            print(f"   API Error: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error testing specific partner: {e}")
    
    print("\n✅ Outbound postback system test completed!")
    return True

def create_test_partner():
    """Create a test partner for testing purposes"""
    test_partner = {
        "name": "HTTPBin Test Partner",
        "url": "https://httpbin.org/get?transaction_id=[TRANSACTION_ID]&reward=[REWARD]&currency=[CURRENCY]&username=[USERNAME]",
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    try:
        result = db.partners.insert_one(test_partner)
        print(f"   ✅ Created test partner: {result.inserted_id}")
        return True
    except Exception as e:
        print(f"   ❌ Error creating test partner: {e}")
        return False

if __name__ == "__main__":
    test_outbound_postback_system()
