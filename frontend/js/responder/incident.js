import { auth, db } from "../firebase.js";

import {
    requireRole,
    logoutUser
} from "../auth.js";

import {
    $,
    $$,
    setText,
    formatDateTime,
    showToast,
    getStatusClass,
    getPriorityClass
} from "../common.js";

import {
    ref,
    get,
    update,
    onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let incidentId = null;
let incident = null;


const STATUS_FLOW = [
    "Assigned",
    "Accepted",
    "En Route",
    "Arrived",
    "Resolved"
];


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            currentUser =
                await requireRole(
                    "responder",
                    "../index.html"
                );

            if (!currentUser) return;


            const params =
                new URLSearchParams(
                    window.location.search
                );


            incidentId =
                params.get("id");


            if (!incidentId) {

                showToast(
                    "Incident ID missing.",
                    "error"
                );

                setTimeout(
                    () =>
                        window.location.href =
                            "assignments.html",
                    1200
                );

                return;
            }


            setupListeners();
            listenToIncident();

        } catch (error) {

            console.error(error);

            showToast(
                "Incident page load nahi ho saka.",
                "error"
            );
        }
    }
);


function setupListeners() {

    $$("[data-action='logout'], #logoutBtn")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    try {

                        await logoutUser();

                        window.location.href =
                            "../index.html";

                    } catch (error) {

                        console.error(error);

                        showToast(
                            "Logout failed.",
                            "error"
                        );
                    }
                }
            );
        });


    const backBtn =
        $("#backBtn");

    if (backBtn) {

        backBtn.addEventListener(
            "click",
            () => {
                window.location.href =
                    "assignments.html";
            }
        );
    }


    const mapBtn =
        $("#openMapBtn") ||
        $("#navigateBtn");

    if (mapBtn) {

        mapBtn.addEventListener(
            "click",
            openIncidentLocation
        );
    }
}


function listenToIncident() {

    const incidentRef =
        ref(
            db,
            `incidents/${incidentId}`
        );


    onValue(
        incidentRef,
        snapshot => {

            if (!snapshot.exists()) {

                showToast(
                    "Incident nahi mila.",
                    "error"
                );

                return;
            }


            incident = {
                id: snapshot.key,
                ...snapshot.val()
            };


            if (
                incident.responderId &&
                incident.responderId !==
                    currentUser.uid
            ) {

                showToast(
                    "Ye incident aapko assign nahi hai.",
                    "error"
                );

                return;
            }


            renderIncident();
            renderStatusControls();
            renderTimeline();

        },
        error => {

            console.error(error);

            showToast(
                "Incident data read nahi ho saka.",
                "error"
            );
        }
    );
}


function renderIncident() {

    setText(
        "#incidentId",
        incident.incidentId ||
        incident.id
    );


    setText(
        "#incidentType",
        incident.type ||
        incident.category ||
        "Emergency"
    );


    setText(
        "#incidentCategory",
        incident.category ||
        "Emergency"
    );


    setText(
        "#incidentDescription",
        incident.description ||
        "No description provided."
    );


    setText(
        "#incidentSeverity",
        incident.severity ||
        "Medium"
    );


    setText(
        "#incidentPriority",
        incident.priority ||
        "Normal"
    );


    setText(
        "#incidentStatus",
        incident.status ||
        "Assigned"
    );


    setText(
        "#citizenName",
        incident.userName ||
        "Unknown"
    );


    setText(
        "#citizenEmail",
        incident.userEmail ||
        "Not available"
    );


    setText(
        "#landmark",
        incident.landmark ||
        "Not provided"
    );


    setText(
        "#createdAt",
        formatDateTime(
            incident.createdAt
        )
    );


    setText(
        "#assignedAt",
        formatDateTime(
            incident.assignedAt
        )
    );


    setText(
        "#updatedAt",
        formatDateTime(
            incident.updatedAt
        )
    );


    setText(
        "#latitude",
        incident.latitude ??
        "Not available"
    );


    setText(
        "#longitude",
        incident.longitude ??
        "Not available"
    );


    const statusElement =
        $("#incidentStatus");


    if (statusElement) {

        statusElement.className =
            `status-badge ${
                getStatusClass(
                    incident.status
                )
            }`;
    }


    const priorityElement =
        $("#incidentPriority");


    if (priorityElement) {

        priorityElement.className =
            `badge ${
                getPriorityClass(
                    incident.priority
                )
            }`;
    }


    setupCitizenCall();
}


function setupCitizenCall() {

    const callBtn =
        $("#callCitizenBtn");


    if (!callBtn) return;


    if (!incident.userPhone) {

        callBtn.disabled = true;

        return;
    }


    callBtn.disabled = false;


    callBtn.onclick = () => {

        window.location.href =
            `tel:${incident.userPhone}`;
    };
}


function renderStatusControls() {

    const container =
        $("#statusControls");


    if (!container) return;


    const currentStatus =
        incident.status ||
        "Assigned";


    if (
        [
            "Resolved",
            "Cancelled",
            "Rejected"
        ].includes(currentStatus)
    ) {

        container.innerHTML = `
            <div class="status-complete">
                <strong>Incident Closed</strong>
                <p>
                    Current status:
                    ${escapeText(currentStatus)}
                </p>
            </div>
        `;

        return;
    }


    const nextStatus =
        getNextStatus(currentStatus);


    if (!nextStatus) {

        container.innerHTML = "";

        return;
    }


    container.innerHTML = `
        <div class="status-action-panel">

            <p>
                Current Status:
                <strong>
                    ${escapeText(currentStatus)}
                </strong>
            </p>

            <button
                id="nextStatusBtn"
                class="btn btn-primary">
                Mark as ${escapeText(nextStatus)}
            </button>

        </div>
    `;


    $("#nextStatusBtn")
        ?.addEventListener(
            "click",
            () =>
                updateStatus(nextStatus)
        );
}


function getNextStatus(status) {

    const index =
        STATUS_FLOW.indexOf(status);


    if (index === -1) {

        if (status === "Pending") {
            return "Accepted";
        }

        return "Accepted";
    }


    if (
        index <
        STATUS_FLOW.length - 1
    ) {
        return STATUS_FLOW[index + 1];
    }


    return null;
}


async function updateStatus(newStatus) {

    if (!incident) return;


    try {

        const updates = {
            status: newStatus,
            updatedAt: Date.now()
        };


        if (newStatus === "Accepted") {
            updates.acceptedAt = Date.now();
        }


        if (newStatus === "En Route") {
            updates.enRouteAt = Date.now();
        }


        if (newStatus === "Arrived") {
            updates.arrivedAt = Date.now();
        }


        if (newStatus === "Resolved") {
            updates.resolvedAt = Date.now();
        }


        await update(
            ref(
                db,
                `incidents/${incidentId}`
            ),
            updates
        );


        showToast(
            `Incident marked as ${newStatus}.`,
            "success"
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Status update failed.",
            "error"
        );
    }
}


function renderTimeline() {

    const container =
        $("#incidentTimeline");


    if (!container) return;


    const timeline = [

        {
            name: "Reported",
            time: incident.createdAt,
            active: true
        },

        {
            name: "Assigned",
            time: incident.assignedAt,
            active:
                !!incident.assignedAt
        },

        {
            name: "Accepted",
            time: incident.acceptedAt,
            active:
                !!incident.acceptedAt
        },

        {
            name: "En Route",
            time: incident.enRouteAt,
            active:
                !!incident.enRouteAt
        },

        {
            name: "Arrived",
            time: incident.arrivedAt,
            active:
                !!incident.arrivedAt
        },

        {
            name: "Resolved",
            time: incident.resolvedAt,
            active:
                !!incident.resolvedAt
        }

    ];


    container.innerHTML =
        timeline
            .map(item => `

                <div class="timeline-item ${
                    item.active
                        ? "active"
                        : ""
                }">

                    <div class="timeline-dot"></div>

                    <div class="timeline-content">

                        <strong>
                            ${item.name}
                        </strong>

                        ${
                            item.time
                                ? `
                                <span>
                                    ${formatDateTime(
                                        item.time
                                    )}
                                </span>
                                `
                                : `
                                <span>
                                    Pending
                                </span>
                                `
                        }

                    </div>

                </div>

            `)
            .join("");
}


function openIncidentLocation() {

    if (
        incident?.latitude === undefined ||
        incident?.longitude === undefined
    ) {

        showToast(
            "Incident location available nahi hai.",
            "error"
        );

        return;
    }


    const lat =
        Number(incident.latitude);


    const lng =
        Number(incident.longitude);


    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng)
    ) {

        showToast(
            "Invalid incident coordinates.",
            "error"
        );

        return;
    }


    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


function escapeText(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}