#!/usr/bin/env python3
"""
Setup script to create a test survey with Pass/Fail redirect configuration
"""

from pymongo import MongoClient
import json
from datetime import datetime

def setup_test_survey():
    # Connect to database
    client = MongoClient('mongodb://localhost:27017/')
    db = client.survey_ai
    
    # Create a test survey
    survey_id = "TEST_SURVEY_001"
    
    survey_data = {
        "_id": survey_id,
        "title": "Test Survey for Redirect",
        "description": "Test survey to verify Pass/Fail redirect functionality",
        "questions": [
            {
                "id": "q1",
                "question": "What is your age?",
                "type": "range",
                "min": 18,
                "max": 65,
                "required": True
            },
            {
                "id": "q2", 
                "question": "Are you interested in our product?",
                "type": "radio",
                "options": ["Yes", "No", "Maybe"],
                "required": True
            }
        ],
        "created_at": datetime.utcnow(),
        "status": "active",
        "owner_user_id": "test_user",
        "user_id": "test123"
    }
    
    # Insert survey
    result = db.surveys.update_one(
        {"_id": survey_id},
        {"$set": survey_data},
        upsert=True
    )
    print(f"✅ Survey created: {survey_id}")
    
    # Create Pass/Fail configuration
    pass_fail_config = {
        "survey_id": survey_id,
        "pass_fail_enabled": True,
        "pass_fail_config": {
            "criteria_sets": [
                {
                    "name": "Age Check",
                    "criteria": [
                        {
                            "question_id": "q1",
                            "operator": ">=",
                            "value": 21,
                            "weight": 1.0
                        }
                    ]
                },
                {
                    "name": "Interest Check", 
                    "criteria": [
                        {
                            "question_id": "q2",
                            "operator": "equals",
                            "value": "Yes",
                            "weight": 1.0
                        }
                    ]
                }
            ],
            "pass_threshold": 2.0,
            "evaluation_logic": "sum"
        }
    }
    
    # Create dynamic redirect configuration
    redirect_config = {
        "survey_id": survey_id,
        "dynamic_redirect_enabled": True,
        "dynamic_redirect_config": {
            "pass_redirect_url": "http://tracking.cpamerchant.com/aff_c?offer_id=6162&aff_id=33944&aff_sub={session_id}",
            "fail_redirect_url": "http://tracking.cpamerchant.com/aff_c?offer_id=6162&aff_id=33944&aff_sub={session_id}&status=fail",
            "delay_seconds": 3
        }
    }
    
    # Combine all configurations
    full_config = {**pass_fail_config, **redirect_config}
    
    # Insert configuration
    config_result = db.survey_configurations.update_one(
        {"survey_id": survey_id},
        {"$set": full_config},
        upsert=True
    )
    print(f"✅ Configuration created for survey: {survey_id}")
    
    # Create test user
    user_data = {
        "uid": "test_user_123",
        "email": "test@example.com",
        "username": "testuser",
        "simpleUserId": "test123",
        "role": "basic",
        "created_at": datetime.utcnow()
    }
    
    db.users.update_one(
        {"uid": "test_user_123"},
        {"$set": user_data},
        upsert=True
    )
    print("✅ Test user created")
    
    print(f"\n🎯 Test Survey URL:")
    print(f"http://localhost:5173/survey?offer_id={survey_id}&user_id=test123")
    
    print(f"\n📋 Expected redirect URLs:")
    print(f"Pass: http://tracking.cpamerchant.com/aff_c?offer_id=6162&aff_id=33944&aff_sub={{session_id}}")
    print(f"Fail: http://tracking.cpamerchant.com/aff_c?offer_id=6162&aff_id=33944&aff_sub={{session_id}}&status=fail")
    
    return survey_id

if __name__ == "__main__":
    setup_test_survey()
