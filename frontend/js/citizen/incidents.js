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
    getStatusClass,
    getPriorityClass,
    escapeHTML
} from "../common.js";

import {
    ref,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let incidents = [];
let filteredIncidents = [];
let unsubscribe = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            currentUser =
                await requireRole("citizen");

            if (!currentUser) {
                return;
            }


            setupControls();
            listenToIncidents();

        } catch (error) {

            console.error(error);

            showToast(
                "Incidents page load nahi ho saka.",
                "error"
            );

        }

    }
);


function listenToIncidents() {

    const incidentsQuery =
        query(
            ref(db, "incidents"),
            orderByChild("userId"),
            equalTo(currentUser.uid)
        );


    unsubscribe =
        onValue(
            incidentsQuery,
            snapshot => {

                incidents = [];


                if (snapshot.exists()) {

                    snapshot.forEach(
                        child => {

                            incidents.push({

                                id: child.key,

                                ...child.val()

                            });

                        }
                    );

                }


                incidents.sort(
                    (a, b) =>
                        Number(b.createdAt || 0) -
                        Number(a.createdAt || 0)
                );


                filteredIncidents =
                    [...incidents];


                updateStatistics();
                renderIncidents();

            },
            error => {

                console.error(error);

                showToast(
                    "Firebase data load nahi ho raha.",
                    "error"
                );

            }
        );

}


function setupControls() {

    const searchInputs = [
        "#searchIncident",
        "#searchInput",
        "[data-search='incidents']"
    ];


    searchInputs.forEach(selector => {

        const input = $(selector);

        if (!input) {
            return;
        }


        input.addEventListener(
            "input",
            applyFilters
        );

    });


    const statusFilters = [
        "#statusFilter",
        "[data-filter='status']"
    ];


    statusFilters.forEach(selector => {

        const element = $(selector);

        if (!element) {
            return;
        }


        element.addEventListener(
            "change",
            applyFilters
        );

    });


    const severityFilters = [
        "#severityFilter",
        "[data-filter='severity']"
    ];


    severityFilters.forEach(selector => {

        const element = $(selector);

        if (!element) {
            return;
        }


        element.addEventListener(
            "change",
            applyFilters
        );

    });


    const clearButtons = [
        "#clearFilters",
        "#resetFilters"
    ];


    clearButtons.forEach(selector => {

        const button = $(selector);

        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            clearFilters
        );

    });

}


function applyFilters() {

    const search =
        getInputValue([
            "#searchIncident",
            "#searchInput",
            "[data-search='incidents']"
        ]).toLowerCase();


    const status =
        getInputValue([
            "#statusFilter",
            "[data-filter='status']"
        ]).toLowerCase();


    const severity =
        getInputValue([
            "#severityFilter",
            "[data-filter='severity']"
        ]).toLowerCase();


    filteredIncidents =
        incidents.filter(
            incident => {

                const searchable = [
                    incident.incidentId,
                    incident.id,
                    incident.type,
                    incident.category,
                    incident.description,
                    incident.status,
                    incident.severity,
                    incident.priority,
                    incident.landmark
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(search);


                const matchesStatus =
                    !status ||
                    status === "all" ||
                    String(
                        incident.status || ""
                    ).toLowerCase() === status;


                const matchesSeverity =
                    !severity ||
                    severity === "all" ||
                    String(
                        incident.severity || ""
                    ).toLowerCase() === severity;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesSeverity
                );

            }
        );


    renderIncidents();

}


function clearFilters() {

    [
        "#searchIncident",
        "#searchInput"
    ].forEach(selector => {

        const input = $(selector);

        if (input) {
            input.value = "";
        }

    });


    [
        "#statusFilter",
        "#severityFilter"
    ].forEach(selector => {

        const select = $(selector);

        if (select) {
            select.value = "all";
        }

    });


    filteredIncidents =
        [...incidents];


    renderIncidents();

}


function updateStatistics() {

    const total =
        incidents.length;


    const active =
        incidents.filter(
            incident =>
                !isResolved(
                    incident.status
                )
        ).length;


    const resolved =
        incidents.filter(
            incident =>
                isResolved(
                    incident.status
                )
        ).length;


    const critical =
        incidents.filter(
            incident =>
                String(
                    incident.severity || ""
                ).toLowerCase() ===
                "critical"
        ).length;


    setNumber(
        "#totalIncidents",
        total
    );

    setNumber(
        "#activeIncidents",
        active
    );

    setNumber(
        "#resolvedIncidents",
        resolved
    );

    setNumber(
        "#criticalIncidents",
        critical
    );

}


function renderIncidents() {

    const container =
        $("#incidentList") ||
        $("#incidentsList") ||
        $("#incidentContainer");


    if (!container) {
        return;
    }


    if (filteredIncidents.length === 0) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📋
                </div>

                <h3>
                    No incidents found
                </h3>

                <p>
                    Aapke selected filters ke according koi incident nahi mila.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        filteredIncidents
            .map(
                createIncidentHTML
            )
            .join("");


    setupIncidentButtons(
        container
    );

}


function createIncidentHTML(incident) {

    const status =
        incident.status ||
        "Pending";


    const severity =
        incident.severity ||
        "Unknown";


    const priority =
        incident.priority ||
        severity;


    const type =
        incident.type ||
        incident.category ||
        "Emergency";


    const incidentId =
        incident.incidentId ||
        incident.id;


    return `

        <article
            class="incident-card"
            data-id="${escapeHTML(incident.id)}"
        >

            <div class="incident-card-header">

                <div>

                    <span class="incident-id">
                        ${escapeHTML(incidentId)}
                    </span>

                    <h3>
                        ${escapeHTML(type)}
                    </h3>

                </div>


                <span
                    class="badge ${getStatusClass(status)}"
                >
                    ${escapeHTML(status)}
                </span>

            </div>


            <div class="incident-card-body">

                <p>
                    ${escapeHTML(
                        incident.description ||
                        "No description."
                    )}
                </p>


                <div class="incident-meta">

                    <span>
                        🚨
                        ${escapeHTML(severity)}
                    </span>


                    <span>
                        ⚡
                        ${escapeHTML(priority)}
                    </span>


                    <span>
                        🕒
                        ${escapeHTML(
                            incident.createdAt
                                ? timeAgo(
                                    incident.createdAt
                                )
                                : "Unknown"
                        )}
                    </span>

                </div>


                ${
                    incident.landmark
                    ? `
                        <div class="incident-location">
                            📍
                            ${escapeHTML(
                                incident.landmark
                            )}
                        </div>
                    `
                    : ""
                }

            </div>


            <div class="incident-card-actions">

                <button
                    class="btn btn-primary btn-sm"
                    data-action="details"
                    data-id="${escapeHTML(incident.id)}"
                >
                    View Details
                </button>


                <button
                    class="btn btn-secondary btn-sm"
                    data-action="track"
                    data-id="${escapeHTML(incident.id)}"
                >
                    Track
                </button>

            </div>

        </article>

    `;

}


function setupIncidentButtons(container) {

    container
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                handleAction
            );

        });

}


function handleAction(event) {

    const button =
        event.currentTarget;


    const action =
        button.dataset.action;


    const id =
        button.dataset.id;


    if (!id) {
        return;
    }


    if (action === "track") {

        window.location.href =
            `tracking.html?id=${encodeURIComponent(id)}`;

        return;
    }


    if (action === "details") {

        window.location.href =
            `incidents.html?id=${encodeURIComponent(id)}`;

    }

}


function getInputValue(selectors) {

    for (const selector of selectors) {

        const element = $(selector);

        if (element) {
            return element.value.trim();
        }

    }


    return "";

}


function setNumber(selector, value) {

    const element = $(selector);

    if (element) {
        element.textContent = value;
    }

}


function isResolved(status) {

    return [
        "resolved",
        "closed",
        "cancelled",
        "canceled",
        "completed"
    ].includes(
        String(status || "")
            .toLowerCase()
    );

}


window.addEventListener(
    "beforeunload",
    () => {

        if (unsubscribe) {
            unsubscribe();
        }

    }
);