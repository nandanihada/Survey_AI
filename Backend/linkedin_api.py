"""
LinkedIn OAuth + Publish API for Pepperwahl
============================================
Routes:
  GET  /api/linkedin/status                          — check if current user has LinkedIn connected
  GET  /auth/linkedin                                — start OAuth flow (redirect to LinkedIn)
  GET  /auth/linkedin/callback                       — handle OAuth callback, save tokens
  POST /api/linkedin/disconnect                      — remove stored LinkedIn account
  POST /api/admin/surveys/<id>/linkedin-generate-copy  — AI-generate post text
  POST /api/admin/surveys/<id>/linkedin-generate-image — generate 1200x627 PNG card
  POST /api/admin/surveys/<id>/publish-to-linkedin   — full publish flow (image + post)
"""

import os
import io
import json
import secrets
import time
import urllib.parse
from datetime import datetime, timedelta

import requests as ext_requests
from bson import ObjectId
from flask import Blueprint, request, jsonify, redirect, g
from flask_cors import cross_origin

from auth_middleware import requireAuth, requireAdmin
from mongodb_config import db

# ── Blueprint ─────────────────────────────────────────────────────────────────

linkedin_bp = Blueprint("linkedin", __name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _li_client_id():
    return os.environ.get("LI_CLIENT_ID", "")

def _li_client_secret():
    return os.environ.get("LI_CLIENT_SECRET", "")

def _li_version():
    return os.environ.get("LI_VERSION", "202409")

def _frontend_url():
    return os.environ.get("FRONTEND_URL", "https://survey.pepperwahl.com")

def _backend_url():
    """Callback must be an absolute URL registered in the LinkedIn app."""
    return os.environ.get("BACKEND_URL", "https://survey.pepperwahl.com")


def _get_linkedin_account(user_id: str):
    """Return the stored LinkedIn account for the given Pepperwahl user_id, or None."""
    return db.linkedin_accounts.find_one({"user_id": user_id})


def _save_linkedin_account(user_id: str, data: dict):
    """Upsert the LinkedIn account record for a user."""
    db.linkedin_accounts.update_one(
        {"user_id": user_id},
        {"$set": {**data, "user_id": user_id, "updated_at": datetime.utcnow().isoformat()}},
        upsert=True,
    )


def _refresh_token_if_needed(user_id: str) -> dict | None:
    """
    If the stored access token expires within 7 days, refresh it.
    Returns the (possibly refreshed) account doc, or None if not connected.
    """
    account = _get_linkedin_account(user_id)
    if not account:
        return None

    expires_at_str = account.get("expires_at")
    if not expires_at_str:
        return account

    try:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.utcnow() < expires_at - timedelta(days=7):
            return account  # still fresh

        # Attempt refresh
        refresh_token = account.get("refresh_token")
        if not refresh_token:
            return account  # no refresh token, return stale

        resp = ext_requests.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": _li_client_id(),
                "client_secret": _li_client_secret(),
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        if resp.status_code == 200:
            token_data = resp.json()
            new_expires = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 5184000))
            new_refresh_expires = datetime.utcnow() + timedelta(seconds=token_data.get("refresh_token_expires_in", 31536000))
            update = {
                "access_token": token_data["access_token"],
                "expires_at": new_expires.isoformat(),
            }
            if token_data.get("refresh_token"):
                update["refresh_token"] = token_data["refresh_token"]
                update["refresh_expires_at"] = new_refresh_expires.isoformat()
            _save_linkedin_account(user_id, update)
            account.update(update)
        return account
    except Exception as e:
        print(f"[LinkedIn] Token refresh failed for {user_id}: {e}")
        return account


def _generate_image_png(title: str, questions: list, source_type: str = "survey") -> bytes:
    """
    Generate a 1200x627 PNG card using Pillow (pure Python, no Node/satori needed).
    Returns raw PNG bytes.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        raise RuntimeError("Pillow not installed. Run: pip install Pillow")

    W, H = 1200, 627

    # ── Background gradient (dark navy → brand colour) ─────────────────────
    img = Image.new("RGB", (W, H), "#0A0F1E")
    draw = ImageDraw.Draw(img)

    # Gradient strip on left
    for x in range(8):
        alpha = int(255 * (1 - x / 8))
        draw.rectangle([(x, 0), (x, H)], fill="#E8503A")

    # Decorative top-right accent circle
    draw.ellipse([(W - 320, -120), (W + 80, 280)], fill="#12213A")
    draw.ellipse([(W - 280, -80), (W + 40, 240)], fill="#1A2D4A")

    # Bottom brand bar
    draw.rectangle([(0, H - 70), (W, H)], fill="#0E1929")
    draw.line([(0, H - 70), (W, H - 70)], fill="#E8503A", width=3)

    # ── Fonts (use default if custom not available) ──────────────────────────
    def _font(size: int, bold: bool = False):
        try:
            import platform
            if platform.system() == "Windows":
                face = "arialbd.ttf" if bold else "arial.ttf"
            else:
                face = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
            return ImageFont.truetype(face, size)
        except Exception:
            return ImageFont.load_default()

    font_label   = _font(18)
    font_title   = _font(52, bold=True)
    font_title_sm = _font(40, bold=True)
    font_q       = _font(24)
    font_brand   = _font(22, bold=True)
    font_sub     = _font(18)

    # ── Label pill ───────────────────────────────────────────────────────────
    label_text = "SURVEY" if source_type != "funnel" else "FUNNEL"
    draw.rounded_rectangle([(60, 55), (60 + 120, 55 + 36)], radius=18, fill="#E8503A")
    draw.text((60 + 14, 55 + 8), label_text, font=font_label, fill="#FFFFFF")

    # ── Title ────────────────────────────────────────────────────────────────
    # Wrap long titles
    max_chars_per_line = 28
    words = title.split()
    lines, current = [], ""
    for w in words:
        if len(current) + len(w) + 1 <= max_chars_per_line:
            current = (current + " " + w).strip()
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    lines = lines[:3]  # max 3 lines

    use_font = font_title if len(title) < 40 else font_title_sm
    y = 115
    for line in lines:
        draw.text((60, y), line, font=use_font, fill="#FFFFFF")
        y += use_font.size + 8

    # ── Questions preview ────────────────────────────────────────────────────
    q_start_y = max(y + 30, 270)
    draw.text((60, q_start_y - 30), "Key questions:", font=font_sub, fill="#9EB4CC")

    for i, q in enumerate(questions[:3]):
        q_text = q if isinstance(q, str) else q.get("question", "")
        if len(q_text) > 70:
            q_text = q_text[:67] + "..."
        dot_x, dot_y = 60, q_start_y + i * 46 + 12
        draw.ellipse([(dot_x, dot_y), (dot_x + 8, dot_y + 8)], fill="#E8503A")
        draw.text((dot_x + 18, q_start_y + i * 46), q_text, font=font_q, fill="#D0E4F5")

    # ── Brand footer ─────────────────────────────────────────────────────────
    draw.text((60, H - 48), "pepperwahl.com", font=font_brand, fill="#E8503A")
    draw.text((W - 280, H - 48), "Take the survey →", font=font_sub, fill="#9EB4CC")

    # ── Export to bytes ───────────────────────────────────────────────────────
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _generate_post_copy(title: str, questions: list, audience: str = "") -> dict:
    """
    Call OpenAI to generate LinkedIn post copy.
    Returns { commentary, title, description } — all within LinkedIn limits.
    """
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        # Fallback: template-based copy
        return {
            "commentary": (
                f"We're running a survey on '{title}' and would love your input.\n\n"
                "Your feedback helps us improve and make better decisions. "
                "Takes just 2–3 minutes to complete.\n\n"
                "Click the link below to participate. 🙏"
            ),
            "title": title[:70],
            "description": f"Share your thoughts on {title}. Quick survey, big impact."[:120],
        }

    first_3_qs = []
    for q in questions[:3]:
        text = q if isinstance(q, str) else q.get("question", "")
        if text:
            first_3_qs.append(text)

    prompt = f"""You are writing a LinkedIn post to promote a survey. Generate engaging copy.

Survey title: {title}
First questions: {json.dumps(first_3_qs)}
Target audience: {audience or "professionals"}

Return ONLY valid JSON with exactly these keys:
{{
  "commentary": "3 lines max. Hook in first 200 chars. Professional but conversational. End with a call to action. No hashtags.",
  "title": "Max 70 chars. Compelling title for the article card.",
  "description": "Max 120 chars. One sentence describing the survey."
}}

Return raw JSON only, no markdown fences."""

    try:
        resp = ext_requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 400,
                "response_format": {"type": "json_object"},
            },
            timeout=30,
        )
        if resp.status_code == 200:
            raw = resp.json()["choices"][0]["message"]["content"]
            data = json.loads(raw)
            return {
                "commentary": str(data.get("commentary", ""))[:2500],
                "title": str(data.get("title", title))[:70],
                "description": str(data.get("description", ""))[:120],
            }
    except Exception as e:
        print(f"[LinkedIn] Copy generation error: {e}")

    # Fallback
    return {
        "commentary": (
            f"We're exploring '{title}' — and we want to hear from you.\n\n"
            "Share your perspective in this quick survey. "
            "Your answers directly shape our next steps.\n\n"
            "Click below to participate — it only takes 2 minutes."
        ),
        "title": title[:70],
        "description": f"Share your thoughts on {title}. Quick survey, big impact."[:120],
    }


def _upload_image_to_linkedin(access_token: str, person_urn: str, image_bytes: bytes) -> str:
    """
    Upload PNG bytes to LinkedIn using the 3-step image upload flow.
    Returns the image URN on success, raises on failure.
    """
    version = _li_version()
    headers_base = {
        "Authorization": f"Bearer {access_token}",
        "LinkedIn-Version": version,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }

    # Step 1 — Initialize upload
    init_resp = ext_requests.post(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        headers=headers_base,
        json={"initializeUploadRequest": {"owner": person_urn}},
        timeout=15,
    )
    if init_resp.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn initializeUpload failed: {init_resp.status_code} {init_resp.text[:300]}")

    init_data = init_resp.json().get("value", {})
    upload_url = init_data.get("uploadUrl") or init_data.get("upload_url")
    image_urn = init_data.get("image") or init_data.get("imageUrn")

    if not upload_url or not image_urn:
        raise RuntimeError(f"LinkedIn initializeUpload missing uploadUrl/image: {init_resp.text[:300]}")

    # Step 2 — Binary PUT
    put_resp = ext_requests.put(
        upload_url,
        headers={"Authorization": f"Bearer {access_token}"},
        data=image_bytes,
        timeout=60,
    )
    if put_resp.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn image PUT failed: {put_resp.status_code} {put_resp.text[:300]}")

    # Step 3 — Poll until AVAILABLE (max 30s)
    encoded_urn = urllib.parse.quote(image_urn, safe="")
    for _ in range(10):
        time.sleep(3)
        poll_resp = ext_requests.get(
            f"https://api.linkedin.com/rest/images/{encoded_urn}",
            headers=headers_base,
            timeout=15,
        )
        if poll_resp.status_code == 200:
            status = poll_resp.json().get("status", "")
            if status == "AVAILABLE":
                return image_urn
            if status in ("FAILED", "ERROR"):
                raise RuntimeError(f"LinkedIn image processing failed: {status}")
        # continue polling

    # If still not available after polling, return urn anyway (LinkedIn may still accept it)
    return image_urn


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. Status ─────────────────────────────────────────────────────────────────

@linkedin_bp.route("/api/linkedin/status", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAuth
def linkedin_status():
    """Returns whether the current user has a connected LinkedIn account."""
    if request.method == "OPTIONS":
        return "", 200
    user_id = str(g.current_user["_id"])
    account = _get_linkedin_account(user_id)
    if not account:
        return jsonify({"connected": False})
    return jsonify({
        "connected": True,
        "name": account.get("name", ""),
        "person_urn": account.get("person_urn", ""),
        "expires_at": account.get("expires_at", ""),
    })


# ── 2. OAuth start ────────────────────────────────────────────────────────────

@linkedin_bp.route("/auth/linkedin", methods=["GET"])
def linkedin_oauth_start():
    """
    Redirect the user to LinkedIn's authorization page.
    Expects ?user_id=<pepperwahl_user_id> in the query string so we can
    tie the callback back to the right account.
    """
    client_id = _li_client_id()
    if not client_id:
        return jsonify({"error": "LinkedIn app not configured (LI_CLIENT_ID missing)"}), 503

    user_id = request.args.get("user_id", "")
    # Encode user_id into the state param for CSRF protection + routing
    state = f"{secrets.token_urlsafe(16)}.{user_id}"

    # Store state in DB briefly so callback can verify it
    db.linkedin_oauth_states.insert_one({
        "state": state,
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
    })

    redirect_uri = f"{_backend_url()}/auth/linkedin/callback"
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": "openid profile w_member_social",
    }
    auth_url = "https://www.linkedin.com/oauth/v2/authorization?" + urllib.parse.urlencode(params)
    return redirect(auth_url)


# ── 3. OAuth callback ─────────────────────────────────────────────────────────

@linkedin_bp.route("/auth/linkedin/callback", methods=["GET"])
def linkedin_oauth_callback():
    """
    Exchange the auth code for tokens, fetch profile, store in MongoDB,
    then redirect the user back to the admin dashboard.
    """
    code  = request.args.get("code", "")
    state = request.args.get("state", "")
    error = request.args.get("error", "")

    frontend = _frontend_url()

    if error:
        return redirect(f"{frontend}/admin?linkedin=error&reason={urllib.parse.quote(error)}")

    if not code or not state:
        return redirect(f"{frontend}/admin?linkedin=error&reason=missing_params")

    # Verify state
    state_doc = db.linkedin_oauth_states.find_one_and_delete({"state": state})
    if not state_doc:
        return redirect(f"{frontend}/admin?linkedin=error&reason=invalid_state")

    user_id = state_doc.get("user_id", "")

    redirect_uri = f"{_backend_url()}/auth/linkedin/callback"

    # Exchange code for tokens
    token_resp = ext_requests.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": _li_client_id(),
            "client_secret": _li_client_secret(),
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )

    if token_resp.status_code != 200:
        print(f"[LinkedIn] Token exchange failed: {token_resp.text}")
        return redirect(f"{frontend}/admin?linkedin=error&reason=token_exchange_failed")

    token_data = token_resp.json()
    access_token  = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")
    expires_in    = token_data.get("expires_in", 5184000)        # 60 days default
    refresh_expires_in = token_data.get("refresh_token_expires_in", 31536000)  # 365 days

    expires_at         = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
    refresh_expires_at = (datetime.utcnow() + timedelta(seconds=refresh_expires_in)).isoformat()

    # Fetch profile (sub = person id, used for URN)
    userinfo_resp = ext_requests.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )

    person_sub  = ""
    person_name = ""
    if userinfo_resp.status_code == 200:
        uinfo       = userinfo_resp.json()
        person_sub  = uinfo.get("sub", "")
        person_name = uinfo.get("name", uinfo.get("given_name", ""))

    person_urn = f"urn:li:person:{person_sub}" if person_sub else ""

    # Save to MongoDB
    _save_linkedin_account(user_id, {
        "person_urn":         person_urn,
        "access_token":       access_token,
        "refresh_token":      refresh_token,
        "expires_at":         expires_at,
        "refresh_expires_at": refresh_expires_at,
        "name":               person_name,
    })

    print(f"[LinkedIn] Connected account for user {user_id}: {person_name} ({person_urn})")
    return redirect(f"{frontend}/admin?linkedin=connected&name={urllib.parse.quote(person_name)}")


# ── 4. Disconnect ─────────────────────────────────────────────────────────────

@linkedin_bp.route("/api/linkedin/disconnect", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAuth
def linkedin_disconnect():
    """Remove the stored LinkedIn account for the current user."""
    if request.method == "OPTIONS":
        return "", 200
    user_id = str(g.current_user["_id"])
    db.linkedin_accounts.delete_one({"user_id": user_id})
    return jsonify({"success": True, "message": "LinkedIn account disconnected."})


# ── 5. Generate copy ──────────────────────────────────────────────────────────

@linkedin_bp.route("/api/admin/surveys/<survey_short_id>/linkedin-generate-copy", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAdmin
def linkedin_generate_copy(survey_short_id: str):
    """
    Generate LinkedIn post copy for a survey/funnel using OpenAI.
    Returns { commentary, title, description }.
    """
    if request.method == "OPTIONS":
        return "", 200

    try:
        body     = request.get_json(silent=True) or {}
        audience = body.get("audience", "")

        # Fetch survey or funnel
        survey_doc = (
            db.surveys.find_one({"short_id": survey_short_id}) or
            db.surveys.find_one({"id": survey_short_id})
        )
        if survey_doc:
            title     = survey_doc.get("title", "Untitled Survey")
            questions = survey_doc.get("questions", [])
        else:
            funnel_doc = db.funnels.find_one({"funnel_id": survey_short_id})
            if not funnel_doc:
                return jsonify({"error": "Survey or funnel not found"}), 404
            title     = funnel_doc.get("name", "Untitled Funnel")
            questions = []
            # Gather questions from first screening survey of the funnel
            first_s_id = (funnel_doc.get("screening_surveys") or [{}])[0].get("survey_id", "")
            if first_s_id:
                fs = db.surveys.find_one({"$or": [{"id": first_s_id}, {"short_id": first_s_id}]})
                if fs:
                    questions = fs.get("questions", [])

        copy = _generate_post_copy(title, questions, audience)
        return jsonify({"success": True, **copy})

    except Exception as e:
        print(f"[LinkedIn] Copy generation error: {e}")
        return jsonify({"error": str(e)}), 500


# ── 6. Generate image ─────────────────────────────────────────────────────────

@linkedin_bp.route("/api/admin/surveys/<survey_short_id>/linkedin-generate-image", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAdmin
def linkedin_generate_image(survey_short_id: str):
    """
    Generate a 1200x627 PNG preview card for the LinkedIn post.
    Returns the PNG as a base64-encoded data URL for the frontend preview.
    """
    if request.method == "OPTIONS":
        return "", 200

    try:
        import base64

        body = request.get_json(silent=True) or {}
        custom_title = body.get("title", "")

        # Fetch survey or funnel
        survey_doc = (
            db.surveys.find_one({"short_id": survey_short_id}) or
            db.surveys.find_one({"id": survey_short_id})
        )
        if survey_doc:
            title       = custom_title or survey_doc.get("title", "Untitled Survey")
            questions   = survey_doc.get("questions", [])
            source_type = "survey"
        else:
            funnel_doc = db.funnels.find_one({"funnel_id": survey_short_id})
            if not funnel_doc:
                return jsonify({"error": "Survey or funnel not found"}), 404
            title       = custom_title or funnel_doc.get("name", "Untitled Funnel")
            source_type = "funnel"
            first_s_id  = (funnel_doc.get("screening_surveys") or [{}])[0].get("survey_id", "")
            questions   = []
            if first_s_id:
                fs = db.surveys.find_one({"$or": [{"id": first_s_id}, {"short_id": first_s_id}]})
                if fs:
                    questions = fs.get("questions", [])

        png_bytes = _generate_image_png(title, questions, source_type)
        b64 = base64.b64encode(png_bytes).decode("utf-8")
        data_url = f"data:image/png;base64,{b64}"

        return jsonify({"success": True, "image_data_url": data_url})

    except Exception as e:
        print(f"[LinkedIn] Image generation error: {e}")
        return jsonify({"error": str(e)}), 500


# ── 7. Publish ────────────────────────────────────────────────────────────────

@linkedin_bp.route("/api/admin/surveys/<survey_short_id>/publish-to-linkedin", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAdmin
def publish_to_linkedin(survey_short_id: str):
    """
    Full LinkedIn publish flow:
      1. Ensure user has a connected LinkedIn account (with valid token)
      2. Generate image PNG if not already provided
      3. Upload image to LinkedIn
      4. Publish the post with article card
      5. Store post URN back on the survey/funnel document
    """
    if request.method == "OPTIONS":
        return "", 200

    try:
        body        = request.get_json(silent=True) or {}
        commentary  = body.get("commentary", "").strip()
        li_title    = body.get("title", "").strip()
        description = body.get("description", "").strip()

        user_id = str(g.current_user["_id"])

        # ── Check LinkedIn connection ─────────────────────────────────────
        account = _refresh_token_if_needed(user_id)
        if not account:
            return jsonify({
                "success": False,
                "error": "LinkedIn account not connected.",
                "auth_required": True,
                "auth_url": f"/auth/linkedin?user_id={user_id}",
            }), 401

        access_token = account.get("access_token", "")
        person_urn   = account.get("person_urn", "")

        if not access_token or not person_urn:
            return jsonify({
                "success": False,
                "error": "LinkedIn account data incomplete. Please reconnect.",
                "auth_required": True,
                "auth_url": f"/auth/linkedin?user_id={user_id}",
            }), 401

        # ── Fetch survey / funnel info ────────────────────────────────────
        frontend_url = os.environ.get("FRONTEND_URL", "https://survey.pepperwahl.com")

        survey_doc = (
            db.surveys.find_one({"short_id": survey_short_id}) or
            db.surveys.find_one({"id": survey_short_id})
        )
        is_funnel = False

        if survey_doc:
            title       = survey_doc.get("title", "Survey")
            questions   = survey_doc.get("questions", [])
            source_type = "survey"
            survey_link = f"{frontend_url}/survey/{survey_short_id}"
        else:
            funnel_doc = db.funnels.find_one({"funnel_id": survey_short_id})
            if not funnel_doc:
                return jsonify({"success": False, "error": "Survey or funnel not found."}), 404
            is_funnel   = True
            title       = funnel_doc.get("name", "Funnel")
            source_type = "funnel"
            first_s     = (funnel_doc.get("screening_surveys") or [{}])[0]
            first_sid   = first_s.get("survey_id", survey_short_id)
            survey_link = f"{frontend_url}/survey/{first_sid}?f={survey_short_id}"
            questions   = []
            fs = db.surveys.find_one({"$or": [{"id": first_sid}, {"short_id": first_sid}]})
            if fs:
                questions = fs.get("questions", [])

        # ── Auto-generate copy if not provided ────────────────────────────
        if not commentary or not li_title or not description:
            copy = _generate_post_copy(title, questions)
            commentary  = commentary  or copy["commentary"]
            li_title    = li_title    or copy["title"]
            description = description or copy["description"]

        # ── Generate and upload image ─────────────────────────────────────
        png_bytes = _generate_image_png(title, questions, source_type)

        try:
            image_urn = _upload_image_to_linkedin(access_token, person_urn, png_bytes)
        except Exception as img_err:
            print(f"[LinkedIn] Image upload failed: {img_err}. Publishing without image.")
            image_urn = None

        # ── Build post payload ────────────────────────────────────────────
        version = _li_version()
        post_payload = {
            "author": person_urn,
            "commentary": commentary,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "thirdPartyDistributionChannels": [],
            },
            "content": {
                "article": {
                    "source": survey_link,
                    "title": li_title,
                    "description": description,
                }
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }

        if image_urn:
            post_payload["content"]["article"]["thumbnail"] = image_urn

        # ── POST to LinkedIn ──────────────────────────────────────────────
        post_resp = ext_requests.post(
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
            err_body = post_resp.text[:500]
            print(f"[LinkedIn] Post failed {post_resp.status_code}: {err_body}")
            return jsonify({
                "success": False,
                "error": f"LinkedIn rejected the post (HTTP {post_resp.status_code}). {err_body}",
            }), 400

        # Extract post URN from response header
        post_urn = post_resp.headers.get("x-restli-id", "")

        # ── Persist LinkedIn post URN back to survey / funnel ─────────────
        update_fields = {
            "linkedin_post_urn":         post_urn,
            "linkedin_post_url":         f"https://www.linkedin.com/feed/update/{urllib.parse.quote(post_urn)}" if post_urn else "",
            "linkedin_published_at":     datetime.utcnow().isoformat(),
            "linkedin_published_by":     user_id,
            "linkedin_post_title":       li_title,
            "linkedin_post_commentary":  commentary,
        }

        if is_funnel:
            db.funnels.update_one(
                {"$or": [{"funnel_id": survey_short_id}, {"_id": survey_short_id}]},
                {"$set": update_fields},
            )
        else:
            db.surveys.update_one(
                {"$or": [{"id": survey_short_id}, {"short_id": survey_short_id}, {"_id": survey_short_id}]},
                {"$set": update_fields},
            )

        print(f"[LinkedIn] Published for user {user_id}: {post_urn}")

        return jsonify({
            "success":      True,
            "post_urn":     post_urn,
            "post_url":     update_fields["linkedin_post_url"],
            "message":      "Successfully published to LinkedIn!",
            "survey_link":  survey_link,
            "image_used":   bool(image_urn),
        })

    except Exception as e:
        import traceback
        print(f"[LinkedIn] Publish error: {traceback.format_exc()}")
        return jsonify({"success": False, "error": f"Internal error: {str(e)}"}), 500


# ══════════════════════════════════════════════════════════════════════════════
# SCHEDULING ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@linkedin_bp.route("/api/admin/surveys/<survey_short_id>/linkedin-schedule", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAdmin
def linkedin_schedule(survey_short_id: str):
    """
    Schedule a LinkedIn post for a future date/time.
    Body: { publish_at: ISO datetime str, commentary, title, description }
    """
    if request.method == "OPTIONS":
        return "", 200
    try:
        body        = request.get_json(silent=True) or {}
        publish_at  = body.get("publish_at", "").strip()
        commentary  = body.get("commentary", "").strip()
        li_title    = body.get("title", "").strip()
        description = body.get("description", "").strip()

        if not publish_at:
            return jsonify({"success": False, "error": "publish_at is required"}), 400
        if not commentary or not li_title:
            return jsonify({"success": False, "error": "commentary and title are required"}), 400

        # Validate datetime is in the future
        try:
            from datetime import timezone as _tz
            dt = datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
            if dt <= datetime.now(_tz.utc):
                return jsonify({"success": False, "error": "publish_at must be in the future"}), 400
        except ValueError:
            return jsonify({"success": False, "error": "Invalid publish_at datetime format"}), 400

        user_id = str(g.current_user["_id"])

        # Check LinkedIn connected
        account = _get_linkedin_account(user_id)
        if not account:
            return jsonify({
                "success": False,
                "error": "LinkedIn account not connected.",
                "auth_required": True,
                "auth_url": f"/auth/linkedin?user_id={user_id}",
            }), 401

        doc = {
            "type":         "linkedin",
            "survey_id":    survey_short_id,
            "user_id":      user_id,
            "status":       "scheduled",
            "scheduled_at": datetime.utcnow().isoformat(),
            "publish_at":   dt.isoformat(),
            "payload": {
                "commentary":  commentary,
                "title":       li_title,
                "description": description,
            },
            "result":       None,
            "error":        None,
            "fired_at":     None,
        }
        result = db.publish_schedule.insert_one(doc)

        return jsonify({
            "success":    True,
            "schedule_id": str(result.inserted_id),
            "publish_at": dt.isoformat(),
            "message":    f"LinkedIn post scheduled for {dt.strftime('%d %b %Y %H:%M UTC')}",
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@linkedin_bp.route("/api/admin/surveys/<survey_short_id>/linkedin-schedule", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAdmin
def linkedin_schedule_list(survey_short_id: str):
    """Return all scheduled (pending) LinkedIn posts for this survey."""
    if request.method == "OPTIONS":
        return "", 200
    try:
        items = list(db.publish_schedule.find(
            {"type": "linkedin", "survey_id": survey_short_id, "status": "scheduled"},
            {"_id": 1, "publish_at": 1, "scheduled_at": 1, "payload": 1}
        ).sort("publish_at", 1))
        for it in items:
            it["_id"] = str(it["_id"])
        return jsonify({"success": True, "scheduled": items})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@linkedin_bp.route("/api/admin/linkedin-schedule/<schedule_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(supports_credentials=True)
@requireAdmin
def linkedin_schedule_cancel(schedule_id: str):
    """Cancel a scheduled LinkedIn post by its schedule_id."""
    if request.method == "OPTIONS":
        return "", 200
    try:
        from bson import ObjectId
        result = db.publish_schedule.update_one(
            {"_id": ObjectId(schedule_id), "status": "scheduled"},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow().isoformat()}},
        )
        if result.matched_count == 0:
            return jsonify({"success": False, "error": "Schedule not found or already fired"}), 404
        return jsonify({"success": True, "message": "Scheduled post cancelled"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
