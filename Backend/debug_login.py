#!/usr/bin/env python3

from mongodb_config import db
import json

def debug_login_issue():
    """Debug the login issue by checking database and login logic"""
    
    print("🔍 DEBUGGING LOGIN ISSUE")
    print("="*50)
    
    # Check if users collection exists and has data
    try:
        users_count = db.users.count_documents({})
        print(f"📊 Total users in database: {users_count}")
        
        if users_count > 0:
            print("\n👥 Users in database:")
            users = db.users.find({}, {"name": 1, "email": 1, "password": 1, "role": 1})
            for i, user in enumerate(users, 1):
                print(f"   {i}. Email: {user.get('email', 'N/A')}")
                print(f"      Name: {user.get('name', 'N/A')}")
                print(f"      Password: {user.get('password', 'N/A')[:10]}... (first 10 chars)")
                print(f"      Role: {user.get('role', 'N/A')}")
                print()
        
        # Test specific user lookup
        test_email = "hasirqa@gmail.com"
        print(f"🔍 Looking for user: {test_email}")
        user = db.users.find_one({"email": test_email})
        
        if user:
            print("✅ User found!")
            print(f"   ID: {user['_id']}")
            print(f"   Name: {user.get('name', 'N/A')}")
            print(f"   Email: {user.get('email', 'N/A')}")
            print(f"   Password: {user.get('password', 'N/A')}")
            print(f"   Role: {user.get('role', 'N/A')}")
            
            # Test password comparison
            test_passwords = ["password123", "123456", "password", "hasirqa"]
            print(f"\n🔐 Testing common passwords:")
            for pwd in test_passwords:
                if user.get('password') == pwd:
                    print(f"   ✅ Password '{pwd}' MATCHES!")
                else:
                    print(f"   ❌ Password '{pwd}' does not match")
        else:
            print("❌ User NOT found!")
            print("   This means the account wasn't created properly")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
    
    print(f"\n🔍 DEBUG COMPLETE")
    print("="*50)
    
    print("\n💡 Next steps:")
    print("   1. If user not found: Create account again")
    print("   2. If password doesn't match: Try the correct password")
    print("   3. If user exists: Check login API logic")

if __name__ == "__main__":
    debug_login_issue()
