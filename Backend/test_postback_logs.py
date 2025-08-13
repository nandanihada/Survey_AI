#!/usr/bin/env python3
"""
Test script to verify postback logs functionality
"""
import requests
import time
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:5000"  # Update as needed

def test_inbound_postback():
    """Test inbound postback logging"""
    print("🧪 Testing Inbound Postback Logging...")
    
    # Test parameters
    test_params = {
        'sid1': 'test-response-' + str(int(time.time())),
        'transaction_id': 'test-txn-' + str(int(time.time())),
        'status': 'confirmed',
        'reward': '2.50',
        'currency': 'USD',
        'username': 'testuser'
    }
    
    print(f"📤 Sending test postback with params: {test_params}")
    
    try:
        # Send postback request
        response = requests.get(f"{BASE_URL}/postback-handler", params=test_params)
        print(f"📥 Response Status: {response.status_code}")
        print(f"📥 Response Body: {response.text}")
        
        # Check inbound logs
        print("\n🔍 Fetching inbound logs...")
        logs_response = requests.get(f"{BASE_URL}/api/inbound-postback-logs")
        
        if logs_response.status_code == 200:
            logs = logs_response.json()
            print(f"📊 Found {len(logs)} inbound logs")
            
            if logs:
                latest_log = logs[0]  # Should be newest first
                print("📋 Latest log entry:")
                print(f"   - Name: {latest_log.get('name', 'N/A')}")
                print(f"   - Payout: ${latest_log.get('payout', 0)} {latest_log.get('currency', 'USD')}")
                print(f"   - Status: {'✅ Success' if latest_log.get('success') else '❌ Failed'}")
                print(f"   - Timestamp: {latest_log.get('timestamp_str', 'N/A')}")
                print(f"   - SID1: {latest_log.get('sid1', 'N/A')}")
        else:
            print(f"❌ Failed to fetch logs: {logs_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during test: {e}")

def test_outbound_logs():
    """Test outbound postback logs"""
    print("\n🧪 Testing Outbound Postback Logs...")
    
    try:
        # Check outbound logs
        logs_response = requests.get(f"{BASE_URL}/api/postback-logs")
        
        if logs_response.status_code == 200:
            logs = logs_response.json()
            print(f"📊 Found {len(logs)} outbound logs")
            
            if logs:
                latest_log = logs[0]  # Should be newest first
                print("📋 Latest log entry:")
                print(f"   - Partner Name: {latest_log.get('partnerName', latest_log.get('name', 'N/A'))}")
                print(f"   - Status: {latest_log.get('status', 'N/A')}")
                print(f"   - Timestamp: {latest_log.get('timestamp_str', latest_log.get('timestamp', 'N/A'))}")
                print(f"   - URL: {latest_log.get('url', 'N/A')[:50]}...")
        else:
            print(f"❌ Failed to fetch outbound logs: {logs_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during outbound test: {e}")

def test_partner_management():
    """Test partner management"""
    print("\n🧪 Testing Partner Management...")
    
    try:
        # Check existing partners
        partners_response = requests.get(f"{BASE_URL}/api/partners")
        
        if partners_response.status_code == 200:
            partners = partners_response.json()
            print(f"📊 Found {len(partners)} partners")
            
            for partner in partners:
                print(f"   - {partner.get('name', 'N/A')}: {'✅ Active' if partner.get('status') == 'active' else '⏸️  Inactive'}")
        else:
            print(f"❌ Failed to fetch partners: {partners_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during partner test: {e}")

if __name__ == "__main__":
    print("🌶️ Postback System Test Suite")
    print("=" * 50)
    
    # Run tests
    test_partner_management()
    test_outbound_logs()
    test_inbound_postback()
    
    print("\n✅ Test suite completed!")
    print("\n📝 Summary:")
    print("   - All mandatory fields should now be present in logs")
    print("   - Name field shows who sent the postback")
    print("   - Payout field displays monetary amounts")
    print("   - Status field shows success/failure")
    print("   - Timestamp field shows correct UTC time")
