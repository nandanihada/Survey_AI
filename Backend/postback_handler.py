import os
import json
from flask import Blueprint, request, jsonify
import requests
from datetime import datetime
from integrations import forward_survey_data_to_partners
from mongodb_config import db

# Create blueprint
postback_bp = Blueprint('postback_bp', __name__)


@postback_bp.route('/postback-handler', methods=['GET'])
def handle_postback():
    transaction_id = request.args.get("transaction_id")
    status = request.args.get("status", "confirmed")
    reward = request.args.get("reward", 0)
    currency = request.args.get("currency", "USD")
    sid1 = request.args.get("sid1")
    clicked_at = request.args.get("clicked_at")
    username = request.args.get("username", "unknown")

    if not sid1:
        return jsonify({"error": "Missing required parameter: sid1 (tracking_id)"}), 400

    try:
        # Find the original survey response in the 'responses' collection using the unique ID (_id)
        print(f"🔎 Searching for response with _id: {sid1}")
        response_doc = db["responses"].find_one({
            "_id": sid1
        })

        if not response_doc:
            print(f"❌ ERROR: No response found with _id: {sid1}")
            return jsonify({"error": "No matching survey response found for the provided sid1"}), 404

        print(f"✅ SUCCESS: Found response: {response_doc['_id']}")

        # Prepare the update with the new data from the postback
        postback_update_data = {
            "postback_status": status,
            "postback_reward": reward,
            "postback_currency": currency,
            "postback_transaction_id": transaction_id,
            "postback_received_at": datetime.utcnow()
        }

        # Update the original response document in MongoDB
        db["responses"].update_one(
            {"_id": response_doc["_id"]},
            {"$set": postback_update_data}
        )

        print(f"📝 Updated document {response_doc['_id']} with postback data.")

        # Combine the original response with the new postback data for forwarding
        forwarding_data = {**response_doc, **postback_update_data}

        # Forward the updated data to other partners if needed
        forward_survey_data_to_partners(forwarding_data)

        # Forward to SurveyTitans
        surveytitans_url = "https://surveytitans.com/track"
        payload = {
            "sid": sid1,
            "responses": forwarding_data.get("responses", {}),
            "email": forwarding_data.get("email", "")
        }

        titan_response = requests.post(surveytitans_url, json=payload)
        print(f"SurveyTitans response: {titan_response.status_code} - {titan_response.text}")

        return jsonify({"message": "Survey forwarded to SurveyTitans"}), 200
    
    except Exception as e:
        print("❌ Error handling postback:", str(e))
        return jsonify({"error": "Internal server error"}), 500