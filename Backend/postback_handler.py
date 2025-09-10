import os
import json
from flask import Blueprint, request, jsonify
import requests
from datetime import datetime, timedelta
# from integrations import forward_survey_data_to_partners
from mongodb_config import db

# Create blueprint
postback_bp = Blueprint('postback_bp', __name__)


def _safe_float(val, default=0.0):
    try:
        # Accept int/float strings; otherwise fallback
        return float(val)
    except Exception:
        return default


@postback_bp.route('/postback-handler/<unique_id>', methods=['GET', 'POST'])
def handle_postback(unique_id):
    # Enhanced logging - log ALL incoming parameters
    print("\n" + "="*60)
    print("📡 INBOUND POSTBACK RECEIVED FROM EXTERNAL PARTNER!")
    print("="*60)
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Unique ID: {unique_id}")
    print(f"Source IP: {request.environ.get('REMOTE_ADDR', 'Unknown')}")
    print(f"User Agent: {request.headers.get('User-Agent', 'Unknown')}")
    print(f"GET Parameters: {dict(request.args)}")
    if request.method == 'POST':
        print(f"POST Data: {request.get_data(as_text=True)}")
    
    # Extract ONLY 10 fixed parameters for postback system
    click_id = request.args.get("click_id")
    payout = request.args.get("payout", 0)
    currency = request.args.get("currency", "USD")
    offer_id = request.args.get("offer_id")
    conversion_status = request.args.get("conversion_status", "confirmed")
    transaction_id = request.args.get("transaction_id")
    sub1 = request.args.get("sub1")
    sub2 = request.args.get("sub2")
    event_name = request.args.get("event_name", "conversion")
    timestamp = request.args.get("timestamp")
    
    print(f"\n📋 EXTRACTED 10 FIXED PARAMETERS:")
    print(f"   🔗 Click ID: {click_id}")
    print(f"   💰 Payout: {payout}")
    print(f"   💱 Currency: {currency}")
    print(f"   🎯 Offer ID: {offer_id}")
    print(f"   📊 Conversion Status: {conversion_status}")
    print(f"   🆔 Transaction ID: {transaction_id}")
    print(f"   📝 Sub1: {sub1}")
    print(f"   📝 Sub2: {sub2}")
    print(f"   🎪 Event Name: {event_name}")
    print(f"   ⏰ Timestamp: {timestamp}")

    if not unique_id:
        return jsonify({"error": "Missing required unique ID in URL path"}), 400

    try:
        # Find the postback share using the unique ID from URL path
        print(f"🔎 Searching for postback share with unique_id: {unique_id}")
        share_doc = db["postback_shares"].find_one({
            "unique_postback_id": unique_id
        })

        if not share_doc:
            print(f"❌ ERROR: No postback share found with unique_id: {unique_id}")
            
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
                # All 10 fixed parameters
                "click_id": click_id,
                "payout": _safe_float(payout, 0.0),
                "currency": currency,
                "offer_id": offer_id,
                "conversion_status": conversion_status,
                "transaction_id": transaction_id,
                "sub1": sub1,
                "sub2": sub2,
                "event_name": event_name,
                "timestamp": timestamp,
                "unique_id": unique_id,
                "url_called": request.url,
                "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
                "timestamp_str": (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S IST'),  # IST time for display
                "success": False,
                "error_message": f"Postback share not found for unique_id: {unique_id}"
            }
            
            try:
                db.inbound_postback_logs.insert_one(failed_log_entry)
                print(f"📊 Logged failed inbound postback to database")
            except Exception as log_error:
                print(f"Failed to log failed attempt: {log_error}")
            
            return jsonify({"error": "No matching postback share found for the provided unique_id"}), 404

        print(f"✅ SUCCESS: Found postback share: {share_doc.get('_id')}")

        # Prepare the update with the new data from the postback (ONLY 10 parameters)
        postback_update_data = {
            "inbound_postback": {
                "click_id": click_id,
                "payout": payout,
                "currency": currency,
                "offer_id": offer_id,
                "conversion_status": conversion_status,
                "transaction_id": transaction_id,
                "sub1": sub1,
                "sub2": sub2,
                "event_name": event_name,
                "timestamp": timestamp,
            },
            "last_used": datetime.utcnow(),
        }

        # Update the postback share document in MongoDB
        db["postback_shares"].update_one(
            {"_id": share_doc["_id"]},
            {"$set": postback_update_data, "$inc": {"usage_count": 1}}
        )

        print(f"📝 Updated postback share {share_doc['_id']} with inbound postback data.")
        
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
            # All 10 fixed parameters
            "click_id": click_id,
            "payout": _safe_float(payout, 0.0),
            "currency": currency,
            "offer_id": offer_id,
            "conversion_status": conversion_status,
            "transaction_id": transaction_id,
            "sub1": sub1,
            "sub2": sub2,
            "event_name": event_name,
            "timestamp": timestamp,
            "unique_id": unique_id,
            "url_called": request.url,
            "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
            "timestamp_str": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # Local time for display
            "success": True,
            "response_message": "Inbound postback recorded"
        }
        
        # Save inbound log to database
        db.inbound_postback_logs.insert_one(inbound_log_entry)
        print(f"📊 Logged inbound postback to database")

        # Respond success after recording
        return jsonify({"message": "Inbound postback recorded"}), 200
    
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
                # All 10 fixed parameters
                "click_id": click_id,
                "payout": _safe_float(payout, 0.0),
                "currency": currency,
                "offer_id": offer_id,
                "conversion_status": conversion_status,
                "transaction_id": transaction_id,
                "sub1": sub1,
                "sub2": sub2,
                "event_name": event_name,
                "timestamp": timestamp,
                "unique_id": unique_id,
                "url_called": request.url,
                "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
                "timestamp_str": (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S IST'),  # IST time for display
                "success": False,
                "error_message": str(e)
            }
            db.inbound_postback_logs.insert_one(failed_log_entry)
        except Exception as log_error:
            print(f"Failed to log error: {log_error}")
        
        return jsonify({"error": "Internal server error"}), 500
