#!/usr/bin/env python3

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from mongodb_config import db
from datetime import datetime
from bson import ObjectId
import uuid

survey_partner_mapping_bp = Blueprint('survey_partner_mapping_bp', __name__)

# Helper to convert ObjectId to string
def convert_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

# Our standard data fields that we can send to partners
AVAILABLE_DATA_FIELDS = {
    "transaction_id": "Unique transaction identifier",
    "survey_id": "Survey identifier", 
    "username": "User's username or identifier",
    "email": "User's email address",
    "user_id": "User's ID in our system",
    "simple_user_id": "User's simple numeric ID",
    "session_id": "Survey session identifier",
    "click_id": "Click tracking identifier",
    "ip_address": "User's IP address",
    "payout": "Payout amount",
    "currency": "Currency code (USD, EUR, etc.)",
    "status": "Completion status (completed, failed, etc.)",
    "timestamp": "Completion timestamp",
    "aff_sub": "Affiliate sub-identifier",
    "sub1": "Sub parameter 1",
    "sub2": "Sub parameter 2",
    "responses": "Survey responses (JSON format)",
    "responses_flat": "Survey responses (flat key=value format)",
    "responses_count": "Number of survey responses",
    "responses_summary": "Brief summary of responses",
    "completion_time": "Time taken to complete survey",
    "user_agent": "User's browser user agent",
    "referrer": "Page referrer URL"
}

@survey_partner_mapping_bp.route('/survey-partner-mappings', methods=['POST', 'OPTIONS'])
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
def create_survey_partner_mapping():
    """Create a new survey-partner mapping with parameter configuration"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['survey_id', 'partner_id', 'postback_url']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Validate survey exists
        survey = db.surveys.find_one({"_id": data['survey_id']})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        # Validate partner exists
        try:
            partner = db.partners.find_one({"_id": ObjectId(data['partner_id'])})
            if not partner:
                return jsonify({"error": "Partner not found"}), 404
        except Exception:
            return jsonify({"error": "Invalid partner ID"}), 400
        
        # Validate postback URL
        postback_url = data['postback_url'].strip()
        if not postback_url.startswith(('http://', 'https://')):
            return jsonify({"error": "Postback URL must start with http:// or https://"}), 400
        
        # Process parameter mappings
        parameter_mappings = data.get('parameter_mappings', {})
        
        # Validate parameter mappings - ensure all mapped fields exist in our available data
        invalid_fields = []
        for our_field, partner_param in parameter_mappings.items():
            if our_field not in AVAILABLE_DATA_FIELDS:
                invalid_fields.append(our_field)
        
        if invalid_fields:
            return jsonify({
                "error": f"Invalid data fields: {', '.join(invalid_fields)}",
                "available_fields": list(AVAILABLE_DATA_FIELDS.keys())
            }), 400
        
        # Check if mapping already exists for this survey-partner combination
        existing_mapping = db.survey_partner_mappings.find_one({
            "survey_id": data['survey_id'],
            "partner_id": ObjectId(data['partner_id'])
        })
        
        if existing_mapping:
            return jsonify({"error": "Mapping already exists for this survey-partner combination"}), 409
        
        # Create the mapping document
        mapping_data = {
            "survey_id": data['survey_id'],
            "partner_id": ObjectId(data['partner_id']),
            "partner_name": partner.get('name', 'Unknown Partner'),
            "postback_url": postback_url,
            "parameter_mappings": parameter_mappings,
            "status": data.get('status', 'active'),
            "send_on_completion": data.get('send_on_completion', True),
            "send_on_failure": data.get('send_on_failure', False),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert the mapping
        result = db.survey_partner_mappings.insert_one(mapping_data)
        mapping_data['id'] = str(result.inserted_id)
        mapping_data['partner_id'] = str(mapping_data['partner_id'])
        del mapping_data['_id']
        
        print(f"✅ Created survey-partner mapping: Survey {data['survey_id']} → Partner {partner.get('name')}")
        print(f"📋 Parameter mappings: {parameter_mappings}")
        
        return jsonify({
            "message": "Survey-partner mapping created successfully",
            "mapping": mapping_data
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating survey-partner mapping: {str(e)}")
        return jsonify({"error": str(e)}), 500

@survey_partner_mapping_bp.route('/survey-partner-mappings/<survey_id>', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app", 
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "OPTIONS"]
)
def get_survey_partner_mappings(survey_id):
    """Get all partner mappings for a specific survey"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Find all mappings for this survey
        mappings_cursor = db.survey_partner_mappings.find({"survey_id": survey_id})
        mappings = []
        
        for mapping in mappings_cursor:
            mapping_data = convert_objectid(mapping)
            mapping_data['partner_id'] = str(mapping_data['partner_id'])
            mappings.append(mapping_data)
        
        return jsonify({
            "survey_id": survey_id,
            "mappings": mappings,
            "total_mappings": len(mappings)
        })
        
    except Exception as e:
        print(f"❌ Error getting survey partner mappings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@survey_partner_mapping_bp.route('/survey-partner-mappings/<mapping_id>', methods=['PUT', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["PUT", "OPTIONS"]
)
def update_survey_partner_mapping(mapping_id):
    """Update an existing survey-partner mapping"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Find existing mapping
        try:
            existing_mapping = db.survey_partner_mappings.find_one({"_id": ObjectId(mapping_id)})
            if not existing_mapping:
                return jsonify({"error": "Mapping not found"}), 404
        except Exception:
            return jsonify({"error": "Invalid mapping ID"}), 400
        
        # Prepare update data
        update_data = {"updated_at": datetime.utcnow()}
        
        # Update allowed fields
        if 'postback_url' in data:
            postback_url = data['postback_url'].strip()
            if not postback_url.startswith(('http://', 'https://')):
                return jsonify({"error": "Postback URL must start with http:// or https://"}), 400
            update_data['postback_url'] = postback_url
        
        if 'parameter_mappings' in data:
            parameter_mappings = data['parameter_mappings']
            # Validate parameter mappings
            invalid_fields = []
            for our_field, partner_param in parameter_mappings.items():
                if our_field not in AVAILABLE_DATA_FIELDS:
                    invalid_fields.append(our_field)
            
            if invalid_fields:
                return jsonify({
                    "error": f"Invalid data fields: {', '.join(invalid_fields)}",
                    "available_fields": list(AVAILABLE_DATA_FIELDS.keys())
                }), 400
            
            update_data['parameter_mappings'] = parameter_mappings
        
        if 'status' in data:
            update_data['status'] = data['status']
        
        if 'send_on_completion' in data:
            update_data['send_on_completion'] = data['send_on_completion']
        
        if 'send_on_failure' in data:
            update_data['send_on_failure'] = data['send_on_failure']
        
        # Update the mapping
        result = db.survey_partner_mappings.update_one(
            {"_id": ObjectId(mapping_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Mapping not found"}), 404
        
        # Return updated mapping
        updated_mapping = db.survey_partner_mappings.find_one({"_id": ObjectId(mapping_id)})
        updated_mapping = convert_objectid(updated_mapping)
        updated_mapping['partner_id'] = str(updated_mapping['partner_id'])
        
        return jsonify({
            "message": "Mapping updated successfully",
            "mapping": updated_mapping
        })
        
    except Exception as e:
        print(f"❌ Error updating survey-partner mapping: {str(e)}")
        return jsonify({"error": str(e)}), 500

@survey_partner_mapping_bp.route('/survey-partner-mappings/<mapping_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["DELETE", "OPTIONS"]
)
def delete_survey_partner_mapping(mapping_id):
    """Delete a survey-partner mapping"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Delete the mapping
        result = db.survey_partner_mappings.delete_one({"_id": ObjectId(mapping_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Mapping not found"}), 404
        
        return jsonify({"message": "Mapping deleted successfully"})
        
    except Exception as e:
        print(f"❌ Error deleting survey-partner mapping: {str(e)}")
        return jsonify({"error": str(e)}), 500

@survey_partner_mapping_bp.route('/available-data-fields', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "OPTIONS"]
)
def get_available_data_fields():
    """Get list of available data fields that can be mapped to partner parameters"""
    if request.method == 'OPTIONS':
        return '', 200
    
    return jsonify({
        "available_fields": AVAILABLE_DATA_FIELDS,
        "total_fields": len(AVAILABLE_DATA_FIELDS)
    })

# Helper function to build postback URL with parameter mapping
def build_mapped_postback_url(base_url, parameter_mappings, survey_data):
    """
    Build postback URL by replacing parameters based on mapping configuration
    
    Args:
        base_url: Partner's postback URL template
        parameter_mappings: Dict mapping our fields to partner parameter names
        survey_data: Dict containing our survey completion data
    
    Returns:
        Complete postback URL with parameters replaced
    """
    try:
        url = base_url
        
        # Replace each mapped parameter
        for our_field, partner_param in parameter_mappings.items():
            if our_field in survey_data:
                value = survey_data[our_field]
                # Handle different data types
                if isinstance(value, dict):
                    import json
                    value = json.dumps(value)
                elif value is None:
                    value = ""
                else:
                    value = str(value)
                
                # Replace parameter in URL - look for our field name in the URL
                placeholder = f"{{{our_field}}}"
                url = url.replace(placeholder, value)
                
                # Also replace if partner uses their parameter name
                partner_placeholder = f"{{{partner_param}}}"
                url = url.replace(partner_placeholder, value)
        
        return url
        
    except Exception as e:
        print(f"❌ Error building mapped postback URL: {e}")
        return base_url

# Export the helper function for use in other modules
__all__ = ['survey_partner_mapping_bp', 'build_mapped_postback_url', 'AVAILABLE_DATA_FIELDS']
