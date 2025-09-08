#!/usr/bin/env python3
"""
Fix ALL surveys to include user_id parameter in their URLs
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_all_surveys():
    """Fix all surveys to include user_id parameter"""
    print("🔧 FIXING ALL SURVEYS TO INCLUDE USER_ID")
    print("=" * 50)
    
    # Connect to MongoDB
    mongo_uri = os.getenv('MONGO_URI')
    db_name = os.getenv('MONGO_DB_NAME', 'pepper')
    
    if not mongo_uri:
        print("❌ No MONGO_URI found in environment")
        return
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # Get all surveys
    surveys = list(db.surveys.find({}))
    print(f"📊 Found {len(surveys)} surveys to check")
    
    fixed_count = 0
    
    for survey in surveys:
        survey_id = survey.get('_id')
        current_link = survey.get('shareable_link', '')
        creator_email = survey.get('creator_email', '')
        
        print(f"\n📋 Survey: {survey_id}")
        print(f"   Current link: {current_link}")
        print(f"   Creator: {creator_email}")
        
        # Check if already has user_id
        if 'user_id=' in current_link and 'user_id=0' not in current_link:
            print(f"   ✅ Already has user_id")
            continue
        
        # Find creator and get simpleUserId
        if creator_email:
            creator = db.users.find_one({'email': creator_email})
            if creator:
                simple_user_id = creator.get('simpleUserId')
                if simple_user_id:
                    # Determine base URL
                    if 'localhost' in current_link:
                        base_url = "http://localhost:5173"
                    else:
                        base_url = "https://theinterwebsite.space"
                    
                    # Generate new URLs
                    new_shareable = f"{base_url}/survey?offer_id={survey_id}&user_id={simple_user_id}"
                    new_public = f"{base_url}/survey?offer_id={survey_id}&user_id={simple_user_id}"
                    
                    # Update survey
                    result = db.surveys.update_one(
                        {'_id': survey_id},
                        {
                            '$set': {
                                'shareable_link': new_shareable,
                                'public_link': new_public,
                                'simple_user_id': simple_user_id
                            }
                        }
                    )
                    
                    if result.modified_count > 0:
                        print(f"   ✅ FIXED: {new_shareable}")
                        fixed_count += 1
                    else:
                        print(f"   ⚠️ Update failed")
                else:
                    print(f"   ❌ Creator has no simpleUserId")
            else:
                print(f"   ❌ Creator not found in database")
        else:
            print(f"   ❌ No creator email")
    
    print(f"\n🎉 SUMMARY: Fixed {fixed_count} surveys!")
    
    # Show some examples
    print(f"\n📋 Recent surveys after fix:")
    recent = list(db.surveys.find({}).sort('created_at', -1).limit(5))
    for survey in recent:
        print(f"   {survey.get('_id')}: {survey.get('shareable_link')}")

if __name__ == "__main__":
    fix_all_surveys()
