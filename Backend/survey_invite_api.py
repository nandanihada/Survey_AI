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


def _build_template_minimal(survey_title: str, survey_link: str, message: str, sender_name: str) -> str:
    """Template 1 – clean minimal card"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{survey_title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#C4785C 0%,#A0522D 100%);padding:36px 40px;text-align:center;">
            <img src="{FRONTEND_URL}/logo.png" alt="Pepperwahl" width="52" height="52"
                 style="display:block;margin:0 auto 12px;object-fit:contain;border-radius:10px;" />
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
              Pepperwahl Surveys
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#2D2520;">
              You've been invited!
            </h1>
            <p style="margin:0 0 20px;font-size:14px;color:#9B9189;line-height:1.6;">
              {sender_name} is collecting feedback and would love to hear from you.
            </p>
            <div style="background:#FFF8F5;border:1px solid #F0DDD5;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#C4785C;">Survey</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#2D2520;">{survey_title}</p>
            </div>
            {f'<p style="margin:0 0 28px;font-size:14px;color:#5A5045;line-height:1.7;background:#FDFCFA;border-left:3px solid #C4785C;padding:14px 18px;border-radius:0 8px 8px 0;">{message}</p>' if message else ''}
            <div style="text-align:center;margin-bottom:8px;">
              <a href="{survey_link}"
                 style="display:inline-block;background:#C4785C;color:#ffffff;text-decoration:none;
                        font-size:15px;font-weight:700;padding:14px 40px;border-radius:50px;
                        letter-spacing:0.3px;">
                Take the Survey →
              </a>
            </div>
            <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#BDB8B2;">
              Or paste this link: <a href="{survey_link}" style="color:#C4785C;">{survey_link}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F1E8;padding:20px 40px;text-align:center;border-top:1px solid #EBE8E3;">
            <p style="margin:0;font-size:11px;color:#BDB8B2;line-height:1.7;">
              This invite was sent via <strong>Pepperwahl</strong> · <a href="{FRONTEND_URL}" style="color:#C4785C;text-decoration:none;">pepperwahl.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_template_bold(survey_title: str, survey_link: str, message: str, sender_name: str) -> str:
    """Template 2 – bold dark hero"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{survey_title}</title>
</head>
<body style="margin:0;padding:0;background:#1A1310;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1A1310;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#2D2520;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.4);">

        <!-- Hero -->
        <tr>
          <td style="padding:48px 40px 36px;text-align:center;">
            <img src="{FRONTEND_URL}/logo.png" alt="Pepperwahl" width="60" height="60"
                 style="display:block;margin:0 auto 20px;object-fit:contain;border-radius:12px;
                        background:#3D342E;padding:8px;" />
            <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">
              Quick Survey Invite
            </h1>
            <p style="margin:0;font-size:14px;color:#9B9189;line-height:1.6;">
              {sender_name} wants your opinion
            </p>
          </td>
        </tr>

        <!-- Survey card -->
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="background:linear-gradient(135deg,#C4785C 0%,#8B4A2E 100%);
                        border-radius:12px;padding:24px 28px;margin-bottom:28px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;
                         text-transform:uppercase;color:rgba(255,255,255,0.65);">Now taking responses</p>
              <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">{survey_title}</p>
            </div>
            {f'<p style="margin:0 0 28px;font-size:14px;color:#BDB8B2;line-height:1.7;padding:16px 20px;border:1px solid #3D342E;border-radius:10px;">{message}</p>' if message else ''}
            <div style="text-align:center;">
              <a href="{survey_link}"
                 style="display:inline-block;background:#C4785C;color:#ffffff;text-decoration:none;
                        font-size:15px;font-weight:700;padding:15px 44px;border-radius:50px;">
                Start Survey
              </a>
            </div>
            <p style="text-align:center;margin:18px 0 0;font-size:11px;color:#5A5045;">
              <a href="{survey_link}" style="color:#C4785C;">{survey_link}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#221C18;padding:18px 40px;text-align:center;border-top:1px solid #3D342E;">
            <p style="margin:0;font-size:11px;color:#5A5045;line-height:1.7;">
              Powered by <strong style="color:#C4785C;">Pepperwahl</strong> ·
              <a href="{FRONTEND_URL}" style="color:#C4785C;text-decoration:none;">pepperwahl.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


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

        subject = f"📋 {sender_name} invited you to take a survey: {survey_title}"

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
