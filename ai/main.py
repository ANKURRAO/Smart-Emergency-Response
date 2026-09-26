"""
============================================================
SMART EMERGENCY RESPONSE
AI API SERVER
============================================================

Purpose:
    Provides REST API endpoints for the AI module.

Framework:
    FastAPI

Endpoints:

    GET  /
    GET  /health
    GET  /categories

    POST /analyze
    POST /classify
    POST /severity
    POST /duplicate
    POST /priority

Run:

    python main.py

OR:

    uvicorn main:app --host 0.0.0.0 --port 8000

Default URL:

    http://localhost:8000

Swagger Documentation:

    http://localhost:8000/docs
============================================================
"""

from __future__ import annotations

import os
import sys

from typing import (
    Any,
    Dict,
    List,
    Optional,
)


# ============================================================
# PROJECT PATH
# ============================================================

AI_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

if AI_DIR not in sys.path:

    sys.path.insert(
        0,
        AI_DIR,
    )


# ============================================================
# FASTAPI IMPORTS
# ============================================================

from fastapi import (
    FastAPI,
    HTTPException,
)

from pydantic import (
    BaseModel,
    Field,
)


# ============================================================
# AI IMPORTS
# ============================================================

from models.classifier import (
    classify_incident,
    get_supported_categories,
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

from services.incident_analysis import (
    analyze_incident,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(

    title=
        "Smart Emergency Response AI",

    description=(
        "AI-assisted emergency incident "
        "classification, severity analysis, "
        "duplicate detection and priority "
        "calculation service."
    ),

    version="1.0.0",
)


# ============================================================
# INCIDENT MODEL
# ============================================================

class Incident(BaseModel):
    """
    Incoming emergency incident.
    """

    id: Optional[str] = None

    incidentId: Optional[str] = None

    type: Optional[str] = None

    category: Optional[str] = None

    description: str = ""

    severity: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
    )

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    landmark: Optional[str] = None

    peopleAffected: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# ANALYSIS REQUEST
# ============================================================

class AnalyzeRequest(BaseModel):
    """
    Complete AI analysis request.
    """

    incident: Incident

    existing_incidents: List[
        Dict[str, Any]
    ] = Field(
        default_factory=list
    )


# ============================================================
# CLASSIFICATION REQUEST
# ============================================================

class ClassifyRequest(BaseModel):

    description: str = ""

    incident_type: Optional[str] = None


# ============================================================
# SEVERITY REQUEST
# ============================================================

class SeverityRequest(BaseModel):

    description: str = ""

    category: Optional[str] = None

    reported_severity: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
    )


# ============================================================
# DUPLICATE REQUEST
# ============================================================

class DuplicateRequest(BaseModel):

    incident: Dict[str, Any]

    existing_incidents: List[
        Dict[str, Any]
    ] = Field(
        default_factory=list
    )

    threshold: float = Field(
        default=0.72,
        ge=0.0,
        le=1.0,
    )


# ============================================================
# PRIORITY REQUEST
# ============================================================

class PriorityRequest(BaseModel):

    severity: int = Field(
        ge=1,
        le=5,
    )

    category: str = "other"

    people_affected: int = Field(
        default=0,
        ge=0,
    )

    location_available: bool = False

    duplicate: bool = False


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root() -> Dict[str, Any]:
    """
    AI service information.
    """

    return {

        "success":
            True,

        "service":
            "Smart Emergency Response AI",

        "version":
            "1.0.0",

        "status":
            "running",

        "endpoints": [

            "/health",

            "/categories",

            "/analyze",

            "/classify",

            "/severity",

            "/duplicate",

            "/priority",
        ],
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health() -> Dict[str, Any]:
    """
    Check AI service health.
    """

    return {

        "success":
            True,

        "status":
            "healthy",

        "service":
            "ai",

        "version":
            "1.0.0",
    }


# ============================================================
# CATEGORY ENDPOINT
# ============================================================

@app.get("/categories")
def categories() -> Dict[str, Any]:
    """
    Return supported emergency categories.
    """

    return {

        "success":
            True,

        "categories":
            get_supported_categories(),
    }


# ============================================================
# COMPLETE ANALYSIS
# ============================================================

@app.post("/analyze")
def analyze(
    request: AnalyzeRequest,
) -> Dict[str, Any]:
    """
    Perform complete AI analysis.
    """

    try:

        incident_data = (
            request.incident.model_dump(
                exclude_none=True
            )
        )

        result = analyze_incident(

            incident=
                incident_data,

            existing_incidents=
                request.existing_incidents,
        )

        return {

            "success":
                True,

            "data":
                result,
        }

    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=str(error),
        )


# ============================================================
# CLASSIFICATION
# ============================================================

@app.post("/classify")
def classify(
    request: ClassifyRequest,
) -> Dict[str, Any]:
    """
    Classify an incident.
    """

    try:

        result = classify_incident(

            description=
                request.description,

            incident_type=
                request.incident_type,
        )

        return {

            "success":
                True,

            "data":
                result,
        }

    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=str(error),
        )


# ============================================================
# SEVERITY
# ============================================================

@app.post("/severity")
def severity(
    request: SeverityRequest,
) -> Dict[str, Any]:
    """
    Calculate incident severity.
    """

    try:

        result = calculate_severity(

            description=
                request.description,

            category=
                request.category,

            reported_severity=
                request.reported_severity,
        )

        return {

            "success":
                True,

            "data":
                result,
        }

    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=str(error),
        )


# ============================================================
# DUPLICATE DETECTION
# ============================================================

@app.post("/duplicate")
def duplicate(
    request: DuplicateRequest,
) -> Dict[str, Any]:
    """
    Detect duplicate incidents.
    """

    try:

        result = detect_duplicate(

            incident=
                request.incident,

            existing_incidents=
                request.existing_incidents,

            threshold=
                request.threshold,
        )

        return {

            "success":
                True,

            "data":
                result,
        }

    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=str(error),
        )


# ============================================================
# PRIORITY
# ============================================================

@app.post("/priority")
def priority(
    request: PriorityRequest,
) -> Dict[str, Any]:
    """
    Calculate incident priority.
    """

    try:

        result = calculate_priority(

            severity=
                request.severity,

            category=
                request.category,

            people_affected=
                request.people_affected,

            location_available=
                request.location_available,

            duplicate=
                request.duplicate,
        )

        return {

            "success":
                True,

            "data":
                result,
        }

    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=str(error),
        )


# ============================================================
# SERVER START
# ============================================================

if __name__ == "__main__":

    import uvicorn

    port = int(
        os.getenv(
            "AI_PORT",
            "8000",
        )
    )

    uvicorn.run(

        "main:app",

        host="0.0.0.0",

        port=port,

        reload=False,
    )

