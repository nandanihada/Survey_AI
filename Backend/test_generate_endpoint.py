#!/usr/bin/env python3
"""
Test the /generate endpoint to see the exact error
"""
import traceback
import sys
import os
sys.path.append('.')

# Import the app components to test locally
from app import app
from flask import g
from auth_service import AuthService

def test_generate_endpoint():
    """Test the generate endpoint to see what's causing the 500 error"""
    print("🔍 Testing /generate endpoint")
    
    try:
        # Create a test request context
        with app.test_request_context():
            # Mock authentication
            auth_service = AuthService()
            db = auth_service.get_db_connection()
            
            # Get a test user
            test_user = db.users.find_one({'email': 'nandanihada2003@gmail.com'})
            if not test_user:
                print("❌ Test user not found")
                return
            
            # Set the current user in Flask's g object
            g.current_user = test_user
            
            print(f"✅ Test user: {test_user['email']}")
            print(f"   simpleUserId: {test_user.get('simpleUserId', 'MISSING')}")
            
            # Test the problematic code section
            print("\n🧪 Testing survey creation logic...")
            
            # Simulate the survey creation process
            current_user = g.current_user
            print(f"DEBUG: Current user data: {current_user}")
            print(f"DEBUG: simpleUserId: {current_user.get('simpleUserId', 'MISSING')}")
            
            simple_user_id = current_user.get('simpleUserId', 0)
            
            # Test the database fallback
            if simple_user_id == 0 or simple_user_id is None:
                print("WARNING: simpleUserId is 0 or None, fetching from database")
                user_from_db = db.users.find_one({'_id': current_user['_id']})
                if user_from_db:
                    simple_user_id = user_from_db.get('simpleUserId', 0)
                    print(f"DEBUG: Retrieved simpleUserId from DB: {simple_user_id}")
            
            # Test URL generation
            FRONTEND_URL = "http://localhost:5173"
            survey_id = "TEST123"
            
            shareable_link = f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}"
            print(f"✅ Generated link: {shareable_link}")
            
    except Exception as e:
        print(f"❌ Error in generate endpoint test: {e}")
        print("Full traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    test_generate_endpoint()
