// ============================================================
// RESPONDER CONTROLLER
// Smart Emergency Response
// ============================================================

const {
    getUserById,
    updateUserById,
    getIncidentById,
    updateIncidentById,
    getAllIncidents,
    getAllResponders
} = require("../services/firebaseService");

const {
    notifyIncidentStatus,
    notifyResponderAssignment
} = require("../services/notificationService");

const {
    validateCoordinates,
    calculateDistance,
    sortByDistance
} = require("../services/locationService");


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
// GET ALL RESPONDERS
// ============================================================

async function getResponders(req, res, next) {
    try {
        let responders = await getAllResponders();

        if (!Array.isArray(responders)) {
            responders = [];
        }

        const { available, status } = req.query;

        if (available !== undefined) {
            const required =
                available === "true";

            responders = responders.filter(
                (responder) =>
                    responder.available === required
            );
        }

        if (status) {
            responders = responders.filter(
                (responder) =>
                    clean(responder.status).toLowerCase() ===
                    clean(status).toLowerCase()
            );
        }

        return res.json({
            success: true,
            count: responders.length,
            responders
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// GET SINGLE RESPONDER
// ============================================================

async function getResponder(req, res, next) {
    try {
        const responderId = req.params.id;

        const responder =
            await getUserById(responderId);

        if (!responder) {
            return res.status(404).json({
                success: false,
                message: "Responder not found."
            });
        }

        if (responder.role !== "responder") {
            return res.status(400).json({
                success: false,
                message: "User is not a responder."
            });
        }

        if (
            req.userRole === "responder" &&
            req.user.uid !== responderId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only access your own responder profile."
            });
        }

        return res.json({
            success: true,
            responder
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// GET RESPONDER ASSIGNMENTS
// ============================================================

async function getAssignments(req, res, next) {
    try {
        const responderId = req.params.id;

        if (
            req.userRole === "responder" &&
            req.user.uid !== responderId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only access your own assignments."
            });
        }

        const incidents =
            await getAllIncidents();

        if (!Array.isArray(incidents)) {
            return res.json({
                success: true,
                count: 0,
                assignments: []
            });
        }

        const assignments =
            incidents
                .filter(
                    (incident) =>
                        incident.responderId === responderId
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.createdAt || 0
                        ) -
                        new Date(
                            a.createdAt || 0
                        )
                );

        return res.json({
            success: true,
            count: assignments.length,
            assignments
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// UPDATE RESPONDER PROFILE
// ============================================================

async function updateResponder(req, res, next) {
    try {
        const responderId = req.params.id;

        if (
            req.userRole === "responder" &&
            req.user.uid !== responderId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only update your own profile."
            });
        }

        const existing =
            await getUserById(responderId);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Responder not found."
            });
        }

        if (existing.role !== "responder") {
            return res.status(400).json({
                success: false,
                message: "User is not a responder."
            });
        }

        const body = req.body || {};

        const updates = {
            updatedAt: timestamp()
        };

        const allowedFields = [
            "name",
            "phone",
            "department",
            "designation",
            "vehicleNumber",
            "vehicleType",
            "specialization"
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = clean(body[field]);
            }
        }

        const updated =
            await updateUserById(
                responderId,
                updates
            );

        return res.json({
            success: true,
            message:
                "Responder profile updated successfully.",
            responder:
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
// UPDATE AVAILABILITY
// ============================================================

async function updateAvailability(req, res, next) {
    try {
        const responderId = req.params.id;

        if (
            req.user.uid !== responderId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only update your own availability."
            });
        }

        const available =
            req.body?.available;

        if (typeof available !== "boolean") {
            return res.status(400).json({
                success: false,
                message:
                    "The 'available' field must be true or false."
            });
        }

        const updates = {
            available,
            status: available
                ? "available"
                : "offline",
            updatedAt: timestamp()
        };

        const updated =
            await updateUserById(
                responderId,
                updates
            );

        return res.json({
            success: true,
            message:
                "Responder availability updated.",
            responder:
                updated || updates
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// UPDATE RESPONDER LOCATION
// ============================================================

async function updateLocation(req, res, next) {
    try {
        const responderId = req.params.id;

        if (
            req.user.uid !== responderId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only update your own location."
            });
        }

        const latitude =
            Number(req.body?.latitude);

        const longitude =
            Number(req.body?.longitude);

        if (
            !validateCoordinates(
                latitude,
                longitude
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid latitude and longitude are required."
            });
        }

        const updates = {
            latitude,
            longitude,
            locationAccuracy:
                req.body?.accuracy !== undefined
                    ? Number(req.body.accuracy)
                    : null,
            locationUpdatedAt: timestamp(),
            updatedAt: timestamp()
        };

        const updated =
            await updateUserById(
                responderId,
                updates
            );

        return res.json({
            success: true,
            message:
                "Responder location updated.",
            location: {
                latitude,
                longitude,
                accuracy:
                    updates.locationAccuracy
            },
            responder:
                updated || updates
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// FIND NEAREST AVAILABLE RESPONDERS
// ============================================================

async function findNearestResponders(
    latitude,
    longitude,
    limit = 5
) {
    const responders =
        await getAllResponders();

    if (!Array.isArray(responders)) {
        return [];
    }

    const available =
        responders.filter(
            (responder) =>
                responder.available === true &&
                validateCoordinates(
                    responder.latitude,
                    responder.longitude
                )
        );

    return sortByDistance(
        available,
        latitude,
        longitude
    ).slice(0, limit);
}


// ============================================================
// ACCEPT ASSIGNMENT
// ============================================================

async function acceptAssignment(req, res, next) {
    try {
        const incidentId = req.params.id;

        const incident =
            await getIncidentById(incidentId);

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found."
            });
        }

        if (
            incident.responderId !== req.user.uid
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This incident is not assigned to you."
            });
        }

        const updates = {
            status: "accepted",
            acceptedAt: timestamp(),
            updatedAt: timestamp()
        };

        const updated =
            await updateIncidentById(
                incidentId,
                updates
            );

        await notifyIncidentStatus(
            {
                ...incident,
                ...updates
            },
            "accepted"
        );

        return res.json({
            success: true,
            message:
                "Assignment accepted successfully.",
            incident:
                updated || {
                    ...incident,
                    ...updates
                }
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getResponders,
    getResponder,
    getAssignments,
    updateResponder,
    updateAvailability,
    updateLocation,
    findNearestResponders,
    acceptAssignment
};