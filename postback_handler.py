import os
import json
from flask import Blueprint, request, jsonify
import requests
from integrations import forward_survey_data_to_partners
from firebase_config import db

# Create blueprint
postback_bp = Blueprint('postback_bp', __name__)


@postback_bp.route('/postback-handler', methods=['GET', 'POST'])
def handle_postback():
    if request.method == 'POST':
        try:
            data = request.get_json()
            print("📩 Received POST data:", json.dumps(data, indent=2))
            return jsonify({"message": "POST data received"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    # Existing GET handler logic below
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
        responses_ref = db.collection("survey_responses") \
            .where("tracking_id", "==", sid1) \
            .where("status", "==", "pending") \
            .limit(1)

        results = list(responses_ref.stream())
        if not results:
            return jsonify({"error": "No matching pending survey found"}), 404

        response_doc = results[0]
        response_data = response_doc.to_dict()

        response_data.update({
            "username": username,
            "transaction_id": transaction_id,
            "reward": reward,
            "currency": currency,
            "clicked_at": clicked_at,
            "status": status
        })

        forward_survey_data_to_partners(response_data)

        surveytitans_url = "https://surveytitans.com/track"
        payload = {
            "sid": sid1,
            "responses": response_data.get("responses", {}),
            "email": response_data.get("email", "")
        }

        titan_response = requests.post(surveytitans_url, json=payload)
        print(f"SurveyTitans response: {titan_response.status_code} - {titan_response.text}")

        response_doc.reference.update({"status": status})

        return jsonify({"message": "Survey forwarded to SurveyTitans"}), 200

    except Exception as e:
        print("❌ Error handling postback:", str(e))
        return jsonify({"error": "Internal server error"}), 500
