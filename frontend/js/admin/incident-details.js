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
let responders = [];


document.addEventListener("DOMContentLoaded", async () => {

    try {

        currentUser = await requireRole(
            "admin",
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

            return;
        }


        setupListeners();
        listenIncident();
        loadResponders();

    } catch (error) {

        console.error(error);

        showToast(
            "Incident details load nahi ho paaye.",
            "error"
        );
    }
});


function setupListeners() {

    $("#backBtn")?.addEventListener(
        "click",
        () => {
            window.location.href =
                "incidents.html";
        }
    );


    $("#updateStatusBtn")?.addEventListener(
        "click",
        updateStatus
    );


    $("#assignBtn")?.addEventListener(
        "click",
        assignResponder
    );


    $("#openMapBtn")?.addEventListener(
        "click",
        openMap
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


function listenIncident() {

    onValue(
        ref(
            db,
            `incidents/${incidentId}`
        ),
        snapshot => {

            if (!snapshot.exists()) {

                showToast(
                    "Incident not found.",
                    "error"
                );

                return;
            }


            incident = {
                id: snapshot.key,
                ...snapshot.val()
            };


            renderIncident();
            renderTimeline();
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
        "No description."
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
        "Pending"
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
        "#responderName",
        incident.responderName ||
        "Unassigned"
    );


    setText(
        "#landmark",
        incident.landmark ||
        "Not provided"
    );


    setText(
        "#latitude",
        incident.latitude ??
        "N/A"
    );


    setText(
        "#longitude",
        incident.longitude ??
        "N/A"
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


    const status =
        $("#incidentStatus");

    if (status) {

        status.className =
            `status-badge ${
                getStatusClass(
                    incident.status
                )
            }`;
    }


    const priority =
        $("#incidentPriority");

    if (priority) {

        priority.className =
            `badge ${
                getPriorityClass(
                    incident.priority
                )
            }`;
    }


    populateResponderSelect();
}


async function loadResponders() {

    onValue(
        ref(db, "users"),
        snapshot => {

            responders = [];

            snapshot.forEach(child => {

                const user = {
                    id: child.key,
                    ...child.val()
                };


                if (
                    user.role === "responder"
                ) {

                    responders.push(user);
                }
            });


            populateResponderSelect();
        }
    );
}


function populateResponderSelect() {

    const select =
        $("#responderSelect");


    if (!select) return;


    select.innerHTML = `
        <option value="">
            Select Responder
        </option>
    `;


    responders.forEach(responder => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            responder.id;


        option.textContent =
            `${responder.name || "Responder"}${
                responder.available
                    ? " — Available"
                    : " — Offline"
            }`;


        if (
            incident?.responderId ===
            responder.id
        ) {

            option.selected = true;
        }


        select.appendChild(option);
    });
}


async function assignResponder() {

    const select =
        $("#responderSelect");


    const responderId =
        select?.value;


    if (!responderId) {

        showToast(
            "Pehle responder select karo.",
            "error"
        );

        return;
    }


    const responder =
        responders.find(
            r => r.id === responderId
        );


    if (!responder) {

        showToast(
            "Responder nahi mila.",
            "error"
        );

        return;
    }


    try {

        await update(
            ref(
                db,
                `incidents/${incidentId}`
            ),
            {
                responderId:
                    responder.id,

                responderName:
                    responder.name ||
                    "Responder",

                status:
                    "Assigned",

                assignedAt:
                    Date.now(),

                updatedAt:
                    Date.now()
            }
        );


        showToast(
            "Responder successfully assigned.",
            "success"
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Responder assign nahi ho saka.",
            "error"
        );
    }
}


async function updateStatus() {

    const select =
        $("#statusSelect");


    const newStatus =
        select?.value;


    if (!newStatus) {

        showToast(
            "Status select karo.",
            "error"
        );

        return;
    }


    try {

        const updates = {
            status: newStatus,
            updatedAt: Date.now()
        };


        if (newStatus === "Resolved") {
            updates.resolvedAt =
                Date.now();
        }


        await update(
            ref(
                db,
                `incidents/${incidentId}`
            ),
            updates
        );


        showToast(
            "Incident status updated.",
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


    const events = [
        ["Reported", incident.createdAt],
        ["Assigned", incident.assignedAt],
        ["Accepted", incident.acceptedAt],
        ["En Route", incident.enRouteAt],
        ["Arrived", incident.arrivedAt],
        ["Resolved", incident.resolvedAt]
    ];


    container.innerHTML =
        events
            .map(
                ([name, time]) => `
                    <div class="timeline-item ${
                        time ? "active" : ""
                    }">

                        <div class="timeline-dot"></div>

                        <div class="timeline-content">

                            <strong>
                                ${name}
                            </strong>

                            <span>
                                ${
                                    time
                                        ? formatDateTime(time)
                                        : "Pending"
                                }
                            </span>

                        </div>

                    </div>
                `
            )
            .join("");
}


function openMap() {

    const lat =
        Number(incident?.latitude);


    const lng =
        Number(incident?.longitude);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {

        showToast(
            "Incident location unavailable.",
            "error"
        );

        return;
    }


    window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        "_blank",
        "noopener,noreferrer"
    );
}