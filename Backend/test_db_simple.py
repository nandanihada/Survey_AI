#!/usr/bin/env python3
"""
Simple test to check database and postback shares functionality
"""

from mongodb_config import db
from datetime import datetime
import json

def test_db_connection():
    """Test basic database connection"""
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
        print(f"📋 Collections: {collections}")
        
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_postback_shares_crud():
    """Test postback shares CRUD operations"""
    print("\n🔍 Testing postback shares CRUD...")
    
    if db is None:
        print("❌ No database connection")
        return False
    
    try:
        # Create a test document
        test_doc = {
            "third_party_name": "Test Partner",
            "third_party_contact": "test@example.com",
            "postback_type": "global",
            "parameters": {
                "campaign_id": {"enabled": True, "description": "Test campaign"},
                "sid1": {"enabled": True, "description": "Test SID1"}
            },
            "notes": "Test document",
            "status": "active",
            "created_at": datetime.utcnow(),
            "last_used": None,
            "usage_count": 0
        }
        
        # Insert
        print("📝 Inserting test document...")
        result = db.postback_shares.insert_one(test_doc)
        print(f"✅ Inserted with ID: {result.inserted_id}")
        
        # Read
        print("📖 Reading document...")
        found_doc = db.postback_shares.find_one({"_id": result.inserted_id})
        if found_doc:
            print(f"✅ Found document: {found_doc['third_party_name']}")
        else:
            print("❌ Document not found")
            return False
        
        # Update
        print("✏️ Updating document...")
        update_result = db.postback_shares.update_one(
            {"_id": result.inserted_id},
            {"$set": {"notes": "Updated test document"}}
        )
        print(f"✅ Updated {update_result.modified_count} document(s)")
        
        # Count documents
        count = db.postback_shares.count_documents({})
        print(f"📊 Total postback_shares documents: {count}")
        
        # Clean up - delete test document
        print("🗑️ Cleaning up...")
        delete_result = db.postback_shares.delete_one({"_id": result.inserted_id})
        print(f"✅ Deleted {delete_result.deleted_count} document(s)")
        
        return True
        
    except Exception as e:
        print(f"❌ CRUD test error: {e}")
        return False

def main():
    print("🚀 Simple Database Test for Postback Shares")
    print("=" * 50)
    
    # Test database connection
    db_ok = test_db_connection()
    
    if not db_ok:
        print("\n❌ Database connection failed. Check MongoDB setup.")
        print("💡 Make sure MongoDB is running and MONGO_URI is correct.")
        return
    
    # Test CRUD operations
    crud_ok = test_postback_shares_crud()
    
    print("\n" + "=" * 50)
    print("🎯 Test Results:")
    print(f"   Database Connection: {'✅ OK' if db_ok else '❌ FAILED'}")
    print(f"   CRUD Operations: {'✅ OK' if crud_ok else '❌ FAILED'}")
    
    if db_ok and crud_ok:
        print("\n✅ All tests passed! Database is working correctly.")
        print("💡 The issue might be with the Flask server or API endpoints.")
    else:
        print("\n❌ Database issues detected.")
        print("💡 Check MongoDB connection and configuration.")

if __name__ == "__main__":
    main()
