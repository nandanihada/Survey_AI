"""
Analytics API for Survey Analytics Dashboard
Provides per-survey analytics, per-question breakdown, rushed/careful detection,
and AI summary generation.
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from pii_stripper import strip_pii_from_answers, strip_pii_from_prompt
from mongodb_config import db
from auth_middleware import requireAuth
import os
import requests as http_requests
import json

analytics_bp = Blueprint('analytics', __name__)

# Fixed threshold: < 3 seconds per question = rushed
RUSHED_THRESHOLD_SECONDS = 3.0


def get_user_surveys(user_id):
    """Get all surveys owned by a user"""
    surveys = list(db.surveys.find({
        "$or": [
            {"ownerUserId": user_id},
            {"owner_user_id": user_id},
            {"creator_uid": user_id}
        ]
    }))
    return surveys


def calculate_survey_stats(survey_id):
    """Calculate comprehensive stats for a survey"""
    responses = list(db.responses.find({"survey_id": survey_id}))
    
    total_responses = len(responses)
    if total_responses == 0:
        return {
            "total_responses": 0,
            "avg_completion_time": 0,
            "careful_count": 0,
            "rushed_count": 0,
            "rush_rate": 0
        }
    
    total_time = 0
    careful_count = 0
    rushed_count = 0
    responses_with_timing = 0
    
    for resp in responses:
        question_timings = resp.get("question_timings", {})
        
        if question_timings:
            responses_with_timing += 1
            total_question_time = sum(question_timings.values())
            total_time += total_question_time
            
            # A response is "rushed" if avg time per question < threshold
            avg_per_question = total_question_time / max(len(question_timings), 1)
            if avg_per_question < RUSHED_THRESHOLD_SECONDS:
                rushed_count += 1
            else:
                careful_count += 1
    
    avg_completion = round(total_time / max(responses_with_timing, 1), 1)
    rush_rate = round((rushed_count / max(responses_with_timing, 1)) * 100) if responses_with_timing > 0 else 0
    
    return {
        "total_responses": total_responses,
        "avg_completion_time": avg_completion,
        "careful_count": careful_count,
        "rushed_count": rushed_count,
        "rush_rate": rush_rate
    }


def get_question_breakdown(survey_id, survey):
    """Get per-question answer distribution and timing stats"""
    responses = list(db.responses.find({"survey_id": survey_id}))
    questions = survey.get("questions", [])
    
    breakdown = []
    
    for q_index, question in enumerate(questions):
        q_id = question.get("id", f"q{q_index}")
        q_text = question.get("question", f"Question {q_index + 1}")
        q_type = question.get("type", "text")
        q_options = question.get("options", [])
        
        # Collect answers and timings for this question
        answer_counts = {}
        timings = []
        careful_answers = {}
        rushed_answers = {}
        
        for resp in responses:
            resp_answers = resp.get("responses", {})
            question_timings = resp.get("question_timings", {})
            
            answer = resp_answers.get(q_id)
            if answer is not None and answer != "":
                answer_str = str(answer)
                answer_counts[answer_str] = answer_counts.get(answer_str, 0) + 1
                
                # Get timing for this question
                timing = question_timings.get(q_id)
                if timing is not None:
                    timings.append(timing)
                    
                    if timing < RUSHED_THRESHOLD_SECONDS:
                        rushed_answers[answer_str] = rushed_answers.get(answer_str, 0) + 1
                    else:
                        careful_answers[answer_str] = careful_answers.get(answer_str, 0) + 1
        
        # Calculate timing stats
        avg_time = round(sum(timings) / max(len(timings), 1), 1) if timings else 0
        median_time = round(sorted(timings)[len(timings) // 2], 1) if timings else 0
        min_time = round(min(timings), 1) if timings else 0
        max_time = round(max(timings), 1) if timings else 0
        careful_q = sum(1 for t in timings if t >= RUSHED_THRESHOLD_SECONDS)
        rushed_q = sum(1 for t in timings if t < RUSHED_THRESHOLD_SECONDS)
        
        # Sort answer counts by count descending
        sorted_answers = sorted(answer_counts.items(), key=lambda x: x[1], reverse=True)
        
        total_answers = sum(answer_counts.values())
        answer_distribution = []
        
        # Include ALL options from the question (even with 0 responses)
        if q_options:
            for opt in q_options:
                opt_str = str(opt)
                count = answer_counts.get(opt_str, 0)
                answer_distribution.append({
                    "answer": opt_str,
                    "count": count,
                    "percentage": round((count / total_answers) * 100) if total_answers > 0 else 0
                })
            # Also add any answers not in options (custom text answers)
            for ans, count in sorted_answers:
                if ans not in [str(o) for o in q_options]:
                    answer_distribution.append({
                        "answer": ans,
                        "count": count,
                        "percentage": round((count / total_answers) * 100) if total_answers > 0 else 0
                    })
        else:
            # No predefined options — use whatever was answered
            for ans, count in sorted_answers:
                answer_distribution.append({
                    "answer": ans,
                    "count": count,
                    "percentage": round((count / total_answers) * 100) if total_answers > 0 else 0
                })
        
        breakdown.append({
            "question_id": q_id,
            "question_text": q_text,
            "question_type": q_type,
            "options": q_options,
            "total_responses": total_answers,
            "answer_distribution": answer_distribution,
            "timing_stats": {
                "avg_time": avg_time,
                "median_time": median_time,
                "min_time": min_time,
                "max_time": max_time,
                "careful_count": careful_q,
                "rushed_count": rushed_q,
                "timings": timings  # Raw timings for distribution chart
            },
            "careful_answers": dict(sorted(careful_answers.items(), key=lambda x: x[1], reverse=True)),
            "rushed_answers": dict(sorted(rushed_answers.items(), key=lambda x: x[1], reverse=True))
        })
    
    return breakdown


def get_individual_responses(survey_id, survey):
    """Get individual response data for the responses table"""
    responses = list(db.responses.find({"survey_id": survey_id}))
    questions = survey.get("questions", [])
    
    individual = []
    
    for resp in responses:
        user_info = resp.get("user_info", {})
        question_timings = resp.get("question_timings", {})
        resp_answers = resp.get("responses", {})
        
        # Calculate total time and status per question
        per_question = []
        for q_index, question in enumerate(questions):
            q_id = question.get("id", f"q{q_index}")
            answer = resp_answers.get(q_id, "")
            timing = question_timings.get(q_id, None)
            
            status = "OK"
            if timing is not None and timing < RUSHED_THRESHOLD_SECONDS:
                status = "Rushed"
            
            per_question.append({
                "question_id": q_id,
                "answer": str(answer) if answer else "",
                "time": timing,
                "status": status
            })
        
        # Overall timing
        total_time = sum(question_timings.values()) if question_timings else None
        avg_time_per_q = round(total_time / max(len(question_timings), 1), 1) if question_timings else None
        
        overall_status = "OK"
        if avg_time_per_q is not None and avg_time_per_q < RUSHED_THRESHOLD_SECONDS:
            overall_status = "Rushed"
        
        individual.append({
            "response_id": resp.get("_id", resp.get("id", "")),
            "name": user_info.get("username", "Anonymous"),
            "email": user_info.get("email", ""),
            "submitted_at": resp.get("submitted_at", "").isoformat() if isinstance(resp.get("submitted_at"), datetime) else str(resp.get("submitted_at", "")),
            "ip_address": user_info.get("ip_address", ""),
            "user_agent": user_info.get("user_agent", ""),
            "device": detect_device(user_info.get("user_agent", "")),
            "location": resp.get("location") or user_info.get("location", "") or get_location_from_ip(user_info.get("ip_address", "")),
            "total_time": total_time,
            "avg_time_per_question": avg_time_per_q,
            "overall_status": overall_status,
            "per_question": per_question
        })
    
    return individual


def detect_device(user_agent):
    """Simple device detection from user agent"""
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    elif "tablet" in ua or "ipad" in ua:
        return "Tablet"
    return "Desktop"


def get_location_from_ip(ip_address):
    """Get approximate location from IP address"""
    if not ip_address or ip_address in ['unknown', '127.0.0.1', '::1', 'localhost']:
        return ""
    try:
        response = http_requests.get(f"http://ip-api.com/json/{ip_address}?fields=city,country", timeout=3)
        if response.status_code == 200:
            data = response.json()
            city = data.get("city", "")
            country = data.get("country", "")
            if city and country:
                return f"{city}, {country}"
            return country or city or ""
    except:
        pass
    return ""


def generate_ai_summary(question_text, answer_distribution, tier="free"):
    """Generate AI summary for a question's responses"""
    try:
        api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY")
        if not api_key:
            return generate_fallback_summary(question_text, answer_distribution)
        
        # Build prompt based on tier
        answers_text = "\n".join([
            f"- {strip_pii_from_answers(item['answer'])}: {item['percentage']}% ({item['count']} responses)"
            for item in answer_distribution[:10]
        ])
        
        if tier == "free":
            prompt = f"""One short sentence summarizing this survey data (under 20 words):

Question: {question_text}
Top answers: {answers_text}

One sentence only:"""
        else:
            prompt = f"""Two short sentences about this survey data (under 30 words total):

Question: {question_text}
Top answers: {answers_text}

Two sentences max:"""
        
        response = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 50,
                "temperature": 0.7
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            return generate_fallback_summary(question_text, answer_distribution)
    except Exception as e:
        print(f"AI Summary error: {e}")
        return generate_fallback_summary(question_text, answer_distribution)


def generate_fallback_summary(question_text, answer_distribution):
    """Generate a simple short summary without AI"""
    if not answer_distribution:
        return "No responses yet."
    
    top = answer_distribution[0]
    if len(answer_distribution) > 1:
        second = answer_distribution[1]
        return f"{top['answer']} leads ({top['percentage']}%), {second['answer']} follows ({second['percentage']}%)."
    return f"{top['answer']} — {top['percentage']}% of responses."


def generate_careful_rushed_insights(question_text, careful_answers, rushed_answers):
    """Generate AI insights for careful vs rushed respondents"""
    try:
        api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY")
        if not api_key:
            return {
                "careful_insight": "Careful respondents show more thoughtful, varied answers.",
                "rushed_insight": "Rushed respondents tend to pick familiar, top-of-mind options."
            }
        
        careful_text = "\n".join([f"- {strip_pii_from_answers(k)}: {v}" for k, v in list(careful_answers.items())[:5]])
        rushed_text = "\n".join([f"- {strip_pii_from_answers(k)}: {v}" for k, v in list(rushed_answers.items())[:5]])
        
        prompt = f"""For this survey question, compare the answer patterns between careful respondents (who took time) and rushed respondents (who answered quickly).

Question: {question_text}

Careful respondents chose:
{careful_text}

Rushed respondents chose:
{rushed_text}

Provide two separate insights:
1. CAREFUL: One sentence about what careful respondents prefer and why.
2. RUSHED: One sentence about what rushed respondents prefer and why."""
        
        response = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200,
                "temperature": 0.7
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            
            # Try to split into careful/rushed
            lines = content.split("\n")
            careful_insight = ""
            rushed_insight = ""
            for line in lines:
                if "careful" in line.lower() or "1." in line:
                    careful_insight = line.replace("1.", "").replace("CAREFUL:", "").strip()
                elif "rushed" in line.lower() or "2." in line:
                    rushed_insight = line.replace("2.", "").replace("RUSHED:", "").strip()
            
            return {
                "careful_insight": careful_insight or content[:len(content)//2],
                "rushed_insight": rushed_insight or content[len(content)//2:]
            }
        
        return {
            "careful_insight": "Careful respondents show more thoughtful, varied answers.",
            "rushed_insight": "Rushed respondents tend to pick familiar, top-of-mind options."
        }
    except Exception as e:
        print(f"AI Insight error: {e}")
        return {
            "careful_insight": "Careful respondents show more thoughtful, varied answers.",
            "rushed_insight": "Rushed respondents tend to pick familiar, top-of-mind options."
        }


# ============ API ROUTES ============

@analytics_bp.route('/api/analytics/surveys', methods=['GET'])
@requireAuth
def get_user_surveys_list():
    """Get list of all surveys for the current user with basic stats"""
    try:
        user = g.current_user
        user_id = str(user['_id'])
        user_email = user.get('email', '')
        user_role = user.get('role', 'basic')
        
        # Admin can see ALL surveys
        if user_role == 'admin':
            surveys = list(db.surveys.find().sort('created_at', -1))
        else:
            # Match the same query pattern as survey_routes.py
            or_conditions = [
                {'ownerUserId': user_id},
                {'user_id': user_id},
                {'created_by.user_id': user_id},
            ]
            if user_email:
                or_conditions.append({'creator_email': user_email})
                or_conditions.append({'created_by.email': user_email})
            
            surveys = list(db.surveys.find({'$or': or_conditions}).sort('created_at', -1))
        
        survey_list = []
        for survey in surveys:
            # Use short_id as the primary ID since that's what responses reference
            survey_id = survey.get("short_id") or survey.get("id") or str(survey.get("_id", ""))
            
            # Get response count - try multiple ID formats
            response_count = db.responses.count_documents({"survey_id": survey_id})
            if response_count == 0:
                # Try with string _id
                alt_id = str(survey.get("_id", ""))
                response_count = db.responses.count_documents({"survey_id": alt_id})
                if response_count > 0:
                    survey_id = alt_id
            
            survey_list.append({
                "id": survey_id,
                "title": survey.get("title", survey.get("name", "Untitled Survey")),
                "status": survey.get("status", "active"),
                "created_at": str(survey.get("created_at", survey.get("createdAt", ""))),
                "total_responses": response_count,
                "total_questions": len(survey.get("questions", [])),
                "description": survey.get("description", "")
            })
        
        return jsonify({"surveys": survey_list})
    except Exception as e:
        print(f"Error fetching user surveys: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@analytics_bp.route('/api/analytics/survey/<survey_id>', methods=['GET'])
@requireAuth
def get_survey_analytics(survey_id):
    """Get full analytics for a specific survey"""
    try:
        # Find survey by short_id, _id, or id field
        survey = db.surveys.find_one({
            "$or": [
                {"short_id": survey_id},
                {"_id": survey_id},
                {"id": survey_id}
            ]
        })
        
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        # Calculate stats
        stats = calculate_survey_stats(survey_id)
        
        # Get question breakdown
        question_breakdown = get_question_breakdown(survey_id, survey)
        
        return jsonify({
            "survey_id": survey_id,
            "title": survey.get("title", survey.get("name", "Untitled Survey")),
            "description": survey.get("description", ""),
            "created_at": str(survey.get("created_at", survey.get("createdAt", ""))),
            "stats": stats,
            "question_breakdown": question_breakdown
        })
    except Exception as e:
        print(f"Error fetching survey analytics: {e}")
        return jsonify({"error": str(e)}), 500


@analytics_bp.route('/api/analytics/survey/<survey_id>/individual', methods=['GET'])
@requireAuth
def get_survey_individual_responses(survey_id):
    """Get individual responses for a survey (tier-gated on frontend)"""
    try:
        survey = db.surveys.find_one({
            "$or": [
                {"short_id": survey_id},
                {"_id": survey_id},
                {"id": survey_id}
            ]
        })
        
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        individual = get_individual_responses(survey_id, survey)
        
        return jsonify({
            "survey_id": survey_id,
            "total": len(individual),
            "responses": individual
        })
    except Exception as e:
        print(f"Error fetching individual responses: {e}")
        return jsonify({"error": str(e)}), 500


@analytics_bp.route('/api/analytics/survey/<survey_id>/ai-summary', methods=['POST'])
@requireAuth
def get_ai_summary(survey_id):
    """Generate AI summary for a question"""
    try:
        data = request.get_json()
        question_text = data.get("question_text", "")
        answer_distribution = data.get("answer_distribution", [])
        tier = data.get("tier", "free")
        
        summary = generate_ai_summary(question_text, answer_distribution, tier)
        
        result = {"summary": summary}
        
        # For premium+ tiers, also generate careful/rushed insights
        if tier in ["premium", "enterprise"]:
            careful_answers = data.get("careful_answers", {})
            rushed_answers = data.get("rushed_answers", {})
            
            if careful_answers or rushed_answers:
                insights = generate_careful_rushed_insights(
                    question_text, careful_answers, rushed_answers
                )
                result["careful_insight"] = insights["careful_insight"]
                result["rushed_insight"] = insights["rushed_insight"]
        
        return jsonify(result)
    except Exception as e:
        print(f"Error generating AI summary: {e}")
        return jsonify({"error": str(e)}), 500
