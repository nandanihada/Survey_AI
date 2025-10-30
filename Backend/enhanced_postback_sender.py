#!/usr/bin/env python3

import requests
import json
from datetime import datetime, timedelta
from mongodb_config import db
from survey_partner_mapping_api import build_mapped_postback_url, AVAILABLE_DATA_FIELDS

def send_postbacks_to_mapped_partners(survey_id, survey_completion_data):
    """
    Send postbacks only to partners mapped to this specific survey
    with their custom parameter mappings
    
    Args:
        survey_id: The ID of the completed survey
        survey_completion_data: Dict containing all survey completion data
    
    Returns:
        dict: Summary of postback results
    """
    print(f"\n🎯 ENHANCED POSTBACK SENDER: Survey {survey_id}")
    print("="*60)
    
    try:
        # Find all partner mappings for this survey
        mappings_cursor = db.survey_partner_mappings.find({
            "survey_id": survey_id,
            "status": "active",
            "send_on_completion": True
        })
        
        mappings = list(mappings_cursor)
        
        if not mappings:
            print(f"ℹ️ No active partner mappings found for survey {survey_id}")
            return {
                "success": True,
                "message": "No partner mappings configured",
                "total_mappings": 0,
                "successful_postbacks": 0,
                "failed_postbacks": 0,
                "results": []
            }
        
        print(f"📤 Found {len(mappings)} active partner mappings")
        
        # Prepare comprehensive survey data for parameter mapping
        comprehensive_data = prepare_comprehensive_survey_data(survey_completion_data)
        
        results = []
        successful_count = 0
        failed_count = 0
        
        for mapping in mappings:
            try:
                partner_name = mapping.get('partner_name', 'Unknown Partner')
                postback_url = mapping.get('postback_url', '')
                parameter_mappings = mapping.get('parameter_mappings', {})
                
                print(f"\n🔗 Processing mapping for partner: {partner_name}")
                print(f"   Base URL: {postback_url}")
                print(f"   Parameter mappings: {parameter_mappings}")
                
                if not postback_url:
                    print(f"⚠️ No postback URL configured for {partner_name}")
                    continue
                
                # Build the final postback URL with mapped parameters
                final_url = build_mapped_postback_url(
                    postback_url, 
                    parameter_mappings, 
                    comprehensive_data
                )
                
                print(f"   Final URL: {final_url}")
                
                # Send the postback
                result = send_single_postback(partner_name, final_url, mapping)
                results.append(result)
                
                if result['success']:
                    successful_count += 1
                    print(f"✅ Postback to {partner_name} successful")
                else:
                    failed_count += 1
                    print(f"❌ Postback to {partner_name} failed: {result.get('error', 'Unknown error')}")
                
            except Exception as mapping_error:
                print(f"❌ Error processing mapping for {mapping.get('partner_name', 'unknown')}: {mapping_error}")
                failed_count += 1
                results.append({
                    "partner_name": mapping.get('partner_name', 'unknown'),
                    "success": False,
                    "error": str(mapping_error),
                    "status_code": 0
                })
        
        print(f"\n📊 POSTBACK SUMMARY:")
        print(f"   Total mappings: {len(mappings)}")
        print(f"   Successful: {successful_count}")
        print(f"   Failed: {failed_count}")
        print("="*60)
        
        return {
            "success": True,
            "message": f"Processed {len(mappings)} partner mappings",
            "total_mappings": len(mappings),
            "successful_postbacks": successful_count,
            "failed_postbacks": failed_count,
            "results": results
        }
        
    except Exception as e:
        print(f"❌ Error in send_postbacks_to_mapped_partners: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "total_mappings": 0,
            "successful_postbacks": 0,
            "failed_postbacks": 0,
            "results": []
        }

def prepare_comprehensive_survey_data(survey_completion_data):
    """
    Prepare comprehensive data dictionary with all available fields
    that can be mapped to partner parameters
    """
    # Start with the basic completion data
    comprehensive_data = survey_completion_data.copy()
    
    # Process survey responses for partner consumption
    responses_data = process_survey_responses(survey_completion_data.get("responses", {}))
    
    # Add additional computed fields
    comprehensive_data.update({
        "timestamp": datetime.utcnow().isoformat(),
        "completion_time": calculate_completion_time(survey_completion_data),
        "payout": survey_completion_data.get("reward", "0.1"),
        "currency": survey_completion_data.get("currency", "USD"),
        "complete_id": survey_completion_data.get("transaction_id", ""),
        "aff_sub": survey_completion_data.get("aff_sub", ""),
        "sub1": survey_completion_data.get("sub1", ""),
        "sub2": survey_completion_data.get("sub2", ""),
        "simple_user_id": survey_completion_data.get("simple_user_id", ""),
        "user_id": survey_completion_data.get("user_id", ""),
        "click_id": survey_completion_data.get("click_id", ""),
        "ip_address": survey_completion_data.get("ip_address", ""),
        "user_agent": survey_completion_data.get("user_agent", ""),
        "referrer": survey_completion_data.get("referrer", ""),
        # Survey responses in different formats for partner flexibility
        "responses": responses_data["json_string"],  # JSON string format
        "responses_flat": responses_data["flat_string"],  # Flat key=value format
        "responses_count": responses_data["count"],  # Number of responses
        "responses_summary": responses_data["summary"]  # Brief summary
    })
    
    # Ensure all available data fields have some value (empty string if missing)
    for field in AVAILABLE_DATA_FIELDS.keys():
        if field not in comprehensive_data:
            comprehensive_data[field] = ""
    
    return comprehensive_data

def calculate_completion_time(survey_data):
    """Calculate survey completion time if start/end times are available"""
    try:
        if 'started_at' in survey_data and 'submitted_at' in survey_data:
            # Parse timestamps and calculate difference
            start_time = datetime.fromisoformat(survey_data['started_at'].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(survey_data['submitted_at'].replace('Z', '+00:00'))
            duration = (end_time - start_time).total_seconds()
            return str(int(duration))  # Return as string for URL parameter
        return "0"
    except Exception:
        return "0"

def process_survey_responses(responses):
    """
    Process survey responses into multiple formats for partner consumption
    
    Args:
        responses: Survey responses dictionary or list
    
    Returns:
        dict: Processed responses in multiple formats
    """
    import json
    import urllib.parse
    
    try:
        if not responses:
            return {
                "json_string": "",
                "flat_string": "",
                "count": "0",
                "summary": "No responses"
            }
        
        # Handle different response formats
        if isinstance(responses, str):
            try:
                responses = json.loads(responses)
            except json.JSONDecodeError:
                responses = {"response": responses}
        
        # Convert to consistent format
        if isinstance(responses, list):
            # Convert list to numbered dictionary
            responses_dict = {f"q{i+1}": str(resp) for i, resp in enumerate(responses)}
        elif isinstance(responses, dict):
            responses_dict = {str(k): str(v) for k, v in responses.items()}
        else:
            responses_dict = {"response": str(responses)}
        
        # Create different formats
        json_string = json.dumps(responses_dict, separators=(',', ':'))  # Compact JSON
        
        # Flat key=value format (URL-encoded)
        flat_pairs = [f"{k}={urllib.parse.quote(str(v))}" for k, v in responses_dict.items()]
        flat_string = "&".join(flat_pairs)
        
        # Count responses
        count = str(len(responses_dict))
        
        # Create summary (first 100 chars of responses)
        summary_text = ", ".join([f"{k}: {str(v)[:20]}" for k, v in list(responses_dict.items())[:3]])
        if len(summary_text) > 100:
            summary_text = summary_text[:97] + "..."
        
        return {
            "json_string": json_string,
            "flat_string": flat_string,
            "count": count,
            "summary": summary_text or "Empty responses"
        }
        
    except Exception as e:
        print(f"⚠️ Error processing survey responses: {e}")
        return {
            "json_string": "",
            "flat_string": "",
            "count": "0",
            "summary": f"Error processing responses: {str(e)}"
        }

def send_single_postback(partner_name, postback_url, mapping_info):
    """
    Send a single postback to a partner and log the result
    
    Args:
        partner_name: Name of the partner
        postback_url: Complete postback URL with parameters
        mapping_info: Partner mapping configuration
    
    Returns:
        dict: Result of the postback attempt
    """
    try:
        print(f"🚀 Sending postback to {partner_name}: {postback_url}")
        
        # Send the postback request
        response = requests.get(postback_url, timeout=15)
        
        # Prepare result
        result = {
            "partner_name": partner_name,
            "partner_id": str(mapping_info.get('partner_id', '')),
            "url": postback_url,
            "status_code": response.status_code,
            "response_text": response.text[:200],  # First 200 chars
            "success": response.status_code == 200,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Log the postback attempt to database
        log_mapped_postback_attempt(result, mapping_info)
        
        return result
        
    except requests.exceptions.Timeout:
        result = {
            "partner_name": partner_name,
            "partner_id": str(mapping_info.get('partner_id', '')),
            "url": postback_url,
            "status_code": 0,
            "error": "Request timeout (15s)",
            "success": False,
            "timestamp": datetime.utcnow().isoformat()
        }
        log_mapped_postback_attempt(result, mapping_info)
        return result
        
    except requests.exceptions.ConnectionError:
        result = {
            "partner_name": partner_name,
            "partner_id": str(mapping_info.get('partner_id', '')),
            "url": postback_url,
            "status_code": 0,
            "error": "Connection error",
            "success": False,
            "timestamp": datetime.utcnow().isoformat()
        }
        log_mapped_postback_attempt(result, mapping_info)
        return result
        
    except Exception as e:
        result = {
            "partner_name": partner_name,
            "partner_id": str(mapping_info.get('partner_id', '')),
            "url": postback_url,
            "status_code": 0,
            "error": str(e),
            "success": False,
            "timestamp": datetime.utcnow().isoformat()
        }
        log_mapped_postback_attempt(result, mapping_info)
        return result

def log_mapped_postback_attempt(result, mapping_info):
    """
    Log the postback attempt to database with mapping information
    """
    try:
        log_entry = {
            "type": "outbound_mapped",
            "partnerName": result["partner_name"],
            "partner_id": result.get("partner_id", ""),
            "survey_id": mapping_info.get("survey_id", ""),
            "mapping_id": str(mapping_info.get("_id", "")),
            "url": result["url"],
            "status": "success" if result["success"] else "failure",
            "status_code": result["status_code"],
            "response": result.get("response_text", result.get("error", "")),
            "timestamp": datetime.utcnow(),
            "timestamp_str": (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S IST'),
            "payout": 0.0,  # Will be updated with actual payout if available
            "parameter_mappings": mapping_info.get("parameter_mappings", {})
        }
        
        # Save to mapped postback logs collection
        db.mapped_postback_logs.insert_one(log_entry)
        print(f"📝 Logged mapped postback attempt for {result['partner_name']}")
        
    except Exception as log_error:
        print(f"❌ Error logging mapped postback attempt: {log_error}")

# Export the main function
__all__ = ['send_postbacks_to_mapped_partners']
