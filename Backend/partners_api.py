#!/usr/bin/env python3

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime
from mongodb_config import db
from bson import ObjectId
import traceback

partners_api_bp = Blueprint('partners_api_bp', __name__)

def convert_objectid(obj):
    """Convert ObjectId to string for JSON serialization"""
    if isinstance(obj, dict):
        return {key: convert_objectid(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    else:
        return obj

@partners_api_bp.route('/partners', methods=['GET'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
def get_partners():
    """Get all partners"""
    print("🔍 get_partners endpoint called")
    try:
        if db is None:
            print("❌ Database connection not available")
            return jsonify({"error": "Database connection not available"}), 500
        
        print("📊 Querying partners collection...")
        partners_cursor = db.partners.find().sort("created_at", -1)
        partners = []
        
        for partner in partners_cursor:
            partner_data = convert_objectid(partner)
            # Ensure required fields exist
            if 'created_at' not in partner_data:
                partner_data['created_at'] = datetime.utcnow()
            if 'status' not in partner_data:
                partner_data['status'] = 'inactive'
            partners.append(partner_data)
        
        print(f"✅ Retrieved {len(partners)} partners")
        return jsonify(partners)
    except Exception as e:
        print(f"❌ Error in get_partners: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@partners_api_bp.route('/partners', methods=['POST'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
def add_partner():
    """Add a new partner"""
    print("🔥 add_partner endpoint called")
    try:
        data = request.get_json()
        print(f"📥 Received data: {data}")
        
        if not data or 'name' not in data or 'url' not in data:
            return jsonify({"error": "name and url are required"}), 400
        
        partner_data = {
            "name": data['name'],
            "url": data['url'],
            "status": data.get('status', 'active'),  # Default to active
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        print(f"💾 Inserting partner: {partner_data}")
        result = db.partners.insert_one(partner_data)
        
        # Return the created partner with ID
        partner_data['id'] = str(result.inserted_id)
        partner_data = convert_objectid(partner_data)
        
        print(f"✅ Partner created with ID: {partner_data['id']}")
        return jsonify(partner_data), 201
        
    except Exception as e:
        print(f"❌ Error in add_partner: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@partners_api_bp.route('/partners/<partner_id>', methods=['PUT'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
def update_partner(partner_id):
    """Update an existing partner"""
    print(f"🔄 update_partner endpoint called for ID: {partner_id}")
    try:
        data = request.get_json()
        print(f"📥 Received data: {data}")
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        # Update allowed fields
        if 'name' in data:
            update_data['name'] = data['name']
        if 'url' in data:
            update_data['url'] = data['url']
        if 'status' in data:
            update_data['status'] = data['status']
        
        print(f"💾 Updating partner {partner_id} with: {update_data}")
        result = db.partners.update_one(
            {"_id": ObjectId(partner_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Partner not found"}), 404
        
        print(f"✅ Partner {partner_id} updated successfully")
        return jsonify({"message": "Partner updated successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error in update_partner: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@partners_api_bp.route('/partners/<partner_id>', methods=['DELETE'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
def delete_partner(partner_id):
    """Delete a partner"""
    print(f"🗑️ delete_partner endpoint called for ID: {partner_id}")
    try:
        result = db.partners.delete_one({"_id": ObjectId(partner_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Partner not found"}), 404
        
        print(f"✅ Partner {partner_id} deleted successfully")
        return jsonify({"message": "Partner deleted successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error in delete_partner: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@partners_api_bp.route('/partners/<partner_id>/send-postback', methods=['POST'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
def send_postback_to_partner(partner_id):
    """Send a test postback to a specific partner"""
    print(f"🚀 send_postback_to_partner endpoint called for ID: {partner_id}")
    try:
        # Get partner details
        partner = db.partners.find_one({"_id": ObjectId(partner_id)})
        if not partner:
            return jsonify({"error": "Partner not found"}), 404
        
        partner_name = partner.get('name', 'Unknown Partner')
        partner_url = partner.get('url', '')
        
        if not partner_url:
            return jsonify({"error": "Partner URL not configured"}), 400
        
        # Import the outbound postback functionality
        from integrations import replace_postback_parameters, log_postback_attempt
        import requests
        
        # Create test postback data
        test_data = {
            "transaction_id": f"MANUAL_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "reward": "5.00",
            "currency": "USD",
            "username": "test_user",
            "session_id": f"session_{datetime.utcnow().timestamp()}",
            "complete_id": f"complete_{datetime.utcnow().timestamp()}",
            "survey_id": "MANUAL_TEST",
            "email": "test@example.com",
            "status": "completed",
            "click_id": f"click_{datetime.utcnow().timestamp()}",
            "offer_id": "TEST_OFFER",
            "conversion_status": "confirmed",
            "sub1": "manual_test",
            "sub2": "frontend_test",
            "event_name": "conversion",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Replace placeholders in URL
        processed_url = replace_postback_parameters(partner_url, test_data)
        
        print(f"🎯 Sending postback to {partner_name}")
        print(f"URL: {processed_url}")
        
        # Send the postback
        try:
            response = requests.get(processed_url, timeout=15)
            
            # Log the attempt
            log_postback_attempt(partner_name, processed_url, response.status_code, response.text)
            
            result = {
                "message": f"Postback sent to {partner_name}",
                "partner_name": partner_name,
                "url_sent": processed_url,
                "status_code": response.status_code,
                "response_text": response.text[:200],  # First 200 chars
                "success": response.status_code == 200,
                "data_sent": test_data
            }
            
            print(f"✅ Postback sent successfully: {result}")
            return jsonify(result), 200
            
        except requests.exceptions.RequestException as e:
            # Log the failed attempt
            log_postback_attempt(partner_name, processed_url, 0, str(e))
            
            result = {
                "message": f"Failed to send postback to {partner_name}",
                "partner_name": partner_name,
                "url_attempted": processed_url,
                "error": str(e),
                "success": False,
                "data_sent": test_data
            }
            
            print(f"❌ Postback failed: {result}")
            return jsonify(result), 200
            
    except Exception as e:
        print(f"❌ Error in send_postback_to_partner: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
