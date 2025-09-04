#!/usr/bin/env python3
"""
Migration script to add fancy user IDs to existing users
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from utils.short_id import generate_fancy_user_id

def migrate_user_ids():
    """Add fancy user IDs to existing users who don't have them"""
    users_collection = db.users
    
    # Find users without fancy user IDs
    users_without_fancy_id = list(users_collection.find({
        '$or': [
            {'fancyUserId': {'$exists': False}},
            {'fancyUserId': None},
            {'fancyUserId': ''}
        ]
    }))
    
    print(f"Found {len(users_without_fancy_id)} users without fancy IDs")
    
    updated_count = 0
    for user in users_without_fancy_id:
        # Generate unique fancy user ID
        while True:
            fancy_user_id = generate_fancy_user_id()
            # Check if this fancy ID already exists
            if not users_collection.find_one({'fancyUserId': fancy_user_id}):
                break
        
        # Update user with fancy ID
        result = users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'fancyUserId': fancy_user_id}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Updated user {user.get('email', 'Unknown')} with fancy ID: {fancy_user_id}")
            updated_count += 1
        else:
            print(f"❌ Failed to update user {user.get('email', 'Unknown')}")
    
    print(f"\n🎉 Migration completed! Updated {updated_count} users with fancy IDs")

if __name__ == "__main__":
    print("🚀 Starting user ID migration...")
    migrate_user_ids()
