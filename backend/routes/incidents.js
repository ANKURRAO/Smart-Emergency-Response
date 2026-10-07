// ============================================================
// SMART EMERGENCY RESPONSE
// Incident Routes
// ============================================================

const express = require("express");

const router = express.Router();

const {
    createIncident,
    getAllIncidents,
    getIncidentById,
    updateIncident,
    deleteIncident,
    assignResponder,
    updateIncidentStatus
} = require("../controllers/incidentController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// ------------------------------------------------------------
// Create Emergency Incident
// Citizen can create an incident
// ------------------------------------------------------------

router.post(
    "/",
    auth,
    roleCheck("citizen"),
    createIncident
);

// ------------------------------------------------------------
// Get All Incidents
// Admin / Responder
// ------------------------------------------------------------

router.get(
    "/",
    auth,
    roleCheck(["admin", "responder"]),
    getAllIncidents
);

// ------------------------------------------------------------
// Get Single Incident
// ------------------------------------------------------------

router.get(
    "/:id",
    auth,
    getIncidentById
);

// ------------------------------------------------------------
// Update Incident
// ------------------------------------------------------------

router.put(
    "/:id",
    auth,
    updateIncident
);

// ------------------------------------------------------------
// Update Incident Status
// ------------------------------------------------------------

router.patch(
    "/:id/status",
    auth,
    updateIncidentStatus
);

// ------------------------------------------------------------
// Assign Responder
// Admin only
// ------------------------------------------------------------

router.patch(
    "/:id/assign",
    auth,
    roleCheck("admin"),
    assignResponder
);

// ------------------------------------------------------------
// Delete / Cancel Incident
// ------------------------------------------------------------

router.delete(
    "/:id",
    auth,
    deleteIncident
);

module.exports = router;