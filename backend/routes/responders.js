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
// ------------------------------------------------------------

router.get(
    "/:id/assignments",
    auth,
    roleCheck(["admin", "responder"]),
    getAssignments
);

// ------------------------------------------------------------
//