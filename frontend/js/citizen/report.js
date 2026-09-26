import { auth, db } from "../firebase.js";

import {
    getUserProfile,
    requireRole
} from "../auth.js";

import {
    $,
    $$,
    getCurrentLocation,
    generateIncidentId,
    showToast,
    setLoading,
    escapeHTML
} from "../common.js";

import {
    ref,
    push,
    set
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let currentProfile = null;

let selectedLocation = null;
let isSubmitting = false;


document.addEventListener("DOMContentLoaded", async () => {

    try {

        currentUser =
            await requireRole("citizen");

        if (!currentUser) {
            return;
        }


        currentProfile =
            await getUserProfile(
                currentUser.uid
            );


        setupReportForm();
        setupSOSButton();
        setupLocationButton();

        prefillUserData();

    } catch (error) {

        console.error(
            "Report page error:",
            error
        );

        showToast(
            "Report page load nahi ho saka.",
            "error"
        );

    }

});


function setupReportForm() {

    const form =
        $("#emergencyReportForm") ||
        $("#reportForm") ||
        $("form[data-form='report']");


    if (!form) {

        console.warn(
            "Emergency report form not found."
        );

        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await submitNormalReport(form);

        }
    );

}


function setupSOSButton() {

    const buttons = [
        "#sosButton",
        "#sosBtn",
        "[data-action='sos']"
    ];


    buttons.forEach(selector => {

        const button = $(selector);

        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                await submitSOS(button);

            }
        );

    });

}


function setupLocationButton() {

    const buttons = [
        "#getLocationBtn",
        "#locationBtn",
        "[data-action='location']"
    ];


    buttons.forEach(selector => {

        const button = $(selector);

        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                await detectLocation(button);

            }
        );

    });

}


async function detectLocation(button = null) {

    try {

        if (button) {
            setLoading(button, true);
        }


        showToast(
            "Aapki location detect ki ja rahi hai...",
            "info"
        );


        const position =
            await getCurrentLocation();


        selectedLocation = {

            latitude:
                position.latitude,

            longitude:
                position.longitude,

            accuracy:
                position.accuracy || null

        };


        updateLocationUI(
            selectedLocation
        );


        showToast(
            "Location successfully detected.",
            "success"
        );


    } catch (error) {

        console.error(
            "Location error:",
            error
        );


        showToast(
            getLocationErrorMessage(error),
            "error"
        );


    } finally {

        if (button) {
            setLoading(button, false);
        }

    }

}


function updateLocationUI(location) {

    const latitudeElements = [
        "#latitude",
        "#locationLatitude",
        "[data-latitude]"
    ];


    const longitudeElements = [
        "#longitude",
        "#locationLongitude",
        "[data-longitude]"
    ];


    latitudeElements.forEach(selector => {

        const element = $(selector);

        if (element) {
            element.value =
                location.latitude;
        }

    });


    longitudeElements.forEach(selector => {

        const element = $(selector);

        if (element) {
            element.value =
                location.longitude;
        }

    });


    const locationText =
        $("#locationStatus") ||
        $("#locationText");


    if (locationText) {

        locationText.textContent =
            `📍 Location detected (${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)})`;

    }


    const locationBox =
        $("#locationBox");

    if (locationBox) {
        locationBox.classList.add(
            "location-detected"
        );
    }

}


async function submitNormalReport(form) {

    if (isSubmitting) {
        return;
    }


    try {

        isSubmitting = true;


        const data =
            readFormData(form);


        const validation =
            validateReport(data);


        if (!validation.valid) {

            showToast(
                validation.message,
                "error"
            );

            isSubmitting = false;

            return;
        }


        const submitButton =
            form.querySelector(
                "button[type='submit']"
            );


        if (submitButton) {
            setLoading(
                submitButton,
                true
            );
        }


        if (!selectedLocation) {

            showToast(
                "Pehle current location detect karein.",
                "error"
            );


            if (submitButton) {
                setLoading(
                    submitButton,
                    false
                );
            }


            isSubmitting = false;

            return;
        }


        const incident =
            createIncidentObject({
                ...data,
                source: "citizen"
            });


        const incidentKey =
            await saveIncident(
                incident
            );


        showToast(
            "Emergency report successfully submit ho gayi.",
            "success"
        );


        setTimeout(() => {

            window.location.href =
                `tracking.html?id=${encodeURIComponent(incidentKey)}`;

        }, 900);


    } catch (error) {

        console.error(
            "Report submission error:",
            error
        );


        showToast(
            getDatabaseErrorMessage(error),
            "error"
        );


    } finally {

        isSubmitting = false;

    }

}


async function submitSOS(button) {

    if (isSubmitting) {
        return;
    }


    const confirmed =
        window.confirm(
            "Kya aap emergency SOS report submit karna chahte hain?"
        );


    if (!confirmed) {
        return;
    }


    try {

        isSubmitting = true;

        setLoading(button, true);


        showToast(
            "SOS process start ho raha hai...",
            "info"
        );


        if (!selectedLocation) {

            try {

                await detectLocation();

            } catch (error) {

                throw new Error(
                    "SOS ke liye location required hai."
                );

            }

        }


        if (!selectedLocation) {

            throw new Error(
                "Location detect nahi hui."
            );

        }


        const incident =
            createIncidentObject({

                type: "SOS Emergency",

                category: "SOS",

                description:
                    "One-tap SOS emergency reported by citizen.",

                severity: "Critical",

                priority: "Critical",

                source: "sos"

            });


        const incidentKey =
            await saveIncident(
                incident
            );


        showToast(
            "🚨 SOS successfully sent!",
            "success"
        );


        setTimeout(() => {

            window.location.href =
                `tracking.html?id=${encodeURIComponent(incidentKey)}`;

        }, 700);


    } catch (error) {

        console.error(
            "SOS error:",
            error
        );


        showToast(
            error.message ||
            "SOS send nahi ho saka.",
            "error"
        );


    } finally {

        isSubmitting = false;

        setLoading(button, false);

    }

}


function readFormData(form) {

    const getValue = selectors => {

        for (const selector of selectors) {

            const element =
                form.querySelector(selector);

            if (element) {
                return element.value.trim();
            }

        }

        return "";

    };


    return {

        type: getValue([
            "#incidentType",
            "#emergencyType",
            "[name='type']",
            "[name='category']"
        ]),

        category: getValue([
            "#incidentCategory",
            "#category",
            "[name='category']"
        ]),

        description: getValue([
            "#description",
            "#incidentDescription",
            "[name='description']"
        ]),

        severity: getValue([
            "#severity",
            "#incidentSeverity",
            "[name='severity']"
        ]),

        landmark: getValue([
            "#landmark",
            "#nearbyLandmark",
            "[name='landmark']"
        ])

    };

}


function validateReport(data) {

    if (!data.type && !data.category) {

        return {
            valid: false,
            message: "Emergency type select karein."
        };

    }


    if (!data.description) {

        return {
            valid: false,
            message: "Emergency description enter karein."
        };

    }


    if (!data.severity) {

        return {
            valid: false,
            message: "Emergency severity select karein."
        };

    }


    if (!selectedLocation) {

        return {
            valid: false,
            message: "Current location detect karein."
        };

    }


    return {
        valid: true
    };

}


function createIncidentObject(data) {

    const incidentId =
        generateIncidentId();


    const now =
        Date.now();


    const type =
        data.type ||
        data.category ||
        "Emergency";


    const category =
        data.category ||
        data.type ||
        "Emergency";


    const severity =
        normalizeSeverity(
            data.severity
        );


    return {

        incidentId,

        userId:
            currentUser.uid,

        userEmail:
            currentUser.email ||
            currentProfile?.email ||
            "",

        userName:
            currentProfile?.name ||
            currentUser.displayName ||
            "Citizen",

        type,

        category,

        description:
            data.description ||
            "Emergency reported.",

        severity,

        priority:
            data.priority ||
            calculatePriority(severity),

        latitude:
            selectedLocation.latitude,

        longitude:
            selectedLocation.longitude,

        locationAccuracy:
            selectedLocation.accuracy ||
            null,

        landmark:
            data.landmark ||
            "",

        status:
            "Pending",

        responderId:
            "",

        responderName:
            "",

        source:
            data.source ||
            "citizen",

        createdAt:
            now,

        updatedAt:
            now,

        assignedAt:
            null,

        resolvedAt:
            null

    };

}


async function saveIncident(incident) {

    const incidentsRef =
        ref(db, "incidents");


    const newIncidentRef =
        push(incidentsRef);


    await set(
        newIncidentRef,
        incident
    );


    return newIncidentRef.key;

}


function normalizeSeverity(value) {

    const severity =
        String(value || "")
            .trim()
            .toLowerCase();


    if (
        severity === "critical" ||
        severity === "urgent" ||
        severity === "very high"
    ) {
        return "Critical";
    }


    if (
        severity === "high"
    ) {
        return "High";
    }


    if (
        severity === "medium" ||
        severity === "moderate"
    ) {
        return "Medium";
    }


    return "Low";

}


function calculatePriority(severity) {

    switch (severity) {

        case "Critical":
            return "Critical";

        case "High":
            return "High";

        case "Medium":
            return "Medium";

        default:
            return "Low";

    }

}


function prefillUserData() {

    const emailElements = [
        "#userEmail",
        "#reporterEmail",
        "[name='userEmail']"
    ];


    emailElements.forEach(selector => {

        const element = $(selector);

        if (
            element &&
            !element.value
        ) {

            element.value =
                currentUser.email || "";

        }

    });


    const nameElements = [
        "#userName",
        "#reporterName",
        "[name='userName']"
    ];


    nameElements.forEach(selector => {

        const element = $(selector);

        if (
            element &&
            !element.value
        ) {

            element.value =
                currentProfile?.name ||
                currentUser.displayName ||
                "";

        }

    });

}


function getLocationErrorMessage(error) {

    if (
        error?.code === 1
    ) {

        return "Location permission denied. Browser settings mein location allow karein.";

    }


    if (
        error?.code === 2
    ) {

        return "Location available nahi hai. GPS/network check karein.";

    }


    if (
        error?.code === 3
    ) {

        return "Location request timeout ho gayi.";

    }


    return (
        error?.message ||
        "Location detect nahi ho saki."
    );

}


function getDatabaseErrorMessage(error) {

    if (
        error?.code ===
        "PERMISSION_DENIED"
    ) {

        return "Firebase Database permission denied. Database rules check karein.";

    }


    return (
        error?.message ||
        "Emergency report save nahi ho saki."
    );

}


window.addEventListener(
    "beforeunload",
    () => {
        selectedLocation = null;
    }
);