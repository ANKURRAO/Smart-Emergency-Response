// ============================================================
// USER CONTROLLER
// Smart Emergency Response
// ============================================================

const {
    getUserById,
    updateUserById,
    deleteUserById,
    getAllUsers
} = require("../services/firebaseService");


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
// GET ALL USERS
// ============================================================

async function getUsers(req, res, next) {
    try {
        let users = await getAllUsers();

        if (!Array.isArray(users)) {
            users = [];
        }

        const {
            role,
            search
        } = req.query;

        if (role) {
            users = users.filter(
                (user) =>
                    clean(user.role).toLowerCase() ===
                    clean(role).toLowerCase()
            );
        }

        if (search) {
            const query =
                clean(search).toLowerCase();

            users = users.filter((user) => {
                const name =
                    clean(user.name).toLowerCase();

                const email =
                    clean(user.email).toLowerCase();

                const phone =
                    clean(user.phone).toLowerCase();

                return (
                    name.includes(query) ||
                    email.includes(query) ||
                    phone.includes(query)
                );
            });
        }

        return res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// GET USER
// ============================================================

async function getUser(req, res, next) {
    try {
        const userId = req.params.id;

        if (
            req.userRole !== "admin" &&
            req.user.uid !== userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not allowed to access this user."
            });
        }

        const user =
            await getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.json({
            success: true,
            user
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// UPDATE USER
// ============================================================

async function updateUser(req, res, next) {
    try {
        const userId = req.params.id;

        if (
            req.userRole !== "admin" &&
            req.user.uid !== userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only update your own profile."
            });
        }

        const existing =
            await getUserById(userId);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const body = req.body || {};

        const updates = {
            updatedAt: timestamp()
        };

        const allowedFields = [
            "name",
            "phone",
            "address",
            "city",
            "state",
            "emergencyContact",
            "profilePhoto"
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = clean(body[field]);
            }
        }

        const updated =
            await updateUserById(
                userId,
                updates
            );

        return res.json({
            success: true,
            message:
                "User updated successfully.",
            user:
                updated || {
                    ...existing,
                    ...updates
                }
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// CHANGE USER ROLE
// ============================================================

async function updateUserRole(
    req,
    res,
    next
) {
    try {
        const userId = req.params.id;

        const role =
            clean(req.body?.role).toLowerCase();

        const allowedRoles = [
            "citizen",
            "responder",
            "admin"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid role. Use citizen, responder or admin."
            });
        }

        const existing =
            await getUserById(userId);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const updates = {
            role,
            updatedAt: timestamp()
        };

        /*
         * Responder defaults.
         */

        if (
            role === "responder" &&
            existing.available === undefined
        ) {
            updates.available = false;
            updates.status = "offline";
        }

        const updated =
            await updateUserById(
                userId,
                updates
            );

        return res.json({
            success: true,
            message:
                "User role updated successfully.",
            user:
                updated || {
                    ...existing,
                    ...updates
                }
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// DELETE USER
// ============================================================

async function deleteUser(req, res, next) {
    try {
        const userId = req.params.id;

        const user =
            await getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        /*
         * Prevent accidental deletion of
         * another administrator through this API.
         */

        if (
            user.role === "admin" &&
            userId !== req.user.uid
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Administrator accounts require additional protection."
            });
        }

        await deleteUserById(userId);

        return res.json({
            success: true,
            message:
                "User deleted successfully."
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getUsers,
    getUser,
    updateUser,
    updateUserRole,
    deleteUser
};