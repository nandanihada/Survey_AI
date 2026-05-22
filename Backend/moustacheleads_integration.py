"""
Moustacheleads Survey Router Integration

When users arrive from Moustacheleads, the URL contains:
  - session_id: Moustacheleads session identifier
  - postback_url: URL to fire GET on survey completion
  - success_url: Redirect destination on pass/completion
  - fail_url: Redirect destination on fail
  - quota_url: Redirect destination when survey is full/quota reached

On survey completion:
  1. Fire GET to postback_url with ?status=completed&payout=X
  2. Redirect user to success_url (pass), fail_url (fail), or quota_url (quota full)
"""

import requests
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse, parse_qs, urljoin
from mongodb_config import db


# Moustacheleads URL parameter names
ML_PARAMS = ['ml_session_id', 'postback_url', 'success_url', 'fail_url', 'quota_url']


def is_moustacheleads_session(request_data: dict) -> bool:
    """Check if this survey session originated from Moustacheleads."""
    ml_data = request_data.get('moustacheleads') or {}
    return bool(ml_data.get('postback_url'))


def extract_moustacheleads_params(query_params: dict) -> dict:
    """
    Extract Moustacheleads-specific parameters from URL query params.
    
    Args:
        query_params: Dict of URL query parameters
        
    Returns:
        Dict with Moustacheleads params (empty if not a ML session)
    """
    ml_data = {}
    
    # session_id from Moustacheleads (use ml_session_id to avoid collision with our session_id)
    ml_session = query_params.get('session_id') or query_params.get('ml_session_id')
    if ml_session:
        ml_data['ml_session_id'] = ml_session
    
    # Required callback URLs
    for param in ['postback_url', 'success_url', 'fail_url', 'quota_url']:
        value = query_params.get(param)
        if value:
            ml_data[param] = value
    
    # Only return data if at least postback_url is present (indicates ML traffic)
    if ml_data.get('postback_url'):
        return ml_data
    
    return {}


def store_moustacheleads_session(session_id: str, survey_id: str, ml_data: dict) -> bool:
    """
    Store Moustacheleads session data in MongoDB for later use on completion.
    
    Args:
        session_id: Our internal session ID
        survey_id: The survey being taken
        ml_data: Moustacheleads parameters
        
    Returns:
        True if stored successfully
    """
    try:
        doc = {
            "session_id": session_id,
            "survey_id": survey_id,
            "ml_session_id": ml_data.get('ml_session_id', ''),
            "postback_url": ml_data['postback_url'],
            "success_url": ml_data.get('success_url', ''),
            "fail_url": ml_data.get('fail_url', ''),
            "quota_url": ml_data.get('quota_url', ''),
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "postback_fired_at": None,
            "postback_response": None,
            "redirect_url_used": None
        }
        
        # Upsert — one ML session per our session
        db.moustacheleads_sessions.update_one(
            {"session_id": session_id},
            {"$set": doc},
            upsert=True
        )
        
        print(f"✅ [Moustacheleads] Session stored: {session_id}")
        print(f"   ML Session ID: {ml_data.get('ml_session_id', 'N/A')}")
        print(f"   Postback URL: {ml_data['postback_url']}")
        return True
        
    except Exception as e:
        print(f"❌ [Moustacheleads] Failed to store session: {e}")
        return False


def get_moustacheleads_session(session_id: str) -> dict:
    """Retrieve stored Moustacheleads session data."""
    try:
        doc = db.moustacheleads_sessions.find_one({"session_id": session_id})
        return doc or {}
    except Exception as e:
        print(f"❌ [Moustacheleads] Failed to retrieve session: {e}")
        return {}


def fire_moustacheleads_postback(session_id: str, payout: float = 0.0, status: str = "completed") -> dict:
    """
    Fire the completion postback to Moustacheleads.
    
    Sends GET to postback_url with ?status=completed&payout=X
    
    Args:
        session_id: Our internal session ID
        payout: Payout amount to report
        status: Completion status (completed, failed, quota_full)
        
    Returns:
        Dict with success status and details
    """
    ml_session = get_moustacheleads_session(session_id)
    
    if not ml_session:
        return {"success": False, "error": "No Moustacheleads session found"}
    
    postback_url = ml_session.get('postback_url')
    if not postback_url:
        return {"success": False, "error": "No postback URL configured"}
    
    # Already fired? Don't double-fire
    if ml_session.get('status') == 'postback_sent':
        print(f"⚠️ [Moustacheleads] Postback already fired for session {session_id}")
        return {"success": True, "message": "Postback already sent", "already_sent": True}
    
    try:
        # Build postback URL with status and payout params
        separator = '&' if '?' in postback_url else '?'
        params = {
            'status': status,
            'payout': str(payout)
        }
        
        # Include ML session ID if available
        ml_session_id = ml_session.get('ml_session_id')
        if ml_session_id:
            params['session_id'] = ml_session_id
        
        final_url = f"{postback_url}{separator}{urlencode(params)}"
        
        print(f"📡 [Moustacheleads] Firing postback: {final_url}")
        
        # Fire the GET request
        response = requests.get(final_url, timeout=15)
        
        # Log result
        result = {
            "success": response.status_code in [200, 201, 202, 204],
            "status_code": response.status_code,
            "response_text": response.text[:500],
            "url_fired": final_url,
            "payout": payout,
            "status_sent": status
        }
        
        # Update session record
        db.moustacheleads_sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "postback_sent" if result["success"] else "postback_failed",
                "postback_fired_at": datetime.now(timezone.utc),
                "postback_response": {
                    "status_code": response.status_code,
                    "body": response.text[:500],
                    "url": final_url
                }
            }}
        )
        
        if result["success"]:
            print(f"✅ [Moustacheleads] Postback successful: HTTP {response.status_code}")
        else:
            print(f"❌ [Moustacheleads] Postback failed: HTTP {response.status_code}")
        
        # Also log to postback_logs for unified monitoring
        _log_postback(session_id, final_url, response.status_code, response.text[:500], payout)
        
        return result
        
    except requests.exceptions.Timeout:
        print(f"❌ [Moustacheleads] Postback timed out for session {session_id}")
        _update_session_error(session_id, "Timeout")
        return {"success": False, "error": "Postback request timed out"}
        
    except requests.exceptions.RequestException as e:
        print(f"❌ [Moustacheleads] Postback network error: {e}")
        _update_session_error(session_id, str(e))
        return {"success": False, "error": f"Network error: {str(e)}"}
        
    except Exception as e:
        print(f"❌ [Moustacheleads] Postback unexpected error: {e}")
        _update_session_error(session_id, str(e))
        return {"success": False, "error": str(e)}


def get_moustacheleads_redirect_url(session_id: str, evaluation_status: str) -> str:
    """
    Determine the correct redirect URL based on evaluation result.
    
    Args:
        session_id: Our internal session ID
        evaluation_status: "pass", "fail", or "quota_full"
        
    Returns:
        Redirect URL string (or empty string if not a ML session)
    """
    ml_session = get_moustacheleads_session(session_id)
    
    if not ml_session:
        return ""
    
    if evaluation_status == "pass":
        redirect_url = ml_session.get('success_url', '')
    elif evaluation_status == "quota_full":
        redirect_url = ml_session.get('quota_url', '') or ml_session.get('fail_url', '')
    else:  # fail
        redirect_url = ml_session.get('fail_url', '')
    
    if redirect_url:
        # Update session with redirect info
        db.moustacheleads_sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "redirect_url_used": redirect_url,
                "redirect_status": evaluation_status,
                "redirected_at": datetime.now(timezone.utc)
            }}
        )
        print(f"🔗 [Moustacheleads] Redirect URL ({evaluation_status}): {redirect_url}")
    
    return redirect_url


def handle_moustacheleads_completion(
    session_id: str, 
    evaluation_status: str, 
    payout: float = 0.0
) -> dict:
    """
    Full Moustacheleads completion handler — fires postback and returns redirect URL.
    
    This is the main entry point called from the enhanced survey handler.
    
    Args:
        session_id: Our internal session ID
        evaluation_status: "pass", "fail", or "quota_full"
        payout: Payout amount (typically from survey config)
        
    Returns:
        Dict with postback_result and redirect_url
    """
    print(f"\n{'='*50}")
    print(f"🧔 [Moustacheleads] Processing completion")
    print(f"   Session: {session_id}")
    print(f"   Status: {evaluation_status}")
    print(f"   Payout: {payout}")
    print(f"{'='*50}")
    
    # Map evaluation status to Moustacheleads status
    if evaluation_status == "pass":
        ml_status = "completed"
    elif evaluation_status == "quota_full":
        ml_status = "quota_full"
    else:
        ml_status = "failed"
    
    # Fire postback (only on pass/completed — Moustacheleads expects postback on success)
    postback_result = {"success": False, "skipped": True, "reason": "Only fires on completion"}
    if evaluation_status == "pass":
        postback_result = fire_moustacheleads_postback(session_id, payout=payout, status=ml_status)
    
    # Get redirect URL
    redirect_url = get_moustacheleads_redirect_url(session_id, evaluation_status)
    
    return {
        "postback_result": postback_result,
        "redirect_url": redirect_url,
        "ml_status": ml_status,
        "is_moustacheleads": True
    }


def _log_postback(session_id: str, url: str, status_code: int, response_text: str, payout: float):
    """Log postback to unified postback_logs collection."""
    try:
        db.postback_logs.insert_one({
            "type": "outbound",
            "partner": "Moustacheleads",
            "partnerName": "Moustacheleads",
            "session_id": session_id,
            "url": url,
            "status": "success" if status_code in [200, 201, 202, 204] else "failure",
            "status_code": status_code,
            "response_text": response_text,
            "payout": payout,
            "timestamp": datetime.now(timezone.utc)
        })
    except Exception as e:
        print(f"⚠️ [Moustacheleads] Failed to log postback: {e}")


def _update_session_error(session_id: str, error_msg: str):
    """Update session with error info."""
    try:
        db.moustacheleads_sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "postback_failed",
                "postback_fired_at": datetime.now(timezone.utc),
                "postback_response": {"error": error_msg}
            }}
        )
    except Exception:
        pass
