"""
Database migration script for adding authentication and user management
"""
import pymongo
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get MongoDB connection"""
    mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/dynamic_widget_system')
    client = MongoClient(mongodb_uri)
    db_name = mongodb_uri.split('/')[-1]
    return client[db_name]

def create_users_collection():
    """Create users collection with proper indexes"""
    db = get_db_connection()
    
    # Create users collection if it doesn't exist
    if 'users' not in db.list_collection_names():
        db.create_collection('users')
        print("Created 'users' collection")
    
    users_collection = db.users
    
    # Create indexes
    users_collection.create_index("uid", unique=True)
    users_collection.create_index("email", unique=True)
    users_collection.create_index("role")
    users_collection.create_index("created_at")
    
    print("Created indexes for users collection")

def add_owner_to_surveys():
    """Add owner_user_id field to existing surveys collection"""
    db = get_db_connection()
    
    if 'surveys' in db.list_collection_names():
        surveys_collection = db.surveys
        
        # Add owner_user_id field to existing surveys (set to null initially)
        result = surveys_collection.update_many(
            {"owner_user_id": {"$exists": False}},
            {"$set": {"owner_user_id": None}}
        )
        
        # Create index on owner_user_id
        surveys_collection.create_index("owner_user_id")
        
        print(f"Updated {result.modified_count} surveys with owner_user_id field")
        print("Created index on owner_user_id for surveys collection")
    else:
        print("Surveys collection doesn't exist yet")

def create_user_sessions_collection():
    """Create user sessions collection for session management"""
    db = get_db_connection()
    
    if 'user_sessions' not in db.list_collection_names():
        db.create_collection('user_sessions')
        print("Created 'user_sessions' collection")
    
    sessions_collection = db.user_sessions
    
    # Create indexes
    sessions_collection.create_index("session_id", unique=True)
    sessions_collection.create_index("user_id")
    sessions_collection.create_index("expires_at", expireAfterSeconds=0)  # TTL index
    
    print("Created indexes for user_sessions collection")

def run_migrations():
    """Run all database migrations"""
    print("Starting database migrations...")
    
    try:
        create_users_collection()
        add_owner_to_surveys()
        create_user_sessions_collection()
        
        print("All migrations completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_migrations()
