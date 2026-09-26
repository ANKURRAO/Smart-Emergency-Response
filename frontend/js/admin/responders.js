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
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let responders = [];
let filtered = [];


document.addEventListener("DOMContentLoaded", async () => {

    try {

        const user = await requireRole(
            "admin",
            "../index.html"
        );

        if (!user) return;

        setupListeners();
        listenResponders();

    } catch (error) {

        console.error(error);

        showToast(
            "Responders page load nahi hui.",
            "error"
        );
    }
});


function setupListeners() {

    $("#searchInput")?.addEventListener(
        "input",
        applyFilters
    );

    $("#availabilityFilter")?.addEventListener(
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


function listenResponders() {

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


            filtered = [...responders];

            updateStats();
            renderResponders();
        }
    );
}


function applyFilters() {

    const search =
        $("#searchInput")
            ?.value
            ?.trim()
            .toLowerCase() || "";


    const availability =
        $("#availabilityFilter")
            ?.value || "";


    filtered =
        responders.filter(
            responder => {

                const text = [
                    responder.name,
                    responder.email,
                    responder.phone,
                    responder.department,
                    responder.vehicle
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                let matchesAvailability =
                    true;


                if (
                    availability ===
                    "available"
                ) {

                    matchesAvailability =
                        responder.available ===
                        true;
                }


                if (
                    availability ===
                    "offline"
                ) {

                    matchesAvailability =
                        responder.available !==
                        true;
                }


                return (
                    (!search ||
                        text.includes(search)) &&
                    matchesAvailability
                );
            }
        );


    renderResponders();
}


function updateStats() {

    setText(
        "#totalResponders",
        responders.length
    );


    setText(
        "#availableResponders",
        responders.filter(
            r => r.available === true
        ).length
    );


    setText(
        "#offlineResponders",
        responders.filter(
            r => r.available !== true
        ).length
    );
}


function renderResponders() {

    const container =
        $("#respondersContainer") ||
        $("#respondersList") ||
        $("#respondersTableBody");


    if (!container) return;


    if (!filtered.length) {

        container.innerHTML = `
            <div class="empty-state">
                No responders found.
            </div>
        `;

        return;
    }


    const isTable =
        container.tagName === "TBODY";


    if (isTable) {

        container.innerHTML =
            filtered
                .map(createTableRow)
                .join("");

    } else {

        container.innerHTML =
            filtered
                .map(createCard)
                .join("");
    }


    attachActions(container);
}


function createCard(responder) {

    return `
        <div class="responder-card">

            <div class="responder-card-header">

                <div class="avatar">
                    ${getInitials(
                        responder.name ||
                        "R"
                    )}
                </div>

                <div>
                    <h3>
                        ${escapeText(
                            responder.name ||
                            "Responder"
                        )}
                    </h3>

                    <p>
                        ${escapeText(
                            responder.department ||
                            "Emergency Response"
                        )}
                    </p>
                </div>

            </div>


            <div class="responder-details">

                <p>
                    <strong>Email:</strong>
                    ${escapeText(
                        responder.email ||
                        "N/A"
                    )}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${escapeText(
                        responder.phone ||
                        "N/A"
                    )}
                </p>

                <p>
                    <strong>Vehicle:</strong>
                    ${escapeText(
                        responder.vehicle ||
                        "N/A"
                    )}
                </p>

            </div>


            <div class="responder-card-footer">

                <span class="availability-indicator ${
                    responder.available
                        ? "available"
                        : "offline"
                }">
                    ${
                        responder.available
                            ? "Available"
                            : "Offline"
                    }
                </span>


                <button
                    class="btn btn-small toggle-availability"
                    data-id="${responder.id}"
                    data-value="${
                        responder.available
                            ? "false"
                            : "true"
                    }">

                    ${
                        responder.available
                            ? "Set Offline"
                            : "Set Available"
                    }

                </button>

            </div>

        </div>
    `;
}


function createTableRow(responder) {

    return `
        <tr>

            <td>
                <strong>
                    ${escapeText(
                        responder.name ||
                        "Responder"
                    )}
                </strong>
            </td>

            <td>
                ${escapeText(
                    responder.email ||
                    "N/A"
                )}
            </td>

            <td>
                ${escapeText(
                    responder.department ||
                    "N/A"
                )}
            </td>

            <td>
                ${escapeText(
                    responder.vehicle ||
                    "N/A"
                )}
            </td>

            <td>
                <span class="availability-indicator ${
                    responder.available
                        ? "available"
                        : "offline"
                }">
                    ${
                        responder.available
                            ? "Available"
                            : "Offline"
                    }
                </span>
            </td>

            <td>

                <button
                    class="btn btn-small toggle-availability"
                    data-id="${responder.id}"
                    data-value="${
                        responder.available
                            ? "false"
                            : "true"
                    }">

                    Toggle

                </button>

            </td>

        </tr>
    `;
}


function attachActions(container) {

    container
        .querySelectorAll(
            ".toggle-availability"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.id;


                    const available =
                        button.dataset.value ===
                        "true";


                    try {

                        await update(
                            ref(
                                db,
                                `users/${id}`
                            ),
                            {
                                available,
                                updatedAt:
                                    Date.now()
                            }
                        );


                        showToast(
                            "Responder availability updated.",
                            "success"
                        );

                    } catch (error) {

                        console.error(error);

                        showToast(
                            "Update failed.",
                            "error"
                        );
                    }
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
                word[0].toUpperCase()
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