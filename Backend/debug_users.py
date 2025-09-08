#!/usr/bin/env python3
"""
Debug script to check user data structure and IDs
"""
import os
from pymongo import MongoClient
from bson import ObjectId
import json

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/survey_db')
client = MongoClient(MONGODB_URI)
db = client.get_default_database()

def debug_users():
    """Check user data structure"""
    print("=== User Data Structure Debug ===")
    
    # Get first few users
    users = list(db.users.find().limit(3))
    
    for i, user in enumerate(users):
        print(f"\nUser {i+1}:")
        print(f"  _id: {user.get('_id')} (type: {type(user.get('_id'))})")
        print(f"  uid: {user.get('uid')}")
        print(f"  email: {user.get('email')}")
        print(f"  role: {user.get('role', 'NOT SET')}")
        print(f"  status: {user.get('status', 'NOT SET')}")
        print(f"  All fields: {list(user.keys())}")

if __name__ == "__main__":
    debug_users()
