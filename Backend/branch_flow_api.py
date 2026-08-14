"""
Branch Flow API
Handles branching flow visualization, editing, and survey modes
Supports: Standard, Mid-Survey Redirect, Custom modes
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import json
import hashlib
import hmac
import base64
import os
import requests as http_requests
from mongodb_config import db

branch_flow_bp = Blueprint('branch_flow_bp', __name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pepperadsresponses.web.app",
    "https://hostsliceresponse.web.app",
    "https://theinterwebsite.space",
    "https://dashboard.pepperwahl.com",
    "https://pepperwahl.com",
    "https://survey.pepperwahl.com",
]

RESUME_TOKEN_SECRET = "branch_flow_resume_secret_key_2024"


def find_survey_by_any_id(survey_id: str):
    """Find a survey by short_id, id field, or ObjectId — covers all ID formats."""
    # Try string fields first (fastest, most common)
    survey = db.surveys.find_one({"$or": [
        {"short_id": survey_id},
        {"id": survey_id},
        {"_id": survey_id},
    ]})
    if survey:
        return survey
    # Try ObjectId as last resort
    try:
        survey = db.surveys.find_one({"_id": ObjectId(survey_id)})
    except Exception:
        pass
    return survey


# ═══════════════════════════════════════════════════════
#  PROMPT-BASED BRANCHING EXTRACTION
# ═══════════════════════════════════════════════════════

def parse_branching_instructions_from_prompt(prompt: str, questions: list) -> list:
    """
    Uses GPT to extract redirect/end-survey rules from the user's free-text prompt.

    Detects patterns like:
      - "redirect to https://x.com after question 3 if they answer Yes"
      - "if user says No on Q5 send them to https://y.com"
      - "end the survey after question 4 if they answer Bad"
      - "end survey at Q2 for anyone who answers No"
      - Multiple instructions with multiple URLs in one prompt

    Returns a list of rule dicts to apply to questions:
      [
        {
          "question_ref": "q3",   # id or 1-based number string e.g. "3"
          "type": "redirect",     # "redirect" | "end"
          "url": "https://...",   # only for redirect
          "condition": "always" | "<answer value>",
        },
        ...
      ]
    Returns [] if no branching instructions found.
    """
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        return []

    # Build a compact question list to give GPT context
    q_summary = []
    for i, q in enumerate(questions):
        q_summary.append(f"Q{i+1} (id={q.get('id', f'q{i+1}')}, type={q.get('type','text')}): {q.get('question','')[:80]}")
    q_list_text = "\n".join(q_summary)

    extraction_prompt = f"""You are a survey branching rules extractor.

The user wrote this survey creation prompt:
\"\"\"{prompt}\"\"\"

The generated survey has these questions:
{q_list_text}

Your task: Extract any redirect or end-survey instructions from the prompt.

Look for patterns like:
- "redirect to [URL] after question N"
- "if they answer [X] on question N, send them to [URL]"
- "end the survey after question N if they answer [X]"
- "stop survey at question N for [answer]"
- Multiple URLs / multiple rules in one prompt

For each instruction found, return a JSON object with:
{{
  "question_ref": "N",        // 1-based question number as a string, e.g. "3"
  "type": "redirect",         // "redirect" or "end"
  "url": "https://...",       // only for type=redirect, else omit
  "condition": "always"       // "always" OR the specific answer value (e.g. "Yes", "No", "Bad")
}}

Rules:
- If no URL or end instruction exists in the prompt, return an empty array []
- If a question number is mentioned as "question 3", "Q3", "3rd question", map it to "3"
- If no condition is specified (always redirect), use "always"
- Extract ALL instructions, not just the first one
- Only extract instructions that have a clear question reference

Return ONLY a JSON array. No explanation. No markdown.
Examples:
[] 
[{{"question_ref":"3","type":"redirect","url":"https://offer.com","condition":"Yes"}}]
[{{"question_ref":"5","type":"end","condition":"No"}},{{"question_ref":"2","type":"redirect","url":"https://x.com","condition":"always"}}]
"""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=20,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": extraction_prompt}],
                "temperature": 0.1,
                "max_tokens": 600
            }
        )

        if resp.status_code != 200:
            print(f"⚠️ Branching extraction API error: {resp.status_code}")
            return []

        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        rules = json.loads(content)
        if not isinstance(rules, list):
            return []

        print(f"✅ Extracted {len(rules)} branching instruction(s) from prompt")
        return rules

    except Exception as e:
        print(f"⚠️ parse_branching_instructions_from_prompt error: {e}")
        return []


def apply_prompt_branching_rules(survey_id: str, questions: list, branching_rules: list) -> list:
    """
    Apply extracted branching rules to the questions list and save to DB.

    branching_rules: output of parse_branching_instructions_from_prompt()
    Returns the updated questions list.
    """
    if not branching_rules:
        return questions

    # Build a map: "1" → index 0, "2" → index 1, also "q1" → index 0
    ref_map = {}
    for i, q in enumerate(questions):
        ref_map[str(i + 1)] = i                   # "3" → 2
        ref_map[q.get("id", f"q{i+1}")] = i       # "q3" → 2

    updated = [dict(q) for q in questions]
    applied = 0

    # Group rules by question index so we can handle multiple redirects on the same question
    from collections import defaultdict
    rules_by_idx: dict = defaultdict(list)

    for rule in branching_rules:
        ref = str(rule.get("question_ref", "")).strip().lower().lstrip("q")
        idx = ref_map.get(ref)
        if idx is None:
            print(f"⚠️ Could not find question for ref '{ref}', skipping rule")
            continue
        rules_by_idx[idx].append(rule)

    for idx, idx_rules in rules_by_idx.items():
        redirect_rules = [r for r in idx_rules if r.get("type") == "redirect" and r.get("url")]
        end_rules     = [r for r in idx_rules if r.get("type") == "end"]

        # ── Handle redirects ───────────────────────────────────────────────
        if redirect_rules:
            # Build the multi-config array (supports condition-based branching per answer)
            configs = []
            for r in redirect_rules:
                condition = r.get("condition", "always") or "always"
                configs.append({
                    "enabled": True,
                    "url": r.get("url", ""),
                    "condition": condition,
                    "color": "#f59e0b",
                    "allow_resume": True,
                    "resume_expiry_hours": 24,
                })

            # Primary redirect_config = first rule (for backward compat with old code)
            updated[idx]["redirect_config"] = configs[0]

            # Multi-redirect: store all as redirect_configs array
            updated[idx]["redirect_configs"] = configs

            # Clear stray show_if
            updated[idx]["show_if"] = None

            urls_summary = ", ".join(f"{c['condition']}→{c['url'][:30]}" for c in configs)
            print(f"✅ Applied {len(configs)} redirect rule(s) on Q{idx+1}: {urls_summary}")
            applied += len(configs)

        # ── Handle end-survey ──────────────────────────────────────────────
        if end_rules:
            r = end_rules[0]  # only one end rule makes sense per question
            condition = r.get("condition", "always") or "always"
            updated[idx]["end_here"] = {
                "enabled": True,
                "condition": condition,
            }
            updated[idx]["show_if"] = None
            print(f"✅ Applied end-survey rule: Q{idx+1} (condition: {condition})")
            applied += 1

    if applied > 0:
        # Also clean up any questions that have a broken show_if
        # (depends_on is null/empty — these were AI suggestions that didn't resolve)
        for q in updated:
            si = q.get("show_if")
            if isinstance(si, dict) and not si.get("depends_on"):
                q["show_if"] = None

        # Persist to DB
        db.surveys.update_one(
            {"$or": [{"_id": survey_id}, {"id": survey_id}]},
            {"$set": {"questions": updated, "has_prompt_branching": True}}
        )
        # Regenerate the simple flow so the diagram is immediately correct
        survey_doc = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if survey_doc:
            survey_doc["questions"] = updated
            try:
                flow_config = generate_flow_from_survey(survey_doc, flow_type="simple")
                db.branch_flow_configs.replace_one(
                    {"survey_id": survey_id, "flow_type": "simple"},
                    flow_config,
                    upsert=True
                )
                print(f"✅ Flow diagram regenerated after prompt branching")
            except Exception as fe:
                print(f"⚠️ Flow regeneration failed: {fe}")

        print(f"✅ Applied {applied} branching rule(s) from prompt to survey {survey_id}")

    return updated


# ═══════════════════════════════════════════════════════
#  AI-POWERED BRANCH SUGGESTION
# ═══════════════════════════════════════════════════════

def ai_suggest_branches(questions: list) -> list:
    """
    Call OpenAI to analyze all questions and decide branching logic.
    Supports both single-answer (condition: equals) and multi-answer
    (condition: in, value: [...]) show conditions.
    """
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY", "")
    if not api_key:
        print("⚠️ No OpenAI key - skipping AI branch suggestion")
        return questions

    q_list = []
    for i, q in enumerate(questions):
        q_list.append({
            "id": q.get("id", f"q{i}"),
            "question": q.get("question", ""),
            "type": q.get("type", "text"),
            "options": q.get("options", [])
        })

    prompt = f"""You are a survey branching expert. Given these survey questions, assign show_if conditions to create a complete, logical decision tree.

Questions:
{json.dumps(q_list, indent=2)}

CRITICAL RULES:
1. For every yes_no or multiple_choice question, assign follow-up questions to the answer paths.
   - BOTH "Yes" AND "No" answer paths must each get at least one follow-up question.
   - For multiple_choice questions, group logically related answers together using the "in" condition.
2. Questions of type short_answer, rating, text, scale → show_if = null (always show).
3. A question can only depend on a PREVIOUS question (never a future one).
4. Use "condition: in" with an array when multiple answers should trigger the same question.
   Use "condition: equals" when only one specific answer triggers it.

CONDITION TYPES:
- "equals": show this question only when the answer exactly matches one value
  Example: {{"depends_on": "q1", "condition": "equals", "value": "Yes"}}
- "in": show this question when the answer matches ANY of several values (multi-answer routing)
  Example: {{"depends_on": "q1", "condition": "in", "value": ["Project Manager", "Team Lead", "Director"]}}

EXAMPLE — multiple_choice survey about education sector roles:
- Q1: "What is your role?" (multiple_choice, options: Teacher, Principal, Admin, Researcher, Other)
  → show_if: null (root question)
- Q2: "How many students do you teach?" 
  → show_if: {{"depends_on": "q1", "condition": "in", "value": ["Teacher", "Principal"]}}
  (both teachers AND principals deal with students)
- Q3: "What research topics interest you?"
  → show_if: {{"depends_on": "q1", "condition": "in", "value": ["Researcher", "Other"]}}
- Q4: "What administrative systems do you use?"
  → show_if: {{"depends_on": "q1", "condition": "in", "value": ["Admin", "Principal"]}}

Return a JSON array with show_if for EVERY question:
[
  {{"id": "q1", "show_if": null}},
  {{"id": "q2", "show_if": {{"depends_on": "q1", "condition": "in", "value": ["Teacher", "Principal"]}}}},
  {{"id": "q3", "show_if": {{"depends_on": "q1", "condition": "equals", "value": "No"}}}}
]

RETURN ONLY VALID JSON ARRAY. No explanation. Every question must appear exactly once."""

    try:
        resp = http_requests.post(
            "https://api.openai.com/v1/chat/completions",
            timeout=25,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 2000
            }
        )

        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()

            suggestions = json.loads(content)
            suggestion_map = {s["id"]: s.get("show_if") for s in suggestions}

            # Apply AI suggestions — preserve existing show_if if already set
            enriched = []
            for q in questions:
                q_copy = dict(q)
                q_id = q_copy.get("id", "")
                if q_id in suggestion_map and not q_copy.get("show_if"):
                    q_copy["show_if"] = suggestion_map[q_id]
                enriched.append(q_copy)

            print(f"✅ AI branch suggestions applied to {len(enriched)} questions")
            return enriched
        else:
            print(f"⚠️ AI branch suggestion failed: {resp.status_code} {resp.text[:200]}")
            return questions

    except Exception as e:
        print(f"⚠️ AI branch suggestion error: {e}")
        return questions


# ═══════════════════════════════════════════════════════
#  SIMPLE BRANCHING RULES API (Table-based UI)
# ═══════════════════════════════════════════════════════

@branch_flow_bp.route('/api/surveys/<survey_id>/branching-rules', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_branching_rules(survey_id):
    """Get branching rules in a simple table format for easy editing"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        survey = find_survey_by_any_id(survey_id)
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        questions = survey.get("questions", [])
        
        # Build simple rules list
        rules = []
        for i, q in enumerate(questions):
            try:
                q_id = q.get("id", f"q{i}")
                q_text = q.get("question", "")[:60]
                q_type = q.get("type", "text")
                options = q.get("options") or []
                
                # show_if must be a dict or None — guard against any other type
                show_if = q.get("show_if")
                if not isinstance(show_if, dict):
                    show_if = None
                # Also treat show_if with missing/empty depends_on as null (broken AI suggestion)
                if show_if and not show_if.get("depends_on"):
                    show_if = None
                
                # redirect_config must be a dict or None — guard against null/other
                redirect_config = q.get("redirect_config")
                if not isinstance(redirect_config, dict):
                    redirect_config = {}

                # redirect_configs (multi-condition array) — expose for the UI
                redirect_configs = q.get("redirect_configs")
                if not isinstance(redirect_configs, list):
                    redirect_configs = []
                
                rule = {
                    "index": i,
                    "id": q_id,
                    "question": q_text,
                    "type": q_type,
                    "options": options,
                    "show_if": show_if,
                    "always_show": show_if is None,
                    "depends_on": show_if.get("depends_on") if show_if else None,
                    "condition": show_if.get("condition", "equals") if show_if else None,
                    "value": show_if.get("value") if show_if else None,
                    # Redirect settings
                    "redirect_enabled": bool(redirect_config.get("enabled", False)) or len(redirect_configs) > 0,
                    "redirect_url": redirect_config.get("url") or None,
                    "redirect_condition": redirect_config.get("condition") or "always",
                    "redirect_color": redirect_config.get("color") or "#f59e0b",
                    "allow_resume": redirect_config.get("allow_resume", True) is not False,
                    # Multi-redirect configs (for condition-branched redirects like Yes→url1, No→url2)
                    "redirect_configs": redirect_configs,
                    # End here settings
                    "end_here_enabled": bool((q.get("end_here") or {}).get("enabled", False)),
                    "end_here_condition": (q.get("end_here") or {}).get("condition", "always"),
                    # Chain survey settings
                    "chain_survey_enabled": bool((q.get("next_survey") or {}).get("enabled", False)),
                    "chain_survey_url": (q.get("next_survey") or {}).get("url") or None,
                    "chain_survey_condition": (q.get("next_survey") or {}).get("condition", "always"),
                    "chain_survey_mode": (q.get("next_survey") or {}).get("mode", "ask"),
                    "chain_survey_message": (q.get("next_survey") or {}).get("message", "Another survey is waiting for you!"),
                    "chain_survey_yes_label": (q.get("next_survey") or {}).get("yes_label", "Continue"),
                    "chain_survey_no_label": (q.get("next_survey") or {}).get("no_label", "No thanks"),
                    "chain_survey_configs": (q.get("next_survey") or {}).get("configs", []),
                    # Layers (result pages, spinners)
                    "layers": (q.get("layers") or []),
                }
                rules.append(rule)
            except Exception as qe:
                print(f"⚠️ Skipping question {i} due to error: {qe}")
                # Add a safe fallback rule so the index stays correct
                rules.append({
                    "index": i,
                    "id": q.get("id", f"q{i}") if isinstance(q, dict) else f"q{i}",
                    "question": q.get("question", f"Question {i+1}")[:60] if isinstance(q, dict) else f"Question {i+1}",
                    "type": q.get("type", "text") if isinstance(q, dict) else "text",
                    "options": [],
                    "show_if": None,
                    "always_show": True,
                    "depends_on": None,
                    "condition": None,
                    "value": None,
                    "redirect_enabled": False,
                    "redirect_url": None,
                    "redirect_condition": "always",
                    "redirect_color": "#f59e0b",
                    "allow_resume": True,
                    "end_here_enabled": False,
                    "end_here_condition": "always",
                    "chain_survey_enabled": False,
                    "chain_survey_url": None,
                    "chain_survey_condition": "always",
                    "chain_survey_mode": "ask",
                    "chain_survey_message": "Another survey is waiting for you!",
                    "chain_survey_yes_label": "Continue",
                    "chain_survey_no_label": "No thanks",
                    "chain_survey_configs": [],
                    "layers": [],
                })
        
        return jsonify({
            "survey_id": survey_id,
            "total_questions": len(questions),
            "rules": rules
        }), 200
        
    except Exception as e:
        import traceback
        print(f"❌ get_branching_rules error: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branching-rules', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def update_branching_rules(survey_id):
    """Update branching rules from the simple table UI"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        rules = data.get("rules", [])

        # Debug: log layers being saved for each question
        for r in rules:
            layers = r.get("layers", [])
            if layers:
                print(f"  [save] Q{r.get('index')} ({r.get('id')}) layers={layers}")
        
        survey = find_survey_by_any_id(survey_id)
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        # Use the real _id for all MongoDB operations
        actual_id = survey["_id"]
        questions = survey.get("questions", [])
        
        # Apply rules to questions
        for rule in rules:
            q_index = rule.get("index")
            if q_index is not None and 0 <= q_index < len(questions):
                # Update show_if logic
                if rule.get("always_show") or not rule.get("depends_on"):
                    questions[q_index]["show_if"] = None
                else:
                    questions[q_index]["show_if"] = {
                        "depends_on": rule.get("depends_on"),
                        "condition": rule.get("condition", "equals"),
                        "value": rule.get("value")
                    }
                
                # Update redirect config
                if rule.get("redirect_enabled") and rule.get("redirect_url"):
                    # Check if there are multi-condition configs
                    multi = rule.get("redirect_configs", [])
                    if multi and len(multi) > 1:
                        # Save all configs; keep primary for backward compat
                        questions[q_index]["redirect_configs"] = multi
                        questions[q_index]["redirect_config"] = multi[0]
                    else:
                        questions[q_index]["redirect_config"] = {
                            "enabled": True,
                            "url": rule.get("redirect_url"),
                            "condition": rule.get("redirect_condition", "always"),
                            "color": rule.get("redirect_color", "#f59e0b"),
                            "allow_resume": rule.get("allow_resume", True),
                            "resume_expiry_hours": rule.get("resume_expiry_hours", 24),
                            "open_in_new_tab": rule.get("open_in_new_tab", True),
                        }
                        questions[q_index]["redirect_configs"] = None
                else:
                    questions[q_index]["redirect_config"] = None
                    questions[q_index]["redirect_configs"] = None  # clear multi-configs too

                # Update end_here config
                if rule.get("end_here_enabled"):
                    questions[q_index]["end_here"] = {
                        "enabled": True,
                        "condition": rule.get("end_here_condition", "always")
                    }
                else:
                    questions[q_index]["end_here"] = None

                # Update next_survey (chain) config
                chain_url = rule.get("chain_survey_url")
                chain_configs = rule.get("chain_survey_configs", [])
                if rule.get("chain_survey_enabled") and (chain_url or chain_configs):
                    # Ensure all per-answer configs use the current top-level mode
                    mode = rule.get("chain_survey_mode", "ask")
                    updated_configs = [
                        {**c, "mode": mode} for c in chain_configs
                    ]
                    questions[q_index]["next_survey"] = {
                        "enabled": True,
                        "url": chain_url,
                        "condition": rule.get("chain_survey_condition", "always"),
                        "mode": mode,
                        "message": rule.get("chain_survey_message", "Another survey is waiting for you!"),
                        "yes_label": rule.get("chain_survey_yes_label", "Continue"),
                        "no_label": rule.get("chain_survey_no_label", "No thanks"),
                        "configs": updated_configs,
                    }
                else:
                    questions[q_index]["next_survey"] = None
                
                # Update layers (result pages, spinners)
                layers = rule.get("layers", [])
                if isinstance(layers, list):
                    questions[q_index]["layers"] = layers
                else:
                    questions[q_index]["layers"] = []
        
        # Update survey using the real _id (guarantees correct document is updated)
        db.surveys.update_one(
            {"_id": actual_id},
            {"$set": {"questions": questions, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        # Regenerate ONLY the simple flow (AI flow is untouched)
        try:
            survey["questions"] = questions
            flow_config = generate_flow_from_survey(survey, flow_type="simple")
            db.branch_flow_configs.replace_one(
                {"survey_id": str(actual_id)},
                flow_config,
                upsert=True
            )
        except Exception as flow_err:
            print(f"⚠️ Flow regeneration failed (non-fatal): {flow_err}")
            # Don't fail the whole save just because flow diagram couldn't regenerate
        
        return jsonify({"success": True, "message": "Branching rules updated"}), 200
        
    except Exception as e:
        import traceback
        print(f"❌ update_branching_rules error: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branching-rules/ai-suggest', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def ai_suggest_branching_rules(survey_id):
    """Let AI suggest branching rules"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        survey = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        questions = survey.get("questions", [])
        
        # Clear existing show_if and let AI re-suggest
        stripped = [{**q, "show_if": None} for q in questions]
        enriched = ai_suggest_branches(stripped)
        
        # Build rules response
        rules = []
        for i, q in enumerate(enriched):
            q_id = q.get("id", f"q{i}")
            show_if = q.get("show_if")
            
            rules.append({
                "index": i,
                "id": q_id,
                "question": q.get("question", "")[:60],
                "type": q.get("type", "text"),
                "options": q.get("options", []),
                "show_if": show_if,
                "always_show": show_if is None,
                "depends_on": show_if.get("depends_on") if show_if else None,
                "condition": show_if.get("condition", "equals") if show_if else None,
                "value": show_if.get("value") if show_if else None
            })
        
        return jsonify({
            "survey_id": survey_id,
            "rules": rules,
            "ai_suggested": True
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  BRANCH FLOW GENERATION — DECISION TREE LAYOUT
# ═══════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════
#  BRANCH FLOW GENERATION — DECISION TREE LAYOUT
# ═══════════════════════════════════════════════════════

def generate_flow_from_survey(survey: dict, flow_type: str = "simple") -> dict:
    """
    Generate a top-down decision tree from survey questions.
    
    flow_type="simple"  → uses questions' existing show_if rules (from Simple Table)
    flow_type="ai"      → strips show_if and asks AI to suggest fresh branching
    
    The two flows are stored separately in branch_flow_configs.
    """
    questions = list(survey.get("questions", []))
    survey_id = str(survey.get("_id") or survey.get("id", ""))

    if flow_type == "ai":
        # Strip existing rules and let AI decide
        stripped = [{**q, "show_if": None} for q in questions]
        print(f"🤖 AI flow: asking AI to suggest branch logic for {len(stripped)} questions...")
        questions = ai_suggest_branches(stripped)
    else:
        # Simple flow: use whatever show_if rules are saved on the questions
        print(f"✅ Simple flow: using saved show_if rules")

    nodes = []
    edges = []

    # ── Step 2: Build tree structure ──
    # children_map[q_id] = list of {child_q_id, label (the answer value)}
    children_map = {}   # parent → [{child_id, label}]
    parent_map = {}     # child → parent_id

    for i, q in enumerate(questions):
        si = q.get("show_if")
        if si and si.get("depends_on"):
            p = si["depends_on"]
            children_map.setdefault(p, [])
            children_map[p].append({
                "child_id": q.get("id", f"q{i}"),
                "label": str(si.get("value", ""))
            })
            parent_map[q.get("id", f"q{i}")] = p

    # q_by_id lookup
    q_by_id = {q.get("id", f"q{i}"): q for i, q in enumerate(questions)}

    # Root questions = questions with no parent
    roots = [q.get("id", f"q{i}") for i, q in enumerate(questions)
             if q.get("id", f"q{i}") not in parent_map]

    # ── Step 3: Compute subtree widths (Reingold-Tilford inspired) ──
    NODE_W = 220    # node width
    NODE_H = 120    # node height
    H_GAP  = 60     # minimum gap between sibling nodes
    V_GAP  = 100    # vertical distance between tree levels

    def subtree_width(q_id, visited=None):
        """Returns the pixel width that this node's subtree occupies."""
        if visited is None:
            visited = set()
        if q_id in visited:
            return NODE_W
        visited.add(q_id)
        kids = children_map.get(q_id, [])
        if not kids:
            return NODE_W + H_GAP
        total = sum(subtree_width(c["child_id"], visited) for c in kids)
        return max(NODE_W + H_GAP, total)

    # ── Step 4: Assign (x, y) positions recursively ──
    positions = {}  # q_id → {"x": ..., "y": ...}

    def place(q_id, cx, y, visited=None):
        """Place q_id centered at (cx, y), then place children below."""
        if visited is None:
            visited = set()
        if q_id in visited:
            return
        visited.add(q_id)
        positions[q_id] = {"x": int(cx - NODE_W / 2), "y": int(y)}
        kids = children_map.get(q_id, [])
        if not kids:
            return
        child_y = y + NODE_H + V_GAP
        widths = [subtree_width(c["child_id"], set()) for c in kids]
        total_w = sum(widths)
        start_cx = cx - total_w / 2
        cursor = start_cx
        for i, c in enumerate(kids):
            child_cx = cursor + widths[i] / 2
            place(c["child_id"], child_cx, child_y, visited)
            cursor += widths[i]

    # Place root questions in a vertical spine down the center
    CANVAS_CX = 800   # horizontal center of canvas
    current_y = 100

    for root_id in roots:
        place(root_id, CANVAS_CX, current_y)
        # Advance y past the deepest node in this subtree
        def max_y(qid, vis=None):
            if vis is None:
                vis = set()
            if qid in vis or qid not in positions:
                return current_y
            vis.add(qid)
            ys = [positions[qid]["y"] + NODE_H]
            for c in children_map.get(qid, []):
                ys.append(max_y(c["child_id"], vis))
            return max(ys)
        current_y = max_y(root_id) + V_GAP + 20

    # ── Step 5: START node ──
    # Place START above the first root
    first_root_pos = positions.get(roots[0], {"x": CANVAS_CX - NODE_W // 2, "y": 100}) if roots else {"x": CANVAS_CX - 75, "y": 100}
    start_y = first_root_pos["y"] - NODE_H - V_GAP
    nodes.append({
        "id": "start",
        "type": "start",
        "position": {"x": CANVAS_CX - 80, "y": max(0, start_y)},
        "data": {"label": "Start Survey"}
    })

    # ── Step 6: Question nodes ──
    BRANCH_COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        pos = positions.get(q_id)
        if pos is None:
            continue  # orphaned question, skip
        q_text = q.get("question", f"Question {i+1}")
        is_branch = q_id in children_map
        options = q.get("options", [])

        # Color based on depth / branch
        depth = 0
        pid = parent_map.get(q_id)
        while pid:
            depth += 1
            pid = parent_map.get(pid)
        color = BRANCH_COLORS[depth % len(BRANCH_COLORS)]

        nodes.append({
            "id": q_id,
            "type": "question",
            "position": pos,
            "data": {
                "label": q_text[:55] + ("..." if len(q_text) > 55 else ""),
                "fullText": q_text,
                "questionType": q.get("type", "text"),
                "options": options,
                "questionIndex": i,
                "required": q.get("required", False),
                "show_if": q.get("show_if"),
                "hasConditionals": is_branch,
                "depth": depth,
                "nodeColor": color,
                # Pass redirect config so QuestionNode can show the indicator badge
                "redirectConfig": q.get("redirect_config") if isinstance(q.get("redirect_config"), dict) else None
            }
        })

    # ── Step 7: Edges ──

    # START → first root
    if roots:
        edges.append({
            "id": f"e_start_{roots[0]}",
            "source": "start",
            "target": roots[0],
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": "#94a3b8", "strokeWidth": 2},
            "markerEnd": {"type": "arrowclosed", "color": "#94a3b8"}
        })

    # Spine edges: root[i] → root[i+1]
    for i in range(len(roots) - 1):
        edges.append({
            "id": f"e_spine_{roots[i]}_{roots[i+1]}",
            "source": roots[i],
            "target": roots[i+1],
            "type": "smoothstep",
            "animated": False,
            "style": {"stroke": "#94a3b8", "strokeWidth": 2},
            "markerEnd": {"type": "arrowclosed", "color": "#94a3b8"}
        })

    # Branch edges: parent → child (with answer label)
    for parent_id, kids in children_map.items():
        for ci, c in enumerate(kids):
            color = BRANCH_COLORS[ci % len(BRANCH_COLORS)]
            edges.append({
                "id": f"e_{parent_id}_{c['child_id']}",
                "source": parent_id,
                "target": c["child_id"],
                "type": "smoothstep",
                "animated": True,
                "label": c["label"],
                "labelStyle": {"fill": "#ffffff", "fontWeight": 700, "fontSize": 11},
                "labelBgStyle": {"fill": color, "fillOpacity": 1, "rx": 6, "ry": 6},
                "labelBgPadding": [6, 3],
                "style": {"stroke": color, "strokeWidth": 2.5},
                "markerEnd": {"type": "arrowclosed", "color": color}
            })

    # ── For every branch question, check if ALL options have a child ──
    # If an option has NO child question, draw a direct edge to END labeled with that answer
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        options = q.get("options", [])
        q_type = q.get("type", "")

        if q_id not in children_map:
            continue  # Not a branch point

        # Which values already have children?
        covered_values = {str(c["label"]).strip().lower() for c in children_map[q_id]}

        # Check each option
        for ci, opt in enumerate(options):
            if str(opt).strip().lower() not in covered_values:
                # This option has no child — draw it straight to END
                color = BRANCH_COLORS[ci % len(BRANCH_COLORS)]
                edges.append({
                    "id": f"e_{q_id}_end_opt_{ci}",
                    "source": q_id,
                    "target": "end",
                    "type": "smoothstep",
                    "animated": False,
                    "label": opt,
                    "labelStyle": {"fill": "#ffffff", "fontWeight": 700, "fontSize": 11},
                    "labelBgStyle": {"fill": color, "fillOpacity": 1, "rx": 6, "ry": 6},
                    "labelBgPadding": [6, 3],
                    "style": {"stroke": color, "strokeWidth": 2, "strokeDasharray": "5,3"},
                    "markerEnd": {"type": "arrowclosed", "color": color}
                })

    # ── Step 8: END node ──
    max_y_all = max((n["position"]["y"] for n in nodes), default=400)
    end_y = max_y_all + NODE_H + V_GAP

    nodes.append({
        "id": "end",
        "type": "end",
        "position": {"x": CANVAS_CX - 80, "y": end_y},
        "data": {"label": "Survey Complete"}
    })

    # Connect all leaf questions (no children, no further spine) to end
    spine_set = set(roots)
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        if q_id not in positions:
            continue
        has_children = q_id in children_map
        has_outgoing_edge = any(e["source"] == q_id for e in edges)
        if not has_children and not has_outgoing_edge:
            edges.append({
                "id": f"e_{q_id}_end",
                "source": q_id,
                "target": "end",
                "type": "smoothstep",
                "animated": False,
                "style": {"stroke": "#cbd5e1", "strokeWidth": 1.5, "strokeDasharray": "4,3"},
                "markerEnd": {"type": "arrowclosed", "color": "#cbd5e1"}
            })

    # Last spine root → end if not already connected
    if roots:
        last_root = roots[-1]
        if not any(e["source"] == last_root and e["target"] == "end" for e in edges):
            if last_root not in children_map:
                edges.append({
                    "id": f"e_{last_root}_end",
                    "source": last_root,
                    "target": "end",
                    "type": "smoothstep",
                    "animated": False,
                    "style": {"stroke": "#94a3b8", "strokeWidth": 2},
                    "markerEnd": {"type": "arrowclosed", "color": "#94a3b8"}
                })

    # ── Step 9: Per-question redirect nodes ──
    # Only added for "simple" flow — AI has no knowledge of redirect config,
    # it only knows about questions and branching logic.
    if flow_type == "simple":
        REDIRECT_DEFAULT_COLORS = ["#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981"]
        redirect_node_count = 0

        for i, q in enumerate(questions):
            q_id = q.get("id", f"q{i}")
            rc = q.get("redirect_config")
            if not isinstance(rc, dict) or not rc.get("enabled"):
                continue
            if q_id not in positions:
                continue

            q_pos = positions[q_id]
            redirect_node_id = f"redirect_q_{q_id}"
            url = rc.get("url", "")
            color = rc.get("color") or REDIRECT_DEFAULT_COLORS[redirect_node_count % len(REDIRECT_DEFAULT_COLORS)]
            allow_resume = rc.get("allow_resume", True)
            condition = rc.get("condition", "always")
            redirect_node_count += 1

            redirect_x = q_pos["x"] + NODE_W + 120
            redirect_y = q_pos["y"]

            display_url = url
            if len(display_url) > 35:
                from urllib.parse import urlparse
                try:
                    parsed = urlparse(display_url)
                    display_url = parsed.netloc + (parsed.path[:15] + "…" if len(parsed.path) > 15 else parsed.path)
                except Exception:
                    display_url = display_url[:35] + "…"

            label = display_url or "Redirect"
            if condition != "always":
                label = f'If "{condition}" → {label}'

            nodes.append({
                "id": redirect_node_id,
                "type": "redirect",
                "position": {"x": redirect_x, "y": redirect_y},
                "data": {
                    "label": label,
                    "url": url,
                    "color": color,
                    "resumeEnabled": allow_resume,
                    "condition": condition,
                    "fromQuestion": q_id,
                    "questionIndex": i
                }
            })

            edge_label = "" if condition == "always" else f'If "{condition}"'
            edges.append({
                "id": f"e_{q_id}_{redirect_node_id}",
                "source": q_id,
                "target": redirect_node_id,
                "type": "smoothstep",
                "animated": True,
                "label": edge_label,
                "labelStyle": {"fill": "#ffffff", "fontWeight": 700, "fontSize": 11},
                "labelBgStyle": {"fill": color, "fillOpacity": 1, "rx": 6, "ry": 6},
                "labelBgPadding": [6, 3],
                "style": {"stroke": color, "strokeWidth": 2.5, "strokeDasharray": "6,3"},
                "markerEnd": {"type": "arrowclosed", "color": color}
            })

            if allow_resume:
                next_q_id = None
                if q_id in roots:
                    idx_in_roots = roots.index(q_id)
                    if idx_in_roots + 1 < len(roots):
                        next_q_id = roots[idx_in_roots + 1]
                if not next_q_id:
                    for j in range(i + 1, len(questions)):
                        nxt = questions[j].get("id", f"q{j}")
                        if nxt in positions:
                            next_q_id = nxt
                            break

                return_target = next_q_id if next_q_id else "end"
                edges.append({
                    "id": f"e_{redirect_node_id}_return",
                    "source": redirect_node_id,
                    "target": return_target,
                    "type": "smoothstep",
                    "animated": False,
                    "label": "↩ Return",
                    "labelStyle": {"fill": "#10b981", "fontWeight": 700, "fontSize": 11},
                    "labelBgStyle": {"fill": "#dcfce7", "fillOpacity": 1, "rx": 6, "ry": 6},
                    "labelBgPadding": [6, 3],
                    "style": {"stroke": "#10b981", "strokeWidth": 1.5, "strokeDasharray": "4,3"},
                    "markerEnd": {"type": "arrowclosed", "color": "#10b981"}
                })

        # ── Step 10: Sync redirect_rules_config endpoints (simple flow only) ──
        redirect_config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        if redirect_config:
            for idx, ep in enumerate(redirect_config.get("redirect_endpoints", [])):
                nodes.append({
                    "id": f"redirect_{ep['id']}",
                    "type": "redirect",
                    "position": {"x": 80 + idx * 260, "y": end_y + 120},
                    "data": {
                        "label": ep.get("name", "Redirect"),
                        "url": ep.get("url", ""),
                        "statusCode": ep.get("status_code", 1),
                        "color": ep.get("color", "#6b7280"),
                        "endpointId": ep["id"]
                    }
                })

        # ── Step 11: End-here nodes (simple flow only) ──
        # For every question with end_here.enabled=True, add a red end node
        # to the right of (or below) that question so it's visible in the diagram.
        end_here_x_offset = NODE_W + 140
        for i, q in enumerate(questions):
            q_id = q.get("id", f"q{i}")
            eh = q.get("end_here")
            if not isinstance(eh, dict) or not eh.get("enabled"):
                continue
            if q_id not in positions:
                continue
            q_pos = positions[q_id]
            condition = eh.get("condition", "always")
            end_here_node_id = f"endhere_{q_id}"

            # Place to the right side (different x offset from redirect nodes)
            ex = q_pos["x"] + end_here_x_offset
            ey = q_pos["y"] + NODE_H + 60

            label = "Survey Ends Here" if condition == "always" else f'Survey Ends if "{condition}"'
            nodes.append({
                "id": end_here_node_id,
                "type": "end",
                "position": {"x": ex, "y": ey},
                "data": {"label": label, "fromQuestion": q_id}
            })

            edge_label = "End Survey" if condition == "always" else f'If "{condition}"'
            edges.append({
                "id": f"e_{q_id}_{end_here_node_id}",
                "source": q_id,
                "target": end_here_node_id,
                "type": "smoothstep",
                "animated": False,
                "label": edge_label,
                "labelStyle": {"fill": "#ffffff", "fontWeight": 700, "fontSize": 11},
                "labelBgStyle": {"fill": "#ef4444", "fillOpacity": 1, "rx": 6, "ry": 6},
                "labelBgPadding": [6, 3],
                "style": {"stroke": "#ef4444", "strokeWidth": 2, "strokeDasharray": "5,3"},
                "markerEnd": {"type": "arrowclosed", "color": "#ef4444"}
            })

    return {
        "survey_id": survey_id,
        "flow_type": flow_type,
        "mode": "standard",
        "nodes": nodes,
        "edges": edges,
        "branch_info": {
            "total_questions": len(questions),
            "conditional_questions": sum(1 for q in questions if q.get("show_if")),
            "branch_points": len(children_map),
            "ai_enriched": flow_type == "ai"
        },
        "version": 1,
        "is_ai_generated": flow_type == "ai",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def analyze_branching_patterns(questions: list) -> list:
    """Legacy helper - kept for compatibility"""
    return []
    """
    Generate a clean visual branch flow graph from survey questions.
    Uses a proper top-down tree layout:
      - Spine questions go straight down the center
      - Branch points split left/right for each answer
      - Each branch column is well-spaced so nothing overlaps
    """
    questions = survey.get("questions", [])
    survey_id = str(survey.get("_id") or survey.get("id", ""))

    # ── Step 1: AI-enrich questions that are missing show_if logic ──
    has_any_show_if = any(q.get("show_if") for q in questions)
    if not has_any_show_if:
        print("🤖 No show_if found — asking AI to suggest branch logic...")
        questions = ai_suggest_branches(questions)
    else:
        print(f"✅ Survey already has show_if conditions — using existing logic")

    nodes = []
    edges = []

    # ── Step 2: Build lookup structures ──
    # q_by_id: id → question dict
    q_by_id = {q.get("id", f"q{i}"): q for i, q in enumerate(questions)}

    # children[parent_id] → list of {q_id, value, condition}
    children = {}
    for i, q in enumerate(questions):
        si = q.get("show_if")
        if si and si.get("depends_on"):
            p = si["depends_on"]
            children.setdefault(p, []).append({
                "q_id": q.get("id", f"q{i}"),
                "value": si.get("value", ""),
                "condition": si.get("condition", "equals")
            })

    # parent[child_id] → parent_id
    parent_of = {}
    for pid, clist in children.items():
        for c in clist:
            parent_of[c["q_id"]] = pid

    # ── Step 3: Build the spine (questions with no show_if = always visible) ──
    spine = [q.get("id", f"q{i}") for i, q in enumerate(questions)
             if not (q.get("show_if") and q.get("show_if", {}).get("depends_on"))]

    # ── Step 4: Compute positions using a tree-layout algorithm ──
    #
    # Layout rules:
    #   • Spine flows straight down the center (x=600)
    #   • Each branch point fans out: children spread horizontally
    #   • We do a two-pass: first compute subtree widths, then assign x coords
    #
    NODE_W = 240    # node card width
    NODE_H = 140    # node card height
    H_GAP  = 40     # minimum horizontal gap between sibling branches
    V_GAP  = 80     # vertical gap between levels
    BRANCH_NODE_H = 100  # extra height for branch decision diamond

    # Recursively compute how wide a subtree is (in pixels)
    def subtree_width(q_id):
        kids = children.get(q_id, [])
        if not kids:
            return NODE_W
        total = sum(subtree_width(c["q_id"]) for c in kids)
        total += H_GAP * (len(kids) - 1)
        return max(NODE_W, total)

    positions = {}  # q_id → {x, y}

    def place_node(q_id, cx, y):
        """Place q_id centered at cx, at height y. Then place its children below."""
        positions[q_id] = {"x": cx - NODE_W / 2, "y": y}
        kids = children.get(q_id, [])
        if not kids:
            return
        # Children go below this node + branch diamond
        child_y = y + NODE_H + BRANCH_NODE_H + V_GAP
        # Compute total width of all children subtrees
        widths = [subtree_width(c["q_id"]) for c in kids]
        total_w = sum(widths) + H_GAP * (len(kids) - 1)
        # Start x for first child
        start_x = cx - total_w / 2
        cursor = start_x
        for i, c in enumerate(kids):
            child_cx = cursor + widths[i] / 2
            place_node(c["q_id"], child_cx, child_y)
            cursor += widths[i] + H_GAP

    # Place spine nodes top-down, center x=600
    CENTER_X = 600
    current_y = 150
    for q_id in spine:
        place_node(q_id, CENTER_X, current_y)
        # Next spine node goes below this entire subtree
        # Find deepest y in this subtree
        def max_y_in_subtree(qid):
            ys = [positions[qid]["y"] + NODE_H]
            for c in children.get(qid, []):
                ys.append(max_y_in_subtree(c["q_id"]))
            return max(ys)
        current_y = max_y_in_subtree(q_id) + V_GAP + 20

    # ── Step 5: Start node ──
    nodes.append({
        "id": "start",
        "type": "start",
        "position": {"x": CENTER_X - 75, "y": 30},
        "data": {"label": "Start Survey"}
    })

    # ── Step 6: Create question nodes ──
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        pos = positions.get(q_id, {"x": CENTER_X - NODE_W / 2, "y": 150 + i * 180})
        q_text = q.get("question", f"Question {i+1}")
        is_branch_point = q_id in children

        nodes.append({
            "id": q_id,
            "type": "question",
            "position": pos,
            "data": {
                "label": q_text[:50] + ("..." if len(q_text) > 50 else ""),
                "fullText": q_text,
                "questionType": q.get("type", "text"),
                "options": q.get("options", []),
                "questionIndex": i,
                "required": q.get("required", False),
                "show_if": q.get("show_if"),
                "hasConditionals": is_branch_point
            }
        })

    # ── Step 7: Spine edges (straight connections between spine questions) ──
    prev = "start"
    for q_id in spine:
        edges.append({
            "id": f"e_{prev}_{q_id}",
            "source": prev,
            "target": q_id,
            "type": "default",
            "animated": False,
            "style": {"stroke": "#94a3b8", "strokeWidth": 2},
            "markerEnd": {"type": "arrowclosed", "color": "#94a3b8"}
        })
        prev = q_id

    # ── Step 8: Branch nodes and colored branch edges ──
    BRANCH_COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"]

    for q_id, kids in children.items():
        q = q_by_id.get(q_id, {})
        q_pos = positions.get(q_id, {"x": CENTER_X, "y": 150})
        options = q.get("options", [])

        # Branch decision node sits between parent and children
        branch_id = f"branch_{q_id}"
        branch_x = q_pos["x"] + NODE_W / 2  # center of parent node
        branch_y = q_pos["y"] + NODE_H + 10

        # Build conditions list
        conditions = []
        if options:
            for opt in options:
                match = next((c for c in kids
                               if str(c["value"]).strip().lower() == str(opt).strip().lower()), None)
                conditions.append({
                    "answer": [opt],
                    "label": opt,
                    "target": match["q_id"] if match else None,
                    "action": f"→ {match['q_id']}" if match else "continue"
                })
        else:
            seen = set()
            for c in kids:
                v = str(c["value"])
                if v not in seen:
                    seen.add(v)
                    conditions.append({
                        "answer": [v],
                        "label": v,
                        "target": c["q_id"],
                        "action": f"→ {c['q_id']}"
                    })

        q_text_short = q.get("question", q_id)[:35]
        nodes.append({
            "id": branch_id,
            "type": "branch",
            "position": {"x": branch_x - NODE_W / 2, "y": branch_y},
            "data": {
                "label": q_text_short,
                "triggerQuestion": q_id,
                "triggerType": "show_if",
                "conditions": conditions
            }
        })

        # Edge: question → branch diamond
        edges.append({
            "id": f"e_{q_id}_{branch_id}",
            "source": q_id,
            "target": branch_id,
            "type": "default",
            "animated": True,
            "style": {"stroke": "#8b5cf6", "strokeWidth": 2, "strokeDasharray": "5,3"},
            "markerEnd": {"type": "arrowclosed", "color": "#8b5cf6"}
        })

        # Edges: branch → each child (color-coded per answer)
        for ci, cond in enumerate(conditions):
            if not cond["target"]:
                continue
            color = BRANCH_COLORS[ci % len(BRANCH_COLORS)]
            edges.append({
                "id": f"e_{branch_id}_{cond['target']}",
                "source": branch_id,
                "sourceHandle": f"cond_{ci}",
                "target": cond["target"],
                "type": "smoothstep",
                "animated": True,
                "label": cond["label"],
                "labelStyle": {"fill": color, "fontWeight": 700, "fontSize": 12},
                "labelBgStyle": {"fill": "white", "fillOpacity": 0.9},
                "style": {"stroke": color, "strokeWidth": 2},
                "markerEnd": {"type": "arrowclosed", "color": color}
            })

    # ── Step 9: End node ──
    max_y = max((n["position"]["y"] for n in nodes), default=400)
    end_y = max_y + NODE_H + 60

    nodes.append({
        "id": "end",
        "type": "end",
        "position": {"x": CENTER_X - 75, "y": end_y},
        "data": {"label": "Survey Complete"}
    })

    # Connect leaf nodes (no outgoing edges except branch) to end
    all_edge_sources = {e["source"] for e in edges}
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        branch_id = f"branch_{q_id}"
        is_branch_point = q_id in children
        # A leaf: not a branch point, and has no existing forward edge
        if not is_branch_point:
            has_forward = any(e["source"] == q_id for e in edges)
            if not has_forward:
                edges.append({
                    "id": f"e_{q_id}_end",
                    "source": q_id,
                    "target": "end",
                    "type": "default",
                    "style": {"stroke": "#cbd5e1", "strokeDasharray": "4,4"},
                    "markerEnd": {"type": "arrowclosed", "color": "#cbd5e1"}
                })

    # Last spine question → end (if not already connected)
    if spine:
        last_spine = spine[-1]
        if not any(e["source"] == last_spine and e["target"] == "end" for e in edges):
            edges.append({
                "id": f"e_{last_spine}_end",
                "source": last_spine,
                "target": "end",
                "type": "default",
                "style": {"stroke": "#94a3b8", "strokeWidth": 2},
                "markerEnd": {"type": "arrowclosed", "color": "#94a3b8"}
            })

    # ── Step 10: Sync redirect rules as nodes ──
    redirect_config = db.redirect_rules_config.find_one({"survey_id": survey_id})
    if redirect_config:
        for idx, ep in enumerate(redirect_config.get("redirect_endpoints", [])):
            nodes.append({
                "id": f"redirect_{ep['id']}",
                "type": "redirect",
                "position": {"x": 80 + idx * 250, "y": end_y + 100},
                "data": {
                    "label": ep.get("name", "Redirect"),
                    "url": ep.get("url", ""),
                    "statusCode": ep.get("status_code", 1),
                    "color": ep.get("color", "#6b7280"),
                    "endpointId": ep["id"]
                }
            })

    return {
        "survey_id": survey_id,
        "mode": "standard",
        "nodes": nodes,
        "edges": edges,
        "branch_info": {
            "total_questions": len(questions),
            "conditional_questions": sum(1 for q in questions if q.get("show_if")),
            "branch_points": len(children),
            "ai_enriched": not has_any_show_if
        },
        "version": 1,
        "is_ai_generated": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def analyze_branching_patterns(questions: list) -> list:
    """Legacy helper - kept for compatibility"""
    return []
    # Track which questions have show_if (conditional questions)
    conditional_questions = {}  # depends_on_id -> list of {question, condition, value}
    base_questions = []  # Questions without show_if conditions
    
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        show_if = q.get("show_if")
        
        if show_if and show_if.get("depends_on"):
            depends_on = show_if.get("depends_on")
            if depends_on not in conditional_questions:
                conditional_questions[depends_on] = []
            conditional_questions[depends_on].append({
                "question": q,
                "q_id": q_id,
                "condition": show_if.get("condition", "equals"),
                "value": show_if.get("value", "")
            })
        else:
            base_questions.append((i, q_id, q))
    
    # Start node
    nodes.append({
        "id": "start",
        "type": "start",
        "position": {"x": 400, "y": 50},
        "data": {"label": "Start Survey"}
    })
    
    # Calculate positions for graph layout
    y_offset = 150
    y_step = 160
    x_center = 400
    x_branch_offset = 280
    
    # Track vertical positions for proper layout
    question_positions = {}
    current_y = y_offset
    
    # Process questions and build the graph
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        q_text = q.get("question", f"Question {i+1}")
        q_type = q.get("type", "text")
        options = q.get("options", [])
        show_if = q.get("show_if")
        
        # Determine position based on whether it's a conditional question
        if show_if and show_if.get("depends_on"):
            depends_on = show_if.get("depends_on")
            parent_pos = question_positions.get(depends_on, {"x": x_center, "y": current_y - y_step})
            
            # Find how many questions depend on this parent
            siblings = conditional_questions.get(depends_on, [])
            sibling_index = next((idx for idx, s in enumerate(siblings) if s["q_id"] == q_id), 0)
            total_siblings = len(siblings)
            
            # Spread siblings horizontally
            x_pos = parent_pos["x"] + ((sibling_index - (total_siblings - 1) / 2) * x_branch_offset)
            y_pos = parent_pos["y"] + y_step + 40  # Below parent with extra space for branch node
        else:
            # Base question - centered
            x_pos = x_center
            y_pos = current_y
            current_y += y_step
        
        question_positions[q_id] = {"x": x_pos, "y": y_pos}
        
        # Create question node
        node = {
            "id": q_id,
            "type": "question",
            "position": {"x": x_pos, "y": y_pos},
            "data": {
                "label": q_text[:50] + ("..." if len(q_text) > 50 else ""),
                "fullText": q_text,
                "questionType": q_type,
                "options": options,
                "questionIndex": i,
                "required": q.get("required", False),
                "show_if": show_if,
                "hasConditionals": q_id in conditional_questions
            }
        }
        nodes.append(node)
    
    # Now create edges and branch nodes
    prev_base_q_id = "start"
    
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        show_if = q.get("show_if")
        options = q.get("options", [])
        
        # Check if this question has conditional children (is a branch point)
        has_conditionals = q_id in conditional_questions
        
        if show_if and show_if.get("depends_on"):
            # This is a conditional question - it's connected via a branch node
            # (handled below when processing the parent)
            pass
        else:
            # Base question - connect from previous base question or start
            if prev_base_q_id:
                edges.append({
                    "id": f"e_{prev_base_q_id}_{q_id}",
                    "source": prev_base_q_id,
                    "target": q_id,
                    "type": "default",
                    "animated": False,
                    "data": {"label": "Next"}
                })
            prev_base_q_id = q_id
        
        # If this question is a branch point (has conditional children)
        if has_conditionals:
            conditionals = conditional_questions[q_id]
            q_pos = question_positions[q_id]
            
            # Create a branch node below this question
            branch_node_id = f"branch_{q_id}"
            branch_y = q_pos["y"] + 80
            
            # Group conditionals by their value to create proper paths
            value_groups = {}
            for cond in conditionals:
                value = cond["value"]
                if value not in value_groups:
                    value_groups[value] = []
                value_groups[value].append(cond)
            
            # Create branch conditions from options or detected values
            branch_conditions = []
            
            # If question has options, use those
            if options:
                for opt in options:
                    # Check if this option leads to any conditional question
                    matching = [c for c in conditionals if str(c["value"]).lower() == str(opt).lower()]
                    if matching:
                        branch_conditions.append({
                            "answer": [opt],
                            "action": f"show_{matching[0]['q_id']}",
                            "label": opt,
                            "target": matching[0]["q_id"]
                        })
                    else:
                        # Option doesn't have a specific branch, continues normally
                        branch_conditions.append({
                            "answer": [opt],
                            "action": "continue",
                            "label": opt,
                            "target": None
                        })
            else:
                # No options, create conditions from detected values
                for value, conds in value_groups.items():
                    branch_conditions.append({
                        "answer": [value],
                        "action": f"show_{conds[0]['q_id']}",
                        "label": value,
                        "target": conds[0]["q_id"]
                    })
            
            # Add branch node
            nodes.append({
                "id": branch_node_id,
                "type": "branch",
                "position": {"x": q_pos["x"], "y": branch_y},
                "data": {
                    "label": f"Branch: {q_id}",
                    "triggerQuestion": q_id,
                    "triggerType": "show_if",
                    "conditions": branch_conditions
                }
            })
            
            # Edge from question to branch node
            edges.append({
                "id": f"e_{q_id}_{branch_node_id}",
                "source": q_id,
                "target": branch_node_id,
                "type": "branch",
                "animated": True,
                "data": {"isBranch": True}
            })
            
            # Edges from branch node to conditional questions
            for cond in branch_conditions:
                if cond["target"]:
                    edges.append({
                        "id": f"e_{branch_node_id}_{cond['target']}",
                        "source": branch_node_id,
                        "sourceHandle": f"cond_{branch_conditions.index(cond)}",
                        "target": cond["target"],
                        "type": "conditional",
                        "animated": True,
                        "label": cond["label"],
                        "style": {"stroke": "#8b5cf6"},
                        "data": {
                            "condition": "equals",
                            "value": cond["label"],
                            "isConditional": True
                        }
                    })
    
    # Add end node
    last_q_id = questions[-1].get("id", f"q{len(questions)-1}") if questions else "start"
    last_pos = question_positions.get(last_q_id, {"y": current_y})
    end_y = max([n.get("position", {}).get("y", 0) for n in nodes], default=200) + 120
    
    nodes.append({
        "id": "end",
        "type": "end",
        "position": {"x": x_center, "y": end_y},
        "data": {"label": "Survey Complete"}
    })
    
    # Connect last base question to end (if not already a branch)
    if prev_base_q_id and prev_base_q_id not in conditional_questions:
        edges.append({
            "id": f"e_{prev_base_q_id}_end",
            "source": prev_base_q_id,
            "target": "end",
            "type": "default",
            "data": {"label": "Submit"}
        })
    
    # Also connect conditional questions that don't have further children to end
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        show_if = q.get("show_if")
        has_conditionals = q_id in conditional_questions
        
        if show_if and not has_conditionals:
            # This conditional question has no children, connect to end
            edges.append({
                "id": f"e_{q_id}_end",
                "source": q_id,
                "target": "end",
                "type": "default",
                "style": {"strokeDasharray": "5,5"},
                "data": {"label": "End Path"}
            })
    
    # Sync redirect rules as end nodes
    redirect_config = db.redirect_rules_config.find_one({"survey_id": survey_id})
    if redirect_config:
        endpoints = redirect_config.get("redirect_endpoints", [])
        
        for idx, endpoint in enumerate(endpoints):
            redirect_node = {
                "id": f"redirect_{endpoint['id']}",
                "type": "redirect",
                "position": {"x": 100 + (idx * 220), "y": end_y + 80},
                "data": {
                    "label": endpoint.get("name", "Redirect"),
                    "url": endpoint.get("url", ""),
                    "statusCode": endpoint.get("status_code", 1),
                    "color": endpoint.get("color", "#6b7280"),
                    "endpointId": endpoint["id"]
                }
            }
            nodes.append(redirect_node)
    
    return {
        "survey_id": survey_id,
        "mode": "standard",
        "nodes": nodes,
        "edges": edges,
        "branch_info": {
            "total_questions": len(questions),
            "conditional_questions": len([q for q in questions if q.get("show_if")]),
            "branch_points": len(conditional_questions),
            "possible_paths": max(1, sum(len(v) for v in conditional_questions.values()))
        },
        "version": 1,
        "is_ai_generated": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def analyze_branching_patterns(questions: list) -> list:
    """
    Analyze questions for additional AI branching patterns beyond show_if.
    Returns predicted branch points based on question keywords.
    """
    predictions = []
    
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i}")
        q_text = q.get("question", "").lower()
        q_type = q.get("type", "text")
        options = q.get("options", [])
        
        # Skip if already has show_if conditions
        if q.get("show_if"):
            continue
        
        branch_trigger = None
        conditions = []
        
        # Satisfaction/satisfaction patterns
        if any(kw in q_text for kw in ["satisfaction", "satisfied", "happy"]):
            branch_trigger = "satisfaction"
            conditions = [
                {"answer": ["no", "dissatisfied", "very dissatisfied", "1", "2"], "action": "show_more", "label": "Dissatisfied"},
                {"answer": ["yes", "satisfied", "very satisfied"], "action": "normal", "label": "Satisfied"}
            ]
        
        # Recommendation patterns  
        elif any(kw in q_text for kw in ["recommend", "refer", "suggest"]):
            branch_trigger = "recommendation"
            conditions = [
                {"answer": ["no", "never", "unlikely", "0", "1", "2", "3", "4"], "action": "show_more", "label": "Unlikely"},
                {"answer": ["yes", "likely", "very likely"], "action": "normal", "label": "Likely"}
            ]
        
        # Rating patterns
        elif any(kw in q_text for kw in ["rating", "rate", "score", "scale"]):
            branch_trigger = "rating"
            conditions = [
                {"answer": ["1", "2", "3", "4", "5"], "action": "show_more", "label": "Low (1-5)"},
                {"answer": ["6", "7", "8", "9", "10"], "action": "normal", "label": "High (6-10)"}
            ]
        
        # Yes/No patterns
        elif q_type == "yes_no" or (options and set([o.lower() for o in options]) == {"yes", "no"}):
            branch_trigger = "yes_no"
            conditions = [
                {"answer": ["yes"], "action": "path_yes", "label": "Yes"},
                {"answer": ["no"], "action": "path_no", "label": "No"}
            ]
        
        if branch_trigger:
            predictions.append({
                "id": f"predicted_branch_{q_id}",
                "trigger_question": q_id,
                "trigger_type": branch_trigger,
                "label": f"Potential: {branch_trigger.replace('_', ' ').title()}",
                "conditions": conditions,
                "is_prediction": True
            })
    
    return predictions


# ═══════════════════════════════════════════════════════
#  RESUME TOKEN MANAGEMENT
# ═══════════════════════════════════════════════════════

def generate_resume_token(session_data: dict) -> str:
    """Generate a secure resume token for mid-survey redirect returns"""
    payload = {
        "session_id": session_data["session_id"],
        "survey_id": session_data["survey_id"],
        "resume_index": session_data["resume_index"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "nonce": str(uuid.uuid4())[:8]
    }
    
    payload_json = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        RESUME_TOKEN_SECRET.encode(),
        payload_json.encode(),
        hashlib.sha256
    ).hexdigest()[:16]
    
    token_data = {**payload, "sig": signature}
    token = base64.urlsafe_b64encode(json.dumps(token_data).encode()).decode()
    return token


def verify_resume_token(token: str) -> dict:
    """Verify and decode a resume token"""
    try:
        decoded = json.loads(base64.urlsafe_b64decode(token.encode()).decode())
        
        # Check expiry
        expires_at = datetime.fromisoformat(decoded["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            return {"valid": False, "error": "Token expired"}

        
        # Verify signature
        sig = decoded.pop("sig")
        payload_json = json.dumps(decoded, sort_keys=True)
        expected_sig = hmac.new(
            RESUME_TOKEN_SECRET.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        
        if sig != expected_sig:
            return {"valid": False, "error": "Invalid signature"}
        
        return {"valid": True, "data": decoded}
    except Exception as e:
        return {"valid": False, "error": str(e)}


# ═══════════════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════════════

@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_branch_flow(survey_id):
    """
    Get branch flow for a survey. ?type=simple (default) or ?type=ai

    - simple: ALWAYS regenerates from the current saved show_if rules. No cache.
    - ai:     Returns cached AI flow if it exists; generates if not.
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        flow_type = request.args.get("type", "simple")

        survey = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404

        if flow_type == "ai":
            # AI flow: use cache if available
            existing = db.branch_flow_configs.find_one({
                "survey_id": survey_id,
                "flow_type": "ai"
            })
            if existing:
                existing["_id"] = str(existing["_id"])
                return jsonify(existing), 200
            # Not cached — generate and save
            flow_config = generate_flow_from_survey(survey, flow_type="ai")
            db.branch_flow_configs.update_one(
                {"survey_id": survey_id, "flow_type": "ai"},
                {"$set": flow_config},
                upsert=True
            )
        else:
            # Simple flow: ALWAYS rebuild from current show_if rules (no cache)
            flow_config = generate_flow_from_survey(survey, flow_type="simple")
            # Save it so the PUT endpoint can update it, but always regenerate on GET
            db.branch_flow_configs.update_one(
                {"survey_id": survey_id, "flow_type": "simple"},
                {"$set": flow_config},
                upsert=True
            )

        flow_config.pop("_id", None)
        return jsonify(flow_config), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting branch flow: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def update_branch_flow(survey_id):
    """Update branch flow configuration"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        update_data = {
            "nodes": data.get("nodes", []),
            "edges": data.get("edges", []),
            "mode": data.get("mode", "standard"),
            "is_ai_generated": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        
        result = db.branch_flow_configs.update_one(
            {"survey_id": survey_id},
            {"$set": update_data, "$inc": {"version": 1}},
            upsert=True
        )
        
        return jsonify({"message": "Flow updated", "modified": result.modified_count}), 200
        
    except Exception as e:
        print(f"Error updating branch flow: {e}")
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow/regenerate', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def regenerate_branch_flow(survey_id):
    """Regenerate branch flow. ?type=ai regenerates AI flow; ?type=simple regenerates from saved rules."""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        survey = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        
        try:
            data = request.get_json(force=True, silent=True) or {}
        except Exception:
            data = {}
        
        flow_type = data.get("flow_type", "ai")  # default to AI on regenerate
        print(f"🔄 Regenerating {flow_type} flow for survey {survey_id}")
        
        flow_config = generate_flow_from_survey(survey, flow_type=flow_type)
        
        # Replace only the specific flow type
        db.branch_flow_configs.replace_one(
            {"survey_id": survey_id, "flow_type": flow_type},
            flow_config,
            upsert=True
        )
        
        return jsonify(flow_config), 200
        
    except Exception as e:
        import traceback
        print(f"Error regenerating flow: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/question/<question_id>/end-here', methods=['POST', 'DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def set_question_end_here(survey_id, question_id):
    """
    POST: Mark a question as an end point — survey stops after this question.
         Optionally pass {"condition": "answer_value"} to only end for a specific answer.
    DELETE: Remove the end-here marker.
    """
    if request.method == 'OPTIONS':
        return '', 200
    try:
        survey = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404

        questions = survey.get("questions", [])
        updated = False
        for q in questions:
            if q.get("id") == question_id:
                if request.method == 'DELETE':
                    q.pop("end_here", None)
                else:
                    data = request.get_json(force=True, silent=True) or {}
                    # condition = 'always' means always end here regardless of answer
                    # condition = 'Yes' means only end if user answered 'Yes'
                    q["end_here"] = {
                        "enabled": True,
                        "condition": data.get("condition", "always")
                    }
                updated = True
                break

        if not updated:
            return jsonify({"error": "Question not found"}), 404

        db.surveys.update_one(
            {"$or": [{"_id": survey_id}, {"id": survey_id}]},
            {"$set": {"questions": questions}}
        )
        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  ACTIVATE BRANCHING MODE
# ═══════════════════════════════════════════════════════

@branch_flow_bp.route('/api/surveys/<survey_id>/branching-mode', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def get_branching_mode(survey_id):
    """Get the currently active branching mode for a survey"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        survey = db.surveys.find_one(
            {"$or": [{"_id": survey_id}, {"id": survey_id}]},
            {"active_branching_mode": 1}
        )
        if not survey:
            return jsonify({"error": "Survey not found"}), 404
        mode = survey.get("active_branching_mode", "simple")
        return jsonify({"survey_id": survey_id, "active_branching_mode": mode}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branching-mode', methods=['PUT', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def set_branching_mode(survey_id):
    """
    Activate a branching mode ('simple' or 'ai') for the survey.
    
    When mode = 'ai':
      - Copies the AI-suggested show_if rules onto the survey questions
      - These become the live branching rules used at runtime
    When mode = 'simple':
      - Restores the manually-set show_if rules (stored in simple_rules_snapshot)
      - Falls back to current questions if no snapshot exists
    """
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json(force=True, silent=True) or {}
        new_mode = data.get("mode")
        if new_mode not in ("simple", "ai"):
            return jsonify({"error": "mode must be 'simple' or 'ai'"}), 400

        survey = db.surveys.find_one({"$or": [{"_id": survey_id}, {"id": survey_id}]})
        if not survey:
            return jsonify({"error": "Survey not found"}), 404

        questions = survey.get("questions", [])
        update_fields = {"active_branching_mode": new_mode}

        if new_mode == "ai":
            # Snapshot the current simple rules first (so we can restore them)
            update_fields["simple_rules_snapshot"] = [
                {"id": q.get("id"), "show_if": q.get("show_if")} for q in questions
            ]
            # Get AI flow config to read its show_if suggestions
            ai_flow = db.branch_flow_configs.find_one({
                "survey_id": survey_id,
                "flow_type": "ai"
            })
            if not ai_flow:
                # Generate AI flow first
                stripped = [{**q, "show_if": None} for q in questions]
                enriched = ai_suggest_branches(stripped)
                ai_show_if_map = {q.get("id"): q.get("show_if") for q in enriched}
            else:
                # Extract show_if from the AI flow nodes' data
                ai_show_if_map = {}
                for node in ai_flow.get("nodes", []):
                    if node.get("type") == "question":
                        ai_show_if_map[node["id"]] = node.get("data", {}).get("show_if")

            # Apply AI show_if to questions
            for q in questions:
                q_id = q.get("id")
                if q_id in ai_show_if_map:
                    q["show_if"] = ai_show_if_map[q_id]
            update_fields["questions"] = questions

        else:  # restoring simple mode
            # Restore from snapshot if it exists
            snapshot = survey.get("simple_rules_snapshot", [])
            if snapshot:
                snapshot_map = {s["id"]: s.get("show_if") for s in snapshot}
                for q in questions:
                    q_id = q.get("id")
                    if q_id in snapshot_map:
                        q["show_if"] = snapshot_map[q_id]
                update_fields["questions"] = questions

        db.surveys.update_one(
            {"$or": [{"_id": survey_id}, {"id": survey_id}]},
            {"$set": update_fields}
        )

        return jsonify({
            "success": True,
            "active_branching_mode": new_mode,
            "message": f"Branching mode set to '{new_mode}'"
        }), 200

    except Exception as e:
        import traceback
        print(f"Error setting branching mode: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  MID-SURVEY REDIRECT & RESUME
# ═══════════════════════════════════════════════════════

@branch_flow_bp.route('/api/surveys/<survey_id>/redirect/prepare', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def prepare_mid_survey_redirect(survey_id):
    """Prepare a mid-survey redirect - saves state and returns resume token"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        session_id = data.get("session_id") or str(uuid.uuid4())
        current_answers = data.get("answers", {})
        current_question_index = data.get("current_question_index", 0)
        redirect_url = data.get("redirect_url", "")
        redirect_node_id = data.get("redirect_node_id", "")
        expiry_hours = data.get("expiry_hours", 24)  # configurable per question
        if expiry_hours == 0:
            expiry_hours = 24 * 365 * 10  # 0 = "never" → 10 years
        
        # Save session state
        session_state = {
            "session_id": session_id,
            "survey_id": survey_id,
            "answers": current_answers,
            "current_question_index": current_question_index,
            "redirect_node_id": redirect_node_id,
            "status": "redirected",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=expiry_hours)).isoformat()
        }
        
        db.survey_sessions.update_one(
            {"session_id": session_id},
            {"$set": session_state},
            upsert=True
        )

        # ── Save / update partial response record in `responses` collection ─────
        # This ensures admins and survey owners can see answers collected before
        # the redirect, even if the user never returns to finish the survey.
        try:
            now_utc = datetime.now(timezone.utc)
            extra_data_for_partial = data.get("extra", {})
            partial_user_info = {
                "username":   extra_data_for_partial.get("username", ""),
                "email":      extra_data_for_partial.get("email", ""),
                "ip_address": request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown').split(',')[0].strip(),
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "click_id":   extra_data_for_partial.get("click_id", ""),
            }
            partial_doc = {
                "survey_id":               survey_id,
                "session_id":              session_id,
                "responses":               current_answers,
                "question_timings":        {},
                "user_info":               partial_user_info,
                "status":                  "partial",
                "partial_submitted_at":    now_utc,
                "submitted_at":            now_utc,          # keeps sort order consistent
                "redirect_node_id":        redirect_node_id,
                "redirected_to_url":       redirect_url,
                "questions_answered":      current_question_index + 1,
                "is_public":               True,
            }
            # Upsert so a second redirect on the same session just updates
            result = db.responses.update_one(
                {"session_id": session_id, "status": "partial"},
                {"$set": partial_doc},
                upsert=True,
            )
            if result.upserted_id:
                print(f"💾 [PartialResponse] New partial record created for session {session_id}")
            else:
                print(f"🔄 [PartialResponse] Existing partial record updated for session {session_id}")
        except Exception as partial_err:
            # Non-blocking — never fail the redirect because of this
            print(f"⚠️ [PartialResponse] Could not save partial response: {partial_err}")

        # Generate resume token
        resume_token = generate_resume_token({
            "session_id": session_id,
            "survey_id": survey_id,
            "resume_index": current_question_index + 1,
            "expires_hours": expiry_hours
        })
        
        # ── Build return URL ──────────────────────────────────────────────────
        # Must point to the FRONTEND app, NOT the Flask backend.
        # Priority: FRONTEND_URL env var → Origin header → fallback to host_url
        frontend_base = (
            os.environ.get("FRONTEND_URL", "").rstrip("/")
            or request.headers.get("Origin", "").rstrip("/")
            or request.host_url.rstrip("/")
        )
        # Include the question index in the return URL so the user resumes
        # from the exact question they were redirected from (e.g. Q6 = index 5)
        resume_index = current_question_index + 1  # next question after the redirect
        return_url = f"{frontend_base}/survey/{survey_id}?resume={resume_token}&q={resume_index}"
        
        # ── Replace placeholders in the external redirect URL ─────────────────
        # The partner page (e.g. Moustache) receives return_url as a query param.
        # They should use it to render a "Continue Survey" button.
        # We do NOT append return_url automatically if the owner already put {return_url}
        # in their template — we just replace it. If they didn't include it, we
        # append it as ?return_url=... so the partner page always has it.
        extra_data = data.get("extra", {})
        click_id = extra_data.get("click_id", "")
        answer = str(extra_data.get("answer", ""))
        
        external_url = redirect_url \
            .replace('{return_url}', return_url) \
            .replace('%7Breturn_url%7D', return_url) \
            .replace('{click_id}', click_id) \
            .replace('{session_id}', session_id) \
            .replace('{answer}', answer) \
            .replace('{survey_id}', survey_id)
        
        # Ensure the external URL has a scheme
        if external_url and not external_url.startswith(('http://', 'https://')):
            external_url = 'https://' + external_url
        
        # Always append return_url to the external URL so the partner page can use it,
        # unless the survey owner already embedded {return_url} in their template
        has_return_placeholder = '{return_url}' in redirect_url or '%7Breturn_url%7D' in redirect_url
        if not has_return_placeholder:
            sep = '&' if '?' in external_url else '?'
            external_url = f"{external_url}{sep}return_url={return_url}"
        
        return jsonify({
            "session_id": session_id,
            "resume_token": resume_token,
            "return_url": return_url,
            "final_redirect_url": external_url,
            "expires_in_hours": 24
        }), 200
        
    except Exception as e:
        print(f"Error preparing redirect: {e}")
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/resume', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def resume_survey(survey_id):
    """Resume a survey from a mid-survey redirect"""
    if request.method == 'OPTIONS':
        return '', 200

    
    try:
        token = request.args.get("token", "")
        if not token:
            return jsonify({"error": "Resume token required"}), 400
        
        # Verify token
        result = verify_resume_token(token)
        if not result["valid"]:
            return jsonify({"error": result["error"]}), 400
        
        token_data = result["data"]
        
        # Verify survey matches
        if token_data["survey_id"] != survey_id:
            return jsonify({"error": "Token does not match survey"}), 400
        
        # Get session state
        session = db.survey_sessions.find_one({"session_id": token_data["session_id"]})
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        # Update session status
        db.survey_sessions.update_one(
            {"session_id": token_data["session_id"]},
            {"$set": {"status": "resumed", "resumed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return jsonify({
            "session_id": token_data["session_id"],
            "resume_index": token_data["resume_index"],
            "answers": session.get("answers", {}),
            "message": "Session resumed successfully"
        }), 200
        
    except Exception as e:
        print(f"Error resuming survey: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  SYNC WITH REDIRECT RULES
# ═══════════════════════════════════════════════════════

@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow/sync-redirects', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def sync_redirect_rules(survey_id):
    """Sync branch flow end nodes with redirect rules"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Get current flow
        flow = db.branch_flow_configs.find_one({"survey_id": survey_id})
        if not flow:
            return jsonify({"error": "No branch flow found"}), 404
        
        # Get redirect rules config
        redirect_config = db.redirect_rules_config.find_one({"survey_id": survey_id})
        
        nodes = flow.get("nodes", [])
        
        # Remove old redirect nodes
        nodes = [n for n in nodes if n.get("type") != "redirect"]
        
        # Add redirect endpoints as nodes
        if redirect_config:
            endpoints = redirect_config.get("redirect_endpoints", [])
            end_y = max([n.get("position", {}).get("y", 0) for n in nodes], default=200) + 100
            
            for idx, ep in enumerate(endpoints):
                nodes.append({
                    "id": f"redirect_{ep['id']}",
                    "type": "redirect",
                    "position": {"x": 200 + (idx * 250), "y": end_y},
                    "data": {
                        "label": ep.get("name", "Redirect"),
                        "url": ep.get("url", ""),
                        "statusCode": ep.get("status_code", 1),
                        "color": ep.get("color", "#6b7280"),
                        "endpointId": ep["id"],
                        "synced": True
                    }
                })

        
        # Update flow
        db.branch_flow_configs.update_one(
            {"survey_id": survey_id},
            {"$set": {"nodes": nodes, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return jsonify({"message": "Redirects synced", "redirect_count": len(endpoints) if redirect_config else 0}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow/add-node', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def add_flow_node(survey_id):
    """Add a new node to the branch flow"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        node_type = data.get("type", "redirect")
        position = data.get("position", {"x": 400, "y": 400})
        node_data = data.get("data", {})
        
        node_id = f"{node_type}_{str(uuid.uuid4())[:8]}"
        
        new_node = {
            "id": node_id,
            "type": node_type,
            "position": position,
            "data": node_data
        }
        
        # Add to flow
        db.branch_flow_configs.update_one(
            {"survey_id": survey_id},
            {"$push": {"nodes": new_node}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return jsonify({"message": "Node added", "node": new_node}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow/add-edge', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def add_flow_edge(survey_id):
    """Add a new edge (connection) to the branch flow"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        source = data.get("source")
        target = data.get("target")
        edge_type = data.get("type", "default")
        label = data.get("label", "")
        condition = data.get("condition")
        
        if not source or not target:
            return jsonify({"error": "Source and target required"}), 400
        
        edge_id = f"e_{source}_{target}_{str(uuid.uuid4())[:4]}"
        
        new_edge = {
            "id": edge_id,
            "source": source,
            "target": target,
            "type": edge_type,
            "label": label,
            "data": {"condition": condition} if condition else {}
        }
        
        db.branch_flow_configs.update_one(
            {"survey_id": survey_id},
            {"$push": {"edges": new_edge}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return jsonify({"message": "Edge added", "edge": new_edge}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow/delete-node/<node_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def delete_flow_node(survey_id, node_id):
    """Delete a node and its connected edges"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Remove node
        db.branch_flow_configs.update_one(
            {"survey_id": survey_id},
            {
                "$pull": {
                    "nodes": {"id": node_id},
                    "edges": {"$or": [{"source": node_id}, {"target": node_id}]}
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return jsonify({"message": "Node deleted"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@branch_flow_bp.route('/api/surveys/<survey_id>/branch-flow/delete-edge/<edge_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
def delete_flow_edge(survey_id, edge_id):
    """Delete an edge"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        db.branch_flow_configs.update_one(
            {"survey_id": survey_id},
            {
                "$pull": {"edges": {"id": edge_id}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return jsonify({"message": "Edge deleted"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════
#  SURVEY FLOW ANALYTICS  (admin + survey-owner view)
# ═══════════════════════════════════════════════════════

from auth_middleware import requireAuth  # noqa: E402


def _serialize_doc(doc):
    """Safely convert ObjectId fields and datetime to strings."""
    doc['_id'] = str(doc['_id'])
    for field in ('submitted_at', 'partial_submitted_at'):
        val = doc.get(field)
        if val is not None and not isinstance(val, str):
            doc[field] = val.isoformat()
    return doc


@branch_flow_bp.route('/api/flow-tracking/all-responses', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=ALLOWED_ORIGINS)
@requireAuth
def get_all_flow_responses():
    """
    Return a flat, time-sorted table of ALL responses (partial + submitted)
    across all surveys the current user owns (admin sees everything).
    Each row contains: survey id/title, time, respondent info, redirect info,
    survey creator, outcome status.
    """
    if request.method == 'OPTIONS':
        return '', 200

    try:
        current_user = g.current_user
        user_id      = str(current_user.get('_id', ''))
        is_admin     = current_user.get('role') == 'admin'

        # ── Get surveys this user has access to ───────────────────────────────
        if is_admin:
            surveys_cursor = db.surveys.find({}, {
                'short_id': 1, 'id': 1, '_id': 1, 'title': 1,
                'ownerUserId': 1, 'creator_email': 1
            })
        else:
            surveys_cursor = db.surveys.find(
                {'ownerUserId': user_id},
                {'short_id': 1, 'id': 1, '_id': 1, 'title': 1,
                 'ownerUserId': 1, 'creator_email': 1}
            )

        # Build lookup: all possible survey IDs → survey meta
        survey_meta  = {}   # canonical_id → {title, short_id, creator_email, owner_id}
        all_ids      = []   # every possible id variant to query responses with

        for s in surveys_cursor:
            s_str_id   = str(s.get('_id', ''))
            short_id   = s.get('short_id') or s.get('id') or s_str_id
            title      = s.get('title', 'Untitled')
            owner_id   = s.get('ownerUserId', '')
            creator_email = s.get('creator_email', '')

            # Resolve creator email from users collection if missing
            if not creator_email and owner_id:
                try:
                    u = db.users.find_one(
                        {'_id': ObjectId(owner_id)},
                        {'email': 1, 'name': 1}
                    )
                    if u:
                        creator_email = u.get('email', '')
                except Exception:
                    pass

            meta = {
                'survey_title':   title,
                'short_id':       short_id,
                'creator_email':  creator_email,
                'owner_id':       owner_id,
            }
            for vid in {short_id, s_str_id, s.get('id', '')} - {''}:
                survey_meta[vid] = meta
                all_ids.append(vid)

        if not all_ids:
            return jsonify({'success': True, 'rows': [], 'total': 0}), 200

        # ── Fetch all matching responses ───────────────────────────────────────
        raw_docs = list(
            db.responses.find(
                {'survey_id': {'$in': all_ids}}
            ).sort('submitted_at', -1).limit(2000)   # cap at 2000 rows
        )

        rows = []
        for doc in raw_docs:
            _serialize_doc(doc)
            sid       = doc.get('survey_id', '')
            meta      = survey_meta.get(sid, {})
            ui        = doc.get('user_info', {})
            raw_ans   = doc.get('responses', {})
            status    = doc.get('status', 'submitted')

            rows.append({
                # ─ survey info ─
                'survey_id':      meta.get('short_id', sid),
                'survey_title':   meta.get('survey_title', '—'),
                'creator_email':  meta.get('creator_email', '—'),
                # ─ timing ─
                'submitted_at':         doc.get('submitted_at'),
                'partial_submitted_at': doc.get('partial_submitted_at'),
                # ─ respondent ─
                'email':    ui.get('email', ''),
                'username': ui.get('username', ''),
                'click_id': ui.get('click_id', ''),
                'ip':       ui.get('ip_address', ''),
                # ─ answers ─
                'questions_answered': doc.get('questions_answered', len(raw_ans)),
                'answers': {qid: str(ans) for qid, ans in raw_ans.items()},
                # ─ redirect ─
                'redirected_to_url': doc.get('redirected_to_url', ''),
                'redirect_node_id':  doc.get('redirect_node_id', ''),
                # ─ outcome ─
                'status': status,   # "partial" | "submitted"
                # ─ session ─
                'session_id':  doc.get('session_id', ''),
                'response_id': doc['_id'],
            })

        return jsonify({
            'success': True,
            'total':   len(rows),
            'rows':    rows,
        }), 200

    except Exception as e:
        import traceback
        print(f"[flow-tracking] ERROR: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
