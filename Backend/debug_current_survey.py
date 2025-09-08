#!/usr/bin/env python3
"""
Debug the specific survey that was just created
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
from auth_service import AuthService

def debug_specific_survey():
    """Debug the specific survey BJYLS"""
    print("🔍 Debugging Survey BJYLS")
    print("=" * 30)
    
    auth_service = AuthService()
    
    try:
        db = auth_service.get_db_connection()
        surveys_collection = db.surveys
        
        # Find the specific survey
        survey = surveys_collection.find_one({'_id': 'BJYLS'})
        
        if not survey:
            print("❌ Survey BJYLS not found in database")
            return
        
        print(f"📋 Survey BJYLS Details:")
        print(f"   ID: {survey.get('_id')}")
        print(f"   Creator Email: {survey.get('creator_email', 'Missing')}")
        print(f"   Simple User ID: {survey.get('simple_user_id', 'Missing')}")
        print(f"   Shareable Link: {survey.get('shareable_link', 'Missing')}")
        print(f"   Public Link: {survey.get('public_link', 'Missing')}")
        
        # Check what's in the links
        shareable_link = survey.get('shareable_link', '')
        if 'user_id=' in shareable_link:
            user_id_value = shareable_link.split('user_id=')[1].split('&')[0]
            print(f"   User ID in link: {user_id_value}")
            if user_id_value == '0':
                print("   ⚠️  User ID is 0 - this is the problem!")
        else:
            print("   ❌ No user_id parameter found in link")
        
        # Check the user who created this survey
        creator_email = survey.get('creator_email')
        if creator_email:
            users_collection = db.users
            creator = users_collection.find_one({'email': creator_email})
            if creator:
                print(f"\n👤 Creator Details:")
                print(f"   Email: {creator['email']}")
                print(f"   Simple User ID: {creator.get('simpleUserId', 'Missing')}")
                print(f"   Role: {creator.get('role', 'basic')}")
        
        return survey
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def fix_survey_bjyls():
    """Fix the specific survey BJYLS"""
    print("\n🔧 Fixing Survey BJYLS")
    print("=" * 25)
    
    auth_service = AuthService()
    
    try:
        db = auth_service.get_db_connection()
        surveys_collection = db.surveys
        users_collection = db.users
        
        # Get the survey
        survey = surveys_collection.find_one({'_id': 'BJYLS'})
        if not survey:
            print("❌ Survey not found")
            return
        
        # Get the creator
        creator_email = survey.get('creator_email')
        if not creator_email:
            print("❌ No creator email found")
            return
        
        creator = users_collection.find_one({'email': creator_email})
        if not creator:
            print("❌ Creator not found")
            return
        
        simple_user_id = creator.get('simpleUserId', 0)
        
        if simple_user_id == 0:
            print("❌ Creator has no simpleUserId")
            return
        
        # Fix the links
        FRONTEND_URL = "http://localhost:5173"
        survey_id = survey['_id']
        
        new_shareable_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
        new_public_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
        
        # Update the survey
        surveys_collection.update_one(
            {'_id': 'BJYLS'},
            {
                '$set': {
                    'shareable_link': new_shareable_link,
                    'public_link': new_public_link,
                    'simple_user_id': simple_user_id
                }
            }
        )
        
        print(f"✅ Fixed Survey BJYLS")
        print(f"   New Link: {new_shareable_link}")
        
    except Exception as e:
        print(f"❌ Error fixing survey: {e}")

if __name__ == "__main__":
    debug_specific_survey()
    fix_survey_bjyls()
    
    print("\n🚀 Debug and fix complete!")
    print("The survey BJYLS should now have the correct user_id parameter.")
