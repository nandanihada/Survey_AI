from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import uuid
import json
import re
from datetime import datetime
import threading
import os
from integrations import forward_survey_data_to_partners
from postback_handler import postback_bp
from mongodb_config import db
from bson import ObjectId

if os.getenv("FLASK_ENV") == "development":
    BASE_URL = "http://127.0.0.1:5000"
else:
    BASE_URL = "https://survey-ai-033z.onrender.com"

app = Flask(__name__)
CORS(app)
# CORS(app, origins=[
#     "https://pepperadsresponses.web.app",
#     "https://pepperadsresponses.firebaseapp.com",
#     "http://127.0.0.1:5501"
# ],
#      allow_headers=["Content-Type", "Authorization"],
#      supports_credentials=True,
#      methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
#      )


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
    questions = []
    lines = response_text.strip().split('\n')
    current_question = None

    for line in lines:
        line = line.strip()

        # Detect new question
        if re.match(r"^\d+\.\s", line):
            if current_question:
                questions.append(current_question)
            current_question = {
                "question": re.sub(r"^\d+\.\s*", "", line),
                "options": []
            }

        # Detect options A) to D)
        elif re.match(r"^[A-D]\)", line) and current_question:
            option = re.sub(r"^[A-D]\)\s*", "", line)
            current_question["options"].append(option)

    if current_question and len(current_question["options"]) == 4:
        questions.append(current_question)

    # Filter only valid complete questions
    questions = [q for q in questions if len(q["options"]) == 4]

    return questions


@app.route('/generate', methods=['POST'])
def generate_survey():
    data = request.get_json()

    prompt = data.get("prompt", "")
    response_type = data.get("response_type", "multiple_choice")

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        ai_prompt = f"""
        Generate exactly 10 multiple-choice survey questions about "{prompt}".
        Each question should be formatted exactly like this:

        1. What is your favorite color?
        A) Red
        B) Blue
        C) Green
        D) Yellow

        No explanations. No introduction or closing. Just 10 questions with 4 options each.
        """

        response = model.generate_content(ai_prompt)
        if not response.text:
            raise ValueError("Gemini returned empty response")

        print("Raw Gemini response:\n", response.text)

        questions = parse_survey_response(response.text)

        if not questions or len(questions) < 5:
            raise ValueError("Failed to parse enough valid questions from AI response")

        survey_id = str(uuid.uuid4())
        survey_data = {
            "_id": survey_id,
            "id": survey_id,
            "prompt": prompt,
            "response_type": response_type,
            "questions": questions,
            "created_at": datetime.utcnow(),
            "shareable_link": f"{BASE_URL}/survey/{survey_id}/respond"
        }
        try:
            db["surveys"].insert_one(survey_data)
            return jsonify({"survey_id": survey_id, "questions": questions})  # ✅ Success response
        except Exception as mongodb_error:
            print("❌ MongoDB write failed:", mongodb_error)
            return jsonify({"error": "Failed to save survey"}), 500  # ✅ Error fallback

    except Exception as e:
        print(f"Survey generation error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/submit', methods=['POST'])
def submit_response():
    data = request.json
    survey_id = data.get("survey_id")
    responses = data.get("responses")
    tracking_id = data.get("tracking_id")
    email = data.get("email")
    username = data.get("username")

    if not survey_id or not responses:
        return jsonify({"error": "Survey ID and responses required"}), 400

    try:
        # Check if survey exists
        survey = db["surveys"].find_one({"_id": survey_id})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404

        response_id = str(uuid.uuid4())
        response_data = {
            "_id": response_id,
            "id": response_id,
            "survey_id": survey_id,
            "responses": responses,
            "submitted_at": datetime.utcnow(),
            "status": "submitted"
        }
        if email:
            response_data["email"] = email
        if username:
            response_data["username"] = username
        if tracking_id:
            response_data["tracking_id"] = tracking_id

        db["survey_responses"].insert_one(response_data)
        
        if tracking_id:
            # Check if tracking document exists and update it
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
                print(f"Tracking ID {tracking_id} marked as submitted")
            else:
                print(f"Tracking ID {tracking_id} not found")

        forward_survey_data_to_partners(response_data)

        return jsonify({"message": "Response submitted and pending verification", "response_id": response_id})

    except Exception as e:
        print(f"Response submission error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/track/survey/open', methods=['POST'])
def track_survey_open():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON request"}), 400

    survey_id = data.get('survey_id')
    username = data.get('username')
    email = data.get('email')

    if not survey_id:
        return jsonify({"error": "Survey ID is required"}), 400

    try:
        tracking_id = str(uuid.uuid4())
        tracking_data = {
            "_id": tracking_id,
            "survey_id": survey_id,
            "tracking_id": tracking_id,
            "opened_at": datetime.utcnow(),
            "submitted": False,
            "user_agent": request.headers.get('User-Agent', 'Unknown'),
            "ip_address": request.remote_addr,
            "email": email,
            "username": username
        }
        try:
            db["survey_tracking"].insert_one(tracking_data)
            return jsonify({"tracking_id": tracking_id, "message": "Survey opening tracked successfully"})
        except Exception as e:
            app.logger.error(f"Survey tracking error: {e}")  # Log error in Flask
            return jsonify({"error": "Failed to save tracking data"}), 500

    except Exception as e:
        print(f"Survey tracking error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/survey/<survey_id>', methods=['GET'])
def get_survey(survey_id):
    try:
        survey = db["surveys"].find_one({"_id": survey_id})

        if survey:
            tracking_id = str(uuid.uuid4())
            tracking_data = {
                "_id": tracking_id,
                "survey_id": survey_id,
                "tracking_id": tracking_id,
                "opened_at": datetime.utcnow(),
                "submitted": False,
                "user_agent": request.headers.get('User-Agent', 'Unknown'),
                "ip_address": request.remote_addr
            }
            db["survey_tracking"].insert_one(tracking_data)

            survey_data = convert_objectid_to_string(survey)
            survey_data["tracking_id"] = tracking_id

            return jsonify(survey_data)
        else:
            return jsonify({"error": "Survey not found"}), 404

    except Exception as e:
        print(f"Survey fetch error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/survey/<survey_id>/respond', methods=['POST'])
def submit_public_response(survey_id):
    data = request.json
    responses = data.get("responses")
    tracking_id = data.get("tracking_id")
    email = data.get("email")
    username = data.get("username")

    if not responses:
        return jsonify({"error": "Responses required"}), 400

    try:
        # Check if survey exists
        survey = db["surveys"].find_one({"_id": survey_id})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404

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

        db["survey_responses"].insert_one(response_data)
        forward_success = forward_survey_data_to_partners(response_data)
        if not forward_success:
            print("Survey forwarding failed (SurveyTitans)")

        if tracking_id:
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

        return jsonify({"message": "Response submitted successfully", "response_id": response_id})

    except Exception as e:
        print(f"Public response submission error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/insights', methods=['POST'])
def generate_insights():
    data = request.json
    survey_id = data.get("survey_id")

    if not survey_id:
        return jsonify({"error": "Survey ID is required"}), 400

    try:
        # Find all responses for this survey
        responses_cursor = db["survey_responses"].find({"survey_id": survey_id})
        
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
        # Get email and username from query params
        email = request.args.get("email")
        username = request.args.get("username")

        # Track click only if both values are present
        if email and username:
            click_data = {
                "email": email,
                "username": username,
                "survey_id": survey_id,
                "clicked_at": datetime.utcnow()
            }
            db["survey_clicks"].insert_one(click_data)
            print(f"Click tracked: {username} ({email}) on survey {survey_id}")

        # Get the survey
        survey = db["surveys"].find_one({"_id": survey_id})

        if not survey:
            return jsonify({"error": "Survey not found"}), 404

        survey_data = convert_objectid_to_string(survey)

        # Get all responses for this survey
        responses_cursor = db["survey_responses"].find({"survey_id": survey_id})
        response_list = [convert_objectid_to_string(resp) for resp in responses_cursor]

        return jsonify({"survey": survey_data, "responses": response_list})

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


if __name__ == '__main__':
    app.run()