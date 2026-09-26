"""
============================================================
SMART EMERGENCY RESPONSE
AI INCIDENT CLASSIFIER
============================================================

Purpose:
    Classifies an emergency incident into a suitable category.

Supported categories:
    - fire
    - medical
    - police
    - flood
    - earthquake
    - road_accident
    - rescue
    - other

The classifier uses a lightweight keyword-scoring approach so
that the AI module can work without a paid external AI API.
============================================================
"""

from __future__ import annotations

import re
from typing import Dict, List


# ------------------------------------------------------------
# CATEGORY KEYWORDS
# ------------------------------------------------------------

CATEGORY_KEYWORDS: Dict[str, List[str]] = {

    "fire": [
        "fire",
        "flame",
        "burning",
        "smoke",
        "blaze",
        "आग",
        "धुआं",
        "जल रहा",
    ],

    "medical": [
        "medical",
        "ambulance",
        "injury",
        "injured",
        "unconscious",
        "bleeding",
        "heart",
        "breathing",
        "accident",
        "hospital",
        "मेडिकल",
        "घायल",
        "बेहोश",
        "खून",
        "सांस",
        "अस्पताल",
    ],

    "police": [
        "police",
        "crime",
        "robbery",
        "theft",
        "fight",
        "attack",
        "violence",
        "weapon",
        "चोरी",
        "लूट",
        "मारपीट",
        "पुलिस",
        "हमला",
    ],

    "flood": [
        "flood",
        "flooding",
        "water level",
        "waterlogging",
        "heavy rain",
        "बाढ़",
        "जलभराव",
        "पानी भर",
        "तेज बारिश",
    ],

    "earthquake": [
        "earthquake",
        "tremor",
        "quake",
        "earthquake damage",
        "भूकंप",
        "झटके",
    ],

    "road_accident": [
        "road accident",
        "car crash",
        "bike crash",
        "collision",
        "vehicle accident",
        "traffic accident",
        "सड़क हादसा",
        "टक्कर",
    ],

    "rescue": [
        "trapped",
        "rescue",
        "stuck",
        "collapsed",
        "missing",
        "फंसा",
        "बचाव",
        "मलबा",
        "लापता",
    ],

    "other": [],
}


# ------------------------------------------------------------
# TEXT NORMALIZATION
# ------------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Normalize input text.

    Removes unnecessary spaces and converts text to lowercase.
    """

    text = str(text or "").lower().strip()

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text


# ------------------------------------------------------------
# SCORE CALCULATION
# ------------------------------------------------------------

def calculate_category_scores(
    text: str,
) -> Dict[str, int]:
    """
    Calculate keyword scores for every emergency category.
    """

    normalized_text = normalize_text(text)

    scores = {
        category: 0
        for category in CATEGORY_KEYWORDS
    }

    for category, keywords in CATEGORY_KEYWORDS.items():

        for keyword in keywords:

            if keyword.lower() in normalized_text:

                scores[category] += 1

    return scores


# ------------------------------------------------------------
# INCIDENT CLASSIFICATION
# ------------------------------------------------------------

def classify_incident(
    description: str,
    incident_type: str | None = None,
) -> Dict:
    """
    Classify an emergency incident.

    Returns:

        {
            "category": "...",
            "confidence": 0.0,
            "scores": {...},
            "matched_keywords": [...]
        }
    """

    combined_text = (
        f"{incident_type or ''} "
        f"{normalize_text(description)}"
    )

    scores = calculate_category_scores(
        combined_text
    )

    best_category = max(
        scores,
        key=scores.get,
    )

    best_score = scores[best_category]

    total_score = sum(
        scores.values()
    )

    # --------------------------------------------------------
    # NO MATCH
    # --------------------------------------------------------

    if best_score == 0:

        best_category = "other"

        confidence = 0.20

    else:

        confidence = min(
            0.98,
            0.50
            + (
                best_score
                / max(total_score, 1)
            )
            * 0.48,
        )

    # --------------------------------------------------------
    # MATCHED KEYWORDS
    # --------------------------------------------------------

    normalized_text = normalize_text(
        combined_text
    )

    matched_keywords = []

    for keyword in CATEGORY_KEYWORDS.get(
        best_category,
        [],
    ):

        if keyword.lower() in normalized_text:

            matched_keywords.append(
                keyword
            )

    return {

        "category": best_category,

        "confidence": round(
            confidence,
            3,
        ),

        "scores": scores,

        "matched_keywords":
            matched_keywords,
    }


# ------------------------------------------------------------
# SUPPORTED CATEGORIES
# ------------------------------------------------------------

def get_supported_categories() -> List[str]:
    """
    Return all supported emergency categories.
    """

    return list(
        CATEGORY_KEYWORDS.keys()
    )


# ------------------------------------------------------------
# TEST
# ------------------------------------------------------------

if __name__ == "__main__":

    result = classify_incident(
        "There is a fire and heavy smoke in a building."
    )

    print(result)
