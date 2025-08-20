"""
PepperAds Integration Module
Handles PepperAds offer redirects with click ID preservation and tracking
"""

from datetime import datetime, timezone
from mongodb_config import db
from typing import Dict, Optional
import urllib.parse
from pass_fail_schema import get_system_config

class PepperAdsIntegration:
    """Handle PepperAds offer redirects and tracking"""
    
    def __init__(self):
        self.db = db
    
    def build_redirect_url(
        self, 
        offer_id: str, 
        user_info: Dict, 
        session_data: Dict = None
    ) -> Optional[Dict]:
        """
        Build PepperAds redirect URL with all required parameters
        
        Args:
            offer_id: PepperAds offer ID to use
            user_info: User information (username, email, click_id, etc.)
            session_data: Additional session data
            
        Returns:
            Dictionary with redirect URL and metadata
        """
        try:
            # Get offer configuration
            offer = self.get_offer_config(offer_id)
            if not offer:
                print(f"❌ PepperAds offer not found: {offer_id}")
                return None
            
            if not offer.get("is_active", False):
                print(f"❌ PepperAds offer is inactive: {offer_id}")
                return None
            
            print(f"✅ Using PepperAds offer: {offer['offer_name']}")
            
            # Start building URL
            base_url = offer["base_url"]
            params = {}
            
            # Add required parameters
            required_params = offer.get("parameters", {}).get("required_params", [])
            parameter_mapping = offer.get("parameters", {}).get("parameter_mapping", {})
            
            for param in required_params:
                # Get the value using parameter mapping
                source_field = parameter_mapping.get(param, param)
                value = self._get_parameter_value(source_field, user_info, session_data)
                
                if value:
                    params[param] = value
                else:
                    print(f"⚠️ Required parameter missing: {param} (mapped from {source_field})")
                    # For required params, we might want to use defaults
                    if param == "user_id" and user_info.get("username"):
                        params[param] = user_info["username"]
                    elif param == "click_id":
                        # This is critical - if no click_id, we can't properly track
                        if not user_info.get("click_id"):
                            print("❌ Click ID is required but missing")
                            return None
                        params[param] = user_info["click_id"]
            
            # Add optional parameters if available
            optional_params = offer.get("parameters", {}).get("optional_params", [])
            for param in optional_params:
                source_field = parameter_mapping.get(param, param)
                value = self._get_parameter_value(source_field, user_info, session_data)
                
                if value:
                    params[param] = value
            
            # Add system tracking parameters
            if session_data and session_data.get("session_id"):
                params["session_id"] = session_data["session_id"]
            
            # Add timestamp
            params["timestamp"] = str(int(datetime.now(timezone.utc).timestamp()))
            
            # Build final URL
            if params:
                url_params = urllib.parse.urlencode(params)
                final_url = f"{base_url}?{url_params}"
            else:
                final_url = base_url
            
            redirect_info = {
                "redirect_url": final_url,
                "offer_id": offer_id,
                "offer_name": offer["offer_name"],
                "parameters_used": params,
                "base_url": base_url,
                "tracking": {
                    "track_conversions": offer.get("tracking", {}).get("track_conversions", True),
                    "conversion_value": offer.get("tracking", {}).get("conversion_value", 1.0),
                    "currency": offer.get("tracking", {}).get("currency", "USD")
                }
            }
            
            print(f"🔗 PepperAds URL built: {final_url}")
            print(f"📊 Parameters used: {list(params.keys())}")
            
            return redirect_info
            
        except Exception as e:
            print(f"❌ Error building PepperAds URL: {e}")
            return None
    
    def get_offer_config(self, offer_id: str) -> Optional[Dict]:
        """Get PepperAds offer configuration"""
        try:
            offer = self.db.pepperads_offers.find_one({
                "_id": offer_id,
                "is_active": True
            })
            return offer
        except Exception as e:
            print(f"❌ Error getting offer config: {e}")
            return None
    
    def _get_parameter_value(
        self, 
        param_name: str, 
        user_info: Dict, 
        session_data: Dict = None
    ) -> Optional[str]:
        """Get parameter value from available data sources"""
        
        # Check user_info first
        if param_name in user_info and user_info[param_name]:
            return str(user_info[param_name])
        
        # Check nested user_info fields
        if "." in param_name:
            parts = param_name.split(".")
            value = user_info
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    value = None
                    break
            if value:
                return str(value)
        
        # Check session_data if available
        if session_data:
            if param_name in session_data and session_data[param_name]:
                return str(session_data[param_name])
            
            # Check nested session fields
            if "." in param_name:
                parts = param_name.split(".")
                value = session_data
                for part in parts:
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    else:
                        value = None
                        break
                if value:
                    return str(value)
        
        return None
    
    def track_redirect(
        self, 
        session_id: str, 
        redirect_info: Dict
    ) -> bool:
        """Track PepperAds redirect attempt"""
        try:
            tracking_data = {
                "session_id": session_id,
                "offer_id": redirect_info.get("offer_id"),
                "offer_name": redirect_info.get("offer_name"),
                "redirect_url": redirect_info.get("redirect_url"),
                "parameters_used": redirect_info.get("parameters_used", {}),
                "redirected_at": datetime.now(timezone.utc),
                "tracking_info": redirect_info.get("tracking", {})
            }
            
            # Save redirect tracking
            self.db.pepperads_redirects.insert_one(tracking_data)
            
            print(f"📝 PepperAds redirect tracked for session: {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking PepperAds redirect: {e}")
            return False
    
    def check_global_merge_enabled(self) -> bool:
        """Check if global merge/redirect is enabled"""
        try:
            system_config = get_system_config()
            return system_config.get("merge_enabled_globally", True)
        except Exception as e:
            print(f"❌ Error checking global merge status: {e}")
            return False
    
    def check_survey_redirect_enabled(self, survey_id: str) -> bool:
        """Check if redirect is enabled for specific survey"""
        try:
            survey_config = self.db.survey_configurations.find_one({"survey_id": survey_id})
            if survey_config:
                return survey_config.get("pepperads_redirect_enabled", False)
            return False
        except Exception as e:
            print(f"❌ Error checking survey redirect status: {e}")
            return False
    
    def should_redirect_user(
        self, 
        survey_id: str, 
        evaluation_result: Dict
    ) -> Dict:
        """
        Determine if user should be redirected based on all conditions
        
        Returns:
            Dictionary with decision and reasoning
        """
        try:
            # Check if user passed evaluation
            if evaluation_result.get("status") != "pass":
                return {
                    "should_redirect": False,
                    "reason": "User failed evaluation criteria",
                    "redirect_type": "fail_page"
                }
            
            # Check global merge setting
            if not self.check_global_merge_enabled():
                return {
                    "should_redirect": False,
                    "reason": "Global merge is disabled",
                    "redirect_type": "thankyou_page"
                }
            
            # Check survey-specific setting
            if not self.check_survey_redirect_enabled(survey_id):
                return {
                    "should_redirect": False,
                    "reason": "Survey redirect is disabled",
                    "redirect_type": "thankyou_page"
                }
            
            return {
                "should_redirect": True,
                "reason": "All conditions met for PepperAds redirect",
                "redirect_type": "pepperads"
            }
            
        except Exception as e:
            print(f"❌ Error determining redirect decision: {e}")
            return {
                "should_redirect": False,
                "reason": f"Error: {str(e)}",
                "redirect_type": "error_page"
            }

def build_pepperads_url(
    survey_id: str, 
    user_info: Dict, 
    session_data: Dict = None
) -> Optional[Dict]:
    """
    Convenience function to build PepperAds URL for a survey
    
    Args:
        survey_id: Survey ID to get configuration for
        user_info: User information
        session_data: Session data
        
    Returns:
        Redirect information dictionary
    """
    try:
        # Get survey configuration
        integration = PepperAdsIntegration()
        survey_config = integration.db.survey_configurations.find_one({"survey_id": survey_id})
        
        if not survey_config:
            print(f"❌ No configuration found for survey: {survey_id}")
            return None
        
        offer_id = survey_config.get("pepperads_offer_id")
        if not offer_id:
            print(f"❌ No PepperAds offer configured for survey: {survey_id}")
            return None
        
        return integration.build_redirect_url(offer_id, user_info, session_data)
        
    except Exception as e:
        print(f"❌ Error building PepperAds URL: {e}")
        return None

def get_redirect_decision(survey_id: str, evaluation_result: Dict) -> Dict:
    """Get redirect decision for a survey completion"""
    integration = PepperAdsIntegration()
    return integration.should_redirect_user(survey_id, evaluation_result)

def get_fail_page_config(survey_id: str) -> Dict:
    """Get fail page configuration for a survey"""
    try:
        db_connection = db
        survey_config = db_connection.survey_configurations.find_one({"survey_id": survey_id})
        
        if survey_config and "fail_page_config" in survey_config:
            return survey_config["fail_page_config"]
        
        # Return default fail page config
        system_config = get_system_config()
        return {
            "fail_page_url": system_config.get("global_fail_page_url", "/survey-thankyou"),
            "custom_message": "Thank you for your time!",
            "show_retry_option": False
        }
        
    except Exception as e:
        print(f"❌ Error getting fail page config: {e}")
        return {
            "fail_page_url": "/survey-thankyou",
            "custom_message": "Thank you for your time!",
            "show_retry_option": False
        }

def test_pepperads_integration():
    """Test PepperAds integration"""
    print("\n🧪 Testing PepperAds Integration...")
    
    # Test with sample data
    user_info = {
        "username": "test_user",
        "email": "test@example.com",
        "click_id": "test_click_123",
        "ip_address": "127.0.0.1"
    }
    
    session_data = {
        "session_id": "test_session_456",
        "survey_id": "test_survey"
    }
    
    # Test building URL
    integration = PepperAdsIntegration()
    redirect_info = integration.build_redirect_url("default_pepperads_offer", user_info, session_data)
    
    if redirect_info:
        print(f"✅ Redirect URL built successfully")
        print(f"🔗 URL: {redirect_info['redirect_url']}")
        print(f"📊 Parameters: {redirect_info['parameters_used']}")
    else:
        print("❌ Failed to build redirect URL")
    
    # Test redirect decision
    evaluation_result = {"status": "pass", "score": 100}
    decision = get_redirect_decision("test_survey", evaluation_result)
    print(f"📋 Redirect decision: {decision}")
    
    return redirect_info

if __name__ == "__main__":
    test_pepperads_integration()
