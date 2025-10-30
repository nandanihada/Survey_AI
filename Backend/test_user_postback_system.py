#!/usr/bin/env python3

"""
Test the User-Based Postback System
Demonstrates how postbacks are sent to survey creators
"""

import requests
import json
from datetime import datetime
from mongodb_config import db
from user_postback_sender import send_postback_to_survey_creator

def test_user_postback_system():
    """Test the complete user-based postback flow"""
    
    print("🧪 TESTING USER-BASED POSTBACK SYSTEM")
    print("="*60)
    
    # Step 1: Find a user with postback URL configured
    print("\n📋 STEP 1: Finding users with postback URLs")
    users_with_postback = list(db.users.find({
        "postbackUrl": {"$exists": True, "$ne": ""}
    }).limit(3))
    
    if not users_with_postback:
        print("❌ No users found with postback URLs configured")
        print("💡 Create an account at /signup with a postback URL first")
        return
    
    print(f"✅ Found {len(users_with_postback)} users with postback URLs:")
    for i, user in enumerate(users_with_postback, 1):
        print(f"   {i}. {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
        print(f"      Postback URL: {user.get('postbackUrl', 'None')}")
        print(f"      Parameter mappings: {user.get('parameterMappings', {})}")
    
    # Step 2: Find surveys created by these users
    print(f"\n📋 STEP 2: Finding surveys created by these users")
    test_user = users_with_postback[0]
    user_id = str(test_user['_id'])
    
    surveys = list(db.surveys.find({
        "$or": [
            {"ownerUserId": user_id},
            {"creator_email": test_user.get('email', '')}
        ]
    }).limit(3))
    
    if not surveys:
        print(f"❌ No surveys found for user {test_user.get('name', 'Unknown')}")
        print("💡 Create a survey first, then test the postback")
        return
    
    print(f"✅ Found {len(surveys)} surveys for {test_user.get('name', 'Unknown')}:")
    for i, survey in enumerate(surveys, 1):
        survey_id = survey.get('_id') or survey.get('id')
        prompt = survey.get('prompt', 'No prompt')[:50] + '...'
        print(f"   {i}. Survey {survey_id}: {prompt}")
    
    # Step 3: Simulate survey completion and test postback
    print(f"\n📋 STEP 3: Simulating survey completion")
    test_survey = surveys[0]
    survey_id = test_survey.get('_id') or test_survey.get('id')
    
    # Create mock survey completion data
    mock_completion_data = {
        "response_id": "test_response_123",
        "transaction_id": "test_txn_456",
        "survey_id": str(survey_id),
        "email": "test.user@example.com",
        "username": "testuser",
        "responses": {
            "q1": "Yes",
            "q2": "Very satisfied",
            "q3": "Would recommend"
        },
        "status": "completed",
        "reward": "0.25",
        "currency": "USD",
        "session_id": "session_789",
        "click_id": "click_abc123",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 Test Browser",
        "submitted_at": datetime.utcnow().isoformat(),
        "user_id": "12345",
        "simple_user_id": "67890",
        "aff_sub": "affiliate_test",
        "sub1": "source_test",
        "sub2": "campaign_test"
    }
    
    print(f"🎯 Testing postback for survey: {survey_id}")
    print(f"👤 Survey creator: {test_user.get('name', 'Unknown')}")
    print(f"🔗 Creator's postback URL: {test_user.get('postbackUrl', 'None')}")
    
    # Step 4: Send the postback
    print(f"\n📋 STEP 4: Sending postback to survey creator")
    result = send_postback_to_survey_creator(str(survey_id), mock_completion_data)
    
    # Step 5: Display results
    print(f"\n📊 POSTBACK RESULTS:")
    print(f"Success: {result.get('success', False)}")
    if result.get('success'):
        print(f"✅ Postback sent successfully!")
        print(f"   Creator: {result.get('creator_name', 'Unknown')}")
        print(f"   URL: {result.get('url', 'N/A')}")
        print(f"   Status Code: {result.get('status_code', 'N/A')}")
        print(f"   Response: {result.get('response_text', 'N/A')[:100]}...")
    else:
        print(f"❌ Postback failed!")
        print(f"   Error: {result.get('error', 'Unknown error')}")
    
    # Step 6: Check postback logs
    print(f"\n📋 STEP 5: Checking postback logs")
    recent_logs = list(db.user_postback_logs.find({
        "survey_id": str(survey_id)
    }).sort("timestamp", -1).limit(3))
    
    if recent_logs:
        print(f"✅ Found {len(recent_logs)} recent postback logs:")
        for i, log in enumerate(recent_logs, 1):
            status = "✅" if log.get('status') == 'success' else "❌"
            print(f"   {i}. {status} {log.get('creator_name', 'Unknown')} - {log.get('status_code', 'N/A')} - {log.get('timestamp', 'N/A')}")
    else:
        print("ℹ️ No postback logs found")
    
    print(f"\n🎯 USER-BASED POSTBACK TEST COMPLETE")
    print("="*60)

def demonstrate_postback_flow():
    """Demonstrate how the postback system works"""
    
    print("\n🎓 HOW USER-BASED POSTBACKS WORK:")
    print("="*50)
    
    print("1. 👤 USER SIGNS UP:")
    print("   - Provides postback URL: https://mysite.com/postback")
    print("   - Sets parameter mappings: transaction_id → txn_id, username → user")
    print()
    
    print("2. 📝 USER CREATES SURVEY:")
    print("   - Survey is linked to the user (ownerUserId)")
    print("   - Survey gets unique ID and shareable link")
    print()
    
    print("3. 🎯 SOMEONE COMPLETES SURVEY:")
    print("   - Response is saved to database")
    print("   - System finds survey creator")
    print("   - Gets creator's postback URL and mappings")
    print()
    
    print("4. 📤 POSTBACK IS SENT:")
    print("   - URL: https://mysite.com/postback?txn_id=response123&user=john&status=completed")
    print("   - Uses creator's custom parameter names")
    print("   - Includes all survey completion data")
    print()
    
    print("5. 📊 CREATOR RECEIVES DATA:")
    print("   - Gets notified of survey completion")
    print("   - Can track conversions and payouts")
    print("   - Data formatted according to their requirements")
    print()
    
    print("✨ BENEFITS:")
    print("   • Survey creators get postbacks for THEIR surveys")
    print("   • Custom parameter mapping per user")
    print("   • No need for complex partner integrations")
    print("   • Direct creator-to-completion tracking")
    print("="*50)

if __name__ == "__main__":
    demonstrate_postback_flow()
    test_user_postback_system()
