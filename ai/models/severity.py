"""
============================================================
SMART EMERGENCY RESPONSE
AI SEVERITY ANALYZER
============================================================

Purpose:
    Estimates emergency severity from 1 to 5.

Severity levels:

    1 -> LOW
    2 -> MODERATE
    3 -> HIGH
    4 -> VERY_HIGH
    5 -> CRITICAL

The system uses transparent keyword-based rules and can also
consider the severity reported by the citizen.
============================================================
"""

from __future__ import annotations

import re
from typing import Dict


# ------------------------------------------------------------
# SEVERITY KEYWORDS
# ------------------------------------------------------------

SEVERITY_KEYWORDS = {

    5: [
        "critical",
        "life threatening",
        "multiple injured",
        "unconscious",
        "trapped",
        "major fire",
        "building collapse",
        "explosion",
        "mass casualty",
        "बड़ी आग",
        "बेहोश",
        "फंसे",
        "विस्फोट",
    ],

    4: [
        "severe",
        "serious",
        "heavy bleeding",
        "large fire",
        "collapsed",
        "multiple people",
        "major accident",
        "गंभीर",
        "भारी खून",
        "बड़ा हादसा",
    ],

    3: [
        "injured",
        "accident",
        "smoke",
        "fire",
        "flood",
        "blocked road",
        "घायल",
        "दुर्घटना",
        "धुआं",
        "आग",
        "बाढ़",
    ],

    2: [
        "minor",
        "small",
        "warning",
        "suspicious",
        "waterlogging",
        "छोटा",
        "चेतावनी",
        "जलभराव",
    ],
}


# ------------------------------------------------------------
# TEXT NORMALIZATION
# ------------------------------------------------------------

def normalize_text(
    text: str,
) -> str:

    return re.sub(
        r"\s+",
        " ",
        str(text or "")
        .lower()
        .strip(),
    )


# ------------------------------------------------------------
# KEYWORD SCORE
# ------------------------------------------------------------

def calculate_keyword_scores(
    text: str,
) -> Dict[int, int]:

    normalized_text = normalize_text(
        text
    )

    scores = {
        level: 0
        for level in range(1, 6)
    }

    for level, keywords in SEVERITY_KEYWORDS.items():

        for keyword in keywords:

            if keyword.lower() in normalized_text:

                scores[level] += 1

    return scores


# ------------------------------------------------------------
# SEVERITY CALCULATION
# ------------------------------------------------------------

def calculate_severity(
    description: str,
    category: str | None = None,
    reported_severity: int | str | None = None,
) -> Dict:
    """
    Calculate emergency severity.

    Returns:

        {
            "severity": 1-5,
            "level": "...",
            "confidence": 0.0,
            "reason": "...",
            "keyword_scores": {...}
        }
    """

    combined_text = (
        f"{category or ''} "
        f"{description or ''}"
    )

    scores = calculate_keyword_scores(
        combined_text
    )

    # --------------------------------------------------------
    # REPORTED SEVERITY
    # --------------------------------------------------------

    try:

        user_level = (
            int(reported_severity)
            if reported_severity is not None
            else None
        )

    except (
        TypeError,
        ValueError,
    ):

        user_level = None

    # --------------------------------------------------------
    # KEYWORD SEVERITY
    # --------------------------------------------------------

    keyword_level = max(
        (
            level
            for level, score in scores.items()
            if score > 0
        ),
        default=1,
    )

    # --------------------------------------------------------
    # FINAL SEVERITY
    # --------------------------------------------------------

    if (
        user_level is not None
        and 1 <= user_level <= 5
    ):

        severity = max(
            user_level,
            keyword_level,
        )

        reason = (
            "Reported severity combined "
            "with incident indicators."
        )

    else:

        severity = keyword_level

        reason = (
            "Estimated from incident "
            "category and description."
        )

    # --------------------------------------------------------
    # SEVERITY LABELS
    # --------------------------------------------------------

    labels = {

        1: "LOW",

        2: "MODERATE",

        3: "HIGH",

        4: "VERY_HIGH",

        5: "CRITICAL",
    }

    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    confidence = (
        0.55
        if sum(scores.values())
        else 0.35
    )

    if (
        user_level is not None
        and 1 <= user_level <= 5
    ):

        confidence = min(
            0.95,
            confidence + 0.20,
        )

    return {

        "severity": severity,

        "level": labels[severity],

        "confidence": round(
            confidence,
            3,
        ),

        "reason": reason,

        "keyword_scores": scores,
    }


# ------------------------------------------------------------
# TEST
# ------------------------------------------------------------

if __name__ == "__main__":

    result = calculate_severity(
        "Two people are injured after a major road accident."
    )

    print(result)
