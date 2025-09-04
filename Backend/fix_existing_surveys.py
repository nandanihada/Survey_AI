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

def fix_existing_surveys():
    """Fix existing surveys by adding proper user mapping"""
    
    print("🔧 FIXING EXISTING SURVEYS\n")
    
    # Find surveys without proper user mapping
    surveys_without_mapping = list(db.surveys.find({
        '$or': [
            {'ownerUserId': {'$exists': False}},
            {'ownerUserId': None},
            {'user_id': {'$exists': False}}
        ]
    }))
    
    print(f"📋 Found {len(surveys_without_mapping)} surveys without proper user mapping")
    
    if len(surveys_without_mapping) == 0:
        print("✅ All surveys already have proper user mapping!")
        return
    
    # Get all users for potential mapping
    users = list(db.users.find({}, {'email': 1, 'name': 1, 'simpleUserId': 1}))
    print(f"👥 Available users: {len(users)}")
    
    # For now, we'll assign orphaned surveys to the first user (you can modify this logic)
    if users:
        default_user = users[0]
        default_user_id = str(default_user['_id'])
        
        print(f"🎯 Assigning orphaned surveys to: {default_user.get('email', 'Unknown')}")
        
        updated_count = 0
        for survey in surveys_without_mapping:
            update_data = {
                'ownerUserId': default_user_id,
                'user_id': default_user_id,
                'creator_email': default_user.get('email', ''),
                'creator_name': default_user.get('name', ''),
                'simple_user_id': default_user.get('simpleUserId', 0)
            }
            
            result = db.surveys.update_one(
                {'_id': survey['_id']},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                prompt = survey.get('prompt', 'No prompt')[:50] + '...'
                print(f"  ✅ Updated survey: {prompt}")
                updated_count += 1
        
        print(f"\n🎉 Updated {updated_count} surveys with user mapping!")
    else:
        print("❌ No users found to assign surveys to!")

def show_survey_stats():
    """Show current survey statistics"""
    print("\n📊 CURRENT SURVEY STATISTICS:")
    
    total_surveys = db.surveys.count_documents({})
    surveys_with_owners = db.surveys.count_documents({'ownerUserId': {'$exists': True, '$ne': None}})
    surveys_without_owners = total_surveys - surveys_with_owners
    
    print(f"  - Total surveys: {total_surveys}")
    print(f"  - Surveys with owners: {surveys_with_owners}")
    print(f"  - Surveys without owners: {surveys_without_owners}")
    
    # Show user survey counts
    users = list(db.users.find({}, {'email': 1}))
    print(f"\n👤 USER SURVEY COUNTS:")
    for user in users:
        user_id_str = str(user['_id'])
        user_surveys = db.surveys.count_documents({
            '$or': [
                {'ownerUserId': user_id_str},
                {'user_id': user_id_str}
            ]
        })
        print(f"  - {user.get('email', 'Unknown')}: {user_surveys} surveys")

if __name__ == "__main__":
    fix_existing_surveys()
    show_survey_stats()
