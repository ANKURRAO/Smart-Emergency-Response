// ============================================================
// INCIDENT CONTROLLER
// Smart Emergency Response
// ============================================================

const {
    getIncidentById,
    getAllIncidents,
    updateIncidentById,
    deleteIncidentById,
    getAllResponders,
    getAllUsers
} = require("../services/firebaseService");

const {
    sendIncidentNotification,
    notifyResponderAssignment,
    notifyIncidentStatus
} = require("../services/notificationService");

const {
    calculateDistance,
    sortByDistance,
    validateCoordinates
} = require("../services/locationService");


// ============================================================
// HELPERS
// ============================================================

function getCurrentTimestamp() {
    return new Date().toISOString();
}


function generateIncidentId() {
    return `INC-${Date.now()}-${Math.floor(
        Math.random() * 10000
    )}`;
}


function normalizeText(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}


function normalizeSeverity(value) {
    const severity = normalizeText(value).toLowerCase();

    const allowed = [
        "low",
        "medium",
        "high",
        "critical"
    ];

    return allowed.includes(severity)
        ? severity
        : "medium";
}


function normalizePriority(value) {
    const priority = normalizeText(value).toLowerCase();

    const allowed = [
        "low",
        "medium",
        "high",
        "critical"
    ];

    return allowed.includes(priority)
        ? priority
        : "medium";
}


function normalizeStatus(value) {
    const status = normalizeText(value).toLowerCase();

    const allowed = [
        "reported",
        "pending",
        "assigned",
        "accepted",
        "en route",
        "arrived",
        "resolved",
        "cancelled",
        "closed"
    ];

    return allowed.includes(status)
        ? status
        : "reported";
}


function severityScore(severity) {
    const scores = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
    };

    return scores[normalizeSeverity(severity)] || 2;
}


function priorityScore(priority) {
    const scores = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
    };

    return scores[normalizePriority(priority)] || 2;
}


// ============================================================
// CREATE INCIDENT
// ============================================================

async function createIncident(req, res, next) {
    try {
        const body = req.body || {};

        const userId = req.user?.uid;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found."
            });
        }

        const description = normalizeText(
            body.description
        );

        const type = normalizeText(
            body.type || body.category
        );

        if (!type) {
            return res.status(400).json({
                success: false,
                message: "Incident type/category is required."
            });
        }

        if (!description) {
            return res.status(400).json({
                success: false,
                message: "Incident description is required."
            });
        }

        const latitude = Number(body.latitude);
        const longitude = Number(body.longitude);

        if (
            !validateCoordinates(
                latitude,
                longitude
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required."
            });
        }

        const severity = normalizeSeverity(
            body.severity
        );

        const priority =
            body.priority
                ? normalizePriority(body.priority)
                : calculatePriorityValue({
                      type,
                      description,
                      severity
                  });

        const timestamp = getCurrentTimestamp();

        const incidentId =
            body.incidentId ||
            generateIncidentId();

        const incident = {
            incidentId,

            userId,

            userEmail:
                req.user.email ||
                body.userEmail ||
                "",

            userName:
                body.userName ||
                req.user.name ||
                "Citizen",

            type,

            category:
                normalizeText(
                    body.category
                ) || type,

            description,

            severity,

            priority,

            latitude,

            longitude,

            locationAccuracy:
                body.locationAccuracy !== undefined
                    ? Number(body.locationAccuracy)
                    : null,

            landmark:
                normalizeText(
                    body.landmark
                ),

            status: "reported",

            responderId: null,

            responderName: null,

            source:
                normalizeText(
                    body.source
                ) || "citizen",

            createdAt: timestamp,

            updatedAt: timestamp,

            assignedAt: null,

            resolvedAt: null
        };

        /*
         * The frontend currently creates incidents directly
         * in Firebase. This controller is designed for the
         * backend API path as well.
         */

        const {
            createIncidentRecord
        } = require("../services/firebaseService");

        const created =
            await createIncidentRecord(
                incidentId,
                incident
            );

        await sendIncidentNotification(
            incident
        );

        return res.status(201).json({
            success: true,
            message: "Emergency incident created successfully.",
            incident: created || incident
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// GET ALL INCIDENTS
// ============================================================

async function getIncidents(req, res, next) {
    try {
        const incidents =
            await getAllIncidents();

        let result = Array.isArray(incidents)
            ? incidents
            : [];

        /*
         * Responders can receive only relevant incidents.
         * Admins can access the complete incident list.
         */

        if (
            req.userRole === "responder"
        ) {
            const statusFilter = [
                "reported",
                "pending",
                "assigned",
                "accepted",
                "en route",
                "arrived"
            ];

            result = result.filter(
                (incident) =>
                    statusFilter.includes(
                        normalizeStatus(
                            incident.status
                        )
                    ) ||
                    incident.responderId ===
                        req.user.uid
            );
        }

        /*
         * Optional query filters.
         */

        const {
            status,
            severity,
            priority,
            type,
            userId,
            responderId
        } = req.query;

        if (status) {
            result = result.filter(
                (incident) =>
                    normalizeStatus(
                        incident.status
                    ) ===
                    normalizeStatus(status)
            );
        }

        if (severity) {
            result = result.filter(
                (incident) =>
                    normalizeSeverity(
                        incident.severity
                    ) ===
                    normalizeSeverity(severity)
            );
        }

        if (priority) {
            result = result.filter(
                (incident) =>
                    normalizePriority(
                        incident.priority
                    ) ===
                    normalizePriority(priority)
            );
        }

        if (type) {
            result = result.filter(
                (incident) =>
                    normalizeText(
                        incident.type
                    ).toLowerCase() ===
                    normalizeText(
                        type
                    ).toLowerCase()
            );
        }

        if (userId) {
            result = result.filter(
                (incident) =>
                    incident.userId === userId
            );
        }

        if (responderId) {
            result = result.filter(
                (incident) =>
                    incident.responderId ===
                    responderId
            );
        }

        /*
         * Highest priority first.
         */

        result.sort((a, b) => {
            const priorityDifference =
                priorityScore(b.priority) -
                priorityScore(a.priority);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            return (
                new Date(
                    b.createdAt || 0
                ) -
                new Date(
                    a.createdAt || 0
                )
            );
        });

        return res.json({
            success: true,
            count: result.length,
            incidents: result
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// GET SINGLE INCIDENT
// ============================================================

async function getIncident(req, res, next) {
    try {
        const incidentId =
            req.params.id;

        if (!incidentId) {
            return res.status(400).json({
                success: false,
                message: "Incident ID is required."
            });
        }

        const incident =
            await getIncidentById(
                incidentId
            );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found."
            });
        }

        /*
         * Citizen can only view own incident.
         */

        if (
            req.userRole === "citizen" &&
            incident.userId !== req.user.uid
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not allowed to access this incident."
            });
        }

        /*
         * Responder can view assigned incident
         * or active incidents.
         */

        if (
            req.userRole === "responder" &&
            incident.responderId &&
            incident.responderId !== req.user.uid
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This incident is assigned to another responder."
            });
        }

        return res.json({
            success: true,
            incident
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// UPDATE INCIDENT
// ============================================================

async function updateIncident(req, res, next) {
    try {
        const incidentId =
            req.params.id;

        const existing =
            await getIncidentById(
                incidentId
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Incident not found."
            });
        }

        /*
         * Citizens can update only their own incidents.
         */

        if (
            req.userRole === "citizen" &&
            existing.userId !== req.user.uid
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot modify this incident."
            });
        }

        const body = req.body || {};

        const updates = {
            updatedAt: getCurrentTimestamp()
        };

        const allowedFields = [
            "description",
            "type",
            "category",
            "severity",
            "priority",
            "landmark"
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] =
                    normalizeText(body[field]);
            }
        }

        if (body.severity !== undefined) {
            updates.severity =
                normalizeSeverity(
                    body.severity
                );
        }

        if (body.priority !== undefined) {
            updates.priority =
                normalizePriority(
                    body.priority
                );
        }

        if (body.latitude !== undefined) {
            const latitude =
                Number(body.latitude);

            if (
                !validateCoordinates(
                    latitude,
                    existing.longitude
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid latitude."
                });
            }

            updates.latitude = latitude;
        }

        if (body.longitude !== undefined) {
            const longitude =
                Number(body.longitude);

            if (
                !validateCoordinates(
                    existing.latitude,
                    longitude
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid longitude."
                });
            }

            updates.longitude = longitude;
        }

        const updated =
            await updateIncidentById(
                incidentId,
                updates
            );

        return res.json({
            success: true,
            message:
                "Incident updated successfully.",
            incident:
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
// UPDATE INCIDENT STATUS
// ============================================================

async function updateIncidentStatus(
    req,
    res,
    next
) {
    try {
        const incidentId =
            req.params.id;

        const incident =
            await getIncidentById(
                incidentId
            );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found."
            });
        }

        const requestedStatus =
            normalizeStatus(
                req.body?.status
            );

        if (!req.body?.status) {
            return res.status(400).json({
                success: false,
                message: "Status is required."
            });
        }

        const allowedTransitions = {
            reported: [
                "pending",
                "assigned",
                "cancelled"
            ],

            pending: [
                "assigned",
                "cancelled"
            ],

            assigned: [
                "accepted",
                "cancelled"
            ],

            accepted: [
                "en route",
                "cancelled"
            ],

            "en route": [
                "arrived",
                "cancelled"
            ],

            arrived: [
                "resolved",
                "cancelled"
            ],

            resolved: [
                "closed"
            ],

            cancelled: [],

            closed: []
        };

        const currentStatus =
            normalizeStatus(
                incident.status
            );

        const allowed =
            allowedTransitions[
                currentStatus
            ] || [];

        /*
         * Admin can perform operational
         * status changes.
         */

        const isAdmin =
            req.userRole === "admin";

        const isAssignedResponder =
            req.userRole === "responder" &&
            incident.responderId ===
                req.user.uid;

        if (
            !isAdmin &&
            !isAssignedResponder
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to update this incident."
            });
        }

        if (
            requestedStatus !== currentStatus &&
            !allowed.includes(
                requestedStatus
            ) &&
            !isAdmin
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Invalid status transition: ${currentStatus} → ${requestedStatus}`
            });
        }

        const timestamp =
            getCurrentTimestamp();

        const updates = {
            status: requestedStatus,
            updatedAt: timestamp
        };

        if (
            requestedStatus === "resolved" ||
            requestedStatus === "closed"
        ) {
            updates.resolvedAt =
                timestamp;
        }

        if (
            requestedStatus === "accepted"
        ) {
            updates.acceptedAt =
                timestamp;
        }

        if (
            requestedStatus === "en route"
        ) {
            updates.enRouteAt =
                timestamp;
        }

        if (
            requestedStatus === "arrived"
        ) {
            updates.arrivedAt =
                timestamp;
        }

        const updated =
            await updateIncidentById(
                incidentId,
                updates
            );

        await notifyIncidentStatus(
            incident,
            requestedStatus
        );

        return res.json({
            success: true,
            message:
                "Incident status updated successfully.",
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
// ASSIGN RESPONDER
// ============================================================

async function assignResponder(
    req,
    res,
    next
) {
    try {
        const incidentId =
            req.params.id;

        const responderId =
            normalizeText(
                req.body?.responderId
            );

        if (!responderId) {
            return res.status(400).json({
                success: false,
                message:
                    "Responder ID is required."
            });
        }

        const incident =
            await getIncidentById(
                incidentId
            );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message:
                    "Incident not found."
            });
        }

        const responders =
            await getAllResponders();

        const responder =
            (Array.isArray(responders)
                ? responders
                : []
            ).find(
                (item) =>
                    item.uid === responderId ||
                    item.id === responderId ||
                    item.userId === responderId
            );

        if (!responder) {
            return res.status(404).json({
                success: false,
                message:
                    "Responder not found."
            });
        }

        const timestamp =
            getCurrentTimestamp();

        const updates = {
            responderId,

            responderName:
                responder.name ||
                responder.displayName ||
                responder.email ||
                "Responder",

            status: "assigned",

            assignedAt: timestamp,

            updatedAt: timestamp
        };

        const updated =
            await updateIncidentById(
                incidentId,
                updates
            );

        await notifyResponderAssignment(
            {
                ...incident,
                ...updates
            },
            responderId
        );

        return res.json({
            success: true,
            message:
                "Responder assigned successfully.",
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
// DELETE INCIDENT
// ============================================================

async function deleteIncident(
    req,
    res,
    next
) {
    try {
        const incidentId =
            req.params.id;

        const incident =
            await getIncidentById(
                incidentId
            );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message:
                    "Incident not found."
            });
        }

        /*
         * Only admin can permanently delete.
         */

        if (req.userRole !== "admin") {
            return res.status(403).json({
                success: false,
                message:
                    "Only administrators can delete incidents."
            });
        }

        await deleteIncidentById(
            incidentId
        );

        return res.json({
            success: true,
            message:
                "Incident deleted successfully."
        });

    } catch (error) {
        next(error);
    }
}


// ============================================================
// AI — CLASSIFY INCIDENT
// ============================================================

function classifyIncident(
    incident = {}
) {
    const text = `
        ${incident.type || ""}
        ${incident.category || ""}
        ${incident.description || ""}
    `.toLowerCase();

    let category = "general";

    if (
        /fire|burn|flame|smoke/.test(text)
    ) {
        category = "fire";
    } else if (
        /accident|crash|collision|vehicle|road/.test(text)
    ) {
        category = "accident";
    } else if (
        /flood|waterlogging|rain|water/.test(text)
    ) {
        category = "flood";
    } else if (
        /earthquake|quake|tremor/.test(text)
    ) {
        category = "earthquake";
    } else if (
        /medical|injury|injured|ambulance|unconscious/.test(text)
    ) {
        category = "medical";
    } else if (
        /crime|theft|robbery|attack|violence/.test(text)
    ) {
        category = "security";
    } else if (
        /gas|leak|chemical|toxic/.test(text)
    ) {
        category = "hazard";
    }

    return {
        category,
        confidence: category === "general"
            ? 0.50
            : 0.85
    };
}


// ============================================================
// AI — CALCULATE SEVERITY
// ============================================================

function calculateSeverity(
    incident = {}
) {
    const text = `
        ${incident.type || ""}
        ${incident.category || ""}
        ${incident.description || ""}
    `.toLowerCase();

    let score = 1;

    if (
        /death|dead|fatal|unconscious|critical/.test(text)
    ) {
        score += 3;
    }

    if (
        /multiple|many|crowd|people|trapped/.test(text)
    ) {
        score += 1;
    }

    if (
        /fire|explosion|accident|flood|earthquake|gas leak/.test(text)
    ) {
        score += 1;
    }

    const explicitSeverity =
        severityScore(
            incident.severity
        );

    score = Math.max(
        score,
        explicitSeverity
    );

    score = Math.min(
        score,
        4
    );

    const severityMap = {
        1: "low",
        2: "medium",
        3: "high",
        4: "critical"
    };

    return {
        severity:
            severityMap[score],
        score
    };
}


// ============================================================
// AI — CALCULATE PRIORITY
// ============================================================

function calculatePriorityValue(
    incident = {}
) {
    const severity =
        calculateSeverity(
            incident
        );

    let priority =
        severity.severity;

    const category =
        normalizeText(
            incident.category ||
            incident.type
        ).toLowerCase();

    if (
        category === "fire" ||
        category === "earthquake" ||
        category === "medical"
    ) {
        if (
            severityScore(priority) < 4
        ) {
            priority =
                severityScore(priority) >= 3
                    ? "critical"
                    : "high";
        }
    }

    return priority;
}


function calculatePriority(
    incident = {}
) {
    const priority =
        calculatePriorityValue(
            incident
        );

    return {
        priority,
        score: priorityScore(
            priority
        )
    };
}


// ============================================================
// AI — DUPLICATE DETECTION
// ============================================================

async function detectDuplicate(
    incident
) {
    try {
        const incidents =
            await getAllIncidents();

        if (!Array.isArray(incidents)) {
            return {
                duplicate: false,
                matches: []
            };
        }

        const currentLatitude =
            Number(incident.latitude);

        const currentLongitude =
            Number(incident.longitude);

        const currentTime =
            new Date(
                incident.createdAt ||
                Date.now()
            ).getTime();

        const matches = [];

        for (const existing of incidents) {
            if (
                existing.incidentId ===
                incident.incidentId
            ) {
                continue;
            }

            const existingTime =
                new Date(
                    existing.createdAt ||
                    0
                ).getTime();

            const timeDifference =
                Math.abs(
                    currentTime -
                    existingTime
                );

            const withinTime =
                timeDifference <=
                30 * 60 * 1000;

            let withinDistance = false;

            if (
                validateCoordinates(
                    currentLatitude,
                    currentLongitude
                ) &&
                validateCoordinates(
                    existing.latitude,
                    existing.longitude
                )
            ) {
                const distance =
                    calculateDistance(
                        currentLatitude,
                        currentLongitude,
                        existing.latitude,
                        existing.longitude
                    );

                withinDistance =
                    distance !== null &&
                    distance <= 1;
            }

            const sameCategory =
                normalizeText(
                    existing.category ||
                    existing.type
                ).toLowerCase() ===
                normalizeText(
                    incident.category ||
                    incident.type
                ).toLowerCase();

            if (
                withinTime &&
                withinDistance &&
                sameCategory
            ) {
                matches.push({
                    incidentId:
                        existing.incidentId,

                    distanceKm:
                        calculateDistance(
                            currentLatitude,
                            currentLongitude,
                            existing.latitude,
                            existing.longitude
                        ),

                    timeDifferenceMinutes:
                        Math.round(
                            timeDifference /
                                60000
                        )
                });
            }
        }

        return {
            duplicate:
                matches.length > 0,

            matches
        };

    } catch (error) {
        throw error;
    }
}


// ============================================================
// AI — RECOMMEND RESPONDER
// ============================================================

async function recommendResponder(
    incident
) {
    const responders =
        await getAllResponders();

    if (!Array.isArray(responders)) {
        return null;
    }

    const availableResponders =
        responders.filter(
            (responder) =>
                responder.available === true ||
                responder.status === "available"
        );

    if (
        availableResponders.length === 0
    ) {
        return null;
    }

    const latitude =
        Number(incident.latitude);

    const longitude =
        Number(incident.longitude);

    const sorted =
        sortByDistance(
            availableResponders,
            latitude,
            longitude
        );

    const recommended =
        sorted.find(
            (responder) =>
                responder.distanceKm !== null
        ) || sorted[0];

    if (!recommended) {
        return null;
    }

    return {
        responderId:
            recommended.uid ||
            recommended.userId ||
            recommended.id,

        responderName:
            recommended.name ||
            recommended.displayName ||
            recommended.email ||
            "Responder",

        distanceKm:
            recommended.distanceKm ??
            null,

        reason:
            "Nearest available responder"
    };
}


// ============================================================
// AI — COMPLETE INCIDENT ANALYSIS
// ============================================================

async function analyzeIncident(
    req,
    res,
    next
) {
    try {
        const incident =
            req.body || {};

        const classification =
            classifyIncident(
                incident
            );

        const severity =
            calculateSeverity(
                incident
            );

        const priority =
            calculatePriority(
                {
                    ...incident,
                    category:
                        classification.category,
                    severity:
                        severity.severity
                }
            );

        const duplicate =
            await detectDuplicate(
                incident
            );

        const responder =
            await recommendResponder(
                incident
            );

        return res.json({
            success: true,

            analysis: {
                classification,

                severity,

                priority,

                duplicate,

                recommendedResponder:
                    responder
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
    createIncident,
    getIncidents,
    getIncident,
    updateIncident,
    updateIncidentStatus,
    assignResponder,
    deleteIncident,

    analyzeIncident,
    classifyIncident,
    calculateSeverity,
    calculatePriority,
    detectDuplicate,
    recommendResponder
};