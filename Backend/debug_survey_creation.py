#!/usr/bin/env python3
"""
Debug survey creation process to check user_id inclusion
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
from auth_service import AuthService
from flask import Flask, g

def debug_survey_creation_process():
    """Debug the survey creation process"""
    print("🔍 Debugging Survey Creation Process")
    print("=" * 50)
    
    # Initialize auth service
    auth_service = AuthService()
    
    try:
        # Get database connection
        db = auth_service.get_db_connection()
        users_collection = db.users
        
        # Get a test user (admin user from previous debug)
        test_user = users_collection.find_one({'email': 'nandanihada2003@gmail.com'})
        
        if not test_user:
            print("❌ Test user not found")
            return
        
        print(f"📋 Test User Info:")
        print(f"   Email: {test_user['email']}")
        print(f"   Role: {test_user.get('role', 'basic')}")
        print(f"   simpleUserId: {test_user.get('simpleUserId', 'MISSING')}")
        
        # Simulate the survey creation process
        FRONTEND_URL = "http://localhost:5173"
        survey_id = "TEST123"
        
        # This is what happens in app.py line 683-684
        simple_user_id = test_user.get('simpleUserId', 0)
        shareable_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
        public_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
        
        print(f"\n🔗 Generated Links:")
        print(f"   Shareable: {shareable_link}")
        print(f"   Public: {public_link}")
        
        # Check if user_id is properly included
        if f"user_id={simple_user_id}" in shareable_link and simple_user_id != 0:
            print(f"✅ user_id properly included: {simple_user_id}")
        else:
            print(f"❌ user_id issue detected!")
            print(f"   Expected: user_id={simple_user_id}")
            print(f"   simpleUserId value: {simple_user_id}")
            print(f"   Type: {type(simple_user_id)}")
        
        return test_user
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def check_recent_surveys():
    """Check recent surveys in database for user_id in links"""
    print("\n📊 Checking Recent Surveys")
    print("=" * 30)
    
    auth_service = AuthService()
    
    try:
        db = auth_service.get_db_connection()
        surveys_collection = db.surveys
        
        # Get recent surveys
        recent_surveys = list(surveys_collection.find({}).sort('created_at', -1).limit(5))
        
        if not recent_surveys:
            print("No surveys found in database")
            return
        
        for survey in recent_surveys:
            survey_id = survey.get('_id', 'Unknown')
            shareable_link = survey.get('shareable_link', 'No link')
            simple_user_id = survey.get('simple_user_id', 'Missing')
            creator_email = survey.get('creator_email', 'Unknown')
            
            print(f"\n📋 Survey: {survey_id}")
            print(f"   Creator: {creator_email}")
            print(f"   simple_user_id field: {simple_user_id}")
            print(f"   Link: {shareable_link}")
            
            # Check if user_id is in the link
            if 'user_id=' in shareable_link:
                user_id_in_link = shareable_link.split('user_id=')[1].split('&')[0]
                print(f"   user_id in link: {user_id_in_link}")
                if user_id_in_link == '0':
                    print("   ⚠️  user_id is 0 - this indicates the issue!")
            else:
                print("   ❌ No user_id found in link")
        
    except Exception as e:
        print(f"❌ Error checking surveys: {e}")

if __name__ == "__main__":
    debug_survey_creation_process()
    check_recent_surveys()
    
    print("\n🚀 Debug complete!")
    print("\nIf user_id is showing as 0, the issue is that simpleUserId is not being")
    print("properly retrieved from the current_user object during survey creation.")
