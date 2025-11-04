#!/usr/bin/env python3

"""
User-Based Postback System
Sends postbacks to survey creators when their surveys are completed
"""

import requests
import json
from datetime import datetime, timezone
from mongodb_config import db
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

def send_postback_to_survey_creator(survey_id, survey_completion_data):
    """
    Send postback to the user who created the survey
    
    Args:
        survey_id: The ID of the completed survey
        survey_completion_data: Dict containing all survey completion data
    
    Returns:
        dict: Result of the postback attempt
    """
    print(f"\n🎯 USER-BASED POSTBACK: Survey {survey_id}")
    print("="*60)
    
    try:
        # Step 1: Find the survey and get creator info
        survey = db.surveys.find_one({
            "$or": [{"_id": survey_id}, {"id": survey_id}]
        })
        
        if not survey:
            print(f"❌ Survey not found: {survey_id}")
            return {
                "success": False,
                "error": "Survey not found",
                "survey_id": survey_id
            }
        
        # Get creator user ID from survey
        creator_user_id = survey.get('ownerUserId') or survey.get('user_id')
        creator_email = survey.get('creator_email')
        
        print(f"📋 Survey found: {survey.get('prompt', 'No prompt')[:50]}...")
        print(f"👤 Creator ID: {creator_user_id}")
        print(f"📧 Creator Email: {creator_email}")
        
        if not creator_user_id:
            print(f"❌ No creator user ID found in survey")
            return {
                "success": False,
                "error": "No creator user ID found in survey",
                "survey_id": survey_id
            }
        
        # Step 2: Find the creator user and get their postback URL
        from bson import ObjectId
        try:
            # Try to find user by ObjectId first
            creator_user = db.users.find_one({"_id": ObjectId(creator_user_id)})
        except:
            # If that fails, try as string
            creator_user = db.users.find_one({"_id": creator_user_id})
        
        # Also try by email as fallback
        if not creator_user and creator_email:
            creator_user = db.users.find_one({"email": creator_email})
        
        if not creator_user:
            print(f"❌ Creator user not found: {creator_user_id}")
            return {
                "success": False,
                "error": "Creator user not found",
                "survey_id": survey_id,
                "creator_user_id": creator_user_id
            }
        
        # Get postback URL and parameter mappings
        postback_url = creator_user.get('postbackUrl', '')
        parameter_mappings = creator_user.get('parameterMappings', {})
        postback_method = creator_user.get('postbackMethod', 'GET')  # GET or POST
        include_responses = creator_user.get('includeResponses', True)  # Include survey answers
        creator_name = creator_user.get('name', 'Unknown')
        
        print(f"✅ Creator found: {creator_name} ({creator_user.get('email', 'No email')})")
        print(f"🔗 Postback URL: {postback_url}")
        print(f"📋 Parameter mappings: {parameter_mappings}")
        print(f"📤 Postback method: {postback_method}")
        print(f"📝 Include responses: {include_responses}")
        
        if not postback_url:
            print(f"❌ No postback URL configured for creator")
            return {
                "success": False,
                "error": "No postback URL configured for creator",
                "survey_id": survey_id,
                "creator_name": creator_name
            }
        
        # Step 3: Build the postback URL with user's custom parameter mappings
        final_url, post_data = build_user_postback_url(
            postback_url, 
            parameter_mappings, 
            survey_completion_data,
            survey_id,
            postback_method,
            include_responses
        )
        
        print(f"🚀 Final postback URL: {final_url}")
        if post_data:
            print(f"📦 POST data size: {len(json.dumps(post_data))} bytes")
        
        # Step 4: Send the postback
        result = send_single_postback(
            creator_name, 
            final_url, 
            creator_user_id, 
            survey_id,
            method=postback_method,
            post_data=post_data
        )
        
        # Step 5: Log the result
        log_user_postback_attempt(result, survey_id, creator_user_id)
        
        if result['success']:
            print(f"✅ Postback to creator {creator_name} successful")
        else:
            print(f"❌ Postback to creator {creator_name} failed: {result.get('error', 'Unknown error')}")
        
        print("="*60)
        return result
        
    except Exception as e:
        print(f"❌ Error in send_postback_to_survey_creator: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "survey_id": survey_id
        }

def build_user_postback_url(base_url, parameter_mappings, completion_data, survey_id, method='GET', include_responses=True):
    """
    Build postback URL using user's custom parameter mappings
    
    Args:
        base_url: User's postback URL template
        parameter_mappings: User's custom parameter mappings
        completion_data: Survey completion data
        survey_id: Survey ID
        method: 'GET' or 'POST'
        include_responses: Whether to include survey responses
    
    Returns:
        tuple: (final_url, post_data) - post_data is None for GET requests
    """
    
    # Prepare comprehensive data that can be mapped
    available_data = {
        'transaction_id': completion_data.get('transaction_id', completion_data.get('response_id', '')),
        'survey_id': survey_id,
        'username': completion_data.get('username', ''),
        'email': completion_data.get('email', ''),
        'user_id': completion_data.get('user_id', ''),
        'simple_user_id': completion_data.get('simple_user_id', ''),
        'session_id': completion_data.get('session_id', ''),
        'click_id': completion_data.get('click_id', ''),
        'ip_address': completion_data.get('ip_address', ''),
        'payout': completion_data.get('reward', '0.1'),
        'currency': completion_data.get('currency', 'USD'),
        'status': completion_data.get('status', 'completed'),
        'timestamp': str(int(datetime.now(timezone.utc).timestamp())),
        'aff_sub': completion_data.get('aff_sub', ''),
        'sub1': completion_data.get('sub1', ''),
        'sub2': completion_data.get('sub2', ''),
        'responses_count': str(len(completion_data.get('responses', []))),
        'completion_time': completion_data.get('completion_time', '0'),
        'user_agent': completion_data.get('user_agent', ''),
        'referrer': completion_data.get('referrer', ''),
        'evaluation_result': completion_data.get('evaluation_result', 'unknown')
    }
    
    # Add responses if enabled
    if include_responses:
        available_data['responses'] = completion_data.get('responses', [])
    
    print(f"📊 Available data for mapping: {list(available_data.keys())}")
    
    # Parse the base URL
    parsed_url = urlparse(base_url)
    query_params = parse_qs(parsed_url.query, keep_blank_values=True)
    
    # For POST method, send data in body
    if method == 'POST':
        # Build POST data with all available data
        post_data = {}
        
        # Apply parameter mappings
        for our_field, user_param_name in parameter_mappings.items():
            if our_field in available_data and user_param_name:
                value = available_data[our_field]
                # Keep responses as array/list for POST
                post_data[user_param_name] = value
                print(f"   Mapped (POST): {our_field} → {user_param_name}")
        
        # If no mappings, send all data with original field names
        if not post_data:
            post_data = available_data.copy()
            print(f"   Using all available data (no custom mappings)")
        
        # Return base URL and POST data
        return base_url, post_data
    
    # For GET method, use query parameters
    else:
        # Apply user's parameter mappings
        for our_field, user_param_name in parameter_mappings.items():
            if our_field in available_data and user_param_name:
                value = available_data[our_field]
                # Convert responses to JSON string for GET
                if our_field == 'responses' and isinstance(value, (list, dict)):
                    value = json.dumps(value)
                query_params[user_param_name] = [str(value)]
                print(f"   Mapped (GET): {our_field} → {user_param_name} = {str(value)[:50]}...")
        
        # Also replace any placeholders in the URL template
        final_url = base_url
        for our_field, value in available_data.items():
            # Replace {field_name} placeholders
            placeholder = '{' + our_field + '}'
            if placeholder in final_url:
                # Convert to string, handle responses specially
                if our_field == 'responses' and isinstance(value, (list, dict)):
                    value_str = json.dumps(value)
                else:
                    value_str = str(value)
                final_url = final_url.replace(placeholder, value_str)
                print(f"   Replaced placeholder: {placeholder} → {value_str[:50]}...")
        
        # If we added query parameters, rebuild the URL
        if any(our_field in parameter_mappings for our_field in available_data.keys()):
            # Convert query_params back to string format
            new_query = urlencode(query_params, doseq=True)
            final_url = urlunparse((
                parsed_url.scheme,
                parsed_url.netloc,
                parsed_url.path,
                parsed_url.params,
                new_query,
                parsed_url.fragment
            ))
        
        return final_url, None

def send_single_postback(creator_name, postback_url, creator_user_id, survey_id, method='GET', post_data=None):
    """
    Send a single postback to the survey creator
    
    Args:
        creator_name: Name of the survey creator
        postback_url: Complete postback URL with parameters
        creator_user_id: Creator's user ID
        survey_id: Survey ID
        method: 'GET' or 'POST'
        post_data: Data to send in POST body (for POST method)
    
    Returns:
        dict: Result of the postback attempt
    """
    try:
        if method == 'POST' and post_data:
            print(f"🚀 Sending POST postback to creator {creator_name}: {postback_url}")
            print(f"📦 POST data keys: {list(post_data.keys())}")
            
            # Send POST request with JSON body
            response = requests.post(
                postback_url, 
                json=post_data,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
        else:
            print(f"🚀 Sending GET postback to creator {creator_name}: {postback_url}")
            
            # Send GET request
            response = requests.get(postback_url, timeout=15)
        
        # Prepare result
        result = {
            "success": response.status_code == 200,
            "creator_name": creator_name,
            "creator_user_id": creator_user_id,
            "survey_id": survey_id,
            "url": postback_url,
            "status_code": response.status_code,
            "response_text": response.text[:200],  # First 200 chars
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "creator_name": creator_name,
            "creator_user_id": creator_user_id,
            "survey_id": survey_id,
            "url": postback_url,
            "status_code": 0,
            "error": "Request timeout (15s)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "creator_name": creator_name,
            "creator_user_id": creator_user_id,
            "survey_id": survey_id,
            "url": postback_url,
            "status_code": 0,
            "error": "Connection error",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "creator_name": creator_name,
            "creator_user_id": creator_user_id,
            "survey_id": survey_id,
            "url": postback_url,
            "status_code": 0,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

def log_user_postback_attempt(result, survey_id, creator_user_id):
    """
    Log the postback attempt to database
    """
    try:
        log_entry = {
            "type": "user_postback",
            "survey_id": survey_id,
            "creator_user_id": creator_user_id,
            "creator_name": result.get("creator_name", "Unknown"),
            "url": result["url"],
            "status": "success" if result["success"] else "failure",
            "status_code": result["status_code"],
            "response": result.get("response_text", result.get("error", "")),
            "timestamp": datetime.now(timezone.utc),
            "error": result.get("error", None)
        }
        
        # Save to user postback logs collection
        db.user_postback_logs.insert_one(log_entry)
        print(f"📝 Logged user postback attempt for {result.get('creator_name', 'Unknown')}")
        
    except Exception as log_error:
        print(f"❌ Error logging user postback attempt: {log_error}")

# Export the main function
__all__ = ['send_postback_to_survey_creator']
