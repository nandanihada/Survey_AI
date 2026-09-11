"""
publish_scheduler.py
====================
Background thread that polls MongoDB every 30 seconds for
scheduled publishes (Moustache + LinkedIn) and fires them when due.

Collection: publish_schedule
Document shape:
{
    "_id":          ObjectId,
    "type":         "moustache" | "linkedin",
    "survey_id":    str,          # short_id or funnel_id
    "user_id":      str,          # owner
    "status":       "scheduled" | "processing" | "done" | "failed" | "cancelled",
    "scheduled_at": ISO str,      # when the user set the schedule
    "publish_at":   ISO str,      # when to actually fire
    "payload":      dict,         # full publish payload (questions+extra for Moustache; copy for LinkedIn)
    "result":       dict | None,
    "error":        str | None,
    "fired_at":     ISO str | None,
}
"""

import time
import threading
import traceback
from datetime import datetime, timezone

_worker_lock    = threading.Lock()
_worker_started = False


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fire_moustache(item: dict) -> dict:
    """Execute a scheduled Moustache publish."""
    import os
    import requests as ext_req
    from mongodb_config import db

    payload   = item.get("payload", {})
    questions = payload.get("questions", [])
    extra     = payload.get("extra", {})
    survey_id = item["survey_id"]

    moustache_api_key = os.environ.get("MOUSTACHE_API_KEY", "")
    moustache_api_url = os.environ.get(
        "MOUSTACHE_API_URL",
        "https://api.moustacheleads.com/api/external/pepperwahl/publish",
    )
    frontend_url = os.environ.get("FRONTEND_URL", "https://survey.pepperwahl.com")

    if not moustache_api_key:
        raise RuntimeError("MOUSTACHE_API_KEY not configured")

    # Look up survey or funnel to build survey_link
    survey_doc = (
        db.surveys.find_one({"short_id": survey_id}) or
        db.surveys.find_one({"id": survey_id})
    )
    if survey_doc:
        survey_name = survey_doc.get("title", "Survey")
        survey_link = f"{frontend_url}/survey/{survey_id}?uid={{{{user_id}}}}&src=moustache"
    else:
        funnel_doc = db.funnels.find_one({"funnel_id": survey_id})
        if not funnel_doc:
            raise RuntimeError(f"Survey/funnel {survey_id} not found")
        survey_name = funnel_doc.get("name", "Funnel")
        first_sid   = (funnel_doc.get("screening_surveys") or [{}])[0].get("survey_id", survey_id)
        survey_link = f"{frontend_url}/survey/{first_sid}?funnel={survey_id}&uid={{{{user_id}}}}&src=moustache"

    # Auto-generate description if not provided
    description = extra.get("description", "").strip()
    if not description:
        description = f"Participate in our {survey_name} survey. Share your opinions and help us understand consumer preferences. Takes just a few minutes to complete."

    # Build full payload — mirrors the normal publish_to_moustache route exactly
    api_payload = {
        "survey_id":   survey_id,
        "survey_name": survey_name,
        "survey_link": survey_link,
        "description": description,
        "questions":   questions,
        "payout_usd":  0.0,
        "country":     extra.get("country", "US") or "US",
    }

    # Expand all extra fields
    if extra.get("payout"):
        try: api_payload["payout_usd"] = float(extra["payout"])
        except (ValueError, TypeError): pass
    if extra.get("country"):
        api_payload["country"] = extra["country"]
    if extra.get("min_age"):
        try: api_payload["min_age"] = int(extra["min_age"])
        except: pass
    if extra.get("max_age"):
        try: api_payload["max_age"] = int(extra["max_age"])
        except: pass
    if extra.get("loi_minutes"):
        try: api_payload["loi_minutes"] = int(extra["loi_minutes"])
        except: pass
    if extra.get("survey_type"): api_payload["survey_type"] = extra["survey_type"]
    if extra.get("notes"):       api_payload["notes"]        = extra["notes"]
    if extra.get("source_type"): api_payload["source_type"]  = extra["source_type"]
    if extra.get("expiry_date"): api_payload["expiry_date"]  = extra["expiry_date"]

    resp = ext_req.post(
        moustache_api_url,
        json=api_payload,
        headers={"Content-Type": "application/json", "X-API-Key": moustache_api_key},
        timeout=20,
    )
    resp_data = resp.json()
    if not resp.ok or not resp_data.get("success"):
        raise RuntimeError(resp_data.get("error") or f"HTTP {resp.status_code}")

    ml_id     = resp_data.get("moustache_survey_id", "")
    ml_status = resp_data.get("status", "published")

    # Persist back
    _update = {
        "moustache_survey_id":      ml_id,
        "moustache_status":         ml_status,
        "moustache_published_at":   _now_iso(),
        "moustache_questions":      payload.get("questions", []),
        "moustache_extra":          payload.get("extra", {}),
    }
    if survey_doc:
        db.surveys.update_one(
            {"$or": [{"id": survey_id}, {"short_id": survey_id}]},
            {"$set": _update},
        )
    else:
        db.funnels.update_one(
            {"funnel_id": survey_id},
            {"$set": _update},
        )

    return {"moustache_survey_id": ml_id, "status": ml_status}


def _fire_linkedin(item: dict) -> dict:
    """Execute a scheduled LinkedIn publish."""
    import os
    import urllib.parse
    import time as _time
    import requests as ext_req
    from mongodb_config import db
    from linkedin_api import (
        _refresh_token_if_needed,
        _generate_image_png,
        _upload_image_to_linkedin,
        _li_version,
    )

    user_id   = item["user_id"]
    survey_id = item["survey_id"]
    payload   = item.get("payload", {})
    frontend_url = os.environ.get("FRONTEND_URL", "https://survey.pepperwahl.com")

    # Token
    account = _refresh_token_if_needed(user_id)
    if not account:
        raise RuntimeError("LinkedIn account not connected for this user")

    access_token = account.get("access_token", "")
    person_urn   = account.get("person_urn", "")
    if not access_token or not person_urn:
        raise RuntimeError("LinkedIn token/urn missing")

    commentary  = payload.get("commentary", "")
    li_title    = payload.get("title", "")
    description = payload.get("description", "")

    # Survey link
    survey_doc = (
        db.surveys.find_one({"short_id": survey_id}) or
        db.surveys.find_one({"id": survey_id})
    )
    is_funnel = False
    if survey_doc:
        title       = survey_doc.get("title", "Survey")
        questions   = survey_doc.get("questions", [])
        source_type = "survey"
        survey_link = f"{frontend_url}/survey/{survey_id}"
    else:
        funnel_doc = db.funnels.find_one({"funnel_id": survey_id})
        if not funnel_doc:
            raise RuntimeError(f"Survey/funnel {survey_id} not found")
        is_funnel   = True
        title       = funnel_doc.get("name", "Funnel")
        source_type = "funnel"
        first_s     = (funnel_doc.get("screening_surveys") or [{}])[0]
        first_sid   = first_s.get("survey_id", survey_id)
        survey_link = f"{frontend_url}/survey/{first_sid}?f={survey_id}"
        questions   = []

    # Generate + upload image
    try:
        png_bytes = _generate_image_png(title, questions, source_type)
        image_urn = _upload_image_to_linkedin(access_token, person_urn, png_bytes)
    except Exception as img_err:
        print(f"[Scheduler/LinkedIn] Image upload failed: {img_err}. Posting without image.")
        image_urn = None

    # Build post
    version = _li_version()
    post_payload = {
        "author":      person_urn,
        "commentary":  commentary,
        "visibility":  "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED", "thirdPartyDistributionChannels": []},
        "content": {"article": {"source": survey_link, "title": li_title, "description": description}},
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    if image_urn:
        post_payload["content"]["article"]["thumbnail"] = image_urn

    post_resp = ext_req.post(
        "https://api.linkedin.com/rest/posts",
        headers={
            "Authorization": f"Bearer {access_token}",
            "LinkedIn-Version": version,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        },
        json=post_payload,
        timeout=30,
    )
    if post_resp.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn post failed {post_resp.status_code}: {post_resp.text[:300]}")

    post_urn  = post_resp.headers.get("x-restli-id", "")
    post_url  = f"https://www.linkedin.com/feed/update/{urllib.parse.quote(post_urn)}" if post_urn else ""

    _update = {
        "linkedin_post_urn":        post_urn,
        "linkedin_post_url":        post_url,
        "linkedin_published_at":    _now_iso(),
        "linkedin_published_by":    user_id,
        "linkedin_post_title":      li_title,
        "linkedin_post_commentary": commentary,
    }
    if is_funnel:
        db.funnels.update_one({"funnel_id": survey_id}, {"$set": _update})
    else:
        db.surveys.update_one(
            {"$or": [{"id": survey_id}, {"short_id": survey_id}]},
            {"$set": _update},
        )

    return {"post_urn": post_urn, "post_url": post_url}


# ── Worker loop ───────────────────────────────────────────────────────────────

def _scheduler_loop():
    """Run forever, polling every 30 seconds for due scheduled publishes."""
    from mongodb_config import db

    print("[PublishScheduler] Worker started")
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Atomically claim the next due item
            item = db.publish_schedule.find_one_and_update(
                {
                    "status":     "scheduled",
                    "publish_at": {"$lte": now.isoformat()},
                },
                {"$set": {"status": "processing", "fired_at": now.isoformat()}},
                sort=[("publish_at", 1)],
            )
            if not item:
                time.sleep(30)
                continue

            item_id   = item["_id"]
            item_type = item.get("type", "")
            print(f"[PublishScheduler] Firing {item_type} publish for survey {item['survey_id']}")

            try:
                if item_type == "moustache":
                    result = _fire_moustache(item)
                elif item_type == "linkedin":
                    result = _fire_linkedin(item)
                else:
                    raise RuntimeError(f"Unknown publish type: {item_type}")

                db.publish_schedule.update_one(
                    {"_id": item_id},
                    {"$set": {"status": "done", "result": result, "completed_at": _now_iso()}},
                )
                print(f"[PublishScheduler] Done: {item_type} / {item['survey_id']}")

            except Exception as fire_err:
                print(f"[PublishScheduler] Error: {fire_err}\n{traceback.format_exc()}")
                db.publish_schedule.update_one(
                    {"_id": item_id},
                    {"$set": {"status": "failed", "error": str(fire_err), "completed_at": _now_iso()}},
                )

        except Exception as outer:
            print(f"[PublishScheduler] Outer error: {outer}")
            time.sleep(10)


def start_scheduler():
    """Start the background scheduler thread (idempotent)."""
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        _worker_started = True
        t = threading.Thread(target=_scheduler_loop, daemon=True, name="PublishScheduler")
        t.start()
        print("[PublishScheduler] Thread launched")
