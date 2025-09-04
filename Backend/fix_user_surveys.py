#!/usr/bin/env python3
"""
Complete fix for user surveys issue
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from utils.short_id import generate_simple_user_id
from bson import ObjectId

def fix_user_surveys():
    """Fix user surveys by adding simple IDs and checking survey ownership"""
    
    print("🔧 FIXING USER SURVEYS SYSTEM\n")
    
    # Step 1: Add simple user IDs to existing users
    print("Step 1: Adding simple numeric IDs to users...")
    users_collection = db.users
    users_without_simple_id = list(users_collection.find({
        '$or': [
            {'simpleUserId': {'$exists': False}},
            {'simpleUserId': None},
            {'simpleUserId': 0}
        ]
    }))
    
    updated_users = 0
    for user in users_without_simple_id:
        while True:
            simple_user_id = generate_simple_user_id()
            if not users_collection.find_one({'simpleUserId': simple_user_id}):
                break
        
        result = users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'simpleUserId': simple_user_id}}
        )
        
        if result.modified_count > 0:
            print(f"  ✅ User {user.get('email', 'Unknown')}: {simple_user_id}")
            updated_users += 1
    
    print(f"  📊 Updated {updated_users} users with simple IDs\n")
    
    # Step 2: Check survey ownership
    print("Step 2: Analyzing survey ownership...")
    surveys_with_owners = db.surveys.count_documents({'ownerUserId': {'$exists': True, '$ne': None}})
    surveys_without_owners = db.surveys.count_documents({'$or': [{'ownerUserId': {'$exists': False}}, {'ownerUserId': None}]})
    
    print(f"  📋 Surveys with owners: {surveys_with_owners}")
    print(f"  📋 Surveys without owners: {surveys_without_owners}")
    
    # Step 3: Show user-survey mapping
    print("\nStep 3: User-Survey mapping:")
    users = list(db.users.find({}, {'email': 1, 'simpleUserId': 1}))
    for user in users:
        user_id_str = str(user['_id'])
        user_surveys = db.surveys.count_documents({'ownerUserId': user_id_str})
        simple_id = user.get('simpleUserId', 'None')
        print(f"  👤 {user.get('email', 'Unknown')} (ID: {simple_id}): {user_surveys} surveys")
    
    print(f"\n🎉 Fix completed!")
    
    # Step 4: Test data
    print("\nStep 4: Sample data for testing:")
    sample_user = db.users.find_one({}, {'email': 1, 'simpleUserId': 1})
    if sample_user:
        print(f"  Sample user: {sample_user}")
        user_surveys = list(db.surveys.find({'ownerUserId': str(sample_user['_id'])}, {'prompt': 1}).limit(2))
        print(f"  Their surveys: {len(user_surveys)}")
        for survey in user_surveys:
            print(f"    - {survey.get('prompt', 'No prompt')[:50]}...")

if __name__ == "__main__":
    fix_user_surveys()
