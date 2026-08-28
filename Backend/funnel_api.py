"""
Funnel API
Handles funnel creation (AI-powered), funnel session management,
screening survey submissions, and job survey cascade routing.
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from datetime import datetime, timezone
from bson import ObjectId
from mongodb_config import db
from auth_middleware import requireAuth
from funnel_scoring_engine import (
    process_screening_survey_submission,
    process_job_survey_submission,
    build_job_queue,
    accumulate_scores
)
import os
import json
import uuid
import requests as http_requests

funnel_bp = Blueprint("funnel_bp", __name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://dashboard.pepperwahl.com",
    "https://pepperwahl.com",
    "https://survey.pepperwahl.com",
]


def _str(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialisation."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ═══════════════════════════════════════════════════════
#  STEP 1 — ANALYZE FUNNEL PROMPT (AI deep analysis)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/analyze-prompt", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def analyze_funnel_prompt():
    """
    Takes a free-text funnel description, does deep AI analysis,
    and returns either:
      a) clarifying_questions (if anything is ambiguous)
      b) funnel_plan (structured preview for user to confirm)
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    prompt = data.get("prompt", "").strip()
    clarification_answers = data.get("clarification_answers", {})

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "AI service not configured"}), 503

    # Build the analysis prompt
    clarification_context = ""
    if clarification_answers:
        lines = [f"  - {k}: {v}" for k, v in clarification_answers.items()]
        clarification_context = "\nUser's clarification answers:\n" + "\n".join(lines)

    # ── Extract explicit count hints from the prompt before sending to AI ──
    import re as _re
    _screening_count_match = _re.search(
        r'(\d+)\s*screening\s+surve(?:y|ys)',
        prompt, _re.IGNORECASE
    )
    _explicit_screening_count = int(_screening_count_match.group(1)) if _screening_count_match else None

    _layer2_count_match = _re.search(
        r'(\d+)\s*(?:layer\s*2|destination|job|offer|product)\s+surve(?:y|ys)',
        prompt, _re.IGNORECASE
    )
    _explicit_layer2_count = int(_layer2_count_match.group(1)) if _layer2_count_match else None

    explicit_counts_note = ""
    if _explicit_screening_count or _explicit_layer2_count:
        parts = []
        if _explicit_screening_count:
            parts.append(f"{_explicit_screening_count} screening surveys")
        if _explicit_layer2_count:
            parts.append(f"{_explicit_layer2_count} destination/job surveys")
        explicit_counts_note = (
            f"\n⚠️  MANDATORY COUNT OVERRIDE — The user's prompt explicitly requests: {', '.join(parts)}. "
            f"You MUST produce exactly those counts in screening_surveys and job_profiles respectively. "
            f"Do NOT reduce, round, or ignore these numbers.\n"
        )

    system_prompt = """You are an expert survey funnel architect who can design any type of multi-survey funnel.
You understand ALL funnel types:
- Job/candidate screening (route candidates to best-fit roles)
- Product recommendation (match users to best product/service)
- Lead qualification (score leads for sales teams)
- Course/program matching (recommend training paths)
- Insurance/financial product matching
- Market research with branching
- Any prompt describing layers, branches, redirections, or multi-path surveys

Your job: deeply understand the user's intent, extract the structure, and produce a clean plan.
NEVER assume it must be a job funnel or a finance funnel. Read what the prompt actually says.
The topic of the surveys must match the topic in the user's prompt exactly."""

    analysis_prompt = f"""Analyze this funnel requirement and produce a structured plan.

USER PROMPT:
"{prompt}"
{clarification_context}
{explicit_counts_note}
STEP 1 — UNDERSTAND THE FUNNEL TYPE
Read the prompt carefully. Identify:
- What is the ACTUAL TOPIC? (e.g. cooking, fitness, travel, software, education — whatever the user said)
- What is the overall GOAL? (job screening / product discovery / lead gen / course matching / other)
- What are the SCREENING SURVEYS? (surveys everyone goes through first to build a profile)
- What are the DESTINATION SURVEYS? (surveys shown to specific users based on their profile)
- Are there HARD TERMINATION conditions? (certain answers disqualify the user entirely)
- Can users qualify for MULTIPLE destinations? (cascade on fail, or show multiple)

CRITICAL TOPIC RULE:
The screening surveys and destination surveys MUST be about the topic described in the user's prompt.
If the user says "cooking survey funnel" → all surveys must be about cooking.
If the user says "fitness coaching" → all surveys must be about fitness.
If the user says "travel recommendations" → all surveys must be about travel.
NEVER generate surveys about loans, jobs, insurance, or finance unless the user's prompt is about those topics.

STEP 2 — RESPECT EXPLICIT COUNTS
If the user's prompt says "X screening surveys" → produce exactly X items in screening_surveys.
If the user's prompt says "Y destination/layer-2 surveys" → produce exactly Y items in job_profiles.
Do not reduce these counts because you think fewer would suffice. Honour what the user asked for.

STEP 3 — RETURN THE PLAN
If anything is critically unclear (not just unfamiliar), ask up to 3 clarifying questions.
Otherwise return the full funnel_plan immediately.

FUNNEL TYPES AND HOW TO MAP THEM:
- "Job screening" → screening_surveys collect background, job_profiles are the job roles
- "Product recommendation" → screening_surveys collect user profile/pain points, job_profiles are the products to match
- "Lead qualification" → screening_surveys collect interest/fit signals, job_profiles are the lead tiers or product branches
- "Course/program matching" → screening_surveys assess skill level/goals, job_profiles are the programs
- "Detailed survey with layers and branches" → group the questions into logical screening surveys by layer, identify the branch destinations as job_profiles

KEY INSIGHT: "job_profiles" in the plan doesn't mean only jobs.
It means ANY destination the user gets routed to — products, services, programs, offers, roles, anything.
The id can be a product name, a tier, a role, anything meaningful.

ALWAYS return valid JSON in EXACTLY this format.

If clarification needed (only if truly ambiguous):
{{
  "type": "clarification",
  "questions": [
    {{"id": "q1", "question": "Can a user qualify for multiple destinations, or just the best match?", "options": ["Multiple (cascade on fail)", "Only best match"]}},
    {{"id": "q2", "question": "Should any answer disqualify someone entirely?", "options": ["Yes", "No, everyone gets routed somewhere"]}}
  ]
}}

If ready to plan (preferred — be decisive):
{{
  "type": "funnel_plan",
  "funnel_name": "Name describing the funnel purpose",
  "funnel_type": "job_screening | product_recommendation | lead_qualification | course_matching | general",
  "goal": "One sentence describing what this funnel does and for whom",
  "screening_surveys": [
    {{
      "index": 0,
      "name": "Survey name reflecting the ACTUAL topic from the user's prompt",
      "purpose": "What this survey collects and why — must relate to the user's topic",
      "estimated_questions": 8,
      "key_topics": ["Topic 1 about the user's actual subject", "Topic 2", "Topic 3"],
      "has_termination": true,
      "termination_condition": "Describe hard disqualifier or null"
    }}
  ],
  "job_profiles": [
    {{
      "id": "unique_id_no_spaces",
      "display_name": "Human-readable name (product, role, tier, program) — must match user's topic",
      "match_criteria": "What profile qualifies for this destination — be specific to the user's domain",
      "estimated_survey_questions": 8,
      "key_topics": ["What this destination survey will test/ask — specific to user's topic"],
      "qualification_flag": "Any special must-have requirement, or null"
    }}
  ],
  "scoring_logic": "Explain how screening answers map to destinations (points, branch conditions, etc.)",
  "termination_conditions": ["List any hard disqualifiers, or leave empty"],
  "tiebreaker": "What happens when scores tie or multiple destinations qualify",
  "estimated_total_surveys": 4,
  "estimated_total_questions": 40
}}

EXAMPLES OF WHAT TO DO WITH COMPLEX PROMPTS:

Example 1 — Detailed layer-by-layer prompt with branching:
User pastes a document with LAYER 1/2/3/4, branch conditions, redirections.
→ Group LAYER 1, LAYER 2, LAYER 3 into screening_surveys (index 0, 1, 2)
→ Each branch destination becomes a job_profile with names matching the user's topic
→ The "branch conditions" become the scoring_logic
→ Any "TERMINATE" or "disqualify" conditions become termination_conditions
→ Return the plan — don't ask questions unless truly impossible to understand

Example 2 — Explicit count in prompt:
"I want 6 screening surveys and 10 destination surveys about cooking styles"
→ MUST produce 6 items in screening_surveys and 10 items in job_profiles
→ All surveys must be about cooking — never about loans, jobs, or finance

Example 3 — Short vague prompt:
"I want to match people to the right fitness program"
→ This is clear enough. Generate 1-2 screening surveys about fitness goals/level
→ Destination surveys are about fitness programs, not unrelated products

NOW ANALYZE THE USER'S PROMPT ABOVE AND RETURN THE PLAN."""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=30,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": analysis_prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"}
            }
        )

        if resp.status_code != 200:
            return jsonify({"error": f"AI error: {resp.status_code}"}), 502

        content = resp.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
        return jsonify(result), 200

    except Exception as e:
        import traceback
        print(f"❌ analyze_funnel_prompt error: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  STEP 2 — GENERATE FULL FUNNEL (all surveys + scoring)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/generate", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def generate_funnel():
    """
    Kicks off funnel generation in a background thread.
    Returns immediately with a job_id.
    Frontend polls /api/funnels/generate-status/<job_id> for progress.
    This bypasses Render's 60-second proxy timeout.
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    funnel_plan = data.get("funnel_plan")
    original_prompt = data.get("original_prompt", "")
    anchor_config = data.get("anchor_config")  # optional anchor question config

    if not funnel_plan:
        return jsonify({"error": "funnel_plan is required"}), 400

    current_user = g.current_user
    owner_user_id = str(current_user.get("_id", ""))

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "AI service not configured"}), 503

    job_id = f"fgen_{uuid.uuid4().hex[:12]}"

    # Save initial job status to DB
    db.funnel_generation_jobs.insert_one({
        "job_id": job_id,
        "status": "running",
        "progress": 0,
        "current_step": "Starting generation...",
        "generated_surveys": [],
        "funnel_id": None,
        "errors": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Run generation in background thread so we return immediately
    import threading
    thread = threading.Thread(
        target=_run_funnel_generation_bg,
        args=(job_id, funnel_plan, original_prompt, owner_user_id, api_key, anchor_config),
        daemon=True
    )
    thread.start()

    return jsonify({"job_id": job_id, "status": "running"}), 202


def _run_funnel_generation_bg(job_id, funnel_plan, original_prompt, owner_user_id, api_key, anchor_config=None):
    """Runs the actual funnel generation in a background thread. Updates DB with progress."""

    def update_job(status=None, progress=None, step=None, surveys=None, funnel_id=None, errors=None):
        patch = {}
        if status: patch["status"] = status
        if progress is not None: patch["progress"] = progress
        if step: patch["current_step"] = step
        if surveys is not None: patch["generated_surveys"] = surveys
        if funnel_id: patch["funnel_id"] = funnel_id
        if errors is not None: patch["errors"] = errors
        if patch:
            db.funnel_generation_jobs.update_one({"job_id": job_id}, {"$set": patch})

    try:
        funnel_id = f"fnl_{uuid.uuid4().hex[:10]}"
        generated_surveys = []
        errors = []
        questions_asked_so_far: list = []

        total_surveys = len(funnel_plan.get("screening_surveys", [])) + len(funnel_plan.get("job_profiles", []))
        done = 0

        # ── Screening surveys ──
        screening_survey_ids = []
        router_survey_ids = []   # surveys that contain the anchor question
        for s_meta in funnel_plan.get("screening_surveys", []):
            update_job(step=f"Generating: {s_meta['name']}...", progress=int(done / max(total_surveys, 1) * 80))
            try:
                survey_doc = _generate_single_survey(
                    api_key=api_key,
                    survey_name=s_meta["name"],
                    survey_purpose=s_meta["purpose"],
                    key_topics=s_meta.get("key_topics", []),
                    survey_type="screening",
                    funnel_plan=funnel_plan,
                    owner_user_id=owner_user_id,
                    funnel_id=funnel_id,
                    layer_index=s_meta["index"],
                    original_prompt=original_prompt,
                    questions_asked_so_far=questions_asked_so_far
                )
                for q in survey_doc.get("questions", []):
                    if isinstance(q, dict):  # guard: skip any non-dict items saved by AI
                        questions_asked_so_far.append({"topic": q.get("question", "")[:80], "survey": s_meta["name"]})

                # ── Inject anchor question into this survey ──
                # We inject into every screening survey so the answer is always captured,
                # regardless of which screening layer the user reaches last.
                # The flag evaluation happens only at the end (all_failed / no_match).
                is_router = False
                if anchor_config and anchor_config.get("enabled") and anchor_config.get("question_text"):
                    _inject_anchor_question_into_survey(survey_doc["id"], anchor_config)
                    is_router = True
                    router_survey_ids.append(survey_doc["id"])

                s_entry = {
                    "survey_id": survey_doc["id"],
                    "name": s_meta["name"],
                    "index": s_meta["index"],
                    "purpose": s_meta["purpose"],
                    "is_router": is_router,
                }
                screening_survey_ids.append(s_entry)
                generated_surveys.append({
                    "type": "screening",
                    "index": s_meta["index"],
                    "survey_id": survey_doc["id"],
                    "name": s_meta["name"],
                    "question_count": len(survey_doc.get("questions", [])),
                    "is_router": is_router,
                })
                done += 1
                update_job(surveys=list(generated_surveys), progress=int(done / max(total_surveys, 1) * 80))
                print(f"✅ [BG Funnel] Screening survey: {s_meta['name']}")
            except Exception as e:
                errors.append(f"Screening survey '{s_meta['name']}': {e}")
                print(f"❌ [BG Funnel] Screening failed {s_meta['name']}: {e}")
                done += 1

        # ── Job surveys ──
        screening_questions_asked = list(questions_asked_so_far)
        job_surveys_config = {}
        for job_meta in funnel_plan.get("job_profiles", []):
            job_id_key = job_meta["id"]
            update_job(step=f"Generating: {job_meta['display_name']}...", progress=int(done / max(total_surveys, 1) * 80))
            try:
                survey_doc = _generate_single_survey(
                    api_key=api_key,
                    survey_name=job_meta["display_name"],
                    survey_purpose=f"Destination survey for: {job_meta['match_criteria']}",
                    key_topics=job_meta.get("key_topics", []),
                    survey_type="job",
                    funnel_plan=funnel_plan,
                    owner_user_id=owner_user_id,
                    funnel_id=funnel_id,
                    layer_index=None,
                    original_prompt=original_prompt,
                    job_id=job_id_key,
                    qualification_flag=job_meta.get("qualification_flag"),
                    questions_asked_so_far=screening_questions_asked
                )
                job_surveys_config[job_id_key] = {
                    "survey_id": survey_doc["id"],
                    "display_name": job_meta["display_name"],
                    "redirect_url": "",
                    "redirect_rules": [],
                    "pass_criteria": job_meta["match_criteria"],
                    "transition_page": {
                        "enabled": True,
                        "heading": "We found another great opportunity for you!",
                        "message": "You didn't qualify for this role, but we have another opportunity that matches your profile.",
                        "cta_text": "See Next Opportunity →",
                        "auto_redirect_seconds": 5,
                        "show_next_job_name": True
                    }
                }
                generated_surveys.append({"type": "job", "job_id": job_id_key, "survey_id": survey_doc["id"], "name": job_meta["display_name"], "question_count": len(survey_doc.get("questions", []))})
                done += 1
                update_job(surveys=list(generated_surveys), progress=int(done / max(total_surveys, 1) * 80))
                print(f"✅ [BG Funnel] Job survey: {job_meta['display_name']}")
            except Exception as e:
                errors.append(f"Job survey '{job_id_key}': {e}")
                print(f"❌ [BG Funnel] Job failed {job_id_key}: {e}")
                done += 1

        # ── Scoring matrix ──
        update_job(step="Building AI scoring matrix...", progress=85)
        scoring_applied = False
        for scoring_attempt in range(2):  # try up to 2 times
            try:
                scoring_matrix = _generate_scoring_matrix(api_key=api_key, funnel_plan=funnel_plan, screening_survey_ids=screening_survey_ids, original_prompt=original_prompt)
                if scoring_matrix:
                    _apply_scoring_to_surveys(scoring_matrix, screening_survey_ids)
                    print(f"✅ [BG Funnel] Scoring matrix applied ({len(scoring_matrix)} entries, attempt {scoring_attempt + 1})")
                    scoring_applied = True
                    break
                else:
                    print(f"⚠️ [BG Funnel] Scoring matrix empty on attempt {scoring_attempt + 1} — retrying…")
            except Exception as e:
                print(f"⚠️ [BG Funnel] Scoring matrix error on attempt {scoring_attempt + 1}: {e}")
                if scoring_attempt == 1:
                    errors.append(f"Scoring matrix: {e}")
        if not scoring_applied:
            print(f"⚠️ [BG Funnel] Scoring matrix could not be generated — use 'Generate Scoring' button to retry")

        # ── Save funnel config ──
        job_priority_order = [j["id"] for j in funnel_plan.get("job_profiles", [])]
        funnel_doc = {
            "funnel_id": funnel_id,
            "name": funnel_plan.get("funnel_name", "Untitled Funnel"),
            "goal": funnel_plan.get("goal", ""),
            "funnel_type": funnel_plan.get("funnel_type", "general"),
            "original_prompt": original_prompt,
            "funnel_plan": funnel_plan,
            "owner_user_id": owner_user_id,
            "screening_surveys": screening_survey_ids,
            "job_surveys": job_surveys_config,
            "job_priority_order": job_priority_order,
            "fallback_url": "",
            "min_score_threshold": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "generated_surveys": generated_surveys,
            "generation_errors": errors,
            # ── Anchor question config ──────────────────────────────────────
            "anchor_config": anchor_config if (anchor_config and anchor_config.get("enabled")) else None,
            "router_survey_ids": router_survey_ids if router_survey_ids else [],
        }
        db.funnels.insert_one(funnel_doc)
        print(f"✅ [BG Funnel] Saved funnel: {funnel_id}")

        update_job(
            status="done",
            progress=100,
            step="Done!",
            surveys=generated_surveys,
            funnel_id=funnel_id,
            errors=errors
        )

    except Exception as e:
        import traceback
        print(f"❌ [BG Funnel] Fatal error: {traceback.format_exc()}")
        db.funnel_generation_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "error", "error": str(e), "progress": 0}}
        )


# ═══════════════════════════════════════════════════════
#  GENERATION STATUS POLLING
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/generate-status/<job_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_generation_status(job_id):
    """Poll this endpoint every 3 seconds to get generation progress."""
    if request.method == "OPTIONS":
        return "", 200
    job = db.funnel_generation_jobs.find_one({"job_id": job_id})
    if not job:
        return jsonify({"error": "Job not found"}), 404
    job.pop("_id", None)
    return jsonify(job), 200


# ═══════════════════════════════════════════════════════
#  ANCHOR QUESTION — AI GENERATION ENDPOINT
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/generate-anchor-question", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def generate_anchor_question():
    """
    Generates an anchor question (text + options + suggested correct answers)
    from the user's plain-language description.
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    description = data.get("description", "").strip()
    funnel_goal = data.get("funnel_goal", "").strip()

    if not description:
        return jsonify({"error": "description is required"}), 400

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "AI service not configured"}), 503

    prompt = f"""Generate a survey anchor question based on this description:
"{description}"

Funnel context: {funnel_goal or "General funnel"}

Return ONLY valid JSON with this structure:
{{
  "question_text": "The exact question text",
  "options": ["Option A", "Option B", "Option C"],
  "suggested_correct_answers": ["Option A"]
}}

Rules:
- question_text must be a clear, natural survey question
- options: 2–5 answer choices, mutually exclusive and exhaustive
- suggested_correct_answers: which options indicate the user qualifies (based on the description)
- Return only JSON, no explanation"""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=20,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 400,
                "response_format": {"type": "json_object"}
            }
        )
        if resp.status_code != 200:
            return jsonify({"error": f"AI error {resp.status_code}"}), 502
        result = json.loads(resp.json()["choices"][0]["message"]["content"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  ANCHOR QUESTION — INJECT INTO SURVEY
# ═══════════════════════════════════════════════════════

def _inject_anchor_question_into_survey(survey_id: str, anchor_config: dict) -> None:
    """
    Appends the anchor question as the last question in the given survey.
    Marks it with is_anchor=True so the scoring engine can identify it.
    """
    import uuid as _uuid
    anchor_q_id = f"anchor_{_uuid.uuid4().hex[:8]}"
    anchor_question = {
        "id": anchor_q_id,
        "question": anchor_config["question_text"],
        "type": "multiple_choice",
        "options": anchor_config.get("options", []),
        "required": True,
        "funnel_role": "neutral",
        "screening_rule": None,
        "option_scores": {},
        "is_anchor": True,                                      # marker flag
        "anchor_correct_answers": anchor_config.get("correct_answers", []),
        "show_if": None,
        "allowMultiple": False,
    }
    db.surveys.update_one(
        {"$or": [{"id": survey_id}, {"short_id": survey_id}]},
        {"$push": {"questions": anchor_question}}
    )
    print(f"✅ [Anchor] Injected anchor question '{anchor_q_id}' into survey {survey_id}")


def _generate_single_survey(
    api_key, survey_name, survey_purpose, key_topics, survey_type,
    funnel_plan, owner_user_id, funnel_id, layer_index, original_prompt,
    job_id=None, qualification_flag=None, questions_asked_so_far=None
):
    """Generate one survey (screening or job) and save to DB. Returns the saved doc."""
    from utils.short_id import generate_short_id

    job_profiles_summary = ""
    if survey_type == "screening":
        profiles = funnel_plan.get("job_profiles", [])
        job_profiles_summary = "\n".join(
            f"  - {p['id']}: {p['display_name']} — {p['match_criteria']}" for p in profiles
        )

    termination_note = ""
    if survey_type == "screening":
        conditions = funnel_plan.get("termination_conditions", [])
        if conditions:
            termination_note = "Hard termination conditions (mark these questions role='screen'):\n" + "\n".join(f"  - {c}" for c in conditions)

    qualification_note = ""
    if qualification_flag:
        qualification_note = f"Special requirement / qualification flag: {qualification_flag}"

    # ── Build "already asked" context to prevent repetition ──
    already_asked_note = ""
    if questions_asked_so_far:
        asked_lines = "\n".join(f"  - {q['topic']} (in {q['survey']})" for q in questions_asked_so_far[:40])
        already_asked_note = f"""
CRITICAL — DO NOT REPEAT THESE QUESTIONS (already collected in earlier surveys):
{asked_lines}

Rules:
- Never ask about topics already covered above
- If age was asked before, do NOT ask age again
- If work experience was asked before, do NOT ask it again
- Build on what was already collected — go deeper, not broader
- For job surveys specifically: focus on role-specific competencies, NOT general background
"""

    # ── Derive the domain from the funnel goal/name so the AI stays on topic ──
    funnel_domain = funnel_plan.get('goal', funnel_plan.get('funnel_name', ''))

    prompt = f"""Generate a survey for a multi-survey funnel. Return ONLY valid JSON.

════════════════════════════════════════════════
FUNNEL CONTEXT
════════════════════════════════════════════════
Funnel type: {funnel_plan.get('funnel_type', 'general')}
Funnel goal: {funnel_domain}

This specific survey:
  Name: {survey_name}
  Purpose: {survey_purpose}
  Key topics to cover: {', '.join(key_topics) if key_topics else '(derive from purpose above)'}
  Survey type: {survey_type}  (screening = everyone takes it, destination = only matched users)
{"  Destination ID this survey qualifies for: " + job_id if job_id else ""}
{qualification_note}

{"Destination profiles in this funnel (for context):" + chr(10) + job_profiles_summary if job_profiles_summary else ""}
{termination_note}
{already_asked_note}

════════════════════════════════════════════════
⚠️  DOMAIN RULE — READ BEFORE WRITING ANY QUESTION
════════════════════════════════════════════════
The funnel goal above describes the ACTUAL subject of this survey.
Every question you write MUST be about that subject.

NEVER write questions about:
- Loans, payday loans, mortgages, or any lending products — unless the funnel goal is about loans
- Insurance, Medicare, health coverage — unless the funnel goal is about insurance
- Jobs, employment, HR, recruitment — unless the funnel goal is about job matching
- Finance, investing, banking — unless the funnel goal is about finance

If the funnel is about cooking → write questions about cooking.
If the funnel is about travel → write questions about travel.
If the funnel is about fitness → write questions about fitness.
Match the domain of the funnel goal exactly.

════════════════════════════════════════════════
QUESTION SOURCING RULES
════════════════════════════════════════════════
The original user prompt may already contain specific questions with answer options.
If it does, you MUST use those exact questions and options for this survey.
Do NOT invent new questions when the user has already written them.

Rules:
1. If the original prompt contains questions relevant to this survey's purpose → extract and use them EXACTLY (same wording, same options)
2. Only add new questions if the user's prompt doesn't cover enough for this survey's purpose
3. Keep the total between 5-15 questions
4. Preserve the user's exact answer options — don't paraphrase or reorder them

Original user prompt (extract questions from here if present):
{original_prompt[:8000]}

════════════════════════════════════════════════
SURVEY ROLE RULES
════════════════════════════════════════════════
For SCREENING surveys:
- role="screen" with screening_rule ONLY for questions explicitly listed as hard termination conditions in the prompt
  Examples: "Age under 18 → disqualify", "No experience → terminate", "Not in target country → end"
  DO NOT mark preference, interest, or opinion questions as screening — those are scoring questions
- role="score" or role="both" for questions that signal which destination fits the user
- role="neutral" for demographic/background questions that inform context but don't score or screen
- Include a mix of types: multiple_choice, yes_no, dropdown, multi_select

For DESTINATION surveys:
- All questions are role="neutral" (AI evaluates answers holistically)
- These test actual competency or intent for the destination, not general background
- Use the user's specific questions from the relevant branch/layer of their prompt

════════════════════════════════════════════════
RETURN FORMAT
════════════════════════════════════════════════
Return this exact JSON structure:
{{
  "title": "{survey_name}",
  "questions": [
    {{
      "id": "q1",
      "question": "Question text — must be about the funnel domain above",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C"],
      "required": true,
      "funnel_role": "score",
      "screening_rule": null,
      "option_scores": {{}}
    }},
    {{
      "id": "q2",
      "question": "Question text",
      "type": "yes_no",
      "options": ["Yes", "No"],
      "required": true,
      "funnel_role": "score",
      "screening_rule": null,
      "option_scores": {{}}
    }}
  ]
}}

STRICT RULES:
- screening_rule is ALMOST NEVER used — only for explicit hard disqualifiers stated in the prompt like "terminate if under 18" or "end survey if no experience"
- Preference questions, interest questions, opinion questions = role="score", screening_rule=null
- option_scores is always empty {{}} — filled later by scoring step
- question IDs: q1, q2, q3... (unique, sequential)
- yes_no type MUST have options: ["Yes", "No"]
- multi_select type MUST have allowMultiple: true
- Every question with selectable answers MUST have a non-empty options array
- If user wrote "Select all that apply" → use type "multi_select" with allowMultiple: true
- If user wrote "Select up to N" → use type "multi_select" with allowMultiple: true"""

    resp = http_requests.post(
        "https://api.openai.com/v1/chat/completions",
        timeout=40,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 4000,
            "response_format": {"type": "json_object"}
        }
    )

    if resp.status_code != 200:
        raise Exception(f"AI API error {resp.status_code}: {resp.text[:200]}")

    survey_data = json.loads(resp.json()["choices"][0]["message"]["content"])
    raw_questions = survey_data.get("questions", [])
    # Guard: AI sometimes returns a list with strings or nested dicts — keep only dicts
    questions = [q for q in raw_questions if isinstance(q, dict)]

    # Ensure each question has a unique ID and funnel fields
    # Also build a lookup of explicitly defined termination conditions from the prompt
    explicit_termination_keywords = [
        t.lower() for t in funnel_plan.get("termination_conditions", [])
    ]

    for i, q in enumerate(questions):
        if not q.get("id"):
            q["id"] = f"q{i+1}"
        if "funnel_role" not in q:
            q["funnel_role"] = "neutral"
        if "option_scores" not in q:
            q["option_scores"] = {}
        if "screening_rule" not in q:
            q["screening_rule"] = None
        # Normalize: AI sometimes returns "null" (string) or other non-dict values
        if not isinstance(q.get("screening_rule"), dict):
            q["screening_rule"] = None

        # ── Safety guard: strip screening rules unless question matches an
        #    explicit termination condition defined in the funnel plan ──
        # AI sometimes adds screening rules to regular preference/opinion questions.
        # We only allow it when the question text clearly relates to a stated termination.
        sr = q.get("screening_rule")
        if sr and sr.get("enabled"):
            q_text_lower = q.get("question", "").lower()
            is_explicit = any(
                kw in q_text_lower or kw in sr.get("fail_reason", "").lower()
                for kw in explicit_termination_keywords
            ) if explicit_termination_keywords else False

            # Extra guard: never terminate on yes/no questions unless question explicitly
            # contains a hard disqualification word (age, citizenship, legal requirement etc.)
            HARD_DISQUALIFY_WORDS = ["age", "18", "21", "legal", "citizen", "authorized", "eligible",
                                     "criminal", "felony", "license", "certified", "visa", "permit"]
            q_type = q.get("type", "")
            if q_type == "yes_no" and not any(w in q_text_lower for w in HARD_DISQUALIFY_WORDS):
                # This is a preference/opinion yes_no — should never terminate
                q["screening_rule"] = None
                q["funnel_role"] = "score" if q.get("funnel_role") in ("screen", "both") else q.get("funnel_role", "neutral")
            elif not is_explicit and not explicit_termination_keywords:
                # No termination conditions defined at all — strip all screening rules
                q["screening_rule"] = None
                q["funnel_role"] = "score" if q.get("funnel_role") in ("screen", "both") else q.get("funnel_role", "neutral")
            elif not is_explicit:
                # Termination conditions exist but this question doesn't match any
                q["screening_rule"] = None
                q["funnel_role"] = "score" if q.get("funnel_role") in ("screen", "both") else q.get("funnel_role", "neutral")

        # ── Fix: always give yes_no questions their options ──
        if q.get("type") == "yes_no" and not q.get("options"):
            q["options"] = ["Yes", "No"]
        # ── Fix: multi_select needs allowMultiple ──
        if q.get("type") == "multi_select":
            q["allowMultiple"] = True

    short_id = generate_short_id(5)
    survey_id = f"fnl_{funnel_id}_{job_id or f'sc_{layer_index}'}_{uuid.uuid4().hex[:6]}"

    survey_doc = {
        "_id": survey_id,
        "id": survey_id,
        "short_id": short_id,
        "title": survey_data.get("title", survey_name),
        "questions": questions,
        "template_type": "basic",
        "owner_user_id": owner_user_id,
        "funnel_id": funnel_id,
        "funnel_survey_type": survey_type,
        "funnel_job_id": job_id,
        "funnel_layer_index": layer_index,
        "status": "active",
        "is_funnel_survey": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    db.surveys.insert_one(survey_doc)
    return survey_doc


def _generate_scoring_matrix(api_key, funnel_plan, screening_survey_ids, original_prompt):
    """
    Generate point values for every answer option in every screening survey
    for every job profile. Returns a list of scoring_matrix entries.
    
    Note: we score ALL questions that have options (regardless of funnel_role),
    because even "screen" role questions contribute signal for job matching.
    Questions with funnel_role "neutral" that have no options are skipped.
    """
    # Collect all questions that have answer options from all screening surveys
    all_questions_summary = []
    for s_info in screening_survey_ids:
        s_doc = db.surveys.find_one({"id": s_info["survey_id"]})
        if not s_doc:
            print(f"⚠️ [Scoring] Survey not found in DB: {s_info['survey_id']}")
            continue
        questions = s_doc.get("questions", [])
        print(f"[Scoring] Survey {s_info['survey_id']}: {len(questions)} total questions")
        for q in questions:
            if not isinstance(q, dict):
                continue
            role = q.get("funnel_role", "neutral")
            has_options = bool(q.get("options"))
            # Score all questions that have options — screen/score/both/neutral all count
            # (pure text/scale questions with no options cannot be scored)
            if has_options:
                all_questions_summary.append({
                    "survey_id": s_info["survey_id"],
                    "question_id": q["id"],
                    "question_text": q.get("question", "")[:80],
                    "options": q.get("options", [])[:10],
                    "role": role  # informational only
                })

    print(f"[Scoring] Total scoreable questions collected: {len(all_questions_summary)}")

    if not all_questions_summary:
        print("⚠️ [Scoring] No scoreable questions found — all questions may be text/scale type or surveys are empty")
        return []

    job_profiles = funnel_plan.get("job_profiles", [])
    job_descriptions = "\n".join(
        f"  {p['id']}: {p['display_name']} — {p['match_criteria']}"
        for p in job_profiles
    )
    funnel_goal = funnel_plan.get('goal', 'Match users to the best destination')

    def _build_scoring_prompt(questions_slice):
        questions_json = json.dumps(questions_slice, indent=2)
        return f"""Assign scoring points to survey answer options for a funnel.

Funnel goal: {funnel_goal}

Destinations to score for:
{job_descriptions}

Survey questions and their answer options:
{questions_json}

For each answer option in each question, assign points (0-5) for each destination.
- 5 = strong signal this person matches that destination
- 3 = moderate signal
- 1 = weak signal
- 0 = no relevance to that destination

Think carefully about what each answer implies about fit for each destination given the funnel goal above.

Return ONLY valid JSON. The top-level key MUST be "scoring_matrix" and its value MUST be an array. Example:
{{
  "scoring_matrix": [
    {{
      "survey_id": "survey_id_here",
      "question_id": "q1",
      "option_scores": {{
        "Option A": {{"dest_id_1": 4, "dest_id_2": 2}},
        "Option B": {{"dest_id_1": 0, "dest_id_2": 5}}
      }}
    }}
  ]
}}
Do NOT add any text outside the JSON object. Do NOT rename "scoring_matrix"."""

    def _call_scoring_api(prompt_text):
        """
        Call the scoring API and return a list of scoring_matrix entries.
        Uses gpt-4o-mini first (faster, cheaper, more reliable on structured JSON);
        falls back to gpt-4o if mini returns nothing usable.
        """
        def _post(model):
            # Calculate a safe token budget:
            # Each question with N options × M destinations ≈ (N × M × 8) tokens of output.
            # We cap at 4000 tokens per call — enough for ~5 questions with 6 destinations.
            return http_requests.post(
                "https://api.openai.com/v1/chat/completions",
                timeout=180,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt_text}],
                    "temperature": 0.1,
                    "max_tokens": 4000,
                    "response_format": {"type": "json_object"}
                }
            )

        def _parse_raw(raw: str):
            """
            Extract a list of scoring entries from whatever JSON the AI returned.
            Handles:
              - {"scoring_matrix": [...]}         ← expected
              - {"results": [...]}                ← alt key
              - [...]                             ← bare array
              - {"some_key": {"scoring_matrix": [...]}}  ← nested
            Also handles truncated JSON by trying to close the string and re-parse.
            """
            def _try_parse(s):
                try:
                    return json.loads(s), True
                except json.JSONDecodeError:
                    return None, False

            parsed, ok = _try_parse(raw)

            # If truncated, try to close the JSON by appending brackets/braces
            if not ok:
                print(f"⚠️ [Scoring] json.loads failed on full response — attempting truncation recovery")
                print(f"⚠️ [Scoring] Raw (first 500): {raw[:500]}")
                # Find the last complete entry by looking for the last "}," or "}]" pattern
                # Try progressively closing the JSON
                for suffix in ("}]}}", "}]}", "}]", "]}", "]}"):
                    candidate = raw.rstrip().rstrip(",").rstrip() + suffix
                    parsed, ok = _try_parse(candidate)
                    if ok:
                        print(f"[Scoring] Truncation recovery succeeded with suffix: {suffix!r}")
                        break

            if not ok or parsed is None:
                print(f"⚠️ [Scoring] Could not recover from truncated response")
                return []

            # Direct array
            if isinstance(parsed, list):
                return parsed

            if isinstance(parsed, dict):
                # Try common key names first
                for key in ("scoring_matrix", "results", "matrix", "scores", "data"):
                    val = parsed.get(key)
                    if isinstance(val, list) and val:
                        return val

                # Scan all values for the first non-empty list
                for val in parsed.values():
                    if isinstance(val, list) and val:
                        return val

                # One level deeper (sometimes AI wraps in an extra object)
                for val in parsed.values():
                    if isinstance(val, dict):
                        for inner_val in val.values():
                            if isinstance(inner_val, list) and inner_val:
                                return inner_val

            print(f"⚠️ [Scoring] Could not find a list in parsed JSON. Keys: {list(parsed.keys()) if isinstance(parsed, dict) else type(parsed)}")
            return []

        # ── Try gpt-4o-mini first ──
        for model in ("gpt-4o-mini", "gpt-4o"):
            try:
                r = _post(model)
                if r.status_code != 200:
                    print(f"⚠️ [Scoring] {model} returned HTTP {r.status_code}: {r.text[:200]}")
                    continue
                raw = r.json()["choices"][0]["message"]["content"]
                print(f"[Scoring] {model} raw response (first 600 chars): {raw[:600]}")
                entries = _parse_raw(raw)
                if entries:
                    print(f"[Scoring] {model} → {len(entries)} entries extracted")
                    return entries
                print(f"⚠️ [Scoring] {model} returned parseable JSON but no entries found — trying next model")
            except Exception as e:
                print(f"⚠️ [Scoring] {model} exception: {e}")
                continue

        print("⚠️ [Scoring] All models failed to return usable scoring entries")
        return []

    # ── Batch questions to stay within token limits ──
    # With many destinations (6+) and many options per question, each question's
    # option_scores JSON is ~300-500 tokens. Keep batches at 5 questions max
    # so the response always fits within 4000 tokens and never gets truncated.
    BATCH_SIZE = 5
    combined_matrix = []
    for batch_start in range(0, len(all_questions_summary), BATCH_SIZE):
        batch = all_questions_summary[batch_start: batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = -(-len(all_questions_summary) // BATCH_SIZE)  # ceiling div
        print(f"[Scoring] Batch {batch_num}/{total_batches}: {len(batch)} questions")
        batch_prompt = _build_scoring_prompt(batch)
        batch_result = _call_scoring_api(batch_prompt)
        combined_matrix.extend(batch_result)
        print(f"✅ [Scoring] Batch {batch_num}/{total_batches}: {len(batch_result)} entries returned")

    return combined_matrix


def _apply_scoring_to_surveys(scoring_matrix, screening_survey_ids):
    """
    Write generated option_scores back into the survey question documents.
    Normalises the structure to always be: { option_text: { job_id: number } }
    and guards against the AI returning inverted or extra-nested structures.
    """
    for entry in scoring_matrix:
        s_id = entry.get("survey_id")
        q_id = entry.get("question_id")
        option_scores = entry.get("option_scores", {})

        if not s_id or not q_id or not option_scores:
            continue

        # ── Normalise: ensure every leaf value is a plain number ──
        # The AI occasionally returns { option: { job_id: { job_id2: pts } } }
        # (an extra level of nesting). Flatten any dict-valued leaves.
        normalised: dict = {}
        for opt_key, job_map in option_scores.items():
            if not isinstance(job_map, dict):
                # Unexpected scalar at option level — skip
                continue
            flat_jobs: dict = {}
            for job_key, pts_val in job_map.items():
                if isinstance(pts_val, (int, float)):
                    flat_jobs[job_key] = float(pts_val)
                elif isinstance(pts_val, dict):
                    # Extra nesting — AI put another dict where a number should be.
                    # Take the first numeric value found inside, or default to 0.
                    inner_num = next(
                        (v for v in pts_val.values() if isinstance(v, (int, float))),
                        0
                    )
                    flat_jobs[job_key] = float(inner_num)
                # else: ignore non-numeric non-dict values
            if flat_jobs:
                normalised[opt_key] = flat_jobs

        if not normalised:
            print(f"⚠️ [Apply] Skipping q={q_id} in {s_id} — no valid scores after normalisation")
            continue

        db.surveys.update_one(
            {"id": s_id, "questions.id": q_id},
            {"$set": {"questions.$.option_scores": normalised}}
        )
        print(f"[Apply] Updated q={q_id} in {s_id}: {len(normalised)} options scored")


# ═══════════════════════════════════════════════════════
#  GET ALL FUNNELS (for funnel surveys tab)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnels():
    """Get all funnels for the current user with pagination and date filtering."""
    if request.method == "OPTIONS":
        return "", 200

    current_user = g.current_user
    user_id = str(current_user.get("_id", ""))
    is_admin = current_user.get("role") == "admin"

    # -- Query params --------------------------------------------------------
    try:
        page     = max(int(request.args.get('page', 1)), 1)
        per_page = min(int(request.args.get('per_page', 20)), 100)
    except (ValueError, TypeError):
        page, per_page = 1, 20

    search    = request.args.get('search', '').strip()
    date_from = request.args.get('date_from', '').strip()
    date_to   = request.args.get('date_to', '').strip()
    skip = (page - 1) * per_page

    # -- Build MongoDB query -------------------------------------------------
    query = {} if is_admin else {
        "$or": [
            {"owner_user_id": user_id},
            {"shared_with": user_id},
        ]
    }
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if date_from or date_to:
        from datetime import datetime, timedelta
        date_filter = {}
        if date_from:
            try: date_filter["$gte"] = datetime.strptime(date_from, "%Y-%m-%d")
            except ValueError: pass
        if date_to:
            try: date_filter["$lte"] = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            except ValueError: pass
        if date_filter: query["created_at"] = date_filter

    total   = db.funnels.count_documents(query)
    funnels = list(db.funnels.find(query).sort("created_at", -1).skip(skip).limit(per_page))

    result = []
    for f in funnels:
        f["_id"] = str(f["_id"])
        result.append({
            "funnel_id":         f.get("funnel_id"),
            "name":              f.get("name"),
            "goal":              f.get("goal"),
            "status":            f.get("status", "active"),
            "created_at":        f.get("created_at"),
            "screening_surveys": f.get("screening_surveys", []),
            "job_surveys":       f.get("job_surveys", {}),
            "generated_surveys": f.get("generated_surveys", []),
            "total_surveys":     len(f.get("generated_surveys", [])),
            "anchor_config":     f.get("anchor_config"),
            "router_survey_ids": f.get("router_survey_ids", []),
            "fallback_url":      f.get("fallback_url", ""),
        })

    return jsonify({
        "funnels":     result,
        "total":       total,
        "page":        page,
        "per_page":    per_page,
        "total_pages": -(-total // per_page)
    }), 200

@funnel_bp.route("/api/funnels/<funnel_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnel(funnel_id):
    """Get full funnel config with all surveys."""
    if request.method == "OPTIONS":
        return "", 200

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    funnel["_id"] = str(funnel["_id"])
    return jsonify(funnel), 200


# ═══════════════════════════════════════════════════════
#  UPDATE FUNNEL CONFIG (redirect URLs, transition pages, etc.)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>", methods=["PUT", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def update_funnel(funnel_id):
    """Update funnel configuration — redirect URLs, transition messages, thresholds."""
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    allowed_fields = [
        "name", "fallback_url", "min_score_threshold",
        "job_surveys", "job_priority_order", "status",
        "anchor_config", "router_survey_ids"
    ]
    update = {k: data[k] for k in allowed_fields if k in data}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.funnels.update_one({"funnel_id": funnel_id}, {"$set": update})
    return jsonify({"success": True}), 200


# ═══════════════════════════════════════════════════════
#  FUNNEL COLLABORATORS
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/collaborators", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnel_collaborators(funnel_id):
    """Return the list of collaborators for a funnel."""
    if request.method == "OPTIONS":
        return "", 200

    current_user = g.current_user
    user_id = str(current_user.get("_id", ""))
    is_admin = current_user.get("role") == "admin"

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    owner_id = str(funnel.get("owner_user_id", ""))
    if owner_id != user_id and not is_admin:
        return jsonify({"error": "Access denied"}), 403

    collaborators = []
    for uid in funnel.get("shared_with", []):
        try:
            from bson import ObjectId
            u = db.users.find_one({"_id": ObjectId(uid)}, {"_id": 1, "name": 1, "email": 1})
            if u:
                collaborators.append({"id": str(u["_id"]), "name": u.get("name", ""), "email": u.get("email", "")})
        except Exception:
            pass

    return jsonify({"collaborators": collaborators}), 200


@funnel_bp.route("/api/funnels/<funnel_id>/collaborators", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def add_funnel_collaborator(funnel_id):
    """Add a user to the funnel's shared_with list."""
    if request.method == "OPTIONS":
        return "", 200

    current_user = g.current_user
    user_id = str(current_user.get("_id", ""))
    is_admin = current_user.get("role") == "admin"
    data = request.get_json() or {}
    collaborator_id = data.get("user_id", "").strip()

    if not collaborator_id:
        return jsonify({"error": "user_id is required"}), 400

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    owner_id = str(funnel.get("owner_user_id", ""))
    if owner_id != user_id and not is_admin:
        return jsonify({"error": "Access denied"}), 403

    if collaborator_id == user_id:
        return jsonify({"error": "You already own this funnel"}), 400

    try:
        from bson import ObjectId
        target_user = db.users.find_one({"_id": ObjectId(collaborator_id)})
    except Exception:
        target_user = None
    if not target_user:
        return jsonify({"error": "Target user not found"}), 404

    db.funnels.update_one(
        {"funnel_id": funnel_id},
        {"$addToSet": {"shared_with": collaborator_id}}
    )

    return jsonify({
        "message": f'{target_user.get("name", target_user.get("email"))} added as collaborator',
        "collaborator": {
            "id": collaborator_id,
            "name": target_user.get("name", ""),
            "email": target_user.get("email", ""),
        }
    }), 200


@funnel_bp.route("/api/funnels/<funnel_id>/collaborators/<collaborator_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def remove_funnel_collaborator(funnel_id, collaborator_id):
    """Remove a user from the funnel's shared_with list."""
    if request.method == "OPTIONS":
        return "", 200

    current_user = g.current_user
    user_id = str(current_user.get("_id", ""))
    is_admin = current_user.get("role") == "admin"

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    owner_id = str(funnel.get("owner_user_id", ""))
    if owner_id != user_id and not is_admin:
        return jsonify({"error": "Access denied"}), 403

    db.funnels.update_one(
        {"funnel_id": funnel_id},
        {"$pull": {"shared_with": collaborator_id}}
    )
    return jsonify({"message": "Collaborator removed"}), 200


# ═══════════════════════════════════════════════════════
#  DELETE FUNNEL
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def delete_funnel(funnel_id):
    """Delete a funnel and all its associated surveys."""
    if request.method == "OPTIONS":
        return "", 200

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    # Collect all survey IDs to delete
    survey_ids_to_delete = []
    for ss in funnel.get("screening_surveys", []):
        if ss.get("survey_id"):
            survey_ids_to_delete.append(ss["survey_id"])
    for job_cfg in funnel.get("job_surveys", {}).values():
        if job_cfg.get("survey_id"):
            survey_ids_to_delete.append(job_cfg["survey_id"])
    # Also check generated_surveys for any extras
    for gs in funnel.get("generated_surveys", []):
        sid = gs.get("survey_id")
        if sid and sid not in survey_ids_to_delete:
            survey_ids_to_delete.append(sid)

    # Delete all surveys
    deleted_surveys = 0
    if survey_ids_to_delete:
        result = db.surveys.delete_many({"id": {"$in": survey_ids_to_delete}})
        deleted_surveys = result.deleted_count

    # Delete funnel sessions
    db.funnel_sessions.delete_many({"funnel_id": funnel_id})

    # Delete the funnel
    db.funnels.delete_one({"funnel_id": funnel_id})

    return jsonify({
        "success": True,
        "deleted_surveys": deleted_surveys,
        "funnel_id": funnel_id
    }), 200


# ═══════════════════════════════════════════════════════
#  RUNTIME — SCREENING SURVEY SUBMIT
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/submit-screening", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
def submit_screening_survey(funnel_id):
    """
    Called when a user submits a screening survey inside a funnel.
    Runs screening check + scoring + returns next action.
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    survey_id = data.get("survey_id", "")
    layer_index = int(data.get("layer_index", 0))
    answers = data.get("answers", {})
    funnel_session_id = data.get("funnel_session_id") or f"fs_{uuid.uuid4().hex[:12]}"

    user_info = {
        "email": data.get("email", ""),
        "username": data.get("username", ""),
        "click_id": data.get("click_id", ""),
        "ip_address": request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    }

    result = process_screening_survey_submission(
        funnel_id=funnel_id,
        funnel_session_id=funnel_session_id,
        survey_id=survey_id,
        layer_index=layer_index,
        answers=answers,
        user_info=user_info
    )

    return jsonify({**result, "funnel_session_id": funnel_session_id}), 200


# ═══════════════════════════════════════════════════════
#  RUNTIME — JOB SURVEY SUBMIT
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/submit-job", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
def submit_job_survey(funnel_id):
    """
    Called when a user submits a job-specific survey.
    AI evaluates pass/fail and returns next action (pass → redirect, fail → next job).
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    job_id = data.get("job_id", "")
    answers = data.get("answers", {})
    funnel_session_id = data.get("funnel_session_id", "")

    if not job_id or not funnel_session_id:
        return jsonify({"error": "job_id and funnel_session_id required"}), 400

    result = process_job_survey_submission(
        funnel_id=funnel_id,
        funnel_session_id=funnel_session_id,
        job_id=job_id,
        answers=answers
    )

    return jsonify(result), 200


# ═══════════════════════════════════════════════════════
#  SESSION STATUS (for resume / frontend state check)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/session/<funnel_session_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
def get_funnel_session(funnel_session_id):
    """Get current funnel session state for resume."""
    if request.method == "OPTIONS":
        return "", 200

    session = db.funnel_sessions.find_one({"funnel_session_id": funnel_session_id})
    if not session:
        return jsonify({"error": "Session not found"}), 404

    session["_id"] = str(session["_id"])
    return jsonify(session), 200


# ═══════════════════════════════════════════════════════
#  UPDATE SCORE FOR A QUESTION OPTION
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/update-score", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def update_option_score(funnel_id):
    """Update a single option score for a specific question in a screening survey."""
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    survey_id = data.get("survey_id")
    question_id = data.get("question_id")
    option = data.get("option")
    job_id = data.get("job_id")
    points = float(data.get("points", 0))

    if not all([survey_id, question_id, option, job_id]):
        return jsonify({"error": "survey_id, question_id, option, job_id required"}), 400

    # Update the specific nested field
    db.surveys.update_one(
        {"$or": [{"id": survey_id}, {"short_id": survey_id}], "questions.id": question_id},
        {"$set": {f"questions.$.option_scores.{option}.{job_id}": points}}
    )
    return jsonify({"success": True}), 200

@funnel_bp.route("/api/funnels/<funnel_id>/analytics", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnel_analytics(funnel_id):
    """Basic funnel analytics — completion rates, job match distribution."""
    if request.method == "OPTIONS":
        return "", 200

    sessions = list(db.funnel_sessions.find({"funnel_id": funnel_id}))

    total = len(sessions)
    completed = sum(1 for s in sessions if s.get("status") == "completed")
    terminated = sum(1 for s in sessions if s.get("status") == "terminated")
    no_match = sum(1 for s in sessions if s.get("status") == "no_match")

    job_matches: dict = {}
    for s in sessions:
        matched = s.get("matched_job")
        if matched:
            job_matches[matched] = job_matches.get(matched, 0) + 1

    return jsonify({
        "funnel_id": funnel_id,
        "total_sessions": total,
        "completed": completed,
        "terminated": terminated,
        "no_match": no_match,
        "completion_rate": round(completed / total * 100, 1) if total else 0,
        "job_match_distribution": job_matches
    }), 200


# ═══════════════════════════════════════════════════════
#  FUNNEL SESSIONS LIST (admin tracking)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/sessions", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnel_sessions(funnel_id):
    """
    Get sessions for a funnel with pagination, search, and date filtering.
    Query params: page, per_page, search, date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    Sorted newest first (created_at desc).
    """
    if request.method == "OPTIONS":
        return "", 200

    try:
        page     = max(int(request.args.get("page",     1)),  1)
        per_page = min(int(request.args.get("per_page", 20)), 100)
    except (ValueError, TypeError):
        page, per_page = 1, 20

    search    = request.args.get("search",    "").strip()
    date_from = request.args.get("date_from", "").strip()
    date_to   = request.args.get("date_to",   "").strip()
    skip      = (page - 1) * per_page

    query: dict = {"funnel_id": funnel_id}

    # ── Date filter on created_at ──────────────────────────────────────────
    if date_from or date_to:
        from datetime import datetime, timedelta
        date_q: dict = {}
        if date_from:
            try: date_q["$gte"] = datetime.strptime(date_from, "%Y-%m-%d").isoformat()
            except ValueError: pass
        if date_to:
            try:
                dt_end = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
                date_q["$lt"] = dt_end.isoformat()
            except ValueError: pass
        if date_q:
            query["created_at"] = date_q

    # ── Text search across key fields ─────────────────────────────────────
    if search:
        q = search.lower()
        query["$or"] = [
            {"funnel_session_id":  {"$regex": search, "$options": "i"}},
            {"user_info.email":    {"$regex": search, "$options": "i"}},
            {"user_info.username": {"$regex": search, "$options": "i"}},
            {"status":             {"$regex": search, "$options": "i"}},
            {"matched_job":        {"$regex": search, "$options": "i"}},
        ]

    total    = db.funnel_sessions.count_documents(query)
    sessions = list(
        db.funnel_sessions.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(per_page)
    )
    for s in sessions:
        s["_id"] = str(s["_id"])

    return jsonify({
        "sessions":    sessions,
        "total":       total,
        "page":        page,
        "per_page":    per_page,
        "total_pages": -(-total // per_page),
    }), 200


# ═══════════════════════════════════════════════════════
#  REPAIR: fix yes_no questions missing options in funnel surveys
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/regenerate-screening", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def regenerate_screening_surveys(funnel_id):
    """
    Regenerates missing screening surveys for a funnel using the stored funnel_plan.
    Called when screening surveys failed during initial generation.
    """
    if request.method == "OPTIONS":
        return "", 200

    try:
        funnel = db.funnels.find_one({"funnel_id": funnel_id})
        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        # Get the owner's API key
        owner_user_id = funnel.get("owner_user_id", "")
        user_doc = db.users.find_one({"user_id": owner_user_id}) or db.users.find_one({"id": owner_user_id})
        api_key = None
        if user_doc:
            api_key = user_doc.get("openai_api_key") or user_doc.get("api_key")
        if not api_key:
            # Fall back to system key from environment
            import os
            api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            return jsonify({"error": "No API key available"}), 400

        funnel_plan = funnel.get("funnel_plan", {})
        screening_plan = funnel_plan.get("screening_surveys", [])
        original_prompt = funnel.get("original_prompt", "")

        if not screening_plan:
            return jsonify({"error": "No screening survey plan found in funnel_plan"}), 400

        existing_screening_ids = {s.get("survey_id") for s in funnel.get("screening_surveys", [])}
        generated = []
        new_screening_survey_ids = list(funnel.get("screening_surveys", []))
        existing_generated = list(funnel.get("generated_surveys", []))
        questions_asked_so_far = []

        errors = []
        for s_meta in screening_plan:
            s_idx = s_meta.get("index", 0)
            # Skip if already exists at this layer index
            already_exists = any(
                s.get("index") == s_idx
                for s in funnel.get("screening_surveys", [])
                if db.surveys.count_documents({"id": s.get("survey_id", "")}) > 0
            )
            if already_exists:
                continue

            try:
                survey_doc = _generate_single_survey(
                    api_key=api_key,
                    survey_name=s_meta["name"],
                    survey_purpose=s_meta["purpose"],
                    key_topics=s_meta.get("key_topics", []),
                    survey_type="screening",
                    funnel_plan=funnel_plan,
                    owner_user_id=owner_user_id,
                    funnel_id=funnel_id,
                    layer_index=s_idx,
                    original_prompt=original_prompt,
                    questions_asked_so_far=questions_asked_so_far
                )
                for q in survey_doc.get("questions", []):
                    if isinstance(q, dict):  # guard: skip any non-dict items saved by AI
                        questions_asked_so_far.append({"topic": q.get("question", "")[:80], "survey": s_meta["name"]})

                entry = {
                    "survey_id": survey_doc["id"],
                    "name": s_meta["name"],
                    "index": s_idx,
                    "purpose": s_meta.get("purpose", "")
                }
                new_screening_survey_ids.append(entry)
                generated.append({
                    "type": "screening",
                    "index": s_idx,
                    "survey_id": survey_doc["id"],
                    "name": s_meta["name"],
                    "question_count": len(survey_doc.get("questions", []))
                })
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                print(f"[regenerate-screening] FAIL {s_meta.get('name')}: {tb}")
                errors.append(f"{s_meta['name']}: {str(e)}")

        if not generated:
            return jsonify({"success": False, "error": "All screening survey generations failed", "details": errors}), 200

        # Apply scoring matrix to new screening surveys
        try:
            scoring_matrix = _generate_scoring_matrix(
                api_key=api_key,
                funnel_plan=funnel_plan,
                screening_survey_ids=[{"survey_id": g["survey_id"], "name": g["name"]} for g in generated],
                original_prompt=original_prompt
            )
            _apply_scoring_to_surveys(scoring_matrix, [{"survey_id": g["survey_id"], "name": g["name"]} for g in generated])
        except Exception as e:
            errors.append(f"Scoring: {str(e)}")

        # Rebuild full generated_surveys list: screening first, then existing jobs
        job_surveys = [g for g in existing_generated if g.get("type") == "job"]
        full_generated = sorted(generated, key=lambda x: x.get("index", 0)) + job_surveys

        db.funnels.update_one(
            {"funnel_id": funnel_id},
            {"$set": {
                "screening_surveys": new_screening_survey_ids,
                "generated_surveys": full_generated,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        return jsonify({
            "success": True,
            "generated": len(generated),
            "errors": errors,
            "screening_surveys": generated
        }), 200

    except Exception as e:
        import traceback
        print(f"[regenerate-screening] FATAL: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 200


@funnel_bp.route("/api/funnels/<funnel_id>/regenerate-scoring", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def regenerate_scoring(funnel_id):
    """
    Kicks off AI scoring matrix regeneration in a background thread and returns
    a job_id immediately. The client polls GET /scoring-job/<job_id> for status.
    This avoids HTTP timeouts on large funnels where generation can take 2–3 min.
    """
    if request.method == "OPTIONS":
        return "", 200

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    # Ownership check
    current_user = g.current_user
    is_admin = current_user.get("role") == "admin"
    if not is_admin and str(funnel.get("owner_user_id", "")) != str(current_user.get("_id", "")):
        return jsonify({"error": "Not authorised"}), 403

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "AI service not configured"}), 503

    funnel_plan = funnel.get("funnel_plan", {})
    if not funnel_plan:
        return jsonify({"error": "Funnel has no stored funnel_plan — cannot regenerate scoring"}), 400

    screening_surveys = funnel.get("screening_surveys", [])
    if not screening_surveys:
        return jsonify({"error": "No screening surveys found in this funnel"}), 400

    # Create a job record so the frontend can poll progress
    job_id = f"rscore_{uuid.uuid4().hex[:10]}"
    db.scoring_jobs.insert_one({
        "job_id": job_id,
        "funnel_id": funnel_id,
        "status": "running",
        "message": "Starting scoring generation…",
        "entries_applied": 0,
        "surveys_updated": 0,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    original_prompt = funnel.get("original_prompt", "")
    screening_survey_ids = [
        {"survey_id": s["survey_id"], "name": s.get("name", s["survey_id"])}
        for s in screening_surveys
    ]

    def _run_in_bg():
        try:
            print(f"[regenerate-scoring] START job={job_id} funnel={funnel_id} surveys={len(screening_survey_ids)}")
            db.scoring_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"message": f"Generating scores for {len(screening_survey_ids)} survey(s)…"}}
            )

            scoring_matrix = _generate_scoring_matrix(
                api_key=api_key,
                funnel_plan=funnel_plan,
                screening_survey_ids=screening_survey_ids,
                original_prompt=original_prompt
            )

            if not scoring_matrix:
                db.scoring_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {
                        "status": "error",
                        "error": "AI returned an empty scoring matrix. Check the backend logs for the raw response and try again."
                    }}
                )
                return

            _apply_scoring_to_surveys(scoring_matrix, screening_survey_ids)

            db.funnels.update_one(
                {"funnel_id": funnel_id},
                {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )

            entries = len(scoring_matrix)
            print(f"[regenerate-scoring] DONE job={job_id} entries={entries}")
            db.scoring_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "done",
                    "message": "Scoring generated successfully.",
                    "entries_applied": entries,
                    "surveys_updated": len(screening_survey_ids)
                }}
            )
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"[regenerate-scoring] FATAL job={job_id}: {tb}")
            db.scoring_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"status": "error", "error": str(e)}}
            )

    import threading
    threading.Thread(target=_run_in_bg, daemon=True).start()

    return jsonify({"job_id": job_id, "status": "running"}), 202


@funnel_bp.route("/api/funnels/<funnel_id>/scoring-job/<job_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_scoring_job(funnel_id, job_id):
    """Poll endpoint: returns current status of a regenerate-scoring job."""
    if request.method == "OPTIONS":
        return "", 200

    job = db.scoring_jobs.find_one({"job_id": job_id, "funnel_id": funnel_id})
    if not job:
        return jsonify({"error": "Job not found"}), 404

    return jsonify({
        "job_id": job_id,
        "status": job.get("status", "running"),
        "message": job.get("message", ""),
        "entries_applied": job.get("entries_applied", 0),
        "surveys_updated": job.get("surveys_updated", 0),
        "error": job.get("error")
    }), 200


@funnel_bp.route("/api/funnels/<funnel_id>/debug-surveys", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def debug_funnel_surveys(funnel_id):
    if request.method == "OPTIONS":
        return "", 200
    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404
    stored_screening = funnel.get("screening_surveys", [])
    stored_generated = funnel.get("generated_surveys", [])
    actual_surveys = list(db.surveys.find(
        {"funnel_id": funnel_id},
        {"id": 1, "title": 1, "funnel_survey_type": 1, "funnel_layer_index": 1, "_id": 0}
    ))
    return jsonify({
        "funnel_id": funnel_id,
        "stored_screening_surveys": stored_screening,
        "stored_generated_surveys": stored_generated,
        "actual_surveys_in_db": actual_surveys,
        "counts": {
            "stored_screening": len(stored_screening),
            "stored_generated": len(stored_generated),
            "actual_in_db": len(actual_surveys),
            "actual_screening": sum(1 for s in actual_surveys if s.get("funnel_survey_type") == "screening"),
            "actual_job": sum(1 for s in actual_surveys if s.get("funnel_survey_type") == "job"),
        }
    }), 200


@funnel_bp.route("/api/funnels/<funnel_id>/repair-generated", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def repair_funnel_generated_surveys(funnel_id):
    if request.method == "OPTIONS":
        return "", 200
    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    rebuilt_generated = []
    rebuilt_screening = list(funnel.get("screening_surveys", []))
    found_ids = set()

    # Source 1: screening_surveys field in funnel doc
    for ss in funnel.get("screening_surveys", []):
        survey_doc = db.surveys.find_one({"id": ss["survey_id"]})
        if survey_doc:
            rebuilt_generated.append({
                "type": "screening",
                "index": ss.get("index", 0),
                "survey_id": ss["survey_id"],
                "name": ss.get("name", survey_doc.get("title", "Screening")),
                "question_count": len(survey_doc.get("questions", []))
            })
            found_ids.add(ss["survey_id"])

    # Source 2: scan surveys collection by funnel_id (catches missing entries)
    db_surveys = list(db.surveys.find({"funnel_id": funnel_id}))
    for sv in db_surveys:
        sv_id = sv.get("id", str(sv.get("_id", "")))
        sv_type = sv.get("funnel_survey_type", "")
        if sv_id in found_ids:
            continue
        if sv_type == "screening":
            layer_idx = sv.get("funnel_layer_index", 0)
            entry = {
                "type": "screening",
                "index": layer_idx,
                "survey_id": sv_id,
                "name": sv.get("title", f"Screening {layer_idx + 1}"),
                "question_count": len(sv.get("questions", []))
            }
            rebuilt_generated.append(entry)
            found_ids.add(sv_id)
            if not any(s.get("survey_id") == sv_id for s in rebuilt_screening):
                rebuilt_screening.append({
                    "survey_id": sv_id,
                    "name": sv.get("title", f"Screening {layer_idx + 1}"),
                    "index": layer_idx,
                    "purpose": ""
                })
        elif sv_type == "job":
            job_id_key = sv.get("funnel_job_id", sv_id)
            job_cfg = funnel.get("job_surveys", {}).get(job_id_key, {})
            rebuilt_generated.append({
                "type": "job",
                "job_id": job_id_key,
                "survey_id": sv_id,
                "name": job_cfg.get("display_name", sv.get("title", job_id_key)),
                "question_count": len(sv.get("questions", []))
            })
            found_ids.add(sv_id)

    rebuilt_generated.sort(key=lambda x: (0 if x["type"] == "screening" else 1, x.get("index", 0)))

    db.funnels.update_one(
        {"funnel_id": funnel_id},
        {"$set": {
            "generated_surveys": rebuilt_generated,
            "screening_surveys": rebuilt_screening,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return jsonify({
        "success": True,
        "rebuilt": len(rebuilt_generated),
        "screening_count": sum(1 for s in rebuilt_generated if s["type"] == "screening"),
        "job_count": sum(1 for s in rebuilt_generated if s["type"] == "job"),
        "generated_surveys": rebuilt_generated
    }), 200



@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def repair_funnel_questions():
    """
    One-time repair: scan all funnel surveys and fix yes_no questions
    that are missing options. Also adds template_type='basic' to all funnel surveys.
    """
    if request.method == "OPTIONS":
        return "", 200

    fixed_surveys = 0
    fixed_questions = 0

    # Find all funnel surveys
    funnel_surveys = list(db.surveys.find({"is_funnel_survey": True}))

    for survey in funnel_surveys:
        questions = survey.get("questions", [])
        changed = False

        for q in questions:
            # Fix yes_no missing options
            if q.get("type") == "yes_no" and not q.get("options"):
                q["options"] = ["Yes", "No"]
                changed = True
                fixed_questions += 1
            # Fix multi_select missing allowMultiple
            if q.get("type") == "multi_select" and not q.get("allowMultiple"):
                q["allowMultiple"] = True
                changed = True

        update_fields = {}
        if changed:
            update_fields["questions"] = questions
            fixed_surveys += 1

        # Always ensure template_type is basic
        if survey.get("template_type") != "basic":
            update_fields["template_type"] = "basic"

        if update_fields:
            db.surveys.update_one(
                {"_id": survey["_id"]},
                {"$set": update_fields}
            )

    return jsonify({
        "success": True,
        "fixed_surveys": fixed_surveys,
        "fixed_questions": fixed_questions,
        "total_funnel_surveys": len(funnel_surveys)
    }), 200


# ═══════════════════════════════════════════════════════
#  PREDICT SIGNAL COLORS FOR JOB SURVEY QUESTIONS
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/<funnel_id>/predict-job-signals/<survey_id>", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def predict_job_survey_signals(funnel_id, survey_id):
    """
    Ask AI to predict how strongly each answer option signals fit for the job profile.
    Stores results as option_scores on each question (scale 0-5).
    This lets the admin see color-coded answers before testing.
    """
    if request.method == "OPTIONS":
        return "", 200

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "AI service not configured"}), 503

    # Get funnel to find the job profile criteria
    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    # Find which job this survey belongs to
    job_id = None
    job_criteria = ""
    job_display_name = ""
    for jid, jcfg in funnel.get("job_surveys", {}).items():
        if jcfg.get("survey_id") == survey_id:
            job_id = jid
            job_criteria = jcfg.get("pass_criteria", "")
            job_display_name = jcfg.get("display_name", jid)
            break

    if not job_id:
        return jsonify({"error": "Survey not found in funnel job surveys"}), 404

    # Get the survey questions
    survey_doc = db.surveys.find_one({"$or": [{"id": survey_id}, {"short_id": survey_id}]})
    if not survey_doc:
        return jsonify({"error": "Survey not found"}), 404

    questions = survey_doc.get("questions", [])
    scoreable_questions = [q for q in questions if isinstance(q, dict) and q.get("options") and len(q.get("options", [])) > 0]

    if not scoreable_questions:
        return jsonify({"error": "No questions with options found"}), 400

    # Build the prompt
    q_summary = []
    for q in scoreable_questions:
        q_summary.append({
            "id": q.get("id"),
            "question": q.get("question", "")[:100],
            "options": q.get("options", [])[:10]
        })

    prompt = f"""You are analyzing a job/product qualification survey to predict how each answer signals fit.

Job/Destination profile: {job_display_name}
Match criteria: {job_criteria}

For each question's answer options, assign a signal strength score (0-5):
- 5 = This answer very strongly indicates the person matches this profile
- 4 = Strong signal
- 3 = Moderate signal  
- 2 = Weak signal
- 1 = Very weak / ambiguous signal
- 0 = This answer suggests the person does NOT match this profile

Questions and options:
{json.dumps(q_summary, indent=2)}

Return ONLY valid JSON:
{{
  "signals": [
    {{
      "question_id": "q1",
      "option_scores": {{
        "Once a month": {{"_{job_id}": 5}},
        "Once every few months": {{"_{job_id}": 3}},
        "Once a year": {{"_{job_id}": 1}},
        "Less than once a year": {{"_{job_id}": 0}}
      }}
    }}
  ]
}}

Use "_{job_id}" as the key for each score."""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=30,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2000,
                "response_format": {"type": "json_object"}
            }
        )

        if resp.status_code != 200:
            return jsonify({"error": f"AI error: {resp.status_code}"}), 502

        result = json.loads(resp.json()["choices"][0]["message"]["content"])
        signals = result.get("signals", [])

        # Apply to questions
        updated = 0
        for sig in signals:
            qid = sig.get("question_id")
            option_scores = sig.get("option_scores", {})
            # Rename key from _{job_id} to the actual job_id
            cleaned = {}
            for opt, scores in option_scores.items():
                cleaned[opt] = {k.lstrip("_"): v for k, v in scores.items()}

            if cleaned:
                db.surveys.update_one(
                    {"$or": [{"id": survey_id}, {"short_id": survey_id}], "questions.id": qid},
                    {"$set": {"questions.$.option_scores": cleaned, "questions.$.funnel_role": "score"}}
                )
                updated += 1

        print(f"✅ [FunnelSignals] Applied signals to {updated} questions in {survey_id}")
        return jsonify({"success": True, "questions_updated": updated, "job_id": job_id}), 200

    except Exception as e:
        import traceback
        print(f"❌ predict_job_survey_signals error: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  QUICK FUNNEL DETECTION (no auth — fires as user types)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/detect", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
def detect_funnel_prompt():
    """
    Lightweight, fast check: does this prompt describe a funnel?
    Called after user pauses typing (debounced ~2s).
    Returns {is_funnel: bool, reason: str, confidence: 0-100}
    Uses GPT-4o-mini with tiny token budget for speed.
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    prompt = (data.get("prompt") or "").strip()

    if len(prompt) < 40:
        return jsonify({"is_funnel": False, "reason": "", "confidence": 0}), 200

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"is_funnel": False, "reason": "", "confidence": 0}), 200

    detection_prompt = f"""Does this prompt describe a multi-survey funnel (screening + routing + scoring)?

Funnel signals:
- Multiple surveys or layers (Layer 1, Layer 2, LAYER 3...)
- Screening then routing to different destinations
- Scoring/matching people to products/jobs/programs
- Branching to different survey paths based on answers
- "route", "redirect", "qualify", "match", "screen", "scoring"

Prompt:
"{prompt[:800]}"

Return ONLY JSON: {{"is_funnel": true/false, "confidence": 0-100, "reason": "one sentence why"}}"""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=8,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": detection_prompt}],
                "temperature": 0.0,
                "max_tokens": 80,
                "response_format": {"type": "json_object"}
            }
        )
        if resp.status_code == 200:
            result = json.loads(resp.json()["choices"][0]["message"]["content"])
            return jsonify({
                "is_funnel": bool(result.get("is_funnel", False)),
                "confidence": int(result.get("confidence", 0)),
                "reason": result.get("reason", "")
            }), 200
    except Exception as e:
        print(f"⚠️ detect_funnel_prompt error: {e}")

    return jsonify({"is_funnel": False, "reason": "", "confidence": 0}), 200
