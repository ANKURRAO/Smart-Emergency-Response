import { auth, db } from "./firebase-config.js";

import {
    ref,
    set
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

    const emailElement =
        document.getElementById("email");

    const passwordElement =
        document.getElementById("password");

    const message =
        document.getElementById("loginMessage");


    if (!emailElement || !passwordElement) {
        return;
    }


    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;


    if (!email || !password) {

        if (message) {
            message.textContent =
                "Please enter email and password.";
        }

        return;
    }


    if (message) {
        message.textContent =
            "Logging in...";
    }


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        if (message) {

            message.textContent =
                "✅ Login successful!";

        }


        alert("✅ Login successful!");


        closeLogin();


    } catch (error) {

        console.error(
            "Login Error:",
            error
        );


        let errorMessage =
            "❌ Login failed.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            errorMessage =
                "❌ Invalid email or password.";

        }


        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            errorMessage =
                "❌ No account found with this email.";

        }


        else if (
            error.code ===
            "auth/wrong-password"
        ) {

            errorMessage =
                "❌ Incorrect password.";

        }


        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            errorMessage =
                "❌ Please enter a valid email.";

        }


        if (message) {

            message.textContent =
                errorMessage;

        }

    }

}


// ============================================================
// FIREBASE REGISTER
// ============================================================

async function registerUser() {

    const emailElement =
        document.getElementById("email");

    const passwordElement =
        document.getElementById("password");

    const message =
        document.getElementById("loginMessage");


    if (!emailElement || !passwordElement) {
        return;
    }


    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;


    if (!email || !password) {

        if (message) {

            message.textContent =
                "Please enter email and password.";

        }

        return;
    }


    if (password.length < 6) {

        if (message) {

            message.textContent =
                "❌ Password must be at least 6 characters.";

        }

        return;
    }


    if (message) {

        message.textContent =
            "Creating account...";

    }


    try {

        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = auth.currentUser;

await set(ref(db, "users/" + user.uid), {
    email: email,
    role: "citizen",
    createdAt: new Date().toISOString()
});


        if (message) {

            message.textContent =
                "✅ Account created successfully!";

        }


        alert(
            "✅ Account created successfully!"
        );


        closeLogin();


    } catch (error) {

        console.error(
            "Registration Error:",
            error
        );


        let errorMessage =
            "❌ Unable to create account.";


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            errorMessage =
                "❌ An account already exists with this email.";

        }


        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            errorMessage =
                "❌ Please enter a valid email.";

        }


        else if (
            error.code ===
            "auth/weak-password"
        ) {

            errorMessage =
                "❌ Password is too weak.";

        }


        if (message) {

            message.textContent =
                errorMessage;

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