#!/usr/bin/env python3

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime, timedelta
import requests
import json
from mongodb_config import db
from integrations import forward_survey_data_to_partners, log_postback_attempt

outbound_postback_bp = Blueprint('outbound_postback_bp', __name__)

@outbound_postback_bp.route('/outbound-postback/test', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def test_outbound_postback():
    """Manually trigger an outbound postback for testing purposes"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Use provided data or create test data
        test_data = data or {
            "transaction_id": f"TEST_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "reward": "5.00",
            "currency": "USD",
            "username": "test_user",
            "session_id": f"session_{datetime.utcnow().timestamp()}",
            "complete_id": f"complete_{datetime.utcnow().timestamp()}",
            "survey_id": "TEST_SURVEY",
            "email": "test@example.com",
            "status": "completed",
            "responses": {"q1": "answer1", "q2": "answer2"},
            "submitted_at": datetime.utcnow().isoformat()
        }
        
        print(f"🧪 Manual outbound postback test triggered")
        print(f"Test data: {test_data}")
        
        # Trigger the outbound postback system
        success = forward_survey_data_to_partners(test_data)
        
        if success:
            return jsonify({
                "message": "Outbound postback test completed successfully",
                "data_sent": test_data,
                "success": True
            }), 200
        else:
            return jsonify({
                "message": "Outbound postback test failed - no active partners or all failed",
                "data_sent": test_data,
                "success": False
            }), 200
            
    except Exception as e:
        print(f"❌ Error in test_outbound_postback: {str(e)}")
        return jsonify({"error": str(e)}), 500

@outbound_postback_bp.route('/outbound-postback/send-to-partner', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def send_to_specific_partner():
    """Send postback to a specific partner URL"""
    print("🔥 OUTBOUND POSTBACK ENDPOINT HIT!")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        print("🔄 OPTIONS request - returning CORS headers")
        return '', 200
    
    try:
        data = request.get_json()
        print(f"📥 Received data: {data}")
        
        if not data or 'partner_url' not in data:
            return jsonify({"error": "partner_url is required"}), 400
        
        partner_url = data['partner_url']
        partner_name = data.get('partner_name', 'Test Partner')
        
        # Create test postback data
        postback_data = {
            "transaction_id": data.get('transaction_id', f"TEST_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"),
            "reward": data.get('reward', "5.00"),
            "currency": data.get('currency', "USD"),
            "username": data.get('username', "test_user"),
            "session_id": data.get('session_id', f"session_{datetime.utcnow().timestamp()}"),
            "complete_id": data.get('complete_id', f"complete_{datetime.utcnow().timestamp()}"),
            "survey_id": data.get('survey_id', "TEST_SURVEY"),
            "email": data.get('email', "test@example.com"),
            "status": data.get('status', "completed"),
            "responses": data.get('responses', {"q1": "answer1", "q2": "answer2"}),
            "submitted_at": datetime.utcnow().isoformat()
        }
        
        # Replace placeholders in URL
        processed_url = replace_postback_parameters(partner_url, postback_data)
        
        print(f"🎯 Sending postback to specific partner: {partner_name}")
        print(f"URL: {processed_url}")
        
        # Send the postback
        try:
            print(f"🚀 Sending GET request to: {processed_url}")
            response = requests.get(processed_url, timeout=15)
            print(f"✅ Response received - Status: {response.status_code}")
            
            # Log the attempt
            log_postback_attempt(partner_name, processed_url, response.status_code, response.text)
            print(f"📝 Logged postback attempt to database")
            
            result = {
                "message": f"Postback sent to {partner_name}",
                "partner_name": partner_name,
                "url_sent": processed_url,
                "status_code": response.status_code,
                "response_text": response.text[:200],  # First 200 chars
                "success": response.status_code == 200,
                "data_sent": postback_data
            }
            print(f"🎯 Returning success response: {result}")
            return jsonify(result), 200
            
        except requests.exceptions.RequestException as e:
            # Log the failed attempt
            log_postback_attempt(partner_name, processed_url, 0, str(e))
            
            return jsonify({
                "message": f"Failed to send postback to {partner_name}",
                "partner_name": partner_name,
                "url_attempted": processed_url,
                "error": str(e),
                "success": False,
                "data_sent": postback_data
            }), 200
            
    except Exception as e:
        print(f"❌ Error in send_to_specific_partner: {str(e)}")
        return jsonify({"error": str(e)}), 500

def replace_postback_parameters(url, response_data):
    """
    Replace placeholder parameters in the postback URL with actual data.
    Enhanced version with more parameter support.
    """
    # Enhanced replacements from response data
    replacements = {
        '[TRANSACTION_ID]': response_data.get("transaction_id", ""),
        '[REWARD]': str(response_data.get("reward", 0)),
        '[PAYOUT]': str(response_data.get("reward", 0)),  # Alias for reward
        '[CURRENCY]': response_data.get("currency", "USD"),
        '[USERNAME]': response_data.get("username", "unknown"),
        '[SESSION_ID]': response_data.get("session_id", ""),
        '[COMPLETE_ID]': response_data.get("complete_id", ""),
        '[SURVEY_ID]': response_data.get("survey_id", ""),
        '[RESPONSES]': json.dumps(response_data.get("responses", {})),
        '[EMAIL]': response_data.get("email", ""),
        '[STATUS]': response_data.get("status", "completed"),
        '[CLICK_ID]': response_data.get("click_id", response_data.get("session_id", "")),
        '[OFFER_ID]': response_data.get("offer_id", response_data.get("survey_id", "")),
        '[CONVERSION_STATUS]': response_data.get("conversion_status", "confirmed"),
        '[SUB1]': response_data.get("sub1", ""),
        '[SUB2]': response_data.get("sub2", ""),
        '[EVENT_NAME]': response_data.get("event_name", "conversion"),
        '[TIMESTAMP]': datetime.utcnow().isoformat(),
        '[USER_ID]': response_data.get("user_id", ""),
        '[IP]': response_data.get("ip", ""),
    }
    
    processed_url = url
    for placeholder, value in replacements.items():
        processed_url = processed_url.replace(placeholder, str(value))
    
    return processed_url

@outbound_postback_bp.route('/outbound-postback/partners', methods=['GET'])
def get_active_partners():
    """Get list of active partners for postback sending"""
    try:
        partners_cursor = db.partners.find({"status": "active"})
        partners = []
        
        for partner in partners_cursor:
            partners.append({
                "id": str(partner["_id"]),
                "name": partner.get("name", "Unknown"),
                "url": partner.get("url", ""),
                "status": partner.get("status", "unknown"),
                "created_at": partner.get("created_at", "").strftime('%Y-%m-%d %H:%M:%S') if partner.get("created_at") else ""
            })
        
        return jsonify({
            "partners": partners,
            "count": len(partners)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting partners: {str(e)}")
        return jsonify({"error": str(e)}), 500
