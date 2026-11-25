

// ============================================================
// SMART EMERGENCY RESPONSE
// Incident Routes
// ============================================================

const express = require("express");
const router = express.Router();

const {
    createIncident,
    getIncidents,
    getIncident,
    updateIncident,
    deleteIncident,
    assignResponder,
    updateIncidentStatus
} = require("../controllers/incidentController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// Create Emergency Incident - Citizen only
router.post(
    "/",
    auth,
    roleCheck("citizen"),
    createIncident
);

// Get Incidents - Admin / Responder / Citizen
router.get(
    "/",
    auth,
    roleCheck(["admin", "responder", "citizen"]),
    getIncidents
);

// Get Single Incident
router.get(
    "/:id",
    auth,
    getIncident
);

// Update Incident - Citizen (own) / Admin
router.put(
    "/:id",
    auth,
    roleCheck(["citizen", "admin"]),
    updateIncident
);

// Update Incident Status - Admin / Responder
router.patch(
    "/:id/status",
    auth,
    roleCheck(["admin", "responder"]),
    updateIncidentStatus
);

// Assign Responder - Admin only
router.patch(
    "/:id/assign",
    auth,
    roleCheck("admin"),
    assignResponder
);

// Delete Incident - Admin only
router.delete(
    "/:id",
    auth,
    roleCheck("admin"),
    deleteIncident
);

module.exports = router;
