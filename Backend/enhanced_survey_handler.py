"""
Enhanced Survey Response Handler
Integrates pass/fail evaluation, session tracking, conditional postbacks, and PepperAds redirects
"""

from datetime import datetime, timezone
from flask import request, jsonify
from mongodb_config import db
import uuid

# Import our custom modules
from evaluation_engine import evaluate_responses, check_survey_has_evaluation_enabled
from session_tracking import SurveySessionTracker, start_survey_session, track_step
from pepperads_integration import (
    build_pepperads_url, 
    get_redirect_decision, 
    get_fail_page_config
)
from pass_fail_schema import get_system_config
from click_tracking_api import update_click_submission_status

class EnhancedSurveyHandler:
    """Enhanced handler for survey responses with complete pass/fail workflow"""
    
    def __init__(self):
        self.db = db
        self.session_tracker = SurveySessionTracker()
    
    def handle_survey_submission(
        self, 
        survey_id: str, 
        request_data: dict
    ) -> dict:
        """
        Complete survey submission handler with all features
        
        Args:
            survey_id: ID of the survey
            request_data: Complete request data from Flask
            
        Returns:
            Response dictionary with all results
        """
        print(f"\n{'='*60}")
        print(f"🚀 ENHANCED SURVEY SUBMISSION HANDLER")
        print(f"📋 Survey ID: {survey_id}")
        print(f"{'='*60}")
        
        try:
            # Step 1: Extract and validate request data
            responses = request_data.get("responses")
            username = request_data.get("username", "")
            email = request_data.get("email", "")
            session_id = request_data.get("session_id")  # If provided by frontend
            
            if not responses:
                return self._error_response("Responses are required", 400)
            
            print(f"📝 Responses received: {len(responses)} answers")
            print(f"👤 User: {username} ({email})")
            
            # Step 2: Verify survey exists
            survey = self.db.surveys.find_one({
                "$or": [{"_id": survey_id}, {"id": survey_id}]
            })
            
            if not survey:
                return self._error_response("Survey not found", 404)
            
            print(f"✅ Survey found: {survey.get('id', survey_id)}")
            
            # Step 3: Start or get session tracking
            # Extract click_id from POST body (sent by frontend) or URL params as fallback
            click_id = request_data.get("click_id") or request.args.get('click_id', '')
            
            user_info = {
                "username": username,
                "email": email,
                "ip_address": request.environ.get('REMOTE_ADDR', 'unknown'),
                "user_agent": request.headers.get('User-Agent', 'unknown'),
                "click_id": click_id,
            }
            
            if not session_id:
                # Start new session
                session_id = self.session_tracker.start_session(
                    survey_id, 
                    user_info,
                    {
                        "ip_address": user_info["ip_address"],
                        "user_agent": user_info["user_agent"],
                        "click_id": user_info["click_id"]
                    }
                )
            else:
                print(f"📋 Using existing session: {session_id}")
            
            # Step 4: Track survey completion
            track_step(session_id, "survey_completed", 
                      responses=responses, 
                      completion_info={"total_questions": len(responses)})
            
            # Step 5: Save response to database (traditional way)
            response_id = str(uuid.uuid4())
            response_data = {
                "_id": response_id,
                "id": response_id,
                "survey_id": survey_id,
                "session_id": session_id,
                "responses": responses,
                "user_info": user_info,
                "submitted_at": datetime.now(timezone.utc),
                "is_public": True,
                "status": "submitted"
            }
            
            # Step 6: Check if pass/fail evaluation is enabled
            evaluation_enabled = check_survey_has_evaluation_enabled(survey_id)
            evaluation_result = None
            
            if evaluation_enabled:
                print(f"🔍 Pass/fail evaluation is ENABLED for this survey")
                
                # Run evaluation
                evaluation_result = evaluate_responses(survey_id, responses)
                
                # Update response with evaluation
                response_data["evaluation_result"] = evaluation_result
                
                # Track evaluation
                track_step(session_id, "evaluation", evaluation_result=evaluation_result)
                
                print(f"📊 Evaluation result: {evaluation_result['status']} (Score: {evaluation_result.get('score', 0)}%)")
            else:
                print(f"ℹ️ Pass/fail evaluation is DISABLED for this survey")
                evaluation_result = {
                    "status": "pass",  # Default to pass if no evaluation
                    "score": 100,
                    "message": "Evaluation disabled - auto pass"
                }
                response_data["evaluation_result"] = evaluation_result
            
            # Step 7: Get click tracking data and enhance response
            click_data = self._get_click_tracking_data(survey_id, user_info)
            if click_data:
                response_data["click_tracking"] = {
                    "click_count": click_data.get("click_count", 1),
                    "first_click_time": click_data.get("first_click_time"),
                    "total_clicks": click_data.get("total_clicks", 1),
                    "click_record_id": click_data.get("click_record_id")
                }
                print(f"📊 Click data added: {click_data.get('click_count', 1)} clicks by {click_data.get('username', 'unknown')}")
            
            # Step 8: Save response to database
            try:
                self.db.responses.insert_one(response_data)
                print(f"💾 Response saved to database: {response_id}")
            except Exception as db_error:
                print(f"❌ Database error: {db_error}")
                return self._error_response(f"Database error: {str(db_error)}", 500)
            
            # Step 9: Update click tracking with submission status
            submission_data = {
                "response_id": response_id,
                "session_id": session_id,
                "evaluation_status": evaluation_result.get("status", "unknown"),
                "evaluation_score": evaluation_result.get("score", 0)
            }
            update_click_submission_status(survey_id, user_info, submission_data)
            
            # Step 10: Determine redirect action
            redirect_decision = get_redirect_decision(survey_id, evaluation_result)
            redirect_info = None
            
            print(f"🔄 Redirect decision: {redirect_decision['reason']}")
            print(f"📍 Redirect type: {redirect_decision['redirect_type']}")
            
            # Check for dynamic redirect first
            dynamic_redirect_url = self._build_dynamic_redirect_url(survey_id, evaluation_result, session_id, user_info, request_data)
            
            if dynamic_redirect_url:
                print(f"🎯 Using dynamic redirect template for frontend processing")
                # Return the template URL for frontend processing, not the processed URL
                config = self.db.survey_configurations.find_one({"survey_id": survey_id})
                dynamic_config = config.get("dynamic_redirect_config", {})
                status = evaluation_result.get("status", "fail")
                
                if status == "pass":
                    template_url = dynamic_config.get("pass_redirect_url", "")
                else:
                    template_url = dynamic_config.get("fail_redirect_url", "")
                
                redirect_info = {
                    "redirect_url": template_url,  # Send template, not processed URL
                    "redirect_type": "dynamic",
                    "custom_message": "Redirecting..."
                }
                redirect_decision["should_redirect"] = True
                redirect_decision["redirect_type"] = "dynamic"
                
                # Track dynamic redirect
                track_step(session_id, "redirect", 
                          redirect_type="dynamic",
                          redirect_url=dynamic_redirect_url)
                          
            elif redirect_decision["should_redirect"]:
                # Build PepperAds URL
                redirect_info = build_pepperads_url(
                    survey_id, 
                    user_info, 
                    {"session_id": session_id}
                )
                
                if redirect_info:
                    print(f"🔗 PepperAds redirect URL built successfully")
                    # Track redirect
                    track_step(session_id, "redirect", 
                              redirect_type="pepperads",
                              redirect_url=redirect_info["redirect_url"],
                              redirect_info=redirect_info)
                else:
                    print(f"❌ Failed to build PepperAds URL, falling back to thank you page")
                    redirect_decision["should_redirect"] = False
                    redirect_decision["redirect_type"] = "thankyou_page"
            
            # Step 11: Get fail/thank you page config if needed
            if not redirect_decision["should_redirect"]:
                fail_page_config = get_fail_page_config(survey_id)
                redirect_info = {
                    "redirect_url": fail_page_config["fail_page_url"],
                    "custom_message": fail_page_config.get("custom_message", "Thank you!"),
                    "show_retry_option": fail_page_config.get("show_retry_option", False)
                }
                
                # Track non-redirect
                track_step(session_id, "redirect",
                          redirect_type=redirect_decision["redirect_type"],
                          redirect_url=redirect_info["redirect_url"])
            
            # Step 12: Send postbacks (BOTH pass and fail cases)
            postback_results = self._send_conditional_postbacks(
                survey_id,
                session_id, 
                response_data, 
                evaluation_result
            )
            
            # Step 13: Prepare final response
            final_response = {
                "message": "Survey submitted successfully",
                "response_id": response_id,
                "session_id": session_id,
                "survey_id": survey_id,
                "evaluation": {
                    "enabled": evaluation_enabled,
                    "status": evaluation_result["status"],
                    "score": evaluation_result.get("score", 0),
                    "message": evaluation_result.get("message", ""),
                    "criteria_met": evaluation_result.get("criteria_met", []),
                    "criteria_failed": evaluation_result.get("criteria_failed", [])
                },
                "redirect": {
                    "should_redirect": redirect_decision["should_redirect"],
                    "redirect_type": redirect_decision["redirect_type"],
                    "redirect_url": redirect_info.get("redirect_url", ""),
                    "delay_seconds": 3 if redirect_decision["should_redirect"] else 0,
                    "custom_message": redirect_info.get("custom_message", ""),
                    "offer_info": redirect_info if redirect_decision["should_redirect"] else None
                },
                "postback_results": {
                    "total_sent": len(postback_results),
                    "successful": sum(1 for r in postback_results if r["success"]),
                    "failed": sum(1 for r in postback_results if not r["success"]),
                    "details": postback_results
                },
                "tracking": {
                    "session_id": session_id,
                    "steps_tracked": "all",
                    "user_info": user_info
                }
            }
            
            print(f"\n✅ SURVEY SUBMISSION COMPLETED SUCCESSFULLY")
            print(f"📊 Status: {evaluation_result['status']}")
            print(f"🔗 Redirect: {'Yes' if redirect_decision['should_redirect'] else 'No'} ({redirect_decision['redirect_type']})")
            print(f"📡 Postbacks: {len(postback_results)} sent")
            print(f"{'='*60}\n")
            
            return final_response
            
        except Exception as e:
            print(f"❌ CRITICAL ERROR in survey submission: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return self._error_response(f"Internal server error: {str(e)}", 500)
    
    def _build_dynamic_redirect_url(self, survey_id: str, evaluation_result: dict, session_id: str, user_info: dict, request_data: dict) -> str:
        """Build dynamic redirect URL with parameter replacement"""
        
        try:
            # Get survey configuration
            config = self.db.survey_configurations.find_one({"survey_id": survey_id})
            
            if not config or not config.get("dynamic_redirect_enabled"):
                print(f"❌ Dynamic redirect not enabled for survey {survey_id}")
                print(f"   Config exists: {bool(config)}")
                if config:
                    print(f"   Dynamic redirect enabled: {config.get('dynamic_redirect_enabled')}")
                return None
                
            dynamic_config = config.get("dynamic_redirect_config", {})
            
            # Determine which URL to use based on pass/fail status
            status = evaluation_result.get("status", "fail")
            if status == "pass":
                url_template = dynamic_config.get("pass_redirect_url", "")
            else:
                url_template = dynamic_config.get("fail_redirect_url", "")
                
            if not url_template:
                return None
                
            print(f"🎯 Building dynamic redirect URL for {status} status")
            print(f"📝 Template: {url_template}")
            print(f"✅ Dynamic redirect IS ENABLED for survey {survey_id}")
            
            # Return just a marker to indicate dynamic redirect should be used
            # The actual template will be sent by the frontend processing logic above
            return "DYNAMIC_REDIRECT_ENABLED"
            
            # Build replacement parameters
            import time
            from urllib.parse import parse_qs, urlparse
            
            # Don't extract query parameters for dynamic redirect - we only want template replacement
            # The extra parameters are causing the double ? issue
            
            # Build parameter mapping
            replacements = {
                'session_id': session_id,
                'timestamp': str(int(time.time())),
                'user_id': user_info.get('click_id', '') or user_info.get('username', ''),
                'survey_id': survey_id,
                'status': status,
                'score': str(evaluation_result.get('score', 0)),
                'fail_reason': 'criteria_not_met' if status == 'fail' else '',
                'username': user_info.get('username', ''),
                'email': user_info.get('email', ''),
                'click_id': user_info.get('click_id', ''),
                'ip_address': user_info.get('ip_address', ''),
            }
            
            # Replace placeholders in URL
            final_url = url_template
            for key, value in replacements.items():
                placeholder = '{' + key + '}'
                final_url = final_url.replace(placeholder, value)
            
            print(f"🔍 Replacements made:")
            for key, value in replacements.items():
                print(f"   {{{key}}} → {value}")
            print(f"✅ Dynamic URL built: {final_url}")
            
            # Ensure we don't have leftover placeholders
            if '{' in final_url and '}' in final_url:
                print(f"⚠️ Warning: URL still contains unreplaced placeholders: {final_url}")
            
            return final_url
            
        except Exception as e:
            print(f"❌ Error building dynamic redirect URL: {e}")
            return None
    
    def _send_conditional_postbacks(
        self, 
        survey_id: str,
        session_id: str, 
        response_data: dict, 
        evaluation_result: dict
    ) -> list:
        """Send postbacks based on pass/fail status"""
        
        postback_results = []
        pass_fail_status = evaluation_result.get("status", "unknown")
        
        print(f"📡 Sending conditional postbacks (Status: {pass_fail_status})")
        
        # FIRST: Send postback to survey creator (NEW USER-BASED SYSTEM)
        try:
            from user_postback_sender import send_postback_to_survey_creator
            
            print(f"\n🎯 USER-BASED POSTBACK: Sending to survey creator")
            
            # Create comprehensive postback data
            creator_postback_data = {
                "response_id": response_data.get("response_id", str(uuid.uuid4())),
                "transaction_id": response_data.get("response_id", str(uuid.uuid4())),
                "survey_id": survey_id,
                "email": response_data.get("email", ""),
                "username": response_data.get("username", "anonymous"),
                "responses": response_data.get("responses", []),
                "status": pass_fail_status,
                "reward": "0.1",
                "currency": "USD",
                "session_id": session_id,
                "submitted_at": response_data.get("submitted_at", datetime.now(timezone.utc).isoformat()),
                "user_id": response_data.get("user_id", ""),
                "simple_user_id": response_data.get("simple_user_id", ""),
                "click_id": response_data.get("click_id", ""),
                "ip_address": response_data.get("ip_address", ""),
                "user_agent": response_data.get("user_agent", ""),
                "evaluation_result": evaluation_result.get("result", "unknown")
            }
            
            # Send to creator
            creator_result = send_postback_to_survey_creator(survey_id, creator_postback_data)
            
            if creator_result.get('success'):
                creator_name = creator_result.get('creator_name', 'Unknown')
                print(f"✅ SUCCESS: Postback sent to survey creator: {creator_name}")
                postback_results.append({
                    "partner_name": f"Survey Creator ({creator_name})",
                    "success": True,
                    "status_code": 200,
                    "timestamp": datetime.now(timezone.utc)
                })
            else:
                error_msg = creator_result.get('error', 'Unknown error')
                print(f"⚠️ WARNING: Failed to send postback to survey creator: {error_msg}")
                postback_results.append({
                    "partner_name": "Survey Creator",
                    "success": False,
                    "status_code": 0,
                    "error": error_msg,
                    "timestamp": datetime.now(timezone.utc)
                })
                
        except Exception as creator_error:
            print(f"❌ ERROR: Creator postback error: {creator_error}")
            postback_results.append({
                "partner_name": "Survey Creator",
                "success": False,
                "status_code": 0,
                "error": str(creator_error),
                "timestamp": datetime.now(timezone.utc)
            })
        
        # SECOND: Send to legacy partner mappings (for backward compatibility)
        try:
            # Get system config to check if postbacks are enabled
            system_config = get_system_config()
            if not system_config.get("postback_enabled", True):
                print(f"ℹ️ Postbacks globally disabled")
                return postback_results
            
            # Get active partners
            partners = list(self.db.partners.find({"status": "active"}))
            
            if not partners:
                print(f"ℹ️ No active partners found for postbacks")
                return postback_results
            
            print(f"📤 Found {len(partners)} active partners")
            
            for partner in partners:
                try:
                    partner_name = partner.get("name", "Unknown Partner")
                    
                    # Determine which URL to use
                    if pass_fail_status == "pass":
                        postback_url = partner.get("pass_postback_url")
                        send_enabled = partner.get("send_on_pass", True)
                        params = partner.get("postback_config", {}).get("pass_params", {})
                    else:  # fail
                        postback_url = partner.get("fail_postback_url") 
                        send_enabled = partner.get("send_on_fail", True)
                        params = partner.get("postback_config", {}).get("fail_params", {})
                    
                    # Check if we should send for this status
                    if not send_enabled:
                        print(f"⏭️ Skipping {partner_name}: postback disabled for {pass_fail_status}")
                        continue
                    
                    # Use fallback URL if specific pass/fail URL not configured
                    if not postback_url:
                        postback_url = partner.get("url", "")
                        if postback_url:
                            # Add status parameter to original URL
                            separator = "&" if "?" in postback_url else "?"
                            postback_url += f"{separator}status={pass_fail_status}&result={'qualified' if pass_fail_status == 'pass' else 'not_qualified'}"
                    
                    if not postback_url:
                        print(f"⚠️ No postback URL configured for {partner_name}")
                        continue
                    
                    # Replace placeholders in URL
                    final_url = self._replace_postback_parameters(
                        postback_url, 
                        response_data, 
                        evaluation_result,
                        params
                    )
                    
                    # Send postback
                    result = self._send_postback(partner_name, final_url)
                    postback_results.append(result)
                    
                    # Track postback in session
                    track_step(session_id, "postback",
                              partner_name=partner_name,
                              postback_url=final_url,
                              status_code=result["status_code"],
                              response_text=result.get("response_text", ""))
                    
                except Exception as partner_error:
                    print(f"❌ Error processing partner {partner.get('name', 'unknown')}: {partner_error}")
                    error_result = {
                        "partner_name": partner.get("name", "unknown"),
                        "success": False,
                        "status_code": 0,
                        "error": str(partner_error),
                        "timestamp": datetime.now(timezone.utc)
                    }
                    postback_results.append(error_result)
            
            print(f"📊 Postback summary: {sum(1 for r in postback_results if r['success'])}/{len(postback_results)} successful")
            
        except Exception as e:
            print(f"❌ Error in postback processing: {e}")
        
        return postback_results
    
    def _replace_postback_parameters(
        self, 
        url: str, 
        response_data: dict, 
        evaluation_result: dict,
        extra_params: dict = None
    ) -> str:
        """Replace placeholders in postback URL - supports both [param] and {param} formats"""
        
        # Standard parameter values for ONLY 10 fixed parameters
        param_values = {
            'CLICK_ID': response_data.get("user_info", {}).get("click_id", ""),
            'PAYOUT': str(evaluation_result.get("payout", 0)),
            'CURRENCY': "USD",  # Default currency
            'OFFER_ID': response_data.get("survey_id", ""),
            'CONVERSION_STATUS': "confirmed" if evaluation_result.get("status") == "pass" else "rejected",
            'TRANSACTION_ID': response_data.get("_id", ""),
            'SUB1': response_data.get("user_info", {}).get("click_id", ""),  # Use click_id as sub1
            'SUB2': response_data.get("session_id", ""),  # Use session_id as sub2
            'EVENT_NAME': "survey_conversion",
            'TIMESTAMP': str(int(datetime.now(timezone.utc).timestamp()))
        }
        
        # Add extra parameters
        if extra_params:
            for key, value in extra_params.items():
                param_values[key.upper()] = str(value)
        
        # Create replacements for both square and curly bracket formats
        replacements = {}
        for param_name, param_value in param_values.items():
            # Square bracket format: [PARAM]
            replacements[f'[{param_name}]'] = param_value
            # Curly bracket format: {PARAM}
            replacements[f'{{{param_name}}}'] = param_value
            # Also support lowercase versions
            replacements[f'[{param_name.lower()}]'] = param_value
            replacements[f'{{{param_name.lower()}}}'] = param_value
        
        # Apply replacements
        processed_url = url
        for placeholder, value in replacements.items():
            processed_url = processed_url.replace(placeholder, str(value))
        
        return processed_url
    
    def _send_postback(self, partner_name: str, url: str) -> dict:
        """Send individual postback"""
        
        try:
            import requests
            
            print(f"📤 Sending postback to {partner_name}: {url}")
            
            response = requests.get(url, timeout=10)
            
            result = {
                "partner_name": partner_name,
                "url": url,
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response_text": response.text[:200],  # Limit response text
                "timestamp": datetime.now(timezone.utc)
            }
            
            if response.status_code == 200:
                print(f"✅ Postback successful: {partner_name}")
            else:
                print(f"❌ Postback failed: {partner_name} (HTTP {response.status_code})")
            
            return result
            
        except Exception as e:
            print(f"❌ Postback error to {partner_name}: {e}")
            return {
                "partner_name": partner_name,
                "url": url,
                "success": False,
                "status_code": 0,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc)
            }
    
    def _get_click_tracking_data(self, survey_id: str, user_info: dict) -> dict:
        """Get click tracking data for this user/survey combination"""
        try:
            # Try to find click record by different identifiers
            click_id = user_info.get('click_id', '')
            ip_address = user_info.get('ip_address', '')
            
            query_conditions = []
            if click_id:
                query_conditions.append({"click_id": click_id})
            if ip_address and ip_address != 'unknown':
                query_conditions.append({"ip_address": ip_address})
            
            if not query_conditions:
                return None
            
            click_record = self.db.survey_clicks.find_one({
                "survey_id": survey_id,
                "$or": query_conditions
            })
            
            if click_record:
                return {
                    "click_record_id": str(click_record.get("_id", "")),
                    "click_count": click_record.get("click_count", 1),
                    "total_clicks": click_record.get("click_count", 1),
                    "first_click_time": click_record.get("first_click_time"),
                    "username": click_record.get("username", "unknown")
                }
            
            return None
            
        except Exception as e:
            print(f"❌ Error getting click tracking data: {e}")
            return None
    
    def _error_response(self, message: str, status_code: int = 400) -> dict:
        """Generate error response"""
        return {
            "error": message,
            "status_code": status_code,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Flask route integration
def create_enhanced_survey_route(app):
    """Add enhanced survey route to Flask app"""
    
    handler = EnhancedSurveyHandler()
    
    @app.route('/survey/<survey_id>/submit-enhanced', methods=['POST'])
    def submit_enhanced_survey_response(survey_id):
        """Enhanced survey submission endpoint"""
        
        # Validate request
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        request_data = request.json
        if not request_data:
            return jsonify({"error": "No data provided"}), 400
        
        # Process submission
        result = handler.handle_survey_submission(survey_id, request_data)
        
        # Return appropriate status code
        if "error" in result:
            status_code = result.get("status_code", 500)
            return jsonify(result), status_code
        else:
            return jsonify(result), 200

# Test function
def test_enhanced_handler():
    """Test the enhanced survey handler"""
    print("\n🧪 Testing Enhanced Survey Handler...")
    
    # Create test handler
    handler = EnhancedSurveyHandler()
    
    # Mock request data
    test_request_data = {
        "responses": {
            "q1": "Yes",
            "q2": "25",
            "q3": "Bachelor's degree"
        },
        "username": "test_user_enhanced",
        "email": "enhanced@example.com"
    }
    
    # Get a real survey ID from database
    sample_survey = handler.db.surveys.find_one({}, {"_id": 1})
    if sample_survey:
        survey_id = sample_survey["_id"]
        print(f"Using survey ID: {survey_id}")
        
        # Test submission
        result = handler.handle_survey_submission(survey_id, test_request_data)
        print(f"Test Result Keys: {list(result.keys())}")
        print(f"Evaluation Status: {result.get('evaluation', {}).get('status', 'unknown')}")
        print(f"Redirect Decision: {result.get('redirect', {}).get('should_redirect', False)}")
        print(f"Postback Count: {result.get('postback_results', {}).get('total_sent', 0)}")
        
        return result
    else:
        print("❌ No surveys found in database for testing")
        return None

if __name__ == "__main__":
    test_enhanced_handler()
