"""
============================================================
SMART EMERGENCY RESPONSE
AI DUPLICATE INCIDENT DETECTOR
============================================================

Purpose:
    Detects whether a newly reported incident is similar to
    an already existing incident.

Features:
    - Text similarity using TF-IDF
    - Cosine similarity
    - Location proximity support
    - Configurable similarity threshold
    - Top matching incidents
    - Safe fallback when ML library is unavailable

Output:
    - is_duplicate
    - confidence
    - matches
    - threshold
============================================================
"""

from __future__ import annotations

from typing import Dict, List

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    SKLEARN_AVAILABLE = True

except ImportError:

    TfidfVectorizer = None
    cosine_similarity = None

    SKLEARN_AVAILABLE = False


# ============================================================
# TEXT EXTRACTION
# ============================================================

def extract_incident_text(
    incident: Dict,
) -> str:
    """
    Create one searchable text string from an incident.
    """

    fields = [
        "type",
        "category",
        "description",
        "landmark",
    ]

    values = []

    for field in fields:

        value = incident.get(
            field,
            "",
        )

        if value:

            values.append(
                str(value)
            )

    return " ".join(values).strip()


# ============================================================
# FALLBACK TOKEN SIMILARITY
# ============================================================

def fallback_similarity(
    text_a: str,
    text_b: str,
) -> float:
    """
    Simple word-overlap similarity.

    Used only when scikit-learn is unavailable.
    """

    words_a = set(
        text_a.lower().split()
    )

    words_b = set(
        text_b.lower().split()
    )

    if not words_a or not words_b:

        return 0.0

    intersection = (
        words_a & words_b
    )

    union = (
        words_a | words_b
    )

    return len(intersection) / len(
        union
    )


# ============================================================
# TEXT SIMILARITY
# ============================================================

def calculate_text_similarity(
    text_a: str,
    text_b: str,
) -> float:
    """
    Calculate similarity between two incident descriptions.
    """

    if not text_a or not text_b:

        return 0.0

    # --------------------------------------------------------
    # FALLBACK
    # --------------------------------------------------------

    if not SKLEARN_AVAILABLE:

        return fallback_similarity(
            text_a,
            text_b,
        )

    # --------------------------------------------------------
    # TF-IDF
    # --------------------------------------------------------

    try:

        vectorizer = TfidfVectorizer(
            stop_words="english"
        )

        matrix = vectorizer.fit_transform(
            [
                text_a,
                text_b,
            ]
        )

        similarity = cosine_similarity(
            matrix[0:1],
            matrix[1:2],
        )[0][0]

        return float(
            similarity
        )

    except Exception:

        return fallback_similarity(
            text_a,
            text_b,
        )


# ============================================================
# LOCATION SIMILARITY
# ============================================================

def calculate_location_bonus(
    incident_a: Dict,
    incident_b: Dict,
) -> float:
    """
    Give a small similarity bonus when incidents are
    geographically close.

    This is intentionally a simple coordinate comparison.
    """

    try:

        lat_a = float(
            incident_a.get(
                "latitude"
            )
        )

        lng_a = float(
            incident_a.get(
                "longitude"
            )
        )

        lat_b = float(
            incident_b.get(
                "latitude"
            )
        )

        lng_b = float(
            incident_b.get(
                "longitude"
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        return 0.0

    distance = (
        (lat_a - lat_b) ** 2
        +
        (lng_a - lng_b) ** 2
    ) ** 0.5

    # Very close coordinates
    if distance < 0.005:

        return 0.15

    # Nearby coordinates
    if distance < 0.01:

        return 0.10

    # Moderately close
    if distance < 0.03:

        return 0.05

    return 0.0


# ============================================================
# DUPLICATE DETECTION
# ============================================================

def detect_duplicate(
    incident: Dict,
    existing_incidents: List[Dict],
    threshold: float = 0.72,
) -> Dict:
    """
    Compare one incident with existing incidents.

    Parameters:
        incident:
            Newly reported incident.

        existing_incidents:
            List of existing incidents.

        threshold:
            Similarity threshold between 0 and 1.

    Returns:
        {
            "is_duplicate": bool,
            "confidence": float,
            "matches": [],
            "threshold": float
        }
    """

    # --------------------------------------------------------
    # VALIDATE THRESHOLD
    # --------------------------------------------------------

    try:

        threshold = float(
            threshold
        )

    except (
        TypeError,
        ValueError,
    ):

        threshold = 0.72

    threshold = max(
        0.0,
        min(
            1.0,
            threshold,
        ),
    )

    # --------------------------------------------------------
    # INCIDENT ID
    # --------------------------------------------------------

    incident_id = (
        incident.get("id")
        or incident.get("incidentId")
    )

    current_text = extract_incident_text(
        incident
    )

    candidates = []

    # --------------------------------------------------------
    # COMPARE EXISTING INCIDENTS
    # --------------------------------------------------------

    for existing in (
        existing_incidents or []
    ):

        existing_id = (
            existing.get("id")
            or existing.get("incidentId")
        )

        # Skip the same incident
        if (
            incident_id
            and existing_id
            and incident_id == existing_id
        ):

            continue

        existing_text = (
            extract_incident_text(
                existing
            )
        )

        text_similarity = (
            calculate_text_similarity(
                current_text,
                existing_text,
            )
        )

        location_bonus = (
            calculate_location_bonus(
                incident,
                existing,
            )
        )

        combined_similarity = min(
            1.0,
            text_similarity
            + location_bonus,
        )

        candidates.append(
            {
                "incidentId": existing_id,
                "similarity": round(
                    combined_similarity,
                    3,
                ),
                "textSimilarity": round(
                    text_similarity,
                    3,
                ),
                "locationBonus": round(
                    location_bonus,
                    3,
                ),
            }
        )

    # --------------------------------------------------------
    # SORT MATCHES
    # --------------------------------------------------------

    candidates.sort(
        key=lambda item:
        item["similarity"],
        reverse=True,
    )

    matches = [
        item
        for item in candidates
        if item["similarity"]
        >= threshold
    ]

    # --------------------------------------------------------
    # RESULT
    # --------------------------------------------------------

    if matches:

        confidence = matches[0][
            "similarity"
        ]

    else:

        confidence = 0.0

    return {

        "is_duplicate":
            bool(matches),

        "confidence":
            round(
                confidence,
                3,
            ),

        "matches":
            matches[:5],

        "threshold":
            threshold,
    }


# ============================================================
# FIND RELATED INCIDENTS
# ============================================================

def find_related_incidents(
    incident: Dict,
    existing_incidents: List[Dict],
    threshold: float = 0.40,
) -> List[Dict]:
    """
    Find incidents that are related but may not be duplicates.
    """

    current_text = extract_incident_text(
        incident
    )

    results = []

    incident_id = (
        incident.get("id")
        or incident.get("incidentId")
    )

    for existing in (
        existing_incidents or []
    ):

        existing_id = (
            existing.get("id")
            or existing.get("incidentId")
        )

        if (
            incident_id
            and incident_id == existing_id
        ):

            continue

        similarity = (
            calculate_text_similarity(
                current_text,
                extract_incident_text(
                    existing
                ),
            )
        )

        if similarity >= threshold:

            results.append(
                {
                    "incidentId":
                        existing_id,

                    "similarity":
                        round(
                            similarity,
                            3,
                        ),
                }
            )

    results.sort(
        key=lambda item:
        item["similarity"],
        reverse=True,
    )

    return results[:10]


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    new_incident = {

        "id": "INC-100",

        "type": "fire",

        "description":
            "Fire and heavy smoke near the market.",
    }

    existing_incidents = [

        {

            "id": "INC-090",

            "type": "fire",

            "description":
                "Smoke and fire reported near market.",
        },

        {

            "id": "INC-080",

            "type": "flood",

            "description":
                "Road is flooded after heavy rain.",
        },
    ]

    result = detect_duplicate(
        new_incident,
        existing_incidents,
    )

    print(result)

