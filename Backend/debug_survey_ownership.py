#!/usr/bin/env python3
"""
Debug script to check survey ownership mapping
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from bson import ObjectId

def debug_survey_ownership():
    """Debug survey ownership to understand the issue"""
    
    print("🔍 DEBUGGING SURVEY OWNERSHIP\n")
    
    # Check all users
    users = list(db.users.find({}, {'email': 1, 'name': 1, 'simpleUserId': 1, 'role': 1}))
    print(f"👥 Total Users: {len(users)}")
    for user in users:
        print(f"  - {user.get('email', 'No email')} | Role: {user.get('role', 'user')} | ID: {user['_id']} | SimpleID: {user.get('simpleUserId', 'None')}")
    
    print()
    
    # Check all surveys
    surveys = list(db.surveys.find({}, {'prompt': 1, 'ownerUserId': 1, 'created_at': 1, '_id': 1}))
    print(f"📋 Total Surveys: {len(surveys)}")
    
    surveys_with_owners = 0
    surveys_without_owners = 0
    
    for survey in surveys:
        owner_id = survey.get('ownerUserId')
        prompt = (survey.get('prompt', 'No prompt')[:40] + '...') if survey.get('prompt') else 'No prompt'
        
        if owner_id:
            surveys_with_owners += 1
            # Find the owner
            try:
                owner = db.users.find_one({'_id': ObjectId(owner_id)})
                owner_email = owner.get('email', 'Unknown') if owner else 'User not found'
            except:
                owner_email = 'Invalid ObjectId'
            print(f"  ✅ Survey {survey['_id']} | Owner: {owner_email} ({owner_id}) | {prompt}")
        else:
            surveys_without_owners += 1
            print(f"  ❌ Survey {survey['_id']} | No Owner | {prompt}")
    
    print(f"\n📊 SUMMARY:")
    print(f"  - Surveys with owners: {surveys_with_owners}")
    print(f"  - Surveys without owners: {surveys_without_owners}")
    
    # Test user survey lookup
    print(f"\n🔍 USER SURVEY LOOKUP TEST:")
    for user in users[:2]:  # Test first 2 users
        user_id_str = str(user['_id'])
        user_surveys = list(db.surveys.find({'ownerUserId': user_id_str}))
        print(f"  - User {user.get('email', 'Unknown')} ({user_id_str}): {len(user_surveys)} surveys")
        for survey in user_surveys:
            print(f"    └── {survey.get('prompt', 'No prompt')[:50]}...")

if __name__ == "__main__":
    debug_survey_ownership()
