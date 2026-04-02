from flask import Blueprint, jsonify, request
from mongodb_config import db
from datetime import datetime
from bson import ObjectId
import json

session_insights_bp = Blueprint('session_insights', __name__, url_prefix='/api/admin')

def convert_objectid_to_string(doc):
    if isinstance(doc, dict):
        for key, value in list(doc.items()):
            if isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, datetime):
                doc[key] = value.isoformat()
            elif isinstance(value, dict):
                convert_objectid_to_string(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_objectid_to_string(item)
    return doc

@session_insights_bp.route('/survey-sessions', methods=['GET'])
def get_survey_sessions():
    """Get all survey sessions with complete insights"""
    try:
        # Get query parameters
        limit = int(request.args.get('limit', 100))
        skip = int(request.args.get('skip', 0))
        survey_id = request.args.get('survey_id')
        
        query = {}
        if survey_id:
            query['survey_id'] = survey_id
            
        # Fetch sessions
        sessions = list(db.survey_sessions.find(query).sort('timestamps.session_started', -1).skip(skip).limit(limit))
        
        # Format the response matching the UI's exact data model
        formatted_sessions = []
        survey_cache = {}
        
        for session in sessions:
            convert_objectid_to_string(session)
            
            s_id = session.get('survey_id')
            survey_title = f"{s_id}"
            if s_id:
                if s_id not in survey_cache:
                    s_doc = db.surveys.find_one({'$or': [{'id': s_id}, {'_id': s_id}, {'short_id': s_id}]}, {"title": 1})
                    if s_doc and s_doc.get("title"):
                        survey_cache[s_id] = s_doc.get("title")
                    else:
                        survey_cache[s_id] = f"Survey {s_id}"
                survey_title = survey_cache[s_id]
            
            # Map existing fields or fallback to new schema fields
            
            # 1. Identification
            session_id = session.get('session_id')
            user_id = session.get('user_id', None)
            s_id = session.get('survey_id')
            
            # Ensure completion_time uses timestamps.survey_completed or direct field
            completion_time = session.get('completion_time')
            if not completion_time and session.get('timestamps'):
                completion_time = session.get('timestamps').get('survey_completed')
            
            # 2. User Details
            ui_info = session.get('user_info', {})
            name = session.get('name', ui_info.get('username', None))
            email = session.get('email', ui_info.get('email', None))
            account_status = session.get('account_status', 'logged_in' if user_id or email else 'guest')
            source_account = session.get('source_account', 'random')
            
            # 3. Location Info
            location_info = session.get('location_info', {})
            ip_address = session.get('ip_address', location_info.get('ip_address', ui_info.get('ip_address', None)))
            country = location_info.get('country', session.get('country', None))
            state = location_info.get('state', session.get('state', None))
            city = location_info.get('city', session.get('city', None))
            latitude = location_info.get('latitude', session.get('latitude', None))
            longitude = location_info.get('longitude', session.get('longitude', None))
            timezone = location_info.get('timezone', session.get('timezone', None))
            
            # 4. Device Info
            device_info = session.get('device_info', session.get('metadata', {}))
            device_type = device_info.get('device_type', session.get('device_type', None))
            os = device_info.get('os', session.get('os', None))
            browser = device_info.get('browser', session.get('browser', None))
            screen_resolution = device_info.get('screen_resolution', session.get('screen_resolution', None))
            language = device_info.get('language', session.get('language', None))
            
            # 5. Behavior Tracking
            behavior_info = session.get('behavior_tracking', {})
            
            total_clicks = behavior_info.get('total_clicks', session.get('total_clicks', None))
            time_spent = behavior_info.get('time_spent_on_survey', session.get('time_spent_on_survey', None))
            
            # Calculate time spent if missing
            if time_spent is None and session.get('timestamps'):
                t_starts = session['timestamps'].get('session_started')
                t_ends = session['timestamps'].get('survey_completed') or session['timestamps'].get('last_activity')
                if t_starts and t_ends:
                    try:
                        starts_dt = datetime.fromisoformat(t_starts) if isinstance(t_starts, str) else t_starts
                        ends_dt = datetime.fromisoformat(t_ends) if isinstance(t_ends, str) else t_ends
                        if starts_dt and ends_dt:
                            time_spent = (ends_dt - starts_dt).total_seconds()
                    except:
                        pass
                        
            pages_visited = behavior_info.get('pages_visited', session.get('pages_visited', None))
            
            last_active_time = behavior_info.get('last_active_time', session.get('last_active_time', None))
            if not last_active_time and session.get('timestamps'):
                last_active_time = session['timestamps'].get('last_activity')

            formatted_session = {
                # Identification
                "session_id": session_id,
                "user_id": user_id,
                "survey_id": s_id,
                "survey_title": survey_title,
                "completion_time": completion_time,
                
                # User Details
                "name": name,
                "email": email,
                "account_status": account_status,
                "source_account": source_account,
                
                # Location Info
                "ip_address": ip_address,
                "country": country,
                "state": state,
                "city": city,
                "latitude": latitude,
                "longitude": longitude,
                "timezone": timezone,
                
                # Device Info
                "device_type": device_type,
                "os": os,
                "browser": browser,
                "screen_resolution": screen_resolution,
                "language": language,
                
                # Behavior Tracking
                "total_clicks": total_clicks,
                "time_spent_on_survey": time_spent,
                "pages_visited": pages_visited,
                "last_active_time": last_active_time
            }
            
            formatted_sessions.append(formatted_session)
            
        total = db.survey_sessions.count_documents(query)
        
        return jsonify({
            "sessions": formatted_sessions,
            "total": total,
            "limit": limit,
            "skip": skip
        })
        
    except Exception as e:
        print(f"Error fetching survey sessions: {e}")
        return jsonify({"error": str(e)}), 500
