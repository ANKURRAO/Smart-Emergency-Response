// ============================================================
// SMART EMERGENCY RESPONSE
// Notification Service
// ============================================================

const {
    createNotification,
    getNotifications,
    db
} = require("./firebaseService");

// ------------------------------------------------------------
// Create Notification
// ------------------------------------------------------------

async function sendNotification({
    userId,
    title,
    message,
    type = "general",
    incidentId = null,
    data = {}
}) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    if (!title || !message) {
        throw new Error("Notification title and message are required.");
    }

    const notification = await createNotification(userId, {
        title,
        message,
        type,
        incidentId,
        data
    });

    return notification;
}

// ------------------------------------------------------------
// Incident Notification
// ------------------------------------------------------------

async function sendIncidentNotification({
    userId,
    incidentId,
    title,
    message,
    type = "incident"
}) {
    return sendNotification({
        userId,
        title,
        message,
        type,
        incidentId
    });
}

// ------------------------------------------------------------
// Assignment Notification
// ------------------------------------------------------------

async function notifyResponderAssignment({
    responderId,
    incidentId,
    incidentType,
    priority
}) {
    return sendNotification({
        userId: responderId,
        title: "New Emergency Assignment",
        message: `You have been assigned a ${priority || "normal"} priority ${incidentType || "emergency"} incident.`,
        type: "assignment",
        incidentId
    });
}

// ------------------------------------------------------------
// Status Update Notification
// ------------------------------------------------------------

async function notifyIncidentStatus({
    userId,
    incidentId,
    status
}) {
    const statusMessages = {
        Pending: "Your emergency report has been received.",
        Assigned: "A responder has been assigned to your emergency.",
        Accepted: "The responder has accepted your emergency request.",
        "En Route": "The responder is on the way.",
        Arrived: "The responder has arrived at the reported location.",
        Resolved: "Your emergency incident has been marked as resolved.",
        Cancelled: "Your emergency incident has been cancelled."
    };

    return sendIncidentNotification({
        userId,
        incidentId,
        title: `Emergency Status: ${status}`,
        message:
            statusMessages[status] ||
            `Your emergency status has been updated to ${status}.`,
        type: "status_update"
    });
}

// ------------------------------------------------------------
// Notify Admin
// ------------------------------------------------------------

async function notifyAdmin({
    adminId,
    title,
    message,
    incidentId = null,
    type = "admin_alert"
}) {
    return sendNotification({
        userId: adminId,
        title,
        message,
        type,
        incidentId
    });
}

// ------------------------------------------------------------
// Get User Notifications
// ------------------------------------------------------------

async function getUserNotifications(userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    return getNotifications(userId);
}

// ------------------------------------------------------------
// Mark Notification As Read
// ------------------------------------------------------------

async function markNotificationAsRead(userId, notificationId) {
    if (!userId || !notificationId) {
        throw new Error(
            "User ID and notification ID are required."
        );
    }

    const notificationRef = db.ref(
        `notifications/${userId}/${notificationId}`
    );

    const snapshot = await notificationRef.once("value");

    if (!snapshot.exists()) {
        throw new Error("Notification not found.");
    }

    await notificationRef.update({
        read: true,
        readAt: Date.now()
    });

    return {
        id: notificationId,
        read: true
    };
}

// ------------------------------------------------------------
// Mark All Notifications As Read
// ------------------------------------------------------------

async function markAllNotificationsAsRead(userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    const notificationsRef = db.ref(
        `notifications/${userId}`
    );

    const snapshot = await notificationsRef.once("value");

    if (!snapshot.exists()) {
        return {
            updated: 0
        };
    }

    const notifications = snapshot.val();
    const updates = {};
    let count = 0;

    Object.keys(notifications).forEach((notificationId) => {
        if (!notifications[notificationId].read) {
            updates[
                `${notificationId}/read`
            ] = true;

            updates[
                `${notificationId}/readAt`
            ] = Date.now();

            count++;
        }
    });

    if (count > 0) {
        await notificationsRef.update(updates);
    }

    return {
        updated: count
    };
}

// ------------------------------------------------------------
// Delete Notification
// ------------------------------------------------------------

async function deleteNotification(
    userId,
    notificationId
) {
    if (!userId || !notificationId) {
        throw new Error(
            "User ID and notification ID are required."
        );
    }

    const notificationRef = db.ref(
        `notifications/${userId}/${notificationId}`
    );

    const snapshot = await notificationRef.once("value");

    if (!snapshot.exists()) {
        throw new Error("Notification not found.");
    }

    await notificationRef.remove();

    return {
        success: true,
        id: notificationId
    };
}

// ------------------------------------------------------------
// Export
// ------------------------------------------------------------

module.exports = {
    sendNotification,
    sendIncidentNotification,
    notifyResponderAssignment,
    notifyIncidentStatus,
    notifyAdmin,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
};