"""
Survey Resubmit Policy API
=========================

Priority chain (highest → lowest):
  1. Per-user global unlock  (email-level, applies to ALL surveys for that user)
  2. Per-survey user override (email + survey_id, overrides just one survey)
  3. Per-survey policy       (applies to all users of that survey)
  4. Global default policy   (platform-wide fallback)

Policy modes:
  allow          → no restriction
  cooldown       → user can fill again after N hours
  block_forever  → user can never fill again

Collections used:
  resubmit_global_config       — one document, platform default
  survey_resubmit_policies     — one doc per survey
  survey_resubmit_overrides    — per-user+survey overrides
  resubmit_user_global_rules   — per-user rules that apply to ALL surveys
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from mongodb_config import db
from auth_middleware import requireAdmin

resubmit_bp = Blueprint("resubmit", __name__, url_prefix="/api/admin/resubmit")

# ─────────────────────────────────────────────────────────────────────────────
#  Serialization helper
# ─────────────────────────────────────────────────────────────────────────────

def _serialize(doc):
    if not isinstance(doc, dict):
        return doc
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = _serialize(v)
        elif isinstance(v, list):
            out[k] = [_serialize(i) if isinstance(i, dict) else i for i in v]
        else:
            out[k] = v
    return out


# ─────────────────────────────────────────────────────────────────────────────
#  Global config helpers
# ─────────────────────────────────────────────────────────────────────────────

GLOBAL_CONFIG_ID = "resubmit_global"

DEFAULT_GLOBAL_CONFIG = {
    "_id": GLOBAL_CONFIG_ID,
    "mode": "allow",          # allow | cooldown | block_forever
    "cooldown_hours": None,   # set when mode == cooldown
    "updated_at": None,
    "updated_by": None,
}


def _get_global_config() -> dict:
    cfg = db.resubmit_global_config.find_one({"_id": GLOBAL_CONFIG_ID})
    if not cfg:
        db.resubmit_global_config.insert_one(dict(DEFAULT_GLOBAL_CONFIG))
        cfg = dict(DEFAULT_GLOBAL_CONFIG)
    return cfg


# ─────────────────────────────────────────────────────────────────────────────
#  Core resolution logic
# ─────────────────────────────────────────────────────────────────────────────

def _effective_hours(hours) -> Optional[float]:
    """Return float or None."""
    try:
        return float(hours) if hours is not None else None
    except (TypeError, ValueError):
        return None


def _apply_mode_and_hours(mode: str, cooldown_hours, prev_time, result: dict) -> dict:
    """Apply a resolved mode/hours pair to the result dict."""
    result["policy_mode"] = mode

    if mode == "allow":
        result["allowed"] = True
        return result

    if not prev_time:
        result["allowed"] = True
        result["reason"] = "no_previous_submission"
        return result

    if prev_time.tzinfo is None:
        prev_time = prev_time.replace(tzinfo=timezone.utc)

    result["previous_submission_at"] = prev_time.isoformat()

    if mode == "block_forever":
        result["allowed"] = False
        result["reason"] = "block_forever"
        return result

    if mode == "cooldown":
        hours = _effective_hours(cooldown_hours) or 24.0
        cooldown_end = prev_time + timedelta(hours=hours)
        now = datetime.now(timezone.utc)
        result["cooldown_ends_at"] = cooldown_end.isoformat()
        if now < cooldown_end:
            result["allowed"] = False
            result["reason"] = "cooldown_active"
        else:
            result["allowed"] = True
            result["reason"] = "cooldown_passed"
        return result

    result["allowed"] = True
    return result


def _parse_prev_time(prev: Optional[dict]) -> Optional[datetime]:
    if not prev:
        return None
    t = prev.get("submitted_at")
    if isinstance(t, datetime):
        return t
    if isinstance(t, str):
        try:
            return datetime.fromisoformat(t.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def check_resubmit_allowed(
    survey_id: str,
    fingerprint_hash: Optional[str],
    email: Optional[str],
) -> dict:
    """
    Main check — returns whether this user may submit the survey right now.

    Priority order applied:
      1. Per-user global rule  (applies across ALL surveys for this email)
      2. Per-survey user override  (this email + this survey only)
      3. Per-survey policy
      4. Global default
    """
    result = {
        "allowed": True,
        "reason": "no_policy",
        "policy_mode": "allow",
        "applied_level": "global_default",
        "cooldown_ends_at": None,
        "previous_submission_at": None,
    }

    if not fingerprint_hash and not email:
        return result  # Can't identify — fail open

    norm_email = email.lower().strip() if email else None

    # ── Level 1: Per-user GLOBAL rule (overrides everything for this user) ──
    user_global_rule = None
    if norm_email:
        user_global_rule = db.resubmit_user_global_rules.find_one({"email": norm_email})

    if user_global_rule:
        ugr_mode = user_global_rule.get("mode", "allow")
        result["applied_level"] = "user_global_rule"
        if ugr_mode == "allow":
            result["reason"] = "user_global_allow"
            result["policy_mode"] = "allow"
            return result
        # block_forever or cooldown at user-global level
        prev = _find_previous_submission(survey_id, fingerprint_hash, norm_email)
        prev_time = _parse_prev_time(prev)
        result["reason"] = ugr_mode
        return _apply_mode_and_hours(ugr_mode, user_global_rule.get("cooldown_hours"), prev_time, result)

    # ── Level 2: Per-survey user override ──
    survey_override = _get_survey_user_override(survey_id, fingerprint_hash, norm_email)
    if survey_override:
        ov_mode = survey_override.get("mode", "allow")
        result["applied_level"] = "survey_user_override"
        if ov_mode == "allow":
            result["reason"] = "user_survey_override_allow"
            result["policy_mode"] = "allow"
            return result
        prev = _find_previous_submission(survey_id, fingerprint_hash, norm_email)
        prev_time = _parse_prev_time(prev)
        result["reason"] = ov_mode
        return _apply_mode_and_hours(ov_mode, survey_override.get("cooldown_hours"), prev_time, result)

    # ── Level 3: Per-survey policy ──
    survey_policy = db.survey_resubmit_policies.find_one({"survey_id": survey_id})

    # ── Level 4: Global default ──
    global_cfg = _get_global_config()

    # Resolve effective policy: survey overrides global, but only when survey is set
    # AND only if survey cooldown < global cooldown (for cooldown mode)
    effective_mode, effective_hours = _resolve_effective_policy(survey_policy, global_cfg)

    if effective_mode == "allow":
        result["reason"] = "allow"
        result["policy_mode"] = "allow"
        result["applied_level"] = "survey_policy" if survey_policy else "global_default"
        return result

    # Policy is block_forever or cooldown — check previous submission
    prev = _find_previous_submission(survey_id, fingerprint_hash, norm_email)
    prev_time = _parse_prev_time(prev)

    if not prev_time:
        result["reason"] = "no_previous_submission"
        return result

    result["applied_level"] = "survey_policy" if survey_policy else "global_default"
    result["reason"] = effective_mode
    return _apply_mode_and_hours(effective_mode, effective_hours, prev_time, result)


def _resolve_effective_policy(survey_policy: Optional[dict], global_cfg: dict):
    """
    Determine the final mode + cooldown_hours to apply.

    Rules:
    - If global is 'allow' and survey is unset → allow
    - If global is set and survey is unset → use global
    - If survey is set and global is 'allow' → use survey
    - If both set and both cooldown → use the SHORTER cooldown (survey if survey < global)
    - If both set and survey is block_forever → use block_forever
    - If survey is allow → allow (survey explicitly unlocks)
    """
    g_mode = global_cfg.get("mode", "allow")
    g_hours = _effective_hours(global_cfg.get("cooldown_hours"))

    if not survey_policy:
        return g_mode, g_hours

    s_mode = survey_policy.get("mode", "allow")
    s_hours = _effective_hours(survey_policy.get("cooldown_hours"))

    # Survey explicitly set to allow → unlock regardless of global
    if s_mode == "allow":
        return "allow", None

    # Survey set to block_forever → enforce it
    if s_mode == "block_forever":
        return "block_forever", None

    # Both are cooldown — take the shorter one
    if s_mode == "cooldown" and g_mode == "cooldown":
        s_h = s_hours or 24.0
        g_h = g_hours or 24.0
        return "cooldown", min(s_h, g_h)

    # Survey cooldown, global is allow or block_forever
    if s_mode == "cooldown":
        if g_mode == "block_forever":
            # Global is stricter — global wins
            return "block_forever", None
        return "cooldown", s_hours

    # Fallback
    return s_mode, s_hours


def _get_survey_user_override(
    survey_id: str,
    fingerprint_hash: Optional[str],
    email: Optional[str],
) -> Optional[dict]:
    identifiers = []
    if fingerprint_hash:
        identifiers.append({"fingerprint_hash": fingerprint_hash})
    if email:
        identifiers.append({"email": email})
    if not identifiers:
        return None
    return db.survey_resubmit_overrides.find_one({
        "survey_id": survey_id,
        "$or": identifiers,
    })


def _find_previous_submission(
    survey_id: str,
    fingerprint_hash: Optional[str],
    email: Optional[str],
) -> Optional[dict]:
    identifier_clauses = []
    if fingerprint_hash:
        identifier_clauses.append({"device_fingerprint": fingerprint_hash})
    if email:
        identifier_clauses.append({"user_info.email": email})
    if not identifier_clauses:
        return None
    return db.responses.find_one(
        {"survey_id": survey_id, "$or": identifier_clauses},
        sort=[("submitted_at", -1)],
    )


# ─────────────────────────────────────────────────────────────────────────────
#  API — Global default config
# ─────────────────────────────────────────────────────────────────────────────

@resubmit_bp.route("/global-config", methods=["GET"])
@requireAdmin
def get_global_config():
    """Return current global default resubmit policy."""
    try:
        cfg = _get_global_config()
        cfg.pop("_id", None)
        return jsonify({"config": _serialize(cfg)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/global-config", methods=["PUT"])
@requireAdmin
def update_global_config():
    """
    Set the platform-wide default resubmit policy.
    Body: { "mode": "allow"|"cooldown"|"block_forever", "cooldown_hours": 24 }
    """
    try:
        data = request.get_json() or {}
        mode = data.get("mode", "allow")
        if mode not in ("allow", "cooldown", "block_forever"):
            return jsonify({"error": "mode must be allow, cooldown, or block_forever"}), 400

        cooldown_hours = None
        if mode == "cooldown":
            try:
                cooldown_hours = float(data.get("cooldown_hours", 24))
                if cooldown_hours <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return jsonify({"error": "cooldown_hours must be positive"}), 400

        admin_email = g.current_user.get("email", "unknown")
        update = {
            "mode": mode,
            "cooldown_hours": cooldown_hours,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": admin_email,
        }
        db.resubmit_global_config.update_one(
            {"_id": GLOBAL_CONFIG_ID}, {"$set": update}, upsert=True
        )
        cfg = _get_global_config()
        cfg.pop("_id", None)
        return jsonify({"message": "Global config updated", "config": _serialize(cfg)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  API — Per-survey policies
# ─────────────────────────────────────────────────────────────────────────────

@resubmit_bp.route("/policies/<survey_id>", methods=["GET"])
@requireAdmin
def get_policy(survey_id: str):
    try:
        policy = db.survey_resubmit_policies.find_one({"survey_id": survey_id})
        return jsonify({"policy": _serialize(policy) if policy else None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/policies/<survey_id>", methods=["PUT"])
@requireAdmin
def upsert_policy(survey_id: str):
    """Create or update per-survey policy."""
    try:
        data = request.get_json() or {}
        mode = data.get("mode", "allow")
        if mode not in ("allow", "cooldown", "block_forever"):
            return jsonify({"error": "invalid mode"}), 400

        cooldown_hours = None
        if mode == "cooldown":
            try:
                cooldown_hours = float(data.get("cooldown_hours", 24))
                if cooldown_hours <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return jsonify({"error": "cooldown_hours must be positive"}), 400

        admin_email = g.current_user.get("email", "unknown")
        now = datetime.now(timezone.utc)
        doc = {"survey_id": survey_id, "mode": mode, "cooldown_hours": cooldown_hours,
               "updated_at": now, "updated_by": admin_email}

        if db.survey_resubmit_policies.find_one({"survey_id": survey_id}):
            db.survey_resubmit_policies.update_one({"survey_id": survey_id}, {"$set": doc})
        else:
            doc["created_at"] = now
            db.survey_resubmit_policies.insert_one(doc)

        policy = db.survey_resubmit_policies.find_one({"survey_id": survey_id})
        return jsonify({"message": "Policy saved", "policy": _serialize(policy)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/policies/<survey_id>", methods=["DELETE"])
@requireAdmin
def delete_policy(survey_id: str):
    try:
        db.survey_resubmit_policies.delete_one({"survey_id": survey_id})
        return jsonify({"message": "Policy removed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  API — Per-survey user overrides
# ─────────────────────────────────────────────────────────────────────────────

@resubmit_bp.route("/overrides/<survey_id>", methods=["GET"])
@requireAdmin
def list_overrides(survey_id: str):
    try:
        ovs = list(db.survey_resubmit_overrides.find({"survey_id": survey_id}).sort("created_at", -1))
        return jsonify({"overrides": [_serialize(o) for o in ovs]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/overrides/<survey_id>", methods=["POST"])
@requireAdmin
def create_override(survey_id: str):
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").lower().strip()
        fp = (data.get("fingerprint_hash") or "").strip()
        mode = data.get("mode", "allow")
        note = (data.get("note") or "").strip()

        if not email and not fp:
            return jsonify({"error": "email or fingerprint_hash required"}), 400
        if mode not in ("allow", "cooldown", "block_forever"):
            return jsonify({"error": "invalid mode"}), 400

        cooldown_hours = None
        if mode == "cooldown":
            try:
                cooldown_hours = float(data.get("cooldown_hours", 24))
                if cooldown_hours <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return jsonify({"error": "cooldown_hours must be positive"}), 400

        admin_email = g.current_user.get("email", "unknown")
        now = datetime.now(timezone.utc)
        match_q = {"survey_id": survey_id}
        if email:
            match_q["email"] = email
        elif fp:
            match_q["fingerprint_hash"] = fp

        doc = {"survey_id": survey_id, "email": email or None, "fingerprint_hash": fp or None,
               "mode": mode, "cooldown_hours": cooldown_hours, "note": note,
               "created_by": admin_email, "updated_at": now}

        existing = db.survey_resubmit_overrides.find_one(match_q)
        if existing:
            db.survey_resubmit_overrides.update_one({"_id": existing["_id"]}, {"$set": doc})
        else:
            doc["created_at"] = now
            db.survey_resubmit_overrides.insert_one(doc)

        override = db.survey_resubmit_overrides.find_one(match_q)
        return jsonify({"message": "Override saved", "override": _serialize(override)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/overrides/<survey_id>/<override_id>", methods=["DELETE"])
@requireAdmin
def delete_override(survey_id: str, override_id: str):
    try:
        db.survey_resubmit_overrides.delete_one({"_id": ObjectId(override_id)})
        return jsonify({"message": "Override removed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  API — Per-user GLOBAL rules (applies to ALL surveys for that user)
# ─────────────────────────────────────────────────────────────────────────────

@resubmit_bp.route("/user-global-rules", methods=["GET"])
@requireAdmin
def list_user_global_rules():
    """List all users who have a global rule set."""
    try:
        rules = list(db.resubmit_user_global_rules.find().sort("created_at", -1))
        return jsonify({"rules": [_serialize(r) for r in rules]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/user-global-rules", methods=["POST"])
@requireAdmin
def create_user_global_rule():
    """
    Set a global rule for a user (applies to ALL surveys).
    Body: { "email": "...", "mode": "allow"|"cooldown"|"block_forever", "cooldown_hours": 12, "note": "..." }
    mode=allow means this user can always refill any survey (full unlock).
    """
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").lower().strip()
        mode = data.get("mode", "allow")
        note = (data.get("note") or "").strip()

        if not email:
            return jsonify({"error": "email is required"}), 400
        if mode not in ("allow", "cooldown", "block_forever"):
            return jsonify({"error": "invalid mode"}), 400

        cooldown_hours = None
        if mode == "cooldown":
            try:
                cooldown_hours = float(data.get("cooldown_hours", 24))
                if cooldown_hours <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return jsonify({"error": "cooldown_hours must be positive"}), 400

        admin_email = g.current_user.get("email", "unknown")
        now = datetime.now(timezone.utc)
        doc = {"email": email, "mode": mode, "cooldown_hours": cooldown_hours,
               "note": note, "created_by": admin_email, "updated_at": now}

        existing = db.resubmit_user_global_rules.find_one({"email": email})
        if existing:
            db.resubmit_user_global_rules.update_one({"email": email}, {"$set": doc})
        else:
            doc["created_at"] = now
            db.resubmit_user_global_rules.insert_one(doc)

        rule = db.resubmit_user_global_rules.find_one({"email": email})
        return jsonify({"message": "User global rule saved", "rule": _serialize(rule)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/user-global-rules/<rule_id>", methods=["DELETE"])
@requireAdmin
def delete_user_global_rule(rule_id: str):
    try:
        db.resubmit_user_global_rules.delete_one({"_id": ObjectId(rule_id)})
        return jsonify({"message": "User global rule removed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  Public check endpoint (called by survey frontend on load)
# ─────────────────────────────────────────────────────────────────────────────

@resubmit_bp.route("/check/<survey_id>", methods=["POST"])
def check_resubmit_public(survey_id: str):
    try:
        data = request.get_json() or {}
        fp = (data.get("fingerprint_hash") or "").strip() or None
        email = (data.get("email") or "").lower().strip() or None
        return jsonify(check_resubmit_allowed(survey_id, fp, email))
    except Exception as e:
        return jsonify({"allowed": True, "reason": "check_error", "error": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
#  Admin helpers
# ─────────────────────────────────────────────────────────────────────────────

@resubmit_bp.route("/submissions/<survey_id>", methods=["GET"])
@requireAdmin
def list_submissions(survey_id: str):
    try:
        limit = int(request.args.get("limit", 50))
        subs = list(
            db.responses.find(
                {"survey_id": survey_id},
                {"_id": 1, "id": 1, "user_info.email": 1, "user_info.username": 1,
                 "user_info.ip_address": 1, "device_fingerprint": 1,
                 "submitted_at": 1, "suspected_duplicate": 1}
            ).sort("submitted_at", -1).limit(limit)
        )
        return jsonify({"submissions": [_serialize(s) for s in subs]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resubmit_bp.route("/overview", methods=["GET"])
@requireAdmin
def overview():
    try:
        surveys = list(db.surveys.find({}, {"short_id": 1, "title": 1, "status": 1}).sort("created_at", -1))
        policies_map = {p["survey_id"]: p for p in db.survey_resubmit_policies.find({})}
        global_cfg = _get_global_config()
        global_cfg.pop("_id", None)

        result = []
        for s in surveys:
            sid = s.get("short_id") or str(s.get("_id", ""))
            policy = policies_map.get(sid)
            result.append({
                "survey_id": sid,
                "survey_title": s.get("title", "Untitled"),
                "survey_status": s.get("status", "draft"),
                "policy": _serialize(policy) if policy else None,
            })

        return jsonify({"surveys": result, "global_config": _serialize(global_cfg)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
