#!/usr/bin/env python3
"""
Debug script to check survey and user data
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from bson import ObjectId

def debug_surveys_and_users():
    """Debug surveys and users to understand the issue"""
    
    print("=== DEBUGGING SURVEYS AND USERS ===\n")
    
    # Check users
    users = list(db.users.find({}, {'email': 1, 'name': 1, 'simpleUserId': 1, 'fancyUserId': 1}))
    print(f"📊 Total Users: {len(users)}")
    for user in users:
        print(f"  - {user.get('email', 'No email')} | ID: {user['_id']} | Simple: {user.get('simpleUserId', 'None')} | Fancy: {user.get('fancyUserId', 'None')}")
    
    print()
    
    # Check surveys
    surveys = list(db.surveys.find({}, {'prompt': 1, 'ownerUserId': 1, 'created_at': 1}))
    print(f"📋 Total Surveys: {len(surveys)}")
    for survey in surveys:
        owner_id = survey.get('ownerUserId', 'No owner')
        prompt = survey.get('prompt', 'No prompt')[:50] + '...' if survey.get('prompt') else 'No prompt'
        print(f"  - Survey ID: {survey['_id']} | Owner: {owner_id} | Prompt: {prompt}")
    
    print()
    
    # Check survey ownership mapping
    print("🔗 SURVEY OWNERSHIP ANALYSIS:")
    surveys_with_owners = list(db.surveys.find({'ownerUserId': {'$exists': True, '$ne': None}}))
    surveys_without_owners = list(db.surveys.find({'$or': [{'ownerUserId': {'$exists': False}}, {'ownerUserId': None}]}))
    
    print(f"  - Surveys WITH owners: {len(surveys_with_owners)}")
    print(f"  - Surveys WITHOUT owners: {len(surveys_without_owners)}")
    
    # Try to match surveys to users
    print("\n🎯 MATCHING SURVEYS TO USERS:")
    for user in users:
        user_id_str = str(user['_id'])
        user_surveys = list(db.surveys.find({'ownerUserId': user_id_str}))
        print(f"  - User {user.get('email', 'Unknown')} ({user_id_str}): {len(user_surveys)} surveys")
        for survey in user_surveys:
            print(f"    └── {survey.get('prompt', 'No prompt')[:30]}...")

if __name__ == "__main__":
    debug_surveys_and_users()
