"""
Enhanced Response Logs API
Shows comprehensive tracking including clicks, submissions, and failed attempts
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from mongodb_config import db
from auth_middleware import requireAuth
from bson import ObjectId

enhanced_response_logs_bp = Blueprint('enhanced_response_logs', __name__)

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

@enhanced_response_logs_bp.route('/api/enhanced-response-logs/<survey_id>', methods=['GET'])
@requireAuth
def get_enhanced_response_logs(survey_id):
    """Get comprehensive response logs including click tracking and failed submissions"""
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
        
        # Get submitted responses with enhanced data
        submitted_responses = get_submitted_responses(str(survey['_id']))
        
        # Get click records (including those without submissions)
        click_records = get_click_records(str(survey['_id']))
        
        # Merge and organize the data
        comprehensive_logs = merge_response_and_click_data(submitted_responses, click_records)
        
        # Calculate comprehensive statistics
        stats = calculate_comprehensive_stats(comprehensive_logs, click_records)
        
        return jsonify({
            'success': True,
            'logs': comprehensive_logs,
            'summary': stats,
            'survey_id': survey_id,
            'survey_title': survey.get('title', 'Unknown Survey')
        })
        
    except Exception as e:
        print(f"Error fetching enhanced response logs: {e}")
        return jsonify({'error': f'Failed to fetch enhanced response logs: {str(e)}'}), 500

def get_submitted_responses(survey_id):
    """Get all submitted responses with session data"""
    pipeline = [
        # Match responses for this survey
        {
            "$match": {
                "survey_id": survey_id
            }
        },
        # Lookup session data
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
                "evaluation_result": 1,
                "responses_count": {"$size": {"$objectToArray": {"$ifNull": ["$responses", {}]}}},
                "user_agent": {"$ifNull": ["$user_info.user_agent", ""]},
                "postback_status": {"$ifNull": ["$postback_status", "none"]},
                "click_tracking": 1  # Include click tracking data if available
            }
        },
        # Sort by most recent first
        {
            "$sort": {"submitted_at": -1}
        }
    ]
    
    return list(db.responses.aggregate(pipeline))

def get_click_records(survey_id):
    """Get all click records for this survey"""
    click_records = list(db.survey_clicks.find(
        {"survey_id": survey_id},
        {
            "_id": 1,
            "survey_id": 1,
            "click_id": 1,
            "user_id": 1,
            "aff_sub": 1,
            "username": 1,
            "first_click_time": 1,
            "last_click_time": 1,
            "click_count": 1,
            "ip_address": 1,
            "user_agent": 1,
            "submission_status": 1,
            "submission_count": 1,
            "last_submission_time": 1,
            "evaluation_results": 1,
            "device_info": 1,
            "click_history": 1
        }
    ).sort("first_click_time", -1))
    
    # Convert ObjectIds to strings
    for record in click_records:
        convert_objectid_to_string(record)
    
    return click_records

def merge_response_and_click_data(responses, click_records):
    """Merge response data with click tracking data"""
    comprehensive_logs = []
    
    # Create a lookup for click records by identifiers
    click_lookup = {}
    for click_record in click_records:
        # Index by multiple identifiers
        identifiers = [
            click_record.get('click_id', ''),
            click_record.get('user_id', ''),
            click_record.get('ip_address', '')
        ]
        for identifier in identifiers:
            if identifier and identifier != 'unknown':
                click_lookup[identifier] = click_record
    
    # Process submitted responses first
    processed_click_ids = set()
    
    for response in responses:
        convert_objectid_to_string(response)
        
        # Try to find matching click record
        click_data = None
        identifiers = [
            response.get('click_id', ''),
            response.get('ip_address', '')
        ]
        
        for identifier in identifiers:
            if identifier and identifier in click_lookup:
                click_data = click_lookup[identifier]
                processed_click_ids.add(click_data['_id'])
                break
        
        # Format duration
        if response.get('duration_seconds', 0) > 0:
            duration = response['duration_seconds']
            if duration < 60:
                response['duration_formatted'] = f"{duration:.1f}s"
            elif duration < 3600:
                response['duration_formatted'] = f"{duration/60:.1f}m"
            else:
                response['duration_formatted'] = f"{duration/3600:.1f}h"
        else:
            response['duration_formatted'] = "N/A"
        
        # Add click tracking information
        if click_data:
            response['click_tracking'] = {
                'click_count': click_data.get('click_count', 1),
                'first_click_time': click_data.get('first_click_time'),
                'last_click_time': click_data.get('last_click_time'),
                'total_clicks': click_data.get('click_count', 1),
                'device_type': click_data.get('device_info', {}).get('device_type', 'unknown'),
                'browser': click_data.get('device_info', {}).get('browser', 'unknown')
            }
            response['enhanced_username'] = click_data.get('username', response.get('username', ''))
        else:
            response['click_tracking'] = {
                'click_count': 1,
                'first_click_time': response.get('submitted_at'),
                'last_click_time': response.get('submitted_at'),
                'total_clicks': 1,
                'device_type': 'unknown',
                'browser': 'unknown'
            }
            response['enhanced_username'] = response.get('username', '')
        
        response['record_type'] = 'submitted'
        comprehensive_logs.append(response)
    
    # Add click records without submissions (failed attempts)
    for click_record in click_records:
        if click_record['_id'] not in processed_click_ids:
            # This is a click without submission
            failed_record = {
                '_id': f"click_{click_record['_id']}",
                'survey_id': click_record['survey_id'],
                'session_id': None,
                'username': click_record.get('username', ''),
                'enhanced_username': click_record.get('username', ''),
                'email': '',
                'ip_address': click_record.get('ip_address', ''),
                'click_id': click_record.get('click_id', ''),
                'submitted_at': None,
                'status': 'clicked_not_submitted',
                'duration_seconds': 0,
                'duration_formatted': 'N/A',
                'timestamp': click_record.get('last_click_time', click_record.get('first_click_time')),
                'evaluation_result': {'status': 'not_submitted', 'score': 0},
                'responses_count': 0,
                'user_agent': click_record.get('user_agent', ''),
                'postback_status': 'none',
                'click_tracking': {
                    'click_count': click_record.get('click_count', 1),
                    'first_click_time': click_record.get('first_click_time'),
                    'last_click_time': click_record.get('last_click_time'),
                    'total_clicks': click_record.get('click_count', 1),
                    'device_type': click_record.get('device_info', {}).get('device_type', 'unknown'),
                    'browser': click_record.get('device_info', {}).get('browser', 'unknown')
                },
                'record_type': 'clicked_only'
            }
            comprehensive_logs.append(failed_record)
    
    # Sort by timestamp (most recent first)
    comprehensive_logs.sort(key=lambda x: x.get('timestamp') or x.get('submitted_at') or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    return comprehensive_logs

def calculate_comprehensive_stats(logs, click_records):
    """Calculate comprehensive statistics"""
    total_clicks = len(click_records)
    total_unique_clicks = sum(record.get('click_count', 1) for record in click_records)
    
    submitted_logs = [log for log in logs if log.get('record_type') == 'submitted']
    clicked_only_logs = [log for log in logs if log.get('record_type') == 'clicked_only']
    
    total_submissions = len(submitted_logs)
    total_click_only = len(clicked_only_logs)
    
    # Calculate durations for submitted responses
    valid_durations = [log.get('duration_seconds', 0) for log in submitted_logs if log.get('duration_seconds', 0) > 0]
    avg_duration = sum(valid_durations) / len(valid_durations) if valid_durations else 0
    
    # Calculate conversion rate
    conversion_rate = (total_submissions / total_clicks * 100) if total_clicks > 0 else 0
    
    return {
        'total_clicks': total_clicks,
        'total_unique_clicks': total_unique_clicks,
        'total_submissions': total_submissions,
        'clicked_not_submitted': total_click_only,
        'conversion_rate': round(conversion_rate, 2),
        'average_duration': avg_duration,
        'average_duration_formatted': f"{avg_duration/60:.1f}m" if avg_duration > 0 else "N/A",
        'completion_rate': round((total_submissions / max(total_clicks, 1)) * 100, 2)
    }

@enhanced_response_logs_bp.route('/api/enhanced-response-logs/<survey_id>/export', methods=['GET'])
@requireAuth
def export_enhanced_response_logs(survey_id):
    """Export enhanced response logs as CSV"""
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
        
        # Get comprehensive logs
        submitted_responses = get_submitted_responses(str(survey['_id']))
        click_records = get_click_records(str(survey['_id']))
        comprehensive_logs = merge_response_and_click_data(submitted_responses, click_records)
        
        # CSV headers
        csv_headers = [
            'Record Type',
            'Response ID',
            'Survey ID',
            'Session ID',
            'Username',
            'Email',
            'IP Address',
            'Click ID',
            'First Click Time',
            'Last Click Time',
            'Total Clicks',
            'Submitted At',
            'Status',
            'Duration (seconds)',
            'Evaluation Status',
            'Evaluation Score',
            'Device Type',
            'Browser',
            'Postback Status'
        ]
        
        csv_rows = []
        for log in comprehensive_logs:
            click_tracking = log.get('click_tracking', {})
            evaluation = log.get('evaluation_result', {})
            
            csv_rows.append([
                log.get('record_type', ''),
                str(log.get('_id', '')),
                str(log.get('survey_id', '')),
                str(log.get('session_id', '')),
                log.get('enhanced_username', ''),
                log.get('email', ''),
                log.get('ip_address', ''),
                log.get('click_id', ''),
                click_tracking.get('first_click_time', '').isoformat() if click_tracking.get('first_click_time') else '',
                click_tracking.get('last_click_time', '').isoformat() if click_tracking.get('last_click_time') else '',
                str(click_tracking.get('total_clicks', 0)),
                log.get('submitted_at', '').isoformat() if log.get('submitted_at') else '',
                log.get('status', ''),
                str(log.get('duration_seconds', 0)),
                evaluation.get('status', ''),
                str(evaluation.get('score', '')),
                click_tracking.get('device_type', ''),
                click_tracking.get('browser', ''),
                log.get('postback_status', '')
            ])
        
        return jsonify({
            'success': True,
            'csv_headers': csv_headers,
            'csv_rows': csv_rows,
            'filename': f'enhanced-response-logs-{survey_id}-{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        })
        
    except Exception as e:
        print(f"Error exporting enhanced response logs: {e}")
        return jsonify({'error': f'Failed to export enhanced response logs: {str(e)}'}), 500

@enhanced_response_logs_bp.route('/api/click-analytics/<survey_id>', methods=['GET'])
@requireAuth
def get_click_analytics_detailed(survey_id):
    """Get detailed click analytics for a survey"""
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
        
        # Get click records
        click_records = get_click_records(str(survey['_id']))
        
        # Calculate analytics
        analytics = {
            'total_unique_users': len(click_records),
            'total_clicks': sum(record.get('click_count', 1) for record in click_records),
            'users_who_submitted': len([r for r in click_records if r.get('submission_status') == 'submitted']),
            'users_who_clicked_only': len([r for r in click_records if r.get('submission_status') == 'not_submitted']),
            'average_clicks_per_user': sum(record.get('click_count', 1) for record in click_records) / len(click_records) if click_records else 0,
            'device_breakdown': {},
            'browser_breakdown': {},
            'hourly_click_distribution': {}
        }
        
        # Device and browser breakdown
        for record in click_records:
            device_info = record.get('device_info', {})
            device_type = device_info.get('device_type', 'unknown')
            browser = device_info.get('browser', 'unknown')
            
            analytics['device_breakdown'][device_type] = analytics['device_breakdown'].get(device_type, 0) + 1
            analytics['browser_breakdown'][browser] = analytics['browser_breakdown'].get(browser, 0) + 1
        
        # Calculate conversion rate
        analytics['conversion_rate'] = (analytics['users_who_submitted'] / analytics['total_unique_users'] * 100) if analytics['total_unique_users'] > 0 else 0
        
        return jsonify({
            'success': True,
            'survey_id': survey_id,
            'analytics': analytics
        })
        
    except Exception as e:
        print(f"Error getting click analytics: {e}")
        return jsonify({'error': f'Failed to get click analytics: {str(e)}'}), 500
