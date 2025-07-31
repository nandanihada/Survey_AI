
from flask import Blueprint, request, jsonify
from mongodb_config import db
from datetime import datetime
from bson import ObjectId

postback_api_bp = Blueprint('postback_api_bp', __name__)

# Helper to convert ObjectId to string
def convert_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

# --- Partner Management (CRUD) ---

@postback_api_bp.route('/api/partners', methods=['GET'])
def get_partners():
    try:
        partners_cursor = db.partners.find()
        partners = [convert_objectid(p) for p in partners_cursor]
        return jsonify(partners)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/api/partners', methods=['POST'])
def add_partner():
    try:
        data = request.json
        if not data or 'name' not in data or 'url' not in data:
            return jsonify({"error": "Name and URL are required"}), 400
        
        new_partner = {
            "name": data['name'],
            "url": data['url'],
            "status": data.get('status', 'inactive'),
            "created_at": datetime.utcnow()
        }
        
        result = db.partners.insert_one(new_partner)
        new_partner['id'] = str(result.inserted_id)
        del new_partner['_id'] # remove ObjectId before returning
        
        return jsonify(new_partner), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/api/partners/<partner_id>', methods=['PUT'])
def update_partner(partner_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        update_data = {"$set": {
            "name": data['name'],
            "url": data['url'],
            "status": data.get('status'),
            "updated_at": datetime.utcnow()
        }}

        result = db.partners.update_one({"_id": ObjectId(partner_id)}, update_data)

        if result.matched_count == 0:
            return jsonify({"error": "Partner not found"}), 404
        
        return jsonify({"message": "Partner updated successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@postback_api_bp.route('/api/partners/<partner_id>', methods=['DELETE'])
def delete_partner(partner_id):
    try:
        result = db.partners.delete_one({"_id": ObjectId(partner_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Partner not found"}), 404
        
        return jsonify({"message": "Partner deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Postback Logs ---

@postback_api_bp.route('/api/postback-logs', methods=['GET'])
def get_postback_logs():
    try:
        # In a real app, you would add pagination here
        logs_cursor = db.postback_logs.find().sort("timestamp", -1).limit(50)
        logs = [convert_objectid(log) for log in logs_cursor]
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

