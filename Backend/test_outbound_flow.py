#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json
from datetime import datetime
from mongodb_config import db

def setup_test_partners():
    """Ensure test partners exist in database"""
    print("Setting up test partners...")
    
    # Check if partners exist
    existing_count = db.partners.count_documents({})
    print(f"Found {existing_count} existing partners")
    
    if existing_count == 0:
        # Create test partners matching the screenshot
        test_partners = [
            {
                "name": "New Partner",
                "url": "https://httpbin.org/get?transaction_id=[TRANSACTION_ID]&payout=[REWARD]",
                "status": "active",
                "created_at": datetime.utcnow()
            },
            {
                "name": "wini woods",
                "url": "https://httpbin.org/get?adv_section=4yJH9QE&id=[TRANSACTION_ID]&adv_cvvalue=[REWARD]",
                "status": "active", 
                "created_at": datetime.utcnow()
            }
        ]
        
        result = db.partners.insert_many(test_partners)
        print(f"✅ Created {len(result.inserted_ids)} test partners")
    
    # List current partners
    partners = list(db.partners.find({"status": "active"}))
    print(f"Active partners ({len(partners)}):")
    for partner in partners:
        print(f"  - {partner['name']}: {partner['url']}")
    
    return partners

def test_api_endpoints():
    """Test the outbound postback API endpoints"""
    print("\nTesting API endpoints...")
    
    base_url = "https://api.theinterwebsite.space"
    
    # Test 1: Get partners endpoint
    try:
        response = requests.get(f"{base_url}/api/outbound-postback/partners", timeout=10)
        print(f"GET /partners: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Found {data.get('count', 0)} partners")
        else:
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"  ❌ Error: {e}")
    
    # Test 2: Send to specific partner
    try:
        test_data = {
            "partner_url": "https://httpbin.org/get?transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
            "partner_name": "Test Partner",
            "transaction_id": f"TEST_{datetime.now().strftime('%H%M%S')}",
            "reward": "5.00",
            "currency": "USD"
        }
        
        response = requests.post(
            f"{base_url}/api/outbound-postback/send-to-partner",
            json=test_data,
            timeout=15
        )
        
        print(f"POST /send-to-partner: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Success: {result.get('success', False)}")
            print(f"  Partner: {result.get('partner_name', 'Unknown')}")
            print(f"  Status Code: {result.get('status_code', 'N/A')}")
        else:
            print(f"  Error: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")

def check_outbound_logs():
    """Check if outbound logs are being created"""
    print("\nChecking outbound logs...")
    
    try:
        logs_count = db.outbound_postback_logs.count_documents({})
        print(f"Total outbound logs: {logs_count}")
        
        if logs_count > 0:
            # Get recent logs
            recent_logs = list(db.outbound_postback_logs.find().sort("timestamp", -1).limit(5))
            print("Recent logs:")
            for log in recent_logs:
                timestamp = log.get('timestamp', 'Unknown')
                partner = log.get('partnerName', 'Unknown')
                status = log.get('status', 'Unknown')
                status_code = log.get('status_code', 'N/A')
                print(f"  - {timestamp}: {partner} -> {status} ({status_code})")
        else:
            print("  No logs found yet")
            
    except Exception as e:
        print(f"  ❌ Error checking logs: {e}")

def main():
    print("🧪 Testing Outbound Postback System")
    print("=" * 40)
    
    # Step 1: Setup partners
    partners = setup_test_partners()
    
    # Step 2: Test API endpoints
    test_api_endpoints()
    
    # Step 3: Check logs
    check_outbound_logs()
    
    print("\n✅ Test completed!")
    print("\nNext steps:")
    print("1. Go to PostbackManager → Outbound (Sender) tab")
    print("2. Click the blue 🔵 Send Postback button")
    print("3. Check Outbound Logs tab to see the results")

if __name__ == "__main__":
    main()
