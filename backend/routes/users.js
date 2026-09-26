// ============================================================
// SMART EMERGENCY RESPONSE
// User Routes
// ============================================================

const express = require("express");

const router = express.Router();

const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserRole
} = require("../controllers/userController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// ------------------------------------------------------------
// Get All Users
// Admin only
// ------------------------------------------------------------

router.get(
    "/",
    auth,
    roleCheck("admin"),
    getUsers
);

// ------------------------------------------------------------
// Get User By ID
// ------------------------------------------------------------

router.get(
    "/:id",
    auth,
    getUserById
);

// ------------------------------------------------------------
// Update User
// ------------------------------------------------------------

router.put(
    "/:id",
    auth,
    updateUser
);

// ------------------------------------------------------------
// Update User Role
// Admin only
// ------------------------------------------------------------

router.patch(
    "/:id/role",
    auth,
    roleCheck("admin"),
    updateUserRole
);

// ------------------------------------------------------------
// Delete User
// Admin only
// ------------------------------------------------------------

router.delete(
    "/:id",
    auth,
    roleCheck("admin"),
    deleteUser
);

module.exports = router;