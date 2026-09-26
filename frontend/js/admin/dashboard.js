import { db } from "../firebase.js";
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
    onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let incidents = [];
let responders = [];
let users = [];


document.addEventListener("DOMContentLoaded", async () => {

    try {

        currentUser = await requireRole(
            "admin",
            "../index.html"
        );

        if (!currentUser) return;

        setupListeners();
        startRealtimeListeners();

    } catch (error) {

        console.error(error);

        showToast(
            "Admin dashboard load nahi ho saka.",
            "error"
        );
    }
});


function setupListeners() {

    $$("[data-action='logout'], #logoutBtn")
        .forEach(button => {

            button.addEventListener("click", async () => {

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
            });
        });


    $("#refreshBtn")?.addEventListener(
        "click",
        () => {
            window.location.reload();
        }
    );


    $("#viewAllIncidentsBtn")?.addEventListener(
        "click",
        () => {
            window.location.href =
                "incidents.html";
        }
    );


    $("#viewRespondersBtn")?.addEventListener(
        "click",
        () => {
            window.location.href =
                "responders.html";
        }
    );
}


function startRealtimeListeners() {

    onValue(
        ref(db, "incidents"),
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

            updateIncidentStats();
            renderLiveIncidents();
            renderRecentIncidents();
        }
    );


    onValue(
        ref(db, "users"),
        snapshot => {

            users = [];
            responders = [];

            snapshot.forEach(child => {

                const user = {
                    id: child.key,
                    ...child.val()
                };

                users.push(user);

                if (user.role === "responder") {
                    responders.push(user);
                }
            });

            updateUserStats();
            renderResponderSummary();
        }
    );
}


function updateIncidentStats() {

    const total = incidents.length;

    const pending = incidents.filter(
        i => i.status === "Pending"
    ).length;

    const active = incidents.filter(
        i =>
            ![
                "Resolved",
                "Cancelled",
                "Rejected"
            ].includes(i.status)
    ).length;

    const critical = incidents.filter(
        i =>
            String(i.severity).toLowerCase() ===
            "critical"
    ).length;

    const resolved = incidents.filter(
        i => i.status === "Resolved"
    ).length;


    setText("#totalIncidents", total);
    setText("#pendingIncidents", pending);
    setText("#activeIncidents", active);
    setText("#criticalIncidents", critical);
    setText("#resolvedIncidents", resolved);
}


function updateUserStats() {

    const totalUsers =
        users.filter(
            u => u.role === "citizen"
        ).length;

    const totalResponders =
        responders.length;

    const availableResponders =
        responders.filter(
            r => r.available === true
        ).length;


    setText(
        "#totalUsers",
        totalUsers
    );

    setText(
        "#totalResponders",
        totalResponders
    );

    setText(
        "#availableResponders",
        availableResponders
    );
}


function renderLiveIncidents() {

    const container =
        $("#liveIncidentFeed") ||
        $("#liveIncidents");


    if (!container) return;


    const active = incidents
        .filter(
            incident =>
                ![
                    "Resolved",
                    "Cancelled",
                    "Rejected"
                ].includes(incident.status)
        )
        .slice(0, 8);


    if (!active.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No Active Incidents</h3>
                <p>Currently no emergency is active.</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        active.map(createIncidentRow).join("");


    attachIncidentActions(container);
}


function renderRecentIncidents() {

    const container =
        $("#recentIncidents");


    if (!container) return;


    const recent =
        incidents.slice(0, 10);


    container.innerHTML =
        recent.length
            ? recent
                .map(createIncidentRow)
                .join("")
            : `
                <div class="empty-state">
                    No incidents found.
                </div>
            `;


    attachIncidentActions(container);
}


function createIncidentRow(incident) {

    return `
        <div class="admin-incident-row">

            <div class="incident-main">

                <strong>
                    ${escapeText(
                        incident.incidentId ||
                        incident.id
                    )}
                </strong>

                <span>
                    ${escapeText(
                        incident.type ||
                        incident.category ||
                        "Emergency"
                    )}
                </span>

            </div>


            <div>
                <span class="badge ${
                    getPriorityClass(
                        incident.priority
                    )
                }">
                    ${escapeText(
                        incident.priority ||
                        "Normal"
                    )}
                </span>
            </div>


            <div>
                <span class="status-badge ${
                    getStatusClass(
                        incident.status
                    )
                }">
                    ${escapeText(
                        incident.status ||
                        "Pending"
                    )}
                </span>
            </div>


            <div class="incident-time">
                ${timeAgo(
                    incident.createdAt
                )}
            </div>


            <button
                class="btn btn-small btn-primary view-incident"
                data-id="${incident.id}">
                View
            </button>

        </div>
    `;
}


function renderResponderSummary() {

    const container =
        $("#responderSummary");


    if (!container) return;


    const available =
        responders.filter(
            r => r.available === true
        );


    container.innerHTML =
        available.length
            ? available
                .slice(0, 6)
                .map(responder => `
                    <div class="responder-summary-item">

                        <div class="avatar">
                            ${getInitials(
                                responder.name ||
                                "R"
                            )}
                        </div>

                        <div>
                            <strong>
                                ${escapeText(
                                    responder.name ||
                                    "Responder"
                                )}
                            </strong>

                            <span>
                                ${
                                    escapeText(
                                        responder.department ||
                                        "Emergency Team"
                                    )
                                }
                            </span>
                        </div>

                        <span class="availability-indicator available">
                            Available
                        </span>

                    </div>
                `)
                .join("")
            : `
                <div class="empty-state">
                    No responders currently available.
                </div>
            `;
}


function attachIncidentActions(container) {

    container
        .querySelectorAll(".view-incident")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `incident-details.html?id=${
                            encodeURIComponent(
                                button.dataset.id
                            )
                        }`;
                }
            );
        });
}


function getInitials(name) {

    return String(name)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            word =>
                word.charAt(0).toUpperCase()
        )
        .join("");
}


function escapeText(value) {

    if (
        value === null ||
        value === undefined
    ) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}