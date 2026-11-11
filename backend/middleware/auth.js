
// ============================================================
// AUTHENTICATION MIDDLEWARE
// Smart Emergency Response
// ============================================================

const {
    admin,
    db
} = require("../services/firebaseService");

async function auth(req, res, next) {
    try {

        const authorization =
            req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required."
            });
        }

        const token =
            authorization.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is empty."
            });
        }

        // Verify Firebase ID token.
        const decodedToken =
            await admin.auth().verifyIdToken(token);

        const uid = decodedToken.uid;

        // Fetch trusted user profile from Firebase.
        const userSnapshot =
            await db.ref(`users/${uid}`).once("value");

        if (!userSnapshot.exists()) {
            return res.status(403).json({
                success: false,
                message: "User profile not found."
            });
        }

        const userData = userSnapshot.val() || {};

        // Only recognized roles are accepted.
        const allowedRoles = [
            "citizen",
            "responder",
            "admin"
        ];

        const userRole =
            String(userData.role || "")
                .trim()
                .toLowerCase();

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Invalid user role."
            });
        }

        // Block unapproved responders.
        if (
            userRole === "responder" &&
            userData.approved !== true
        ) {
            return res.status(403).json({
                success: false,
                message: "Responder account is not approved."
            });
        }

        // Attach authenticated user and trusted role.
        req.user = {
            uid,
            email: decodedToken.email || null,
            emailVerified:
                decodedToken.email_verified || false,
            name:
                userData.name ||
                decodedToken.name ||
                null,
            claims: decodedToken
        };

        req.userRole = userRole;

        next();

    } catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
}

module.exports = auth;
