
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

// ------------------------------------------------------------
// Create Emergency Incident
// Citizen only
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
    getIncidents
);

// ------------------------------------------------------------
// Get Single Incident
// Authenticated users
// Ownership checked in controller
// ------------------------------------------------------------

router.get(
    "/:id",
    auth,
    getIncident
);

// ------------------------------------------------------------
// Update Incident
// Citizen (own incident) / Admin
// ------------------------------------------------------------

router.put(
    "/:id",
    auth,
    roleCheck(["citizen", "admin"]),
    updateIncident
);

// ------------------------------------------------------------
// Update Incident Status
// Admin / Responder
// Controller checks responder assignment
// ------------------------------------------------------------

router.patch(
    "/:id/status",
    auth,
    roleCheck(["admin", "responder"]),
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
// Delete Incident
// Admin only
// ------------------------------------------------------------

router.delete(
    "/:id",
    auth,
    roleCheck("admin"),
    deleteIncident
);

module.exports = router;
