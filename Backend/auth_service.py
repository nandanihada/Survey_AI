"""Authentication service using MongoDB + JWT"""
import os
import jwt
import bcrypt
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pymongo import MongoClient
from dotenv import load_dotenv
import re
from utils.short_id import generate_simple_user_id
from role_manager import RoleManager, UserRole, UserStatus

load_dotenv()

class AuthService:
    def __init__(self):
        # Force reload environment variables
        load_dotenv(override=True)
        
        self.jwt_secret = os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-for-local-development')
        self.jwt_algorithm = 'HS256'
        self.jwt_expiration_hours = 24 * 7  # 7 days
        
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('FROM_EMAIL')
        
        print("✅ JWT Auth Service initialized")
        print(f"📧 Email service configured: {bool(self.smtp_username and self.smtp_password)}")
    
    def get_db_connection(self):
        """Get MongoDB connection"""
        from mongodb_config import db
        return db
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def generate_jwt_token(self, user_data: Dict[str, Any]) -> str:
        """Generate JWT token for user"""
        payload = {
            'user_id': str(user_data['_id']),
            'email': user_data['email'],
            'role': user_data['role'],
            'status': user_data.get('status', UserStatus.APPROVED.value),
            'features': RoleManager.get_user_features(user_data['role']),
            'simpleUserId': user_data.get('simpleUserId', 0),
            'exp': datetime.utcnow() + timedelta(hours=self.jwt_expiration_hours),
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
    
    def register_user(self, email: str, password: str, name: str = None) -> Dict[str, Any]:
        """Register a new user"""
        db = self.get_db_connection()
        users_collection = db.users
        
        # Validate email
        if not self.validate_email(email):
            raise ValueError("Invalid email format")
        
        # Check if user already exists
        if users_collection.find_one({'email': email}):
            raise ValueError("User with this email already exists")
        
        # Validate password
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        
        # Hash password
        password_hash = self.hash_password(password)
        
        # Generate unique simple user ID
        while True:
            simple_user_id = generate_simple_user_id()
            # Check if this ID already exists
            if not users_collection.find_one({'simpleUserId': simple_user_id}):
                break
        
        # Generate confirmation token
        confirmation_token = str(uuid.uuid4())
        
        print(f"\n🔐 === USER REGISTRATION PROCESS ===")
        print(f"🔐 Email: {email}")
        print(f"🔐 Generated confirmation token: {confirmation_token}")
        
        # Create user
        user_data = {
            'email': email,
            'passwordHash': password_hash,
            'name': name or email.split('@')[0],
            'simpleUserId': simple_user_id,  # Add simple numeric user ID
            'role': UserRole.BASIC.value,  # Default role is basic
            'status': UserStatus.PENDING_CONFIRMATION.value,  # Default status is pending confirmation
            'confirmationToken': confirmation_token,
            'createdAt': datetime.utcnow(),
            'lastLogin': None
        }
        
        result = users_collection.insert_one(user_data)
        user_data['_id'] = result.inserted_id
        
        print(f"🔐 User created in database with ID: {user_data['_id']}")
        print(f"🔐 User status: {user_data['status']}")
        
        # Send confirmation email
        print(f"🔐 Attempting to send confirmation email...")
        self.send_confirmation_email(email, confirmation_token)
        
        print(f"🔐 === REGISTRATION COMPLETE ===\n")
        
        return user_data
    
    def send_confirmation_email(self, email: str, token: str) -> None:
        """Send email confirmation link"""
        print(f"\n📧 === CONFIRMATION EMAIL PROCESS ===")
        print(f"📧 Email recipient: {email}")
        print(f"📧 Token: {token[:20]}...")
        print(f"📧 SMTP Username configured: {bool(self.smtp_username)}")
        print(f"📧 SMTP Password configured: {bool(self.smtp_password)}")
        
        if not self.smtp_username or not self.smtp_password:
            print("❌ Email service not configured, skipping confirmation email")
            return
            
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = email
            msg['Subject'] = "Confirm your account – PepperWahl (by PepperAds)"
            
            print(f"📧 Message created - From: {self.from_email}, To: {email}")
            
            # Get frontend URL for confirmation link
            is_local = os.getenv("FLASK_ENV", "development").lower() == "development"
            default_frontend = "http://localhost:5173" if is_local else "https://dashboard-pepperads.onrender.com"
            frontend_url = os.getenv('FRONTEND_URL')
            
            # Use default if not set or pointing to the root marketing site which doesn't have the route
            if not frontend_url or frontend_url == "https://pepper-ads.com":
                frontend_url = default_frontend
                
            confirmation_link = f"{frontend_url}/confirm-email?token={token}"
            
            print(f"📧 Confirmation link: {confirmation_link}")
            
            # Email body - Simple Professional Template
            body = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }}
                    .header {{ background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid #E8503A; }}
                    .header h1 {{ color: #2D3142; margin: 0 0 5px 0; font-size: 28px; }}
                    .header p {{ color: #666; margin: 5px 0 0 0; font-size: 13px; }}
                    .content {{ background-color: #ffffff; padding: 30px; }}
                    .content p {{ margin: 15px 0; }}
                    .button-container {{ text-align: center; margin: 30px 0; }}
                    .button {{ display: inline-block; background-color: #E8503A; color: white; padding: 14px 35px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; }}
                    .button:hover {{ background-color: #d43a28; }}
                    .link-section {{ background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }}
                    .link-section p {{ margin: 5px 0; font-size: 12px; word-break: break-all; }}
                    .footer {{ background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
                    .footer p {{ margin: 5px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>PepperWahl</h1>
                        <p>by PepperAds</p>
                    </div>
                    
                    <div class="content">
                        <p>Hi,</p>
                        
                        <p>You signed up on <strong>PepperWahl</strong>, a survey platform powered by PepperAds.</p>
                        
                        <p>Please confirm your email by clicking the button below:</p>
                        
                        <div class="button-container">
                            <a href="{confirmation_link}" class="button">Confirm Email</a>
                        </div>
                        
                        <div class="link-section">
                            <p><strong>If the button doesn't work:</strong></p>
                            <p>{confirmation_link}</p>
                        </div>
                        
                        <p>If you did not request this, you can ignore this email.</p>
                    </div>
                    
                    <div class="footer">
                        <p>— Team PepperAds</p>
                        <p>© 2026 PepperAds. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            print(f"📧 Email body created")
            
            # Send email
            print(f"📧 Connecting to SMTP server: {self.smtp_server}:{self.smtp_port}")
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            print(f"✅ SMTP connection established")
            
            print(f"📧 Starting TLS...")
            server.starttls()
            print(f"✅ TLS started successfully")
            
            print(f"📧 Logging in with username: {self.smtp_username}")
            server.login(self.smtp_username, self.smtp_password)
            print(f"✅ Login successful")
            
            text = msg.as_string()
            print(f"📧 Sending email...")
            server.sendmail(self.from_email, email, text)
            print(f"✅ Email sent successfully via SMTP")
            
            server.quit()
            print(f"✅ SMTP connection closed")
            
            print(f"✅ Confirmation email sent to {email}")
            print(f"📧 === EMAIL SUCCESS ===\n")
            
        except Exception as e:
            print(f"❌ Failed to send confirmation email: {str(e)}")
            print(f"❌ Error type: {type(e).__name__}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            print(f"📧 === EMAIL FAILED ===\n")

    
    def confirm_email(self, token: str) -> Dict[str, Any]:
        """Confirm user email using token"""
        db = self.get_db_connection()
        users_collection = db.users
        
        # Find user by confirmation token
        user = users_collection.find_one({'confirmationToken': token})
        if not user:
            raise ValueError("Invalid or expired confirmation token")
        
        # Check if already confirmed
        if user.get('status') == UserStatus.APPROVED.value:
            raise ValueError("Email already confirmed")
        
        # Update user status to approved and remove token
        users_collection.update_one(
            {'_id': user['_id']},
            {
                '$set': {'status': UserStatus.APPROVED.value},
                '$unset': {'confirmationToken': ""}
            }
        )
        
        # Return updated user
        user['status'] = UserStatus.APPROVED.value
        return user
    
    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email and password"""
        db = self.get_db_connection()
        users_collection = db.users
        
        # Find user by email
        user = users_collection.find_one({'email': email})
        if not user:
            raise ValueError("Invalid email or password")
        
        # Verify password
        if not self.verify_password(password, user['passwordHash']):
            raise ValueError("Invalid email or password")
        
        # Check account status before allowing login
        user_status = user.get('status', UserStatus.APPROVED.value)
        can_login, status_message = RoleManager.can_login(user_status)
        
        if not can_login:
            raise ValueError(status_message.message)
        
        # Update last login
        users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'lastLogin': datetime.utcnow()}}
        )
        
        return user
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        db = self.get_db_connection()
        users_collection = db.users
        
        from bson import ObjectId
        try:
            user = users_collection.find_one({'_id': ObjectId(user_id)})
            return user
        except:
            return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        db = self.get_db_connection()
        users_collection = db.users
        
        return users_collection.find_one({'email': email})
    
    def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user from JWT token"""
        try:
            payload = self.verify_jwt_token(token)
            user_id = payload.get('user_id')
            if user_id:
                user = self.get_user_by_id(user_id)
                if user:
                    # Add JWT payload data to user object (including simpleUserId)
                    user['simpleUserId'] = payload.get('simpleUserId', user.get('simpleUserId', 0))
                    user['role'] = payload.get('role', user.get('role', 'basic'))
                    user['features'] = payload.get('features', [])
                return user
            return None
        except:
            return None
