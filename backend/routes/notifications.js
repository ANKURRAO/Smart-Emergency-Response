// ============================================================
// SMART EMERGENCY RESPONSE
// Notification Routes
// ============================================================

const express = require("express");
const router = express.Router();

const {
    getUserNotifications,
    getNotification,
    createUserNotification,
    readNotification,
    readAllNotifications,
    removeNotification
} = require("../controllers/notificationController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// ------------------------------------------------------------
// Get Current User Notifications
// ------------------------------------------------------------

router.get(
    "/",
    auth,
    getUserNotifications
);

// ------------------------------------------------------------
// Mark All Notifications As Read
// Keep this before /:id routes
// ------------------------------------------------------------

router.patch(
    "/read-all",
    auth,
    readAllNotifications
);

// ------------------------------------------------------------
// Get Single Notification
// ------------------------------------------------------------

router.get(
    "/:id",
    auth,
    getNotification
);

// ------------------------------------------------------------
// Create Notification
// Admin only
// ------------------------------------------------------------

router.post(
    "/",
    auth,
    roleCheck("admin"),
    createUserNotification
);

// ------------------------------------------------------------
// Mark Notification As Read
// ------------------------------------------------------------

router.patch(
    "/:id/read",
    auth,
    readNotification
);

// ------------------------------------------------------------
// Delete Notification
// ------------------------------------------------------------

router.delete(
    "/:id",
    auth,
    removeNotification
);

module.exports = router;