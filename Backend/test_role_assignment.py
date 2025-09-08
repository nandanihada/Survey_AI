#!/usr/bin/env python3
"""
Test script for role-based access control system
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
from role_manager import RoleManager, UserRole, UserStatus

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get MongoDB connection"""
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    client = MongoClient(mongo_uri)
    db_name = os.getenv('MONGO_DB_NAME', 'survey_app')
    return client[db_name]

def test_role_assignment():
    """Test role assignment and feature access"""
    db = get_db_connection()
    users_collection = db.users
    
    print("🔧 Testing Role-Based Access Control System")
    print("=" * 50)
    
    # Find a test user (or create one)
    test_email = "test@example.com"
    test_user = users_collection.find_one({'email': test_email})
    
    if not test_user:
        print(f"❌ Test user {test_email} not found. Please create a test user first.")
        return
    
    print(f"✅ Found test user: {test_user['name']} ({test_user['email']})")
    print(f"📋 Current role: {test_user.get('role', 'basic')}")
    print(f"📊 Current status: {test_user.get('status', 'approved')}")
    
    # Test each role level
    roles_to_test = ['basic', 'premium', 'enterprise', 'admin']
    
    for role in roles_to_test:
        print(f"\n🧪 Testing {role.upper()} role access:")
        print("-" * 30)
        
        # Update user role
        users_collection.update_one(
            {'_id': test_user['_id']},
            {'$set': {'role': role, 'updatedAt': datetime.utcnow()}}
        )
        
        # Test feature access
        features = RoleManager.get_user_features(role)
        print(f"✅ Available features: {', '.join(features)}")
        
        # Test specific feature checks
        feature_tests = [
            ('create', 'Create Surveys'),
            ('survey', 'Survey Management'),
            ('analytics', 'Analytics & Reports'),
            ('postback', 'Postback Integration'),
            ('pass_fail', 'Pass/Fail Logic'),
            ('test_lab', 'Test Lab'),
            ('admin_panel', 'Admin Panel')
        ]
        
        for feature, description in feature_tests:
            has_access = RoleManager.has_feature_access(role, feature)
            status = "✅" if has_access else "❌"
            print(f"  {status} {description}")
    
    # Reset to original role
    original_role = test_user.get('role', 'basic')
    users_collection.update_one(
        {'_id': test_user['_id']},
        {'$set': {'role': original_role, 'updatedAt': datetime.utcnow()}}
    )
    
    print(f"\n🔄 Reset user role back to: {original_role}")
    print("\n✅ Role assignment test completed!")

def test_role_hierarchy():
    """Test role hierarchy and feature inheritance"""
    print("\n🏗️ Testing Role Hierarchy")
    print("=" * 30)
    
    hierarchy = RoleManager.get_role_hierarchy()
    
    for role, features in hierarchy.items():
        print(f"\n{role.upper()}:")
        for feature in features:
            print(f"  • {RoleManager.get_feature_display_name(feature)}")

def assign_role_to_user(email: str, new_role: str):
    """Assign a specific role to a user"""
    if not RoleManager.is_valid_role(new_role):
        print(f"❌ Invalid role: {new_role}")
        print(f"Valid roles: {', '.join(RoleManager.get_valid_roles())}")
        return
    
    db = get_db_connection()
    users_collection = db.users
    
    user = users_collection.find_one({'email': email})
    if not user:
        print(f"❌ User not found: {email}")
        return
    
    # Update user role
    result = users_collection.update_one(
        {'_id': user['_id']},
        {'$set': {'role': new_role, 'updatedAt': datetime.utcnow()}}
    )
    
    if result.modified_count > 0:
        print(f"✅ Successfully updated {user['name']} ({email}) to {new_role} role")
        
        # Show new features
        features = RoleManager.get_user_features(new_role)
        print(f"📋 Available features: {', '.join(features)}")
    else:
        print(f"❌ Failed to update user role")

def list_users_with_roles():
    """List all users with their current roles"""
    db = get_db_connection()
    users_collection = db.users
    
    print("\n👥 Current Users and Roles")
    print("=" * 40)
    
    users = list(users_collection.find().sort('createdAt', -1))
    
    for user in users:
        role = user.get('role', 'basic')
        status = user.get('status', 'approved')
        name = user.get('name', 'Unknown')
        email = user.get('email', 'Unknown')
        
        role_display = RoleManager.get_role_display_name(role)
        status_emoji = "✅" if status == "approved" else "❌" if status == "disapproved" else "🔒"
        
        print(f"{status_emoji} {name} ({email})")
        print(f"   Role: {role_display} | Status: {status}")
        
        features = RoleManager.get_user_features(role)
        print(f"   Features: {', '.join(features)}")
        print()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "test":
            test_role_assignment()
            test_role_hierarchy()
        elif command == "list":
            list_users_with_roles()
        elif command == "assign" and len(sys.argv) >= 4:
            email = sys.argv[2]
            role = sys.argv[3]
            assign_role_to_user(email, role)
        else:
            print("Usage:")
            print("  python test_role_assignment.py test          # Run full test")
            print("  python test_role_assignment.py list          # List all users")
            print("  python test_role_assignment.py assign <email> <role>  # Assign role")
            print("\nValid roles: basic, premium, enterprise, admin")
    else:
        test_role_assignment()
        test_role_hierarchy()
        list_users_with_roles()
