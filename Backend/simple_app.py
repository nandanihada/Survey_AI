from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import google.generativeai as genai
import uuid
import json
import re
from datetime import datetime
import os

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Configure Gemini AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyCPeWGEIa7l9eeHD3grH3sOhOrWzFLzM_E")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash-latest")

def parse_survey_response(response_text):
    if not response_text:
        raise ValueError("Empty response text received")

    questions = []
    current_question = None

    try:
        lines = [line.strip() for line in response_text.split('\n') if line.strip()]

        for line in lines:
            question_match = re.match(r'^(\d+)\.\s*(.+?)(?:\s*\(([^)]+)\))?$', line)

            if question_match:
                if current_question:
                    if current_question.get("type") == "multiple_choice" and not current_question.get("options"):
                        current_question["options"] = ["Yes", "No"]
                    questions.append(current_question)

                question_num = question_match.group(1)
                question_text = question_match.group(2).strip().replace('*', '')
                question_type = (question_match.group(3) or "").lower().strip()

                if "multiple choice" in question_type or "mcq" in question_type:
                    normalized_type = "multiple_choice"
                elif "rating" in question_type or "scale" in question_type:
                    normalized_type = "rating"
                elif "yes" in question_type and "no" in question_type:
                    normalized_type = "yes_no"
                elif "short" in question_type or "answer" in question_type:
                    normalized_type = "short_answer"
                else:
                    normalized_type = "multiple_choice"

                current_question = {
                    "question": question_text,
                    "type": normalized_type,
                    "options": [] if normalized_type == "multiple_choice" else None
                }

            elif line.startswith(('A)', 'B)', 'C)', 'D)')) and current_question:
                if current_question.get("type") == "multiple_choice":
                    option_text = line[2:].strip()
                    current_question["options"].append(option_text)

        if current_question:
            if current_question.get("type") == "multiple_choice" and not current_question.get("options"):
                current_question["options"] = ["Yes", "No"]
            questions.append(current_question)

    except Exception as e:
        print(f"Error parsing survey response: {e}")
        raise ValueError(f"Failed to parse survey response: {str(e)}")

    return questions

@app.route('/generate', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def generate_survey():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        prompt = data.get("prompt", "").strip()
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        question_count = int(data.get("question_count", 10))
        template_type = data.get("template_type", "custom")
        theme = data.get("theme", {})

        # Simple AI prompt
        ai_prompt = f"""
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

        Important Rules:
        - Start each question with a number and period
        - Include the question type in parentheses
        - Multiple Choice = 4 options (A-D)
        - Yes/No = Only two options: A) Yes, B) No
        - Rating and Short Answer = No options needed

        Generate exactly {question_count} questions.
        """

        # Generate with Gemini
        response = model.generate_content(ai_prompt)
        
        if not response or not response.text:
            return jsonify({"error": "Failed to generate survey"}), 500

        raw_response = response.text.strip()
        questions = parse_survey_response(raw_response)

        if not questions:
            return jsonify({"error": "Failed to parse questions"}), 500

        # Create survey response
        survey_id = str(uuid.uuid4())
        survey_data = {
            "survey_id": survey_id,
            "prompt": prompt,
            "questions": questions,
            "theme": theme,
            "created_at": datetime.utcnow().isoformat(),
            "public_link": f"http://localhost:5173/survey/{survey_id}"
        }

        return jsonify({
            "message": "Survey generated successfully",
            "survey": survey_data
        })

    except Exception as e:
        print(f"Error in generate_survey: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == '__main__':
    print("Starting simple Flask server...")
    print(f"Using API key: {GOOGLE_API_KEY[:20]}...")
    app.run(host='127.0.0.1', port=5000, debug=True)
