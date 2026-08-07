"""
Plan Features Configuration API
Allows admin to dynamically configure which features are available per plan (free/premium/enterprise).
"""
from flask import Blueprint, request, jsonify, g
from auth_middleware import requireAdmin
from mongodb_config import db
from datetime import datetime

plan_features_bp = Blueprint('plan_features', __name__, url_prefix='/api/admin/plan-features')

# ── Default feature configuration ─────────────────────────────────────────────
# This is the fallback/seed config. Admin can override any of these via the UI.
DEFAULT_PLAN_FEATURES = {
    # ── Core tabs — always on for everyone, no admin toggle ────────────────────
    "create": {
        "label": "Create Tab (always on)",
        "description": "Create new surveys — always accessible to all plans",
        "category": "tabs",
        "free": True, "premium": True, "enterprise": True
    },
    "survey": {
        "label": "Surveys Tab (always on)",
        "description": "Manage surveys — always accessible to all plans",
        "category": "tabs",
        "free": True, "premium": True, "enterprise": True
    },
    "analytics": {
        "label": "Analytics Tab (always on)",
        "description": "Basic analytics — always accessible to all plans",
        "category": "tabs",
        "free": True, "premium": True, "enterprise": True
    },

    # ── Top-level tabs ──────────────────────────────────────────────────────────
    "tab_analytics": {
        "label": "Analytics Tab",
        "description": "Access to the Analytics dashboard",
        "category": "tabs",
        "free": True, "premium": True, "enterprise": True
    },
    "tab_sessions": {
        "label": "Sessions Tab",
        "description": "Real-time session intelligence & geo tracking",
        "category": "tabs",
        "free": False, "premium": True, "enterprise": True
    },
    "tab_postback": {
        "label": "Postback Tab",
        "description": "Configure postback integrations",
        "category": "tabs",
        "free": False, "premium": True, "enterprise": True
    },
    "tab_passfail": {
        "label": "Pass/Fail Tab",
        "description": "Pass/Fail evaluation rules",
        "category": "tabs",
        "free": False, "premium": True, "enterprise": True
    },
    "tab_testlab": {
        "label": "Test Lab Tab",
        "description": "Widget testing lab",
        "category": "tabs",
        "free": False, "premium": False, "enterprise": True
    },
    "tab_email": {
        "label": "Email Tab",
        "description": "Email triggers and templates",
        "category": "tabs",
        "free": False, "premium": True, "enterprise": True
    },

    # ── Survey tab sub-features ─────────────────────────────────────────────────
    "survey_clone": {
        "label": "Clone Survey",
        "description": "Duplicate an existing survey",
        "category": "survey",
        "free": True, "premium": True, "enterprise": True
    },
    "survey_email_invite": {
        "label": "Email Invite",
        "description": "Send survey invitations via email",
        "category": "survey",
        "free": False, "premium": True, "enterprise": True
    },
    "survey_responses": {
        "label": "View Responses",
        "description": "Access survey response data",
        "category": "survey",
        "free": True, "premium": True, "enterprise": True
    },
    "survey_export_csv": {
        "label": "Export CSV",
        "description": "Export survey responses as CSV",
        "category": "survey",
        "free": False, "premium": True, "enterprise": True
    },

    # ── Editor: Answer types ────────────────────────────────────────────────────
    "editor_type_multiple_choice": {
        "label": "Answer Type: Multiple Choice",
        "description": "Allow multiple choice question type in editor",
        "category": "editor_answer_types",
        "free": True, "premium": True, "enterprise": True
    },
    "editor_type_short_answer": {
        "label": "Answer Type: Short Answer",
        "description": "Allow short answer / text question type",
        "category": "editor_answer_types",
        "free": True, "premium": True, "enterprise": True
    },
    "editor_type_yes_no": {
        "label": "Answer Type: Yes/No",
        "description": "Allow Yes/No question type",
        "category": "editor_answer_types",
        "free": True, "premium": True, "enterprise": True
    },
    "editor_type_rating": {
        "label": "Answer Type: Rating",
        "description": "Allow rating (1-5 stars) question type",
        "category": "editor_answer_types",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_type_scale": {
        "label": "Answer Type: Scale/Range",
        "description": "Allow 1-10 scale question type",
        "category": "editor_answer_types",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_type_dropdown": {
        "label": "Answer Type: Dropdown",
        "description": "Allow dropdown (single select) question type",
        "category": "editor_answer_types",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_type_dropdown_multi": {
        "label": "Answer Type: Multi-Dropdown",
        "description": "Allow multi-select dropdown question type",
        "category": "editor_answer_types",
        "free": False, "premium": False, "enterprise": True
    },
    "editor_type_matrix": {
        "label": "Answer Type: Matrix/Grid",
        "description": "Allow matrix/grid question type",
        "category": "editor_answer_types",
        "free": False, "premium": False, "enterprise": True
    },
    "editor_type_list": {
        "label": "Answer Type: List",
        "description": "Allow list question type",
        "category": "editor_answer_types",
        "free": False, "premium": True, "enterprise": True
    },

    # ── Editor: Animation types ─────────────────────────────────────────────────
    "editor_anim_fadeSlideUp": {
        "label": "Animation: Fade & Slide Up",
        "description": "Smooth upward entrance animation",
        "category": "editor_animations",
        "free": True, "premium": True, "enterprise": True
    },
    "editor_anim_typewriter": {
        "label": "Animation: Typewriter",
        "description": "Text types letter by letter",
        "category": "editor_animations",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_anim_flipIn": {
        "label": "Animation: Flip In",
        "description": "3D flip rotation animation",
        "category": "editor_animations",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_anim_zoomBounce": {
        "label": "Animation: Zoom Bounce",
        "description": "Zoom in with bounce effect",
        "category": "editor_animations",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_anim_slideFromLeft": {
        "label": "Animation: Slide from Left",
        "description": "Slides in from left side",
        "category": "editor_animations",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_anim_blurReveal": {
        "label": "Animation: Blur Reveal",
        "description": "Blurs in from nothing",
        "category": "editor_animations",
        "free": False, "premium": False, "enterprise": True
    },

    # ── Editor: Answer styles ───────────────────────────────────────────────────
    "editor_style_classic": {
        "label": "Answer Style: Classic Box",
        "description": "Classic bordered box answer style",
        "category": "editor_answer_styles",
        "free": True, "premium": True, "enterprise": True
    },
    "editor_style_underline": {
        "label": "Answer Style: Underline",
        "description": "Clean underline answer style",
        "category": "editor_answer_styles",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_style_card": {
        "label": "Answer Style: Card",
        "description": "Elevated card answer style",
        "category": "editor_answer_styles",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_style_pill": {
        "label": "Answer Style: Pill",
        "description": "Rounded pill answer style",
        "category": "editor_answer_styles",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_style_flat": {
        "label": "Answer Style: Flat",
        "description": "Flat minimal answer style",
        "category": "editor_answer_styles",
        "free": False, "premium": False, "enterprise": True
    },

    # ── Editor: Image settings ──────────────────────────────────────────────────
    "editor_question_image": {
        "label": "Question Images",
        "description": "Add images to questions",
        "category": "editor_images",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_option_images": {
        "label": "Option Images",
        "description": "Add images to answer choices",
        "category": "editor_images",
        "free": False, "premium": True, "enterprise": True
    },

    # ── Editor: Branching ──────────────────────────────────────────────────────
    "editor_branching": {
        "label": "Branching (Button)",
        "description": "Access to the branching editor",
        "category": "editor_branching",
        "free": False, "premium": True, "enterprise": True
    },
    "branching_redirect_chain": {
        "label": "Branching: Redirect Chain",
        "description": "RedirectChain sub-tab in simple branching",
        "category": "editor_branching",
        "free": False, "premium": True, "enterprise": True
    },
    "branching_survey_end": {
        "label": "Branching: Survey End",
        "description": "SurveyEnd sub-tab in simple branching",
        "category": "editor_branching",
        "free": False, "premium": True, "enterprise": True
    },
    "branching_survey_chain": {
        "label": "Branching: Survey Chain (◈)",
        "description": "Survey◈ (chain surveys) sub-tab in simple branching",
        "category": "editor_branching",
        "free": False, "premium": False, "enterprise": True
    },
    "branching_multi_layer": {
        "label": "Branching: Multi Layer",
        "description": "Multi Layer sub-tab in simple branching",
        "category": "editor_branching",
        "free": False, "premium": False, "enterprise": True
    },
    "branching_flow_diagram": {
        "label": "Branching: Flow Diagram",
        "description": "Flow Diagram view in branching editor",
        "category": "editor_branching",
        "free": False, "premium": True, "enterprise": True
    },

    # ── Editor: AI features ─────────────────────────────────────────────────────
    "editor_ai_generate": {
        "label": "AI: Generate Survey",
        "description": "AI survey generation (Create tab)",
        "category": "editor_ai",
        "free": True, "premium": True, "enterprise": True
    },
    "editor_ai_refine": {
        "label": "AI: Refine Question",
        "description": "AI rephrase/refine individual questions",
        "category": "editor_ai",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_ai_options": {
        "label": "AI: Generate Options",
        "description": "AI auto-generate answer options",
        "category": "editor_ai",
        "free": False, "premium": True, "enterprise": True
    },
    "editor_ai_assistant": {
        "label": "AI: Editor Assistant (FAB)",
        "description": "Floating AI assistant command box",
        "category": "editor_ai",
        "free": False, "premium": True, "enterprise": True
    },
}

PLAN_FEATURES_CONFIG_ID = "global_plan_features"


def _get_plan_features_config():
    """Get the plan features config document, seeding defaults if not present."""
    doc = db.plan_features_config.find_one({"_id": PLAN_FEATURES_CONFIG_ID})
    if not doc:
        seed = dict(DEFAULT_PLAN_FEATURES)
        seed["_id"] = PLAN_FEATURES_CONFIG_ID
        seed["updated_at"] = datetime.utcnow().isoformat()
        seed["updated_by"] = "system"
        db.plan_features_config.insert_one(seed)
        return dict(DEFAULT_PLAN_FEATURES)

    # Merge: add any new default features that don't exist in the stored doc
    merged = dict(DEFAULT_PLAN_FEATURES)
    for key, val in doc.items():
        if key not in ("_id", "updated_at", "updated_by"):
            merged[key] = val

    return merged


def _config_to_role_features(config: dict) -> dict:
    """Convert the flat config dict to {role: [features]} format for the frontend."""
    role_features = {"free": [], "premium": [], "enterprise": [], "admin": []}

    for feature_key, feature_data in config.items():
        if not isinstance(feature_data, dict):
            continue
        if feature_data.get("free"):
            role_features["free"].append(feature_key)
        if feature_data.get("premium"):
            role_features["premium"].append(feature_key)
        if feature_data.get("enterprise"):
            role_features["enterprise"].append(feature_key)
        # Admin always gets everything
        role_features["admin"].append(feature_key)

    return role_features


@plan_features_bp.route('', methods=['GET'])
@plan_features_bp.route('/', methods=['GET'])
@requireAdmin
def get_plan_features():
    """Get the full plan features configuration."""
    try:
        config = _get_plan_features_config()
        role_features = _config_to_role_features(config)

        # Group by category for the UI
        categories = {}
        for key, data in config.items():
            if not isinstance(data, dict):
                continue
            cat = data.get("category", "other")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append({
                "key": key,
                **data
            })

        return jsonify({
            "features": config,
            "categories": categories,
            "role_features": role_features,
            "default_features": DEFAULT_PLAN_FEATURES
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get plan features: {str(e)}"}), 500


@plan_features_bp.route('/public', methods=['GET'])
def get_plan_features_public():
    """
    Public endpoint — returns features per role for frontend auth checks.
    No auth required so the auth check endpoint can call this.
    """
    try:
        config = _get_plan_features_config()
        role_features = _config_to_role_features(config)
        return jsonify({"role_features": role_features})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@plan_features_bp.route('/update', methods=['PUT'])
@requireAdmin
def update_plan_feature():
    """Update a single feature's plan access flags."""
    try:
        data = request.get_json() or {}
        feature_key = data.get("feature_key")
        if not feature_key:
            return jsonify({"error": "feature_key is required"}), 400

        # Validate feature_key exists in defaults or current config
        config = _get_plan_features_config()
        if feature_key not in config:
            return jsonify({"error": f"Unknown feature: {feature_key}"}), 400

        updates = {}
        for plan in ("free", "premium", "enterprise"):
            if plan in data:
                updates[f"{feature_key}.{plan}"] = bool(data[plan])

        if not updates:
            return jsonify({"error": "No plan values provided (free/premium/enterprise)"}), 400

        updates["updated_at"] = datetime.utcnow().isoformat()
        updates["updated_by"] = str(g.current_user.get("email", "admin"))

        db.plan_features_config.update_one(
            {"_id": PLAN_FEATURES_CONFIG_ID},
            {"$set": updates},
            upsert=True
        )

        return jsonify({
            "message": f"Feature '{feature_key}' updated successfully",
            "feature_key": feature_key
        })
    except Exception as e:
        return jsonify({"error": f"Failed to update feature: {str(e)}"}), 500


@plan_features_bp.route('/bulk-update', methods=['PUT'])
@requireAdmin
def bulk_update_plan_features():
    """Bulk update multiple features at once."""
    try:
        data = request.get_json() or {}
        updates_list = data.get("updates", [])
        if not updates_list:
            return jsonify({"error": "updates array is required"}), 400

        config = _get_plan_features_config()
        mongo_updates = {}

        for update in updates_list:
            feature_key = update.get("feature_key")
            if not feature_key or feature_key not in config:
                continue
            for plan in ("free", "premium", "enterprise"):
                if plan in update:
                    mongo_updates[f"{feature_key}.{plan}"] = bool(update[plan])

        if not mongo_updates:
            return jsonify({"error": "No valid updates provided"}), 400

        mongo_updates["updated_at"] = datetime.utcnow().isoformat()
        mongo_updates["updated_by"] = str(g.current_user.get("email", "admin"))

        db.plan_features_config.update_one(
            {"_id": PLAN_FEATURES_CONFIG_ID},
            {"$set": mongo_updates},
            upsert=True
        )

        return jsonify({
            "message": f"Updated {len(updates_list)} features",
            "updated_count": len(updates_list)
        })
    except Exception as e:
        return jsonify({"error": f"Failed to bulk update features: {str(e)}"}), 500


@plan_features_bp.route('/reset', methods=['POST'])
@requireAdmin
def reset_to_defaults():
    """Reset all plan features to the default configuration."""
    try:
        seed = dict(DEFAULT_PLAN_FEATURES)
        seed["_id"] = PLAN_FEATURES_CONFIG_ID
        seed["updated_at"] = datetime.utcnow().isoformat()
        seed["updated_by"] = str(g.current_user.get("email", "admin"))

        db.plan_features_config.replace_one(
            {"_id": PLAN_FEATURES_CONFIG_ID},
            seed,
            upsert=True
        )

        return jsonify({"message": "Plan features reset to defaults"})
    except Exception as e:
        return jsonify({"error": f"Failed to reset: {str(e)}"}), 500
