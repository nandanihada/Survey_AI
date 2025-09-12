from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from mongodb_config import db
from auth_middleware import requireAuth
from bson import ObjectId

response_logs_bp = Blueprint('response_logs', __name__)

def convert_objectid_to_string(obj):
    """Convert ObjectId fields to strings for JSON serialization"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, ObjectId):
                obj[key] = str(value)
            elif isinstance(value, dict):
                convert_objectid_to_string(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_objectid_to_string(item)
    return obj

@response_logs_bp.route('/api/response-logs/<survey_id>', methods=['GET'])
@requireAuth
def get_response_logs(survey_id):
    """Get detailed response logs for a specific survey"""
    try:
        user = g.current_user
        user_id = str(user['_id'])
        
        # Verify survey exists and user has access
        survey = db.surveys.find_one({
            "$or": [{"_id": survey_id}, {"id": survey_id}]
        })
        
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        
        # Check ownership (admin can access all)
        if survey.get('ownerUserId') != user_id and user.get('role') != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Build aggregation pipeline to get comprehensive response logs
        pipeline = [
            # Match responses for this survey
            {
                "$match": {
                    "survey_id": str(survey['_id'])
                }
            },
            # Lookup session data for additional info
            {
                "$lookup": {
                    "from": "survey_sessions",
                    "localField": "session_id",
                    "foreignField": "_id",
                    "as": "session_data"
                }
            },
            # Add computed fields
            {
                "$addFields": {
                    "session_info": {"$arrayElemAt": ["$session_data", 0]},
                    "duration_seconds": {
                        "$cond": {
                            "if": {"$and": [
                                {"$ne": [{"$arrayElemAt": ["$session_data.timestamps.survey_started", 0]}, None]},
                                {"$ne": [{"$arrayElemAt": ["$session_data.timestamps.survey_completed", 0]}, None]}
                            ]},
                            "then": {
                                "$divide": [
                                    {"$subtract": [
                                        {"$arrayElemAt": ["$session_data.timestamps.survey_completed", 0]},
                                        {"$arrayElemAt": ["$session_data.timestamps.survey_started", 0]}
                                    ]},
                                    1000
                                ]
                            },
                            "else": 0
                        }
                    }
                }
            },
            # Project final fields
            {
                "$project": {
                    "_id": 1,
                    "survey_id": 1,
                    "session_id": 1,
                    "username": {"$ifNull": ["$user_info.username", ""]},
                    "email": {"$ifNull": ["$user_info.email", ""]},
                    "ip_address": {"$ifNull": ["$user_info.ip_address", ""]},
                    "click_id": {"$ifNull": ["$user_info.click_id", ""]},
                    "submitted_at": 1,
                    "status": 1,
                    "duration_seconds": 1,
                    "timestamp": "$submitted_at",
                    "evaluation_result": 1,
                    "responses_count": {"$size": {"$objectToArray": {"$ifNull": ["$responses", {}]}}},
                    "user_agent": {"$ifNull": ["$user_info.user_agent", ""]},
                    "postback_status": {"$ifNull": ["$postback_status", "none"]}
                }
            },
            # Sort by most recent first
            {
                "$sort": {"submitted_at": -1}
            }
        ]
        
        # Execute aggregation
        response_logs = list(db.responses.aggregate(pipeline))
        
        # Convert ObjectIds to strings
        for log in response_logs:
            convert_objectid_to_string(log)
            
            # Format duration as human readable
            if log.get('duration_seconds', 0) > 0:
                duration = log['duration_seconds']
                if duration < 60:
                    log['duration_formatted'] = f"{duration:.1f}s"
                elif duration < 3600:
                    log['duration_formatted'] = f"{duration/60:.1f}m"
                else:
                    log['duration_formatted'] = f"{duration/3600:.1f}h"
            else:
                log['duration_formatted'] = "N/A"
        
        # Get summary statistics
        total_responses = len(response_logs)
        completed_responses = len([log for log in response_logs if log.get('status') == 'submitted'])
        avg_duration = sum(log.get('duration_seconds', 0) for log in response_logs) / max(total_responses, 1)
        
        return jsonify({
            'success': True,
            'logs': response_logs,
            'summary': {
                'total_responses': total_responses,
                'completed_responses': completed_responses,
                'completion_rate': (completed_responses / max(total_responses, 1)) * 100,
                'average_duration': avg_duration,
                'average_duration_formatted': f"{avg_duration/60:.1f}m" if avg_duration > 0 else "N/A"
            }
        })
        
    except Exception as e:
        print(f"Error fetching response logs: {e}")
        return jsonify({'error': f'Failed to fetch response logs: {str(e)}'}), 500

@response_logs_bp.route('/api/response-logs/<survey_id>/export', methods=['GET'])
@requireAuth
def export_response_logs(survey_id):
    """Export response logs as CSV"""
    try:
        user = g.current_user
        user_id = str(user['_id'])
        
        # Verify survey exists and user has access
        survey = db.surveys.find_one({
            "$or": [{"_id": survey_id}, {"id": survey_id}]
        })
        
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        
        # Check ownership (admin can access all)
        if survey.get('ownerUserId') != user_id and user.get('role') != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Get response logs (reuse the same pipeline)
        pipeline = [
            {"$match": {"survey_id": str(survey['_id'])}},
            {"$lookup": {
                "from": "survey_sessions",
                "localField": "session_id", 
                "foreignField": "_id",
                "as": "session_data"
            }},
            {"$addFields": {
                "session_info": {"$arrayElemAt": ["$session_data", 0]},
                "duration_seconds": {
                    "$cond": {
                        "if": {"$and": [
                            {"$ne": [{"$arrayElemAt": ["$session_data.timestamps.survey_started", 0]}, None]},
                            {"$ne": [{"$arrayElemAt": ["$session_data.timestamps.survey_completed", 0]}, None]}
                        ]},
                        "then": {
                            "$divide": [
                                {"$subtract": [
                                    {"$arrayElemAt": ["$session_data.timestamps.survey_completed", 0]},
                                    {"$arrayElemAt": ["$session_data.timestamps.survey_started", 0]}
                                ]},
                                1000
                            ]
                        },
                        "else": 0
                    }
                }
            }},
            {"$project": {
                "_id": 1,
                "survey_id": 1,
                "session_id": 1,
                "username": {"$ifNull": ["$user_info.username", ""]},
                "email": {"$ifNull": ["$user_info.email", ""]},
                "ip_address": {"$ifNull": ["$user_info.ip_address", ""]},
                "click_id": {"$ifNull": ["$user_info.click_id", ""]},
                "submitted_at": 1,
                "status": 1,
                "duration_seconds": 1,
                "evaluation_status": {"$ifNull": ["$evaluation_result.status", ""]},
                "evaluation_score": {"$ifNull": ["$evaluation_result.score", ""]},
                "postback_status": {"$ifNull": ["$postback_status", ""]}
            }},
            {"$sort": {"submitted_at": -1}}
        ]
        
        response_logs = list(db.responses.aggregate(pipeline))
        
        # Convert to CSV format
        csv_headers = [
            'Response ID',
            'Survey ID', 
            'Session ID',
            'Username',
            'Email',
            'IP Address',
            'Click ID',
            'Submitted At',
            'Status',
            'Duration (seconds)',
            'Evaluation Status',
            'Evaluation Score',
            'Postback Status'
        ]
        
        csv_rows = []
        for log in response_logs:
            csv_rows.append([
                str(log.get('_id', '')),
                str(log.get('survey_id', '')),
                str(log.get('session_id', '')),
                log.get('username', ''),
                log.get('email', ''),
                log.get('ip_address', ''),
                log.get('click_id', ''),
                log.get('submitted_at', '').isoformat() if log.get('submitted_at') else '',
                log.get('status', ''),
                str(log.get('duration_seconds', 0)),
                log.get('evaluation_status', ''),
                str(log.get('evaluation_score', '')),
                log.get('postback_status', '')
            ])
        
        return jsonify({
            'success': True,
            'csv_headers': csv_headers,
            'csv_rows': csv_rows,
            'filename': f'response-logs-{survey_id}-{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        })
        
    except Exception as e:
        print(f"Error exporting response logs: {e}")
        return jsonify({'error': f'Failed to export response logs: {str(e)}'}), 500
