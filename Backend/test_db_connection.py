#!/usr/bin/env python3
"""
Test MongoDB connection and postback_shares collection
"""

try:
    from mongodb_config import db
    print("✅ MongoDB config imported successfully")
    
    # Test database connection
    try:
        # Try to ping the database
        db.command('ping')
        print("✅ Database connection successful")
        
        # List collections
        collections = db.list_collection_names()
        print(f"📋 Available collections: {collections}")
        
        # Check if postback_shares exists
        if 'postback_shares' in collections:
            count = db.postback_shares.count_documents({})
            print(f"📊 postback_shares collection exists with {count} documents")
        else:
            print("⚠️ postback_shares collection doesn't exist - will be created automatically")
            
        # Test the API endpoint logic
        try:
            shares_cursor = db.postback_shares.find().sort("created_at", -1)
            shares = list(shares_cursor)
            print(f"✅ Successfully queried postback_shares: {len(shares)} records")
            
        except Exception as query_error:
            print(f"❌ Error querying postback_shares: {query_error}")
            
    except Exception as db_error:
        print(f"❌ Database connection error: {db_error}")
        print("Make sure MongoDB is running and MONGO_URI is set correctly")
        
except Exception as import_error:
    print(f"❌ Import error: {import_error}")
    print("Check if .env file exists with MONGO_URI")
