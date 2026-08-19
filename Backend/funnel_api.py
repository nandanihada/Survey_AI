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
Never assume it must be a job funnel. Read what the prompt actually says."""

    analysis_prompt = f"""Analyze this funnel requirement and produce a structured plan.

USER PROMPT:
"{prompt}"
{clarification_context}

STEP 1 — UNDERSTAND THE FUNNEL TYPE
Read the prompt carefully. Identify:
- What is the overall GOAL? (job screening / product discovery / lead gen / course matching / other)
- What are the SCREENING SURVEYS? (surveys everyone goes through first to build a profile)
- What are the DESTINATION SURVEYS? (surveys shown to specific users based on their profile — could be job surveys, product surveys, offer surveys, etc.)
- Are there HARD TERMINATION conditions? (certain answers disqualify the user entirely)
- Can users qualify for MULTIPLE destinations? (cascade on fail, or show multiple)

STEP 2 — RETURN THE PLAN
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
      "name": "Survey name (e.g. Professional Background, Who Are You, Layer 1)",
      "purpose": "What this survey collects and why",
      "estimated_questions": 8,
      "key_topics": ["Topic 1", "Topic 2", "Topic 3"],
      "has_termination": true,
      "termination_condition": "Describe hard disqualifier or null"
    }}
  ],
  "job_profiles": [
    {{
      "id": "unique_id_no_spaces",
      "display_name": "Human-readable name (product, role, tier, program)",
      "match_criteria": "What profile qualifies for this destination — be specific",
      "estimated_survey_questions": 8,
      "key_topics": ["What this destination survey will test/ask"],
      "qualification_flag": "Any special must-have requirement, or null"
    }}
  ],
  "scoring_logic": "Explain how screening answers map to destinations (points, branch conditions, awareness reveals, etc.)",
  "termination_conditions": ["List any hard disqualifiers, or leave empty"],
  "tiebreaker": "What happens when scores tie or multiple destinations qualify",
  "estimated_total_surveys": 4,
  "estimated_total_questions": 40
}}

EXAMPLES OF WHAT TO DO WITH COMPLEX PROMPTS:

Example 1 — Detailed layer-by-layer prompt with branching:
User pastes a document with LAYER 1/2/3/4, branch conditions, redirections.
→ Group LAYER 1, LAYER 2, LAYER 3 into screening_surveys (index 0, 1, 2)
→ Each branch destination (CashBook, Quik2Tally, Workiva OR HDFC/GiveGrants etc.) becomes a job_profile
→ The "branch conditions" become the scoring_logic
→ Any "TERMINATE" or "disqualify" conditions become termination_conditions
→ Return the plan — don't ask questions unless truly impossible to understand

Example 2 — Short vague prompt:
"I want to match people to the right insurance product"
→ This is clear enough. Assume 1-2 screening surveys, 3-4 product destinations
→ Ask one clarifying question: "Which insurance products should users be matched to?"

Example 3 — Product discovery funnel:
"Screen finance professionals and route them to CashBook, Quik2Tally, or Workiva based on their role and pain points"
→ 2-3 screening surveys (who are you, what do you do, what tools/problems)
→ 3 job_profiles: cashbook, quik2tally, workiva
→ Scoring: answers about expense management → cashbook, Tally pain → quik2tally, audit/reporting → workiva
→ Return plan immediately, no clarification needed

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
                "max_tokens": 2500,
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
        args=(job_id, funnel_plan, original_prompt, owner_user_id, api_key),
        daemon=True
    )
    thread.start()

    return jsonify({"job_id": job_id, "status": "running"}), 202


def _run_funnel_generation_bg(job_id, funnel_plan, original_prompt, owner_user_id, api_key):
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
                    questions_asked_so_far.append({"topic": q.get("question", "")[:80], "survey": s_meta["name"]})
                screening_survey_ids.append({"survey_id": survey_doc["id"], "name": s_meta["name"], "index": s_meta["index"], "purpose": s_meta["purpose"]})
                generated_surveys.append({"type": "screening", "index": s_meta["index"], "survey_id": survey_doc["id"], "name": s_meta["name"], "question_count": len(survey_doc.get("questions", []))})
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
        try:
            scoring_matrix = _generate_scoring_matrix(api_key=api_key, funnel_plan=funnel_plan, screening_survey_ids=screening_survey_ids, original_prompt=original_prompt)
            _apply_scoring_to_surveys(scoring_matrix, screening_survey_ids)
            print(f"✅ [BG Funnel] Scoring matrix applied")
        except Exception as e:
            errors.append(f"Scoring matrix: {e}")
            print(f"⚠️ [BG Funnel] Scoring matrix error: {e}")

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
            "generation_errors": errors
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

    prompt = f"""Generate a survey for a multi-survey funnel. Return ONLY valid JSON.

Funnel type: {funnel_plan.get('funnel_type', 'general')}
Funnel goal: {funnel_plan.get('goal', '')}

This specific survey:
Name: {survey_name}
Purpose: {survey_purpose}
Key topics to cover: {', '.join(key_topics)}
Survey type: {survey_type}  (screening = everyone takes it, job = only matched users take it)
{"Destination ID this survey qualifies for: " + job_id if job_id else ""}
{qualification_note}

{"Destination profiles in this funnel (for context):" + chr(10) + job_profiles_summary if job_profiles_summary else ""}
{termination_note}
{already_asked_note}

CRITICAL INSTRUCTION — USER'S OWN QUESTIONS:
The original user prompt may already contain specific questions with answer options.
If it does, you MUST use those exact questions and options for this survey.
Do NOT invent new questions when the user has already written them.

Rules:
1. If the original prompt contains questions relevant to this survey's purpose → extract and use them EXACTLY (same wording, same options)
2. Only add new questions if the user's prompt doesn't cover enough for this survey's purpose
3. Keep the total between 5-15 questions
4. Preserve the user's exact answer options — don't paraphrase or reorder them

For SCREENING surveys:
- role="screen" with screening_rule ONLY for questions explicitly listed as hard termination conditions in the prompt
  Examples of valid screen questions: "Age under 18 → disqualify", "No experience → terminate", "Not in target country → end"
  DO NOT mark preference, interest, or opinion questions as screening — those are scoring questions
- role="score" or role="both" for questions that signal which destination fits the user
- role="neutral" for demographic/background questions that inform context but don't score or screen
- Include a mix of types: multiple_choice, yes_no, dropdown, multi_select

For DESTINATION/JOB surveys:
- All questions are role="neutral" (AI evaluates answers holistically)
- These test actual competency for the destination, not background
- Use the user's specific questions from the relevant branch/layer of their prompt

Original user prompt (extract questions from here):
{original_prompt[:8000]}

Return this exact JSON structure:
{{
  "title": "{survey_name}",
  "questions": [
    {{
      "id": "q1",
      "question": "Exact question text from user's prompt or new question",
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
- Preference questions, interest questions, tool usage questions = role="score", screening_rule=null
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
    questions = survey_data.get("questions", [])

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

            if not is_explicit and not explicit_termination_keywords:
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
    survey_id = f"fnl_{funnel_id}_{job_id or f'screening_{layer_index}'}_{uuid.uuid4().hex[:6]}"

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
    for every job profile. Returns a map of survey_id → question_id → answer → {job_id: points}
    """
    # Collect all questions from all screening surveys
    all_questions_summary = []
    for s_info in screening_survey_ids:
        s_doc = db.surveys.find_one({"id": s_info["survey_id"]})
        if not s_doc:
            continue
        for q in s_doc.get("questions", []):
            if q.get("funnel_role") in ("score", "both") and q.get("options"):
                all_questions_summary.append({
                    "survey_id": s_info["survey_id"],
                    "question_id": q["id"],
                    "question_text": q.get("question", "")[:80],
                    "options": q.get("options", [])[:10]  # cap at 10 options
                })

    if not all_questions_summary:
        return {}

    job_profiles = funnel_plan.get("job_profiles", [])
    job_ids = [p["id"] for p in job_profiles]
    job_descriptions = "\n".join(
        f"  {p['id']}: {p['display_name']} — {p['match_criteria']}"
        for p in job_profiles
    )

    questions_json = json.dumps(all_questions_summary[:50], indent=2)  # cap at 50 questions

    prompt = f"""Assign scoring points to survey answer options for a funnel.

Funnel goal: {funnel_plan.get('goal', 'Match users to the best destination')}

Destinations to score for (these can be jobs, products, programs, tiers, or anything):
{job_descriptions}

Survey questions and their answer options:
{questions_json}

For each answer option in each question, assign points (0-5) for each destination.
- 5 = strong signal this person matches that destination
- 3 = moderate signal  
- 1 = weak signal
- 0 = no relevance to that destination

Think carefully about what each answer implies about fit for each destination.
Examples:
- "I use Tally daily" → high score for a Tally-related product destination
- "I manage employee expenses" → high score for expense management product destination
- "I work in audit" → high score for audit/reporting destination
- "I'm in banking/finance" → high score for finance-related destination

Return ONLY valid JSON in this exact structure:
{{
  "scoring_matrix": [
    {{
      "survey_id": "survey_id_here",
      "question_id": "q1",
      "option_scores": {{
        "Option A": {{"dest_id_1": 4, "dest_id_2": 2, "dest_id_3": 1}},
        "Option B": {{"dest_id_1": 0, "dest_id_2": 3, "dest_id_3": 5}}
      }}
    }}
  ]
}}"""

    resp = http_requests.post(
        "https://api.openai.com/v1/chat/completions",
        timeout=45,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 4000,
            "response_format": {"type": "json_object"}
        }
    )

    if resp.status_code != 200:
        raise Exception(f"Scoring matrix API error {resp.status_code}")

    result = json.loads(resp.json()["choices"][0]["message"]["content"])
    return result.get("scoring_matrix", [])


def _apply_scoring_to_surveys(scoring_matrix, screening_survey_ids):
    """Write generated option_scores back into the survey question documents."""
    for entry in scoring_matrix:
        s_id = entry.get("survey_id")
        q_id = entry.get("question_id")
        option_scores = entry.get("option_scores", {})

        if not s_id or not q_id or not option_scores:
            continue

        # Update the specific question's option_scores
        db.surveys.update_one(
            {"id": s_id, "questions.id": q_id},
            {"$set": {"questions.$.option_scores": option_scores}}
        )


# ═══════════════════════════════════════════════════════
#  GET ALL FUNNELS (for funnel surveys tab)
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnels():
    """Get all funnels for the current user."""
    if request.method == "OPTIONS":
        return "", 200

    current_user = g.current_user
    user_id = str(current_user.get("_id", ""))
    is_admin = current_user.get("role") == "admin"

    query = {} if is_admin else {"owner_user_id": user_id}
    funnels = list(db.funnels.find(query).sort("created_at", -1).limit(100))

    result = []
    for f in funnels:
        f["_id"] = str(f["_id"])
        result.append({
            "funnel_id": f.get("funnel_id"),
            "name": f.get("name"),
            "goal": f.get("goal"),
            "status": f.get("status", "active"),
            "created_at": f.get("created_at"),
            "screening_surveys": f.get("screening_surveys", []),
            "job_surveys": f.get("job_surveys", {}),
            "generated_surveys": f.get("generated_surveys", []),
            "total_surveys": len(f.get("generated_surveys", []))
        })

    return jsonify({"funnels": result, "total": len(result)}), 200


# ═══════════════════════════════════════════════════════
#  GET SINGLE FUNNEL DETAIL
# ═══════════════════════════════════════════════════════

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
        "job_surveys", "job_priority_order", "status"
    ]
    update = {k: data[k] for k in allowed_fields if k in data}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.funnels.update_one({"funnel_id": funnel_id}, {"$set": update})
    return jsonify({"success": True}), 200


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
    """Get all sessions for a funnel — for admin tracking tab."""
    if request.method == "OPTIONS":
        return "", 200

    sessions = list(
        db.funnel_sessions.find({"funnel_id": funnel_id})
        .sort("updated_at", -1)
        .limit(500)
    )
    for s in sessions:
        s["_id"] = str(s["_id"])

    return jsonify({"sessions": sessions, "total": len(sessions)}), 200


# ═══════════════════════════════════════════════════════
#  REPAIR: fix yes_no questions missing options in funnel surveys
# ═══════════════════════════════════════════════════════

@funnel_bp.route("/api/funnels/repair-questions", methods=["POST", "OPTIONS"])
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
    scoreable_questions = [q for q in questions if q.get("options") and len(q.get("options", [])) > 0]

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
