"""
Loading Animation API
Stores the admin-chosen survey-creation loading animation ID in MongoDB.
Collection: db.platform_config  document _id: 'loading_animation'
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

from auth_middleware import requireAdmin
from mongodb_config import db

try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except ImportError:
    pass

logger = logging.getLogger(__name__)

loading_animation_bp = Blueprint(
    "loading_animation", __name__,
    url_prefix="/api/admin/loading-animation"
)

VALID_IDS = {"gooey", "dots", "pulse", "bars", "orbit"}
DEFAULT_ID = "gooey"


def _get_animation_id() -> str:
    doc = db.platform_config.find_one({"_id": "loading_animation"})
    return doc.get("animation_id", DEFAULT_ID) if doc else DEFAULT_ID


# ── Public (no auth) — called by SurveyForm / PublicSurveyCreation ─────────────
@loading_animation_bp.route("/public", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
def get_animation_public():
    """GET /api/admin/loading-animation/public — returns current animation ID, no auth."""
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"animation_id": _get_animation_id()}), 200


# ── Admin routes ──────────────────────────────────────────────────────────────
@loading_animation_bp.route("", methods=["GET", "OPTIONS"])
@cross_origin(supports_credentials=True, origins="*")
@requireAdmin
def get_animation():
    """GET /api/admin/loading-animation — returns current animation ID."""
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"animation_id": _get_animation_id()}), 200


@loading_animation_bp.route("", methods=["PUT"])
@cross_origin(supports_credentials=True, origins="*")
@requireAdmin
def set_animation():
    """PUT /api/admin/loading-animation  body: { animation_id: 'dots' }"""
    data = request.get_json(silent=True) or {}
    animation_id = str(data.get("animation_id", "")).strip()

    if animation_id not in VALID_IDS:
        return jsonify({"error": f"Invalid animation_id. Must be one of: {', '.join(sorted(VALID_IDS))}"}), 400

    db.platform_config.update_one(
        {"_id": "loading_animation"},
        {"$set": {"animation_id": animation_id, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    logger.info(f"✅ Loading animation set to: {animation_id}")
    return jsonify({"success": True, "animation_id": animation_id,
                    "message": f"Loading animation updated to '{animation_id}'."}), 200
