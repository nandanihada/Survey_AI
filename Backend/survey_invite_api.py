"""
Survey Invite via Email API
Allows survey creators to send invite emails with the survey link.
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from auth_middleware import requireAuth
from mongodb_config import db
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

survey_invite_bp = Blueprint('survey_invite', __name__)
logger = logging.getLogger(__name__)

SMTP_SERVER   = os.getenv('SMTP_SERVER',   'smtp.gmail.com')
SMTP_PORT     = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', 'business@moustacheleads.com')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
FROM_EMAIL    = os.getenv('FROM_EMAIL',    'business@moustacheleads.com')
FRONTEND_URL  = os.getenv('FRONTEND_URL',  'https://surevy-pepperwahl.onrender.com')


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f'Pepperwahl Surveys <{FROM_EMAIL}>'
    msg['To']      = to_email
    msg.attach(MIMEText(html_body, 'html'))
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP error: {e}")
        return False


def _build_premium_template(survey_title: str, survey_link: str, message: str, template_id: str) -> str:
    """Paperish PepperWahl email — clean editorial style, no emojis, real logo"""
    accent_color  = '#2C3E50' if template_id == 'bold' else '#C4785C'
    header_bg     = '#2C3E50' if template_id == 'bold' else '#3D2B1F'
    cta_bg        = '#2C3E50' if template_id == 'bold' else '#C4785C'
    card_border   = '#CBD5E1' if template_id == 'bold' else '#E8DDD5'
    card_bg       = '#F8FAFC' if template_id == 'bold' else '#FBF8F5'

    msg_block = ''
    if message:
        msg_block = f'''<tr>
      <td style="padding:0 44px 28px;">
        <div style="border-left:3px solid {accent_color};padding:12px 18px;background:#FAFAFA;">
          <p style="margin:0;font-size:14px;color:#555;line-height:1.8;font-style:italic;">{message}</p>
        </div>
      </td>
    </tr>'''

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Survey Invitation</title>
</head>
<body style="margin:0;padding:0;background:#EFEFEC;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEFEC;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#FFFFFF;border:1px solid #DDD8D2;">

  <!-- Header -->
  <tr>
    <td style="background:{header_bg};padding:28px 44px;border-bottom:3px solid {accent_color};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <img src="{FRONTEND_URL}/logo.png" alt="Pepperwahl" width="36" height="36"
                 style="display:inline-block;vertical-align:middle;border-radius:4px;margin-right:10px;" />
            <span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;vertical-align:middle;letter-spacing:0.5px;">Pepperwahl</span>
          </td>
          <td align="right">
            <span style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:1px;text-transform:uppercase;">Survey Invitation</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:44px 44px 20px;">
      <p style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1A1A1A;line-height:1.3;font-family:Georgia,serif;">
        We'd love to hear<br/>your thoughts.
      </p>
      <p style="margin:0;font-size:15px;color:#666;line-height:1.8;font-family:Arial,sans-serif;">
        Your feedback matters. A few minutes of your time helps us build something genuinely better for everyone.
      </p>
    </td>
  </tr>

  <!-- Personal message -->
  {msg_block}

  <!-- Survey card -->
  <tr>
    <td style="padding:12px 44px 32px;">
      <div style="border:1px solid {card_border};background:{card_bg};padding:28px 32px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:{accent_color};font-family:Arial,sans-serif;">Survey</p>
        <p style="margin:0 0 12px;font-size:19px;font-weight:700;color:#1A1A1A;line-height:1.4;font-family:Georgia,serif;">{survey_title}</p>
        <p style="margin:0;font-size:13px;color:#888;font-family:Arial,sans-serif;">Takes approximately 2 minutes to complete.</p>
      </div>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 44px 36px;">
      <a href="{survey_link}"
         style="display:inline-block;background:{cta_bg};color:#FFFFFF;text-decoration:none;
                font-size:14px;font-weight:700;padding:14px 36px;
                font-family:Arial,sans-serif;letter-spacing:0.5px;">
        Take the Survey
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#AAA;font-family:Arial,sans-serif;">
        Or copy this link: <a href="{survey_link}" style="color:{accent_color};text-decoration:none;">{survey_link}</a>
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:0 44px;"><div style="height:1px;background:#E8E4DF;"></div></td></tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 44px;">
      <p style="margin:0 0 4px;font-size:12px;color:#999;font-family:Arial,sans-serif;line-height:1.7;">
        This invitation was sent via <strong style="color:#555;">Pepperwahl</strong>. Thank you for taking the time.
      </p>
      <p style="margin:0;font-size:11px;color:#BBB;font-family:Arial,sans-serif;">
        Team Pepperwahl &nbsp;&middot;&nbsp; pepperwahl.com
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


# Keep old function names as aliases for the route handler
def _build_template_minimal(survey_title, survey_link, message, sender_name):
    return _build_premium_template(survey_title, survey_link, message, 'minimal')

def _build_template_bold(survey_title, survey_link, message, sender_name):
    return _build_premium_template(survey_title, survey_link, message, 'bold')


@survey_invite_bp.route('/api/surveys/<survey_id>/send-invite', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins="*")
@requireAuth
def send_survey_invite(survey_id):
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        emails       = data.get('emails', [])           # list of email strings
        template_id  = data.get('template', 'minimal')  # 'minimal' | 'bold'
        message      = data.get('message', '').strip()
        survey_link  = data.get('survey_link', '')

        if not emails:
            return jsonify({"error": "At least one recipient email is required"}), 400
        if not survey_link:
            return jsonify({"error": "survey_link is required"}), 400

        # Fetch survey title from DB
        from bson import ObjectId
        survey = None
        try:
            survey = db['surveys'].find_one({'_id': ObjectId(survey_id)})
        except Exception:
            pass
        if not survey:
            survey = db['surveys'].find_one({'id': survey_id})

        survey_title = (survey or {}).get('prompt', 'Survey')[:80] if survey else 'Survey'

        # Sender name from auth token
        sender_name = 'Someone'
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                import jwt as pyjwt
                import os as _os
                secret = _os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-for-local-development')
                payload = pyjwt.decode(auth_header[7:], secret, algorithms=['HS256'])
                sender_name = payload.get('name') or payload.get('email', 'Someone').split('@')[0]
            except Exception:
                pass

        subject = f"📋 You've been invited to take a survey: {survey_title}"

        sent, failed = [], []
        for email in emails:
            email = email.strip()
            if not email:
                continue
            if template_id == 'bold':
                html = _build_template_bold(survey_title, survey_link, message, sender_name)
            else:
                html = _build_template_minimal(survey_title, survey_link, message, sender_name)

            ok = _send_email(email, subject, html)
            (sent if ok else failed).append(email)

        return jsonify({
            "success": True,
            "sent": sent,
            "failed": failed,
            "message": f"Sent to {len(sent)} recipient(s){', ' + str(len(failed)) + ' failed' if failed else ''}"
        })

    except Exception as e:
        logger.error(f"send_survey_invite error: {e}")
        return jsonify({"error": str(e)}), 500
