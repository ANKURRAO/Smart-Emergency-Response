// ============================================================
// SMART EMERGENCY RESPONSE
// Notification Routes
// ============================================================

const express = require("express");

const router = express.Router();

const {
    getNotifications,
    getNotificationById,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// ------------------------------------------------------------
// Get Current User Notifications
// ------------------------------------------------------------

router.get(
    "/",
    auth,
    getNotifications
);

// ------------------------------------------------------------
// Get Single Notification
// ------------------------------------------------------------

router.get(
    "/:id",
    auth,
    getNotificationById
);

// ------------------------------------------------------------
// Create Notification
// Admin / Backend Services
// ------------------------------------------------------------

router.post(
    "/",
    auth,
    roleCheck("admin"),
    createNotification
);

// ------------------------------------------------------------
// Mark Notification As Read
// ------------------------------------------------------------

router.patch(
    "/:id/read",
    auth,
    markAsRead
);

// ------------------------------------------------------------
// Mark All Notifications As Read
// ------------------------------------------------------------

router.patch(
    "/read-all",
    auth,
    markAllAsRead
);

// ------------------------------------------------------------
// Delete Notification
// ------------------------------------------------------------

router.delete(
    "/:id",
    auth,
    deleteNotification
);

module.exports = router;