// ============================================================
// SMART EMERGENCY RESPONSE
// Responder Routes
// ============================================================

const express = require("express");

const router = express.Router();

const {
    getResponders,
    getResponderById,
    updateResponder,
    updateAvailability,
    getResponderAssignments,
    updateResponderLocation
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
    getResponderById
);

// ------------------------------------------------------------
// Get Responder Assignments
// ------------------------------------------------------------

router.get(
    "/:id/assignments",
    auth,
    roleCheck(["admin", "responder"]),
    getResponderAssignments
);

// ------------------------------------------------------------
// Update Responder Profile
// ------------------------------------------------------------

router.put(
    "/:id",
    auth,
    roleCheck("responder"),
    updateResponder
);

// ------------------------------------------------------------
// Update Availability
// ------------------------------------------------------------

router.patch(
    "/:id/availability",
    auth,
    roleCheck("responder"),
    updateAvailability
);

// ------------------------------------------------------------
// Update Live Location
// ------------------------------------------------------------

router.patch(
    "/:id/location",
    auth,
    roleCheck("responder"),
    updateResponderLocation
);

module.exports = router;