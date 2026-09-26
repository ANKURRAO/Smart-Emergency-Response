// =========================================================
// SMART EMERGENCY RESPONSE
// CITIZEN DASHBOARD
// =========================================================

import {
    auth,
    db
} from "../firebase.js";

import {
    getUserProfile,
    requireRole,
    logoutUser
} from "../auth.js";

import {
    $,
    showToast,
    formatDateTime,
    timeAgo,
    getStatusClass,
    escapeHTML
} from "../common.js";

import {
    ref,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let currentProfile = null;
let incidents = [];

let incidentsListener = null;
let userListener = null;

// =========================================================
// PAGE INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const authorized =
            await requireRole(
                "citizen",
                "../index.html"
            );

        if (!authorized) {
            return;
        }

        currentUser =
            auth.currentUser;

        if (!currentUser) {
            return;
        }

        await loadCitizenProfile();

        setupLogout();

        setupNavigation();

        listenToCitizenIncidents();

        setupRefreshButton();
    }
);

// =========================================================
// LOAD CITIZEN PROFILE
// =========================================================

async function loadCitizenProfile() {

    try {

        currentProfile =
            await getUserProfile(
                currentUser.uid
            );

        if (!currentProfile) {

            showToast(
                "Unable to load your profile.",
                "error"
            );

            return;
        }

        updateProfileUI(
            currentProfile
        );

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

        showToast(
            "Unable to load profile.",
            "error"
        );
    }
}

// =========================================================
// UPDATE PROFILE UI
// =========================================================

function updateProfileUI(
    profile
) {

    const name =
        profile.name ||
        currentUser.displayName ||
        "Citizen";

    const email =
        profile.email ||
        currentUser.email ||
        "";

    // Welcome heading
    const welcomeName =
        $("#welcomeName");

    if (welcomeName) {
        welcomeName.textContent =
            name;
    }

    // User name
    const userName =
        $("#userName");

    if (userName) {
        userName.textContent =
            name;
    }

    // User email
    const userEmail =
        $("#userEmail");

    if (userEmail) {
        userEmail.textContent =
            email;
    }

    // Profile avatar
    const avatar =
        $("#profileAvatar");

    if (avatar) {

        avatar.textContent =
            getInitials(name);
    }
}

// =========================================================
// GET USER INITIALS
// =========================================================

function getInitials(
    name
) {

    if (!name) {
        return "C";
    }

    const words =
        String(name)
            .trim()
            .split(/\s+/);

    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();
}

// =========================================================
// LISTEN TO CITIZEN INCIDENTS
// =========================================================

function listenToCitizenIncidents() {

    if (!currentUser) {
        return;
    }

    const incidentsRef =
        query(
            ref(db, "incidents"),
            orderByChild("userId"),
            equalTo(currentUser.uid)
        );

    incidentsListener =
        onValue(
            incidentsRef,
            snapshot => {

                incidents = [];

                if (snapshot.exists()) {

                    const data =
                        snapshot.val();

                    Object.entries(data)
                        .forEach(
                            ([id, incident]) => {

                                incidents.push({
                                    id,
                                    ...incident
                                });
                            }
                        );
                }

                sortIncidents();

                updateDashboardStats();

                renderRecentIncidents();

                updateActiveIncident();
            },

            error => {

                console.error(
                    "Incident listener error:",
                    error
                );

                showToast(
                    "Unable to load incidents.",
                    "error"
                );
            }
        );
}

// =========================================================
// SORT INCIDENTS
// =========================================================

function sortIncidents() {

    incidents.sort(
        (a, b) => {

            const dateA =
                Number(
                    a.createdAt || 0
                );

            const dateB =
                Number(
                    b.createdAt || 0
                );

            return dateB - dateA;
        }
    );
}

// =========================================================
// UPDATE DASHBOARD STATISTICS
// =========================================================

function updateDashboardStats() {

    const total =
        incidents.length;

    const active =
        incidents.filter(
            incident =>
                isActiveIncident(
                    incident
                )
        ).length;

    const resolved =
        incidents.filter(
            incident =>
                isResolvedIncident(
                    incident
                )
        ).length;

    const critical =
        incidents.filter(
            incident =>
                String(
                    incident.severity || ""
                ).toLowerCase() === "critical"
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

// =========================================================
// SET NUMBER
// =========================================================

function setNumber(
    selector,
    value
) {

    const element =
        $(selector);

    if (element) {
        element.textContent =
            String(value);
    }
}

// =========================================================
// CHECK ACTIVE INCIDENT
// =========================================================

function isActiveIncident(
    incident
) {

    const status =
        String(
            incident.status || ""
        ).toLowerCase();

    return ![
        "resolved",
        "completed",
        "closed",
        "cancelled"
    ].includes(status);
}

// =========================================================
// CHECK RESOLVED INCIDENT
// =========================================================

function isResolvedIncident(
    incident
) {

    const status =
        String(
            incident.status || ""
        ).toLowerCase();

    return [
        "resolved",
        "completed",
        "closed"
    ].includes(status);
}

// =========================================================
// RENDER RECENT INCIDENTS
// =========================================================

function renderRecentIncidents() {

    const container =
        $("#recentIncidents");

    if (!container) {
        return;
    }

    const recent =
        incidents.slice(0, 5);

    if (recent.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No incidents yet</h3>
                <p>
                    Your reported emergencies will
                    appear here.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        recent
            .map(
                incident =>
                    createIncidentCard(
                        incident
                    )
            )
            .join("");
}

// =========================================================
// CREATE INCIDENT CARD
// =========================================================

function createIncidentCard(
    incident
) {

    const type =
        incident.type ||
        incident.category ||
        "Emergency";

    const description =
        incident.description ||
        "No description provided.";

    const severity =
        incident.severity ||
        "Unknown";

    const status =
        incident.status ||
        "Pending";

    const priority =
        incident.priority ||
        "";

    const createdAt =
        incident.createdAt;

    const statusClass =
        getStatusClass(
            status
        );

    return `
        <div class="incident-card">

            <div class="incident-card-header">

                <div>
                    <div class="incident-type">
                        ${escapeHTML(type)}
                    </div>

                    <div class="incident-id">
                        ID:
                        ${escapeHTML(
                            incident.id
                        )}
                    </div>
                </div>

                <span class="badge ${statusClass}">
                    ${escapeHTML(status)}
                </span>

            </div>

            <p class="incident-description">
                ${escapeHTML(description)}
            </p>

            <div class="incident-meta">

                <span>
                    Severity:
                    <strong>
                        ${escapeHTML(severity)}
                    </strong>
                </span>

                ${
                    priority
                        ? `
                        <span>
                            Priority:
                            <strong>
                                ${escapeHTML(
                                    priority
                                )}
                            </strong>
                        </span>
                        `
                        : ""
                }

                <span>
                    ${escapeHTML(
                        timeAgo(createdAt)
                    )}
                </span>

            </div>

            <div style="
                display:flex;
                gap:8px;
                margin-top:14px;
                flex-wrap:wrap;
            ">

                <button
                    class="btn btn-primary btn-sm"
                    data-action="view-incident"
                    data-id="${escapeHTML(
                        incident.id
                    )}"
                >
                    View Details
                </button>

                ${
                    isActiveIncident(
                        incident
                    )
                        ? `
                        <button
                            class="btn btn-outline btn-sm"
                            data-action="track-incident"
                            data-id="${escapeHTML(
                                incident.id
                            )}"
                        >
                            Track
                        </button>
                        `
                        : ""
                }

            </div>

        </div>
    `;
}

// =========================================================
// UPDATE ACTIVE INCIDENT
// =========================================================

function updateActiveIncident() {

    const container =
        $("#activeIncident");

    if (!container) {
        return;
    }

    const active =
        incidents.find(
            incident =>
                isActiveIncident(
                    incident
                )
        );

    if (!active) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ✅
                </div>

                <h3>No active emergency</h3>

                <p>
                    You currently have no
                    active incidents.
                </p>
            </div>
        `;

        return;
    }

    const type =
        active.type ||
        active.category ||
        "Emergency";

    const status =
        active.status ||
        "Pending";

    const severity =
        active.severity ||
        "Unknown";

    container.innerHTML = `

        <div class="incident-card">

            <div class="incident-card-header">

                <div>

                    <div class="incident-type">
                        ${escapeHTML(type)}
                    </div>

                    <div class="incident-id">
                        ID:
                        ${escapeHTML(
                            active.id
                        )}
                    </div>

                </div>

                <span class="badge ${getStatusClass(status)}">
                    ${escapeHTML(status)}
                </span>

            </div>

            <div class="incident-meta">

                <span>
                    Severity:
                    <strong>
                        ${escapeHTML(severity)}
                    </strong>
                </span>

                <span>
                    Reported:
                    <strong>
                        ${escapeHTML(
                            formatDateTime(
                                active.createdAt
                            )
                        )}
                    </strong>
                </span>

            </div>

            <div style="
                display:flex;
                gap:10px;
                margin-top:15px;
                flex-wrap:wrap;
            ">

                <button
                    class="btn btn-primary"
                    data-action="track-incident"
                    data-id="${escapeHTML(
                        active.id
                    )}"
                >
                    Track Emergency
                </button>

                <button
                    class="btn btn-secondary"
                    data-action="view-incident"
                    data-id="${escapeHTML(
                        active.id
                    )}"
                >
                    View Details
                </button>

            </div>

        </div>
    `;
}

// =========================================================
// ACTION HANDLER
// =========================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const incidentId =
            button.dataset.id;

        if (!incidentId) {
            return;
        }

        if (
            action ===
            "view-incident"
        ) {

            window.location.href =
                `./incidents.html?id=${encodeURIComponent(
                    incidentId
                )}`;

            return;
        }

        if (
            action ===
            "track-incident"
        ) {

            window.location.href =
                `./tracking.html?id=${encodeURIComponent(
                    incidentId
                )}`;

            return;
        }
    }
);

// =========================================================
// LOGOUT
// =========================================================

function setupLogout() {

    const buttons =
        document.querySelectorAll(
            "[data-action='logout']"
        );

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const confirmed =
                        window.confirm(
                            "Are you sure you want to logout?"
                        );

                    if (!confirmed) {
                        return;
                    }

                    const result =
                        await logoutUser();

                    if (!result.success) {

                        showToast(
                            result.error ||
                                "Logout failed.",
                            "error"
                        );

                        return;
                    }

                    window.location.href =
                        "../index.html";
                }
            );
        }
    );
}

// =========================================================
// NAVIGATION
// =========================================================

function setupNavigation() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop();

    document
        .querySelectorAll(
            ".sidebar-link, .nav-link"
        )
        .forEach(
            link => {

                const href =
                    link.getAttribute(
                        "href"
                    );

                if (!href) {
                    return;
                }

                if (
                    href.includes(
                        currentPage
                    )
                ) {

                    link.classList.add(
                        "active"
                    );
                }
            }
        );
}

// =========================================================
// REFRESH BUTTON
// =========================================================

function setupRefreshButton() {

    const button =
        $(
            "#refreshDashboard"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            showToast(
                "Dashboard refreshed.",
                "success"
            );

            // Firebase onValue()
            // already keeps data live.
            // Reload is not necessary.
        }
    );
}

// =========================================================
// CLEANUP
// =========================================================

window.addEventListener(
    "beforeunload",
    () => {

        // onValue listeners are
        // automatically handled
        // when the page is unloaded.

        incidentsListener = null;
        userListener = null;
    }
);