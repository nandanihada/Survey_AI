"""
Pass/Fail Survey System - Database Schema and Initialization
Enhanced tracking, evaluation, and merge control system
"""

from datetime import datetime
from pymongo import MongoClient
import uuid
import os
from mongodb_config import db

def create_database_indexes():
    """Create optimized indexes for the pass/fail system"""
    print("🔧 Creating database indexes...")
    
    # Survey configurations indexes
    try:
        db.survey_configurations.create_index("survey_id")
        db.survey_configurations.create_index([("pass_fail_enabled", 1), ("pepperads_redirect_enabled", 1)])
        
        # Survey sessions indexes for tracking
        db.survey_sessions.create_index("survey_id")
        db.survey_sessions.create_index("user_info.click_id")
        db.survey_sessions.create_index("step_tracking.timestamp")
        db.survey_sessions.create_index("evaluation_result.status")
        
        # Pass/fail criteria indexes
        db.pass_fail_criteria.create_index("is_active")
        db.pass_fail_criteria.create_index("name")
        
        # System configuration indexes
        db.system_config.create_index("config_key")
        
        # Enhanced responses indexes
        db.responses.create_index("session_id")
        db.responses.create_index([("survey_id", 1), ("evaluation_result.status", 1)])
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")

def initialize_system_configuration():
    """Initialize global system configuration"""
    print("🔧 Initializing system configuration...")
    
    try:
        # Check if system config already exists
        existing_config = db.system_config.find_one({"config_key": "global_merge_control"})
        
        if not existing_config:
            system_config = {
                "_id": str(uuid.uuid4()),
                "config_key": "global_merge_control",
                "config_value": {
                    "merge_enabled_globally": True,  # Global merge toggle
                    "default_pass_behavior": "pepperads_redirect",  # pepperads_redirect, thankyou_page
                    "default_fail_behavior": "thankyou_page",  # thankyou_page, custom_page
                    "global_fail_page_url": "/survey-thankyou",
                    "pepperads_enabled": True,
                    "postback_enabled": True
                },
                "description": "Global merge and redirect control settings",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            db.system_config.insert_one(system_config)
            print("✅ System configuration initialized")
        else:
            print("ℹ️ System configuration already exists")
            
    except Exception as e:
        print(f"❌ Error initializing system config: {e}")

def initialize_default_criteria():
    """Initialize default pass/fail criteria"""
    print("🔧 Initializing default criteria...")
    
    try:
        # Check if default criteria already exists
        existing_criteria = db.pass_fail_criteria.find_one({"name": "Default Business Survey Criteria"})
        
        if not existing_criteria:
            default_criteria = {
                "_id": str(uuid.uuid4()),
                "name": "Default Business Survey Criteria", 
                "description": "Standard criteria for business-related surveys",
                "criteria": [
                    {
                        "id": "business_interest",
                        "question_id": "q1",  # First question typically about business interest
                        "condition": "equals",
                        "expected_value": "Yes",
                        "required": True,
                        "weight": 1.0,
                        "description": "Must be interested in starting a business"
                    },
                    {
                        "id": "age_requirement", 
                        "question_id": "q2",  # Age-related question
                        "condition": "greater_than_or_equal",
                        "expected_value": 18,
                        "required": True,
                        "weight": 1.0,
                        "description": "Must be 18 or older"
                    }
                ],
                "logic_type": "all_required",  # all_required, threshold_based, weighted_score
                "passing_threshold": 2.0,  # For threshold-based logic
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            db.pass_fail_criteria.insert_one(default_criteria)
            print("✅ Default criteria initialized")
        else:
            print("ℹ️ Default criteria already exists")
            
    except Exception as e:
        print(f"❌ Error initializing criteria: {e}")

def initialize_default_pepperads_offer():
    """Initialize default PepperAds offer configuration"""
    print("🔧 Initializing PepperAds offer...")
    
    try:
        # Check if default offer already exists
        existing_offer = db.pepperads_offers.find_one({"offer_name": "Default PepperAds Offer"})
        
        if not existing_offer:
            default_offer = {
                "_id": "default_pepperads_offer",
                "offer_name": "Default PepperAds Offer",
                "description": "Standard PepperAds redirect offer",
                "base_url": "https://offers.pepperads.com/redirect",
                "parameters": {
                    "required_params": ["click_id", "user_id"],
                    "optional_params": ["email", "survey_id", "username"],
                    "parameter_mapping": {
                        "click_id": "click_id",
                        "user_id": "username", 
                        "email": "email",
                        "survey_id": "survey_id"
                    }
                },
                "tracking": {
                    "track_conversions": True,
                    "conversion_value": 1.0,
                    "currency": "USD"
                },
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            db.pepperads_offers.insert_one(default_offer)
            print("✅ PepperAds offer initialized")
        else:
            print("ℹ️ PepperAds offer already exists")
            
    except Exception as e:
        print(f"❌ Error initializing PepperAds offer: {e}")

def initialize_sample_survey_configuration():
    """Initialize a sample survey configuration for testing"""
    print("🔧 Creating sample survey configuration...")
    
    try:
        # Get a sample survey ID (use existing survey or create placeholder)
        sample_survey = db.surveys.find_one({}, {"_id": 1})
        
        if sample_survey:
            survey_id = sample_survey["_id"]
            
            # Check if configuration already exists
            existing_config = db.survey_configurations.find_one({"survey_id": survey_id})
            
            if not existing_config:
                sample_config = {
                    "_id": str(uuid.uuid4()),
                    "survey_id": survey_id,
                    "pass_fail_enabled": True,
                    "pepperads_redirect_enabled": True,
                    "criteria_set_id": None,  # Will use default criteria
                    "pepperads_offer_id": "default_pepperads_offer",
                    "fail_page_config": {
                        "fail_page_url": "/survey-thankyou?status=fail",
                        "custom_message": "Thank you for your time! Unfortunately, you don't qualify for this offer.",
                        "show_retry_option": False
                    },
                    "pass_page_config": {
                        "redirect_delay_seconds": 3,
                        "show_countdown": True,
                        "custom_message": "Congratulations! You qualify for our special offer. Redirecting..."
                    },
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                db.survey_configurations.insert_one(sample_config)
                print(f"✅ Sample configuration created for survey: {survey_id}")
            else:
                print(f"ℹ️ Configuration already exists for survey: {survey_id}")
        else:
            print("ℹ️ No existing surveys found, skipping sample configuration")
            
    except Exception as e:
        print(f"❌ Error creating sample configuration: {e}")

def upgrade_existing_partners():
    """Upgrade existing partners collection with pass/fail postback URLs"""
    print("🔧 Upgrading existing partners...")
    
    try:
        # Update all existing partners to include pass/fail postback configuration
        partners = db.partners.find({"status": "active"})
        
        for partner in partners:
            partner_id = partner["_id"]
            existing_url = partner.get("url", "")
            
            # Create pass/fail URLs based on existing URL
            if existing_url:
                # For pass: add status=pass parameter
                pass_url = existing_url
                if "?" in pass_url:
                    pass_url += "&status=pass&result=qualified"
                else:
                    pass_url += "?status=pass&result=qualified"
                
                # For fail: add status=fail parameter  
                fail_url = existing_url
                if "?" in fail_url:
                    fail_url += "&status=fail&result=not_qualified"
                else:
                    fail_url += "?status=fail&result=not_qualified"
                
                # Update partner with new configuration
                db.partners.update_one(
                    {"_id": partner_id},
                    {
                        "$set": {
                            "pass_postback_url": pass_url,
                            "fail_postback_url": fail_url,
                            "send_on_pass": True,
                            "send_on_fail": True,
                            "postback_config": {
                                "pass_params": {
                                    "status": "pass",
                                    "result": "qualified",
                                    "reward": "1.0",
                                    "currency": "USD"
                                },
                                "fail_params": {
                                    "status": "fail", 
                                    "result": "not_qualified",
                                    "reward": "0.0",
                                    "currency": "USD"
                                }
                            },
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                print(f"✅ Updated partner: {partner.get('name', partner_id)}")
        
        print("✅ All existing partners upgraded")
        
    except Exception as e:
        print(f"❌ Error upgrading partners: {e}")

def run_full_initialization():
    """Run complete database initialization"""
    print("\n" + "="*60)
    print("🚀 INITIALIZING PASS/FAIL SURVEY SYSTEM")
    print("="*60)
    
    try:
        # Step 1: Create indexes
        create_database_indexes()
        
        # Step 2: Initialize system configuration
        initialize_system_configuration()
        
        # Step 3: Initialize default criteria
        initialize_default_criteria()
        
        # Step 4: Initialize PepperAds offer
        initialize_default_pepperads_offer()
        
        # Step 5: Create sample survey configuration
        initialize_sample_survey_configuration()
        
        # Step 6: Upgrade existing partners
        upgrade_existing_partners()
        
        print("\n" + "="*60)
        print("✅ PASS/FAIL SYSTEM INITIALIZATION COMPLETE")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ INITIALIZATION FAILED: {e}")
        return False

# Helper function to get system configuration
def get_system_config():
    """Get current system configuration"""
    try:
        config_doc = db.system_config.find_one({"config_key": "global_merge_control"})
        if config_doc:
            return config_doc["config_value"]
        else:
            # Return default config if not found
            return {
                "merge_enabled_globally": True,
                "default_pass_behavior": "pepperads_redirect",
                "default_fail_behavior": "thankyou_page",
                "pepperads_enabled": True,
                "postback_enabled": True
            }
    except Exception as e:
        print(f"Error getting system config: {e}")
        return {}

# Helper function to update system configuration
def update_system_config(new_config):
    """Update system configuration"""
    try:
        db.system_config.update_one(
            {"config_key": "global_merge_control"},
            {
                "$set": {
                    "config_value": new_config,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return True
    except Exception as e:
        print(f"Error updating system config: {e}")
        return False

if __name__ == "__main__":
    # Run initialization if script is executed directly
    run_full_initialization()
