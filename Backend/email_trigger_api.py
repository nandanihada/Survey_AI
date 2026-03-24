"""
Email Trigger API Routes
RESTful endpoints for managing email triggers and templates
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from email_trigger_service import email_trigger_service
from auth_middleware import requireAuth
import logging

# Create blueprint
email_trigger_bp = Blueprint('email_trigger', __name__)

logger = logging.getLogger(__name__)

# ============= EMAIL TEMPLATE ENDPOINTS =============

@email_trigger_bp.route('/email-templates', methods=['POST'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def create_email_template():
    """Create a new email template"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.create_email_template(data, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Error in create_email_template: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-templates', methods=['GET'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def get_email_templates():
    """Get all email templates for current user"""
    try:
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.get_email_templates(user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in get_email_templates: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-templates/<template_id>', methods=['PUT'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def update_email_template(template_id):
    """Update an email template"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.update_email_template(template_id, data, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in update_email_template: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-templates/<template_id>', methods=['DELETE'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def delete_email_template(template_id):
    """Delete an email template"""
    try:
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.delete_email_template(template_id, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in delete_email_template: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ============= EMAIL TRIGGER ENDPOINTS =============

@email_trigger_bp.route('/email-triggers', methods=['POST'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def create_email_trigger():
    """Create a new email trigger"""
    try:
        data = request.get_json()
        print(f"DEBUG: Raw request data: {data}")
        print(f"DEBUG: Request headers: {dict(request.headers)}")
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        print(f"DEBUG: X-User-ID header: {user_id}")
        
        result = email_trigger_service.create_email_trigger(data, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Error in create_email_trigger: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-triggers', methods=['GET'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def get_email_triggers():
    """Get all email triggers for a survey"""
    try:
        survey_id = request.args.get('survey_id')
        if not survey_id:
            return jsonify({"error": "survey_id is required"}), 400
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.get_email_triggers(survey_id, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in get_email_triggers: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-triggers/<trigger_id>', methods=['PUT'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def update_email_trigger(trigger_id):
    """Update an email trigger"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.update_email_trigger(trigger_id, data, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in update_email_trigger: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-triggers/<trigger_id>', methods=['DELETE'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def delete_email_trigger(trigger_id):
    """Delete an email trigger"""
    try:
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.delete_email_trigger(trigger_id, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in delete_email_trigger: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ============= EMAIL LOGS ENDPOINTS =============

@email_trigger_bp.route('/email-logs', methods=['GET'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def get_email_logs():
    """Get email sending logs"""
    try:
        survey_id = request.args.get('survey_id')
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.get_email_logs(user_id, survey_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in get_email_logs: {e}")
        return jsonify({"error": "Internal server error"}), 500

@email_trigger_bp.route('/email-triggers/test', methods=['POST'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def test_email_trigger():
    """Test email trigger with sample data"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        template_id = data.get("template_id")
        test_email = data.get("test_email")
        variables = data.get("variables", {})
        
        if not template_id or not test_email:
            return jsonify({"error": "template_id and test_email are required"}), 400
        
        # Get user ID from request
        user_id = request.headers.get('X-User-ID', 'anonymous')
        
        result = email_trigger_service.test_email_template(template_id, test_email, variables, user_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in test_email_trigger: {e}")
        return jsonify({"error": "Internal server error"}), 500
