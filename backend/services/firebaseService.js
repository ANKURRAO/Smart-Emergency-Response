// ============================================================
// FIREBASE ADMIN SERVICE
// Smart Emergency Response
// ============================================================

const admin = require("firebase-admin");

let firebaseApp = null;


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

function initializeFirebase() {
    if (firebaseApp) {
        return firebaseApp;
    }

    const projectId =
        process.env.FIREBASE_PROJECT_ID;

    const clientEmail =
        process.env.FIREBASE_CLIENT_EMAIL;

    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY;

    /*
     * Full Firebase Admin credentials
     */

    if (
        projectId &&
        clientEmail &&
        privateKey
    ) {
        firebaseApp =
            admin.initializeApp({
                credential:
                    admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey:
                            privateKey.replace(
                                /\\n/g,
                                "\n"
                            )
                    }),

                databaseURL:
                    process.env.FIREBASE_DATABASE_URL ||
                    `https://${projectId}-default-rtdb.firebaseio.com`
            });

        console.log(
            "Firebase Admin initialized successfully."
        );

        return firebaseApp;
    }


    /*
     * Fallback initialization.
     *
     * This can work when Google Application
     * Default Credentials are available.
     */

    if (!projectId) {
        throw new Error(
            "FIREBASE_PROJECT_ID is missing from .env"
        );
    }

    console.warn(
        "Firebase Admin credentials are not completely configured."
    );

    firebaseApp =
        admin.initializeApp({
            projectId,

            databaseURL:
                process.env.FIREBASE_DATABASE_URL ||
                `https://${projectId}-default-rtdb.firebaseio.com`
        });

    return firebaseApp;
}


// Initialize Firebase
initializeFirebase();


// ============================================================
// FIREBASE SERVICES
// ============================================================

const db = admin.database();

const auth = admin.auth();


// ============================================================
// GET DATABASE
// ============================================================

function getDatabase() {
    return db;
}


// ============================================================
// USER OPERATIONS
// ============================================================

async function getUserById(uid) {
    if (!uid) {
        return null;
    }

    const snapshot =
        await db
            .ref(`users/${uid}`)
            .once("value");

    if (!snapshot.exists()) {
        return null;
    }

    return {
        uid,
        ...snapshot.val()
    };
}


async function updateUserById(
    uid,
    data
) {
    if (!uid) {
        throw new Error(
            "User ID is required."
        );
    }

    await db
        .ref(`users/${uid}`)
        .update({
            ...data,
            updatedAt: Date.now()
        });

    return getUserById(uid);
}


async function deleteUserById(uid) {
    if (!uid) {
        throw new Error(
            "User ID is required."
        );
    }

    /*
     * Remove user profile from Realtime Database.
     *
     * Firebase Authentication account deletion
     * should be handled separately with Admin Auth
     * when required.
     */

    await db
        .ref(`users/${uid}`)
        .remove();

    return true;
}


// ============================================================
// INCIDENT OPERATIONS
// ============================================================

async function createIncidentRecord(
    incidentId,
    incident
) {
    if (!incidentId) {
        throw new Error(
            "Incident ID is required."
        );
    }

    if (!incident) {
        throw new Error(
            "Incident data is required."
        );
    }

    const data = {
        ...incident,

        incidentId,

        createdAt:
            incident.createdAt ||
            new Date().toISOString(),

        updatedAt:
            incident.updatedAt ||
            new Date().toISOString()
    };

    await db
        .ref(`incidents/${incidentId}`)
        .set(data);

    return getIncidentById(
        incidentId
    );
}


async function getIncidentById(id) {
    if (!id) {
        return null;
    }

    const snapshot =
        await db
            .ref(`incidents/${id}`)
            .once("value");

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id,
        ...snapshot.val()
    };
}


async function updateIncidentById(
    id,
    data
) {
    if (!id) {
        throw new Error(
            "Incident ID is required."
        );
    }

    await db
        .ref(`incidents/${id}`)
        .update({
            ...data,

            updatedAt:
                data.updatedAt ||
                new Date().toISOString()
        });

    return getIncidentById(id);
}


async function deleteIncidentById(id) {
    if (!id) {
        throw new Error(
            "Incident ID is required."
        );
    }

    await db
        .ref(`incidents/${id}`)
        .remove();

    return true;
}


async function getAllIncidents() {
    const snapshot =
        await db
            .ref("incidents")
            .once("value");

    if (!snapshot.exists()) {
        return [];
    }

    const data =
        snapshot.val();

    return Object.entries(data)
        .map(([id, incident]) => ({
            id,
            ...incident
        }));
}


// ============================================================
// USER LIST OPERATIONS
// ============================================================

async function getAllUsers() {
    const snapshot =
        await db
            .ref("users")
            .once("value");

    if (!snapshot.exists()) {
        return [];
    }

    const data =
        snapshot.val();

    return Object.entries(data)
        .map(([uid, user]) => ({
            uid,
            ...user
        }));
}


async function getAllResponders() {
    const users =
        await getAllUsers();

    return users.filter(
        (user) =>
            user.role === "responder"
    );
}


// ============================================================
// NOTIFICATION OPERATIONS
// ============================================================

async function createNotification(
    userIdOrNotification,
    notificationData = null
) {
    /*
     * Supports both:
     *
     * createNotification(userId, notification)
     *
     * and
     *
     * createNotification(notification)
     */

    let userId;
    let notification;

    if (
        typeof userIdOrNotification ===
        "string"
    ) {
        userId =
            userIdOrNotification;

        notification =
            notificationData || {};
    } else {
        notification =
            userIdOrNotification || {};

        userId =
            notification.userId;
    }

    if (!userId) {
        throw new Error(
            "Notification user ID is required."
        );
    }

    const notificationRef =
        db
            .ref(`notifications/${userId}`)
            .push();

    const notificationId =
        notificationRef.key;

    const data = {
        id: notificationId,

        notificationId,

        userId,

        title:
            notification.title ||
            "Notification",

        message:
            notification.message ||
            "",

        type:
            notification.type ||
            "general",

        incidentId:
            notification.incidentId ||
            null,

        read:
            notification.read === true,

        createdAt:
            notification.createdAt ||
            Date.now(),

        ...notification,

        id: notificationId,

        notificationId,

        userId
    };

    await notificationRef.set(
        data
    );

    return data;
}


async function getNotifications(
    userId
) {
    if (!userId) {
        return [];
    }

    const snapshot =
        await db
            .ref(`notifications/${userId}`)
            .once("value");

    if (!snapshot.exists()) {
        return [];
    }

    const data =
        snapshot.val();

    return Object.entries(data)
        .map(
            ([id, notification]) => ({
                id,
                ...notification
            })
        )
        .sort(
            (a, b) =>
                (b.createdAt || 0) -
                (a.createdAt || 0)
        );
}


// ============================================================
// MARK NOTIFICATION READ
// ============================================================

async function markNotificationRead(
    userId,
    notificationId
) {
    if (
        !userId ||
        !notificationId
    ) {
        throw new Error(
            "User ID and notification ID are required."
        );
    }

    await db
        .ref(
            `notifications/${userId}/${notificationId}`
        )
        .update({
            read: true,
            readAt: Date.now()
        });

    return true;
}


// ============================================================
// MARK ALL NOTIFICATIONS READ
// ============================================================

async function markAllNotificationsRead(
    userId
) {
    if (!userId) {
        throw new Error(
            "User ID is required."
        );
    }

    const snapshot =
        await db
            .ref(`notifications/${userId}`)
            .once("value");

    if (!snapshot.exists()) {
        return true;
    }

    const notifications =
        snapshot.val();

    const updates = {};

    Object.keys(
        notifications
    ).forEach((notificationId) => {
        updates[
            `${notificationId}/read`
        ] = true;

        updates[
            `${notificationId}/readAt`
        ] = Date.now();
    });

    await db
        .ref(`notifications/${userId}`)
        .update(updates);

    return true;
}


// ============================================================
// DELETE NOTIFICATION
// ============================================================

async function deleteNotificationRecord(
    userId,
    notificationId
) {
    if (
        !userId ||
        !notificationId
    ) {
        throw new Error(
            "User ID and notification ID are required."
        );
    }

    await db
        .ref(
            `notifications/${userId}/${notificationId}`
        )
        .remove();

    return true;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    admin,
    db,
    auth,

    getDatabase,

    // Users
    getUserById,
    updateUserById,
    deleteUserById,
    getAllUsers,
    getAllResponders,

    // Incidents
    createIncidentRecord,
    getIncidentById,
    updateIncidentById,
    deleteIncidentById,
    getAllIncidents,

    // Notifications
    createNotification,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotificationRecord
};