import { db } from "../firebase.js";
import {
    requireRole,
    logoutUser
} from "../auth.js";

import {
    $,
    $$,
    setText,
    showToast,
    getStatusClass,
    getPriorityClass,
    timeAgo
} from "../common.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let incidents = [];
let filtered = [];


document.addEventListener("DOMContentLoaded", async () => {

    try {

        const user = await requireRole(
            "admin",
            "../index.html"
        );

        if (!user) return;

        setupListeners();
        listenIncidents();

    } catch (error) {

        console.error(error);

        showToast(
            "Incidents page load nahi ho saka.",
            "error"
        );
    }
});


function setupListeners() {

    $("#searchInput")?.addEventListener(
        "input",
        applyFilters
    );

    $("#statusFilter")?.addEventListener(
        "change",
        applyFilters
    );

    $("#severityFilter")?.addEventListener(
        "change",
        applyFilters
    );

    $("#priorityFilter")?.addEventListener(
        "change",
        applyFilters
    );


    $$("[data-action='logout'], #logoutBtn")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    await logoutUser();

                    window.location.href =
                        "../index.html";
                }
            );
        });
}


function listenIncidents() {

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
                    (b.createdAt || 0) -
                    (a.createdAt || 0)
            );


            filtered = [...incidents];

            updateStats();
            renderTable();
        },
        error => {

            console.error(error);

            showToast(
                "Incidents read nahi ho paayi.",
                "error"
            );
        }
    );
}


function applyFilters() {

    const search =
        $("#searchInput")
            ?.value
            ?.trim()
            .toLowerCase() || "";


    const status =
        $("#statusFilter")?.value || "";


    const severity =
        $("#severityFilter")?.value || "";


    const priority =
        $("#priorityFilter")?.value || "";


    filtered = incidents.filter(
        incident => {

            const text = [
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


            return (
                (!search ||
                    text.includes(search)) &&

                (!status ||
                    incident.status === status) &&

                (!severity ||
                    incident.severity === severity) &&

                (!priority ||
                    incident.priority === priority)
            );
        }
    );


    renderTable();
}


function updateStats() {

    setText(
        "#totalIncidents",
        incidents.length
    );

    setText(
        "#pendingIncidents",
        incidents.filter(
            i => i.status === "Pending"
        ).length
    );

    setText(
        "#activeIncidents",
        incidents.filter(
            i =>
                ![
                    "Resolved",
                    "Cancelled",
                    "Rejected"
                ].includes(i.status)
        ).length
    );

    setText(
        "#resolvedIncidents",
        incidents.filter(
            i => i.status === "Resolved"
        ).length
    );
}


function renderTable() {

    const tbody =
        $("#incidentsTableBody") ||
        $("#incidentsTable tbody");


    if (!tbody) return;


    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        No incidents found.
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        filtered
            .map(createRow)
            .join("");


    tbody
        .querySelectorAll(".view-btn")
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


function createRow(incident) {

    return `
        <tr>

            <td>
                <strong>
                    ${escapeText(
                        incident.incidentId ||
                        incident.id
                    )}
                </strong>
            </td>

            <td>
                ${escapeText(
                    incident.userName ||
                    "Unknown"
                )}
            </td>

            <td>
                ${escapeText(
                    incident.type ||
                    incident.category ||
                    "Emergency"
                )}
            </td>

            <td>
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
            </td>

            <td>
                ${escapeText(
                    incident.severity ||
                    "Medium"
                )}
            </td>

            <td>
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
            </td>

            <td>
                ${escapeText(
                    incident.responderName ||
                    "Unassigned"
                )}
            </td>

            <td>
                ${timeAgo(
                    incident.createdAt
                )}
            </td>

            <td>
                <button
                    class="btn btn-small btn-primary view-btn"
                    data-id="${incident.id}">
                    View
                </button>
            </td>

        </tr>
    `;
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