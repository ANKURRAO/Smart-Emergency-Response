// ============================================================
// SMART EMERGENCY RESPONSE
// Main Frontend JavaScript
// ============================================================

import { auth, db } from "./firebase-config.js";

import {
    ref,
    set,
    get
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let userLocation = null;


// ============================================================
// LOGIN MODAL
// ============================================================

function openLogin() {
    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeLogin() {
    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.style.display = "none";
    }
}


// ============================================================
// HELPER: DISPLAY LOGIN MESSAGE
// ============================================================

function showLoginMessage(text) {
    const message = document.getElementById("loginMessage");

    if (message) {
        message.textContent = text;
    }
}


// ============================================================
// FIREBASE LOGIN
// ============================================================

async function loginUser() {
    const emailElement = document.getElementById("email");
    const passwordElement = document.getElementById("password");

    if (!emailElement || !passwordElement) {
        console.error("Login email/password fields were not found.");
        showLoginMessage("Login form fields were not found.");
        return;
    }

    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (!email || !password) {
        showLoginMessage("Please enter email and password.");
        return;
    }

    showLoginMessage("Checking your account...");

    try {
        // Step 1: Authenticate with Firebase
        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = credential.user;

        console.log("Firebase login successful:", user.email);
        console.log("User UID:", user.uid);

        showLoginMessage("Login successful. Checking your role...");

        // Step 2: Get the user's profile from Realtime Database
        const profileRef = ref(db, "users/" + user.uid);
        const profileSnapshot = await get(profileRef);

        if (!profileSnapshot.exists()) {
            console.error("User profile missing in database.");

            showLoginMessage(
                "Login succeeded, but your database profile is missing. Contact the administrator."
            );
            return;
        }

        const profile = profileSnapshot.val();
        const role = String(profile.role || "")
            .toLowerCase()
            .trim();

        console.log("Logged-in email:", user.email);
        console.log("Logged-in role:", role);

        // Step 3: Select dashboard based on the saved role
        const dashboards = {
            citizen: "citizen/dashboard.html",
            responder: "responder/dashboard.html",
            admin: "admin/dashboard.html"
        };

        const destination = dashboards[role];

        if (!destination) {
            console.error("Invalid or missing role:", role);

            showLoginMessage(
                "Your account role is missing or invalid. Contact the administrator."
            );
            return;
        }

        // Step 4: Redirect to the correct dashboard
        showLoginMessage(
            "Login successful! Role: " + role + ". Opening dashboard..."
        );

        window.location.href = destination;

    } catch (error) {
        console.error("LOGIN ERROR CODE:", error.code);
        console.error("LOGIN ERROR MESSAGE:", error.message);
        console.error("Full login error:", error);

        let errorMessage = "Login failed. Please try again.";

        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/wrong-password" ||
            error.code === "auth/user-not-found"
        ) {
            errorMessage = "Incorrect email or password.";

        } else if (error.code === "auth/invalid-email") {
            errorMessage = "Please enter a valid email.";

        } else if (error.code === "auth/too-many-requests") {
            errorMessage = "Too many attempts. Please try again later.";

        } else if (error.code === "auth/network-request-failed") {
            errorMessage = "Network error. Check your internet connection.";

        } else if (
            error.code === "PERMISSION_DENIED" ||
            error.code === "permission-denied" ||
            error.code === "database/permission-denied"
        ) {
            errorMessage =
                "Cannot read your profile from Firebase Database. Check database rules.";

        } else if (
            error.code === "auth/operation-not-allowed"
        ) {
            errorMessage =
                "Email/password login is not enabled in Firebase Authentication.";

        } else {
            errorMessage =
                "Login error: " +
                (error.code || error.message || "Unknown error");
        }

        showLoginMessage(errorMessage);
    }
}


// ============================================================
// FIREBASE REGISTRATION
// ============================================================

async function registerUser() {
    const emailElement = document.getElementById("email");
    const passwordElement = document.getElementById("password");

    if (!emailElement || !passwordElement) {
        console.error("Registration email/password fields not found.");
        showLoginMessage("Registration form fields were not found.");
        return;
    }

    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (!email || !password) {
        showLoginMessage("Please enter email and password.");
        return;
    }

    if (password.length < 6) {
        showLoginMessage("Password must be at least 6 characters.");
        return;
    }

    showLoginMessage("Creating your account...");

    let createdUser = null;

    try {
        // Step 1: Create Firebase Authentication account
        const credential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        createdUser = credential.user;

        console.log("Account created:", createdUser.email);
        console.log("New user UID:", createdUser.uid);

        // Step 2: Save the profile in Realtime Database
        await set(ref(db, "users/" + createdUser.uid), {
            email: email,
            role: "citizen",
            createdAt: new Date().toISOString()
        });

        // Step 3: Redirect to Citizen Dashboard
        showLoginMessage("Account created. Opening Citizen Dashboard...");

        window.location.href = "citizen/dashboard.html";

    } catch (error) {
        console.error("REGISTRATION ERROR CODE:", error.code);
        console.error("REGISTRATION ERROR MESSAGE:", error.message);
        console.error("Full registration error:", error);

        let errorMessage = "Unable to create account. Please try again.";

        if (error.code === "auth/email-already-in-use") {
            errorMessage = "An account already exists with this email.";

        } else if (error.code === "auth/invalid-email") {
            errorMessage = "Please enter a valid email.";

        } else if (error.code === "auth/weak-password") {
            errorMessage = "Password is too weak. Use at least 6 characters.";

        } else if (
            error.code === "PERMISSION_DENIED" ||
            error.code === "permission-denied" ||
            error.code === "database/permission-denied"
        ) {
            errorMessage =
                "Your account may have been created, but the database profile could not be saved. Check Firebase Database rules.";

        } else {
            errorMessage =
                "Registration error: " +
                (error.code || error.message || "Unknown error");
        }

        showLoginMessage(errorMessage);
    }
}


// ============================================================
// LOGOUT
// ============================================================

async function logoutUser() {
    try {
        await signOut(auth);

        console.log("User logged out successfully.");

        // Return to the main landing page
        window.location.href = "../index.html";

    } catch (error) {
        console.error("LOGOUT ERROR CODE:", error.code);
        console.error("LOGOUT ERROR MESSAGE:", error.message);

        alert(
            "Unable to log out: " +
            (error.message || "Please try again.")
        );
    }
}


// ============================================================
// FIREBASE AUTH STATE
// ============================================================

onAuthStateChanged(auth, function (user) {
    if (user) {
        console.log("Currently signed-in user:", user.email);
        console.log("Current user UID:", user.uid);
    } else {
        console.log("No user is currently signed in.");
    }
});


// ============================================================
// SOS DEMO
// ============================================================

function startSOS() {
    const confirmation = confirm(
        "This is a project demo. Start emergency SOS?"
    );

    if (!confirmation) {
        return;
    }

    getLocation();

    alert(
        "SOS demo started.\n\n" +
        "Note: This demo button does not send a real emergency alert."
    );
}


// ============================================================
// SCROLL TO REPORT SECTION
// ============================================================

function scrollToReport() {
    const reportSection = document.getElementById("report");

    if (reportSection) {
        reportSection.scrollIntoView({
            behavior: "smooth"
        });
    }
}


// ============================================================
// GET USER LOCATION
// ============================================================

function getLocation() {
    const status = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
        if (status) {
            status.textContent =
                "Geolocation is not supported by this browser.";
        }
        return;
    }

    if (status) {
        status.textContent = "Getting your location...";
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            if (status) {
                status.textContent = "Location captured successfully.";
            }

            console.log("User location:", userLocation);
        },

        function (error) {
            console.error("LOCATION ERROR:", error.code, error.message);

            if (status) {
                status.textContent =
                    "Unable to access location. Allow location permission and try again.";
            }
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


// ============================================================
// SUBMIT INCIDENT - CURRENTLY DEMO ONLY
// ============================================================

function submitIncident() {
    const typeElement = document.getElementById("incidentType");
    const severityElement = document.getElementById("severity");
    const descriptionElement = document.getElementById("description");

    if (!typeElement || !severityElement || !descriptionElement) {
        console.error("Incident form fields were not found.");
        return;
    }

    const type = typeElement.value;
    const severity = severityElement.value;
    const description = descriptionElement.value.trim();

    if (!type) {
        alert("Please select incident type.");
        return;
    }

    if (!severity) {
        alert("Please select severity.");
        return;
    }

    if (!description) {
        alert("Please describe the incident.");
        return;
    }

    if (!userLocation) {
        alert("Please capture your location first.");
        return;
    }

    const incident = {
        id: "INC-" + Date.now(),
        type: type,
        severity: severity,
        description: description,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        status: "Reported",
        createdAt: new Date().toISOString()
    };

    console.log("Demo incident created:", incident);

    alert(
        "Incident demo created.\n\n" +
        "Incident ID: " + incident.id +
        "\n\nNote: This incident has NOT been saved to the database."
    );

    descriptionElement.value = "";
}


// ============================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ============================================================

window.openLogin = openLogin;
window.closeLogin = closeLogin;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.startSOS = startSOS;
window.scrollToReport = scrollToReport;
window.getLocation = getLocation;
window.submitIncident = submitIncident;