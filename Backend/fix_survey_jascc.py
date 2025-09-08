#!/usr/bin/env python3
"""
Fix survey JASCC to include user_id parameter
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_survey_jascc():
    """Fix survey JASCC to include user_id"""
    print("🔧 FIXING SURVEY JASCC")
    print("=" * 30)
    
    # Connect to MongoDB
    mongo_uri = os.getenv('MONGO_URI')
    db_name = os.getenv('MONGO_DB_NAME', 'pepper')
    
    if not mongo_uri:
        print("❌ No MONGO_URI found in environment")
        return
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # Find survey JASCC
    survey = db.surveys.find_one({'_id': 'JASCC'})
    
    if not survey:
        print("❌ Survey JASCC not found")
        return
    
    print(f"📋 Found survey JASCC")
    print(f"   Current link: {survey.get('shareable_link', 'No link')}")
    print(f"   Creator: {survey.get('creator_email', 'No creator')}")
    
    # Get creator info
    creator_email = survey.get('creator_email')
    if not creator_email:
        print("❌ No creator email found")
        return
    
    creator = db.users.find_one({'email': creator_email})
    if not creator:
        print(f"❌ Creator {creator_email} not found")
        return
    
    simple_user_id = creator.get('simpleUserId')
    if not simple_user_id:
        print(f"❌ Creator has no simpleUserId")
        return
    
    print(f"👤 Creator simpleUserId: {simple_user_id}")
    
    # Generate new URL with user_id
    new_url = f"http://localhost:5173/survey?offer_id=JASCC&user_id={simple_user_id}"
    
    # Update survey
    result = db.surveys.update_one(
        {'_id': 'JASCC'},
        {
            '$set': {
                'shareable_link': new_url,
                'public_link': new_url,
                'simple_user_id': simple_user_id
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"✅ FIXED: {new_url}")
        print("🎉 Survey JASCC now includes user_id parameter!")
    else:
        print("⚠️ No changes made")

if __name__ == "__main__":
    fix_survey_jascc()
