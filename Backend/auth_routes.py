"""
Authentication routes for Flask app 
"""
from flask import Blueprint, request, jsonify, make_response, g
from auth_service import AuthService
from auth_middleware import requireAuth, optionalAuth
from feature_middleware import get_user_permissions
from datetime import datetime, timedelta
from mongodb_config import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
auth_service = AuthService()

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    """Register a new user"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        print(f"\n{'='*80}")
        print(f"🔐 === REGISTRATION ENDPOINT CALLED ===")
        
        data = request.json
        if not data:
            print(f"❌ No data provided in request")
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        consent = data.get('consent', None)
        
        print(f"🔐 Email from request: {email}")
        print(f"🔐 Name from request: {name}")
        print(f"🔐 Password length: {len(password)} characters")
        print(f"🔐 Consent data: {consent}")
        
        if not email or not password:
            print(f"❌ Email or password missing")
            return jsonify({'error': 'Email and password are required'}), 400
        
        print(f"🔐 Calling auth_service.register_user()...")
        user = auth_service.register_user(email, password, name)
        
        # Save consent preferences to user record
        if consent and user.get('_id'):
            from mongodb_config import db
            db.users.update_one(
                {'_id': user['_id']},
                {'$set': {
                    'consent': {
                        'acceptedTerms': consent.get('acceptedTerms', False),
                        'prefEmails': consent.get('prefEmails', True),
                        'prefAnalytics': consent.get('prefAnalytics', True),
                        'prefPersonalization': consent.get('prefPersonalization', True),
                        'consentDate': consent.get('consentDate', datetime.utcnow().isoformat()),
                    }
                }}
            )
            print(f"✅ Consent preferences saved for user")
        
        print(f"✅ User registered successfully")
        print(f"✅ User ID: {user['_id']}")
        print(f"✅ User status: {user['status']}")
        print(f"✅ Returning response to client")
        print(f"🔐 === REGISTRATION ENDPOINT SUCCESS ===")
        print(f"{'='*80}\n")
        
        return jsonify({
            'message': 'Registration successful. Please check your email to confirm your account.',
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role'],
                'status': user['status']
            }
        })
        
    except ValueError as e:
        print(f"❌ ValueError: {str(e)}")
        print(f"🔐 === REGISTRATION ENDPOINT ERROR ===\n")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        print(f"🔐 === REGISTRATION ENDPOINT ERROR ===\n")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/confirm-email', methods=['POST', 'OPTIONS'])
def confirm_email():
    """Confirm user email with token"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        token = data.get('token', '').strip()
        
        if not token:
            return jsonify({'error': 'Confirmation token is required'}), 400
        
        user = auth_service.confirm_email(token)
        
        return jsonify({
            'message': 'Email confirmed successfully. You can now login.',
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role'],
                'status': user['status']
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Email confirmation failed: {str(e)}'}), 500


@auth_bp.route('/forgot-password', methods=['POST', 'OPTIONS'])
def forgot_password():
    """Send password reset link to user's email"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        auth_service.request_password_reset(email)
        
        # Always return success (don't reveal if email exists)
        return jsonify({
            'message': 'If an account with that email exists, a reset link has been sent.'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500


@auth_bp.route('/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
    """Reset password using token from email link"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        token = data.get('token', '')
        new_password = data.get('password', '')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        auth_service.reset_password(token, new_password)
        
        return jsonify({'message': 'Password reset successfully. You can now login.'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Password reset failed: {str(e)}'}), 500


@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """Login user with email and password"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = auth_service.authenticate_user(email, password)
        token = auth_service.generate_jwt_token(user)
        
        # Track login event
        try:
            from user_tracking_api import db as tracking_db
            from datetime import timezone as tz
            ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown')
            if ',' in ip:
                ip = ip.split(',')[0].strip()
            tracking_db.login_events.insert_one({
                "user_id": str(user['_id']),
                "user_email": user['email'],
                "user_name": user.get('name', ''),
                "login_method": "email",
                "ip_address": ip,
                "device_info": {
                    "user_agent": request.headers.get('User-Agent', ''),
                },
                "created_at": datetime.now(tz.utc)
            })
        except Exception as track_err:
            print(f"⚠️ Login tracking failed (non-critical): {track_err}")
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/verify-token', methods=['POST', 'OPTIONS'])
def verify_token():
    """Verify JWT token"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        user = auth_service.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        
        return jsonify({
            'message': 'Token valid',
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Token verification failed: {str(e)}'}), 401

@auth_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    """Logout user (client-side token removal)"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@auth_bp.route('/me', methods=['GET', 'OPTIONS'])
def get_current_user():
    """Get current user information"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'user': None}), 200
        
        token = auth_header.split(' ')[1]
        user = auth_service.get_user_from_token(token)
        
        if not user:
            return jsonify({'user': None}), 200
        
        user_data = {
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'simpleUserId': user.get('simpleUserId', 0),
            'role': user['role'],
            'createdAt': user['createdAt'].isoformat() if user.get('createdAt') else None
        }
        
        return jsonify({'user': user_data})
        
    except Exception as e:
        return jsonify({'error': f'Failed to get user: {str(e)}'}), 500

@auth_bp.route('/check', methods=['GET', 'OPTIONS'])
def check_auth():
    """Check if user is authenticated"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'authenticated': False}), 200
        
        token = auth_header.split(' ')[1]
        user = auth_service.get_user_from_token(token)
        
        return jsonify({
            'authenticated': user is not None,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'simpleUserId': user.get('simpleUserId', 0),
                'role': user['role']
            } if user else None
        })
        
    except Exception as e:
        return jsonify({'error': f'Auth check failed: {str(e)}'}), 500

@auth_bp.route('/permissions', methods=['GET', 'OPTIONS'])
def get_permissions():
    """Get current user's permissions and feature access"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        permissions = get_user_permissions()
        return jsonify(permissions)
        
    except Exception as e:
        return jsonify({'error': f'Failed to get permissions: {str(e)}'}), 500


@auth_bp.route('/firebase-login', methods=['POST', 'OPTIONS'])
def firebase_login():
    """Login/Register user via Firebase OAuth (Google/Microsoft)"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        provider = data.get('provider', 'unknown')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        print(f"\n🔥 Firebase OAuth Login - Provider: {provider}, Email: {email}")
        
        from mongodb_config import db
        from role_manager import UserRole, UserStatus
        from utils.short_id import generate_simple_user_id
        
        # Check if user already exists
        users_collection = db.users
        existing_user = users_collection.find_one({'email': email})
        
        if existing_user:
            # User exists - log them in
            print(f"✅ Existing user found: {email}")
            
            # Update last login
            users_collection.update_one(
                {'_id': existing_user['_id']},
                {'$set': {'lastLogin': datetime.utcnow()}}
            )
            
            # Track login event
            try:
                from datetime import timezone as tz
                ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown')
                if ',' in ip:
                    ip = ip.split(',')[0].strip()
                db.login_events.insert_one({
                    "user_id": str(existing_user['_id']),
                    "user_email": email,
                    "user_name": existing_user.get('name', name),
                    "login_method": provider,
                    "ip_address": ip,
                    "device_info": {"user_agent": request.headers.get('User-Agent', '')},
                    "created_at": datetime.now(tz.utc)
                })
            except Exception as track_err:
                print(f"⚠️ Login tracking failed (non-critical): {track_err}")
            
            # Generate JWT token
            token = auth_service.generate_jwt_token(existing_user)
            
            return jsonify({
                'token': token,
                'isNewUser': False,
                'user': {
                    'id': str(existing_user['_id']),
                    'email': existing_user['email'],
                    'name': existing_user.get('name', name),
                    'role': existing_user.get('role', 'basic'),
                    'simpleUserId': existing_user.get('simpleUserId', 0),
                    'status': existing_user.get('status', 'approved')
                }
            })
        else:
            # New user - create account (auto-confirmed since OAuth verified email)
            print(f"🆕 Creating new user via {provider}: {email}")
            
            # Generate unique simple user ID
            while True:
                simple_user_id = generate_simple_user_id()
                if not users_collection.find_one({'simpleUserId': simple_user_id}):
                    break
            
            user_data = {
                'email': email,
                'passwordHash': '',  # No password for OAuth users
                'name': name or email.split('@')[0],
                'simpleUserId': simple_user_id,
                'role': UserRole.BASIC.value,
                'status': UserStatus.APPROVED.value,  # Auto-approve OAuth users
                'authProvider': provider,
                'createdAt': datetime.utcnow(),
                'lastLogin': datetime.utcnow()
            }
            
            result = users_collection.insert_one(user_data)
            user_data['_id'] = result.inserted_id
            
            print(f"✅ New OAuth user created: {email} (ID: {user_data['_id']})")
            
            # Generate JWT token
            token = auth_service.generate_jwt_token(user_data)
            
            return jsonify({
                'token': token,
                'isNewUser': True,
                'user': {
                    'id': str(user_data['_id']),
                    'email': user_data['email'],
                    'name': user_data['name'],
                    'role': user_data['role'],
                    'simpleUserId': user_data['simpleUserId'],
                    'status': user_data['status']
                }
            })
    
    except Exception as e:
        print(f"❌ Firebase login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'OAuth login failed: {str(e)}'}), 500


# ==================== Account Deletion ====================

@auth_bp.route('/delete-account', methods=['POST', 'OPTIONS'])
def request_account_deletion():
    """
    Request account deletion with cooling-off period based on plan.
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    # Manual auth check
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authorization required'}), 401
        user = auth_service.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
    except:
        return jsonify({'error': 'Authentication failed'}), 401
    
    try:
        data = request.json or {}
        password = data.get('password', '')
        
        # Verify password for email/password users
        if user.get('passwordHash') and password:
            import bcrypt
            if not bcrypt.checkpw(password.encode('utf-8'), user['passwordHash'].encode('utf-8')):
                return jsonify({'error': 'Incorrect password'}), 401
        elif user.get('passwordHash') and not password:
            return jsonify({'error': 'Password confirmation required'}), 400
        # OAuth users (no password) can proceed without password check
        
        user_id = str(user['_id'])
        user_email = user.get('email', '')
        user_role = user.get('role', 'basic')
        
        # Determine deletion timeline based on plan
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        if user_role == 'enterprise':
            delete_after = now + timedelta(hours=48)
            timeline_text = '48 hours'
        elif user_role == 'premium':
            delete_after = now + timedelta(days=30)
            timeline_text = '30 days'
        else:  # free
            delete_after = now + timedelta(hours=48)
            timeline_text = '48 hours'
        
        # Create deletion request record
        deletion_record = {
            'user_id': user_id,
            'user_email': user_email,
            'user_name': user.get('name', ''),
            'user_role': user_role,
            'requested_at': now,
            'delete_after': delete_after,
            'timeline_text': timeline_text,
            'status': 'pending',  # pending, cancelled, completed
            'cancelled_at': None,
            'completed_at': None
        }
        
        # Check if there's already a pending deletion
        existing = db.account_deletions.find_one({'user_id': user_id, 'status': 'pending'})
        if existing:
            return jsonify({
                'error': 'Deletion already requested',
                'message': f'Your account is scheduled for deletion. You can cancel before {existing["delete_after"].isoformat()}.',
                'delete_after': existing['delete_after'].isoformat()
            }), 409
        
        db.account_deletions.insert_one(deletion_record)
        
        # Mark user as pending deletion
        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'deletion_pending': True, 'deletion_scheduled_at': delete_after}}
        )
        
        # Send deletion confirmation email
        try:
            from email_trigger_service import EmailTriggerService
            email_service = EmailTriggerService()
            
            deletion_email_html = f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
        <img src="https://survey.pepperwahl.com/logo.png" alt="Pepperwahl" style="height: 32px;" />
    </div>
    
    <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px;">
        <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Account Deletion Request</h2>
        
        <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            Hi {user.get('name', 'there')},
        </p>
        
        <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            We received a request to delete your Pepperwahl account associated with <strong>{user_email}</strong>.
        </p>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 500;">
                Your account and all associated data will be permanently deleted after <strong>{timeline_text}</strong> from the time of this request.
            </p>
        </div>
        
        <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 16px 0;">
            <strong>What will be deleted:</strong>
        </p>
        <ul style="color: #4a4a4a; font-size: 13px; line-height: 1.8; margin: 0 0 16px 0; padding-left: 20px;">
            <li>Your account and profile information</li>
            <li>All surveys you have created</li>
            <li>All survey responses collected</li>
            <li>Analytics and tracking data</li>
            <li>Contact lists and integrations</li>
        </ul>
        
        <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 16px 0;">
            <strong>Changed your mind?</strong> You can cancel this request anytime before the deletion date by visiting your Profile Settings and clicking "Cancel Deletion."
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
            If you did not make this request, please contact us immediately at <a href="mailto:support@pepperwahl.com" style="color: #dc2626;">support@pepperwahl.com</a> to secure your account.
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 24px;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            Survtit Market Research Survey LLP (Pepperwahl)<br/>
            This is an automated message. Please do not reply directly.
        </p>
    </div>
</div>
"""
            email_service.send_email(
                to_email=user_email,
                subject="Account Deletion Request — Pepperwahl",
                body=deletion_email_html,
                is_html=True
            )
            print(f"   Deletion confirmation email sent to: {user_email}")
        except Exception as email_err:
            print(f"   Warning: Could not send deletion email: {email_err}")
        
        print(f"Account deletion requested: {user_email} (delete after {timeline_text})")
        
        return jsonify({
            'message': f'Account deletion scheduled. Your data will be deleted after {timeline_text}. You can cancel anytime before then.',
            'delete_after': delete_after.isoformat(),
            'timeline': timeline_text
        })
        
    except Exception as e:
        print(f"❌ Account deletion error: {e}")
        return jsonify({'error': f'Failed to request deletion: {str(e)}'}), 500


@auth_bp.route('/cancel-deletion', methods=['POST', 'OPTIONS'])
def cancel_account_deletion():
    """Cancel a pending account deletion request"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authorization required'}), 401
        user = auth_service.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
    except:
        return jsonify({'error': 'Authentication failed'}), 401
    
    try:
        user_id = str(user['_id'])
        
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # Find and cancel pending deletion
        result = db.account_deletions.update_one(
            {'user_id': user_id, 'status': 'pending'},
            {'$set': {'status': 'cancelled', 'cancelled_at': now}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No pending deletion found'}), 404
        
        # Remove deletion flag from user
        db.users.update_one(
            {'_id': user['_id']},
            {'$unset': {'deletion_pending': '', 'deletion_scheduled_at': ''}}
        )
        
        print(f"✅ Account deletion cancelled: {user.get('email')}")
        return jsonify({'message': 'Account deletion cancelled. Your account is safe.'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to cancel deletion: {str(e)}'}), 500


@auth_bp.route('/deletion-status', methods=['GET', 'OPTIONS'])
def get_deletion_status():
    """Check if there's a pending deletion for the current user"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authorization required'}), 401
        user = auth_service.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
    except:
        return jsonify({'error': 'Authentication failed'}), 401
    
    try:
        user_id = str(user['_id'])
        
        pending = db.account_deletions.find_one(
            {'user_id': user_id, 'status': 'pending'},
            {'_id': 0}
        )
        
        if pending:
            return jsonify({
                'has_pending_deletion': True,
                'requested_at': pending['requested_at'].isoformat(),
                'delete_after': pending['delete_after'].isoformat(),
                'timeline': pending.get('timeline_text', '')
            })
        
        return jsonify({'has_pending_deletion': False})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Data Export ====================

@auth_bp.route('/export-data', methods=['POST', 'OPTIONS'])
def export_user_data():
    """Export all user data (account, surveys, responses) as JSON"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authorization required'}), 401
        user = auth_service.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
    except:
        return jsonify({'error': 'Authentication failed'}), 401
    
    try:
        data = request.json or {}
        export_types = data.get('export_types', ['account', 'surveys', 'responses'])
        
        user_id = str(user['_id'])
        user_email = user.get('email', '')
        export_result = {}
        
        # Account info
        if 'account' in export_types:
            account_data = {
                'id': user_id,
                'email': user.get('email', ''),
                'name': user.get('name', ''),
                'role': user.get('role', 'basic'),
                'status': user.get('status', ''),
                'created_at': str(user.get('createdAt', '')),
                'last_login': str(user.get('lastLogin', '')),
                'simple_user_id': user.get('simpleUserId', ''),
                'auth_provider': user.get('authProvider', 'email'),
            }
            export_result['account'] = account_data
        
        # Surveys
        if 'surveys' in export_types:
            from bson import ObjectId
            surveys = list(db.surveys.find({'ownerUserId': user_id}))
            surveys_export = []
            for s in surveys:
                survey_data = {
                    'id': s.get('id', str(s.get('_id', ''))),
                    'short_id': s.get('short_id', ''),
                    'title': s.get('title', ''),
                    'description': s.get('description', ''),
                    'template_type': s.get('template_type', ''),
                    'status': s.get('status', ''),
                    'created_at': str(s.get('created_at', '')),
                    'questions': s.get('questions', []),
                    'theme': s.get('theme', {}),
                }
                surveys_export.append(survey_data)
            export_result['surveys'] = surveys_export
            export_result['survey_count'] = len(surveys_export)
        
        # Responses
        if 'responses' in export_types:
            # Get all surveys owned by this user first
            user_surveys = list(db.surveys.find({'ownerUserId': user_id}, {'id': 1, 'short_id': 1, 'title': 1}))
            survey_ids = [s.get('id', s.get('short_id', str(s.get('_id', '')))) for s in user_surveys]
            
            all_responses = []
            for sid in survey_ids:
                responses = list(db.responses.find({'survey_id': sid}))
                for r in responses:
                    response_data = {
                        'response_id': str(r.get('_id', '')),
                        'survey_id': r.get('survey_id', ''),
                        'submitted_at': str(r.get('submitted_at', '')),
                        'status': r.get('status', ''),
                        'email': r.get('email', ''),
                        'username': r.get('username', ''),
                        'responses': r.get('responses', {}),
                        'url_parameters': r.get('url_parameters', {}),
                    }
                    all_responses.append(response_data)
            export_result['responses'] = all_responses
            export_result['response_count'] = len(all_responses)
        
        # Consent logs
        if 'consent' in export_types:
            consents = list(db.consent_logs.find({'user_email': user_email}, {'_id': 0}))
            for c in consents:
                if c.get('created_at'):
                    c['created_at'] = str(c['created_at'])
            export_result['consent_logs'] = consents
        
        export_result['exported_at'] = datetime.now().isoformat()
        export_result['exported_by'] = user_email
        
        return jsonify(export_result), 200
        
    except Exception as e:
        print(f"Data export error: {e}")
        return jsonify({'error': f'Export failed: {str(e)}'}), 500
