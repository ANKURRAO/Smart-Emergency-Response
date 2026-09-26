"""
============================================================
SMART EMERGENCY RESPONSE
AI INCIDENT ANALYSIS SERVICE
============================================================

Purpose:
    Combines all AI components into one complete incident
    analysis pipeline.

Pipeline:

    Incident
       |
       v
    Classification
       |
       v
    Severity Analysis
       |
       v
    Duplicate Detection
       |
       v
    Priority Calculation
       |
       v
    Responder Recommendation

This service is used by main.py and can also be imported
directly by other Python modules.
============================================================
"""

from __future__ import annotations

from typing import Dict, List

from models.classifier import (
    classify_incident,
)

from models.severity import (
    calculate_severity,
)

from models.duplicate import (
    detect_duplicate,
)

from services.priority_engine import (
    calculate_priority,
)


# ============================================================
# COMPLETE INCIDENT ANALYSIS
# ============================================================

def analyze_incident(
    incident: Dict,
    existing_incidents: List[Dict] | None = None,
) -> Dict:
    """
    Perform complete AI analysis.

    Returns:

        classification
        severity
        duplicate
        priority
        recommendation
    """

    if not isinstance(
        incident,
        dict,
    ):

        raise ValueError(
            "Incident must be a dictionary."
        )

    existing_incidents = (
        existing_incidents
        or []
    )

    # ========================================================
    # STEP 1 - CLASSIFICATION
    # ========================================================

    classification = (
        classify_incident(

            description=incident.get(
                "description",
                "",
            ),

            incident_type=incident.get(
                "type"
            ),
        )
    )

    # ========================================================
    # STEP 2 - SEVERITY
    # ========================================================

    severity = calculate_severity(

        description=incident.get(
            "description",
            "",
        ),

        category=classification.get(
            "category"
        ),

        reported_severity=incident.get(
            "severity"
        ),
    )

    # ========================================================
    # STEP 3 - DUPLICATE DETECTION
    # ========================================================

    duplicate = detect_duplicate(

        incident=incident,

        existing_incidents=
            existing_incidents,
    )

    # ========================================================
    # STEP 4 - LOCATION CHECK
    # ========================================================

    location_available = (

        incident.get(
            "latitude"
        ) is not None

        and

        incident.get(
            "longitude"
        ) is not None
    )

    # ========================================================
    # STEP 5 - PRIORITY
    # ========================================================

    priority = calculate_priority(

        severity=severity.get(
            "severity",
            1,
        ),

        category=classification.get(
            "category",
            "other",
        ),

        people_affected=incident.get(
            "peopleAffected",
            0,
        ),

        location_available=
            location_available,

        duplicate=duplicate.get(
            "is_duplicate",
            False,
        ),
    )

    # ========================================================
    # STEP 6 - RECOMMENDATION
    # ========================================================

    recommendation = (
        build_recommendation(

            category=classification.get(
                "category",
                "other",
            ),

            severity=severity.get(
                "severity",
                1,
            ),

            priority=priority.get(
                "priority",
                "LOW",
            ),
        )
    )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    return {

        "classification":
            classification,

        "severity":
            severity,

        "duplicate":
            duplicate,

        "priority":
            priority,

        "recommendation":
            recommendation,
    }


# ============================================================
# RESPONDER RECOMMENDATION
# ============================================================

def build_recommendation(
    category: str,
    severity: int,
    priority: str,
) -> Dict:
    """
    Recommend responder teams according to emergency type.
    """

    responder_map = {

        "fire": [
            "fire_service",
            "medical",
        ],

        "medical": [
            "ambulance",
            "medical",
        ],

        "police": [
            "police",
        ],

        "road_accident": [
            "ambulance",
            "police",
        ],

        "flood": [
            "rescue",
            "medical",
        ],

        "earthquake": [
            "rescue",
            "medical",
            "fire_service",
        ],

        "rescue": [
            "rescue",
            "medical",
        ],

        "other": [
            "general_responder",
        ],
    }

    recommended_teams = (
        responder_map.get(
            category,
            [
                "general_responder"
            ],
        )
    )

    dispatch_immediately = (

        severity >= 4

        or priority == "CRITICAL"
    )

    return {

        "priority":
            priority,

        "recommended_teams":
            recommended_teams,

        "dispatch_immediately":
            dispatch_immediately,

        "reason": (
            f"Category={category}, "
            f"severity={severity}, "
            f"priority={priority}."
        ),
    }


# ============================================================
# CLASSIFICATION ONLY
# ============================================================

def classify_only(
    description: str,
    incident_type: str | None = None,
) -> Dict:
    """
    Run only the classification model.
    """

    return classify_incident(

        description,

        incident_type,
    )


# ============================================================
# SEVERITY ONLY
# ============================================================

def severity_only(
    description: str,
    category: str | None = None,
    reported_severity: int | str | None = None,
) -> Dict:
    """
    Run only the severity model.
    """

    return calculate_severity(

        description,

        category,

        reported_severity,
    )


# ============================================================
# DUPLICATE ONLY
# ============================================================

def duplicate_only(
    incident: Dict,
    existing_incidents: List[Dict],
) -> Dict:
    """
    Run only duplicate detection.
    """

    return detect_duplicate(

        incident,

        existing_incidents,
    )


# ============================================================
# PRIORITY ONLY
# ============================================================

def priority_only(
    severity: int,
    category: str = "other",
    people_affected: int = 0,
    location_available: bool = False,
    duplicate: bool = False,
) -> Dict:
    """
    Run only the priority engine.
    """

    return calculate_priority(

        severity,

        category,

        people_affected=
            people_affected,

        location_available=
            location_available,

        duplicate=
            duplicate,
    )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    incident = {

        "incidentId":
            "INC-TEST-001",

        "type":
            "fire",

        "description":
            "A major fire with heavy smoke. "
            "Several people are trapped inside.",

        "severity":
            4,

        "latitude":
            26.7606,

        "longitude":
            83.3732,

        "peopleAffected":
            6,
    }

    result = analyze_incident(
        incident,
        [],
    )

    print(
        result
    )

