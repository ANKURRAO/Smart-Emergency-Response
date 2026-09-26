import { auth, db } from "../firebase.js";

import {
    getUserProfile,
    requireRole
} from "../auth.js";

import {
    $,
    $$,
    formatDateTime,
    timeAgo,
    showToast,
    getGoogleMapsUrl,
    escapeHTML
} from "../common.js";

import {
    ref,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let incidentId = null;
let incident = null;
let unsubscribeIncident = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            currentUser =
                await requireRole("citizen");

            if (!currentUser) {
                return;
            }


            incidentId =
                getIncidentIdFromURL();


            if (!incidentId) {

                showToast(
                    "Incident ID missing hai.",
                    "error"
                );

                setTimeout(
                    () => {
                        window.location.href =
                            "incidents.html";
                    },
                    1200
                );

                return;
            }


            setupBackButton();
            listenToIncident();

        } catch (error) {

            console.error(error);

            showToast(
                "Tracking page load nahi ho saka.",
                "error"
            );

        }

    }
);


function getIncidentIdFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return (
        params.get("id") ||
        params.get("incidentId")
    );

}


function listenToIncident() {

    const incidentRef =
        ref(
            db,
            `incidents/${incidentId}`
        );


    unsubscribeIncident =
        onValue(
            incidentRef,
            snapshot => {

                if (!snapshot.exists()) {

                    showNotFound();

                    return;
                }


                incident = {

                    id: snapshot.key,

                    ...snapshot.val()

                };


                if (
                    incident.userId !==
                    currentUser.uid
                ) {

                    showToast(
                        "Aapko is incident ko access karne ki permission nahi hai.",
                        "error"
                    );

                    setTimeout(
                        () => {
                            window.location.href =
                                "incidents.html";
                        },
                        1000
                    );

                    return;
                }


                renderIncident();

            },
            error => {

                console.error(error);

                showToast(
                    "Incident tracking data load nahi ho raha.",
                    "error"
                );

            }
        );

}


function renderIncident() {

    renderHeader();
    renderDescription();
    renderStatus();
    renderLocation();
    renderResponder();
    renderTimeline();
    renderActionButtons();

}


function renderHeader() {

    setTextBySelectors(
        [
            "#incidentId",
            "#trackingIncidentId",
            "[data-incident-id]"
        ],
        incident.incidentId ||
        incident.id
    );


    setTextBySelectors(
        [
            "#incidentType",
            "#trackingType",
            "[data-incident-type]"
        ],
        incident.type ||
        incident.category ||
        "Emergency"
    );


    setTextBySelectors(
        [
            "#incidentStatus",
            "#trackingStatus"
        ],
        incident.status ||
        "Pending"
    );


    setTextBySelectors(
        [
            "#incidentSeverity"
        ],
        incident.severity ||
        "Unknown"
    );


    setTextBySelectors(
        [
            "#incidentPriority"
        ],
        incident.priority ||
        incident.severity ||
        "Unknown"
    );


    setTextBySelectors(
        [
            "#incidentCreatedAt"
        ],
        incident.createdAt
            ? formatDateTime(
                incident.createdAt
            )
            : "Unknown"
    );

}


function renderDescription() {

    setTextBySelectors(
        [
            "#incidentDescription",
            "#description",
            "[data-description]"
        ],
        incident.description ||
        "No description provided."
    );


    setTextBySelectors(
        [
            "#landmark",
            "#incidentLandmark"
        ],
        incident.landmark ||
        "Not provided"
    );

}


function renderStatus() {

    const status =
        String(
            incident.status ||
            "Pending"
        ).toLowerCase();


    const stages = [
        "pending",
        "assigned",
        "accepted",
        "en route",
        "arrived",
        "resolved"
    ];


    const normalized =
        normalizeStatus(status);


    const currentIndex =
        stages.indexOf(
            normalized
        );


    const stageElements =
        $$("[data-status-stage]");


    stageElements.forEach(
        element => {

            const stage =
                normalizeStatus(
                    element.dataset.statusStage
                );


            const index =
                stages.indexOf(stage);


            element.classList.remove(
                "completed",
                "active",
                "pending"
            );


            if (
                currentIndex >= 0 &&
                index < currentIndex
            ) {

                element.classList.add(
                    "completed"
                );

            } else if (
                index === currentIndex
            ) {

                element.classList.add(
                    "active"
                );

            } else {

                element.classList.add(
                    "pending"
                );

            }

        }
    );


    const statusText =
        $("#statusMessage");


    if (statusText) {

        statusText.textContent =
            getStatusMessage(
                incident.status
            );

    }


    const statusBadge =
        $("#incidentStatus");


    if (statusBadge) {

        statusBadge.className =
            `badge ${getStatusClassSafe(
                incident.status
            )}`;

    }

}


function renderLocation() {

    const latitude =
        Number(
            incident.latitude
        );


    const longitude =
        Number(
            incident.longitude
        );


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        setTextBySelectors(
            [
                "#locationStatus",
                "#incidentLocation"
            ],
            "Location unavailable"
        );

        return;
    }


    setTextBySelectors(
        [
            "#latitude"
        ],
        latitude.toFixed(6)
    );


    setTextBySelectors(
        [
            "#longitude"
        ],
        longitude.toFixed(6)
    );


    const mapLinks =
        [
            "#openMap",
            "#openLocation",
            "[data-action='map']"
        ];


    const mapURL =
        getGoogleMapsUrl(
            latitude,
            longitude
        );


    mapLinks.forEach(selector => {

        const element =
            $(selector);

        if (!element) {
            return;
        }


        element.href =
            mapURL;

        element.target =
            "_blank";

        element.rel =
            "noopener noreferrer";

    });

}


function renderResponder() {

    const responderContainer =
        $("#responderInfo") ||
        $("#assignedResponder");


    if (!responderContainer) {
        return;
    }


    if (!incident.responderId) {

        responderContainer.innerHTML = `

            <div class="empty-state compact">

                <span>⏳</span>

                <h4>
                    Responder not assigned yet
                </h4>

                <p>
                    Control room responder assign karega.
                </p>

            </div>

        `;

        return;
    }


    responderContainer.innerHTML = `

        <div class="responder-card">

            <div class="responder-avatar">
                👨‍🚒
            </div>

            <div class="responder-details">

                <h3>
                    ${escapeHTML(
                        incident.responderName ||
                        "Emergency Responder"
                    )}
                </h3>

                <p>
                    Assigned responder
                </p>

            </div>

            <span class="badge badge-info">
                Assigned
            </span>

        </div>

    `;

}


function renderTimeline() {

    const container =
        $("#incidentTimeline") ||
        $("#timeline");


    if (!container) {
        return;
    }


    const events = [];


    if (incident.createdAt) {

        events.push({
            title: "Emergency Reported",
            description:
                "Citizen ne emergency report submit ki.",
            timestamp:
                incident.createdAt
        });

    }


    if (incident.assignedAt) {

        events.push({
            title: "Responder Assigned",
            description:
                incident.responderName
                    ? `${incident.responderName} assigned.`
                    : "Responder assigned.",
            timestamp:
                incident.assignedAt
        });

    }


    if (
        incident.status &&
        normalizeStatus(
            incident.status
        ) === "accepted"
    ) {

        events.push({
            title: "Responder Accepted",
            description:
                "Responder ne assignment accept ki.",
            timestamp:
                incident.updatedAt
        });

    }


    if (incident.status) {

        events.push({
            title:
                `Status: ${incident.status}`,
            description:
                getStatusMessage(
                    incident.status
                ),
            timestamp:
                incident.updatedAt ||
                incident.createdAt
        });

    }


    if (incident.resolvedAt) {

        events.push({
            title: "Emergency Resolved",
            description:
                "Emergency response complete ho gaya.",
            timestamp:
                incident.resolvedAt
        });

    }


    events.sort(
        (a, b) =>
            Number(a.timestamp || 0) -
            Number(b.timestamp || 0)
    );


    container.innerHTML =
        events
            .map(
                event => `

                    <div class="timeline-item">

                        <div class="timeline-dot"></div>

                        <div class="timeline-content">

                            <h4>
                                ${escapeHTML(
                                    event.title
                                )}
                            </h4>

                            <p>
                                ${escapeHTML(
                                    event.description
                                )}
                            </p>

                            <small>
                                ${escapeHTML(
                                    event.timestamp
                                        ? formatDateTime(
                                            event.timestamp
                                        )
                                        : ""
                                )}
                            </small>

                        </div>

                    </div>

                `
            )
            .join("");

}


function renderActionButtons() {

    const cancelButton =
        $("#cancelIncidentBtn");


    if (!cancelButton) {
        return;
    }


    const status =
        normalizeStatus(
            incident.status
        );


    const canCancel = [
        "pending",
        "assigned"
    ].includes(status);


    cancelButton.style.display =
        canCancel
            ? "inline-flex"
            : "none";


    if (canCancel) {

        cancelButton.onclick =
            cancelIncident;

    }

}


async function cancelIncident() {

    const confirmed =
        window.confirm(
            "Kya aap is emergency report ko cancel karna chahte hain?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const { update } =
            await import(
                "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js"
            );


        await update(
            ref(
                db,
                `incidents/${incidentId}`
            ),
            {

                status: "Cancelled",

                updatedAt:
                    Date.now(),

                cancelledAt:
                    Date.now()

            }
        );


        showToast(
            "Incident cancelled.",
            "success"
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Incident cancel nahi ho saka.",
            "error"
        );

    }

}


function setupBackButton() {

    const buttons = [
        "#backBtn",
        "#backButton"
    ];


    buttons.forEach(selector => {

        const button = $(selector);

        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                window.location.href =
                    "incidents.html";

            }
        );

    });

}


function showNotFound() {

    const container =
        $("#trackingContainer") ||
        $("main");


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                ❌
            </div>

            <h2>
                Incident not found
            </h2>

            <p>
                Ye incident exist nahi karta ya delete ho chuka hai.
            </p>

            <a
                href="incidents.html"
                class="btn btn-primary"
            >
                Back to Incidents
            </a>

        </div>

    `;

}


function normalizeStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();


    const aliases = {

        "new": "pending",

        "reported": "pending",

        "pending": "pending",

        "assigned": "assigned",

        "accepted": "accepted",

        "enroute": "en route",

        "en-route": "en route",

        "en route": "en route",

        "arrived": "arrived",

        "resolved": "resolved",

        "completed": "resolved",

        "closed": "resolved",

        "cancelled": "resolved",

        "canceled": "resolved"

    };


    return aliases[value] || value;

}


function getStatusMessage(status) {

    switch (
        normalizeStatus(status)
    ) {

        case "pending":
            return "Emergency control room mein receive ho gayi hai.";

        case "assigned":
            return "Ek responder aapki emergency ke liye assign kiya gaya hai.";

        case "accepted":
            return "Responder ne emergency assignment accept kar liya hai.";

        case "en route":
            return "Responder emergency location ki taraf aa raha hai.";

        case "arrived":
            return "Responder emergency location par pahunch gaya hai.";

        case "resolved":
            return "Emergency response complete ho gaya hai.";

        default:
            return "Emergency ka status update ho raha hai.";

    }

}


function getStatusClassSafe(status) {

    const normalized =
        normalizeStatus(status);


    if (
        normalized === "resolved"
    ) {
        return "badge-success";
    }


    if (
        normalized === "pending"
    ) {
        return "badge-warning";
    }


    if (
        normalized === "assigned" ||
        normalized === "accepted"
    ) {
        return "badge-info";
    }


    if (
        normalized === "en route" ||
        normalized === "arrived"
    ) {
        return "badge-primary";
    }


    return "badge-secondary";

}


function setTextBySelectors(
    selectors,
    value
) {

    selectors.forEach(selector => {

        const element = $(selector);

        if (element) {

            element.textContent =
                value ?? "";

        }

    });

}


window.addEventListener(
    "beforeunload",
    () => {

        if (unsubscribeIncident) {
            unsubscribeIncident();
        }

    }
);