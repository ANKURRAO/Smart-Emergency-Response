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


let users = [];
let filtered = [];


document.addEventListener("DOMContentLoaded", async () => {

    try {

        const user = await requireRole(
            "admin",
            "../index.html"
        );

        if (!user) return;

        setupListeners();
        listenUsers();

    } catch (error) {

        console.error(error);

        showToast(
            "Users page load nahi hui.",
            "error"
        );
    }
});


function setupListeners() {

    $("#searchInput")?.addEventListener(
        "input",
        applyFilters
    );


    $("#roleFilter")?.addEventListener(
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


function listenUsers() {

    onValue(
        ref(db, "users"),
        snapshot => {

            users = [];

            snapshot.forEach(child => {

                users.push({
                    id: child.key,
                    ...child.val()
                });
            });


            filtered = [...users];

            updateStats();
            renderUsers();
        }
    );
}


function applyFilters() {

    const search =
        $("#searchInput")
            ?.value
            ?.trim()
            .toLowerCase() || "";


    const role =
        $("#roleFilter")?.value || "";


    filtered =
        users.filter(user => {

            const text = [
                user.name,
                user.email,
                user.phone,
                user.department
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            return (
                (!search ||
                    text.includes(search)) &&
                (!role ||
                    user.role === role)
            );
        });


    renderUsers();
}


function updateStats() {

    setText(
        "#totalUsers",
        users.length
    );


    setText(
        "#citizenUsers",
        users.filter(
            u => u.role === "citizen"
        ).length
    );


    setText(
        "#responderUsers",
        users.filter(
            u => u.role === "responder"
        ).length
    );


    setText(
        "#adminUsers",
        users.filter(
            u => u.role === "admin"
        ).length
    );
}


function renderUsers() {

    const tbody =
        $("#usersTableBody") ||
        $("#usersTable tbody");


    if (!tbody) return;


    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        No users found.
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
}


function createRow(user) {

    return `
        <tr>

            <td>
                <div class="user-cell">

                    <div class="avatar">
                        ${getInitials(
                            user.name ||
                            "U"
                        )}
                    </div>

                    <div>
                        <strong>
                            ${escapeText(
                                user.name ||
                                "Unknown"
                            )}
                        </strong>

                        <span>
                            ${escapeText(
                                user.email ||
                                ""
                            )}
                        </span>
                    </div>

                </div>
            </td>


            <td>
                <span class="badge">
                    ${escapeText(
                        user.role ||
                        "citizen"
                    )}
                </span>
            </td>


            <td>
                ${escapeText(
                    user.phone ||
                    "N/A"
                )}
            </td>


            <td>
                ${escapeText(
                    user.department ||
                    "N/A"
                )}
            </td>


            <td>
                ${
                    user.role === "responder"
                        ? (
                            user.available
                                ? "Available"
                                : "Offline"
                        )
                        : "—"
                }
            </td>


            <td>
                ${formatDate(
                    user.createdAt
                )}
            </td>


            <td>
                <span class="user-id">
                    ${escapeText(
                        user.id
                    )}
                </span>
            </td>

        </tr>
    `;
}


function formatDate(timestamp) {

    if (!timestamp) return "N/A";

    try {

        return new Date(
            timestamp
        ).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch {

        return "N/A";
    }
}


function getInitials(name) {

    return String(name)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            word =>
                word.charAt(0)
                    .toUpperCase()
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