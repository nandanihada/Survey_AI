"""Authentication service using MongoDB + JWT"""
import os
import jwt
import bcrypt
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
        
        print("✅ JWT Auth Service initialized")
    
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
        
        # Create user
        user_data = {
            'email': email,
            'passwordHash': password_hash,
            'name': name or email.split('@')[0],
            'simpleUserId': simple_user_id,  # Add simple numeric user ID
            'role': UserRole.BASIC.value,  # Default role is basic
            'status': UserStatus.APPROVED.value,  # Default status is approved
            'createdAt': datetime.utcnow(),
            'lastLogin': None
        }
        
        result = users_collection.insert_one(user_data)
        user_data['_id'] = result.inserted_id
        
        return user_data
    
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
