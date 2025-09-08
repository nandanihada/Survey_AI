#!/usr/bin/env python3
"""
Fix admin authentication by ensuring at least one admin user exists
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/survey_db')
client = MongoClient(MONGODB_URI)
db = client.get_default_database()

def fix_admin_user():
    """Ensure at least one admin user exists"""
    print("Checking for admin users...")
    
    # Check for existing admin users
    admin_count = db.users.count_documents({'role': 'admin'})
    print(f"Found {admin_count} admin users")
    
    if admin_count == 0:
        # Find first user and make them admin
        first_user = db.users.find_one()
        if first_user:
            result = db.users.update_one(
                {'_id': first_user['_id']},
                {'$set': {'role': 'admin', 'status': 'approved'}}
            )
            print(f"Made {first_user.get('email')} an admin user")
        else:
            print("No users found in database!")
    else:
        # List existing admin users
        admins = list(db.users.find({'role': 'admin'}))
        for admin in admins:
            print(f"Admin user: {admin.get('email')} (Status: {admin.get('status', 'approved')})")

if __name__ == "__main__":
    fix_admin_user()
