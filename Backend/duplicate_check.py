"""
Duplicate Submission Detection
- Hard block: localStorage key set by frontend (near-zero false positives)
- Soft flag:  device fingerprint match -> marks response as suspected_duplicate
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Optional
from mongodb_config import db


def _hash_fingerprint(raw: str) -> str:
    """Normalize and hash raw fingerprint string"""
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def check_duplicate(survey_id: str, fingerprint_raw: Optional[str]) -> dict:
    """
    Check if a submission looks like a duplicate based on device fingerprint.

    Returns:
        {
            "is_duplicate": bool,          # True = definite repeat (same fingerprint)
            "suspected": bool,             # True = possible repeat (softer signal)
            "previous_response_id": str | None
        }
    """
    result = {"is_duplicate": False, "suspected": False, "previous_response_id": None}

    if not fingerprint_raw:
        return result

    fp_hash = _hash_fingerprint(fingerprint_raw)

    existing = db.responses.find_one(
        {
            "survey_id": survey_id,
            "device_fingerprint": fp_hash,
        },
        {"_id": 1, "id": 1},
    )

    if existing:
        response_id = existing.get("id") or str(existing.get("_id", ""))
        result["is_duplicate"] = True
        result["suspected"] = True
        result["previous_response_id"] = response_id
        print(
            f"⚠️ [DuplicateCheck] Fingerprint match found for survey {survey_id} "
            f"→ previous response: {response_id}"
        )

    return result


def enrich_response_with_duplicate_info(
    response_data: dict, fingerprint_raw: Optional[str], duplicate_result: dict
) -> dict:
    """
    Attach fingerprint hash and duplicate flags to a response document
    before it is saved to MongoDB.
    """
    if fingerprint_raw:
        response_data["device_fingerprint"] = _hash_fingerprint(fingerprint_raw)

    response_data["suspected_duplicate"] = duplicate_result.get("suspected", False)
    response_data["duplicate_check"] = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "fingerprint_present": bool(fingerprint_raw),
        "matched": duplicate_result.get("is_duplicate", False),
        "previous_response_id": duplicate_result.get("previous_response_id"),
    }

    return response_data
