"""
Onboarding Email API
Manages the onboarding email template and automation setting.
The template is stored as a single document in db.onboarding_email_config.
When automation is enabled, every new user who confirms their email receives
this email automatically.
"""

import os
import smtplib
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Ensure .env is loaded — this module may be imported before app.py calls load_dotenv
try:
    from dotenv import load_dotenv
    load_dotenv(override=False)  # don't override already-set env vars
except ImportError:
    pass

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from bson import ObjectId

from auth_middleware import requireAdmin
from mongodb_config import db

logger = logging.getLogger(__name__)

onboarding_email_bp = Blueprint("onboarding_email", __name__, url_prefix="/api/admin/onboarding-email")

# ────────────────────────────────────────────────────────────────────────────
# Default template (Pepperwahl design from the brief)
# ────────────────────────────────────────────────────────────────────────────
DEFAULT_SUBJECT = "Welcome to Pepperwahl — let's check if you're eligible!"

DEFAULT_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Welcome to Pepperwahl</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet"/>
<style>
  body{margin:0;padding:0;background:#FAF7F2;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1c1c18;}
  a{color:inherit;text-decoration:none;}
</style>
</head>
<body style="background:#FAF7F2;padding:24px 8px;">

<!-- wrapper -->
<div style="max-width:600px;margin:0 auto;">

  <!-- header -->
  <div style="background:#ffffff;border:1px solid #e1bebb;border-bottom:none;border-radius:8px 8px 0 0;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-family:'Newsreader',serif;font-size:20px;font-weight:600;color:#7a0009;letter-spacing:-0.01em;">Pepperwahl</span>
    </div>
    <a href="https://survey.pepperwahl.com" style="font-size:12px;font-weight:600;color:#7a0009;">Open Platform →</a>
  </div>

  <!-- body -->
  <div style="background:#ffffff;border:1px solid #e1bebb;border-top:none;border-radius:0 0 8px 8px;padding:40px 32px;">

    <!-- meta badge -->
    <div style="margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid #f0eee8;display:flex;align-items:center;justify-content:space-between;">
      <span style="background:#f0eee8;color:#605e5c;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:4px;">
        ● Researcher Onboarding
      </span>
      <span style="color:#605e5c;font-size:11px;">Edition #01 · 3 min setup</span>
    </div>

    <!-- hero -->
    <h1 style="font-family:'Newsreader',serif;font-size:32px;line-height:1.25;font-weight:500;color:#7a0009;letter-spacing:-0.015em;margin:0 0 16px;">
      Welcome to Pepperwahl. Smarter surveys, real-time responses, effortless insights.
    </h1>
    <p style="font-size:16px;line-height:1.65;color:#605e5c;margin:0 0 32px;">
      You've joined thousands of product managers, researchers, and creators gathering actionable customer intelligence with AI-generated forms.
    </p>

    <!-- eligibility CTA -->
    <div style="background:#f6f3ed;border:1px solid #e1bebb;border-radius:8px;padding:20px 24px;margin-bottom:32px;">
      <p style="font-size:14px;font-weight:600;color:#1c1c18;margin:0 0 4px;">Let's check — are you eligible?</p>
      <p style="font-size:12px;color:#605e5c;margin:0 0 16px;">Fill in this quick survey to unlock your personalised plan.</p>
      <a href="{{SURVEY_LINK}}" style="display:inline-block;background:#9e1b1b;color:#fff;padding:10px 22px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:0.01em;">
        Take the Survey →
      </a>
    </div>

    <!-- divider -->
    <div style="text-align:center;margin:24px 0;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#605e5c;">── Three-Step Quick Start ──</div>

    <!-- steps -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:12px 16px;border:1px solid #ebe8e2;border-radius:6px;margin-bottom:8px;display:block;margin-bottom:8px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="min-width:28px;height:28px;background:#FAF7F2;border:1px solid #ebe8e2;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-family:'Newsreader',serif;font-size:16px;font-weight:600;color:#7a0009;">1</span>
            <div>
              <strong style="font-size:15px;color:#1c1c18;display:block;margin-bottom:2px;">Generate with AI in seconds</strong>
              <span style="font-size:13px;color:#605e5c;line-height:1.5;">Describe your goal, let Pepperwahl draft multi-step questions and logic branching tailored to your exact audience.</span>
            </div>
          </div>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;border:1px solid #ebe8e2;border-radius:6px;display:block;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="min-width:28px;height:28px;background:#FAF7F2;border:1px solid #ebe8e2;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-family:'Newsreader',serif;font-size:16px;font-weight:600;color:#7a0009;">2</span>
            <div>
              <strong style="font-size:15px;color:#1c1c18;display:block;margin-bottom:2px;">Distribute anywhere</strong>
              <span style="font-size:13px;color:#605e5c;line-height:1.5;">Share via direct link, embed in web apps, or trigger frictionless question modules in email notifications.</span>
            </div>
          </div>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;border:1px solid #ebe8e2;border-radius:6px;display:block;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="min-width:28px;height:28px;background:#FAF7F2;border:1px solid #ebe8e2;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-family:'Newsreader',serif;font-size:16px;font-weight:600;color:#7a0009;">3</span>
            <div>
              <strong style="font-size:15px;color:#1c1c18;display:block;margin-bottom:2px;">Inspect live analytics</strong>
              <span style="font-size:13px;color:#605e5c;line-height:1.5;">Monitor completion rates, sentiment analysis, and instant drop-off reports with archival ledger-grade clarity.</span>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- primary CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://survey.pepperwahl.com" style="display:inline-block;background:#9e1b1b;color:#fff;padding:12px 32px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:0.01em;box-shadow:0 2px 8px rgba(158,27,27,0.2);">
        Create Your First Survey Now →
      </a>
      <div style="margin-top:12px;font-size:12px;color:#605e5c;">
        <a href="https://survey.pepperwahl.com/templates" style="color:#605e5c;text-decoration:underline;">Explore Templates</a>
        &nbsp;·&nbsp;
        <a href="https://survey.pepperwahl.com/docs" style="color:#605e5c;text-decoration:underline;">Quickstart Docs</a>
      </div>
    </div>

    <!-- pro tip -->
    <div style="padding:14px 16px;background:#f0eee8;border-left:3px solid #7a0009;border-radius:0 4px 4px 0;font-size:12px;color:#484644;line-height:1.6;">
      <strong style="color:#1c1c18;">Pro-Tip from our Lead Researcher:</strong> Import your existing product spec into the AI Builder prompt, and watch Pepperwahl automatically architect optimal branching logic with zero manual scripting.
    </div>

  </div><!-- /body -->

  <!-- footer -->
  <div style="margin-top:16px;background:#f6f3ed;border:1px solid #ebe8e2;border-radius:8px;padding:24px;text-align:center;">
    <p style="font-size:13px;font-weight:600;color:#59413e;margin:0 0 6px;">Pepperwahl Survey Intelligence</p>
    <p style="font-size:11px;color:#605e5c;margin:0 0 12px;">© 2025 Pepperwahl Inc. 450 Mission St, Suite 400, San Francisco, CA 94105.</p>
    <div style="font-size:11px;color:#605e5c;">
      <a href="https://survey.pepperwahl.com/unsubscribe" style="color:#605e5c;text-decoration:underline;">Unsubscribe</a>
      &nbsp;·&nbsp;
      <a href="https://survey.pepperwahl.com/privacy" style="color:#605e5c;text-decoration:underline;">Privacy Policy</a>
      &nbsp;·&nbsp;
      <a href="https://survey.pepperwahl.com/contact" style="color:#605e5c;text-decoration:underline;">Contact Support</a>
    </div>
  </div>

</div><!-- /wrapper -->
</body>
</html>"""


# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _get_config() -> dict:
    """Return the single onboarding email config doc, creating it if absent."""
    cfg = db.onboarding_email_config.find_one({"_id": "onboarding"})
    if not cfg:
        cfg = {
            "_id": "onboarding",
            "subject": DEFAULT_SUBJECT,
            "html_body": DEFAULT_HTML,
            "automation_enabled": False,
            "survey_link": "",
            "updated_at": datetime.now(timezone.utc),
        }
        db.onboarding_email_config.insert_one(cfg)
    return cfg


def _send_onboarding_email(to_email: str, name: str, cfg: dict) -> bool:
    """Send the onboarding email using the stored template.
    Returns True on success, False on failure."""
    # Re-read env vars at call time so changes to .env are always picked up
    smtp_server   = os.getenv("SMTP_SERVER")   or "smtp.gmail.com"
    smtp_port     = int(os.getenv("SMTP_PORT") or "587")
    smtp_username = os.getenv("SMTP_USERNAME") or ""
    smtp_password = os.getenv("SMTP_PASSWORD") or ""
    from_email    = os.getenv("FROM_EMAIL")    or smtp_username

    logger.info(f"📧 Onboarding email — SMTP: {smtp_server}:{smtp_port}, from: {from_email}, to: {to_email}")

    if not smtp_username or not smtp_password:
        logger.warning("📧 Onboarding email: SMTP_USERNAME or SMTP_PASSWORD not set — skipping")
        return False

    try:
        subject   = cfg.get("subject", DEFAULT_SUBJECT)
        html_body = cfg.get("html_body", DEFAULT_HTML)
        survey_link = cfg.get("survey_link", "")

        # Substitute simple placeholders
        html_body = html_body.replace("{{NAME}}", name or to_email.split("@")[0])
        html_body = html_body.replace("{{name}}", name or to_email.split("@")[0])
        html_body = html_body.replace("{{EMAIL}}", to_email)
        html_body = html_body.replace("{{email}}", to_email)
        html_body = html_body.replace("{{SURVEY_LINK}}", survey_link or "#")
        html_body = html_body.replace("{{survey_link}}", survey_link or "#")

        msg = MIMEMultipart("alternative")
        msg["From"]    = from_email
        msg["To"]      = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()

        server.login(smtp_username, smtp_password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()

        logger.info(f"✅ Onboarding email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"❌ Onboarding email failed for {to_email}: {e}")
        return False


# ────────────────────────────────────────────────────────────────────────────
# Public helper called by auth_routes after email confirmation
# ────────────────────────────────────────────────────────────────────────────

def maybe_send_onboarding_email(to_email: str, name: str) -> None:
    """Call this after a user confirms their email.
    Sends the onboarding email only when automation is enabled."""
    try:
        cfg = _get_config()
        if cfg.get("automation_enabled"):
            _send_onboarding_email(to_email, name, cfg)
    except Exception as e:
        logger.warning(f"⚠️ maybe_send_onboarding_email non-critical error: {e}")


# ────────────────────────────────────────────────────────────────────────────
# API Routes  (all require admin)
# ────────────────────────────────────────────────────────────────────────────

@onboarding_email_bp.route("", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
@requireAdmin
def get_onboarding_config():
    """GET /api/admin/onboarding-email — return current config."""
    if request.method == "OPTIONS":
        return "", 200
    cfg = _get_config()
    cfg.pop("_id", None)
    # Convert datetime for JSON
    if isinstance(cfg.get("updated_at"), datetime):
        cfg["updated_at"] = cfg["updated_at"].isoformat()
    return jsonify({"success": True, "config": cfg}), 200


@onboarding_email_bp.route("", methods=["PUT"])
@cross_origin(supports_credentials=True, origins="*")
@requireAdmin
def update_onboarding_config():
    """PUT /api/admin/onboarding-email — update subject / html_body / survey_link."""
    data = request.get_json(silent=True) or {}
    updates = {"updated_at": datetime.now(timezone.utc)}
    if "subject" in data:
        updates["subject"] = str(data["subject"]).strip()
    if "html_body" in data:
        updates["html_body"] = data["html_body"]
    if "survey_link" in data:
        updates["survey_link"] = str(data["survey_link"]).strip()
    if "template_fields" in data and isinstance(data["template_fields"], dict):
        updates["template_fields"] = data["template_fields"]

    db.onboarding_email_config.update_one(
        {"_id": "onboarding"},
        {"$set": updates},
        upsert=True,
    )
    return jsonify({"success": True, "message": "Onboarding email template updated."}), 200


@onboarding_email_bp.route("/automation", methods=["PUT"])
@cross_origin(supports_credentials=True, origins="*")
@requireAdmin
def set_automation():
    """PUT /api/admin/onboarding-email/automation  body: { enabled: true/false }"""
    data = request.get_json(silent=True) or {}
    enabled = bool(data.get("enabled", False))
    db.onboarding_email_config.update_one(
        {"_id": "onboarding"},
        {"$set": {"automation_enabled": enabled, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    status = "enabled" if enabled else "disabled"
    return jsonify({"success": True, "automation_enabled": enabled, "message": f"Automation {status}."}), 200


@onboarding_email_bp.route("/send-test", methods=["POST"])
@cross_origin(supports_credentials=True, origins="*")
@requireAdmin
def send_test_email():
    """POST /api/admin/onboarding-email/send-test  body: { email: '...' }
    Sends the current template to an arbitrary address for preview."""
    data = request.get_json(silent=True) or {}
    test_email = str(data.get("email", "")).strip()
    if not test_email:
        return jsonify({"error": "email is required"}), 400

    cfg = _get_config()
    ok = _send_onboarding_email(test_email, "Test User", cfg)
    if ok:
        return jsonify({"success": True, "message": f"Test email sent to {test_email}"}), 200
    return jsonify({"success": False, "error": "SMTP send failed — check server logs."}), 500
