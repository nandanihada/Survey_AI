#!/usr/bin/env python3

from mongodb_config import db
from bson import ObjectId

def debug_user_id():
    """Debug user ID formats"""
    
    print("🔍 DEBUGGING USER ID FORMATS")
    print("="*50)
    
    # Get first user
    user = db.users.find_one({})
    if not user:
        print("❌ No users found")
        return
    
    user_id = user['_id']
    print(f"📋 User: {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
    print(f"   Raw _id: {user_id}")
    print(f"   Type: {type(user_id)}")
    print(f"   String: {str(user_id)}")
    print(f"   Is ObjectId valid: {ObjectId.is_valid(str(user_id))}")
    
    # Test lookups
    print(f"\n🔍 Testing lookups:")
    
    # 1. ObjectId lookup
    try:
        found = db.users.find_one({"_id": ObjectId(str(user_id))})
        print(f"   ObjectId lookup: {'✅ Found' if found else '❌ Not found'}")
    except Exception as e:
        print(f"   ObjectId lookup: ❌ Error: {e}")
    
    # 2. String lookup
    try:
        found = db.users.find_one({"_id": str(user_id)})
        print(f"   String lookup: {'✅ Found' if found else '❌ Not found'}")
    except Exception as e:
        print(f"   String lookup: ❌ Error: {e}")
    
    # 3. Direct lookup
    try:
        found = db.users.find_one({"_id": user_id})
        print(f"   Direct lookup: {'✅ Found' if found else '❌ Not found'}")
    except Exception as e:
        print(f"   Direct lookup: ❌ Error: {e}")
    
    print(f"\n💡 Recommended user_id for frontend: {str(user_id)}")

if __name__ == "__main__":
    debug_user_id()
