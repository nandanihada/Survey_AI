
from flask import Blueprint, request, jsonify
from mongodb_config import db
from datetime import datetime, timedelta
from bson import ObjectId
import uuid

postback_api_bp = Blueprint('postback_api_bp', __name__)

# Helper to convert ObjectId to string
def convert_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

# --- Partner Management (CRUD) ---

@postback_api_bp.route('/partners', methods=['GET'])
def get_partners():
    try:
        partners_cursor = db.partners.find()
        partners = [convert_objectid(p) for p in partners_cursor]
        return jsonify(partners)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/partners', methods=['POST'])
def add_partner():
    try:
        data = request.json
        if not data or 'name' not in data or 'url' not in data:
            return jsonify({"error": "Name and URL are required"}), 400
        
        new_partner = {
            "name": data['name'],
            "url": data['url'],
            "status": data.get('status', 'active'),  # Changed default to 'active'
            "created_at": datetime.utcnow()
        }
        
        result = db.partners.insert_one(new_partner)
        new_partner['id'] = str(result.inserted_id)
        del new_partner['_id'] # remove ObjectId before returning
        
        return jsonify(new_partner), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/partners/<partner_id>', methods=['PUT'])
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


@postback_api_bp.route('/partners/<partner_id>', methods=['DELETE'])
def delete_partner(partner_id):
    try:
        result = db.partners.delete_one({"_id": ObjectId(partner_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Partner not found"}), 404
        
        return jsonify({"message": "Partner deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Postback Logs ---

@postback_api_bp.route('/postback-logs', methods=['GET'])
def get_postback_logs():
    print("🔍 get_postback_logs endpoint called")
    try:
        # Check database connection
        if db is None:
            print("❌ Database connection not available")
            return jsonify({"error": "Database connection not available"}), 500
        
        # Get outbound postback logs, sorted by timestamp (newest first)
        print("📊 Querying outbound_postback_logs collection...")
        logs_cursor = db.outbound_postback_logs.find().sort("timestamp", -1).limit(50)
        logs = []
        
        for log in logs_cursor:
            log_data = convert_objectid(log)
            # Ensure timestamp_str is available for display
            if 'timestamp' in log_data and 'timestamp_str' not in log_data:
                if hasattr(log_data['timestamp'], 'strftime'):
                    # Convert UTC to IST (UTC+5:30)
                    utc_timestamp = log_data['timestamp']
                    ist_timestamp = utc_timestamp + timedelta(hours=5, minutes=30)
                    log_data['timestamp_str'] = ist_timestamp.strftime('%Y-%m-%d %H:%M:%S IST')
                else:
                    log_data['timestamp_str'] = str(log_data['timestamp'])
            logs.append(log_data)
        
        print(f"✅ Retrieved {len(logs)} outbound postback logs")
        return jsonify(logs)
    except Exception as e:
        print(f"❌ Error in get_postback_logs: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/inbound-postback-logs', methods=['GET'])
def get_inbound_postback_logs():
    print("🔍 get_inbound_postback_logs endpoint called")
    try:
        # Check database connection
        if db is None:
            print("❌ Database connection not available")
            return jsonify({"error": "Database connection not available"}), 500
        
        # Get inbound postback logs, sorted by timestamp (newest first)
        print("📊 Querying inbound_postback_logs collection...")
        logs_cursor = db.inbound_postback_logs.find().sort("timestamp", -1).limit(50)
        logs = []
        
        for log in logs_cursor:
            log_data = convert_objectid(log)
            # Ensure timestamp_str is available for display
            if 'timestamp' in log_data and 'timestamp_str' not in log_data:
                if hasattr(log_data['timestamp'], 'strftime'):
                    # Convert UTC to IST (UTC+5:30)
                    utc_timestamp = log_data['timestamp']
                    ist_timestamp = utc_timestamp + timedelta(hours=5, minutes=30)
                    log_data['timestamp_str'] = ist_timestamp.strftime('%Y-%m-%d %H:%M:%S IST')
                else:
                    log_data['timestamp_str'] = str(log_data['timestamp'])
            logs.append(log_data)
        
        print(f"✅ Retrieved {len(logs)} inbound postback logs")
        return jsonify(logs)
    except Exception as e:
        print(f"❌ Error in get_inbound_postback_logs: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


# --- Postback Sharing Management ---

@postback_api_bp.route('/test-db', methods=['GET'])
def test_database():
    """Simple test endpoint to check database connection"""
    try:
        print("🔍 Testing database connection...")
        if db is None:
            return jsonify({"status": "error", "message": "Database object is None"})
        
        # Test ping
        db.admin.command('ping')
        
        # List collections
        collections = db.list_collection_names()
        
        return jsonify({
            "status": "success", 
            "message": "Database connected",
            "collections": collections
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@postback_api_bp.route('/postback-shares', methods=['GET'])
def get_postback_shares():
    """Get all postback sharing records"""
    print("🔍 get_postback_shares called")
    try:
        # Check if database connection exists
        if db is None:
            print("❌ Database connection not available")
            return jsonify({"error": "Database connection not available"}), 500
        
        # Ensure collection exists
        if 'postback_shares' not in db.list_collection_names():
            print("⚠️ postback_shares collection doesn't exist, creating it...")
            db.create_collection('postback_shares')
            return jsonify([])
        
        shares_cursor = db.postback_shares.find().sort("created_at", -1)
        shares = []
        
        for share in shares_cursor:
            share_data = convert_objectid(share)
            # Format timestamps - Convert UTC to IST (UTC+5:30)
            if 'created_at' in share_data and hasattr(share_data['created_at'], 'strftime'):
                ist_created = share_data['created_at'] + timedelta(hours=5, minutes=30)
                share_data['created_at_str'] = ist_created.strftime('%Y-%m-%d %H:%M:%S IST')

            if 'last_used' in share_data and share_data['last_used'] and hasattr(share_data['last_used'], 'strftime'):
                ist_last_used = share_data['last_used'] + timedelta(hours=5, minutes=30)
                share_data['last_used_str'] = ist_last_used.strftime('%Y-%m-%d %H:%M:%S IST')

            shares.append(share_data)
            
        print(f"✅ Retrieved {len(shares)} postback shares")
        return jsonify(shares)
        
    except Exception as e:
        print(f"❌ Error in get_postback_shares: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/postback-shares', methods=['POST'])
def create_postback_share():
    """Create a new postback sharing record"""
    print("🔍 create_postback_share called")
    try:
        # Check if database connection exists
        if db is None:
            print("❌ Database connection not available for saving")
            return jsonify({"error": "Database connection not available"}), 500
            
        data = request.json
        print(f"🔍 Received data: {data}")
        
        if not data or 'third_party_name' not in data:
            return jsonify({"error": "Third party name is required"}), 400
        
        # Default parameter configuration with ONLY 10 fixed parameters
        default_params = {
            'global': {
                # 10 Fixed Parameters ONLY - default disabled; enable explicitly from UI
                'click_id': {'enabled': False, 'description': 'Unique identifier for the click/conversion event'},
                'payout': {'enabled': False, 'description': 'Commission/payout amount earned for the conversion'},
                'currency': {'enabled': False, 'description': 'Currency code (USD, EUR, etc.)'},
                'offer_id': {'enabled': False, 'description': 'Unique identifier for the offer/campaign'},
                'conversion_status': {'enabled': False, 'description': 'Status of the conversion (confirmed, pending, reversed)'},
                'transaction_id': {'enabled': False, 'description': 'Unique transaction identifier'},
                'sub1': {'enabled': False, 'description': 'SubID1 - First level tracking parameter'},
                'sub2': {'enabled': False, 'description': 'SubID2 - Second level tracking parameter'},
                'event_name': {'enabled': False, 'description': 'Name of the conversion event (conversion, lead, sale, etc.)'},
                'timestamp': {'enabled': False, 'description': 'Timestamp of when the conversion occurred'}
            }
        }
        
        postback_type = data.get('postback_type', 'global')
        custom_params = data.get('parameters', {})
        
        # Merge default params with custom params
        final_params = default_params.get(postback_type, default_params['global']).copy()
        for param_name, param_config in custom_params.items():
            final_params[param_name] = param_config
        
        # Generate unique ID automatically
        unique_postback_id = str(uuid.uuid4())
        
        new_share = {
            "third_party_name": data['third_party_name'],
            "third_party_contact": data.get('third_party_contact', ''),
            "postback_type": postback_type,
            "parameters": final_params,
            "notes": data.get('notes', ''),
            "status": data.get('status', 'active'),
            "unique_postback_id": unique_postback_id,  # Auto-generated UUID
            "created_at": datetime.utcnow(),
            "last_used": None,
            "usage_count": 0
        }
        
        print(f"🔍 Attempting to save to database: {new_share['third_party_name']}")
        result = db.postback_shares.insert_one(new_share)
        print(f"✅ Successfully saved with ID: {result.inserted_id}")
        
        # Convert ObjectId to string for JSON response
        new_share['id'] = str(result.inserted_id)
        if '_id' in new_share:
            del new_share['_id']
        
        # Convert datetime to string for JSON response
        if 'created_at' in new_share:
            new_share['created_at_str'] = new_share['created_at'].strftime('%Y-%m-%d %H:%M:%S IST')
        
        return jsonify(new_share), 201

    except Exception as e:
        print(f"❌ Error saving postback share: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/postback-shares/<share_id>', methods=['PUT'])
def update_postback_share(share_id):
    """Update a postback sharing record"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        update_data = {"$set": {
            "third_party_name": data.get('third_party_name'),
            "third_party_contact": data.get('third_party_contact', ''),
            "postback_type": data.get('postback_type', 'global'),
            "parameters": data.get('parameters', {}),
            "notes": data.get('notes', ''),
            "status": data.get('status', 'active'),
            "updated_at": datetime.utcnow()
        }}

        result = db.postback_shares.update_one({"_id": ObjectId(share_id)}, update_data)

        if result.matched_count == 0:
            return jsonify({"error": "Postback share not found"}), 404
        
        return jsonify({"message": "Postback share updated successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/postback-shares/<share_id>', methods=['DELETE'])
def delete_postback_share(share_id):
    """Delete a postback sharing record"""
    try:
        result = db.postback_shares.delete_one({"_id": ObjectId(share_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Postback share not found"}), 404
        
        return jsonify({"message": "Postback share deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_api_bp.route('/postback-shares/<share_id>/generate-url', methods=['POST'])
def generate_postback_url(share_id):
    """Generate a customized postback URL for a specific third party"""
    try:
        # Get the sharing record
        share = db.postback_shares.find_one({"_id": ObjectId(share_id)})
        if not share:
            return jsonify({"error": "Postback share not found"}), 404
        
        # Base URL with unique ID
        unique_id = share.get('unique_postback_id')
        if not unique_id:
            # Persist a new UUID if missing
            unique_id = str(uuid.uuid4())
            db.postback_shares.update_one(
                {"_id": ObjectId(share_id)},
                {"$set": {"unique_postback_id": unique_id}}
            )
        base_url = f"https://api.theinterwebsite.space/postback-handler/{unique_id}"
        
        # Build query parameters based on enabled parameters (ONLY 10 fixed parameters)
        params = []
        for param_name, param_config in share['parameters'].items():
            if param_config.get('enabled', False):
                # Use custom parameter name if provided, otherwise use standard name
                custom_name = param_config.get('customName', param_name)
                # Use custom value if provided, otherwise use placeholder
                if param_config.get('customValue'):
                    value = param_config['customValue']
                else:
                    value = f"[{param_name.upper()}]"
                params.append(f"{custom_name}={value}")
        
        # Construct final URL
        if params:
            postback_url = f"{base_url}?{'&'.join(params)}"
        else:
            postback_url = base_url
        
        # Update usage tracking
        db.postback_shares.update_one(
            {"_id": ObjectId(share_id)},
            {
                "$set": {"last_used": datetime.utcnow()},
                "$inc": {"usage_count": 1}
            }
        )
        
        return jsonify({
            "postback_url": postback_url,
            "third_party_name": share['third_party_name'],
            "postback_type": share['postback_type'],
            "enabled_parameters": [name for name, config in share['parameters'].items() if config.get('enabled', False)]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

