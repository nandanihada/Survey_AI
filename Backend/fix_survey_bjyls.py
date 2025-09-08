#!/usr/bin/env python3
"""
Fix the specific survey BJYLS that's missing user_id
"""
import os
from pymongo import MongoClient
from auth_service import AuthService

def fix_survey_bjyls():
    """Fix survey BJYLS to include proper user_id"""
    print("🔧 Fixing Survey BJYLS")
    
    auth_service = AuthService()
    db = auth_service.get_db_connection()
    surveys_collection = db.surveys
    users_collection = db.users
    
    # Get the survey
    survey = surveys_collection.find_one({'_id': 'BJYLS'})
    if not survey:
        print("❌ Survey BJYLS not found")
        return
    
    print(f"📋 Current survey data:")
    print(f"   Creator email: {survey.get('creator_email', 'Missing')}")
    print(f"   Current link: {survey.get('shareable_link', 'Missing')}")
    
    # Get creator's simpleUserId
    creator_email = survey.get('creator_email')
    if not creator_email:
        print("❌ No creator email found")
        return
    
    creator = users_collection.find_one({'email': creator_email})
    if not creator:
        print("❌ Creator not found in database")
        return
    
    simple_user_id = creator.get('simpleUserId')
    if not simple_user_id:
        print("❌ Creator has no simpleUserId")
        return
    
    print(f"✅ Found creator simpleUserId: {simple_user_id}")
    
    # Update the survey with correct links
    FRONTEND_URL = "http://localhost:5173"
    survey_id = "BJYLS"
    
    new_shareable_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
    new_public_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
    
    # Update in database
    result = surveys_collection.update_one(
        {'_id': 'BJYLS'},
        {
            '$set': {
                'shareable_link': new_shareable_link,
                'public_link': new_public_link,
                'simple_user_id': simple_user_id
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"✅ Successfully updated survey BJYLS")
        print(f"   New link: {new_shareable_link}")
    else:
        print("❌ Failed to update survey")

if __name__ == "__main__":
    fix_survey_bjyls()
