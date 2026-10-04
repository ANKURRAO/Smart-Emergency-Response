// ============================================================
// SMART EMERGENCY RESPONSE
// Responder Routes
// ============================================================

const express = require("express");
const router = express.Router();

const {
    getResponders,
    getResponder,
    getAssignments,
    updateResponder,
    updateAvailability,
    updateLocation
} = require("../controllers/responderController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// ------------------------------------------------------------
// Get All Responders
// Admin only
// ------------------------------------------------------------

router.get(
    "/",
    auth,
    roleCheck("admin"),
    getResponders
);

// ------------------------------------------------------------
// Get Single Responder
// ------------------------------------------------------------

router.get(
    "/:id",
    auth,
    getResponder
);

// ------------------------------------------------------------
// Get Responder Assignments
// Admin + Responder
// ------------------------------------------------------------

router.get(
    "/:id/assignments",
    auth,
    roleCheck(["admin", "responder"]),
    getAssignments
);

// ------------------------------------------------------------
// Update Responder Profile
// Responder only
// ------------------------------------------------------------

router.put(
    "/:id",
    auth,
    roleCheck("responder"),
    updateResponder
);

// ------------------------------------------------------------
// Update Availability
// Responder only
// ------------------------------------------------------------

router.patch(
    "/:id/availability",
    auth,
    roleCheck("responder"),
    updateAvailability
);

// ------------------------------------------------------------
// Update Live Location
// Responder only
// ------------------------------------------------------------

router.patch(
    "/:id/location",
    auth,
    roleCheck("responder"),
    updateLocation
);

module.exports = router;