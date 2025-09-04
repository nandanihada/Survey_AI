#!/usr/bin/env python3
"""
Migration script to add simple numeric user IDs to existing users
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from utils.short_id import generate_simple_user_id

def migrate_simple_user_ids():
    """Add simple numeric user IDs to existing users who don't have them"""
    users_collection = db.users
    
    # Find users without simple user IDs
    users_without_simple_id = list(users_collection.find({
        '$or': [
            {'simpleUserId': {'$exists': False}},
            {'simpleUserId': None},
            {'simpleUserId': 0}
        ]
    }))
    
    print(f"Found {len(users_without_simple_id)} users without simple IDs")
    
    updated_count = 0
    for user in users_without_simple_id:
        # Generate unique simple user ID
        while True:
            simple_user_id = generate_simple_user_id()
            # Check if this ID already exists
            if not users_collection.find_one({'simpleUserId': simple_user_id}):
                break
        
        # Update user with simple ID
        result = users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'simpleUserId': simple_user_id}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Updated user {user.get('email', 'Unknown')} with simple ID: {simple_user_id}")
            updated_count += 1
        else:
            print(f"❌ Failed to update user {user.get('email', 'Unknown')}")
    
    print(f"\n🎉 Migration completed! Updated {updated_count} users with simple numeric IDs")

if __name__ == "__main__":
    print("🚀 Starting simple user ID migration...")
    migrate_simple_user_ids()
