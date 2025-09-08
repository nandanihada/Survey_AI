#!/usr/bin/env python3
"""
Force fix the user_id issue by directly checking and fixing everything
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def force_fix_user_id():
    """Force fix user_id issue"""
    print("🔧 FORCE FIXING USER_ID ISSUE")
    print("=" * 40)
    
    # Connect to MongoDB directly
    mongo_uri = os.getenv('MONGO_URI')
    db_name = os.getenv('MONGO_DB_NAME', 'pepper')
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # 1. Check users have simpleUserId
    print("1. Checking users...")
    users = list(db.users.find({}, {'email': 1, 'simpleUserId': 1}))
    for user in users:
        simple_id = user.get('simpleUserId')
        print(f"   {user['email']}: {simple_id}")
        if not simple_id:
            print(f"   ❌ Missing simpleUserId for {user['email']}")
    
    # 2. Fix all surveys
    print("\n2. Fixing all surveys...")
    surveys = list(db.surveys.find({}))
    fixed = 0
    
    for survey in surveys:
        survey_id = survey.get('_id')
        current_link = survey.get('shareable_link', '')
        creator_email = survey.get('creator_email')
        
        print(f"\n   Survey {survey_id}:")
        print(f"   Current: {current_link}")
        print(f"   Creator: {creator_email}")
        
        if creator_email:
            creator = db.users.find_one({'email': creator_email})
            if creator:
                simple_user_id = creator.get('simpleUserId')
                if simple_user_id:
                    # Generate new URL
                    new_url = f"https://theinterwebsite.space/survey?offer_id={survey_id}&user_id={simple_user_id}"
                    
                    # Update survey
                    result = db.surveys.update_one(
                        {'_id': survey_id},
                        {
                            '$set': {
                                'shareable_link': new_url,
                                'public_link': new_url,
                                'simple_user_id': simple_user_id
                            }
                        }
                    )
                    
                    if result.modified_count > 0:
                        print(f"   ✅ Fixed: {new_url}")
                        fixed += 1
                    else:
                        print(f"   ⚠️  No changes made")
                else:
                    print(f"   ❌ Creator has no simpleUserId")
            else:
                print(f"   ❌ Creator not found")
        else:
            print(f"   ❌ No creator email")
    
    print(f"\n🎉 Fixed {fixed} surveys!")
    
    # 3. Show final results
    print("\n3. Final check - Recent surveys:")
    recent = list(db.surveys.find({}).sort('created_at', -1).limit(3))
    for survey in recent:
        print(f"   {survey.get('_id')}: {survey.get('shareable_link')}")

if __name__ == "__main__":
    force_fix_user_id()
