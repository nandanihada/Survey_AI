#!/usr/bin/env python3
"""
Debug script for pass/fail functionality
Run this to check your survey configuration and test the evaluation logic
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from evaluation_engine import evaluate_responses, check_survey_has_evaluation_enabled
from pepperads_integration import get_redirect_decision, build_pepperads_url
from enhanced_survey_handler import EnhancedSurveyHandler
import json
from bson import ObjectId

def debug_survey_config(survey_id):
    """Debug survey configuration"""
    print(f"\n{'='*60}")
    print(f"🔍 DEBUGGING SURVEY: {survey_id}")
    print(f"{'='*60}")
    
    # 1. Check if survey exists
    survey = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
    if not survey:
        print(f"❌ Survey not found: {survey_id}")
        return False
    
    print(f"✅ Survey found: {survey.get('prompt', 'No title')[:50]}...")
    print(f"📝 Questions: {len(survey.get('questions', []))}")
    
    # 2. Check survey configuration
    config = db.survey_configurations.find_one({"survey_id": survey_id})
    if not config:
        print(f"❌ No survey configuration found")
        print(f"💡 You need to configure pass/fail settings for this survey")
        return False
    
    print(f"✅ Survey configuration found:")
    print(f"   - Pass/Fail Enabled: {config.get('pass_fail_enabled', False)}")
    print(f"   - PepperAds Redirect Enabled: {config.get('pepperads_redirect_enabled', False)}")
    print(f"   - Criteria Set ID: {config.get('criteria_set_id', 'None')}")
    print(f"   - PepperAds Offer ID: {config.get('pepperads_offer_id', 'None')}")
    
    # 3. Check criteria set
    criteria_set_id = config.get('criteria_set_id')
    if criteria_set_id:
        criteria = db.pass_fail_criteria.find_one({"_id": criteria_set_id})
        if criteria:
            print(f"✅ Criteria set found: {criteria['name']}")
            print(f"   - Logic Type: {criteria.get('logic_type', 'all_required')}")
            print(f"   - Criteria Count: {len(criteria.get('criteria', []))}")
            print(f"   - Active: {criteria.get('is_active', False)}")
            
            # Show criteria details
            for i, criterion in enumerate(criteria.get('criteria', []), 1):
                print(f"   - Criterion {i}: Q{criterion['question_id']} {criterion['condition']} '{criterion['expected_value']}'")
        else:
            print(f"❌ Criteria set not found: {criteria_set_id}")
    else:
        print(f"⚠️ No criteria set configured")
    
    # 4. Check PepperAds offer
    offer_id = config.get('pepperads_offer_id')
    if offer_id:
        offer = db.pepperads_offers.find_one({"_id": offer_id})
        if offer:
            print(f"✅ PepperAds offer found: {offer['offer_name']}")
            print(f"   - Base URL: {offer['base_url']}")
            print(f"   - Active: {offer.get('is_active', False)}")
        else:
            print(f"❌ PepperAds offer not found: {offer_id}")
    else:
        print(f"⚠️ No PepperAds offer configured")
    
    return True

def test_evaluation(survey_id, test_responses):
    """Test evaluation with sample responses"""
    print(f"\n{'='*60}")
    print(f"🧪 TESTING EVALUATION")
    print(f"{'='*60}")
    
    print(f"📝 Test responses: {test_responses}")
    
    # Run evaluation
    result = evaluate_responses(survey_id, test_responses)
    
    print(f"📊 Evaluation Result:")
    print(f"   - Status: {result['status']}")
    print(f"   - Score: {result.get('score', 0)}%")
    print(f"   - Message: {result.get('message', 'No message')}")
    print(f"   - Criteria Met: {result.get('criteria_met', [])}")
    print(f"   - Criteria Failed: {result.get('criteria_failed', [])}")
    
    return result

def test_redirect_decision(survey_id, evaluation_result):
    """Test redirect decision logic"""
    print(f"\n{'='*60}")
    print(f"🔄 TESTING REDIRECT DECISION")
    print(f"{'='*60}")
    
    decision = get_redirect_decision(survey_id, evaluation_result)
    
    print(f"🎯 Redirect Decision:")
    print(f"   - Should Redirect: {decision['should_redirect']}")
    print(f"   - Reason: {decision['reason']}")
    print(f"   - Redirect Type: {decision['redirect_type']}")
    
    return decision

def test_pepperads_url(survey_id):
    """Test PepperAds URL building"""
    print(f"\n{'='*60}")
    print(f"🔗 TESTING PEPPERADS URL BUILDING")
    print(f"{'='*60}")
    
    test_user_info = {
        "username": "test_user",
        "email": "test@example.com",
        "click_id": "test_click_123",
        "ip_address": "127.0.0.1"
    }
    
    test_session_data = {
        "session_id": "test_session_456"
    }
    
    redirect_info = build_pepperads_url(survey_id, test_user_info, test_session_data)
    
    if redirect_info:
        print(f"✅ PepperAds URL built successfully:")
        print(f"   - URL: {redirect_info['redirect_url']}")
        print(f"   - Offer: {redirect_info['offer_name']}")
        print(f"   - Parameters: {list(redirect_info['parameters_used'].keys())}")
    else:
        print(f"❌ Failed to build PepperAds URL")
    
    return redirect_info

def test_full_flow(survey_id, test_responses):
    """Test the complete flow"""
    print(f"\n{'='*60}")
    print(f"🚀 TESTING COMPLETE FLOW")
    print(f"{'='*60}")
    
    handler = EnhancedSurveyHandler()
    
    test_request_data = {
        "responses": test_responses,
        "username": "test_user",
        "email": "test@example.com"
    }
    
    try:
        result = handler.handle_survey_submission(survey_id, test_request_data)
        
        print(f"✅ Full flow completed successfully:")
        print(f"   - Response ID: {result.get('response_id', 'N/A')}")
        print(f"   - Evaluation Status: {result.get('evaluation', {}).get('status', 'N/A')}")
        print(f"   - Should Redirect: {result.get('redirect', {}).get('should_redirect', False)}")
        print(f"   - Redirect URL: {result.get('redirect', {}).get('redirect_url', 'N/A')}")
        
        return result
        
    except Exception as e:
        print(f"❌ Full flow failed: {e}")
        return None

def create_sample_config(survey_id):
    """Create sample configuration for testing"""
    print(f"\n{'='*60}")
    print(f"🛠️ CREATING SAMPLE CONFIGURATION")
    print(f"{'='*60}")
    
    # Create sample criteria
    criteria_id = "sample_criteria_" + survey_id
    criteria_data = {
        "_id": criteria_id,
        "name": "Sample Test Criteria",
        "description": "Auto-generated test criteria",
        "criteria": [
            {
                "id": "test_criterion_1",
                "question_id": "q1",
                "condition": "equals",
                "expected_value": "Yes",
                "required": True,
                "weight": 1.0,
                "description": "Must answer Yes to first question"
            }
        ],
        "logic_type": "all_required",
        "passing_threshold": 50.0,
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    # Create sample PepperAds offer
    offer_id = "sample_offer_" + survey_id
    offer_data = {
        "_id": offer_id,
        "offer_name": "Sample Test Offer",
        "base_url": "https://example.com/redirect",
        "parameters": {
            "required_params": ["click_id"],
            "optional_params": ["user_id", "email"],
            "parameter_mapping": {
                "click_id": "click_id",
                "user_id": "username",
                "email": "email"
            }
        },
        "tracking": {
            "track_conversions": True,
            "conversion_value": 1.0,
            "currency": "USD"
        },
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    # Create survey configuration
    config_data = {
        "survey_id": survey_id,
        "pass_fail_enabled": True,
        "pepperads_redirect_enabled": True,
        "criteria_set_id": criteria_id,
        "pepperads_offer_id": offer_id,
        "fail_page_config": {
            "fail_page_url": "/survey-thankyou",
            "custom_message": "Thank you for your time!",
            "show_retry_option": False
        },
        "pass_page_config": {
            "redirect_delay_seconds": 3,
            "show_countdown": True,
            "custom_message": "Congratulations! You qualify. Redirecting..."
        },
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    try:
        # Insert or update documents
        db.pass_fail_criteria.replace_one({"_id": criteria_id}, criteria_data, upsert=True)
        db.pepperads_offers.replace_one({"_id": offer_id}, offer_data, upsert=True)
        db.survey_configurations.replace_one({"survey_id": survey_id}, config_data, upsert=True)
        
        print(f"✅ Sample configuration created successfully")
        print(f"   - Criteria ID: {criteria_id}")
        print(f"   - Offer ID: {offer_id}")
        print(f"   - Configuration saved for survey: {survey_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create sample configuration: {e}")
        return False

def main():
    """Main debug function"""
    print("🔍 Survey Pass/Fail Debug Tool")
    print("=" * 60)
    
    # Get survey ID from user
    survey_id = input("Enter Survey ID to debug: ").strip()
    if not survey_id:
        print("❌ Survey ID is required")
        return
    
    # Check if survey exists
    if not debug_survey_config(survey_id):
        create_config = input("\n❓ Would you like to create sample configuration? (y/n): ").strip().lower()
        if create_config == 'y':
            if create_sample_config(survey_id):
                print("\n✅ Sample configuration created. Re-running debug...")
                debug_survey_config(survey_id)
            else:
                return
        else:
            return
    
    # Get test responses
    print(f"\n📝 Enter test responses (JSON format):")
    print(f"Example: {{\"q1\": \"Yes\", \"q2\": \"25\"}}")
    
    try:
        responses_input = input("Test responses: ").strip()
        if responses_input:
            test_responses = json.loads(responses_input)
        else:
            # Default test responses
            test_responses = {"q1": "Yes", "q2": "25"}
            print(f"Using default responses: {test_responses}")
    except json.JSONDecodeError:
        print("❌ Invalid JSON format, using default responses")
        test_responses = {"q1": "Yes", "q2": "25"}
    
    # Run tests
    evaluation_result = test_evaluation(survey_id, test_responses)
    redirect_decision = test_redirect_decision(survey_id, evaluation_result)
    
    if redirect_decision['should_redirect']:
        pepperads_info = test_pepperads_url(survey_id)
    
    # Test full flow
    full_result = test_full_flow(survey_id, test_responses)
    
    print(f"\n{'='*60}")
    print(f"🎯 SUMMARY")
    print(f"{'='*60}")
    print(f"Survey ID: {survey_id}")
    print(f"Evaluation Status: {evaluation_result['status']}")
    print(f"Should Redirect: {redirect_decision['should_redirect']}")
    print(f"Full Flow: {'✅ Success' if full_result else '❌ Failed'}")
    
    if full_result and full_result.get('redirect', {}).get('should_redirect'):
        print(f"🚀 Redirect URL: {full_result['redirect']['redirect_url']}")
    
    print(f"\n💡 If redirection is not working:")
    print(f"   1. Check browser console for errors")
    print(f"   2. Verify PepperAds offer URL is accessible")
    print(f"   3. Ensure click_id parameter is provided")
    print(f"   4. Check survey configuration settings")

if __name__ == "__main__":
    main()
