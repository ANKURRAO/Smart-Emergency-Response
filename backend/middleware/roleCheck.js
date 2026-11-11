
// ============================================================
// ROLE CHECK MIDDLEWARE
// Smart Emergency Response
// ============================================================

const {
    getUserById
} = require("../services/firebaseService");

function roleCheck(requiredRoles) {

    const allowedRoles = (
        Array.isArray(requiredRoles)
            ? requiredRoles
            : [requiredRoles]
    )
        .map(role => String(role).trim().toLowerCase())
        .filter(Boolean);

    return async (req, res, next) => {

        try {

            if (!req.user || !req.user.uid) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            if (allowedRoles.length === 0) {
                return res.status(500).json({
                    success: false,
                    message: "Role configuration is invalid."
                });
            }

            // Fetch the latest trusted user profile.
            const user = await getUserById(req.user.uid);

            if (!user) {
                return res.status(403).json({
                    success: false,
                    message: "User profile not found."
                });
            }

            const userRole = String(user.role || "")
                .trim()
                .toLowerCase();

            const validRoles = [
                "citizen",
                "responder",
                "admin"
            ];

            if (!validRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid user role."
                });
            }

            // Ensure the role matches the authenticated profile.
            if (
                req.userRole &&
                req.userRole !== userRole
            ) {
                return res.status(403).json({
                    success: false,
                    message: "User role verification failed."
                });
            }

            // Responders must be approved.
            if (
                userRole === "responder" &&
                user.approved !== true
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Responder account is not approved."
                });
            }

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to perform this action."
                });
            }

            req.userRole = userRole;
            req.userProfile = user;

            next();

        } catch (error) {

            console.error(
                "Role verification error:",
                error.message
            );

            next(error);
        }
    };
}

module.exports = roleCheck;
