#!/usr/bin/env python3
"""
Debug script for specific user: hadanandani14@gmail.com
"""
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from bson import ObjectId

def debug_user_surveys():
    """Debug surveys for hadanandani14@gmail.com"""
    
    target_email = "hadanandani14@gmail.com"
    print(f"🔍 DEBUGGING USER: {target_email}\n")
    
    # Step 1: Find the user
    user = db.users.find_one({"email": target_email})
    if not user:
        print(f"❌ User {target_email} not found in database!")
        
        # Show all users to help debug
        all_users = list(db.users.find({}, {"email": 1, "name": 1}))
        print(f"\n📋 Available users ({len(all_users)}):")
        for u in all_users:
            print(f"  - {u.get('email', 'No email')}")
        return
    
    user_id_str = str(user['_id'])
    print(f"✅ User found:")
    print(f"  - Email: {user.get('email')}")
    print(f"  - Name: {user.get('name')}")
    print(f"  - ID: {user_id_str}")
    print(f"  - Simple ID: {user.get('simpleUserId', 'None')}")
    print(f"  - Role: {user.get('role', 'user')}")
    
    # Step 2: Check surveys with different queries
    print(f"\n🔍 SEARCHING FOR SURVEYS:")
    
    # Query 1: ownerUserId
    surveys1 = list(db.surveys.find({"ownerUserId": user_id_str}))
    print(f"  - ownerUserId = '{user_id_str}': {len(surveys1)} surveys")
    
    # Query 2: user_id
    surveys2 = list(db.surveys.find({"user_id": user_id_str}))
    print(f"  - user_id = '{user_id_str}': {len(surveys2)} surveys")
    
    # Query 3: creator_email
    surveys3 = list(db.surveys.find({"creator_email": target_email}))
    print(f"  - creator_email = '{target_email}': {len(surveys3)} surveys")
    
    # Query 4: Combined query (what the API uses)
    combined_query = {
        '$or': [
            {'ownerUserId': user_id_str},
            {'user_id': user_id_str},
            {'creator_email': target_email}
        ]
    }
    surveys_combined = list(db.surveys.find(combined_query))
    print(f"  - Combined query: {len(surveys_combined)} surveys")
    
    # Step 3: Show all surveys to see if any exist for this user
    all_surveys = list(db.surveys.find({}, {
        "prompt": 1, 
        "ownerUserId": 1, 
        "user_id": 1, 
        "creator_email": 1,
        "created_at": 1
    }).sort("created_at", -1))
    
    print(f"\n📋 ALL SURVEYS IN DATABASE ({len(all_surveys)}):")
    user_surveys_found = []
    
    for i, survey in enumerate(all_surveys):
        prompt = survey.get('prompt', 'No prompt')[:50] + '...'
        owner_id = survey.get('ownerUserId', 'None')
        user_id = survey.get('user_id', 'None')
        creator_email = survey.get('creator_email', 'None')
        created_at = survey.get('created_at', 'Unknown')
        
        # Check if this survey belongs to our target user
        belongs_to_user = (
            owner_id == user_id_str or 
            user_id == user_id_str or 
            creator_email == target_email
        )
        
        if belongs_to_user:
            user_surveys_found.append(survey)
            print(f"  ✅ [{i+1}] {prompt}")
            print(f"      Owner: {owner_id}, User: {user_id}, Email: {creator_email}")
            print(f"      Created: {created_at}")
        else:
            print(f"  ❌ [{i+1}] {prompt} (Owner: {owner_id}, Email: {creator_email})")
    
    print(f"\n📊 SUMMARY:")
    print(f"  - Total surveys in DB: {len(all_surveys)}")
    print(f"  - Surveys belonging to {target_email}: {len(user_surveys_found)}")
    
    if len(user_surveys_found) == 0:
        print(f"\n💡 POSSIBLE ISSUES:")
        print(f"  1. Survey was created without authentication")
        print(f"  2. Survey was created before user mapping was implemented")
        print(f"  3. Survey creation failed to link to user")
        print(f"  4. User created survey with different email/account")
    else:
        print(f"\n✅ Found {len(user_surveys_found)} surveys for this user!")
        print(f"   The issue might be in the frontend API call or authentication.")

if __name__ == "__main__":
    debug_user_surveys()
