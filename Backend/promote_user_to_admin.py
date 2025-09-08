#!/usr/bin/env python3
"""
Promote the current user to admin role
"""
import os
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/survey_db')
client = MongoClient(MONGODB_URI)
db = client.get_default_database()

# User ID from the JWT token in your logs
user_id = "68baca9b7c67efcef6e70d50"

try:
    result = db.users.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'role': 'admin', 'status': 'approved'}}
    )
    
    if result.modified_count > 0:
        user = db.users.find_one({'_id': ObjectId(user_id)})
        print(f"✅ Promoted {user.get('email')} to admin role")
        print("🔄 IMPORTANT: Log out and log back in to get admin access")
    else:
        print("❌ Failed to update user")
        
except Exception as e:
    print(f"Error: {e}")
