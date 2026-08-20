"""
Funnel Scoring Engine
Handles per-answer scoring, screening checks, job queue building,
cascade logic, and AI-based job survey evaluation.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from mongodb_config import db
import os
import json
import requests as http_requests
import uuid


# ─────────────────────────────────────────────
#  SCREENING CHECK
# ─────────────────────────────────────────────

def _ensure_https(url: str) -> str:
    """Ensure a URL has a scheme. Adds https:// if missing."""
    if not url:
        return url
    url = url.strip()
    if url and not url.startswith(("http://", "https://")):
        return "https://" + url
    return url


# ─────────────────────────────────────────────
#  SCREENING CHECK
# ─────────────────────────────────────────────

def run_screening_check(questions: List[dict], answers: Dict[str, str]) -> dict:
    """
    Check all screening questions in a survey against the user's answers.
    Returns {"passed": True} or {"passed": False, "reason": "...", "question_id": "..."}
    Screening runs BEFORE scoring — one hard-fail stops everything.
    """
    HARD_DISQUALIFY_WORDS = ["age", "18", "21", "legal", "citizen", "authorized", "eligible",
                             "criminal", "felony", "license", "certified", "visa", "permit"]

    for q in questions:
        role = q.get("funnel_role", "neutral")  # screen | score | both | neutral
        if role not in ("screen", "both"):
            continue

        screen_rule = q.get("screening_rule")
        if not screen_rule or not screen_rule.get("enabled"):
            continue

        # Safety guard: never terminate on a yes/no question unless it's a hard legal/eligibility check
        q_type = q.get("type", "")
        q_text_lower = q.get("question", "").lower()
        if q_type == "yes_no" and not any(w in q_text_lower for w in HARD_DISQUALIFY_WORDS):
            continue  # Treat as scoring question, not a hard screen

        q_id = q.get("id", "")
        answer = answers.get(q_id)
        if answer is None:
            continue

        fail_condition = screen_rule.get("fail_condition", "equals")
        fail_value = screen_rule.get("fail_value", "")

        failed = False
        if fail_condition == "equals":
            failed = str(answer).strip().lower() == str(fail_value).strip().lower()
        elif fail_condition == "in":
            fail_values = fail_value if isinstance(fail_value, list) else [fail_value]
            failed = str(answer).strip().lower() in [str(v).strip().lower() for v in fail_values]
        elif fail_condition == "not_equals":
            failed = str(answer).strip().lower() != str(fail_value).strip().lower()

        if failed:
            return {
                "passed": False,
                "reason": screen_rule.get("fail_reason", f"Answer '{answer}' failed screening on question {q_id}"),
                "question_id": q_id
            }

    return {"passed": True}

    return {"passed": True}


# ─────────────────────────────────────────────
#  SCORE CALCULATION
# ─────────────────────────────────────────────

def calculate_scores_from_answers(questions: List[dict], answers: Dict[str, str]) -> Dict[str, float]:
    """
    Sum up job profile points from all answered (visible) questions.
    Only questions with role 'score' or 'both' contribute points.
    Multi-select answers (stored as comma-separated) are split and each option scored.
    """
    totals: Dict[str, float] = {}

    for q in questions:
        role = q.get("funnel_role", "neutral")
        if role not in ("score", "both"):
            continue

        q_id = q.get("id", "")
        answer = answers.get(q_id)
        if answer is None or answer == "":
            continue

        option_scores: Dict[str, Dict[str, float]] = q.get("option_scores", {})
        if not option_scores:
            continue

        # Handle multi-select (comma-separated answers)
        selected = [a.strip() for a in str(answer).split(",") if a.strip()]

        for sel in selected:
            # Try exact match first, then case-insensitive
            matched_key = None
            if sel in option_scores:
                matched_key = sel
            else:
                for k in option_scores:
                    if k.strip().lower() == sel.lower():
                        matched_key = k
                        break

            if matched_key:
                for job_id, pts in option_scores[matched_key].items():
                    totals[job_id] = totals.get(job_id, 0.0) + float(pts)

    return totals


# ─────────────────────────────────────────────
#  ACCUMULATE INTO FUNNEL SESSION
# ─────────────────────────────────────────────

def accumulate_scores(funnel_session_id: str, new_scores: Dict[str, float]) -> Dict[str, float]:
    """
    Add new_scores on top of whatever is already in the funnel session.
    Returns the updated cumulative scores.
    """
    session = db.funnel_sessions.find_one({"funnel_session_id": funnel_session_id})
    if not session:
        cumulative = {}
    else:
        cumulative = session.get("cumulative_scores", {})

    for job_id, pts in new_scores.items():
        cumulative[job_id] = cumulative.get(job_id, 0.0) + pts

    db.funnel_sessions.update_one(
        {"funnel_session_id": funnel_session_id},
        {"$set": {"cumulative_scores": cumulative, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return cumulative


# ─────────────────────────────────────────────
#  BUILD JOB QUEUE
# ─────────────────────────────────────────────

def build_job_queue(cumulative_scores: Dict[str, float], funnel_config: dict) -> List[str]:
    """
    Sort job profiles by score descending.
    Optionally filter out jobs below min_score threshold.
    Returns ordered list of job_ids e.g. ["hdfc", "avaada", "give_grants", "hclfoundation"]
    """
    job_surveys = funnel_config.get("job_surveys", {})
    min_threshold = funnel_config.get("min_score_threshold", 0)
    priority_order = funnel_config.get("job_priority_order", list(job_surveys.keys()))

    eligible = []
    for job_id in priority_order:
        score = cumulative_scores.get(job_id, 0.0)
        if score >= min_threshold and job_id in job_surveys:
            eligible.append((job_id, score))

    # Sort by score desc, use priority_order index as tiebreaker
    eligible.sort(key=lambda x: (-x[1], priority_order.index(x[0]) if x[0] in priority_order else 99))
    return [job_id for job_id, _ in eligible]


# ─────────────────────────────────────────────
#  AI JOB SURVEY EVALUATION
# ─────────────────────────────────────────────

def ai_evaluate_job_survey(
    job_id: str,
    job_criteria: str,
    job_answers: Dict[str, str],
    funnel_context: dict,
    job_questions: List[dict]
) -> dict:
    """
    Ask GPT to evaluate whether the user passes the job-specific survey.
    Gets full funnel context (all previous answers + cumulative scores) for smarter decisions.
    Returns {"verdict": "pass"|"fail", "reason": "...", "confidence": 0-100}
    """
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        # Fallback: simple threshold-based pass if no AI key
        return {"verdict": "pass", "reason": "AI unavailable — auto-pass", "confidence": 50}

    # Build a readable answer summary for the job survey
    answer_lines = []
    for q in job_questions:
        q_id = q.get("id", "")
        q_text = q.get("question", q_id)[:80]
        answer = job_answers.get(q_id, "(not answered)")
        answer_lines.append(f"  Q: {q_text}\n  A: {answer}")
    answers_summary = "\n".join(answer_lines)

    # Build cumulative context from screening surveys
    screening_context_lines = []
    for layer in funnel_context.get("layers_completed", []):
        if layer.get("phase") == "screening":
            for q_id, ans in layer.get("answers", {}).items():
                screening_context_lines.append(f"  {q_id}: {ans}")
    screening_summary = "\n".join(screening_context_lines) if screening_context_lines else "  (none)"

    scores = funnel_context.get("cumulative_scores", {})
    scores_summary = ", ".join(f"{k}: {v:.0f}" for k, v in scores.items())

    failed_jobs = funnel_context.get("failed_jobs", [])
    failed_summary = ", ".join(failed_jobs) if failed_jobs else "none"

    prompt = f"""You are evaluating a job applicant for the role: {job_id.upper().replace('_', ' ')}

Qualification criteria for this role:
"{job_criteria}"

Applicant's answers for this job survey:
{answers_summary}

Screening survey context (background answers):
{screening_summary}

Job match scores: {scores_summary}
Previously failed roles: {failed_summary}

Based on the qualification criteria and the applicant's answers, decide:
- verdict: "pass" if they meet the criteria, "fail" if they don't
- reason: one concise sentence explaining your decision
- confidence: integer 0-100 indicating how confident you are

Be fair but strict. The criteria must be genuinely met, not just partially.

Return ONLY valid JSON, no markdown:
{{"verdict": "pass", "reason": "Candidate has 10+ years with strong MIS and stakeholder management experience", "confidence": 85}}"""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=20,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 200
            }
        )
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            result = json.loads(content.strip())
            return {
                "verdict": result.get("verdict", "fail"),
                "reason": result.get("reason", ""),
                "confidence": result.get("confidence", 70)
            }
    except Exception as e:
        print(f"⚠️ AI job evaluation error: {e}")

    return {"verdict": "fail", "reason": "Evaluation error — defaulting to fail", "confidence": 0}


# ─────────────────────────────────────────────
#  FULL SCREENING SURVEY SUBMISSION PROCESSOR
# ─────────────────────────────────────────────

def process_screening_survey_submission(
    funnel_id: str,
    funnel_session_id: str,
    survey_id: str,
    layer_index: int,
    answers: Dict[str, str],
    user_info: dict
) -> dict:
    """
    Called after a screening survey is submitted.
    1. Run screening check — if fails, return terminate action
    2. Calculate scores from answers
    3. Accumulate into session
    4. If more screening surveys → return next_screening action
    5. If all screening done → build job queue → return go_to_job action
    """
    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return {"action": "error", "message": "Funnel not found"}

    # Get this survey's questions for screening/scoring
    survey_doc = db.surveys.find_one({"$or": [{"id": survey_id}, {"short_id": survey_id}, {"_id": survey_id}]})
    questions = survey_doc.get("questions", []) if survey_doc else []

    # Step 1: Screening check
    screen_result = run_screening_check(questions, answers)
    if not screen_result["passed"]:
        # Save terminate status
        db.funnel_sessions.update_one(
            {"funnel_session_id": funnel_session_id},
            {"$set": {
                "status": "terminated",
                "terminate_reason": screen_result["reason"],
                "terminated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        fallback_url = funnel.get("fallback_url", "")
        return {
            "action": "terminate",
            "reason": screen_result["reason"],
            "redirect_url": _ensure_https(fallback_url)
        }

    # Step 2: Calculate scores
    new_scores = calculate_scores_from_answers(questions, answers)
    print(f"📊 [Funnel] Layer {layer_index} scores: {new_scores}")

    # Step 3: Accumulate
    cumulative = accumulate_scores(funnel_session_id, new_scores)

    # Step 4: Record this layer
    layer_record = {
        "layer": layer_index,
        "phase": "screening",
        "survey_id": survey_id,
        "answers": answers,
        "scores_added": new_scores,
        "screening_passed": True,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    db.funnel_sessions.update_one(
        {"funnel_session_id": funnel_session_id},
        {
            "$push": {"layers_completed": layer_record},
            "$set": {
                "current_layer": layer_index + 1,
                "status": "screening",
                "user_info": user_info,
                "funnel_id": funnel_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    # Step 5: Check if more screening surveys
    screening_surveys = funnel.get("screening_surveys", [])
    next_layer = layer_index + 1

    if next_layer < len(screening_surveys):
        next_survey_id = screening_surveys[next_layer]["survey_id"]
        return {
            "action": "next_screening",
            "next_survey_id": next_survey_id,
            "next_layer": next_layer,
            "funnel_session_id": funnel_session_id,
            "cumulative_scores": cumulative
        }

    # All screening done — build job queue
    job_queue = build_job_queue(cumulative, funnel)
    print(f"🎯 [Funnel] Job queue built: {job_queue}")

    if not job_queue:
        fallback_url = funnel.get("fallback_url", "")
        db.funnel_sessions.update_one(
            {"funnel_session_id": funnel_session_id},
            {"$set": {"status": "no_match", "job_queue": [], "queue_position": 0}}
        )
        return {
            "action": "no_match",
            "redirect_url": _ensure_https(fallback_url),
            "cumulative_scores": cumulative
        }

    # Save queue to session
    db.funnel_sessions.update_one(
        {"funnel_session_id": funnel_session_id},
        {"$set": {
            "job_queue": job_queue,
            "queue_position": 0,
            "status": "job_phase",
            "phase": "job_surveys",
            "cumulative_scores": cumulative
        }}
    )

    first_job = job_queue[0]
    job_config = funnel.get("job_surveys", {}).get(first_job, {})
    first_job_survey_id = job_config.get("survey_id", "")

    return {
        "action": "go_to_job",
        "job_id": first_job,
        "job_survey_id": first_job_survey_id,
        "job_queue": job_queue,
        "queue_position": 0,
        "funnel_session_id": funnel_session_id,
        "cumulative_scores": cumulative
    }


# ─────────────────────────────────────────────
#  JOB SURVEY SUBMISSION PROCESSOR
# ─────────────────────────────────────────────

def process_job_survey_submission(
    funnel_id: str,
    funnel_session_id: str,
    job_id: str,
    answers: Dict[str, str]
) -> dict:
    """
    Called after a job-specific survey is submitted.
    AI evaluates pass/fail. If pass → redirect to job URL.
    If fail → show transition page → move to next job in queue.
    """
    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return {"action": "error", "message": "Funnel not found"}

    session = db.funnel_sessions.find_one({"funnel_session_id": funnel_session_id})
    if not session:
        return {"action": "error", "message": "Session not found"}

    job_config = funnel.get("job_surveys", {}).get(job_id, {})
    job_criteria = job_config.get("pass_criteria", f"Candidate must meet the requirements for {job_id}")

    # Get job survey questions for AI context
    job_survey_id = job_config.get("survey_id", "")
    job_survey_doc = db.surveys.find_one({"$or": [{"id": job_survey_id}, {"short_id": job_survey_id}]})
    job_questions = job_survey_doc.get("questions", []) if job_survey_doc else []

    # Build full funnel context for AI
    funnel_context = {
        "layers_completed": session.get("layers_completed", []),
        "cumulative_scores": session.get("cumulative_scores", {}),
        "failed_jobs": session.get("failed_jobs", [])
    }

    # AI evaluation
    eval_result = ai_evaluate_job_survey(job_id, job_criteria, answers, funnel_context, job_questions)
    print(f"🤖 [Funnel] AI eval for {job_id}: {eval_result['verdict']} ({eval_result['confidence']}%)")

    # Record this job attempt
    job_record = {
        "job_id": job_id,
        "survey_id": job_survey_id,
        "answers": answers,
        "ai_verdict": eval_result["verdict"],
        "ai_reason": eval_result["reason"],
        "ai_confidence": eval_result["confidence"],
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    db.funnel_sessions.update_one(
        {"funnel_session_id": funnel_session_id},
        {"$push": {"job_attempts": job_record}}
    )

    if eval_result["verdict"] == "pass":
        confidence = eval_result["confidence"]  # 0-100

        # ── Threshold-based redirect selection ──────────────────────────────
        # Admin can configure multiple redirect URLs with score thresholds.
        # redirect_rules: [{"operator": ">=", "threshold": 80, "url": "...", "label": "Strong match"},
        #                   {"operator": ">=", "threshold": 60, "url": "...", "label": "Good match"},
        #                   {"operator": "<",  "threshold": 60, "url": "...", "label": "Weak match"}]
        # Rules are evaluated in order — first match wins.
        redirect_rules = job_config.get("redirect_rules", [])
        redirect_url = job_config.get("redirect_url", "")  # fallback single URL

        # ── Ensure URL has a scheme ─────────────────────────────────────────
        redirect_url = _ensure_https(redirect_url)
        redirect_bucket_label = "default"
        redirect_reason = f"AI confidence: {confidence}%"

        if redirect_rules:
            for rule in redirect_rules:
                operator = rule.get("operator", ">=")
                threshold = float(rule.get("threshold", 0))
                rule_url = rule.get("url", "")
                rule_label = rule.get("label", f"{operator}{threshold}%")

                match = False
                if operator == ">=":
                    match = confidence >= threshold
                elif operator == ">":
                    match = confidence > threshold
                elif operator == "<=":
                    match = confidence <= threshold
                elif operator == "<":
                    match = confidence < threshold
                elif operator == "==":
                    match = confidence == threshold

                if match and rule_url:
                    redirect_url = _ensure_https(rule_url)
                    redirect_bucket_label = rule_label
                    redirect_reason = f"Score {confidence}% matched rule: {operator}{threshold}% → {rule_label}"
                    break

        print(f"🎯 [Funnel] Redirect bucket: {redirect_bucket_label} ({redirect_reason})")

        db.funnel_sessions.update_one(
            {"funnel_session_id": funnel_session_id},
            {"$set": {
                "status": "completed",
                "matched_job": job_id,
                "final_redirect_url": redirect_url,
                "redirect_bucket": redirect_bucket_label,
                "redirect_reason": redirect_reason,
                "ai_confidence": confidence,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "action": "pass",
            "job_id": job_id,
            "redirect_url": redirect_url,
            "redirect_bucket": redirect_bucket_label,
            "redirect_reason": redirect_reason,
            "ai_confidence": confidence,
            "ai_reason": eval_result["reason"]
        }

    # FAIL — move to next job in queue
    queue = session.get("job_queue", [])
    current_pos = session.get("queue_position", 0)
    failed_jobs = session.get("failed_jobs", [])
    failed_jobs.append(job_id)
    next_pos = current_pos + 1

    db.funnel_sessions.update_one(
        {"funnel_session_id": funnel_session_id},
        {"$set": {
            "queue_position": next_pos,
            "failed_jobs": failed_jobs
        }}
    )

    if next_pos >= len(queue):
        # All jobs exhausted
        fallback_url = funnel.get("fallback_url", "")
        db.funnel_sessions.update_one(
            {"funnel_session_id": funnel_session_id},
            {"$set": {"status": "no_match", "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {
            "action": "all_failed",
            "redirect_url": _ensure_https(fallback_url),
            "failed_jobs": failed_jobs,
            "ai_reason": eval_result["reason"]
        }

    # There is a next job
    next_job_id = queue[next_pos]
    next_job_config = funnel.get("job_surveys", {}).get(next_job_id, {})
    next_job_survey_id = next_job_config.get("survey_id", "")

    # Get transition page config for the FAILED job
    transition = job_config.get("transition_page", {})
    transition_enabled = transition.get("enabled", True)

    return {
        "action": "next_job",
        "failed_job_id": job_id,
        "next_job_id": next_job_id,
        "next_job_survey_id": next_job_survey_id,
        "queue_position": next_pos,
        "ai_reason": eval_result["reason"],
        "transition_page": {
            "enabled": transition_enabled,
            "heading": transition.get("heading", "We found another opportunity for you!"),
            "message": transition.get("message", "You didn't qualify for this role, but we have another great opportunity that matches your profile."),
            "cta_text": transition.get("cta_text", "See Next Opportunity →"),
            "auto_redirect_seconds": transition.get("auto_redirect_seconds", 5),
            "show_next_job_name": transition.get("show_next_job_name", True),
            "next_job_display_name": next_job_config.get("display_name", next_job_id)
        }
    }
