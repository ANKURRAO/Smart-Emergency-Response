import { db } from "../firebase.js";

import {
    requireRole,
    logoutUser
} from "../auth.js";

import {
    $,
    $$,
    setText,
    showToast
} from "../common.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let incidents = [];
let responders = [];


document.addEventListener("DOMContentLoaded", async () => {

    try {

        const user = await requireRole(
            "admin",
            "../index.html"
        );

        if (!user) return;

        setupListeners();
        listenData();

    } catch (error) {

        console.error(error);

        showToast(
            "Admin map load nahi hua.",
            "error"
        );
    }
});


function setupListeners() {

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


    $("#incidentFilter")?.addEventListener(
        "change",
        renderLocations
    );


    $("#responderFilter")?.addEventListener(
        "change",
        renderLocations
    );


    $("#refreshMapBtn")?.addEventListener(
        "click",
        renderLocations
    );
}


function listenData() {

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

            populateIncidentFilter();
            renderLocations();
        }
    );


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
                    user.role ===
                    "responder"
                ) {

                    responders.push(user);
                }
            });

            populateResponderFilter();
            renderLocations();
        }
    );
}


function populateIncidentFilter() {

    const select =
        $("#incidentFilter");


    if (!select) return;


    const current =
        select.value;


    select.innerHTML = `
        <option value="">
            All Incidents
        </option>
    `;


    incidents.forEach(incident => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            incident.id;


        option.textContent =
            incident.incidentId ||
            incident.id;


        select.appendChild(option);
    });


    select.value =
        current;
}


function populateResponderFilter() {

    const select =
        $("#responderFilter");


    if (!select) return;


    const current =
        select.value;


    select.innerHTML = `
        <option value="">
            All Responders
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
            responder.name ||
            "Responder";


        select.appendChild(option);
    });


    select.value =
        current;
}


function renderLocations() {

    renderIncidentList();
    renderResponderList();
    updateMapFrame();
}


function renderIncidentList() {

    const container =
        $("#incidentLocations");


    if (!container) return;


    const selected =
        $("#incidentFilter")?.value ||
        "";


    const list =
        incidents.filter(
            incident =>
                !selected ||
                incident.id === selected
        );


    if (!list.length) {

        container.innerHTML = `
            <div class="empty-state">
                No incident locations found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        list.map(incident => {

            const lat =
                Number(incident.latitude);

            const lng =
                Number(incident.longitude);


            return `
                <div class="location-card">

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

                    <small>
                        ${
                            Number.isFinite(lat) &&
                            Number.isFinite(lng)
                                ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                                : "Location unavailable"
                        }
                    </small>

                    ${
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                            ? `
                                <button
                                    class="btn btn-small open-location"
                                    data-lat="${lat}"
                                    data-lng="${lng}">
                                    Open Map
                                </button>
                            `
                            : ""
                    }

                </div>
            `;

        }).join("");


    container
        .querySelectorAll(
            ".open-location"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const lat =
                        button.dataset.lat;

                    const lng =
                        button.dataset.lng;


                    window.open(
                        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                        "_blank",
                        "noopener,noreferrer"
                    );
                }
            );
        });
}


function renderResponderList() {

    const container =
        $("#responderLocations");


    if (!container) return;


    const selected =
        $("#responderFilter")?.value ||
        "";


    const list =
        responders.filter(
            responder =>
                !selected ||
                responder.id === selected
        );


    container.innerHTML =
        list.length
            ? list.map(responder => {

                const lat =
                    Number(
                        responder.latitude
                    );

                const lng =
                    Number(
                        responder.longitude
                    );


                return `
                    <div class="location-card">

                        <strong>
                            ${escapeText(
                                responder.name ||
                                "Responder"
                            )}
                        </strong>

                        <span>
                            ${
                                responder.available
                                    ? "Available"
                                    : "Offline"
                            }
                        </span>

                        <small>
                            ${
                                Number.isFinite(lat) &&
                                Number.isFinite(lng)
                                    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                                    : "Location unavailable"
                            }
                        </small>

                        ${
                            Number.isFinite(lat) &&
                            Number.isFinite(lng)
                                ? `
                                    <button
                                        class="btn btn-small open-location"
                                        data-lat="${lat}"
                                        data-lng="${lng}">
                                        Open Map
                                    </button>
                                `
                                : ""
                        }

                    </div>
                `;

            }).join("")
            : `
                <div class="empty-state">
                    No responder locations found.
                </div>
            `;


    container
        .querySelectorAll(
            ".open-location"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    window.open(
                        `https://www.google.com/maps/search/?api=1&query=${button.dataset.lat},${button.dataset.lng}`,
                        "_blank",
                        "noopener,noreferrer"
                    );
                }
            );
        });
}


function updateMapFrame() {

    const frame =
        $("#mapFrame");


    if (!frame) return;


    const selected =
        $("#incidentFilter")?.value ||
        "";


    if (selected) {

        const incident =
            incidents.find(
                i => i.id === selected
            );


        if (
            incident &&
            incident.latitude !== undefined &&
            incident.longitude !== undefined
        ) {

            frame.src =
                `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}&z=13&output=embed`;

            return;
        }
    }


    const firstIncident =
        incidents.find(
            i =>
                i.latitude !== undefined &&
                i.longitude !== undefined
        );


    if (firstIncident) {

        frame.src =
            `https://www.google.com/maps?q=${firstIncident.latitude},${firstIncident.longitude}&z=11&output=embed`;
    }
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