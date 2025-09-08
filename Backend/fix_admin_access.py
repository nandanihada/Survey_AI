#!/usr/bin/env python3
"""
Fix admin access by promoting a user to admin role
"""
import os
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/survey_db')
client = MongoClient(MONGODB_URI)
db = client.get_default_database()

def fix_admin_access():
    """Make the current user an admin"""
    print("=== Fixing Admin Access ===")
    
    # The user ID from the JWT token in the logs
    user_id = "68baca9b7c67efcef6e70d50"
    
    try:
        # Convert to ObjectId
        object_id = ObjectId(user_id)
        
        # Find the user
        user = db.users.find_one({'_id': object_id})
        if user:
            print(f"Found user: {user.get('email')} (Current role: {user.get('role')})")
            
            # Update to admin role
            result = db.users.update_one(
                {'_id': object_id},
                {'$set': {'role': 'admin', 'status': 'approved'}}
            )
            
            if result.modified_count > 0:
                print(f"✅ Successfully promoted {user.get('email')} to admin")
                print("🔄 User needs to log out and log back in to get new admin token")
            else:
                print("❌ Failed to update user role")
        else:
            print(f"❌ User with ID {user_id} not found")
            
            # Show all users for reference
            print("\nAll users in database:")
            users = list(db.users.find({}, {'email': 1, 'role': 1, 'status': 1}))
            for u in users:
                print(f"  - {u.get('email')} (ID: {u['_id']}, Role: {u.get('role', 'NO_ROLE')})")
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_admin_access()
