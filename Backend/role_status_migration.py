"""
Database migration script for adding enhanced role and status fields
"""
import pymongo
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get MongoDB connection"""
    from mongodb_config import db
    return db

def migrate_user_roles_and_status():
    """Add new role hierarchy and status fields to users collection"""
    db = get_db_connection()
    users_collection = db.users
    
    print("Starting role and status migration...")
    
    # Update existing users with new role hierarchy and status
    # Convert existing 'user' role to 'basic', keep 'admin' as 'admin'
    
    # Update regular users to 'basic' role with 'approved' status
    result_basic = users_collection.update_many(
        {"role": "user"},
        {
            "$set": {
                "role": "basic",
                "status": "approved",
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Update admin users to keep 'admin' role but add 'approved' status
    result_admin = users_collection.update_many(
        {"role": "admin"},
        {
            "$set": {
                "status": "approved",
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Add status field to any users that don't have it (set to approved by default)
    result_status = users_collection.update_many(
        {"status": {"$exists": False}},
        {
            "$set": {
                "status": "approved",
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Create indexes for the new fields
    users_collection.create_index("status")
    users_collection.create_index([("role", 1), ("status", 1)])
    
    print(f"Updated {result_basic.modified_count} users from 'user' to 'basic' role")
    print(f"Updated {result_admin.modified_count} admin users with status field")
    print(f"Added status field to {result_status.modified_count} users")
    print("Created indexes for role and status fields")
    print("Migration completed successfully!")

def verify_migration():
    """Verify the migration was successful"""
    db = get_db_connection()
    users_collection = db.users
    
    print("\nVerifying migration...")
    
    # Count users by role
    basic_count = users_collection.count_documents({"role": "basic"})
    premium_count = users_collection.count_documents({"role": "premium"})
    enterprise_count = users_collection.count_documents({"role": "enterprise"})
    admin_count = users_collection.count_documents({"role": "admin"})
    
    # Count users by status
    approved_count = users_collection.count_documents({"status": "approved"})
    disapproved_count = users_collection.count_documents({"status": "disapproved"})
    locked_count = users_collection.count_documents({"status": "locked"})
    
    print(f"Users by role: basic={basic_count}, premium={premium_count}, enterprise={enterprise_count}, admin={admin_count}")
    print(f"Users by status: approved={approved_count}, disapproved={disapproved_count}, locked={locked_count}")
    
    # Check for any users without status field
    no_status = users_collection.count_documents({"status": {"$exists": False}})
    if no_status > 0:
        print(f"WARNING: {no_status} users still don't have status field!")
    else:
        print("✅ All users have status field")

if __name__ == "__main__":
    try:
        migrate_user_roles_and_status()
        verify_migration()
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise
