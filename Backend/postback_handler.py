import os
import json
from flask import Blueprint, request, jsonify
import requests
from datetime import datetime
from integrations import forward_survey_data_to_partners
from mongodb_config import db

# Create blueprint
postback_bp = Blueprint('postback_bp', __name__)


@postback_bp.route('/postback-handler', methods=['GET', 'POST'])
def handle_postback():
    # Enhanced logging - log ALL incoming parameters
    print("\n" + "="*60)
    print("📡 INBOUND POSTBACK RECEIVED FROM EXTERNAL PARTNER!")
    print("="*60)
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Source IP: {request.environ.get('REMOTE_ADDR', 'Unknown')}")
    print(f"User Agent: {request.headers.get('User-Agent', 'Unknown')}")
    print(f"GET Parameters: {dict(request.args)}")
    if request.method == 'POST':
        print(f"POST Data: {request.get_data(as_text=True)}")
    
    # Extract parameters
    transaction_id = request.args.get("transaction_id")
    status = request.args.get("status", "confirmed")
    reward = request.args.get("reward", 0)
    currency = request.args.get("currency", "USD")
    sid1 = request.args.get("sid1")
    clicked_at = request.args.get("clicked_at")
    username = request.args.get("username", "unknown")
    
    print(f"\n📋 EXTRACTED PARAMETERS:")
    print(f"   🆔 Transaction ID: {transaction_id}")
    print(f"   📊 Status: {status}")
    print(f"   💰 Reward: {reward}")
    print(f"   💱 Currency: {currency}")
    print(f"   🔗 SID1 (Response ID): {sid1}")
    print(f"   👤 Username: {username}")
    print(f"   ⏰ Clicked At: {clicked_at}")

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
            
            # Determine sender name from User-Agent or source IP for failed attempts
            user_agent = request.headers.get('User-Agent', 'Unknown')
            sender_name = "Unknown Partner"
            
            # Try to identify sender from User-Agent patterns
            if "curl" in user_agent.lower():
                sender_name = "cURL Client"
            elif "postman" in user_agent.lower():
                sender_name = "Postman"
            elif "python" in user_agent.lower():
                sender_name = "Python Client"
            elif "adbreak" in user_agent.lower():
                sender_name = "AdBreak Media"
            elif "surveytitans" in user_agent.lower():
                sender_name = "SurveyTitans"
            else:
                # Use source IP as fallback
                sender_name = f"Partner ({request.environ.get('REMOTE_ADDR', 'Unknown IP')})"
            
            # Log this failed attempt for frontend display
            failed_log_entry = {
                "type": "inbound",
                "name": sender_name,  # Who sent the postback
                "source_ip": request.environ.get('REMOTE_ADDR', 'Unknown'),
                "user_agent": user_agent,
                "sid1": sid1,
                "transaction_id": transaction_id,
                "status": status,
                "payout": float(reward) if reward else 0.0,  # Ensure numeric payout
                "reward": float(reward) if reward else 0.0,  # Keep both for compatibility
                "currency": currency,
                "username": username,
                "url_called": request.url,
                "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
                "timestamp_str": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # Local time for display
                "success": False,
                "error_message": f"Survey response not found for sid1: {sid1}"
            }
            
            try:
                db.inbound_postback_logs.insert_one(failed_log_entry)
                print(f"📊 Logged failed inbound postback to database")
            except Exception as log_error:
                print(f"Failed to log failed attempt: {log_error}")
            
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
        
        # Determine sender name from User-Agent or source IP
        user_agent = request.headers.get('User-Agent', 'Unknown')
        sender_name = "Unknown Partner"
        
        # Enhanced sender identification with multiple patterns
        source_ip = request.environ.get('REMOTE_ADDR', 'Unknown')
        
        # Check User-Agent patterns first
        if "adbreak" in user_agent.lower() or "ad-break" in user_agent.lower():
            sender_name = "AdBreak Media"
        elif "surveytitans" in user_agent.lower() or "survey-titans" in user_agent.lower():
            sender_name = "SurveyTitans"
        elif "postman" in user_agent.lower():
            sender_name = "Postman"
        elif "curl" in user_agent.lower():
            sender_name = "cURL Client"
        elif "python" in user_agent.lower() and "requests" in user_agent.lower():
            sender_name = "Python Client"
        elif "mozilla" in user_agent.lower() or "chrome" in user_agent.lower():
            sender_name = "Browser Client"
        # Check for specific partner domains in referrer or other headers
        elif request.headers.get('Referer'):
            referer = request.headers.get('Referer', '').lower()
            if "adbreak" in referer:
                sender_name = "AdBreak Media"
            elif "surveytitans" in referer:
                sender_name = "SurveyTitans"
            else:
                sender_name = f"Web Partner ({source_ip})"
        # Check transaction_id or other parameters for partner identification
        elif transaction_id and "adbreak" in str(transaction_id).lower():
            sender_name = "AdBreak Media"
        elif transaction_id and "titans" in str(transaction_id).lower():
            sender_name = "SurveyTitans"
        else:
            # Use source IP as fallback with more descriptive name
            if source_ip == '127.0.0.1' or source_ip.startswith('192.168.'):
                sender_name = f"Local Partner ({source_ip})"
            else:
                sender_name = f"External Partner ({source_ip})"
        
        # Log the inbound postback for frontend display
        inbound_log_entry = {
            "type": "inbound",
            "name": sender_name,  # Who sent the postback
            "source_ip": request.environ.get('REMOTE_ADDR', 'Unknown'),
            "user_agent": user_agent,
            "sid1": sid1,
            "transaction_id": transaction_id,
            "status": status,
            "payout": float(reward) if reward else 0.0,  # Ensure numeric payout
            "reward": float(reward) if reward else 0.0,  # Keep both for compatibility
            "currency": currency,
            "username": username,
            "url_called": request.url,
            "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
            "timestamp_str": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # Local time for display
            "success": True,
            "response_message": "Survey forwarded to SurveyTitans"
        }
        
        # Save inbound log to database
        db.inbound_postback_logs.insert_one(inbound_log_entry)
        print(f"📊 Logged inbound postback to database")

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
        
        # Determine sender name from User-Agent or source IP for exception case
        user_agent = request.headers.get('User-Agent', 'Unknown')
        sender_name = "Unknown Partner"
        
        # Try to identify sender from User-Agent patterns
        if "curl" in user_agent.lower():
            sender_name = "cURL Client"
        elif "postman" in user_agent.lower():
            sender_name = "Postman"
        elif "python" in user_agent.lower():
            sender_name = "Python Client"
        elif "adbreak" in user_agent.lower():
            sender_name = "AdBreak Media"
        elif "surveytitans" in user_agent.lower():
            sender_name = "SurveyTitans"
        else:
            # Use source IP as fallback
            sender_name = f"Partner ({request.environ.get('REMOTE_ADDR', 'Unknown IP')})"
        
        # Log the failed inbound postback attempt
        try:
            failed_log_entry = {
                "type": "inbound",
                "name": sender_name,  # Who sent the postback
                "source_ip": request.environ.get('REMOTE_ADDR', 'Unknown'),
                "user_agent": user_agent,
                "sid1": sid1 or "Unknown",
                "transaction_id": transaction_id,
                "status": status,
                "payout": float(reward) if reward else 0.0,  # Ensure numeric payout
                "reward": float(reward) if reward else 0.0,  # Keep both for compatibility
                "currency": currency,
                "username": username,
                "url_called": request.url,
                "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
                "timestamp_str": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # Local time for display
                "success": False,
                "error_message": str(e)
            }
            db.inbound_postback_logs.insert_one(failed_log_entry)
        except Exception as log_error:
            print(f"Failed to log error: {log_error}")
        
        return jsonify({"error": "Internal server error"}), 500
