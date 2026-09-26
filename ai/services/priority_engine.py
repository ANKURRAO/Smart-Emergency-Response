"""
============================================================
SMART EMERGENCY RESPONSE
AI PRIORITY ENGINE
============================================================

Purpose:
    Calculates operational priority for an emergency incident.

Priority score:
    0 - 100

Priority levels:
    LOW
    MEDIUM
    HIGH
    CRITICAL

The engine combines:
    - Severity
    - Incident category
    - Number of affected people
    - Location availability
    - Duplicate status

This is a decision-support system for the control room.
============================================================
"""

from __future__ import annotations

from typing import Dict


# ============================================================
# CATEGORY WEIGHTS
# ============================================================

CATEGORY_WEIGHT = {

    "fire": 20,

    "medical": 22,

    "road_accident": 20,

    "police": 18,

    "earthquake": 25,

    "flood": 22,

    "rescue": 25,

    "other": 10,
}


# ============================================================
# PRIORITY LABEL
# ============================================================

def get_priority_label(
    score: int,
) -> str:
    """
    Convert numeric priority score into a priority label.
    """

    if score >= 85:

        return "CRITICAL"

    if score >= 70:

        return "HIGH"

    if score >= 45:

        return "MEDIUM"

    return "LOW"


# ============================================================
# PRIORITY CALCULATION
# ============================================================

def calculate_priority(
    severity: int,
    category: str = "other",
    *,
    people_affected: int = 0,
    location_available: bool = False,
    duplicate: bool = False,
) -> Dict:
    """
    Calculate emergency priority.

    Parameters:
        severity:
            Severity from 1 to 5.

        category:
            Emergency category.

        people_affected:
            Approximate number of affected people.

        location_available:
            Whether valid GPS coordinates are available.

        duplicate:
            Whether this report appears to duplicate another report.

    Returns:
        Dictionary containing priority score and metadata.
    """

    # --------------------------------------------------------
    # VALIDATE SEVERITY
    # --------------------------------------------------------

    try:

        severity = int(
            severity
        )

    except (
        TypeError,
        ValueError,
    ):

        severity = 1

    severity = max(
        1,
        min(
            5,
            severity,
        ),
    )

    # --------------------------------------------------------
    # VALIDATE PEOPLE COUNT
    # --------------------------------------------------------

    try:

        people_affected = int(
            people_affected
        )

    except (
        TypeError,
        ValueError,
    ):

        people_affected = 0

    people_affected = max(
        0,
        people_affected,
    )

    # --------------------------------------------------------
    # NORMALIZE CATEGORY
    # --------------------------------------------------------

    category = str(
        category or "other"
    ).lower().strip()

    category_weight = (
        CATEGORY_WEIGHT.get(
            category,
            CATEGORY_WEIGHT["other"],
        )
    )

    # --------------------------------------------------------
    # BASE SCORE
    # --------------------------------------------------------

    score = (
        severity * 14
    )

    # --------------------------------------------------------
    # CATEGORY WEIGHT
    # --------------------------------------------------------

    score += category_weight

    # --------------------------------------------------------
    # PEOPLE AFFECTED
    # --------------------------------------------------------

    if people_affected >= 10:

        score += 15

    elif people_affected >= 5:

        score += 10

    elif people_affected >= 2:

        score += 5

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    if location_available:

        score += 5

    # --------------------------------------------------------
    # DUPLICATE REPORT
    # --------------------------------------------------------

    if duplicate:

        # Duplicate reports should still remain visible,
        # but should not artificially increase priority.

        score -= 3

    # --------------------------------------------------------
    # LIMIT SCORE
    # --------------------------------------------------------

    score = max(
        0,
        min(
            100,
            int(score),
        ),
    )

    # --------------------------------------------------------
    # PRIORITY LABEL
    # --------------------------------------------------------

    priority = get_priority_label(
        score
    )

    # --------------------------------------------------------
    # RETURN RESULT
    # --------------------------------------------------------

    return {

        "score":
            score,

        "priority":
            priority,

        "severity":
            severity,

        "category":
            category,

        "people_affected":
            people_affected,

        "location_available":
            bool(location_available),

        "duplicate":
            bool(duplicate),
    }


# ============================================================
# PRIORITY EXPLANATION
# ============================================================

def explain_priority(
    result: Dict,
) -> str:
    """
    Generate a human-readable explanation.
    """

    reasons = []

    severity = result.get(
        "severity",
        1,
    )

    category = result.get(
        "category",
        "other",
    )

    people = result.get(
        "people_affected",
        0,
    )

    location = result.get(
        "location_available",
        False,
    )

    duplicate = result.get(
        "duplicate",
        False,
    )

    if severity >= 4:

        reasons.append(
            "high severity"
        )

    elif severity == 3:

        reasons.append(
            "moderate-to-high severity"
        )

    if category in (
        "fire",
        "medical",
        "earthquake",
        "rescue",
    ):

        reasons.append(
            f"{category} emergency"
        )

    if people >= 5:

        reasons.append(
            "multiple people affected"
        )

    if location:

        reasons.append(
            "GPS location available"
        )

    if duplicate:

        reasons.append(
            "possible duplicate report"
        )

    if not reasons:

        reasons.append(
            "limited emergency indicators"
        )

    return (
        "Priority calculated from "
        + ", ".join(reasons)
        + "."
    )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    result = calculate_priority(

        severity=5,

        category="fire",

        people_affected=6,

        location_available=True,

        duplicate=False,
    )

    print(result)

    print(
        explain_priority(result)
    )
