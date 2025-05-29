import os
import json
from flask import Blueprint, request, jsonify
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from integrations import forward_survey_data_to_partners
# Create blueprint
postback_bp = Blueprint('postback_bp', __name__)


def get_db():
    return firestore.client()

@postback_bp.route('/postback-handler', methods=['GET'])
def handle_postback():
    transaction_id = request.args.get("transaction_id")
    status = request.args.get("status")
    reward = request.args.get("reward")
    currency = request.args.get("currency")
    sid1 = request.args.get("sid1")
    clicked_at = request.args.get("clicked_at")
    username = request.args.get("username")

    if not all([transaction_id, status, reward, currency, sid1]):
        return "Missing required parameters", 400



    try:
        db = get_db()
        responses_ref = db.collection("survey_responses") \
            .where("tracking_id", "==", sid1) \
            .where("status", "==", "pending") \
            .limit(1)

        results = list(responses_ref.stream())

        if not results:
            return jsonify({"error": "No matching pending survey found"}), 404

        response_doc = results[0]
        response_data = response_doc.to_dict()
        
        # response_data["username"] = username or "unknown"
        response_data.update({
            "username": username,
            "transaction_id": transaction_id,
            "reward": reward,
            "currency": currency,
            "clicked_at": clicked_at,
            "status": "confirmed"
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

        response_doc.reference.update({"status": "confirmed"})

        return jsonify({"message": "Survey forwarded to SurveyTitans"}), 200
    
    except Exception as e:
        print("❌ Error handling postback:", str(e))
        return jsonify({"error": "Internal server error"}), 500