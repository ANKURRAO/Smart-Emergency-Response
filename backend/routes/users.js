
// ============================================================
// SMART EMERGENCY RESPONSE
// User Routes
// ============================================================

const express = require("express");
const router = express.Router();

const {
    createResponder,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    updateUserRole
} = require("../controllers/userController");

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");


// ============================================================
// CREATE RESPONDER
// Admin only
// ============================================================

router.post(
    "/responders",
    auth,
    roleCheck("admin"),
    createResponder
);


// ============================================================
// GET ALL USERS
// Admin only
// ============================================================

router.get(
    "/",
    auth,
    roleCheck("admin"),
    getUsers
);


// ============================================================
// GET USER BY ID
// ============================================================

router.get(
    "/:id",
    auth,
    getUser
);


// ============================================================
// UPDATE USER
// ============================================================

router.put(
    "/:id",
    auth,
    updateUser
);


// ============================================================
// UPDATE USER ROLE
// Admin only
// ============================================================

router.patch(
    "/:id/role",
    auth,
    roleCheck("admin"),
    updateUserRole
);


// ============================================================
// DELETE USER
// Admin only
// ============================================================

router.delete(
    "/:id",
    auth,
    roleCheck("admin"),
    deleteUser
);


module.exports = router;
