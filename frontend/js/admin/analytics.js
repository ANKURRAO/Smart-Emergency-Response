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
            "Analytics load nahi hui.",
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


    $("#analyticsPeriod")?.addEventListener(
        "change",
        renderAnalytics
    );


    $("#refreshAnalyticsBtn")
        ?.addEventListener(
            "click",
            renderAnalytics
        );
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


            renderAnalytics();
        }
    );
}


function renderAnalytics() {

    const period =
        Number(
            $("#analyticsPeriod")?.value ||
            30
        );


    const now =
        Date.now();


    const start =
        now -
        period *
        24 *
        60 *
        60 *
        1000;


    const filtered =
        incidents.filter(
            incident =>
                (incident.createdAt || 0) >=
                start
        );


    renderOverview(filtered);
    renderStatusAnalytics(filtered);
    renderSeverityAnalytics(filtered);
    renderCategoryAnalytics(filtered);
    renderDailyAnalytics(filtered);
}


function renderOverview(data) {

    const total =
        data.length;


    const resolved =
        data.filter(
            i => i.status === "Resolved"
        ).length;


    const active =
        data.filter(
            i =>
                ![
                    "Resolved",
                    "Cancelled",
                    "Rejected"
                ].includes(i.status)
        ).length;


    const critical =
        data.filter(
            i =>
                String(i.severity)
                    .toLowerCase() ===
                "critical"
        ).length;


    setText(
        "#analyticsTotal",
        total
    );


    setText(
        "#analyticsResolved",
        resolved
    );


    setText(
        "#analyticsActive",
        active
    );


    setText(
        "#analyticsCritical",
        critical
    );
}


function renderStatusAnalytics(data) {

    const container =
        $("#statusAnalytics");


    if (!container) return;


    const statuses = {};


    data.forEach(incident => {

        const status =
            incident.status ||
            "Pending";


        statuses[status] =
            (statuses[status] || 0) + 1;
    });


    const max =
        Math.max(
            ...Object.values(statuses),
            1
        );


    container.innerHTML =
        Object.entries(statuses)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .map(
                ([status, count]) => {

                    const percentage =
                        (
                            count /
                            max
                        ) *
                        100;


                    return `
                        <div class="analytics-row">

                            <div class="analytics-label">
                                ${escapeText(
                                    status
                                )}
                            </div>

                            <div class="analytics-bar">
                                <span
                                    style="width:${percentage}%">
                                </span>
                            </div>

                            <strong>
                                ${count}
                            </strong>

                        </div>
                    `;
                }
            )
            .join("");
}


function renderSeverityAnalytics(data) {

    const container =
        $("#severityAnalytics");


    if (!container) return;


    const severity = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
    };


    data.forEach(incident => {

        const value =
            String(
                incident.severity ||
                "Medium"
            );


        const key =
            Object.keys(severity)
                .find(
                    k =>
                        k.toLowerCase() ===
                        value.toLowerCase()
                );


        if (key) {
            severity[key]++;
        }
    });


    container.innerHTML =
        Object.entries(severity)
            .map(
                ([name, count]) => `
                    <div class="analytics-row">

                        <div class="analytics-label">
                            ${name}
                        </div>

                        <div class="analytics-bar">
                            <span
                                style="width:${
                                    data.length
                                        ? (count / data.length) * 100
                                        : 0
                                }%">
                            </span>
                        </div>

                        <strong>
                            ${count}
                        </strong>

                    </div>
                `
            )
            .join("");
}


function renderCategoryAnalytics(data) {

    const container =
        $("#categoryAnalytics");


    if (!container) return;


    const categories = {};


    data.forEach(incident => {

        const category =
            incident.category ||
            incident.type ||
            "Other";


        categories[category] =
            (categories[category] || 0) + 1;
    });


    const sorted =
        Object.entries(categories)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .slice(0, 10);


    container.innerHTML =
        sorted.length
            ? sorted
                .map(
                    ([category, count]) => `
                        <div class="analytics-row">

                            <div class="analytics-label">
                                ${escapeText(
                                    category
                                )}
                            </div>

                            <div class="analytics-bar">
                                <span
                                    style="width:${
                                        data.length
                                            ? (count / data.length) * 100
                                            : 0
                                    }%">
                                </span>
                            </div>

                            <strong>
                                ${count}
                            </strong>

                        </div>
                    `
                )
                .join("")
            : `
                <div class="empty-state">
                    No category data available.
                </div>
            `;
}


function renderDailyAnalytics(data) {

    const container =
        $("#dailyAnalytics");


    if (!container) return;


    const daily = {};


    data.forEach(incident => {

        if (!incident.createdAt) return;


        const date =
            new Date(
                incident.createdAt
            )
                .toISOString()
                .split("T")[0];


        daily[date] =
            (daily[date] || 0) + 1;
    });


    const entries =
        Object.entries(daily)
            .sort(
                (a, b) =>
                    a[0].localeCompare(
                        b[0]
                    )
            );


    const max =
        Math.max(
            ...entries.map(
                item => item[1]
            ),
            1
        );


    container.innerHTML =
        entries.length
            ? entries
                .map(
                    ([date, count]) => `
                        <div class="analytics-row">

                            <div class="analytics-label">
                                ${formatDate(date)}
                            </div>

                            <div class="analytics-bar">
                                <span
                                    style="width:${
                                        (count / max) *
                                        100
                                    }%">
                                </span>
                            </div>

                            <strong>
                                ${count}
                            </strong>

                        </div>
                    `
                )
                .join("")
            : `
                <div class="empty-state">
                    No daily data available.
                </div>
            `;
}


function formatDate(date) {

    try {

        return new Date(
            `${date}T00:00:00`
        ).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short"
            }
        );

    } catch {

        return date;
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