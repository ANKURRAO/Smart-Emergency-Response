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
    timeAgo,
    showToast,
    getStatusClass,
    getPriorityClass
} from "../common.js";

import {
    ref,
    onValue,
    update,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let assignments = [];
let filteredAssignments = [];
let unsubscribe = null;


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

            setupListeners();
            listenToAssignments();

        } catch (error) {

            console.error(error);

            showToast(
                "Assignments load nahi ho paayi.",
                "error"
            );
        }
    }
);


function setupListeners() {

    const search =
        $("#searchInput") ||
        $("#assignmentSearch");

    if (search) {
        search.addEventListener(
            "input",
            applyFilters
        );
    }


    const statusFilter =
        $("#statusFilter");

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            applyFilters
        );
    }


    const priorityFilter =
        $("#priorityFilter");

    if (priorityFilter) {
        priorityFilter.addEventListener(
            "change",
            applyFilters
        );
    }


    const severityFilter =
        $("#severityFilter");

    if (severityFilter) {
        severityFilter.addEventListener(
            "change",
            applyFilters
        );
    }


    const logoutButtons =
        $$("[data-action='logout'], #logoutBtn");

    logoutButtons.forEach(button => {

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
}


function listenToAssignments() {

    const incidentsQuery = query(
        ref(db, "incidents"),
        orderByChild("responderId"),
        equalTo(currentUser.uid)
    );


    unsubscribe = onValue(
        incidentsQuery,
        snapshot => {

            assignments = [];

            snapshot.forEach(child => {

                assignments.push({
                    id: child.key,
                    ...child.val()
                });

            });


            assignments.sort(
                (a, b) =>
                    (b.updatedAt || b.createdAt || 0) -
                    (a.updatedAt || a.createdAt || 0)
            );


            filteredAssignments = [
                ...assignments
            ];

            updateStatistics();
            renderAssignments();

        },
        error => {

            console.error(error);

            showToast(
                "Firebase se assignments read nahi ho paayi.",
                "error"
            );
        }
    );
}


function applyFilters() {

    const search =
        (
            $("#searchInput") ||
            $("#assignmentSearch")
        )?.value
            ?.trim()
            .toLowerCase() || "";


    const status =
        $("#statusFilter")?.value || "";


    const priority =
        $("#priorityFilter")?.value || "";


    const severity =
        $("#severityFilter")?.value || "";


    filteredAssignments =
        assignments.filter(incident => {

            const searchable = [

                incident.incidentId,
                incident.type,
                incident.category,
                incident.description,
                incident.userName,
                incident.userEmail

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchable.includes(search);


            const matchesStatus =
                !status ||
                incident.status === status;


            const matchesPriority =
                !priority ||
                incident.priority === priority;


            const matchesSeverity =
                !severity ||
                incident.severity === severity;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesPriority &&
                matchesSeverity
            );
        });


    renderAssignments();
}


function updateStatistics() {

    setText(
        "#totalAssignments",
        assignments.length
    );


    setText(
        "#activeAssignments",
        assignments.filter(
            incident =>
                ![
                    "Resolved",
                    "Cancelled",
                    "Rejected"
                ].includes(incident.status)
        ).length
    );


    setText(
        "#pendingAssignments",
        assignments.filter(
            incident =>
                incident.status === "Assigned"
        ).length
    );


    setText(
        "#resolvedAssignments",
        assignments.filter(
            incident =>
                incident.status === "Resolved"
        ).length
    );
}


function renderAssignments() {

    const container =
        $("#assignmentsContainer") ||
        $("#assignmentList") ||
        $("#assignmentsList");


    if (!container) return;


    if (!filteredAssignments.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No Assignments Found</h3>
                <p>
                    There are no incidents matching your filters.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        filteredAssignments
            .map(createAssignmentCard)
            .join("");


    attachActions(container);
}


function createAssignmentCard(incident) {

    const status =
        incident.status || "Assigned";

    const priority =
        incident.priority || "Normal";

    const severity =
        incident.severity || "Medium";


    const canAccept =
        status === "Assigned";


    const canReject =
        status === "Assigned";


    return `
        <div class="assignment-card incident-card">

            <div class="incident-card-header">

                <div>

                    <strong>
                        ${escapeText(
                            incident.incidentId ||
                            incident.id
                        )}
                    </strong>

                    <span class="badge ${getPriorityClass(priority)}">
                        ${escapeText(priority)}
                    </span>

                </div>

                <span class="status-badge ${getStatusClass(status)}">
                    ${escapeText(status)}
                </span>

            </div>


            <div class="incident-card-body">

                <h3>
                    ${escapeText(
                        incident.type ||
                        incident.category ||
                        "Emergency"
                    )}
                </h3>


                <p>
                    ${escapeText(
                        incident.description ||
                        "No description provided."
                    )}
                </p>


                <div class="incident-meta">

                    <span>
                        Citizen:
                        <strong>
                            ${escapeText(
                                incident.userName ||
                                "Unknown"
                            )}
                        </strong>
                    </span>

                    <span>
                        Severity:
                        <strong>
                            ${escapeText(severity)}
                        </strong>
                    </span>

                    <span>
                        ${timeAgo(
                            incident.createdAt
                        )}
                    </span>

                </div>


                ${
                    incident.landmark
                        ? `
                        <div class="location-info">
                            📍 ${escapeText(
                                incident.landmark
                            )}
                        </div>
                        `
                        : ""
                }

            </div>


            <div class="incident-card-actions">

                <button
                    class="btn btn-primary view-btn"
                    data-id="${incident.id}">
                    View Details
                </button>


                ${
                    canAccept
                        ? `
                        <button
                            class="btn btn-success accept-btn"
                            data-id="${incident.id}">
                            Accept
                        </button>
                        `
                        : ""
                }


                ${
                    canReject
                        ? `
                        <button
                            class="btn btn-danger reject-btn"
                            data-id="${incident.id}">
                            Reject
                        </button>
                        `
                        : ""
                }

            </div>

        </div>
    `;
}


function attachActions(container) {

    container
        .querySelectorAll(".view-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `incident.html?id=${encodeURIComponent(
                            button.dataset.id
                        )}`;
                }
            );
        });


    container
        .querySelectorAll(".accept-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    updateIncidentStatus(
                        button.dataset.id,
                        "Accepted"
                    )
            );
        });


    container
        .querySelectorAll(".reject-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    rejectAssignment(
                        button.dataset.id
                    )
            );
        });
}


async function updateIncidentStatus(
    incidentId,
    newStatus
) {

    try {

        const incidentRef =
            ref(
                db,
                `incidents/${incidentId}`
            );


        await update(
            incidentRef,
            {
                status: newStatus,
                acceptedAt:
                    newStatus === "Accepted"
                        ? Date.now()
                        : undefined,
                updatedAt: Date.now()
            }
        );


        showToast(
            `Incident ${newStatus}.`,
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


async function rejectAssignment(
    incidentId
) {

    const confirmed =
        window.confirm(
            "Kya aap is assignment ko reject karna chahte hain?"
        );


    if (!confirmed) return;


    try {

        await update(
            ref(
                db,
                `incidents/${incidentId}`
            ),
            {
                status: "Rejected",
                rejectedAt: Date.now(),
                updatedAt: Date.now()
            }
        );


        showToast(
            "Assignment rejected.",
            "success"
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Assignment reject nahi ho paayi.",
            "error"
        );
    }
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