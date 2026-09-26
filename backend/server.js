// ============================================================
// SMART EMERGENCY RESPONSE
// Backend Server
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// ------------------------------------------------------------
// App Initialization
// ------------------------------------------------------------

const app = express();

const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------
// Basic Health Check
// ------------------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Smart Emergency Response Backend is running.",
        service: "Smart Emergency Response API",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// ------------------------------------------------------------
// API Health Check
// ------------------------------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        message: "API is working properly.",
        timestamp: new Date().toISOString()
    });
});

// ------------------------------------------------------------
// API Information
// ------------------------------------------------------------

app.get("/api", (req, res) => {
    res.json({
        success: true,
        name: "Smart Emergency Response API",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth",
            incidents: "/api/incidents",
            responders: "/api/responders",
            users: "/api/users",
            admin: "/api/admin",
            ai: "/api/ai",
            notifications: "/api/notifications"
        }
    });
});

// ------------------------------------------------------------
// Route Imports
// ------------------------------------------------------------

const incidentRoutes = require("./routes/incidents");
const responderRoutes = require("./routes/responders");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");
const aiRoutes = require("./routes/ai");

// ------------------------------------------------------------
// API Routes
// ------------------------------------------------------------

app.use("/api/incidents", incidentRoutes);
app.use("/api/responders", responderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        path: req.originalUrl
    });
});

// ------------------------------------------------------------
// Global Error Handler
// ------------------------------------------------------------

app.use((err, req, res, next) => {
    console.error("Backend Error:", err);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message:
            err.message ||
            "Internal server error occurred.",
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack
        })
    });
});

// ------------------------------------------------------------
// Start Server
// ------------------------------------------------------------

app.listen(PORT, () => {
    console.log("==============================================");
    console.log(" SMART EMERGENCY RESPONSE BACKEND");
    console.log("==============================================");
    console.log(`Server running on port: ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("==============================================");
});