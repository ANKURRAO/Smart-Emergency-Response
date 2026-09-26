// ============================================================
// NOTIFICATION CONTROLLER
// Smart Emergency Response
// ============================================================

const {
    createNotification,
    getNotifications
} = require("../services/firebaseService");

const {
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} = require("../services/notificationService");


// ============================================================
// HELPERS
// ============================================================

function timestamp() {
    return new Date().toISOString();
}


function clean(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}


// ============================================================
// GET NOTIFICATIONS
// ============================================================

async function getUserNotifications(
    req,
    res,
    next
) {
    try {
        const requestedUserId =
            req.query.userId;

        const userId =
            req.userRole === "admin" &&
            requestedUserId
                ? requestedUserId
                : req.user.uid;

        const notifications =
            await getNotifications(userId);

        let result = Array.isArray(
            notifications
        )
            ? notifications
            : [];

        const unread =
            req.query.unread;

        if (unread === "true") {
            result = result.filter(
                (notification) =>
                    notification.read !== true
            );
        }

        result.sort(
            (a, b) =>
                new Date(
                    b.createdAt || 0
                ) -
                new Date(
                    a.createdAt || 0
                )
        );

        return res.json({
            success: true,
            count: result.length,
            notifications: result
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// GET SINGLE NOTIFICATION
// ============================================================

async function getNotification(
    req,
    res,
    next
) {
    try {
        const notificationId =
            req.params.id;

        const notifications =
            await getNotifications(
                req.user.uid
            );

        const notification =
            Array.isArray(notifications)
                ? notifications.find(
                      (item) =>
                          item.notificationId ===
                          notificationId ||
                          item.id ===
                          notificationId
                  )
                : null;

        if (!notification) {
            return res.status(404).json({
                success: false,
                message:
                    "Notification not found."
            });
        }

        return res.json({
            success: true,
            notification
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// CREATE NOTIFICATION
// ============================================================

async function createUserNotification(
    req,
    res,
    next
) {
    try {
        const body = req.body || {};

        const userId =
            clean(body.userId);

        const title =
            clean(body.title);

        const message =
            clean(body.message);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message:
                    "User ID is required."
            });
        }

        if (!title) {
            return res.status(400).json({
                success: false,
                message:
                    "Notification title is required."
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message:
                    "Notification message is required."
            });
        }

        const notification = {
            notificationId:
                body.notificationId ||
                `NOTIF-${Date.now()}`,

            userId,

            title,

            message,

            type:
                clean(body.type) ||
                "system",

            incidentId:
                clean(body.incidentId) ||
                null,

            read: false,

            createdAt: timestamp()
        };

        const created =
            await createNotification(
                notification
            );

        return res.status(201).json({
            success: true,
            message:
                "Notification created successfully.",
            notification:
                created || notification
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// MARK AS READ
// ============================================================

async function readNotification(
    req,
    res,
    next
) {
    try {
        const notificationId =
            req.params.id;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message:
                    "Notification ID is required."
            });
        }

        await markNotificationAsRead(
            notificationId,
            req.user.uid
        );

        return res.json({
            success: true,
            message:
                "Notification marked as read."
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// MARK ALL AS READ
// ============================================================

async function readAllNotifications(
    req,
    res,
    next
) {
    try {
        await markAllNotificationsAsRead(
            req.user.uid
        );

        return res.json({
            success: true,
            message:
                "All notifications marked as read."
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// DELETE NOTIFICATION
// ============================================================

async function removeNotification(
    req,
    res,
    next
) {
    try {
        const notificationId =
            req.params.id;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message:
                    "Notification ID is required."
            });
        }

        await deleteNotification(
            notificationId,
            req.user.uid
        );

        return res.json({
            success: true,
            message:
                "Notification deleted successfully."
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getUserNotifications,
    getNotification,
    createUserNotification,
    readNotification,
    readAllNotifications,
    removeNotification
};