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

    const modal =
        document.getElementById("loginModal");

    if (modal) {
        modal.style.display = "flex";
    }
}


function closeLogin() {

    const modal =
        document.getElementById("loginModal");

    if (modal) {
        modal.style.display = "none";
    }
}


// ============================================================
// FIREBASE LOGIN
// ============================================================



async function loginUser() {
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const message = document.getElementById("loginMessage");

    if (!email || !password) {
        if (message) message.textContent = "Please enter email and password.";
        return;
    }

    if (message) message.textContent = "Logging in...";

    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const snapshot = await get(
            ref(db, `users/${credential.user.uid}`)
        );

        if (!snapshot.exists()) {
            if (message) {
                message.textContent =
                    "Login successful, but user profile was not found in the database.";
            }
            return;
        }

        const profile = snapshot.val();
        const role = profile.role || "citizen";

        const dashboards = {
            citizen: "citizen/dashboard.html",
            responder: "responder/dashboard.html",
            admin: "admin/dashboard.html"
        };

        const destination = dashboards[role];

        if (!destination) {
            if (message) message.textContent = "Unknown account role.";
            return;
        }

        if (message) message.textContent = "Login successful. Opening dashboard...";
        closeLogin();
        window.location.href = destination;

    } catch (error) {
        console.error("Login Error:", error);

        const messages = {
            "auth/invalid-credential": "Invalid email or password.",
            "auth/user-not-found": "No account found with this email.",
            "auth/wrong-password": "Incorrect password.",
            "auth/invalid-email": "Please enter a valid email.",
            "auth/too-many-requests": "Too many attempts. Please try again later."
        };

        if (message) {
            message.textContent =
                messages[error.code] || `Login failed: ${error.message}`;
        }
    }
}


// ============================================================
// FIREBASE REGISTER
// ============================================================

async function registerUser() {
const emailElement = document.getElementById("email");
const passwordElement = document.getElementById("password");
const message = document.getElementById("loginMessage");


if (!emailElement || !passwordElement) {
    console.error("Email or password input not found.");
    return;
}

const email = emailElement.value.trim();
const password = passwordElement.value;

// Check empty fields
if (!email || !password) {
    if (message) {
        message.textContent = "Please enter email and password.";
    }
    return;
}

// Check password length
if (password.length < 6) {
    if (message) {
        message.textContent = "Password must be at least 6 characters.";
    }
    return;
}

if (message) {
    message.textContent = "Creating account...";
}

try {
    // Step 1: Create Firebase Authentication account
    const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

    const user = credential.user;

    // Step 2: Save user profile in Firebase Realtime Database
    await set(ref(db, "users/" + user.uid), {
        email: email,
        role: "citizen",
        createdAt: new Date().toISOString()
    });

    // Step 3: Show success message
    if (message) {
        message.textContent =
            "Account created successfully! Opening dashboard...";
    }

    // Step 4: Close login/register modal
    closeLogin();

    // Step 5: Open Citizen Dashboard
    window.location.href = "citizen/dashboard.html";

} catch (error) {
    console.error("Registration Error:", error);

    let errorMessage = "Unable to create account. Please try again.";

    if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account already exists with this email.";
    } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email.";
    } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Use at least 6 characters.";
    } else if (error.code === "permission-denied") {
        errorMessage = "Firebase Database permission denied.";
    }

    if (message) {
        message.textContent = errorMessage;
    }
}


}



// ============================================================
// LOGOUT
// ============================================================

async function logoutUser() {

    try {

        await signOut(auth);

        alert(
            "✅ You have been logged out."
        );

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );

    }

}


// ============================================================
// FIREBASE AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    function(user) {

        if (user) {

            console.log(
                "✅ Logged in user:",
                user.email
            );

            console.log(
                "User UID:",
                user.uid
            );

        }

        else {

            console.log(
                "ℹ️ No user is currently logged in."
            );

        }

    }
);


// ============================================================
// SOS
// ============================================================

function startSOS() {

    const confirmation =
        confirm(
            "This is a project demo. Start emergency SOS?"
        );


    if (!confirmation) {
        return;
    }


    getLocation();


    alert(
        "🚨 SOS initiated!\n\n" +
        "In the complete system, the incident would be " +
        "sent to the emergency control center."
    );

}


// ============================================================
// SCROLL TO REPORT
// ============================================================

function scrollToReport() {

    const reportSection =
        document.getElementById("report");


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

    const status =
        document.getElementById(
            "locationStatus"
        );


    if (!navigator.geolocation) {

        if (status) {

            status.textContent =
                "Geolocation is not supported by this browser.";

        }

        return;
    }


    if (status) {

        status.textContent =
            "📍 Getting your location...";

    }


    navigator.geolocation.getCurrentPosition(

        function(position) {

            userLocation = {

                latitude:
                    position.coords.latitude,

                longitude:
                    position.coords.longitude

            };


            if (status) {

                status.textContent =
                    "✅ Location captured successfully.";

            }


            console.log(
                "User Location:",
                userLocation
            );

        },


        function(error) {

            if (status) {

                status.textContent =
                    "❌ Unable to access location.";

            }


            console.log(
                "Location Error:",
                error
            );

        }

    );

}


// ============================================================
// SUBMIT INCIDENT
// ============================================================

function submitIncident() {

    const typeElement =
        document.getElementById(
            "incidentType"
        );


    const severityElement =
        document.getElementById(
            "severity"
        );


    const descriptionElement =
        document.getElementById(
            "description"
        );


    if (
        !typeElement ||
        !severityElement ||
        !descriptionElement
    ) {

        return;

    }


    const type =
        typeElement.value;


    const severity =
        severityElement.value;


    const description =
        descriptionElement.value;


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!type) {

        alert(
            "Please select incident type."
        );

        return;
    }


    if (!severity) {

        alert(
            "Please select severity."
        );

        return;
    }


    if (!description.trim()) {

        alert(
            "Please describe the incident."
        );

        return;
    }


    if (!userLocation) {

        alert(
            "Please share your location first."
        );

        return;
    }


    // --------------------------------------------------------
    // CREATE INCIDENT
    // --------------------------------------------------------

    const incident = {

        id:
            "INC-" +
            Date.now(),

        type:
            type,

        severity:
            severity,

        description:
            description,

        latitude:
            userLocation.latitude,

        longitude:
            userLocation.longitude,

        status:
            "Reported",

        createdAt:
            new Date().toISOString()

    };


    console.log(
        "🚨 Incident Created:",
        incident
    );


    alert(
        "🚨 Incident report created successfully!\n\n" +
        "Incident ID: " +
        incident.id
    );


    descriptionElement.value = "";

}


// ============================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ============================================================

window.openLogin =
    openLogin;

window.closeLogin =
    closeLogin;

window.loginUser =
    loginUser;

window.registerUser =
    registerUser;

window.logoutUser =
    logoutUser;

window.startSOS =
    startSOS;

window.scrollToReport =
    scrollToReport;

window.getLocation =
    getLocation;

window.submitIncident =
    submitIncident;