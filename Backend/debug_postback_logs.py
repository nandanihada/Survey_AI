#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from datetime import datetime, timedelta
import requests
import json

def check_database_collections():
    """Check if postback log collections exist and their contents"""
    print("🔍 Checking database collections...")
    
    try:
        # List all collections
        collections = db.list_collection_names()
        print(f"Available collections: {collections}")
        
        # Check outbound postback logs
        outbound_count = db.outbound_postback_logs.count_documents({})
        print(f"📊 outbound_postback_logs collection: {outbound_count} documents")
        
        if outbound_count > 0:
            sample_outbound = list(db.outbound_postback_logs.find().limit(3))
            print("Sample outbound logs:")
            for log in sample_outbound:
                print(f"  - {log.get('timestamp', 'No timestamp')} | {log.get('url', 'No URL')} | Success: {log.get('success', 'Unknown')}")
        
        # Check inbound postback logs
        inbound_count = db.inbound_postback_logs.count_documents({})
        print(f"📊 inbound_postback_logs collection: {inbound_count} documents")
        
        if inbound_count > 0:
            sample_inbound = list(db.inbound_postback_logs.find().limit(3))
            print("Sample inbound logs:")
            for log in sample_inbound:
                print(f"  - {log.get('timestamp', 'No timestamp')} | {log.get('type', 'No type')} | Success: {log.get('success', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_api_endpoints():
    """Test the postback logs API endpoints"""
    print("\n🔍 Testing API endpoints...")
    
    base_url = "https://api.theinterwebsite.space"
    
    # Test outbound logs endpoint
    try:
        print("Testing /api/postback-logs...")
        response = requests.get(f"{base_url}/api/postback-logs", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Outbound logs count: {len(data)}")
            if data:
                print(f"Sample log keys: {list(data[0].keys())}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"❌ Outbound logs API error: {e}")
    
    # Test inbound logs endpoint
    try:
        print("\nTesting /api/inbound-postback-logs...")
        response = requests.get(f"{base_url}/api/inbound-postback-logs", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Inbound logs count: {len(data)}")
            if data:
                print(f"Sample log keys: {list(data[0].keys())}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"❌ Inbound logs API error: {e}")

def create_sample_logs():
    """Create some sample logs for testing"""
    print("\n🔍 Creating sample logs...")
    
    try:
        # Create sample outbound log
        outbound_log = {
            "timestamp": datetime.utcnow(),
            "url": "https://example.com/postback?click_id=123&payout=5.00",
            "method": "GET",
            "success": True,
            "response_code": 200,
            "response_message": "OK",
            "partner_name": "Test Partner",
            "parameters": {
                "click_id": "123",
                "payout": "5.00",
                "currency": "USD"
            }
        }
        
        result = db.outbound_postback_logs.insert_one(outbound_log)
        print(f"✅ Created outbound log: {result.inserted_id}")
        
        # Create sample inbound log
        inbound_log = {
            "timestamp": datetime.utcnow(),
            "type": "postback",
            "source_ip": "192.168.1.1",
            "user_agent": "Mozilla/5.0 Test",
            "url_called": "/postback-handler/test-uuid?click_id=456&payout=3.50",
            "success": True,
            "click_id": "456",
            "payout": "3.50",
            "currency": "USD",
            "conversion_status": "confirmed",
            "unique_id": "test-uuid-123"
        }
        
        result = db.inbound_postback_logs.insert_one(inbound_log)
        print(f"✅ Created inbound log: {result.inserted_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating sample logs: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Postback Logs Debug Script")
    print("=" * 50)
    
    # Check database
    db_ok = check_database_collections()
    
    if db_ok:
        # Create sample logs if collections are empty
        outbound_count = db.outbound_postback_logs.count_documents({})
        inbound_count = db.inbound_postback_logs.count_documents({})
        
        if outbound_count == 0 or inbound_count == 0:
            print("\n📝 Collections are empty, creating sample logs...")
            create_sample_logs()
            check_database_collections()
        
        # Test API endpoints
        test_api_endpoints()
    
    print("\n✅ Debug script completed!")
