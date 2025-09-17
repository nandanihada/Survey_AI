"""
Click Tracking API
Tracks survey link clicks, multiple visits, and user interactions even without submission
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from mongodb_config import db
import uuid
from typing import Dict, Optional

click_tracking_bp = Blueprint('click_tracking', __name__)

class ClickTracker:
    """Enhanced click tracking for comprehensive user interaction monitoring"""
    
    def __init__(self):
        self.db = db
    
    def track_survey_click(
        self, 
        survey_id: str, 
        user_info: Dict = None,
        url_params: Dict = None
    ) -> Dict:
        """
        Track when a user clicks on a survey link
        
        Args:
            survey_id: ID of the survey
            user_info: User information extracted from request
            url_params: URL parameters (click_id, user_id, aff_sub, etc.)
            
        Returns:
            Dictionary with tracking results and session info
        """
        try:
            # Extract user identification
            click_id = url_params.get('click_id', '') if url_params else ''
            user_id = url_params.get('user_id', '') if url_params else ''
            aff_sub = url_params.get('aff_sub', '') if url_params else ''
            
            # Create unique identifier for this user/survey combination
            user_identifier = click_id or user_id or user_info.get('ip_address', 'unknown')
            
            # Check if this user has clicked this survey before
            existing_click = self.db.survey_clicks.find_one({
                "survey_id": survey_id,
                "$or": [
                    {"click_id": click_id} if click_id else {"$expr": False},
                    {"user_id": user_id} if user_id else {"$expr": False},
                    {"ip_address": user_info.get('ip_address')} if user_info.get('ip_address') else {"$expr": False}
                ]
            })
            
            current_time = datetime.now(timezone.utc)
            
            if existing_click:
                # Update existing click record
                click_count = existing_click.get('click_count', 0) + 1
                
                update_data = {
                    "$set": {
                        "last_click_time": current_time,
                        "click_count": click_count,
                        "last_user_agent": user_info.get('user_agent', ''),
                        "last_referrer": user_info.get('referrer', ''),
                        "url_params": url_params or {}
                    },
                    "$push": {
                        "click_history": {
                            "timestamp": current_time,
                            "ip_address": user_info.get('ip_address', ''),
                            "user_agent": user_info.get('user_agent', ''),
                            "referrer": user_info.get('referrer', ''),
                            "url_params": url_params or {}
                        }
                    }
                }
                
                self.db.survey_clicks.update_one(
                    {"_id": existing_click["_id"]},
                    update_data
                )
                
                click_record_id = existing_click["_id"]
                is_new_user = False
                
                print(f"🔄 Updated existing click record: {click_record_id} (Click #{click_count})")
                
            else:
                # Create new click record
                click_record_id = str(uuid.uuid4())
                
                click_record = {
                    "_id": click_record_id,
                    "survey_id": survey_id,
                    "click_id": click_id,
                    "user_id": user_id,
                    "aff_sub": aff_sub,
                    "username": self._extract_username(user_info, url_params),
                    "first_click_time": current_time,
                    "last_click_time": current_time,
                    "click_count": 1,
                    "ip_address": user_info.get('ip_address', ''),
                    "user_agent": user_info.get('user_agent', ''),
                    "referrer": user_info.get('referrer', ''),
                    "url_params": url_params or {},
                    "submission_status": "not_submitted",
                    "submission_count": 0,
                    "last_submission_time": None,
                    "evaluation_results": [],
                    "device_info": {
                        "device_type": self._detect_device_type(user_info.get('user_agent', '')),
                        "browser": self._detect_browser(user_info.get('user_agent', ''))
                    },
                    "click_history": [{
                        "timestamp": current_time,
                        "ip_address": user_info.get('ip_address', ''),
                        "user_agent": user_info.get('user_agent', ''),
                        "referrer": user_info.get('referrer', ''),
                        "url_params": url_params or {}
                    }],
                    "created_at": current_time,
                    "updated_at": current_time
                }
                
                self.db.survey_clicks.insert_one(click_record)
                is_new_user = True
                
                print(f"✅ New click record created: {click_record_id}")
            
            # Get survey info for response
            survey = self.db.surveys.find_one({
                "$or": [{"_id": survey_id}, {"id": survey_id}]
            })
            
            return {
                "success": True,
                "click_record_id": click_record_id,
                "survey_id": survey_id,
                "survey_title": survey.get('title', 'Unknown Survey') if survey else 'Unknown Survey',
                "is_new_user": is_new_user,
                "click_count": existing_click.get('click_count', 0) + 1 if existing_click else 1,
                "user_identifier": user_identifier,
                "username": self._extract_username(user_info, url_params),
                "timestamp": current_time.isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error tracking survey click: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def update_submission_status(
        self, 
        survey_id: str, 
        user_identifier: str, 
        submission_data: Dict
    ) -> bool:
        """
        Update click record when user submits survey
        
        Args:
            survey_id: ID of the survey
            user_identifier: User identifier (click_id, user_id, or IP)
            submission_data: Submission and evaluation data
            
        Returns:
            Boolean indicating success
        """
        try:
            # Find the click record
            click_record = self.db.survey_clicks.find_one({
                "survey_id": survey_id,
                "$or": [
                    {"click_id": user_identifier},
                    {"user_id": user_identifier},
                    {"ip_address": user_identifier}
                ]
            })
            
            if not click_record:
                print(f"⚠️ No click record found for user {user_identifier} on survey {survey_id}")
                return False
            
            # Update submission status
            current_time = datetime.now(timezone.utc)
            submission_count = click_record.get('submission_count', 0) + 1
            
            evaluation_result = {
                "submission_time": current_time,
                "status": submission_data.get('evaluation_status', 'unknown'),
                "score": submission_data.get('evaluation_score', 0),
                "response_id": submission_data.get('response_id', ''),
                "session_id": submission_data.get('session_id', '')
            }
            
            update_data = {
                "$set": {
                    "submission_status": "submitted",
                    "submission_count": submission_count,
                    "last_submission_time": current_time,
                    "updated_at": current_time
                },
                "$push": {
                    "evaluation_results": evaluation_result
                }
            }
            
            self.db.survey_clicks.update_one(
                {"_id": click_record["_id"]},
                update_data
            )
            
            print(f"✅ Updated submission status for click record: {click_record['_id']}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating submission status: {e}")
            return False
    
    def get_click_analytics(self, survey_id: str) -> Dict:
        """Get click analytics for a survey"""
        try:
            # Aggregate click data
            pipeline = [
                {"$match": {"survey_id": survey_id}},
                {"$group": {
                    "_id": "$survey_id",
                    "total_clicks": {"$sum": "$click_count"},
                    "unique_users": {"$sum": 1},
                    "submitted_users": {
                        "$sum": {"$cond": [{"$eq": ["$submission_status", "submitted"]}, 1, 0]}
                    },
                    "not_submitted_users": {
                        "$sum": {"$cond": [{"$eq": ["$submission_status", "not_submitted"]}, 1, 0]}
                    },
                    "total_submissions": {"$sum": "$submission_count"},
                    "avg_clicks_per_user": {"$avg": "$click_count"}
                }}
            ]
            
            result = list(self.db.survey_clicks.aggregate(pipeline))
            
            if result:
                analytics = result[0]
                analytics["conversion_rate"] = (
                    analytics["submitted_users"] / analytics["unique_users"] * 100
                    if analytics["unique_users"] > 0 else 0
                )
                return analytics
            else:
                return {
                    "total_clicks": 0,
                    "unique_users": 0,
                    "submitted_users": 0,
                    "not_submitted_users": 0,
                    "total_submissions": 0,
                    "avg_clicks_per_user": 0,
                    "conversion_rate": 0
                }
                
        except Exception as e:
            print(f"❌ Error getting click analytics: {e}")
            return {"error": str(e)}
    
    def _extract_username(self, user_info: Dict, url_params: Dict) -> str:
        """Extract username from available data"""
        if url_params and url_params.get('aff_sub'):
            return url_params['aff_sub']
        
        if user_info and user_info.get('username'):
            return user_info['username']
        
        if url_params and url_params.get('user_id'):
            return f"user_{url_params['user_id']}"
        
        if url_params and url_params.get('click_id'):
            return f"click_{url_params['click_id']}"
        
        return "anonymous"
    
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
        elif 'safari' in user_agent:
            return 'safari'
        elif 'edge' in user_agent:
            return 'edge'
        else:
            return 'unknown'

# API Endpoints
@click_tracking_bp.route('/api/track-click/<survey_id>', methods=['POST', 'GET'])
def track_survey_click(survey_id):
    """Track survey link click"""
    try:
        # Extract user info from request
        user_info = {
            'ip_address': request.environ.get('REMOTE_ADDR', 'unknown'),
            'user_agent': request.headers.get('User-Agent', 'unknown'),
            'referrer': request.headers.get('Referer', ''),
        }
        
        # Get URL parameters
        url_params = dict(request.args)
        
        # If POST request, also check JSON body for additional data
        if request.method == 'POST' and request.is_json:
            post_data = request.json or {}
            user_info.update({
                'username': post_data.get('username', ''),
                'email': post_data.get('email', '')
            })
        
        # Track the click
        tracker = ClickTracker()
        result = tracker.track_survey_click(survey_id, user_info, url_params)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500

@click_tracking_bp.route('/api/click-analytics/<survey_id>', methods=['GET'])
def get_click_analytics(survey_id):
    """Get click analytics for a survey"""
    try:
        tracker = ClickTracker()
        analytics = tracker.get_click_analytics(survey_id)
        
        return jsonify({
            "success": True,
            "survey_id": survey_id,
            "analytics": analytics
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@click_tracking_bp.route('/api/click-details/<survey_id>', methods=['GET'])
def get_click_details(survey_id):
    """Get detailed click records for a survey"""
    try:
        # Get all click records for this survey
        click_records = list(db.survey_clicks.find(
            {"survey_id": survey_id},
            {"_id": 1, "click_id": 1, "user_id": 1, "username": 1, "first_click_time": 1, 
             "last_click_time": 1, "click_count": 1, "submission_status": 1, 
             "submission_count": 1, "ip_address": 1, "device_info": 1, "evaluation_results": 1}
        ).sort("first_click_time", -1))
        
        # Convert ObjectId to string for JSON serialization
        for record in click_records:
            record['_id'] = str(record['_id'])
        
        return jsonify({
            "success": True,
            "survey_id": survey_id,
            "total_records": len(click_records),
            "click_records": click_records
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Helper function to update submission status (called from enhanced_survey_handler)
def update_click_submission_status(survey_id: str, user_info: Dict, submission_data: Dict):
    """Helper function to update click record when survey is submitted"""
    try:
        tracker = ClickTracker()
        
        # Try different user identifiers
        identifiers = [
            user_info.get('click_id', ''),
            user_info.get('user_id', ''),
            user_info.get('ip_address', '')
        ]
        
        for identifier in identifiers:
            if identifier:
                success = tracker.update_submission_status(survey_id, identifier, submission_data)
                if success:
                    print(f"✅ Updated click record for identifier: {identifier}")
                    return True
        
        print(f"⚠️ Could not find click record to update for survey {survey_id}")
        return False
        
    except Exception as e:
        print(f"❌ Error updating click submission status: {e}")
        return False
