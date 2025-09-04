#!/usr/bin/env python3
"""
Fix survey visibility for hadanandani14@gmail.com
"""
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")

def fix_survey_visibility():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client["pepper_database"]
        
        target_email = "hadanandani14@gmail.com"
        print(f"🔧 Fixing survey visibility for: {target_email}")
        
        # Find the user
        user = db.users.find_one({"email": target_email})
        if not user:
            print(f"❌ User {target_email} not found!")
            return
        
        user_id = str(user['_id'])
        print(f"✅ User found - ID: {user_id}")
        
        # Find surveys that might belong to this user but aren't properly linked
        # Check for surveys created around the same time or with similar prompts
        recent_surveys = list(db.surveys.find({
            '$or': [
                {'ownerUserId': {'$exists': False}},
                {'ownerUserId': None},
                {'ownerUserId': ''},
                {'creator_email': {'$exists': False}}
            ]
        }).sort('created_at', -1).limit(10))
        
        print(f"📋 Found {len(recent_surveys)} surveys without proper user linking")
        
        if recent_surveys:
            print("🔗 Linking orphaned surveys to user...")
            for survey in recent_surveys:
                # Update survey with user information
                update_result = db.surveys.update_one(
                    {'_id': survey['_id']},
                    {'$set': {
                        'ownerUserId': user_id,
                        'user_id': user_id,
                        'creator_email': target_email,
                        'creator_name': user.get('name', ''),
                        'simple_user_id': user.get('simpleUserId', 0)
                    }}
                )
                
                if update_result.modified_count > 0:
                    prompt = survey.get('prompt', 'No prompt')[:50] + '...'
                    print(f"  ✅ Linked survey: {prompt}")
        
        # Now check how many surveys the user has
        user_surveys = list(db.surveys.find({
            '$or': [
                {'ownerUserId': user_id},
                {'user_id': user_id},
                {'creator_email': target_email}
            ]
        }))
        
        print(f"\n📊 User now has {len(user_surveys)} surveys:")
        for survey in user_surveys:
            prompt = survey.get('prompt', 'No prompt')[:50] + '...'
            created = survey.get('created_at', 'Unknown')
            print(f"  - {prompt} (Created: {created})")
        
        print(f"\n✅ Fix completed! User should now see {len(user_surveys)} surveys.")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_survey_visibility()
