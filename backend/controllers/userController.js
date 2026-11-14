
// ============================================================
// USER CONTROLLER
// Smart Emergency Response
// ============================================================

const {
    admin,
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
// CREATE RESPONDER ACCOUNT
// Admin only - Protected by route middleware
// ============================================================

async function createResponder(req, res, next) {

    let createdUid = null;

    try {

        const body = req.body || {};

        const name = clean(body.name);
        const email = clean(body.email).toLowerCase();
        const password = body.password;
        const phone = clean(body.phone);
        const department = clean(body.department);
        const designation = clean(body.designation);

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        // Validate email
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Validate password
        if (
            typeof password !== "string" ||
            password.length < 8 ||
            password.length > 128
        ) {
            return res.status(400).json({
                success: false,
                message: "Password must contain 8 to 128 characters."
            });
        }

        // Create Firebase Authentication account
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            disabled: false
        });

        createdUid = userRecord.uid;

        // Create matching Realtime Database profile
        const responderProfile = {
            name,
            email,
            role: "responder",

            phone,
            department,
            designation,

            approved: false,
            available: false,
            status: "offline",

            createdAt: timestamp(),
            updatedAt: timestamp()
        };

        await updateUserById(
            createdUid,
            responderProfile
        );

        return res.status(201).json({
            success: true,
            message: "Responder account created successfully. Approval is pending.",

            responder: {
                uid: createdUid,
                name,
                email,
                phone,
                department,
                designation,
                role: "responder",
                approved: false,
                available: false,
                status: "offline",
                createdAt: responderProfile.createdAt
            }
        });

    } catch (error) {

        // Roll back Firebase Auth account if profile creation fails
        if (createdUid) {
            try {
                await admin.auth().deleteUser(createdUid);
            } catch (cleanupError) {
                console.error(
                    "Responder account cleanup failed:",
                    cleanupError.code || cleanupError.message
                );
            }
        }

        if (error.code === "auth/email-already-exists") {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        next(error);
    }
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

        const { role, search } = req.query;

        if (role) {
            users = users.filter(
                user =>
                    clean(user.role).toLowerCase() ===
                    clean(role).toLowerCase()
            );
        }

        if (search) {
            const query = clean(search).toLowerCase();

            users = users.filter(user => {

                const name = clean(user.name).toLowerCase();
                const email = clean(user.email).toLowerCase();
                const phone = clean(user.phone).toLowerCase();

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
                message: "You are not allowed to access this user."
            });
        }

        const user = await getUserById(userId);

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
                message: "You can only update your own profile."
            });
        }

        const existing = await getUserById(userId);

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

        const updated = await updateUserById(
            userId,
            updates
        );

        return res.json({
            success: true,
            message: "User updated successfully.",
            user: updated || {
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

async function updateUserRole(req, res, next) {
    try {
        const userId = req.params.id;

        const role = clean(req.body?.role).toLowerCase();

        const allowedRoles = [
            "citizen",
            "responder",
            "admin"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Use citizen, responder or admin."
            });
        }

        const existing = await getUserById(userId);

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

        if (
            role === "responder" &&
            existing.available === undefined
        ) {
            updates.available = false;
            updates.status = "offline";
        }

        const updated = await updateUserById(
            userId,
            updates
        );

        return res.json({
            success: true,
            message: "User role updated successfully.",
            user: updated || {
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

        const user = await getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (
            user.role === "admin" &&
            userId !== req.user.uid
        ) {
            return res.status(403).json({
                success: false,
                message: "Administrator accounts require additional protection."
            });
        }

        await deleteUserById(userId);

        return res.json({
            success: true,
            message: "User deleted successfully."
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createResponder,
    getUsers,
    getUser,
    updateUser,
    updateUserRole,
    deleteUser
};
