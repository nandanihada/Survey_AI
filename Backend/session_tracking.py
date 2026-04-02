"""
Enhanced Session Tracking System
Tracks every step of the survey completion process
"""

from datetime import datetime, timezone
from mongodb_config import db
import uuid
from typing import Dict, List, Any, Optional
from flask import request

class SurveySessionTracker:
    """Enhanced session tracking for comprehensive survey monitoring"""
    
    def __init__(self):
        self.db = db
    
    def start_session(
        self, 
        survey_id: str, 
        user_info: Dict = None, 
        request_data: Dict = None
    ) -> str:
        """
        Start a new survey session with comprehensive tracking
        
        Args:
            survey_id: ID of the survey
            user_info: User information (username, email, etc.)
            request_data: Request metadata (IP, user agent, etc.)
            
        Returns:
            session_id: Unique session identifier
        """
        try:
            session_id = str(uuid.uuid4())
            
            # Extract user information
            user_data = user_info or {}
            
            # Extract request metadata
            if request_data is None and request:
                request_data = {
                    "ip_address": request.environ.get('REMOTE_ADDR', 'unknown'),
                    "user_agent": request.headers.get('User-Agent', 'unknown'),
                    "referrer": request.headers.get('Referer', ''),
                    "click_id": request.args.get('click_id', ''),
                }
            
            request_data = request_data or {}
            
            import requests
            
            # Get Geo Location softly
            geo_data = {
                "country": None,
                "state": None,
                "city": None,
                "latitude": None,
                "longitude": None,
                "timezone": None
            }
            client_ip = request_data.get("ip_address", "unknown")
            if client_ip in ["127.0.0.1", "::1", "localhost"]:
                # Use actual external IP for localhost testing so their real location is marked
                client_ip = "103.121.151.161"
                
            if client_ip and client_ip != "unknown":
                try:
                    # Non-blocking rapid geo lookup (can be delayed, 150 requests / min limit for free)
                    geo_resp = requests.get(f"http://ip-api.com/json/{client_ip}?fields=status,country,regionName,city,lat,lon,timezone", timeout=1.5)
                    if geo_resp.status_code == 200:
                        geo_json = geo_resp.json()
                        if geo_json.get("status") == "success":
                            geo_data["country"] = geo_json.get("country")
                            geo_data["state"] = geo_json.get("regionName")
                            geo_data["city"] = geo_json.get("city")
                            geo_data["latitude"] = geo_json.get("lat")
                            geo_data["longitude"] = geo_json.get("lon")
                            geo_data["timezone"] = geo_json.get("timezone")
                except Exception as e:
                    print(f"Geo lookup failed for {client_ip}: {e}")

            user_agent = request_data.get("user_agent", "unknown")
            device_type = self._detect_device_type(user_agent)
            browser = self._detect_browser(user_agent)
            os_name = self._detect_os(user_agent)
            
            screen_res = request_data.get("screen_resolution", "1920x1080")
            
            lang_header = request.headers.get("Accept-Language", "en-US") if request else "en-US"
            lang = request_data.get("language", lang_header.split(",")[0])

            # Identification
            completion_time = None
            user_id = user_data.get("user_id", None)
            
            # User Details
            name = user_data.get("username", None)
            email = user_data.get("email", None)
            account_status = "logged_in" if (user_id or name or email) else "guest"
            source_account = user_data.get("source_account", "random")

            # Create session document with STRICT STRUCTURE requirements + extending existing ones
            session_doc = {
                "_id": session_id,
                "session_id": session_id,
                "user_id": user_id,
                "survey_id": survey_id,
                "completion_time": completion_time,
                
                "name": name,
                "email": email,
                "account_status": account_status,
                "source_account": source_account,
                
                "location_info": {
                    "ip_address": client_ip,
                    **geo_data
                },
                
                "device_info": {
                    "device_type": device_type,
                    "os": os_name,
                    "browser": browser,
                    "screen_resolution": screen_res,
                    "language": lang
                },
                
                "behavior_tracking": {
                    "total_clicks": 1,
                    "time_spent_on_survey": 0,
                    "pages_visited": 1,
                    "last_active_time": datetime.now(timezone.utc)
                },
                
                # Compatibility properties
                "user_info": {
                    "username": name or "",
                    "email": email or "",
                    "ip_address": client_ip,
                    "user_agent": user_agent,
                    "click_id": request_data.get("click_id", ""),
                    "referrer": request_data.get("referrer", "")
                },
                "timestamps": {
                    "session_started": datetime.now(timezone.utc),
                    "last_activity": datetime.now(timezone.utc),
                    "survey_started": None,
                    "survey_completed": None,
                    "redirected_at": None
                },
                "step_tracking": [
                    {
                        "step": "session_created",
                        "timestamp": datetime.now(timezone.utc),
                        "data": {
                            "survey_id": survey_id,
                            "user_agent": user_agent
                        }
                    }
                ],
                "progress_tracking": {
                    "questions_answered": [],
                    "current_question": None,
                    "completion_percentage": 0.0,
                    "total_questions": 0
                },
                "responses": {},
                "evaluation_result": {
                    "status": "pending",
                    "score": 0,
                    "criteria_met": [],
                    "criteria_failed": [],
                    "evaluated_at": None
                },
                "redirect_info": {
                    "redirect_type": None,
                    "redirect_url": None,
                    "pepperads_offer_id": None
                },
                "postback_results": [],
                "metadata": {
                    "device_type": device_type,
                    "browser": browser,
                    "os": os_name,
                    "utm_source": request.args.get('utm_source', '') if request else '',
                    "utm_campaign": request.args.get('utm_campaign', '') if request else '',
                    "utm_medium": request.args.get('utm_medium', '') if request else ''
                }
            }
            
            # Save to database
            self.db.survey_sessions.insert_one(session_doc)
            
            print(f"✅ Session started: {session_id} for survey {survey_id}")
            print(f"👤 User: {user_data.get('username', 'anonymous')} ({user_data.get('email', 'no email')})")
            print(f"🌐 IP: {request_data.get('ip_address', 'unknown')}")
            print(f"🔗 Click ID: {request_data.get('click_id', 'none')}")
            
            return session_id
            
        except Exception as e:
            print(f"❌ Error starting session: {e}")
            raise
    
    def track_page_load(self, session_id: str, page_info: Dict = None) -> bool:
        """Track when a survey page is loaded"""
        try:
            step_data = {
                "step": "page_load",
                "timestamp": datetime.now(timezone.utc),
                "data": page_info or {}
            }
            
            self.db.survey_sessions.update_one(
                {"_id": session_id},
                {
                    "$push": {"step_tracking": step_data},
                    "$set": {
                        "timestamps.last_activity": datetime.now(timezone.utc),
                        "timestamps.survey_started": datetime.now(timezone.utc),
                        "behavior_tracking.last_active_time": datetime.now(timezone.utc)
                    },
                    "$inc": { "behavior_tracking.pages_visited": 1 }
                }
            )
            
            print(f"📄 Page load tracked for session: {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking page load: {e}")
            return False
    
    def track_question_answered(
        self, 
        session_id: str, 
        question_id: str, 
        answer: Any, 
        question_info: Dict = None
    ) -> bool:
        """Track when a specific question is answered"""
        try:
            step_data = {
                "step": "question_answered",
                "question_id": question_id,
                "answer": answer,
                "timestamp": datetime.now(timezone.utc),
                "data": question_info or {}
            }
            
            # Update step tracking and responses
            update_data = {
                "$push": {"step_tracking": step_data},
                "$set": {
                    f"responses.{question_id}": answer,
                    "timestamps.last_activity": datetime.now(timezone.utc),
                    "behavior_tracking.last_active_time": datetime.now(timezone.utc)
                },
                "$inc": { "behavior_tracking.total_clicks": 1 },
                "$addToSet": {"progress_tracking.questions_answered": question_id}
            }
            
            self.db.survey_sessions.update_one(
                {"_id": session_id},
                update_data
            )
            
            # Update progress percentage
            self._update_progress_percentage(session_id)
            
            print(f"❓ Question answered: {question_id} = '{answer}' for session {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking question answer: {e}")
            return False
    
    def track_survey_completion(
        self, 
        session_id: str, 
        all_responses: Dict, 
        completion_info: Dict = None
    ) -> bool:
        """Track survey completion"""
        try:
            step_data = {
                "step": "survey_completed",
                "timestamp": datetime.now(timezone.utc),
                "data": completion_info or {"total_responses": len(all_responses)}
            }
            
            self.db.survey_sessions.update_one(
                {"_id": session_id},
                {
                    "$push": {"step_tracking": step_data},
                    "$set": {
                        "responses": all_responses,
                        "timestamps.survey_completed": datetime.now(timezone.utc),
                        "timestamps.last_activity": datetime.now(timezone.utc),
                        "progress_tracking.completion_percentage": 100.0,
                        "behavior_tracking.last_active_time": datetime.now(timezone.utc),
                        "completion_time": datetime.now(timezone.utc)
                    }
                }
            )
            
            print(f"🏁 Survey completion tracked for session: {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking survey completion: {e}")
            return False
    
    def track_evaluation_result(
        self, 
        session_id: str, 
        evaluation_result: Dict
    ) -> bool:
        """Track pass/fail evaluation result"""
        try:
            step_data = {
                "step": "evaluation_completed",
                "timestamp": datetime.now(timezone.utc),
                "data": {
                    "status": evaluation_result.get("status"),
                    "score": evaluation_result.get("score", 0),
                    "criteria_met": evaluation_result.get("criteria_met", []),
                    "criteria_failed": evaluation_result.get("criteria_failed", [])
                }
            }
            
            self.db.survey_sessions.update_one(
                {"_id": session_id},
                {
                    "$push": {"step_tracking": step_data},
                    "$set": {
                        "evaluation_result": evaluation_result,
                        "timestamps.last_activity": datetime.now(timezone.utc)
                    }
                }
            )
            
            print(f"📊 Evaluation result tracked: {evaluation_result['status']} for session {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking evaluation: {e}")
            return False
    
    def track_redirect(
        self, 
        session_id: str, 
        redirect_type: str, 
        redirect_url: str, 
        redirect_info: Dict = None
    ) -> bool:
        """Track redirect action (PepperAds or thank you page)"""
        try:
            step_data = {
                "step": "redirect_initiated",
                "timestamp": datetime.now(timezone.utc),
                "data": {
                    "redirect_type": redirect_type,
                    "redirect_url": redirect_url,
                    **(redirect_info or {})
                }
            }
            
            redirect_data = {
                "redirect_type": redirect_type,
                "redirect_url": redirect_url,
                **(redirect_info or {})
            }
            
            self.db.survey_sessions.update_one(
                {"_id": session_id},
                {
                    "$push": {"step_tracking": step_data},
                    "$set": {
                        "redirect_info": redirect_data,
                        "timestamps.redirected_at": datetime.now(timezone.utc),
                        "timestamps.last_activity": datetime.now(timezone.utc)
                    }
                }
            )
            
            print(f"🔗 Redirect tracked: {redirect_type} -> {redirect_url} for session {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking redirect: {e}")
            return False
    
    def track_postback_result(
        self, 
        session_id: str, 
        partner_name: str, 
        postback_url: str, 
        status_code: int, 
        response_text: str = ""
    ) -> bool:
        """Track postback sending result"""
        try:
            postback_result = {
                "partner_name": partner_name,
                "url_called": postback_url,
                "http_status": status_code,
                "response": response_text[:500],  # Limit response length
                "timestamp": datetime.now(timezone.utc),
                "success": status_code == 200
            }
            
            step_data = {
                "step": "postback_sent",
                "timestamp": datetime.now(timezone.utc),
                "data": postback_result
            }
            
            self.db.survey_sessions.update_one(
                {"_id": session_id},
                {
                    "$push": {
                        "step_tracking": step_data,
                        "postback_results": postback_result
                    },
                    "$set": {
                        "timestamps.last_activity": datetime.now(timezone.utc)
                    }
                }
            )
            
            print(f"📡 Postback result tracked: {partner_name} ({status_code}) for session {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error tracking postback result: {e}")
            return False
    
    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """Get complete session data"""
        try:
            session_doc = self.db.survey_sessions.find_one({"_id": session_id})
            if session_doc:
                # Convert ObjectId to string for JSON serialization
                if '_id' in session_doc:
                    session_doc['_id'] = str(session_doc['_id'])
                return session_doc
            return None
        except Exception as e:
            print(f"❌ Error getting session data: {e}")
            return None
    
    def get_session_summary(self, session_id: str) -> Dict:
        """Get session summary for reporting"""
        try:
            session_doc = self.get_session_data(session_id)
            if not session_doc:
                return {"error": "Session not found"}
            
            # Calculate session duration
            start_time = session_doc["timestamps"]["session_started"]
            end_time = session_doc["timestamps"].get("survey_completed")
            
            duration_seconds = 0
            if end_time:
                duration_seconds = (end_time - start_time).total_seconds()
            
            # Count steps
            step_counts = {}
            for step in session_doc["step_tracking"]:
                step_type = step["step"]
                step_counts[step_type] = step_counts.get(step_type, 0) + 1
            
            return {
                "session_id": session_id,
                "survey_id": session_doc["survey_id"],
                "user_info": session_doc["user_info"],
                "duration_seconds": duration_seconds,
                "total_steps": len(session_doc["step_tracking"]),
                "step_breakdown": step_counts,
                "completion_status": session_doc["evaluation_result"]["status"],
                "progress_percentage": session_doc["progress_tracking"]["completion_percentage"],
                "questions_answered": len(session_doc["progress_tracking"]["questions_answered"]),
                "redirect_info": session_doc["redirect_info"],
                "postback_count": len(session_doc["postback_results"]),
                "timestamps": session_doc["timestamps"]
            }
            
        except Exception as e:
            print(f"❌ Error getting session summary: {e}")
            return {"error": str(e)}
    
    def _update_progress_percentage(self, session_id: str):
        """Update completion percentage based on questions answered"""
        try:
            session_doc = self.db.survey_sessions.find_one({"_id": session_id})
            if not session_doc:
                return
            
            # Get survey to count total questions
            survey_id = session_doc["survey_id"]
            survey = self.db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
            
            if survey:
                total_questions = len(survey.get("questions", []))
                questions_answered = len(session_doc["progress_tracking"]["questions_answered"])
                
                percentage = (questions_answered / total_questions * 100) if total_questions > 0 else 0
                
                self.db.survey_sessions.update_one(
                    {"_id": session_id},
                    {
                        "$set": {
                            "progress_tracking.completion_percentage": round(percentage, 2),
                            "progress_tracking.total_questions": total_questions
                        }
                    }
                )
        except Exception as e:
            print(f"❌ Error updating progress percentage: {e}")
    
    def _detect_device_type(self, user_agent: str) -> str:
        """Detect device type from user agent"""
        user_agent = user_agent.lower()
        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            return 'mobile'
        elif 'tablet' in user_agent or 'ipad' in user_agent:
            return 'tablet'
        else:
            return 'desktop'
    
    def _detect_browser(self, user_agent: str) -> str:
        """Detect browser from user agent"""
        user_agent = user_agent.lower()
        if 'chrome' in user_agent:
            return 'chrome'
        elif 'firefox' in user_agent:
            return 'firefox'
        if 'safari' in user_agent and 'chrome' not in user_agent:
            return 'safari'
        elif 'edge' in user_agent:
            return 'edge'
        else:
            return 'unknown'
            
    def _detect_os(self, user_agent: str) -> str:
        """Detect OS from user agent"""
        user_agent = user_agent.lower()
        if 'windows nt 10.0' in user_agent: return 'Windows 10/11'
        elif 'windows nt' in user_agent: return 'Windows'
        elif 'mac os x' in user_agent: return 'macOS'
        elif 'android' in user_agent: return 'Android'
        elif 'iphone' in user_agent or 'ipad' in user_agent: return 'iOS'
        elif 'linux' in user_agent: return 'Linux'
        else: return 'Unknown OS'

# Convenience functions for external use
def start_survey_session(survey_id: str, user_info: Dict = None, request_data: Dict = None) -> str:
    """Start a new survey session"""
    tracker = SurveySessionTracker()
    return tracker.start_session(survey_id, user_info, request_data)

def track_step(session_id: str, step_type: str, **kwargs) -> bool:
    """Generic step tracking function"""
    tracker = SurveySessionTracker()
    
    if step_type == "page_load":
        return tracker.track_page_load(session_id, kwargs.get("page_info"))
    elif step_type == "question_answered":
        return tracker.track_question_answered(
            session_id, 
            kwargs["question_id"], 
            kwargs["answer"], 
            kwargs.get("question_info")
        )
    elif step_type == "survey_completed":
        return tracker.track_survey_completion(
            session_id, 
            kwargs["responses"], 
            kwargs.get("completion_info")
        )
    elif step_type == "evaluation":
        return tracker.track_evaluation_result(session_id, kwargs["evaluation_result"])
    elif step_type == "redirect":
        return tracker.track_redirect(
            session_id, 
            kwargs["redirect_type"], 
            kwargs["redirect_url"], 
            kwargs.get("redirect_info")
        )
    elif step_type == "postback":
        return tracker.track_postback_result(
            session_id, 
            kwargs["partner_name"], 
            kwargs["postback_url"], 
            kwargs["status_code"], 
            kwargs.get("response_text", "")
        )
    else:
        print(f"Unknown step type: {step_type}")
        return False

def get_session_summary(session_id: str) -> Dict:
    """Get session summary"""
    tracker = SurveySessionTracker()
    return tracker.get_session_summary(session_id)

# Test function
def test_session_tracking():
    """Test the session tracking system"""
    print("\n🧪 Testing Session Tracking System...")
    
    # Start a test session
    session_id = start_survey_session(
        "test_survey_123", 
        {"username": "test_user", "email": "test@example.com"},
        {"ip_address": "127.0.0.1", "user_agent": "Test Browser"}
    )
    
    # Track some steps
    track_step(session_id, "page_load", page_info={"page": "survey_start"})
    track_step(session_id, "question_answered", question_id="q1", answer="Yes")
    track_step(session_id, "question_answered", question_id="q2", answer="25")
    track_step(session_id, "survey_completed", responses={"q1": "Yes", "q2": "25"})
    track_step(session_id, "evaluation", evaluation_result={"status": "pass", "score": 100})
    track_step(session_id, "redirect", redirect_type="pepperads", redirect_url="https://example.com")
    
    # Get summary
    summary = get_session_summary(session_id)
    print(f"Test Summary: {summary}")
    
    return session_id

if __name__ == "__main__":
    test_session_tracking()
