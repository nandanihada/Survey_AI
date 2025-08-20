#!/usr/bin/env python3
"""
Quick test script to check survey pass/fail configuration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from evaluation_engine import evaluate_responses, check_survey_has_evaluation_enabled
from pepperads_integration import get_redirect_decision, build_pepperads_url
import json

def quick_test():
    """Quick test of pass/fail functionality"""
    
    # Get all surveys
    surveys = list(db.surveys.find().limit(5))
    print(f"📋 Found {len(surveys)} surveys:")
    
    for i, survey in enumerate(surveys):
        survey_id = survey.get('id', survey.get('_id', 'unknown'))
        title = survey.get('prompt', 'No title')[:50]
        print(f"   {i+1}. {survey_id} - {title}...")
    
    if not surveys:
        print("❌ No surveys found in database")
        return
    
    # Test with first survey
    test_survey = surveys[0]
    survey_id = test_survey.get('id', test_survey.get('_id'))
    
    print(f"\n🔍 Testing survey: {survey_id}")
    
    # Check configuration
    config = db.survey_configurations.find_one({"survey_id": survey_id})
    if not config:
        print(f"❌ No configuration found for survey {survey_id}")
        print(f"💡 Creating sample configuration...")
        
        # Create sample config
        sample_config = {
            "survey_id": survey_id,
            "pass_fail_enabled": True,
            "pepperads_redirect_enabled": True,
            "criteria_set_id": "test_criteria",
            "pepperads_offer_id": "test_offer",
            "fail_page_config": {
                "fail_page_url": "/survey-thankyou",
                "custom_message": "Thank you!",
                "show_retry_option": False
            }
        }
        
        # Create sample criteria
        sample_criteria = {
            "_id": "test_criteria",
            "name": "Test Criteria",
            "criteria": [
                {
                    "id": "test_criterion",
                    "question_id": "q1",
                    "condition": "equals",
                    "expected_value": "Yes",
                    "required": True,
                    "weight": 1.0
                }
            ],
            "logic_type": "all_required",
            "is_active": True
        }
        
        # Create sample offer
        sample_offer = {
            "_id": "test_offer",
            "offer_name": "Test Offer",
            "base_url": "https://example.com/redirect",
            "parameters": {
                "required_params": ["click_id"],
                "parameter_mapping": {"click_id": "click_id"}
            },
            "is_active": True
        }
        
        try:
            db.survey_configurations.insert_one(sample_config)
            db.pass_fail_criteria.insert_one(sample_criteria)
            db.pepperads_offers.insert_one(sample_offer)
            print("✅ Sample configuration created")
        except Exception as e:
            print(f"❌ Error creating config: {e}")
            return
    else:
        print(f"✅ Configuration found:")
        print(f"   - Pass/Fail: {config.get('pass_fail_enabled', False)}")
        print(f"   - Redirect: {config.get('pepperads_redirect_enabled', False)}")
    
    # Test evaluation
    test_responses = {"q1": "Yes", "q2": "25"}
    print(f"\n🧪 Testing with responses: {test_responses}")
    
    try:
        result = evaluate_responses(survey_id, test_responses)
        print(f"📊 Evaluation: {result['status']} (Score: {result.get('score', 0)}%)")
        
        # Test redirect decision
        decision = get_redirect_decision(survey_id, result)
        print(f"🔄 Redirect: {decision['should_redirect']} - {decision['reason']}")
        
        if decision['should_redirect']:
            # Test URL building
            user_info = {"username": "test", "email": "test@test.com", "click_id": "test123"}
            url_info = build_pepperads_url(survey_id, user_info, {"session_id": "test"})
            if url_info:
                print(f"🔗 Redirect URL: {url_info['redirect_url']}")
            else:
                print("❌ Failed to build redirect URL")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    quick_test()
