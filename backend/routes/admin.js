
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

const {
    createResponder
} = require("../controllers/adminController");

// Admin-only responder creation.
router.post(
    "/responders",
    auth,
    roleCheck("admin"),
    createResponder
);

module.exports = router;
