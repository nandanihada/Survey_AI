#!/usr/bin/env python3
"""
Debug script to check postback shares database issues
"""

import requests
import json
from mongodb_config import db

def test_database_connection():
    """Test MongoDB connection"""
    print("🔍 Testing database connection...")
    
    if db is None:
        print("❌ Database connection is None")
        return False
    
    try:
        # Test ping
        db.admin.command('ping')
        print("✅ Database ping successful")
        
        # List collections
        collections = db.list_collection_names()
        print(f"📋 Available collections: {collections}")
        
        # Check if postback_shares exists
        if 'postback_shares' in collections:
            count = db.postback_shares.count_documents({})
            print(f"📊 postback_shares collection exists with {count} documents")
        else:
            print("⚠️ postback_shares collection does not exist yet")
        
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints"""
    print("\n🔍 Testing API endpoints...")
    
    base_url = "http://127.0.0.1:5000"
    
    # Test database endpoint
    try:
        response = requests.get(f"{base_url}/api/test-db", timeout=5)
        print(f"📡 /api/test-db: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask server. Is it running?")
        return False
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False
    
    # Test get postback shares
    try:
        response = requests.get(f"{base_url}/api/postback-shares", timeout=5)
        print(f"📡 /api/postback-shares GET: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data)} postback shares")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ GET postback-shares error: {e}")
    
    return True

def test_create_postback_share():
    """Test creating a postback share"""
    print("\n🔍 Testing postback share creation...")
    
    test_data = {
        "third_party_name": "Test Partner",
        "third_party_contact": "test@example.com",
        "postback_type": "global",
        "notes": "Test creation",
        "status": "active",
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
        }
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:5000/api/postback-shares",
            json=test_data,
            timeout=10
        )
        print(f"📡 POST /api/postback-shares: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Successfully created postback share: {result.get('id')}")
            return result.get('id')
        else:
            print(f"❌ Failed to create: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Create postback share error: {e}")
        return None

def direct_database_test():
    """Test direct database insertion"""
    print("\n🔍 Testing direct database insertion...")
    
    if db is None:
        print("❌ No database connection")
        return
    
    try:
        from datetime import datetime
        
        import uuid
        
        test_doc = {
            "third_party_name": "Direct Test Partner UUID",
            "third_party_contact": "direct@test.com",
            "postback_type": "global",
            "unique_postback_id": str(uuid.uuid4()),
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
            "notes": "Direct database test with UUID",
            "status": "active",
            "created_at": datetime.utcnow(),
            "last_used": None,
            "usage_count": 0
        }
        
        result = db.postback_shares.insert_one(test_doc)
        print(f"✅ Direct insertion successful: {result.inserted_id}")
        
        # Verify it was saved
        saved_doc = db.postback_shares.find_one({"_id": result.inserted_id})
        if saved_doc:
            print(f"✅ Document verified in database")
        else:
            print(f"❌ Document not found after insertion")
            
    except Exception as e:
        print(f"❌ Direct database insertion error: {e}")

def main():
    print("🚀 Debugging Postback Shares Issues")
    print("=" * 50)
    
    # Test 1: Database connection
    db_ok = test_database_connection()
    
    if not db_ok:
        print("❌ Database issues detected. Check MongoDB connection.")
        return
    
    # Test 2: API endpoints
    api_ok = test_api_endpoints()
    
    if not api_ok:
        print("❌ API issues detected. Check if Flask server is running.")
        return
    
    # Test 3: Create postback share via API
    share_id = test_create_postback_share()
    
    # Test 4: Direct database insertion
    direct_database_test()
    
    print("\n" + "=" * 50)
    print("🎯 Debug Summary:")
    print(f"   - Database connection: {'✅' if db_ok else '❌'}")
    print(f"   - API endpoints: {'✅' if api_ok else '❌'}")
    print(f"   - API creation: {'✅' if share_id else '❌'}")
    print("\n💡 Check the Flask server logs for more details.")

if __name__ == "__main__":
    main()
