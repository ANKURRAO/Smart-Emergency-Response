import { auth, db } from "../firebase.js";

import {
    requireRole,
    getUserProfile,
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
    getPriorityClass,
    setLoading
} from "../common.js";

import {
    ref,
    get,
    onValue,
    update,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

let currentUser = null;
let currentProfile = null;
let incidents = [];
let unsubscribeIncidents = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        currentUser = await requireRole("responder", "../index.html");

        if (!currentUser) return;

        await initializeDashboard();
        setupEventListeners();

    } catch (error) {
        console.error("Responder dashboard error:", error);
        showToast("Dashboard load nahi ho saka.", "error");
    }
});


async function initializeDashboard() {
    setLoading(true);

    try {
        currentProfile = await getUserProfile(currentUser.uid);

        if (!currentProfile) {
            showToast("Responder profile nahi mila.", "error");
            return;
        }

        loadProfileHeader();
        setupAvailability();
        listenToAssignedIncidents();

    } finally {
        setLoading(false);
    }
}


function loadProfileHeader() {
    const name =
        currentProfile.name ||
        currentUser.displayName ||
        "Responder";

    setText("#responderName", name);
    setText("#profileName", name);

    const avatar = $("#responderAvatar");

    if (avatar) {
        avatar.textContent = getInitials(name);
    }

    const department = currentProfile.department || "Emergency Response";
    setText("#departmentName", department);

    const vehicle = currentProfile.vehicle || "Not Assigned";
    setText("#vehicleName", vehicle);
}


function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join("");
}


function setupAvailability() {
    const toggle =
        $("#availabilityToggle") ||
        $("#availability") ||
        $("#availableToggle");

    if (!toggle) return;

    const available = currentProfile.available === true;

    if (toggle.type === "checkbox") {
        toggle.checked = available;
    }

    updateAvailabilityUI(available);
}


function setupEventListeners() {

    const availabilityToggle =
        $("#availabilityToggle") ||
        $("#availability") ||
        $("#availableToggle");

    if (availabilityToggle) {

        availabilityToggle.addEventListener("change", async (event) => {

            const available =
                event.target.type === "checkbox"
                    ? event.target.checked
                    : event.target.value === "true";

            await updateAvailability(available);
        });
    }


    const logoutButtons = $$("[data-action='logout'], #logoutBtn");

    logoutButtons.forEach(button => {
        button.addEventListener("click", async () => {

            try {
                await logoutUser();
                window.location.href = "../index.html";

            } catch (error) {
                console.error(error);
                showToast("Logout failed.", "error");
            }

        });
    });


    const refreshBtn =
        $("#refreshBtn") ||
        $("#refreshDashboard");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            listenToAssignedIncidents(true);
        });
    }
}


async function updateAvailability(available) {

    if (!currentUser) return;

    try {

        await update(
            ref(db, `users/${currentUser.uid}`),
            {
                available,
                updatedAt: Date.now()
            }
        );

        currentProfile.available = available;

        updateAvailabilityUI(available);

        showToast(
            available
                ? "You are now available for assignments."
                : "You are now offline.",
            "success"
        );

    } catch (error) {

        console.error("Availability update error:", error);

        showToast(
            "Availability update nahi ho saki.",
            "error"
        );
    }
}


function updateAvailabilityUI(available) {

    const statusElements = $(
        "#availabilityStatus"
    );

    if (statusElements) {

        statusElements.textContent =
            available ? "Available" : "Offline";

        statusElements.classList.toggle(
            "available",
            available
        );

        statusElements.classList.toggle(
            "offline",
            !available
        );
    }

    const indicators = $$(
        ".availability-indicator"
    );

    indicators.forEach(indicator => {

        indicator.textContent =
            available ? "Available" : "Offline";

        indicator.classList.toggle(
            "available",
            available
        );

        indicator.classList.toggle(
            "offline",
            !available
        );
    });
}


function listenToAssignedIncidents(forceRefresh = false) {

    if (!currentUser) return;

    if (unsubscribeIncidents && forceRefresh) {
        unsubscribeIncidents();
        unsubscribeIncidents = null;
    }

    const incidentsRef = query(
        ref(db, "incidents"),
        orderByChild("responderId"),
        equalTo(currentUser.uid)
    );

    unsubscribeIncidents = onValue(
        incidentsRef,
        snapshot => {

            incidents = [];

            snapshot.forEach(child => {

                incidents.push({
                    id: child.key,
                    ...child.val()
                });

            });

            incidents.sort(
                (a, b) =>
                    (b.updatedAt || b.createdAt || 0) -
                    (a.updatedAt || a.createdAt || 0)
            );

            updateStatistics();
            renderActiveIncident();
            renderRecentAssignments();

        },
        error => {

            console.error(
                "Incident listener error:",
                error
            );

            showToast(
                "Assignments load nahi ho paayi.",
                "error"
            );
        }
    );
}


function updateStatistics() {

    const total = incidents.length;

    const active = incidents.filter(
        incident =>
            !["Resolved", "Cancelled", "Rejected"]
                .includes(incident.status)
    ).length;

    const resolved = incidents.filter(
        incident =>
            incident.status === "Resolved"
    ).length;

    const critical = incidents.filter(
        incident =>
            String(incident.severity).toLowerCase() ===
            "critical"
    ).length;

    setText("#totalAssignments", total);
    setText("#activeAssignments", active);
    setText("#resolvedAssignments", resolved);
    setText("#criticalAssignments", critical);
}


function renderActiveIncident() {

    const container =
        $("#activeIncident");

    if (!container) return;

    const activeIncident = incidents.find(
        incident =>
            !["Resolved", "Cancelled", "Rejected"]
                .includes(incident.status)
    );

    if (!activeIncident) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <h3>No Active Incident</h3>
                <p>You currently have no active emergency assignment.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = createIncidentCard(
        activeIncident,
        true
    );
}


function renderRecentAssignments() {

    const container =
        $("#recentAssignments") ||
        $("#assignmentList");

    if (!container) return;

    const recent = incidents.slice(0, 5);

    if (!recent.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No Assignments</h3>
                <p>No incident has been assigned yet.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        recent
            .map(incident =>
                createIncidentCard(
                    incident,
                    false
                )
            )
            .join("");

    attachIncidentButtons(container);
}


function createIncidentCard(incident, active = false) {

    const priority =
        incident.priority || "Normal";

    const severity =
        incident.severity || "Medium";

    const status =
        incident.status || "Assigned";

    return `
        <div class="incident-card ${active ? "active-incident" : ""}">

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

            </div>


            <div class="incident-card-actions">

                <button
                    class="btn btn-primary view-incident-btn"
                    data-id="${incident.id}">
                    View Incident
                </button>

            </div>

        </div>
    `;
}


function attachIncidentButtons(container) {

    container
        .querySelectorAll(".view-incident-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.id;

                    window.location.href =
                        `incident.html?id=${encodeURIComponent(id)}`;
                }
            );
        });
}


function escapeText(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}