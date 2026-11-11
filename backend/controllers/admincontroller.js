
// ============================================================
// ADMIN CONTROLLER
// Smart Emergency Response
// ============================================================

const {
    admin,
    db
} = require("../services/firebaseService");

// ============================================================
// CREATE RESPONDER
// Admin creates a Firebase Auth account and RTDB profile.
// ============================================================

async function createResponder(req, res, next) {
    let createdUid = null;

    try {
        const body = req.body || {};

        const name = String(body.name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const phone = String(body.phone || "").trim();
        const department = String(body.department || "").trim();
        const vehicle = String(body.vehicle || "").trim();

        // Validate required fields.
        if (!name || !email || !password || !phone || !department) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password, phone and department are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Create Firebase Authentication account.
        const authUser = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            emailVerified: false,
            disabled: false
        });

        createdUid = authUser.uid;

        const timestamp = Date.now();

        // Create responder profile in Realtime Database.
        const responderProfile = {
            uid: createdUid,
            name,
            email,
            phone,
            department,
            vehicle,

            role: "responder",

            approved: false,
            available: false,
            status: "pending_approval",

            latitude: null,
            longitude: null,

            currentIncidentId: null,

            createdAt: timestamp,
            updatedAt: timestamp
        };

        await db
            .ref(`users/${createdUid}`)
            .set(responderProfile);

        return res.status(201).json({
            success: true,
            message: "Responder account created successfully. Admin approval is pending.",
            responder: {
                uid: createdUid,
                name,
                email,
                phone,
                department,
                vehicle,
                role: "responder",
                approved: false,
                available: false,
                status: "pending_approval"
            }
        });

    } catch (error) {

        // If profile creation fails, remove the Auth account
        // so an incomplete responder account is not left behind.
        if (createdUid) {
            try {
                await admin.auth().deleteUser(createdUid);
            } catch (cleanupError) {
                console.error(
                    "Responder cleanup failed:",
                    cleanupError.message
                );
            }
        }

        console.error("Create responder error:", error);

        if (error.code === "auth/email-already-exists") {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        if (error.code === "auth/invalid-email") {
            return res.status(400).json({
                success: false,
                message: "Invalid email address."
            });
        }

        if (error.code === "auth/weak-password") {
            return res.status(400).json({
                success: false,
                message: "Password is too weak."
            });
        }

        next(error);
    }
}

module.exports = {
    createResponder
};
