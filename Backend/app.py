from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import uuid
import json
import re
from datetime import datetime
import threading
import os
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from integrations import forward_survey_data_to_partners
from postback_handler import postback_bp
from mongodb_config import db
from bson import ObjectId

if os.getenv("FLASK_ENV") == "development":
    BASE_URL = "http://127.0.0.1:5000"
else:
    BASE_URL = "https://pepper-flask-app.onrender.com"

app = Flask(__name__)
CORS(app) 


@app.before_request
def log_request_info():
    print("Received request:", request.method, request.path)
    print("Headers:", dict(request.headers))


# Gemini API Configuration
genai.configure(api_key="AIzaSyAxEoutxU_w1OamJUe4FMOzr5ZdUyz8R4k")
model = genai.GenerativeModel("gemini-1.5-flash-latest")
response = model.generate_content("Hello, how are you?")
print(response.text)

# Register blueprint after MongoDB initialization
app.register_blueprint(postback_bp)


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

@app.route('/generate', methods=['POST'])
def generate_survey():
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

        # Extract and validate required fields
        prompt = data.get("prompt", "").strip()
        if not prompt:
            return jsonify({"error": "Prompt is required and cannot be empty"}), 400

        # Get question count
        try:
            question_count = int(data.get("question_count", 10))
            if question_count < 1 or question_count > 50:
                return jsonify({"error": "Question count must be between 1 and 50"}), 400
        except ValueError:
            return jsonify({"error": "Invalid question count"}), 400

        response_type = data.get("response_type", "multiple_choice")
        template_type = data.get("template_type", "customer_feedback")
        theme = data.get("theme") or {}

        # Define prompt templates with the current question_count and prompt
        prompt_templates = {
            "customer_feedback": f"""
            Generate exactly 10 survey questions for customer feedback about "{prompt}".

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

            Distribution:
            - 3 Multiple Choice questions  
            - 2 Rating questions  
            - 2 Yes/No questions  
            - 2 Short Answer questions  
            - 1 Opinion Scale question

            Do not include any explanation — only return the 10 formatted questions in order.
            """
            ,

            "default": f"""
                                 Generate exactly 10 survey questions about "{prompt}".

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
                if attempt == max_retries - 1:
                    raise ValueError(f"Failed after {max_retries} attempts: {str(last_error)}")
         # your backend
        FRONTEND_URL = "http://localhost:5173"  # your new React frontend
        # Create and save survey document
        try:
            survey_id = str(uuid.uuid4())
            survey_data = {
                "_id": survey_id,
                "id": survey_id,
                "prompt": prompt,
                "response_type": response_type,
                "template_type": template_type,
                "questions": questions,
                "theme": complete_theme,
                "created_at": datetime.utcnow(),
                 "shareable_link": f"{BASE_URL}/survey/{survey_id}/respond",
                 "public_link": f"{FRONTEND_URL}/survey/{survey_id}"
            }

            # Save to database without timeout parameter
            db["surveys"].insert_one(survey_data)

            return jsonify({
                "survey_id": survey_id,
                "questions": questions,
                "template_type": template_type,
                "theme": complete_theme
            })

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
                "template_type": template_type,
                "raw_ai_output": raw_response[:300] if raw_response else None
            }
        }), 500


@app.route('/survey/<survey_id>/respond', methods=['POST'])
def submit_public_response(survey_id):
    print(f"\n=== SURVEY RESPONSE SUBMISSION DEBUG ===")
    print(f"Survey ID received: {survey_id}")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")

    # Check if request has JSON data
    if not request.is_json:
        print("ERROR: Request is not JSON")
        return jsonify({"error": "Content-Type must be application/json"}), 400

    data = request.json
    print(f"Raw request data: {data}")

    responses = data.get("responses")
    tracking_id = data.get("tracking_id")
    email = data.get("email")
    username = data.get("username")

    print(f"Parsed responses: {responses}")
    print(f"Parsed email: {email}")
    print(f"Parsed username: {username}")

    if not responses:
        print("ERROR: No responses provided")
        return jsonify({"error": "Responses required"}), 400

    try:
        # Check if survey exists - IMPORTANT: Check both _id and id fields
        print(f"Looking for survey with ID: {survey_id}")

        # Try both _id and id fields
        survey = db["surveys"].find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})

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

        # Forward to partners (optional)
        try:
            forward_success = forward_survey_data_to_partners(response_data)
            if not forward_success:
                print("WARNING: Survey forwarding failed (SurveyTitans)")
        except Exception as forward_error:
            print(f"WARNING: Partner forwarding error: {forward_error}")

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



if __name__ == '__main__':
    app.run()