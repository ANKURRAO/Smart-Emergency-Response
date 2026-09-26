// ============================================================
// SMART EMERGENCY RESPONSE
// AI Routes
// ============================================================

const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// AI controller will be connected later.
// These functions will communicate with the Python AI service.

const {
    analyzeIncident,
    classifyIncident,
    calculateSeverity,
    calculatePriority,
    detectDuplicate,
    recommendResponder
} = require("../controllers/incidentController");

// ------------------------------------------------------------
// Analyze Complete Incident
// ------------------------------------------------------------

router.post(
    "/analyze",
    auth,
    roleCheck(["admin", "responder"]),
    analyzeIncident
);

// ------------------------------------------------------------
// Classify Incident
// ------------------------------------------------------------

router.post(
    "/classify",
    auth,
    roleCheck(["admin", "responder"]),
    classifyIncident
);

// ------------------------------------------------------------
// Calculate Severity
// ------------------------------------------------------------

router.post(
    "/severity",
    auth,
    roleCheck(["admin", "responder"]),
    calculateSeverity
);

// ------------------------------------------------------------
// Calculate Priority
// ------------------------------------------------------------

router.post(
    "/priority",
    auth,
    roleCheck(["admin", "responder"]),
    calculatePriority
);

// ------------------------------------------------------------
// Detect Duplicate / Related Incident
// ------------------------------------------------------------

router.post(
    "/duplicate",
    auth,
    roleCheck(["admin", "responder"]),
    detectDuplicate
);

// ------------------------------------------------------------
// Recommend Suitable Responder
// ------------------------------------------------------------

router.post(
    "/recommend-responder",
    auth,
    roleCheck("admin"),
    recommendResponder
);

module.exports = router;