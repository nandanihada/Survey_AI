"""
Redirect Rules API
CRUD endpoints for managing per-survey redirect endpoints, rules, and S2S configurations.
Supports N redirect endpoints per survey with priority-based answer-conditional routing.
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import json
from mongodb_config import db
from auth_middleware import requireAuth

redirect_rules_bp = Blueprint('redirect_rules_bp', __name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pepperadsresponses.web.app",
    "https://hostsliceresponse.web.app",
    "https://theinterwebsite.space",
    "https://dashboard.pepperwahl.com",
    "https://pepperwahl.com"
]


# ═══════════════════════════════════════════════════════
#  REDIRECT ENDPOINTS CRUD
# ═══════════════════════════════════════════════════════

@redirect_rules_bp.route('/redirect-rules/<survey_id>/endpoints', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_redirect_endpoints(survey_id):
    """Get all redirect endpoints for a survey"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if not config:
            return jsonify({"endpoints": [], "survey_id": survey_id}), 200
        
        endpoints = config.get("redirect_endpoints", [])
        return jsonify({"endpoints": endpoints, "survey_id": survey_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/endpoints', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def create_redirect_endpoint(survey_id):
    """Create a new redirect endpoint for a survey"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        name = data.get("name", "").strip()
        url = data.get("url", "").strip()
        
        if not name:
            return jsonify({"error": "Endpoint name is required"}), 400
        if not url:
            return jsonify({"error": "Endpoint URL is required"}), 400
        
        endpoint = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "url": url,
            "status_code": data.get("status_code", 1),
            "color": data.get("color", "#6b7280"),
            "description": data.get("description", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert the config document
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {
                "$push": {"redirect_endpoints": endpoint},
                "$setOnInsert": {
                    "survey_id": survey_id,
                    "redirect_rules": [],
                    "default_redirect_endpoint_id": None,
                    "s2s_config": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        return jsonify({"message": "Endpoint created", "endpoint": endpoint}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/endpoints/<endpoint_id>', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def update_redirect_endpoint(survey_id, endpoint_id):
    """Update an existing redirect endpoint"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        update_fields = {}
        if "name" in data:
            update_fields["redirect_endpoints.$.name"] = data["name"].strip()
        if "url" in data:
            update_fields["redirect_endpoints.$.url"] = data["url"].strip()
        if "status_code" in data:
            update_fields["redirect_endpoints.$.status_code"] = data["status_code"]
        if "color" in data:
            update_fields["redirect_endpoints.$.color"] = data["color"]
        if "description" in data:
            update_fields["redirect_endpoints.$.description"] = data["description"]
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = db.redirect_rules_config.update_one(
            {"survey_id": survey_id, "redirect_endpoints.id": endpoint_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Endpoint not found"}), 404
        
        return jsonify({"message": "Endpoint updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/endpoints/<endpoint_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def delete_redirect_endpoint(survey_id, endpoint_id):
    """Delete a redirect endpoint"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        # Also remove any rules that reference this endpoint
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {
                "$pull": {
                    "redirect_endpoints": {"id": endpoint_id},
                    "redirect_rules": {"redirect_endpoint_id": endpoint_id}
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # If default was this endpoint, clear it
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if config and config.get("default_redirect_endpoint_id") == endpoint_id:
            db.redirect_rules_config.update_one(
                {"survey_id": survey_id},
                {"$set": {"default_redirect_endpoint_id": None}}
            )
        
        return jsonify({"message": "Endpoint deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  REDIRECT RULES CRUD
# ═══════════════════════════════════════════════════════

@redirect_rules_bp.route('/redirect-rules/<survey_id>/rules', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_redirect_rules(survey_id):
    """Get all redirect rules for a survey"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if not config:
            return jsonify({
                "rules": [],
                "default_redirect_endpoint_id": None,
                "survey_id": survey_id
            }), 200
        
        rules = config.get("redirect_rules", [])
        # Sort by priority
        rules.sort(key=lambda r: r.get("priority", 999))
        
        return jsonify({
            "rules": rules,
            "default_redirect_endpoint_id": config.get("default_redirect_endpoint_id"),
            "survey_id": survey_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/rules', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def create_redirect_rule(survey_id):
    """Create a new redirect rule"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        condition_type = data.get("condition_type")
        redirect_endpoint_id = data.get("redirect_endpoint_id")
        
        if not condition_type:
            return jsonify({"error": "condition_type is required"}), 400
        if not redirect_endpoint_id:
            return jsonify({"error": "redirect_endpoint_id is required"}), 400
        
        # Validate condition_type
        valid_types = ["answer_based", "criteria_set", "evaluation_result", "score_based", "always"]
        if condition_type not in valid_types:
            return jsonify({"error": f"condition_type must be one of: {valid_types}"}), 400
        
        # Get current max priority
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        existing_rules = config.get("redirect_rules", []) if config else []
        max_priority = max([r.get("priority", 0) for r in existing_rules], default=0)
        
        rule = {
            "id": str(uuid.uuid4())[:8],
            "priority": data.get("priority", max_priority + 1),
            "name": data.get("name", ""),
            "condition_type": condition_type,
            "question_id": data.get("question_id", ""),
            "condition": data.get("condition", "equals"),
            "expected_value": data.get("expected_value", ""),
            "redirect_endpoint_id": redirect_endpoint_id,
            "fire_s2s": data.get("fire_s2s", True),
            "is_active": data.get("is_active", True),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {
                "$push": {"redirect_rules": rule},
                "$setOnInsert": {
                    "survey_id": survey_id,
                    "redirect_endpoints": [],
                    "default_redirect_endpoint_id": None,
                    "s2s_config": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        return jsonify({"message": "Rule created", "rule": rule}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/rules/<rule_id>', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def update_redirect_rule(survey_id, rule_id):
    """Update an existing redirect rule"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        update_fields = {}
        allowed_fields = ["priority", "name", "condition_type", "question_id", 
                         "condition", "expected_value", "redirect_endpoint_id",
                         "fire_s2s", "is_active"]
        
        for field in allowed_fields:
            if field in data:
                update_fields[f"redirect_rules.$.{field}"] = data[field]
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = db.redirect_rules_config.update_one(
            {"survey_id": survey_id, "redirect_rules.id": rule_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Rule not found"}), 404
        
        return jsonify({"message": "Rule updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/rules/<rule_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def delete_redirect_rule(survey_id, rule_id):
    """Delete a redirect rule"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {
                "$pull": {"redirect_rules": {"id": rule_id}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return jsonify({"message": "Rule deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/rules/reorder', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def reorder_redirect_rules(survey_id):
    """Reorder rules by setting new priorities"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        rule_order = data.get("rule_order", [])  # List of rule IDs in new order
        
        if not rule_order:
            return jsonify({"error": "rule_order array is required"}), 400
        
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if not config:
            return jsonify({"error": "No config found"}), 404
        
        rules = config.get("redirect_rules", [])
        
        # Update priorities based on new order
        for idx, rule_id in enumerate(rule_order):
            for rule in rules:
                if rule["id"] == rule_id:
                    rule["priority"] = idx + 1
                    break
        
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {"$set": {
                "redirect_rules": rules,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return jsonify({"message": "Rules reordered"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  DEFAULT ENDPOINT & S2S CONFIG
# ═══════════════════════════════════════════════════════

@redirect_rules_bp.route('/redirect-rules/<survey_id>/default', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def set_default_endpoint(survey_id):
    """Set the default redirect endpoint (fallback when no rules match)"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        endpoint_id = data.get("default_redirect_endpoint_id")
        
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {
                "$set": {
                    "default_redirect_endpoint_id": endpoint_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return jsonify({"message": "Default endpoint set"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/s2s-config', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_s2s_config(survey_id):
    """Get S2S integration config for a survey"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        s2s = config.get("s2s_config") if config else None
        return jsonify({"s2s_config": s2s, "survey_id": survey_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/s2s-config', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def update_s2s_config(survey_id):
    """Update S2S integration config"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        s2s_config = {
            "enabled": data.get("enabled", False),
            "partner_name": data.get("partner_name", ""),
            "endpoint": data.get("endpoint", ""),
            "api_key": data.get("api_key", ""),
            "method": data.get("method", "POST"),
            "headers": data.get("headers", {}),
            "body_template": data.get("body_template", {}),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.redirect_rules_config.update_one(
            {"survey_id": survey_id},
            {
                "$set": {
                    "s2s_config": s2s_config,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "survey_id": survey_id,
                    "redirect_endpoints": [],
                    "redirect_rules": [],
                    "default_redirect_endpoint_id": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return jsonify({"message": "S2S config updated", "s2s_config": s2s_config}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@redirect_rules_bp.route('/redirect-rules/<survey_id>/s2s-config/test', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def test_s2s_config(survey_id):
    """Test S2S integration with a sample payload"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        import requests as http_requests
        
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if not config or not config.get("s2s_config"):
            return jsonify({"error": "No S2S config found"}), 404
        
        s2s = config["s2s_config"]
        if not s2s.get("enabled"):
            return jsonify({"error": "S2S is not enabled"}), 400
        
        endpoint = s2s.get("endpoint", "")
        api_key = s2s.get("api_key", "")
        method = s2s.get("method", "POST")
        body_template = s2s.get("body_template", {})
        custom_headers = s2s.get("headers", {})
        
        if not endpoint:
            return jsonify({"error": "No endpoint configured"}), 400
        
        # Build test payload with placeholder replacements
        test_replacements = {
            "{session_id}": "TEST_SESSION_001",
            "{survey_id}": survey_id,
            "{redirect_status_code}": "1",
            "{respondent_id}": "TEST_RESPONDENT_001",
            "{timestamp}": datetime.now(timezone.utc).isoformat(),
            "{email}": "test@example.com",
            "{username}": "test_user",
            "{click_id}": "TEST_CLICK_001",
            "{score}": "100",
            "{status}": "pass"
        }
        
        # Replace placeholders in body
        body_str = json.dumps(body_template)
        for placeholder, value in test_replacements.items():
            body_str = body_str.replace(placeholder, value)
        
        test_body = json.loads(body_str)
        
        # Build headers
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["X-Api-Key"] = api_key
        headers.update(custom_headers)
        
        # Send test request
        if method.upper() == "POST":
            response = http_requests.post(endpoint, json=test_body, headers=headers, timeout=15)
        else:
            # For GET: replace placeholders in the URL directly
            get_url = endpoint
            for placeholder, value in test_replacements.items():
                get_url = get_url.replace(placeholder, value)
            response = http_requests.get(get_url, timeout=15)
        
        return jsonify({
            "success": response.status_code in [200, 201, 202],
            "status_code": response.status_code,
            "response_text": response.text[:500],
            "request_sent": {
                "url": endpoint,
                "method": method,
                "body": test_body,
                "headers": {k: v if k != "X-Api-Key" else "***" for k, v in headers.items()}
            }
        }), 200
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"Request failed: {str(e)}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  FULL CONFIG (GET ALL AT ONCE)
# ═══════════════════════════════════════════════════════

@redirect_rules_bp.route('/redirect-rules/<survey_id>/config', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_full_redirect_config(survey_id):
    """Get complete redirect rules configuration for a survey"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if not config:
            return jsonify({
                "survey_id": survey_id,
                "redirect_endpoints": [],
                "redirect_rules": [],
                "default_redirect_endpoint_id": None,
                "s2s_config": None
            }), 200
        
        # Remove MongoDB _id
        config.pop("_id", None)
        
        # Sort rules by priority
        rules = config.get("redirect_rules", [])
        rules.sort(key=lambda r: r.get("priority", 999))
        config["redirect_rules"] = rules
        
        return jsonify(config), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
