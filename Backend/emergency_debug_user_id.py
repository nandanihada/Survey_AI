#!/usr/bin/env python3
"""
Emergency debug script to find out why user_id is not being included
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
from auth_service import AuthService

def emergency_debug():
    """Emergency debug of user_id issue"""
    print("🚨 EMERGENCY DEBUG: Why is user_id missing?")
    print("=" * 60)
    
    auth_service = AuthService()
    
    try:
        # 1. Check database users
        db = auth_service.get_db_connection()
        users = list(db.users.find({}, {'email': 1, 'simpleUserId': 1, 'role': 1}).limit(3))
        
        print("1. DATABASE USERS:")
        for user in users:
            print(f"   {user['email']}: simpleUserId = {user.get('simpleUserId', 'MISSING')}")
        
        # 2. Test JWT token generation
        print("\n2. JWT TOKEN TEST:")
        test_user = users[0] if users else None
        if test_user:
            token = auth_service.generate_jwt_token(test_user)
            payload = auth_service.verify_jwt_token(token)
            print(f"   JWT contains simpleUserId: {payload.get('simpleUserId', 'MISSING')}")
            print(f"   JWT payload keys: {list(payload.keys())}")
        
        # 3. Test get_user_from_token
        print("\n3. GET_USER_FROM_TOKEN TEST:")
        if test_user:
            user_from_token = auth_service.get_user_from_token(token)
            if user_from_token:
                print(f"   Retrieved user simpleUserId: {user_from_token.get('simpleUserId', 'MISSING')}")
            else:
                print("   ❌ get_user_from_token returned None")
        
        # 4. Check recent surveys
        print("\n4. RECENT SURVEYS CHECK:")
        recent_surveys = list(db.surveys.find({}).sort('created_at', -1).limit(3))
        for survey in recent_surveys:
            print(f"   Survey {survey.get('_id')}: {survey.get('shareable_link', 'No link')}")
        
        # 5. Manual survey URL generation test
        print("\n5. MANUAL URL GENERATION TEST:")
        if test_user:
            simple_user_id = test_user.get('simpleUserId', 0)
            test_url = f"https://theinterwebsite.space/survey?offer_id=TEST&user_id={simple_user_id}"
            print(f"   Expected URL: {test_url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Emergency debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def fix_all_surveys_now():
    """Fix all surveys that are missing user_id"""
    print("\n🔧 FIXING ALL SURVEYS NOW")
    print("=" * 30)
    
    auth_service = AuthService()
    db = auth_service.get_db_connection()
    
    try:
        # Get all surveys without proper user_id in link
        surveys = list(db.surveys.find({}))
        fixed_count = 0
        
        for survey in surveys:
            survey_id = survey.get('_id')
            shareable_link = survey.get('shareable_link', '')
            
            # Check if user_id is missing or is 0
            if 'user_id=' not in shareable_link or 'user_id=0' in shareable_link:
                # Get creator info
                creator_email = survey.get('creator_email')
                if creator_email:
                    creator = db.users.find_one({'email': creator_email})
                    if creator and creator.get('simpleUserId'):
                        simple_user_id = creator['simpleUserId']
                        
                        # Fix the URL
                        new_link = f"https://theinterwebsite.space/survey?offer_id={survey_id}&user_id={simple_user_id}"
                        
                        # Update survey
                        db.surveys.update_one(
                            {'_id': survey_id},
                            {
                                '$set': {
                                    'shareable_link': new_link,
                                    'public_link': new_link,
                                    'simple_user_id': simple_user_id
                                }
                            }
                        )
                        
                        print(f"✅ Fixed {survey_id}: {new_link}")
                        fixed_count += 1
        
        print(f"\n🎉 Fixed {fixed_count} surveys!")
        
    except Exception as e:
        print(f"❌ Fix failed: {e}")

if __name__ == "__main__":
    emergency_debug()
    fix_all_surveys_now()
    
    print("\n🚀 Emergency debug complete!")
    print("If user_id is still missing, the issue is in the backend server not being restarted.")
