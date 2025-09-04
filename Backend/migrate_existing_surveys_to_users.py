#!/usr/bin/env python3
"""
Migration script to fix existing surveys without proper user mapping
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from bson import ObjectId

def migrate_existing_surveys():
    """Fix existing surveys by adding proper user mapping"""
    
    print("🔧 MIGRATING EXISTING SURVEYS TO USERS\n")
    
    # Find surveys without proper user mapping
    surveys_without_mapping = list(db.surveys.find({
        '$or': [
            {'ownerUserId': {'$exists': False}},
            {'ownerUserId': None},
            {'ownerUserId': ''},
            {'creator_email': {'$exists': False}},
            {'created_by': {'$exists': False}}
        ]
    }).sort('created_at', -1))
    
    print(f"📋 Found {len(surveys_without_mapping)} surveys without proper user mapping")
    
    if len(surveys_without_mapping) == 0:
        print("✅ All surveys already have proper user mapping!")
        return
    
    # Get all users for potential mapping
    users = list(db.users.find({}, {'email': 1, 'name': 1, 'simpleUserId': 1}))
    print(f"👥 Available users: {len(users)}")
    
    if not users:
        print("❌ No users found to assign surveys to!")
        return
    
    # For each survey without mapping, assign to first user (or implement better logic)
    default_user = users[0]  # You can modify this logic as needed
    default_user_id = str(default_user['_id'])
    
    print(f"🎯 Assigning orphaned surveys to: {default_user.get('email', 'Unknown')}")
    
    updated_count = 0
    for survey in surveys_without_mapping:
        # Create comprehensive user mapping
        update_data = {
            'ownerUserId': default_user_id,
            'user_id': default_user_id,
            'creator_email': default_user.get('email', ''),
            'creator_name': default_user.get('name', ''),
            'simple_user_id': default_user.get('simpleUserId', 0),
            'created_by': {
                'user_id': default_user_id,
                'email': default_user.get('email', ''),
                'name': default_user.get('name', ''),
                'simple_id': default_user.get('simpleUserId', 0)
            }
        }
        
        result = db.surveys.update_one(
            {'_id': survey['_id']},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            prompt = survey.get('prompt', 'No prompt')[:50] + '...'
            print(f"  ✅ Updated survey: {prompt}")
            updated_count += 1
    
    print(f"\n🎉 Updated {updated_count} surveys with comprehensive user mapping!")
    
    # Show final statistics
    print(f"\n📊 FINAL STATISTICS:")
    total_surveys = db.surveys.count_documents({})
    surveys_with_owners = db.surveys.count_documents({'ownerUserId': {'$exists': True, '$ne': None}})
    surveys_with_created_by = db.surveys.count_documents({'created_by': {'$exists': True}})
    
    print(f"  - Total surveys: {total_surveys}")
    print(f"  - Surveys with ownerUserId: {surveys_with_owners}")
    print(f"  - Surveys with created_by: {surveys_with_created_by}")
    
    # Show user survey counts
    print(f"\n👤 USER SURVEY COUNTS:")
    for user in users:
        user_id_str = str(user['_id'])
        user_surveys = db.surveys.count_documents({
            '$or': [
                {'ownerUserId': user_id_str},
                {'user_id': user_id_str},
                {'created_by.user_id': user_id_str}
            ]
        })
        print(f"  - {user.get('email', 'Unknown')}: {user_surveys} surveys")

if __name__ == "__main__":
    migrate_existing_surveys()
