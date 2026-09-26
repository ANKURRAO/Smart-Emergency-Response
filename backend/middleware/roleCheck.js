// ============================================================
// ROLE CHECK MIDDLEWARE
// ============================================================

const { getUserById } = require("../services/firebaseService");

function roleCheck(requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles)
        ? requiredRoles
        : [requiredRoles];

    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            const user = await getUserById(req.user.uid);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User profile not found."
                });
            }

            const userRole = user.role || "citizen";

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to perform this action."
                });
            }

            req.userProfile = user;
            req.userRole = userRole;

            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = roleCheck;