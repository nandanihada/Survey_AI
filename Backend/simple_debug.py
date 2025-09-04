#!/usr/bin/env python3
"""
Simple debug script to check database connection and data
"""
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/pepper_database"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client["pepper_database"]
    print(f"✅ Connected to MongoDB")
    
    # Check users
    users_count = db.users.count_documents({})
    print(f"📊 Users: {users_count}")
    
    # Check surveys
    surveys_count = db.surveys.count_documents({})
    print(f"📋 Surveys: {surveys_count}")
    
    # Check surveys with owners
    surveys_with_owners = db.surveys.count_documents({'ownerUserId': {'$exists': True, '$ne': None}})
    print(f"🔗 Surveys with owners: {surveys_with_owners}")
    
    # Show sample user
    sample_user = db.users.find_one({}, {'email': 1, 'simpleUserId': 1})
    if sample_user:
        print(f"👤 Sample user: {sample_user}")
    
    # Show sample survey
    sample_survey = db.surveys.find_one({}, {'prompt': 1, 'ownerUserId': 1})
    if sample_survey:
        print(f"📝 Sample survey: {sample_survey}")
        
except Exception as e:
    print(f"❌ Error: {e}")
