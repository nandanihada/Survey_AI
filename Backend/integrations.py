import requests
import json
from datetime import datetime, timedelta
from mongodb_config import db

def forward_survey_data_to_partners(response_data):
    """
    Forward survey completion data to all active partners.
    This function fetches active partners from the database and sends postbacks to each.
    """
    print("--- Starting Postback Forwarding ---")
    print("Response data received:", response_data)

    try:
        # Fetch all active partners from database
        print("Fetching active partners from database...")
        partners_cursor = db.partners.find({"status": "active"})
        partners = list(partners_cursor)
        
        if not partners:
            print("No active partners configured. Ending postback forwarding.")
            return False
        
        print(f"Found {len(partners)} active partners. Sending postbacks...")
        
        success_count = 0
        
        for partner in partners:
            partner_name = partner.get('name', 'Unknown Partner')
            postback_url = partner.get('url', '')
            
            if not postback_url:
                print(f"Skipping {partner_name}: No URL configured")
                continue
                
            try:
                # Replace placeholders in the URL with actual data
                processed_url = replace_postback_parameters(postback_url, response_data)
                
                print(f"Sending postback to {partner_name}: {processed_url}")
                
                # Send the postback
                response = requests.get(processed_url, timeout=10)
                
                # Log the postback attempt
                print(f"Response from {partner_name}: {response.status_code}")
                log_postback_attempt(partner_name, processed_url, response.status_code, response.text)
                
                if response.status_code == 200:
                    print(f"✅ Postback to {partner_name} successful")
                    success_count += 1
                else:
                    print(f"❌ Postback to {partner_name} failed: HTTP {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Network error sending to {partner_name}: {str(e)}")
                log_postback_attempt(partner_name, postback_url, 0, str(e))
            except Exception as e:
                print(f"❌ Error sending to {partner_name}: {str(e)}")
                log_postback_attempt(partner_name, postback_url, 0, str(e))
        
        print(f"--- Postback Forwarding Summary ---")
        print(f"Postback summary: {success_count}/{len(partners)} successful")
        return success_count > 0
        
    except Exception as e:
        print(f"--- Postback Forwarding Error ---")
        print(f"Error in forward_survey_data_to_partners: {str(e)}")
        return False

def replace_postback_parameters(url, response_data):
    """
    Replace placeholder parameters in the postback URL with actual data.
    """
    # Basic replacements from response data
    replacements = {
        '[TRANSACTION_ID]': response_data.get("transaction_id", ""),
        '[REWARD]': str(response_data.get("reward", 0)),
        '[CURRENCY]': response_data.get("currency", "USD"),
        '[USERNAME]': response_data.get("username", "unknown"),
        '[SESSION_ID]': response_data.get("session_id", ""),
        '[COMPLETE_ID]': response_data.get("complete_id", ""),
        '[SURVEY_ID]': response_data.get("survey_id", ""),
        '[RESPONSES]': json.dumps(response_data.get("responses", {})),
        '[EMAIL]': response_data.get("email", ""),
        '[STATUS]': response_data.get("status", "completed")
    }
    
    processed_url = url
    for placeholder, value in replacements.items():
        processed_url = processed_url.replace(placeholder, str(value))
    
    return processed_url

def log_postback_attempt(partner_name, url, status_code, response_text):
    """
    Log postback attempts to the database for monitoring and debugging.
    Only logs OUTBOUND postbacks (when we send to partners).
    """
    try:
        log_entry = {
            "type": "outbound",
            "partnerName": partner_name,  # Name of the partner (who received postback)
            "name": partner_name,  # Alias for consistent field naming
            "url": url,
            "status": "success" if status_code == 200 else "failure",
            "status_code": status_code,
            "payout": 0.0,  # Default payout for outbound (we're sending, not receiving)
            "response": response_text[:500] if response_text else "",  # Limit response text
            "timestamp": datetime.utcnow(),  # Store as datetime object for sorting
            "timestamp_str": (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S IST')  # IST time for display
        }
        
        # Log to outbound_postback_logs collection to separate from inbound
        db.outbound_postback_logs.insert_one(log_entry)
        print(f"📤 Logged OUTBOUND postback to {partner_name}")
        
    except Exception as e:
        print(f"Error logging postback attempt: {str(e)}")
