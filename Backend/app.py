from flask import Flask, request, jsonify
from flask_cors import CORS ,cross_origin
import google.generativeai as genai
import random
import string
from typing import Optional, Dict, List, Any, Union
from datetime import datetime, timedelta
import os
import json
import uuid
import re
import logging
from bson import ObjectId, json_util
from pymongo import MongoClient, ReturnDocument
from dotenv import load_dotenv
import requests
import urllib.parse
import traceback
from urllib.parse import urlparse, parse_qs, urlencode
from flask_cors import CORS, cross_origin
from bson import ObjectId
import time
import random
from flask import Flask, request, jsonify
from flask_cors import CORS ,cross_origin
import google.generativeai as genai
import json
from datetime import datetime
import os
from dotenv import load_dotenv
import pymongo
from bson import ObjectId
from bson import json_util
import json
import logging
import traceback
import random
import string
import requests
import time
from typing import Dict, Any, Optional, List, Union
from pymongo import MongoClient
from urllib.parse import urlparse, parse_qs, urlencode
import urllib.parse
import sys
import os

# Add the Backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.short_id import generate_short_id, is_valid_short_id
from auth_middleware import requireAuth
from flask import g

# Import enhanced survey handler
try:
    from enhanced_survey_handler import EnhancedSurveyHandler
    ENHANCED_HANDLER_AVAILABLE = True
    print("✅ Enhanced survey handler imported successfully")
except ImportError as e:
    print(f"⚠️ Enhanced survey handler not available: {e}")
    ENHANCED_HANDLER_AVAILABLE = False

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Using default environment variables.")

if os.getenv("FLASK_ENV") == "development":
    BASE_URL = "http://127.0.0.1:5000"
else:
    BASE_URL = "https://api.theinterwebsite.space"

app = Flask(__name__)
app.secret_key = os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-for-local-development')

CORS(app, 
     supports_credentials=True,
     origins=[
         "http://localhost:5173",         # For local testing
         "http://localhost:5174",         # Alternative port
         "http://127.0.0.1:5173",
         "http://127.0.0.1:5174",
         "https://pepperadsresponses.web.app",
         "https://hostsliceresponse.web.app",
         "https://theinterwebsite.space",
         "http://localhost:3000",         # Dashboard frontend
         "https://pepperads.in"           # Main site
     ],
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     expose_headers=["Set-Cookie"]
)

# Disable Flask's automatic trailing slash redirects to prevent 308 redirects
app.url_map.strict_slashes = False


@app.before_request
def log_request_info():
    print("Received request:", request.method, request.path)
    print("Headers:", dict(request.headers))


# Initialize MongoDB first
print("Initializing MongoDB...")
from mongodb_config import db
print("✅ MongoDB initialized successfully")

# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "AIzaSyDKsjeKLBjrbEtVhed015yRimBpIk5CU6s")
print(f"Using Gemini API Key: {GEMINI_API_KEY[:20]}...")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash-latest")
print("✅ Gemini API configured successfully")

# Import blueprints after MongoDB is initialized
try:
    print("Importing blueprints...")
    from postback_handler import postback_bp
    from postback_api import postback_api_bp
    from postback_testing import postback_testing_bp
    from auth_routes import auth_bp
    from survey_routes import survey_bp
    from admin_routes import admin_bp
    
    # Register blueprints
    print("Registering blueprints...")
    app.register_blueprint(postback_bp, url_prefix='/postback')
    app.register_blueprint(postback_api_bp, url_prefix='/api')
    app.register_blueprint(postback_testing_bp, url_prefix='/test')
    app.register_blueprint(auth_bp)  # Auth routes at /api/auth
    app.register_blueprint(survey_bp)  # Survey routes at /api/surveys
    app.register_blueprint(admin_bp)  # Admin routes at /api/admin
    print("✅ All blueprints registered successfully")
except ImportError as e:
    print(f"⚠️ Failed to import blueprints: {e}")
    print("Make sure all blueprint files exist and don't have syntax errors.")
    print("Files should be in the same directory as app.py:")
    print("- postback_handler.py")
    print("- postback_api.py") 
    print("- postback_testing.py")
    print("- auth_routes.py")
    raise  # Re-raise the exception to see the full traceback


# Helper function to convert ObjectId to string
def convert_objectid_to_string(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, dict):
                convert_objectid_to_string(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_objectid_to_string(item)
    return doc


@app.route('/')
def home():
    return "Hello Azure!"


@app.route('/save-email', methods=['POST'])
def save_email():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        doc_id = str(uuid.uuid4())
        email_data = {
            "_id": doc_id,
            "email": email,
            "saved_at": datetime.utcnow()
        }
        db["user_emails"].insert_one(email_data)

        return jsonify({"message": "Email saved successfully", "id": doc_id})
    except Exception as e:
        print(f"Error saving email: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    print("Received data:", data)
    data["created_at"] = datetime.utcnow()
    db["clicks"].insert_one(data)
    return {"status": "success"}, 200


def parse_survey_response(response_text):
    if not response_text:
        raise ValueError("Empty response text received")

    questions = []
    current_question = None

    try:
        # Split into lines and clean
        lines = [line.strip() for line in response_text.split('\n') if line.strip()]

        for line in lines:
            # Match question patterns (1. Question text (Type))
            question_match = re.match(r'^(\d+)\.\s*(.+?)(?:\s*\(([^)]+)\))?$', line)

            if question_match:
                # Save previous question if exists
                if current_question:
                    # Set default options for multiple choice if none found
                    if current_question.get("type") == "multiple_choice" and not current_question.get("options"):
                        current_question["options"] = ["Yes", "No"]
                    questions.append(current_question)

                question_num = question_match.group(1)
                question_text = question_match.group(2).strip().replace('*', '')
                question_type = (question_match.group(3) or "").lower().strip()

                # Normalize question type based on the text in parentheses
                if "multiple choice" in question_type or "mcq" in question_type:
                    normalized_type = "multiple_choice"
                elif "rating" in question_type or "scale" in question_type:
                    normalized_type = "rating"
                elif "yes" in question_type and "no" in question_type:
                    normalized_type = "yes_no"
                elif "short" in question_type or "answer" in question_type:
                    normalized_type = "short_answer"
                elif "opinion scale" in question_type:
                    normalized_type = "rating"
                else:
                    # Try to infer from question text if no clear type
                    if "rate" in question_text.lower() or "scale" in question_text.lower():
                        normalized_type = "rating"
                    elif "recommend" in question_text.lower() or "would you" in question_text.lower():
                        normalized_type = "yes_no"
                    else:
                        normalized_type = "multiple_choice"

                current_question = {
                    "question": question_text,
                    "type": normalized_type,
                    "options": []
                }
                continue

            # Match options with proper format (A) Option, B) Option, etc.)
            option_match = re.match(r'^([A-Da-d])\)\s*(.+)$', line)
            if option_match and current_question:
                option_letter = option_match.group(1).upper()
                option_text = option_match.group(2).strip()
                if option_text and len(option_text) > 0:
                    current_question["options"].append(option_text)
                continue

        # Add the last question
        if current_question:
            # Set default options for multiple choice if none found
            if current_question.get("type") == "multiple_choice" and not current_question.get("options"):
                current_question["options"] = ["Yes", "No"]
            questions.append(current_question)

        # Validate and clean questions
        valid_questions = []
        for i, q in enumerate(questions):
            # Clean question text
            q["question"] = q["question"].strip()

            # Validate question length
            if len(q["question"]) >= 5:
                # Add unique ID
                q["id"] = f"q{i + 1}"

                # Handle different question types
                if q["type"] == "multiple_choice":
                    # Ensure we have valid options for multiple choice
                    if not q["options"] or len(q["options"]) < 2:
                        q["options"] = ["Yes", "No"]  # Fallback
                elif q["type"] == "yes_no":
                    # Force Yes/No options
                    q["options"] = ["Yes", "No"]
                elif q["type"] in ["rating", "short_answer"]:
                    # Remove options for these types
                    q["options"] = []

                valid_questions.append(q)

        if not valid_questions:
            raise ValueError("No valid questions were parsed from the response")

        print(f"Successfully parsed {len(valid_questions)} questions")
        for i, q in enumerate(valid_questions):
            print(f"Q{i + 1}: {q['question'][:50]}... Type: {q['type']}, Options: {len(q.get('options', []))}")

        return valid_questions

    except Exception as e:
        print(f"Error parsing survey response: {str(e)}")
        print(f"Original text: {response_text[:500]}...")  # Debug logging
        raise ValueError(f"Failed to parse survey questions: {str(e)}")

def send_webhook_notification(data):
    """Send webhook notification to Make.com with proper datetime serialization"""
    url = "https://hook.eu2.make.com/582wnttqwkv7tgoizpvdv1grwux0gpir"
    headers = {'Content-Type': 'application/json'}
    
    def serialize_datetime(obj):
        """Convert datetime objects to ISO format strings for JSON serialization"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {key: serialize_datetime(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [serialize_datetime(item) for item in obj]
        else:
            return obj
    
    try:
        # Serialize datetime objects in the data
        serialized_data = serialize_datetime(data)
        
        response = requests.post(url, json=serialized_data, headers=headers, timeout=10)
        if response.status_code == 200:
            print("Webhook notification sent successfully to Make.com")
        else:
            print(f"Failed to send webhook to Make.com. Status code: {response.status_code}")
            print(f"Response: {response.text}")
    except requests.exceptions.Timeout:
        print("Error sending webhook to Make.com: Request timed out")
    except requests.exceptions.ConnectionError:
        print("Error sending webhook to Make.com: Connection error")
    except Exception as e:
        print(f"Error sending webhook to Make.com: {e}")
def validate_color(color):
    """Validate and normalize hex color code"""
    if not color:
        return "#000000"  # Default to black if no color provided
    
    if not isinstance(color, str):
        raise ValueError("Color must be a string")
        
    # Remove # if present
    color = color.lstrip('#')
    
    # Convert 3-digit hex to 6-digit hex
    if len(color) == 3:
        color = ''.join(c + c for c in color)
    
    # Check if it's a valid hex color
    if not re.match(r'^[0-9a-fA-F]{6}$', color):
        raise ValueError(f"Invalid hex color code: #{color}")
        
    return f"#{color.lower()}"

@app.route('/generate', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",         # For local testing
        "http://localhost:5174",         # Alternative port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
    methods=["GET", "POST", "OPTIONS"]
)
@requireAuth
def generate_survey():
    if request.method == 'OPTIONS':
        return '', 200
    template_type = "customer_feedback"
    raw_response = ""
    question_count = 10

    try:
        # Validate request content type
        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 400

        # Get and validate request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        print(f"\n=== SURVEY GENERATION REQUEST ===")
        print(f"Raw request data: {data}")

        # Extract and validate required fields
        prompt = data.get("prompt", "").strip()
        if not prompt:
            return jsonify({"error": "Prompt is required and cannot be empty"}), 400

        # Get template type first
        template_type = data.get("template_type", "customer_feedback")
        response_type = data.get("response_type", "multiple_choice")
        theme = data.get("theme") or {}
        
        print(f"Template type: {template_type}")
        print(f"Response type: {response_type}")
        print(f"Prompt: {prompt[:100]}...")

        # Get question count - flexible for all templates
        try:
            question_count = int(data.get("question_count", 10))
            # Allow flexible question count for all templates (5-100)
            if question_count < 5 or question_count > 100:
                return jsonify({"error": "Question count must be between 5 and 100"}), 400
        except ValueError:
            return jsonify({"error": "Invalid question count"}), 400

        # Define prompt templates with the current question_count and prompt
        prompt_templates = {
            "custom": f"""
            Generate a comprehensive survey about "{prompt}" with exactly {question_count} questions that thoroughly explore this topic.
            
            Create exactly {question_count} questions that cover all important aspects. Be creative and thorough.
            
            Use this exact format:
            
            1. Question text here (Multiple Choice)
            A) Option 1
            B) Option 2
            C) Option 3
            D) Option 4
            
            2. Question text here (Rating 1-10)
            
            3. Question text here (Yes/No)
            A) Yes
            B) No
            
            4. Question text here (Short Answer)
            
            5. Question text here (Opinion Scale 1-5)
            
            Important Rules:
            - Start each question with a number and period (1. 2. 3. etc)
            - Include the question type in parentheses
            - Multiple Choice = 4 options (A-D)
            - Yes/No = Only two options: A) Yes, B) No
            - Rating, Short Answer, and Opinion Scale = No options needed
            - Ask follow-up questions, demographic questions, suggestions, and detailed feedback
            - Cover different angles: satisfaction, recommendations, improvements, future needs, etc.
            
            Generate a thorough, comprehensive survey - don't limit yourself to just 10 questions!
            """,
            
            "customer_feedback": f"""
            Generate exactly {question_count} survey questions for customer feedback about "{prompt}".

            Use this exact format:

            1. Question text here (Multiple Choice)  
            A) Option 1  
            B) Option 2  
            C) Option 3  
            D) Option 4  

            2. Question text here (Rating 1-5)

            3. Question text here (Yes/No)  
            A) Yes  
            B) No  

            4. Question text here (Short Answer)

            5. Question text here (Opinion Scale 1-10)

            Important Rules:
            - Start each question with a number and period (1. 2. 3. etc)
            - Include the question type in parentheses exactly as shown
            - Multiple Choice = 4 options (A-D)
            - Yes/No = Only two options: A) Yes, B) No
            - Rating, Short Answer, and Opinion Scale = No options needed

            Create a good distribution of question types across all {question_count} questions:
            - Multiple Choice questions (about 30%)
            - Rating questions (about 20%) 
            - Yes/No questions (about 20%)
            - Short Answer questions (about 20%)
            - Opinion Scale questions (about 10%)

            Do not include any explanation — only return the {question_count} formatted questions in order.
            """,

            "employee_checkin": f"""
            Generate exactly {question_count} employee check-in survey questions about "{prompt}".

            Use this exact format:

            1. Question text here (Multiple Choice)  
            A) Option 1  
            B) Option 2  
            C) Option 3  
            D) Option 4  

            2. Question text here (Rating 1-5)

            3. Question text here (Yes/No)  
            A) Yes  
            B) No  

            4. Question text here (Short Answer)

            5. Question text here (Opinion Scale 1-10)

            Important Rules:
            - Start each question with a number and period (1. 2. 3. etc)
            - Include the question type in parentheses exactly as shown
            - Multiple Choice = 4 options (A-D)
            - Yes/No = Only two options: A) Yes, B) No
            - Rating, Short Answer, and Opinion Scale = No options needed

            Create a good distribution of question types across all {question_count} questions:
            - Multiple Choice questions (about 30%)
            - Rating questions (about 20%) 
            - Yes/No questions (about 20%)
            - Short Answer questions (about 20%)
            - Opinion Scale questions (about 10%)

            Do not include any explanation — only return the {question_count} formatted questions in order.
            """,

            "default": f"""
                                 Generate exactly {question_count} survey questions about "{prompt}".

                                 Use this exact format:

                                 1. Question text here (Multiple Choice)  
                                 A) Option 1  
                                 B) Option 2  
                                 C) Option 3  
                                 D) Option 4  

                                 2. Question text here (Rating 1-5)

                                 3. Question text here (Yes/No)  
                                 A) Yes  
                                 B) No  

                                 4. Question text here (Short Answer)

                                 5. Question text here (Opinion Scale 1-10)

                                 Important Rules:
                                 - Start each question with a number and period (1. 2. 3. etc)
                                 - Include the question type in parentheses exactly as shown
                                 - Multiple Choice = 4 options (A-D)
                                 - Yes/No = Only two options: A) Yes, B) No
                                 - Rating, Short Answer, and Opinion Scale = No options needed

                                 Do not include any explanation — only return the formatted questions.
                                 """
        }

        # Validate theme structure
        if not isinstance(theme, dict):
            return jsonify({"error": "Theme must be an object"}), 400

        print("Theme from frontend:", theme)

        # Complete theme setup with validation
        try:
            complete_theme = {
                "font": theme.get("font", "Poppins, sans-serif"),
                "intent": theme.get("intent", "professional"),
                "colors": {
                    "primary": validate_color(theme.get("colors", {}).get("primary", "#d90429")),
                    "background": validate_color(theme.get("colors", {}).get("background", "#ffffff")),
                    "text": validate_color(theme.get("colors", {}).get("text", "#333333"))
                }
            }
        except ValueError as e:
            return jsonify({"error": f"Invalid theme color: {str(e)}"}), 400

        # Validate template type
        if template_type not in prompt_templates:
            return jsonify({
                "error": f"Invalid template type. Available templates: {', '.join(prompt_templates.keys())}"
            }), 400

        # Get AI prompt template
        ai_prompt = prompt_templates.get(template_type, prompt_templates["default"])

        # Generate survey with retries
        max_retries = 3
        questions = []
        last_error = None

        for attempt in range(max_retries):
            try:
                print(f"Attempt {attempt + 1} for template: {template_type}")
                
                # Generate content with timeout
                response = model.generate_content(
                    ai_prompt,
                    generation_config={
                        "temperature": 0.7,
                        "top_p": 0.8,
                        "top_k": 40,
                        "max_output_tokens": 1024,
                    }
                )

                if not response or not response.text:
                    raise ValueError("Empty response from AI model")

                raw_response = response.text.strip()
                print("Gemini Response:\n", raw_response)

                # Parse and validate questions
                questions = parse_survey_response(raw_response)
                
                if not questions:
                    raise ValueError("Failed to parse any valid questions")

                if len(questions) >= max(3, question_count // 2):
                    break  # Success
                else:
                    raise ValueError(f"Only got {len(questions)} valid questions, needed at least {max(3, question_count // 2)}")

            except Exception as retry_error:
                last_error = retry_error
                print(f"Retry {attempt + 1} failed: {retry_error}")
                
                # Check for quota exceeded error
                if "RATE_LIMIT_EXCEEDED" in str(retry_error) or "Quota exceeded" in str(retry_error):
                    return jsonify({
                        "error": "API quota exceeded. Please try again later or upgrade your API plan.",
                        "error_type": "quota_exceeded",
                        "message": "The Google Gemini API has reached its rate limit. Please wait a few minutes before trying again."
                    }), 429
                
                if attempt == max_retries - 1:
                    raise ValueError(f"Failed after {max_retries} attempts: {str(last_error)}")
         # your backend
        # def get_frontend_url():
        #     if "localhost" in request.host or "127.0.0.1" in request.host:
        #         return "http://localhost:5173"
        #     return "https://pepperadsresponses.web.app" 
     
        # Dynamic frontend URL based on environment
        if "localhost" in request.host or "127.0.0.1" in request.host:
            FRONTEND_URL = "http://localhost:5173"
        else:
            FRONTEND_URL = "https://pepperadsresponses.web.app"
        # Create and save survey document
        try:
            print(f"DEBUG: About to create survey with db object: {db}")
            # Generate a short ID (5 characters) for the survey
            while True:
                short_id = generate_short_id(5)
                # Check if this ID already exists
                if not db.surveys.find_one({"$or": [{"_id": short_id}, {"id": short_id}]}):
                    break
                    
            # Get authenticated user first (now mandatory with @requireAuth)
            current_user = g.current_user  # Will always exist due to @requireAuth
            
            # Debug: Print current_user data
            print(f"DEBUG: Current user data: {current_user}")
            print(f"DEBUG: simpleUserId: {current_user.get('simpleUserId', 'MISSING')}")
            
            survey_id = short_id
            simple_user_id = current_user.get('simpleUserId', 0)
            
            # Ensure we have a valid simpleUserId
            if simple_user_id == 0 or simple_user_id is None:
                print("WARNING: simpleUserId is 0 or None, fetching from database")
                # Fallback: get from database directly
                user_from_db = db.users.find_one({'_id': current_user['_id']})
                if user_from_db:
                    simple_user_id = user_from_db.get('simpleUserId', 0)
                    print(f"DEBUG: Retrieved simpleUserId from DB: {simple_user_id}")
            
            survey_data = {
                "_id": survey_id,
                "id": survey_id,
                "prompt": prompt,
                "response_type": response_type,
                "template_type": template_type,
                "questions": questions,
                "theme": complete_theme,
                "created_at": datetime.utcnow(),
                "shareable_link": f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}",
                "public_link": f"{FRONTEND_URL}/survey?offer_id={survey_id}&user_id={simple_user_id}",
                "is_short_id": True  # Mark that this survey uses a short ID
            }
            
            print(f"DEBUG: Generated links with user_id={simple_user_id}")
            print(f"DEBUG: Shareable link: {survey_data['shareable_link']}")
            
            # Link survey to authenticated user
            user_id_str = str(current_user['_id'])
            
            # Add all user identification fields
            survey_data["ownerUserId"] = user_id_str
            survey_data["user_id"] = user_id_str
            survey_data["creator_email"] = current_user.get('email', '')
            survey_data["creator_name"] = current_user.get('name', '')
            survey_data["simple_user_id"] = simple_user_id
            survey_data["created_by"] = {
                "user_id": user_id_str,
                "email": current_user.get('email', ''),
                "name": current_user.get('name', ''),
                "simple_id": current_user.get('simpleUserId', 0)
            }
            
            print(f"✅ Survey linked to user: {current_user.get('email', 'Unknown')} (ID: {user_id_str}, SimpleID: {current_user.get('simpleUserId', 'None')})")
            print(f"📋 Survey data includes: ownerUserId, user_id, creator_email, creator_name, simple_user_id, created_by")
            print(f"🔗 Generated links:")
            print(f"   - Shareable: {survey_data['shareable_link']}")
            print(f"   - Public: {survey_data['public_link']}")
            print(f"👤 User simpleUserId: {current_user.get('simpleUserId', 'NOT SET')}")

            # Save to database without timeout parameter
            db["surveys"].insert_one(survey_data)
            
            print(f"\n=== SURVEY GENERATION SUCCESS ===")
            print(f"Survey ID: {survey_id}")
            print(f"Template: {template_type}")
            print(f"Questions generated: {len(questions)}")
            print(f"Questions: {[q.get('question', 'No question text') for q in questions[:3]]}...")

            response_data = {
                "survey_id": survey_id,
                "questions": questions,
                "template_type": template_type,
                "theme": complete_theme
            }
            
            print(f"Response data structure: {list(response_data.keys())}")
            return jsonify(response_data)

        except Exception as db_error:
            print(f"Database error: {db_error}")
            return jsonify({
                "error": "Failed to save survey",
                "details": str(db_error)
            }), 500


    except Exception as e:
        print(f"Survey generation error: {e}")
        return jsonify({
            "error": str(e),
            "suggestion": "Try changing the template or using simpler prompt text.",
            "debug_info": {
                "template_type": template_type
            }
        }), 500


@app.route('/survey/<survey_id>/respond', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def submit_public_response(survey_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        responses = data.get("responses", {})
        email = data.get("email")
        username = data.get("username")
        tracking_id = data.get("tracking_id")
        url_parameters = data.get("url_parameters", {})

        print(f"Parsed responses: {responses}")
        print(f"Parsed email: {email}")
        print(f"Parsed username: {username}")
        print(f"Parsed URL parameters: {url_parameters}")

        if not responses:
            print("ERROR: No responses provided")
            return jsonify({"error": "Responses required"}), 400

        # Check if the survey_id is a valid short ID (5 alphanumeric characters)
        is_short_id = is_valid_short_id(survey_id, 5)
        
        # Build query to find survey by ID
        query = {"$or": [{"_id": survey_id}, {"id": survey_id}]}
        
        # If it's not a short ID, try to convert from UUID string to ObjectId if needed
        if not is_short_id and len(survey_id) == 24:
            try:
                query["$or"].append({"_id": ObjectId(survey_id)})
            except:
                pass  # Not a valid ObjectId, continue with original query
        
        print(f"Looking for survey with query: {query}")
        survey = db["surveys"].find_one(query)

        if not survey:
            print(f"ERROR: Survey {survey_id} not found in database")
            # Let's see what surveys exist
            all_surveys = list(db["surveys"].find({}, {"_id": 1, "id": 1, "prompt": 1}))
            print(f"Available surveys: {all_surveys}")
            return jsonify({"error": "Survey not found"}), 404

        print(f"Found survey: {survey.get('_id')} / {survey.get('id')}")

        response_id = str(uuid.uuid4())
        response_data = {
            "_id": response_id,
            "id": response_id,
            "survey_id": survey_id,
            "responses": responses,
            "submitted_at": datetime.utcnow(),
            "is_public": True,
            "status": "submitted"
        }

        if email:
            response_data["email"] = email
        if username:
            response_data["username"] = username
        if url_parameters:
            response_data["url_parameters"] = url_parameters

        print(f"Attempting to save response data: {response_data}")

        # Insert into database
        try:
            result = db["responses"].insert_one(response_data)  # ✅ Save to "responses"

            print(f"SUCCESS: Database insert result: {result.inserted_id}")

            # Verify it was saved
            saved_doc = db["responses"].find_one({"_id": response_id})
            if saved_doc:
                print(f"VERIFIED: Document was saved successfully")
                print(f"Saved document: {saved_doc}")
            else:
                print(f"ERROR: Document was not found after saving")

        except Exception as db_error:
            print(f"DATABASE ERROR: {db_error}")
            return jsonify({"error": f"Database error: {str(db_error)}"}), 500

        # Forward to partners (optional) - Prepare postback data
        try:
            # Create postback data with required fields
            postback_data = {
                "transaction_id": response_id,  # Use response ID as transaction ID
                "survey_id": survey_id,
                "email": response_data.get("email", ""),
                "username": response_data.get("username", "anonymous"),
                "responses": responses,
                "status": "completed",
                "reward": "0.1",  # Default reward amount
                "currency": "USD",
                "session_id": response_id,
                "complete_id": response_id,
                "submitted_at": response_data["submitted_at"]
            }
            
            print(f"🔥 TRIGGERING POSTBACK: Sending postback data for survey {survey_id}")
            print(f"Postback data: {postback_data}")
            
            forward_success = forward_survey_data_to_partners(postback_data)
            if forward_success:
                print("✅ SUCCESS: Postback forwarding completed successfully")
            else:
                print("⚠️ WARNING: Survey forwarding failed to all partners")
        except Exception as forward_error:
            print(f"❌ ERROR: Partner forwarding error: {forward_error}")

        # Handle tracking (optional)
        if tracking_id:
            try:
                tracking_doc = db["survey_tracking"].find_one({"_id": tracking_id})
                if tracking_doc:
                    db["survey_tracking"].update_one(
                        {"_id": tracking_id},
                        {
                            "$set": {
                                "submitted": True,
                                "submitted_at": datetime.utcnow(),
                                "response_id": response_id
                            }
                        }
                    )
                    print(f"Updated tracking for {tracking_id}")
            except Exception as tracking_error:
                print(f"WARNING: Tracking update error: {tracking_error}")

        # Send webhook notification to Make.com
        send_webhook_notification(response_data)
        
        print(f"SUCCESS: Response {response_id} processed successfully")
        return jsonify({
            "message": "Response submitted successfully",
            "response_id": response_id,
            "survey_id": survey_id
        })

    except Exception as e:
        print(f"GENERAL ERROR in response submission: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@app.route('/insights', methods=['POST'])
def generate_insights():
    data = request.json
    survey_id = data.get("survey_id")

    if not survey_id:
        return jsonify({"error": "Survey ID is required"}), 400

    try:
        # Find all responses for this survey
        responses_cursor = db["responses"].find({"survey_id": survey_id})
        
        all_responses = []
        for response_doc in responses_cursor:
            responses = response_doc.get("responses", {})
            for question, answer in responses.items():
                all_responses.append(f"{question}: {answer}")

        if not all_responses:
            return jsonify({"error": "No responses found"}), 404

        full_text = "\n".join(all_responses)

        prompt = (
            "Based on the following customer survey responses, suggest business strategies, improvements, or new market segments.\n"
            f"Responses:\n{full_text}\n\nBusiness Ideas:"
        )

        ai_response = model.generate_content(prompt)
        insights = ai_response.text.strip()

        return jsonify({"insights": insights})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/check-logic', methods=['POST'])
def check_logic():
    data = request.json
    responses = data.get("responses")

    q1 = responses.get("Do you want to start a business?")
    q2 = responses.get("Are you currently in college?")

    if q1 == "Yes" and q2 == "Yes":
        return jsonify({"next_page": "https://jobfinder-efe0e.web.app/public_survey.html?id=abc123"})
    else:
        return jsonify({"next_page": "thankyou.html"})


@app.route('/survey/<survey_id>/branching', methods=['POST'])
def get_branching_logic(survey_id):
    """Handle branching logic for surveys - progressive question display"""
    try:
        data = request.json
        question_id = data.get("question_id")
        answer = data.get("answer")
        current_visible = data.get("current_visible_questions", [])
        
        print(f"Branching logic - Survey: {survey_id}, Question: {question_id}, Answer: {answer}")
        print(f"Current visible questions: {current_visible}")
        
        # Find the survey to get questions structure
        survey = db["surveys"].find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        questions = survey.get("questions", [])
        all_question_ids = [q.get("id") for q in questions if q.get("id")]
        
        # Find current question index
        current_question_index = -1
        for i, q in enumerate(questions):
            if q.get("id") == question_id:
                current_question_index = i
                break
        
        if current_question_index == -1:
            return jsonify({"error": "Question not found"}), 404
        
        # Get the question text to understand context
        current_question = questions[current_question_index]
        question_text = current_question.get("question", "").lower()
        answer_str = str(answer).lower().strip()
        
        print(f"Question text: {question_text}")
        print(f"Answer: {answer_str}")
        
        # Progressive question display logic
        next_questions = list(current_visible) if current_visible else []
        
        # Determine how many questions to show next based on the answer
        questions_to_add = 1  # Default: show next question
        
        # Smart branching logic
        if "satisfaction" in question_text or "satisfied" in question_text:
            if answer_str in ["no", "very dissatisfied", "dissatisfied", "poor", "1", "2"]:
                # Negative feedback - show more questions to understand issues
                questions_to_add = 2
            else:
                # Positive feedback - show next question normally
                questions_to_add = 1
                
        elif "recommend" in question_text:
            if answer_str in ["no", "never", "unlikely", "0", "1", "2", "3", "4"]:
                # Low recommendation - show improvement-focused questions
                questions_to_add = 2
            else:
                # High recommendation - normal flow
                questions_to_add = 1
                
        elif "rating" in question_text or "rate" in question_text:
            try:
                rating = float(answer_str)
                if rating <= 5:  # Low rating
                    # Show more questions to understand issues
                    questions_to_add = 2
                else:  # High rating
                    # Normal flow
                    questions_to_add = 1
            except ValueError:
                questions_to_add = 1
                
        elif "product" in question_text or "service" in question_text:
            if answer_str in ["no", "poor", "bad", "terrible", "awful"]:
                # Skip some questions, focus on feedback
                questions_to_add = 1
            else:
                questions_to_add = 1
        
        # Add next questions progressively
        for i in range(questions_to_add):
            next_index = current_question_index + i + 1
            if next_index < len(all_question_ids):
                next_question_id = all_question_ids[next_index]
                if next_question_id not in next_questions:
                    next_questions.append(next_question_id)
        
        # Ensure we don't exceed total questions
        next_questions = [q for q in next_questions if q in all_question_ids]
        
        print(f"Next questions to show: {next_questions}")
        
        return jsonify({
            "next_questions": next_questions,
            "message": f"Based on your answer '{answer}', showing {len(next_questions)} questions",
            "total_questions": len(all_question_ids),
            "current_progress": len(next_questions)
        })
        
    except Exception as e:
        print(f"Branching logic error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/survey/<survey_id>/track', methods=['POST'])
def track_survey_view(survey_id):
    """Track when a user views a survey"""
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        
        tracking_id = str(uuid.uuid4())
        tracking_data = {
            "_id": tracking_id,
            "survey_id": survey_id,
            "username": username,
            "email": email,
            "viewed_at": datetime.utcnow(),
            "submitted": False
        }
        
        db["survey_tracking"].insert_one(tracking_data)
        
        return jsonify({
            "tracking_id": tracking_id,
            "message": "Tracking started"
        })
        
    except Exception as e:
        print(f"Tracking error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/survey/<survey_id>/tracking', methods=['GET'])
def get_survey_tracking(survey_id):
    try:
        # Find all tracking documents for this survey
        tracking_cursor = db["survey_tracking"].find({"survey_id": survey_id})

        total_views = 0
        total_submissions = 0
        view_data = []

        for doc in tracking_cursor:
            data = convert_objectid_to_string(doc)
            total_views += 1
            view_data.append(data)

            if data.get("submitted", False):
                total_submissions += 1

        completion_rate = 0
        if total_views > 0:
            completion_rate = (total_submissions / total_views) * 100

        return jsonify({
            "survey_id": survey_id,
            "total_views": total_views,
            "total_submissions": total_submissions,
            "completion_rate": completion_rate,
            "view_data": view_data
        })

    except Exception as e:
        print(f"Survey tracking stats error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/survey/<survey_id>/view', methods=['GET'])
def view_survey(survey_id):
    try:
        # Check if the survey_id is a valid short ID (5 alphanumeric characters)
        is_short_id = is_valid_short_id(survey_id, 5)
        
        # Build query to find survey by ID
        query = {"$or": [{"_id": survey_id}, {"id": survey_id}]}
        
        # If it's not a short ID, try to convert from UUID string to ObjectId if needed
        if not is_short_id and len(survey_id) == 24:
            try:
                query["$or"].append({"_id": ObjectId(survey_id)})
            except:
                pass  # Not a valid ObjectId, continue with original query
        
        # Optional: track click
        email = request.args.get("email")
        username = request.args.get("username")

        if email and username:
            click_data = {
                "email": email,
                "username": username,
                "survey_id": survey_id,
                "clicked_at": datetime.utcnow()
            }
            db["survey_clicks"].insert_one(click_data)
            print(f"Click tracked: {username} ({email}) on survey {survey_id}")

        # Find the survey using the query
        survey = db["surveys"].find_one(query)
        # ✅ Fix here: use "id" instead of "_id"
        survey = db["surveys"].find_one({"id": survey_id})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404

        survey_data = convert_objectid_to_string(survey)

        # Optional: if you want to return responses too
        # responses_cursor = db["survey_responses"].find({"survey_id": survey_id})
        # response_list = [convert_objectid_to_string(resp) for resp in responses_cursor]

        # ✅ Fix here: return flat survey only
        return jsonify(survey_data)

    except Exception as e:
        print(f"Survey view error: {e}")
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500



@app.route('/surveys', methods=['GET'])
def list_surveys():
    try:
        # Find all surveys, sorted by created_at in descending order
        surveys_cursor = db["surveys"].find().sort("created_at", -1)

        surveys = []
        for doc in surveys_cursor:
            data = convert_objectid_to_string(doc)
            # Ensure id field is present (some documents might use _id)
            if 'id' not in data and '_id' in data:
                data['id'] = data['_id']
            surveys.append(data)

        return jsonify({"surveys": surveys})
    except Exception as e:
        print("Error fetching surveys:", e)
        return jsonify({"error": str(e)}), 500


# Add this endpoint to your app.py

@app.route('/survey/<survey_id>/responses', methods=['GET'])
def get_survey_responses(survey_id):
    try:
        print(f"Fetching responses for survey: {survey_id}")

        # Find all responses for this survey
        responses_cursor = db["responses"].find({"survey_id": survey_id})

        responses = []
        for doc in responses_cursor:
            response_data = convert_objectid_to_string(doc)
            responses.append(response_data)

        print(f"Found {len(responses)} responses")

        return jsonify({
            "survey_id": survey_id,
            "total_responses": len(responses),
            "responses": responses
        })

    except Exception as e:
        print(f"Error fetching responses: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/debug/all-responses', methods=['GET'])
def get_all_responses():
    """Debug endpoint to see all responses in the database"""
    try:
        responses_cursor = db["responses"].find()

        responses = []
        for doc in responses_cursor:
            response_data = convert_objectid_to_string(doc)
            responses.append(response_data)

        return jsonify({
            "total_responses": len(responses),
            "responses": responses
        })

    except Exception as e:
        print(f"Error fetching all responses: {e}")
        return jsonify({"error": str(e)}), 500

# edit survey
@app.route('/survey/<survey_id>/edit', methods=['PUT'])
def edit_survey(survey_id):
    print(f"Edit survey request for ID: {survey_id}")
    data = request.get_json()
    print(f"Update data: {data}")

    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Clean the data to remove fields that shouldn't be updated
        update_data = {k: v for k, v in data.items() if k not in ['_id', 'created_at', 'is_short_id']}
        
        # Check if the survey_id is a valid short ID (5 alphanumeric characters)
        is_short_id = is_valid_short_id(survey_id, 5)
        
        # Build query to find survey by ID
        query = {"$or": [{"_id": survey_id}, {"id": survey_id}]}
        
        # If it's not a short ID, try to convert from UUID string to ObjectId if needed
        if not is_short_id and len(survey_id) == 24:
            try:
                query["$or"].append({"_id": ObjectId(survey_id)})
            except:
                pass  # Not a valid ObjectId, continue with original query
        
        print(f"Update query: {query}")
        print(f"Update data: {update_data}")
        
        result = db["surveys"].update_one(
            query,
            { "$set": update_data }
        )
        
        print(f"Update result: matched={result.matched_count}, modified={result.modified_count}")

        if result.matched_count == 0:
            # Try one more time with just the ID fields in case of any query issues
            alt_query = {"$or": [{"_id": survey_id}, {"id": survey_id}]}
            result = db["surveys"].update_one(
                alt_query,
                { "$set": update_data }
            )
            
            if result.matched_count == 0:
                return jsonify({ "error": "Survey not found" }), 404

        return jsonify({ 
            "message": "Survey updated successfully",
            "survey_id": survey_id,
            "is_short_id": is_short_id
        })

    except Exception as e:
        print(f"Error updating survey: {e}")
        return jsonify({ "error": str(e) }), 500


# Postback URL Management Endpoints
@app.route('/postback/outbound', methods=['POST', 'GET'])
def manage_outbound_postback():
    if request.method == 'POST':
        try:
            data = request.get_json()
            postback_url = data.get('url', '').strip()
            
            if not postback_url:
                return jsonify({"error": "URL is required"}), 400
                
            # Basic URL validation
            if not postback_url.startswith(('http://', 'https://')):
                return jsonify({"error": "URL must start with http:// or https://"}), 400
            
            # Save or update the postback URL
            db["postback_config"].update_one(
                {"_id": "outbound_url"},
                {"$set": {"url": postback_url, "updated_at": datetime.utcnow()}},
                upsert=True
            )
            
            return jsonify({"message": "Postback URL saved successfully", "url": postback_url})
            
        except Exception as e:
            print(f"Error saving survey: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Failed to save survey: {str(e)}"}), 500
    
    else:  # GET request
        try:
            postback_config = db["postback_config"].find_one({"_id": "outbound_url"})
            if postback_config:
                return jsonify({
                    "url": postback_config.get("url", ""),
                    "updated_at": postback_config.get("updated_at")
                })
            else:
                return jsonify({"url": "", "updated_at": None})
                
        except Exception as e:
            print(f"Error retrieving postback URL: {e}")
            return jsonify({"error": str(e)}), 500


# Add enhanced survey submission endpoint
if ENHANCED_HANDLER_AVAILABLE:
    @app.route('/survey/<survey_id>/submit-enhanced', methods=['POST'])
    def submit_enhanced_survey_response(survey_id):
        """Enhanced survey submission with pass/fail logic, tracking, and conditional redirects"""
        
        # Validate request
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        request_data = request.json
        if not request_data:
            return jsonify({"error": "No data provided"}), 400
        
        # Process submission using enhanced handler
        handler = EnhancedSurveyHandler()
        result = handler.handle_survey_submission(survey_id, request_data)
        
        # Return appropriate status code
        if "error" in result:
            status_code = result.get("status_code", 500)
            return jsonify(result), status_code
        else:
            return jsonify(result), 200
    
    print("✅ Enhanced survey submission endpoint added: /survey/<survey_id>/submit-enhanced")
else:
    print("⚠️ Enhanced survey submission endpoint not available")

# Admin configuration endpoints for pass/fail system
@app.route('/admin/survey/<survey_id>/config', methods=['GET', 'POST', 'PUT'])
def manage_survey_config(survey_id):
    """Manage survey pass/fail configuration"""
    
    if request.method == 'GET':
        # Get current configuration
        try:
            config = db.survey_configurations.find_one({"survey_id": survey_id})
            if config:
                # Convert ObjectId to string
                config["_id"] = str(config["_id"])
                return jsonify(config)
            else:
                return jsonify({"message": "No configuration found", "survey_id": survey_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method in ['POST', 'PUT']:
        # Update configuration
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            # Prepare configuration data
            config_data = {
                "survey_id": survey_id,
                "pass_fail_enabled": data.get("pass_fail_enabled", False),
                "pepperads_redirect_enabled": data.get("pepperads_redirect_enabled", False),
                "criteria_set_id": data.get("criteria_set_id"),
                "pepperads_offer_id": data.get("pepperads_offer_id"),
                "fail_page_config": data.get("fail_page_config", {
                    "fail_page_url": "/survey-thankyou",
                    "custom_message": "Thank you for your time!",
                    "show_retry_option": False
                }),
                "updated_at": datetime.utcnow()
            }
            
            # Upsert configuration
            result = db.survey_configurations.update_one(
                {"survey_id": survey_id},
                {"$set": config_data},
                upsert=True
            )
            
            if result.upserted_id:
                return jsonify({"message": "Configuration created", "survey_id": survey_id})
            else:
                return jsonify({"message": "Configuration updated", "survey_id": survey_id})
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/admin/criteria', methods=['GET', 'POST'])
def manage_criteria():
    """Manage pass/fail criteria sets"""
    
    if request.method == 'GET':
        try:
            # Get all criteria sets
            criteria_sets = list(db.pass_fail_criteria.find({"is_active": True}))
            
            # Convert ObjectIds to strings
            for criteria in criteria_sets:
                criteria["_id"] = str(criteria["_id"])
            
            return jsonify({"criteria_sets": criteria_sets})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            # Create new criteria set
            criteria_data = {
                "_id": str(uuid.uuid4()),
                "name": data.get("name", "New Criteria Set"),
                "description": data.get("description", ""),
                "criteria": data.get("criteria", []),
                "logic_type": data.get("logic_type", "all_required"),
                "passing_threshold": data.get("passing_threshold", 50.0),
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            db.pass_fail_criteria.insert_one(criteria_data)
            return jsonify({"message": "Criteria set created", "criteria_id": criteria_data["_id"]})
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/admin/criteria/<criteria_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_specific_criteria(criteria_id):
    """Manage specific criteria set"""
    
    if request.method == 'GET':
        try:
            criteria = db.pass_fail_criteria.find_one({"_id": criteria_id})
            if criteria:
                criteria["_id"] = str(criteria["_id"])
                return jsonify(criteria)
            else:
                return jsonify({"error": "Criteria not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            update_data = {
                "name": data.get("name"),
                "description": data.get("description"),
                "criteria": data.get("criteria"),
                "logic_type": data.get("logic_type"),
                "passing_threshold": data.get("passing_threshold"),
                "updated_at": datetime.utcnow()
            }
            
            # Remove None values
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            result = db.pass_fail_criteria.update_one(
                {"_id": criteria_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return jsonify({"error": "Criteria not found"}), 404
            
            return jsonify({"message": "Criteria updated"})
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            # Soft delete by setting is_active to False
            result = db.pass_fail_criteria.update_one(
                {"_id": criteria_id},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
            
            if result.matched_count == 0:
                return jsonify({"error": "Criteria not found"}), 404
            
            return jsonify({"message": "Criteria deleted"})
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/admin/survey/<survey_id>/questions', methods=['GET'])
def get_survey_questions_for_admin(survey_id):
    """Get survey questions for admin criteria configuration"""
    try:
        # Find the survey
        survey = db.surveys.find_one({
            "$or": [{"_id": survey_id}, {"id": survey_id}]
        })
        
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        # Extract questions with proper formatting for admin interface
        questions = survey.get("questions", [])
        formatted_questions = []
        
        for i, question in enumerate(questions):
            formatted_question = {
                "id": question.get("id", f"q{i+1}"),
                "question_text": question.get("question", ""),
                "type": question.get("type", "multiple_choice"),
                "options": question.get("options", []),
                "question_number": i + 1
            }
            formatted_questions.append(formatted_question)
        
        return jsonify({
            "survey_id": survey_id,
            "survey_name": survey.get("prompt", "Untitled Survey"),
            "questions": formatted_questions,
            "total_questions": len(formatted_questions)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/surveys-with-config', methods=['GET'])
def get_surveys_with_config():
    """Get all surveys with their pass/fail configuration"""
    try:
        # Get all surveys
        surveys = list(db.surveys.find().sort("created_at", -1))
        
        # Get all configurations
        configs = list(db.survey_configurations.find())
        config_map = {config["survey_id"]: config for config in configs}
        
        # Get all criteria sets
        criteria_sets = list(db.pass_fail_criteria.find({"is_active": True}))
        criteria_map = {criteria["_id"]: criteria for criteria in criteria_sets}
        
        # Combine data
        result = []
        for survey in surveys:
            survey_id = survey.get("_id") or survey.get("id")
            # Ensure survey_id is string for JSON serialization
            try:
                from bson import ObjectId as _OID
                if isinstance(survey_id, _OID):
                    survey_id = str(survey_id)
            except Exception:
                pass
            
            config = config_map.get(survey_id, {})
            criteria_set = None
            
            if config.get("criteria_set_id"):
                criteria_set = criteria_map.get(config["criteria_set_id"])
            
            # Convert any ObjectIds in nested docs to strings
            if config:
                config = convert_objectid_to_string(dict(config))
            if criteria_set:
                criteria_set = convert_objectid_to_string(dict(criteria_set))

            survey_data = {
                "survey_id": survey_id,
                "survey_name": survey.get("prompt", "Untitled Survey"),
                "created_at": survey.get("created_at"),
                "config": config,
                "criteria_set": criteria_set
            }
            result.append(survey_data)
        
        return jsonify({"surveys": result})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/global-config', methods=['GET', 'POST'])
def manage_global_config():
    """Manage global system configuration"""
    
    if request.method == 'GET':
        try:
            from pass_fail_schema import get_system_config
            config = get_system_config()
            return jsonify(config)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            from pass_fail_schema import update_system_config
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            success = update_system_config(data)
            if success:
                return jsonify({"message": "Global configuration updated"})
            else:
                return jsonify({"error": "Failed to update configuration"}), 500
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/admin/pepperads/offers', methods=['GET', 'POST'])
def manage_pepperads_offers():
    """List or create PepperAds offers (used for PASS redirects)"""
    try:
        if request.method == 'GET':
            offers_cursor = db.pepperads_offers.find()
            offers = []
            for offer in offers_cursor:
                offer = convert_objectid_to_string(dict(offer))
                offers.append({
                    "_id": offer.get("_id"),
                    "offer_name": offer.get("offer_name"),
                    "base_url": offer.get("base_url"),
                    "is_active": offer.get("is_active", False)
                })
            return jsonify({"offers": offers})

        # POST - create new offer
        data = request.get_json() or {}
        if not data.get("offer_name") or not data.get("base_url"):
            return jsonify({"error": "offer_name and base_url are required"}), 400
            
        offer_id = str(uuid.uuid4())
        offer_doc = {
            "_id": offer_id,
            "offer_name": data.get("offer_name"),
            "description": data.get("description", ""),
            "base_url": data.get("base_url"),
            "parameters": data.get("parameters", {
                "required_params": ["click_id", "user_id"],
                "optional_params": ["email", "survey_id", "username"],
                "parameter_mapping": {
                    "click_id": "click_id",
                    "user_id": "username",
                    "email": "email",
                    "survey_id": "survey_id"
                }
            }),
            "tracking": data.get("tracking", {
                "track_conversions": True,
                "conversion_value": 1.0,
                "currency": "USD"
            }),
            "is_active": data.get("is_active", True),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = db.pepperads_offers.insert_one(offer_doc)
        return jsonify({"message": "Offer created", "_id": offer_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/pepperads/offers/<offer_id>', methods=['PUT', 'DELETE'])
def update_delete_pepperads_offer(offer_id):
    """Update or delete a specific PepperAds offer"""
    try:
        if request.method == 'PUT':
            # Update existing offer
            data = request.get_json() or {}
            if not data.get("offer_name") or not data.get("base_url"):
                return jsonify({"error": "offer_name and base_url are required"}), 400
            
            # Check if offer exists
            existing_offer = db.pepperads_offers.find_one({"_id": offer_id})
            if not existing_offer:
                return jsonify({"error": "Offer not found"}), 404
            
            update_doc = {
                "offer_name": data.get("offer_name"),
                "description": data.get("description", ""),
                "base_url": data.get("base_url"),
                "is_active": data.get("is_active", True),
                "updated_at": datetime.utcnow()
            }
            
            # Preserve existing parameters and tracking if not provided
            if "parameters" in data:
                update_doc["parameters"] = data["parameters"]
            if "tracking" in data:
                update_doc["tracking"] = data["tracking"]
            
            db.pepperads_offers.update_one({"_id": offer_id}, {"$set": update_doc})
            return jsonify({"message": "Offer updated", "_id": offer_id})
            
        elif request.method == 'DELETE':
            # Delete offer
            result = db.pepperads_offers.delete_one({"_id": offer_id})
            if result.deleted_count == 0:
                return jsonify({"error": "Offer not found"}), 404
            
            # Also remove this offer from any survey configurations
            db.survey_configs.update_many(
                {"config.pepperads_offer_id": offer_id},
                {"$unset": {"config.pepperads_offer_id": ""}, "$set": {"config.pepperads_redirect_enabled": False}}
            )
            
            return jsonify({"message": "Offer deleted"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/survey/<survey_id>/generate-criteria', methods=['POST'])
def generate_dynamic_criteria(survey_id):
    """Generate dynamic criteria based on survey questions"""
    try:
        from evaluation_engine import SurveyEvaluationEngine
        
        # Find the survey
        survey = db.surveys.find_one({
            "$or": [{"_id": survey_id}, {"id": survey_id}]
        })
        
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        # Generate dynamic criteria
        engine = SurveyEvaluationEngine()
        dynamic_criteria = engine._create_dynamic_criteria_for_survey(survey)
        
        if not dynamic_criteria:
            return jsonify({"error": "Could not generate criteria for this survey"}), 400
        
        return jsonify({
            "message": "Dynamic criteria generated successfully",
            "criteria": dynamic_criteria
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/criteria/test', methods=['POST'])
def test_criteria():
    """Test criteria against sample responses"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        criteria_set = data.get("criteria_set")
        test_responses = data.get("responses")
        
        if not criteria_set or not test_responses:
            return jsonify({"error": "Both criteria_set and responses are required"}), 400
        
        from evaluation_engine import SurveyEvaluationEngine
        
        # Create a mock survey evaluation
        engine = SurveyEvaluationEngine()
        
        # Simulate evaluation with the provided criteria
        criteria_results = {}
        criteria_met = []
        criteria_failed = []
        total_weight = 0
        achieved_weight = 0
        
        for criterion in criteria_set["criteria"]:
            result = engine._evaluate_single_criterion(criterion, test_responses)
            criteria_results[criterion["id"]] = result
            
            weight = criterion.get("weight", 1.0)
            total_weight += weight
            
            if result["passed"]:
                criteria_met.append(criterion["id"])
                achieved_weight += weight
            else:
                criteria_failed.append(criterion["id"])
        
        # Determine overall result
        logic_type = criteria_set.get("logic_type", "all_required")
        overall_result = engine._determine_overall_result(
            logic_type, 
            criteria_results, 
            criteria_set, 
            achieved_weight, 
            total_weight
        )
        
        # Calculate score
        final_score = (achieved_weight / total_weight * 100) if total_weight > 0 else 0
        
        test_result = {
            "status": "pass" if overall_result else "fail",
            "score": round(final_score, 2),
            "criteria_met": criteria_met,
            "criteria_failed": criteria_failed,
            "details": {
                "criteria_results": criteria_results,
                "logic_type": logic_type,
                "total_criteria": len(criteria_set["criteria"]),
                "criteria_passed": len(criteria_met),
                "achieved_weight": achieved_weight,
                "total_weight": total_weight
            },
            "message": f"Test {'passed' if overall_result else 'failed'} based on {logic_type} logic"
        }
        
        return jsonify(test_result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/surveys/bulk-assign-criteria', methods=['POST'])
def bulk_assign_criteria():
    """Bulk assign criteria to multiple surveys"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        survey_ids = data.get("survey_ids", [])
        criteria_set_id = data.get("criteria_set_id")
        config_updates = data.get("config_updates", {})
        
        if not survey_ids or not criteria_set_id:
            return jsonify({"error": "survey_ids and criteria_set_id are required"}), 400
        
        # Verify criteria set exists
        criteria_set = db.pass_fail_criteria.find_one({
            "_id": criteria_set_id,
            "is_active": True
        })
        
        if not criteria_set:
            return jsonify({"error": "Criteria set not found"}), 404
        
        updated_surveys = []
        failed_surveys = []
        
        for survey_id in survey_ids:
            try:
                # Prepare configuration data
                config_data = {
                    "survey_id": survey_id,
                    "criteria_set_id": criteria_set_id,
                    "pass_fail_enabled": config_updates.get("pass_fail_enabled", True),
                    "pepperads_redirect_enabled": config_updates.get("pepperads_redirect_enabled", True),
                    "updated_at": datetime.utcnow()
                }
                
                # Add other config updates if provided
                if config_updates.get("pepperads_offer_id"):
                    config_data["pepperads_offer_id"] = config_updates["pepperads_offer_id"]
                
                if config_updates.get("fail_page_config"):
                    config_data["fail_page_config"] = config_updates["fail_page_config"]
                
                # Upsert configuration
                result = db.survey_configurations.update_one(
                    {"survey_id": survey_id},
                    {"$set": config_data},
                    upsert=True
                )
                
                updated_surveys.append(survey_id)
                
            except Exception as e:
                failed_surveys.append({"survey_id": survey_id, "error": str(e)})
        
        return jsonify({
            "message": f"Bulk assignment completed",
            "updated_surveys": len(updated_surveys),
            "failed_surveys": len(failed_surveys),
            "details": {
                "updated": updated_surveys,
                "failed": failed_surveys
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/survey/<survey_id>/preview-evaluation', methods=['POST'])
def preview_evaluation(survey_id):
    """Preview how evaluation would work with sample responses"""
    try:
        data = request.json
        sample_responses = data.get("responses", {})
        criteria_set_id = data.get("criteria_set_id")  # Optional, will use survey's configured criteria if not provided
        
        if not sample_responses:
            return jsonify({"error": "Sample responses are required"}), 400
        
        from evaluation_engine import evaluate_responses
        
        # Run evaluation preview
        evaluation_result = evaluate_responses(survey_id, sample_responses, criteria_set_id)
        
        return jsonify({
            "message": "Evaluation preview completed",
            "evaluation": evaluation_result,
            "sample_responses": sample_responses,
            "survey_id": survey_id
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/analytics/criteria-performance', methods=['GET'])
def get_criteria_performance():
    """Get analytics on criteria performance across surveys"""
    try:
        # Get all survey configurations with criteria
        configs = list(db.survey_configurations.find({"pass_fail_enabled": True}))
        
        # Get all responses with evaluations
        responses_with_eval = list(db.responses.find({"evaluation_result": {"$exists": True}}))
        
        # Aggregate stats
        criteria_stats = {}
        survey_stats = {}
        overall_stats = {
            "total_surveys_with_criteria": len(configs),
            "total_evaluated_responses": len(responses_with_eval),
            "pass_rate": 0,
            "fail_rate": 0
        }
        
        pass_count = 0
        fail_count = 0
        
        for response in responses_with_eval:
            survey_id = response.get("survey_id")
            evaluation = response.get("evaluation_result", {})
            status = evaluation.get("status", "unknown")
            
            if status == "pass":
                pass_count += 1
            elif status == "fail":
                fail_count += 1
            
            # Track per-survey stats
            if survey_id not in survey_stats:
                survey_stats[survey_id] = {
                    "total": 0,
                    "pass": 0,
                    "fail": 0,
                    "avg_score": 0
                }
            
            survey_stats[survey_id]["total"] += 1
            survey_stats[survey_id][status] += 1
            
            # Add to average score calculation
            score = evaluation.get("score", 0)
            survey_stats[survey_id]["avg_score"] = (
                (survey_stats[survey_id]["avg_score"] * (survey_stats[survey_id]["total"] - 1) + score) 
                / survey_stats[survey_id]["total"]
            )
        
        total_evaluated = pass_count + fail_count
        if total_evaluated > 0:
            overall_stats["pass_rate"] = round((pass_count / total_evaluated) * 100, 2)
            overall_stats["fail_rate"] = round((fail_count / total_evaluated) * 100, 2)
        
        # Calculate pass rates for each survey
        for survey_id, stats in survey_stats.items():
            if stats["total"] > 0:
                stats["pass_rate"] = round((stats["pass"] / stats["total"]) * 100, 2)
                stats["fail_rate"] = round((stats["fail"] / stats["total"]) * 100, 2)
                stats["avg_score"] = round(stats["avg_score"], 2)
        
        return jsonify({
            "overall_stats": overall_stats,
            "survey_stats": survey_stats,
            "criteria_stats": criteria_stats
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    try:
        app.run(host='127.0.0.1', port=5000, debug=True, threaded=True)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        print("Cleaning up...")
