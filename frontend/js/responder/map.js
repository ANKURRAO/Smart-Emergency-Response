import { auth, db } from "../firebase.js";

import {
    requireRole,
    logoutUser
} from "../auth.js";

import {
    $,
    $$,
    setText,
    showToast,
    getGoogleMapsUrl
} from "../common.js";

import {
    ref,
    get,
    update,
    onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let currentIncident = null;
let watchId = null;


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
            loadIncident();
            startLocationTracking();

        } catch (error) {

            console.error(error);

            showToast(
                "Map module load nahi ho saka.",
                "error"
            );
        }
    }
);


function setupListeners() {

    $$("[data-action='logout'], #logoutBtn")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    try {

                        stopLocationTracking();

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


    const navigationBtn =
        $("#navigateBtn") ||
        $("#openNavigationBtn");


    if (navigationBtn) {

        navigationBtn.addEventListener(
            "click",
            navigateToIncident
        );
    }


    const refreshBtn =
        $("#refreshLocationBtn");


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            getCurrentLocationOnce
        );
    }
}


async function loadIncident() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const incidentId =
        params.get("id");


    if (!incidentId) {

        await loadLatestActiveIncident();

        return;
    }


    const snapshot =
        await get(
            ref(
                db,
                `incidents/${incidentId}`
            )
        );


    if (!snapshot.exists()) {

        showToast(
            "Incident nahi mila.",
            "error"
        );

        return;
    }


    const incident = {
        id: snapshot.key,
        ...snapshot.val()
    };


    if (
        incident.responderId &&
        incident.responderId !==
            currentUser.uid
    ) {

        showToast(
            "Ye incident aapko assigned nahi hai.",
            "error"
        );

        return;
    }


    currentIncident = incident;

    renderIncidentLocation();
}


async function loadLatestActiveIncident() {

    const snapshot =
        await get(
            ref(db, "incidents")
        );


    if (!snapshot.exists()) {

        renderNoIncident();

        return;
    }


    const incidents = [];


    snapshot.forEach(child => {

        const incident = {
            id: child.key,
            ...child.val()
        };


        if (
            incident.responderId ===
                currentUser.uid &&
            ![
                "Resolved",
                "Cancelled",
                "Rejected"
            ].includes(incident.status)
        ) {

            incidents.push(incident);
        }
    });


    incidents.sort(
        (a, b) =>
            (b.updatedAt || b.createdAt || 0) -
            (a.updatedAt || a.createdAt || 0)
    );


    if (!incidents.length) {

        renderNoIncident();

        return;
    }


    currentIncident =
        incidents[0];


    renderIncidentLocation();
}


function renderIncidentLocation() {

    if (!currentIncident) return;


    const lat =
        Number(currentIncident.latitude);


    const lng =
        Number(currentIncident.longitude);


    setText(
        "#incidentId",
        currentIncident.incidentId ||
        currentIncident.id
    );


    setText(
        "#incidentType",
        currentIncident.type ||
        currentIncident.category ||
        "Emergency"
    );


    setText(
        "#incidentLocation",
        currentIncident.landmark ||
        `${lat}, ${lng}`
    );


    setText(
        "#incidentLatitude",
        Number.isFinite(lat)
            ? lat.toFixed(6)
            : "N/A"
    );


    setText(
        "#incidentLongitude",
        Number.isFinite(lng)
            ? lng.toFixed(6)
            : "N/A"
    );


    const mapFrame =
        $("#mapFrame");


    if (
        mapFrame &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {

        mapFrame.src =
            `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    }


    const mapContainer =
        $("#mapContainer");


    if (
        mapContainer &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {

        mapContainer.dataset.latitude =
            lat;

        mapContainer.dataset.longitude =
            lng;
    }
}


function renderNoIncident() {

    setText(
        "#incidentLocation",
        "No active incident"
    );


    const mapFrame =
        $("#mapFrame");


    if (mapFrame) {
        mapFrame.src = "";
    }
}


function startLocationTracking() {

    if (
        !navigator.geolocation
    ) {

        showToast(
            "Browser GPS support nahi karta.",
            "error"
        );

        return;
    }


    watchId =
        navigator.geolocation.watchPosition(
            position => {

                updateResponderLocation(
                    position.coords
                );

            },
            error => {

                console.error(
                    "GPS error:",
                    error
                );


                let message =
                    "Location access nahi mila.";


                if (
                    error.code ===
                    error.PERMISSION_DENIED
                ) {
                    message =
                        "Location permission denied.";
                }


                showToast(
                    message,
                    "error"
                );

            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 15000
            }
        );
}


async function updateResponderLocation(
    coords
) {

    if (!currentUser) return;


    const latitude =
        coords.latitude;


    const longitude =
        coords.longitude;


    const accuracy =
        coords.accuracy;


    setText(
        "#responderLatitude",
        latitude.toFixed(6)
    );


    setText(
        "#responderLongitude",
        longitude.toFixed(6)
    );


    setText(
        "#locationAccuracy",
        `${Math.round(accuracy)} m`
    );


    try {

        await update(
            ref(
                db,
                `users/${currentUser.uid}`
            ),
            {
                latitude,
                longitude,
                locationAccuracy:
                    accuracy,
                locationUpdatedAt:
                    Date.now(),
                updatedAt:
                    Date.now()
            }
        );


        updateResponderMapMarker(
            latitude,
            longitude
        );


    } catch (error) {

        console.error(
            "Location Firebase update error:",
            error
        );
    }
}


function updateResponderMapMarker(
    latitude,
    longitude
) {

    const mapFrame =
        $("#responderMapFrame");


    if (
        mapFrame &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
    ) {

        mapFrame.src =
            `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
    }
}


function getCurrentLocationOnce() {

    if (!navigator.geolocation) {

        showToast(
            "GPS supported nahi hai.",
            "error"
        );

        return;
    }


    navigator.geolocation.getCurrentPosition(
        position => {

            updateResponderLocation(
                position.coords
            );

            showToast(
                "Location updated.",
                "success"
            );
        },
        error => {

            console.error(error);

            showToast(
                "Current location nahi mil paayi.",
                "error"
            );
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


function navigateToIncident() {

    if (!currentIncident) {

        showToast(
            "Active incident nahi hai.",
            "error"
        );

        return;
    }


    const lat =
        Number(currentIncident.latitude);


    const lng =
        Number(currentIncident.longitude);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {

        showToast(
            "Incident coordinates invalid hain.",
            "error"
        );

        return;
    }


    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


function stopLocationTracking() {

    if (
        watchId !== null &&
        navigator.geolocation
    ) {

        navigator.geolocation.clearWatch(
            watchId
        );

        watchId = null;
    }
}


window.addEventListener(
    "beforeunload",
    stopLocationTracking
);