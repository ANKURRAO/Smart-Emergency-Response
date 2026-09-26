// =========================================================
// SMART EMERGENCY RESPONSE
// COMMON JAVASCRIPT UTILITIES
// =========================================================

// =========================================================
// DOM HELPERS
// =========================================================

function $(selector, parent = document) {
    return parent.querySelector(selector);
}

function $$(selector, parent = document) {
    return Array.from(
        parent.querySelectorAll(selector)
    );
}

// =========================================================
// SHOW / HIDE ELEMENT
// =========================================================

function showElement(element) {

    if (!element) return;

    if (typeof element === "string") {
        element = $(element);
    }

    if (element) {
        element.style.display = "";
    }
}

function hideElement(element) {

    if (!element) return;

    if (typeof element === "string") {
        element = $(element);
    }

    if (element) {
        element.style.display = "none";
    }
}

// =========================================================
// TOGGLE ELEMENT
// =========================================================

function toggleElement(element) {

    if (!element) return;

    if (typeof element === "string") {
        element = $(element);
    }

    if (!element) return;

    const isHidden =
        element.style.display === "none";

    element.style.display =
        isHidden ? "" : "none";
}

// =========================================================
// TEXT HELPER
// =========================================================

function setText(
    element,
    text
) {

    if (!element) return;

    if (typeof element === "string") {
        element = $(element);
    }

    if (element) {
        element.textContent =
            text ?? "";
    }
}

// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =========================================================
// DATE FORMAT
// =========================================================

function formatDate(
    timestamp
) {

    if (!timestamp) {
        return "N/A";
    }

    const date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

// =========================================================
// DATE + TIME FORMAT
// =========================================================

function formatDateTime(
    timestamp
) {

    if (!timestamp) {
        return "N/A";
    }

    const date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

// =========================================================
// TIME AGO
// =========================================================

function timeAgo(timestamp) {

    if (!timestamp) {
        return "Unknown";
    }

    const now =
        Date.now();

    const difference =
        Math.max(
            0,
            now - Number(timestamp)
        );

    const seconds =
        Math.floor(
            difference / 1000
        );

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 30) {
        return `${days}d ago`;
    }

    return formatDate(timestamp);
}

// =========================================================
// INCIDENT ID GENERATOR
// =========================================================

function generateIncidentId() {

    const time =
        Date.now()
            .toString(36)
            .toUpperCase();

    const random =
        Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase();

    return `SER-${time}-${random}`;
}

// =========================================================
// RANDOM ID
// =========================================================

function generateId(
    prefix = "ID"
) {

    const random =
        Math.random()
            .toString(36)
            .substring(2, 10)
            .toUpperCase();

    return `${prefix}-${random}`;
}

// =========================================================
// NOTIFICATION / TOAST
// =========================================================

function showToast(
    message,
    type = "info",
    duration = 3500
) {

    let container =
        document.getElementById(
            "toast-container"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toast-container";

        container.style.position =
            "fixed";

        container.style.top =
            "20px";

        container.style.right =
            "20px";

        container.style.zIndex =
            "99999";

        container.style.display =
            "flex";

        container.style.flexDirection =
            "column";

        container.style.gap =
            "10px";

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement(
            "div"
        );

    toast.textContent =
        message;

    const backgrounds = {
        success: "#16a34a",
        error: "#dc2626",
        warning: "#f59e0b",
        info: "#2563eb"
    };

    toast.style.background =
        backgrounds[type] ||
        backgrounds.info;

    toast.style.color =
        "white";

    toast.style.padding =
        "12px 16px";

    toast.style.borderRadius =
        "9px";

    toast.style.fontSize =
        "14px";

    toast.style.fontWeight =
        "700";

    toast.style.maxWidth =
        "350px";

    toast.style.boxShadow =
        "0 8px 25px rgba(0,0,0,.15)";

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.style.opacity =
            "0";

        toast.style.transform =
            "translateX(20px)";

        toast.style.transition =
            "0.25s ease";

        setTimeout(() => {
            toast.remove();
        }, 250);

    }, duration);
}

// =========================================================
// CONFIRM DIALOG
// =========================================================

function confirmAction(
    message
) {

    return window.confirm(
        message
    );
}

// =========================================================
// LOADING STATE
// =========================================================

function setLoading(
    button,
    loading,
    loadingText = "Loading..."
) {

    if (!button) return;

    if (typeof button === "string") {
        button = $(button);
    }

    if (!button) return;

    if (loading) {

        if (!button.dataset.originalText) {

            button.dataset.originalText =
                button.innerHTML;
        }

        button.disabled = true;

        button.innerHTML =
            `<span class="spinner"></span> ${loadingText}`;

    } else {

        button.disabled = false;

        if (button.dataset.originalText) {

            button.innerHTML =
                button.dataset.originalText;

            delete button.dataset.originalText;
        }
    }
}

// =========================================================
// GEOLOCATION
// =========================================================

function getCurrentLocation() {

    return new Promise(
        (resolve, reject) => {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "Geolocation is not supported by this browser."
                    )
                );

                return;
            }

            navigator.geolocation.getCurrentPosition(

                position => {

                    resolve({

                        latitude:
                            position.coords.latitude,

                        longitude:
                            position.coords.longitude,

                        accuracy:
                            position.coords.accuracy
                    });
                },

                error => {

                    let message =
                        "Unable to get your location.";

                    switch (error.code) {

                        case 1:
                            message =
                                "Location permission was denied.";
                            break;

                        case 2:
                            message =
                                "Location is currently unavailable.";
                            break;

                        case 3:
                            message =
                                "Location request timed out.";
                            break;
                    }

                    reject(
                        new Error(message)
                    );
                },

                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        }
    );
}

// =========================================================
// GOOGLE MAPS URL
// =========================================================

function getGoogleMapsUrl(
    latitude,
    longitude
) {

    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined
    ) {
        return null;
    }

    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

// =========================================================
// OPEN GOOGLE MAPS
// =========================================================

function openGoogleMaps(
    latitude,
    longitude
) {

    const url =
        getGoogleMapsUrl(
            latitude,
            longitude
        );

    if (!url) {

        showToast(
            "Location is not available.",
            "warning"
        );

        return;
    }

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}

// =========================================================
// SAVE LOCAL STORAGE
// =========================================================

function saveLocal(
    key,
    value
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;

    } catch (error) {

        console.error(
            "Local storage save error:",
            error
        );

        return false;
    }
}

// =========================================================
// GET LOCAL STORAGE
// =========================================================

function getLocal(
    key,
    defaultValue = null
) {

    try {

        const value =
            localStorage.getItem(key);

        if (value === null) {
            return defaultValue;
        }

        return JSON.parse(value);

    } catch (error) {

        console.error(
            "Local storage read error:",
            error
        );

        return defaultValue;
    }
}

// =========================================================
// REMOVE LOCAL STORAGE
// =========================================================

function removeLocal(
    key
) {

    try {

        localStorage.removeItem(
            key
        );

        return true;

    } catch (error) {

        console.error(
            "Local storage remove error:",
            error
        );

        return false;
    }
}

// =========================================================
// STATUS CLASS
// =========================================================

function getStatusClass(
    status
) {

    if (!status) {
        return "badge-neutral";
    }

    switch (
        String(status)
            .toLowerCase()
    ) {

        case "resolved":
        case "completed":
        case "available":
            return "badge-success";

        case "assigned":
        case "pending":
        case "processing":
        case "in progress":
            return "badge-warning";

        case "critical":
        case "emergency":
        case "rejected":
        case "cancelled":
            return "badge-danger";

        case "dispatched":
        case "en route":
        case "active":
            return "badge-info";

        default:
            return "badge-neutral";
    }
}

// =========================================================
// PRIORITY CLASS
// =========================================================

function getPriorityClass(
    priority
) {

    if (!priority) {
        return "priority-low";
    }

    switch (
        String(priority)
            .toLowerCase()
    ) {

        case "critical":
            return "priority-critical";

        case "high":
            return "priority-high";

        case "medium":
            return "priority-medium";

        default:
            return "priority-low";
    }
}

// =========================================================
// CAPITALIZE
// =========================================================

function capitalize(
    value
) {

    if (!value) {
        return "";
    }

    return String(value)
        .charAt(0)
        .toUpperCase() +
        String(value)
            .slice(1);
}

// =========================================================
// DEBOUNCE
// =========================================================

function debounce(
    callback,
    delay = 300
) {

    let timer;

    return function (...args) {

        clearTimeout(timer);

        timer =
            setTimeout(
                () => {
                    callback.apply(
                        this,
                        args
                    );
                },
                delay
            );
    };
}

// =========================================================
// COPY TO CLIPBOARD
// =========================================================

async function copyToClipboard(
    text
) {

    try {

        await navigator.clipboard.writeText(
            text
        );

        showToast(
            "Copied to clipboard.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "Clipboard error:",
            error
        );

        showToast(
            "Unable to copy.",
            "error"
        );

        return false;
    }
}

// =========================================================
// EXPORT
// =========================================================

export {

    $,
    $$,

    showElement,
    hideElement,
    toggleElement,

    setText,
    escapeHTML,

    formatDate,
    formatDateTime,
    timeAgo,

    generateIncidentId,
    generateId,

    showToast,
    confirmAction,
    setLoading,

    getCurrentLocation,

    getGoogleMapsUrl,
    openGoogleMaps,

    saveLocal,
    getLocal,
    removeLocal,

    getStatusClass,
    getPriorityClass,

    capitalize,
    debounce,
    copyToClipboard
};