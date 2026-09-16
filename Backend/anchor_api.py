"""
Anchor Questions API
Global pool of anchor questions — each funnel owns one, can attach many from other funnels.
Anchor = gate/key that routes a failed-funnel respondent into the funnel that owns the anchor.
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from datetime import datetime, timezone
from mongodb_config import db
from auth_middleware import requireAuth
import uuid
import os
import requests as http_requests
import json

anchor_bp = Blueprint("anchor_bp", __name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://dashboard.pepperwahl.com",
    "https://pepperwahl.com",
    "https://survey.pepperwahl.com",
]


# ═══════════════════════════════════════════════════════
#  LIST ALL ANCHOR QUESTIONS (platform-wide)
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/anchor-questions", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def list_anchor_questions():
    """
    Return every anchor question in the platform.
    Combines:
    1. Questions registered in the anchor_questions collection (new system)
    2. Questions with is_anchor=True on survey question documents (old/manual system)
    Deduplicates by anchor_id or question_id.
    """
    if request.method == "OPTIONS":
        return "", 200

    search = request.args.get("search", "").strip()

    query: dict = {}
    if search:
        query["$or"] = [
            {"question_text":      {"$regex": search, "$options": "i"}},
            {"owner_funnel_name":  {"$regex": search, "$options": "i"}},
            {"source_survey_name": {"$regex": search, "$options": "i"}},
        ]

    # ── Source 1: registered anchor_questions collection ──
    registered = list(db.anchor_questions.find(query).sort("created_at", -1).limit(200))
    for a in registered:
        a["_id"] = str(a["_id"])

    registered_ids = {a["anchor_id"] for a in registered}

    # ── Source 2: is_anchor=True on survey question documents ──
    # These are manually marked questions that haven't been registered yet
    survey_filter: dict = {"questions": {"$elemMatch": {"is_anchor": True}}}
    if search:
        survey_filter["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"questions.question": {"$regex": search, "$options": "i"}},
        ]

    surveys_with_anchor = list(db.surveys.find(
        survey_filter,
        {"id": 1, "short_id": 1, "title": 1, "questions": 1, "funnel_id": 1, "_id": 0}
    ).limit(200))

    manual_anchors = []
    seen_question_ids = set()

    for survey in surveys_with_anchor:
        survey_id    = survey.get("short_id") or survey.get("id", "")
        survey_title = survey.get("title") or survey_id
        funnel_id    = survey.get("funnel_id", "")

        # Look up funnel name
        owner_funnel_name = ""
        if funnel_id:
            f = db.funnels.find_one({"funnel_id": funnel_id}, {"name": 1})
            owner_funnel_name = f.get("name", "") if f else ""

        for q in survey.get("questions", []):
            if not isinstance(q, dict) or not q.get("is_anchor"):
                continue

            q_id = q.get("id", "")
            if q_id in seen_question_ids:
                continue
            seen_question_ids.add(q_id)

            # Skip if already in registered (by source_question_id match)
            already = any(
                a.get("source_question_id") == q_id
                for a in registered
            )
            if already:
                continue

            manual_anchors.append({
                "anchor_id":           f"manual_{q_id}",
                "owner_funnel_id":     funnel_id or "",
                "owner_funnel_name":   owner_funnel_name,
                "question_text":       q.get("question", ""),
                "options":             q.get("options") or [],
                "correct_answers":     q.get("anchor_correct_answers") or [],
                "source_survey_id":    survey_id,
                "source_survey_name":  survey_title,
                "source_question_id":  q_id,
                "is_manual":           True,
            })

    all_anchors = registered + manual_anchors
    return jsonify({"anchor_questions": all_anchors, "total": len(all_anchors)}), 200


# ═══════════════════════════════════════════════════════
#  GET ONE ANCHOR QUESTION
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/anchor-questions/<anchor_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_anchor_question(anchor_id):
    if request.method == "OPTIONS":
        return "", 200

    anchor = db.anchor_questions.find_one({"anchor_id": anchor_id})
    if not anchor:
        return jsonify({"error": "Anchor question not found"}), 404

    anchor["_id"] = str(anchor["_id"])
    return jsonify(anchor), 200


# ═══════════════════════════════════════════════════════
#  GET ANCHOR QUESTION OWNED BY A FUNNEL
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/anchor-questions/funnel/<funnel_id>", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_funnel_anchor(funnel_id):
    """Return the anchor question owned by (created for) this funnel."""
    if request.method == "OPTIONS":
        return "", 200

    anchor = db.anchor_questions.find_one({"owner_funnel_id": funnel_id})
    if not anchor:
        return jsonify({"anchor": None}), 200

    anchor["_id"] = str(anchor["_id"])
    return jsonify({"anchor": anchor}), 200


# ═══════════════════════════════════════════════════════
#  CREATE / UPDATE AN ANCHOR QUESTION
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/anchor-questions", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def create_anchor_question():
    """
    Create a new anchor question or update the existing one for a funnel.
    Called:
      - Automatically at funnel generation time
      - Manually when a user marks a question as anchor in the survey editor
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    owner_funnel_id   = data.get("owner_funnel_id", "").strip()
    question_text     = data.get("question_text", "").strip()
    options           = data.get("options", [])
    correct_answers   = data.get("correct_answers", [])
    source_survey_id  = data.get("source_survey_id", "").strip()
    source_survey_name = data.get("source_survey_name", "").strip()
    source_question_id = data.get("source_question_id", "").strip()

    if not owner_funnel_id or not question_text:
        return jsonify({"error": "owner_funnel_id and question_text are required"}), 400

    # Look up funnel name
    funnel = db.funnels.find_one({"funnel_id": owner_funnel_id}, {"name": 1})
    owner_funnel_name = funnel.get("name", owner_funnel_id) if funnel else owner_funnel_id

    existing = db.anchor_questions.find_one({"owner_funnel_id": owner_funnel_id})

    if existing:
        # Update in place
        db.anchor_questions.update_one(
            {"owner_funnel_id": owner_funnel_id},
            {"$set": {
                "question_text":      question_text,
                "options":            options,
                "correct_answers":    correct_answers,
                "source_survey_id":   source_survey_id,
                "source_survey_name": source_survey_name,
                "source_question_id": source_question_id,
                "owner_funnel_name":  owner_funnel_name,
                "updated_at":         datetime.now(timezone.utc).isoformat(),
            }}
        )
        anchor_id = existing["anchor_id"]
    else:
        anchor_id = f"anc_{uuid.uuid4().hex[:12]}"
        db.anchor_questions.insert_one({
            "anchor_id":           anchor_id,
            "owner_funnel_id":     owner_funnel_id,
            "owner_funnel_name":   owner_funnel_name,
            "question_text":       question_text,
            "options":             options,
            "correct_answers":     correct_answers,
            "source_survey_id":    source_survey_id,
            "source_survey_name":  source_survey_name,
            "source_question_id":  source_question_id,
            "created_at":          datetime.now(timezone.utc).isoformat(),
            "updated_at":          datetime.now(timezone.utc).isoformat(),
        })

    # Also update own_anchor_id on the funnel document
    db.funnels.update_one(
        {"funnel_id": owner_funnel_id},
        {"$set": {"own_anchor_id": anchor_id}}
    )

    return jsonify({"anchor_id": anchor_id, "success": True}), 200


# ═══════════════════════════════════════════════════════
#  UPDATE ATTACHED ANCHORS ON A FUNNEL (with priorities)
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/funnels/<funnel_id>/attached-anchors", methods=["PUT", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def update_attached_anchors(funnel_id):
    """
    Save the list of anchor questions attached to this funnel, with priorities.
    attached_anchors: [{ anchor_id, priority, owner_funnel_id, owner_funnel_name }]
    Priority 1 = highest (checked first when multiple qualify).
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    attached = data.get("attached_anchors", [])

    # Validate and clean — BLOCK self-attachment
    cleaned = []
    for item in attached:
        anchor_id = str(item.get("anchor_id", "")).strip()
        if not anchor_id:
            continue
        anchor_doc = db.anchor_questions.find_one({"anchor_id": anchor_id})
        if not anchor_doc:
            continue
        # Prevent a funnel attaching its own anchor to itself
        if anchor_doc.get("owner_funnel_id") == funnel_id:
            print(f"⚓ [AttachedAnchors] Blocked self-attachment of {anchor_id} to its own funnel {funnel_id}")
            continue
        cleaned.append({
            "anchor_id":         anchor_id,
            "priority":          int(item.get("priority", len(cleaned) + 1)),
            "owner_funnel_id":   anchor_doc.get("owner_funnel_id", ""),
            "owner_funnel_name": anchor_doc.get("owner_funnel_name", ""),
            "question_text":     anchor_doc.get("question_text", ""),
            "correct_answers":   anchor_doc.get("correct_answers", []),
        })

    # Sort by priority ascending
    cleaned.sort(key=lambda x: x["priority"])

    db.funnels.update_one(
        {"funnel_id": funnel_id},
        {"$set": {
            "attached_anchors": cleaned,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # ── Inject newly attached anchor questions into this funnel's surveys ──
    # So when a user takes this funnel's surveys, the attached anchor questions
    # are present and their answers get captured for later evaluation.
    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if funnel:
        existing_router_ids = list(funnel.get("router_survey_ids", []))
        screening_surveys = funnel.get("screening_surveys", [])
        generated_surveys = funnel.get("generated_surveys", [])
        screening_ids = [s["survey_id"] for s in screening_surveys]
        if not screening_ids:
            screening_ids = [s["survey_id"] for s in generated_surveys if s.get("type") == "screening"]

        for entry in cleaned:
            anchor_doc = db.anchor_questions.find_one({"anchor_id": entry["anchor_id"]})
            if not anchor_doc:
                continue
            anchor_cfg = {
                "question_text":   anchor_doc["question_text"],
                "options":         anchor_doc.get("options", []),
                "correct_answers": anchor_doc.get("correct_answers", []),
            }
            import random as _random
            # Inject into a random subset of screening surveys that don't already have it
            to_inject = []
            for sid in screening_ids:
                s_doc = db.surveys.find_one(
                    {"$or": [{"id": sid}, {"short_id": sid}]},
                    {"questions": 1}
                )
                if s_doc:
                    # Check if this specific anchor question is already there
                    already = any(
                        isinstance(q, dict) and q.get("is_anchor") and
                        q.get("anchor_correct_answers") == anchor_doc.get("correct_answers", [])
                        for q in s_doc.get("questions", [])
                    )
                    if not already:
                        to_inject.append(sid)

            if to_inject:
                count = 1  # inject into exactly one survey
                targets = _random.sample(to_inject, min(count, len(to_inject)))
                for sid in targets:
                    # Final guard — check by question text too to prevent duplicates
                    s_doc = db.surveys.find_one(
                        {"$or": [{"id": sid}, {"short_id": sid}]},
                        {"questions": 1}
                    )
                    if s_doc:
                        already_by_text = any(
                            isinstance(q, dict) and
                            (q.get("is_anchor") or
                             q.get("question", "").strip().lower() == anchor_cfg["question_text"].strip().lower())
                            for q in s_doc.get("questions", [])
                        )
                        if already_by_text:
                            print(f"⚓ [AttachedAnchors] Skipping {sid} — anchor already present")
                            continue
                    from anchor_api import _inject_anchor_question
                    _inject_anchor_question(sid, anchor_cfg, anchor_doc.get("source_question_id", ""))
                    if sid not in existing_router_ids:
                        existing_router_ids.append(sid)
        # Update router_survey_ids
        db.funnels.update_one(
            {"funnel_id": funnel_id},
            {"$set": {"router_survey_ids": existing_router_ids}}
        )

    return jsonify({"success": True, "attached_anchors": cleaned}), 200


# ═══════════════════════════════════════════════════════
#  REGISTER ANCHOR FROM SURVEY EDITOR (is_anchor save hook)
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/anchor-questions/from-survey-editor", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def register_anchor_from_editor():
    """
    Called when a user marks a question as anchor in the Survey Editor and saves.
    Finds the funnel this survey belongs to (if any), then upserts into anchor_questions.
    If the survey belongs to no funnel — still registers the anchor but owner_funnel_id = None,
    so it can be attached to a funnel later.
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    survey_id         = data.get("survey_id", "").strip()
    question_id       = data.get("question_id", "").strip()
    question_text     = data.get("question_text", "").strip()
    options           = data.get("options", [])
    correct_answers   = data.get("correct_answers", [])
    is_removing       = data.get("is_removing", False)  # True when is_anchor toggled OFF

    if not survey_id or not question_id:
        return jsonify({"error": "survey_id and question_id are required"}), 400

    # Find survey
    survey_doc = db.surveys.find_one({"$or": [{"id": survey_id}, {"short_id": survey_id}]})
    if not survey_doc:
        return jsonify({"error": "Survey not found"}), 404

    survey_title   = survey_doc.get("title", survey_id)
    funnel_id      = survey_doc.get("funnel_id", "")
    owner_funnel_name = ""

    if funnel_id:
        funnel = db.funnels.find_one({"funnel_id": funnel_id}, {"name": 1})
        owner_funnel_name = funnel.get("name", funnel_id) if funnel else funnel_id

    if is_removing:
        # Remove from anchor_questions if this question was the source
        db.anchor_questions.delete_one({
            "source_question_id": question_id,
            "owner_funnel_id": funnel_id or {"$exists": False}
        })
        return jsonify({"success": True, "removed": True}), 200

    # Upsert
    existing = db.anchor_questions.find_one({
        "source_question_id": question_id,
        "owner_funnel_id": funnel_id if funnel_id else None
    }) if funnel_id else None

    # If no funnel-specific anchor exists, check by funnel ownership
    if not existing and funnel_id:
        existing = db.anchor_questions.find_one({"owner_funnel_id": funnel_id})

    if existing:
        db.anchor_questions.update_one(
            {"anchor_id": existing["anchor_id"]},
            {"$set": {
                "question_text":       question_text,
                "options":             options,
                "correct_answers":     correct_answers,
                "source_question_id":  question_id,
                "source_survey_id":    survey_id,
                "source_survey_name":  survey_title,
                "owner_funnel_name":   owner_funnel_name,
                "updated_at":          datetime.now(timezone.utc).isoformat(),
            }}
        )
        anchor_id = existing["anchor_id"]
    else:
        anchor_id = f"anc_{uuid.uuid4().hex[:12]}"
        db.anchor_questions.insert_one({
            "anchor_id":           anchor_id,
            "owner_funnel_id":     funnel_id or None,
            "owner_funnel_name":   owner_funnel_name,
            "question_text":       question_text,
            "options":             options,
            "correct_answers":     correct_answers,
            "source_survey_id":    survey_id,
            "source_survey_name":  survey_title,
            "source_question_id":  question_id,
            "created_at":          datetime.now(timezone.utc).isoformat(),
            "updated_at":          datetime.now(timezone.utc).isoformat(),
        })

    if funnel_id:
        db.funnels.update_one(
            {"funnel_id": funnel_id},
            {"$set": {"own_anchor_id": anchor_id}}
        )

    return jsonify({"anchor_id": anchor_id, "success": True}), 200


# ═══════════════════════════════════════════════════════
#  AI GENERATE ANCHOR QUESTION (kept from old system)
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/anchor-questions/generate", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def generate_anchor_question_ai():
    """
    Generate an anchor question from a plain-language description using AI.
    Returns question_text, options, suggested_correct_answers.
    """
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    description  = data.get("description", "").strip()
    funnel_goal  = data.get("funnel_goal", "").strip()

    if not description:
        return jsonify({"error": "description is required"}), 400

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "AI service not configured"}), 503

    prompt = f"""Generate a survey anchor question based on this description:
"{description}"

Funnel context: {funnel_goal or "General funnel"}

Return ONLY valid JSON:
{{
  "question_text": "The exact question text",
  "options": ["Option A", "Option B", "Option C"],
  "suggested_correct_answers": ["Option A"]
}}

Rules:
- question_text must be a clear, natural survey question
- options: 2-5 choices, mutually exclusive
- suggested_correct_answers: which options indicate the user qualifies
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
#  INJECT ANCHOR INTO EXISTING FUNNEL SURVEYS
# ═══════════════════════════════════════════════════════

@anchor_bp.route("/api/funnels/<funnel_id>/inject-anchor", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def inject_anchor_into_funnel(funnel_id):
    """
    Injects the funnel's own anchor question into its screening surveys.
    Used for existing funnels that were created before the anchor system.
    Distributes randomly across screening surveys (same as generation-time logic).
    Skips surveys that already have the anchor injected.
    """
    if request.method == "OPTIONS":
        return "", 200

    funnel = db.funnels.find_one({"funnel_id": funnel_id})
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404

    own_anchor_id = funnel.get("own_anchor_id")
    if not own_anchor_id:
        return jsonify({"error": "This funnel has no owned anchor question. Create one first via the Router Surveys tab."}), 400

    anchor_doc = db.anchor_questions.find_one({"anchor_id": own_anchor_id})
    if not anchor_doc:
        return jsonify({"error": "Anchor question document not found"}), 404

    anchor_config = {
        "question_text":  anchor_doc["question_text"],
        "options":        anchor_doc.get("options", []),
        "correct_answers": anchor_doc.get("correct_answers", []),
    }

    # Get all screening surveys
    screening_surveys = funnel.get("screening_surveys", [])
    generated = funnel.get("generated_surveys", [])

    # Build list of survey ids for screening surveys
    screening_ids = [s["survey_id"] for s in screening_surveys]
    if not screening_ids:
        # fallback to generated_surveys
        screening_ids = [s["survey_id"] for s in generated if s.get("type") == "screening"]

    if not screening_ids:
        return jsonify({"error": "No screening surveys found in this funnel"}), 400

    # Skip surveys that already have an anchor question
    to_inject = []
    for sid in screening_ids:
        survey_doc = db.surveys.find_one(
            {"$or": [{"id": sid}, {"short_id": sid}]},
            {"questions": 1}
        )
        if survey_doc:
            already_has = any(
                isinstance(q, dict) and q.get("is_anchor")
                for q in survey_doc.get("questions", [])
            )
            if not already_has:
                to_inject.append(sid)

    if not to_inject:
        return jsonify({"message": "Anchor question already injected in all screening surveys", "injected": 0}), 200

    # Inject into exactly ONE randomly chosen survey that doesn't already have it
    import random as _random
    inject_count = 1
    targets = _random.sample(to_inject, min(inject_count, len(to_inject)))

    router_survey_ids = list(funnel.get("router_survey_ids", []))

    for sid in targets:
        _inject_anchor_question(sid, anchor_config, anchor_doc.get("source_question_id", ""))
        if sid not in router_survey_ids:
            router_survey_ids.append(sid)

    # Update funnel's router_survey_ids and generated_surveys is_router flag
    updated_generated = []
    for gs in generated:
        entry = dict(gs)
        if entry.get("survey_id") in targets:
            entry["is_router"] = True
        updated_generated.append(entry)

    updated_screening = []
    for ss in screening_surveys:
        entry = dict(ss)
        if entry.get("survey_id") in targets:
            entry["is_router"] = True
        updated_screening.append(entry)

    db.funnels.update_one(
        {"funnel_id": funnel_id},
        {"$set": {
            "router_survey_ids": router_survey_ids,
            "generated_surveys": updated_generated,
            "screening_surveys": updated_screening,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # Also update anchor_questions with injected survey ids
    all_injected = list(set(
        list(anchor_doc.get("injected_survey_ids", [])) + targets
    ))
    db.anchor_questions.update_one(
        {"anchor_id": own_anchor_id},
        {"$set": {"injected_survey_ids": all_injected}}
    )

    print(f"✅ [Anchor] Injected into {inject_count} survey(s) for funnel {funnel_id}: {targets}")

    return jsonify({
        "success": True,
        "injected_count": inject_count,
        "injected_survey_ids": targets,
        "message": f"Anchor question injected into {inject_count} screening survey(s)"
    }), 200


def _inject_anchor_question(survey_id: str, anchor_config: dict, source_question_id: str = "") -> None:
    """Append anchor question to end of a survey."""
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
        "is_anchor": True,
        "anchor_correct_answers": anchor_config.get("correct_answers", []),
        "source_question_id": source_question_id,
        "show_if": None,
        "allowMultiple": False,
    }
    db.surveys.update_one(
        {"$or": [{"id": survey_id}, {"short_id": survey_id}]},
        {"$push": {"questions": anchor_question}}
    )
    print(f"✅ [Anchor] Injected anchor '{anchor_q_id}' into survey {survey_id}")
