#!/usr/bin/env python3
"""
Fix users who don't have simpleUserId set
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from utils.short_id import generate_simple_user_id

def fix_users_without_simple_ids():
    """Add simpleUserId to users who don't have it"""
    
    print("🔧 FIXING USERS WITHOUT SIMPLE USER IDS\n")
    
    # Find users without simpleUserId
    users_without_simple_id = list(db.users.find({
        '$or': [
            {'simpleUserId': {'$exists': False}},
            {'simpleUserId': None},
            {'simpleUserId': 0}
        ]
    }))
    
    print(f"📋 Found {len(users_without_simple_id)} users without simpleUserId")
    
    if len(users_without_simple_id) == 0:
        print("✅ All users already have simpleUserId!")
        return
    
    updated_count = 0
    for user in users_without_simple_id:
        # Generate a unique simple user ID
        while True:
            simple_id = generate_simple_user_id()
            # Check if this ID is already taken
            if not db.users.find_one({'simpleUserId': simple_id}):
                break
        
        # Update user with simple ID
        result = db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'simpleUserId': simple_id}}
        )
        
        if result.modified_count > 0:
            email = user.get('email', 'Unknown')
            print(f"  ✅ Updated {email} -> simpleUserId: {simple_id}")
            updated_count += 1
    
    print(f"\n🎉 Updated {updated_count} users with simpleUserId!")
    
    # Show all users with their simple IDs
    print(f"\n👥 ALL USERS WITH SIMPLE IDS:")
    all_users = list(db.users.find({}, {'email': 1, 'name': 1, 'simpleUserId': 1}))
    for user in all_users:
        email = user.get('email', 'Unknown')
        name = user.get('name', 'Unknown')
        simple_id = user.get('simpleUserId', 'NOT SET')
        print(f"  - {email} ({name}) -> {simple_id}")

if __name__ == "__main__":
    fix_users_without_simple_ids()
