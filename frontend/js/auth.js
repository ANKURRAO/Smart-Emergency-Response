
// =========================================================
// SMART EMERGENCY RESPONSE
// AUTHENTICATION MODULE
// =========================================================

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    ref,
    set,
    get,
    update
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// =========================================================
// CONSTANTS
// =========================================================

const USER_PATH = "users";

// Fields that users must never change through profile updates.
const PROTECTED_FIELDS = [
    "uid",
    "role",
    "approved",
    "isAdmin",
    "permissions",
    "available",
    "availability",
    "responderId",
    "currentIncidentId",
    "createdAt",
    "updatedAt"
];

// =========================================================
// REGISTER USER
// Public registration is restricted to citizens.
// =========================================================

async function registerUser({
    name,
    email,
    password,
    role = "citizen",
    phone = "",
    department = "",
    vehicle = ""
}) {
    try {
        if (!name || !email || !password) {
            throw new Error("Name, email and password are required.");
        }

        if (password.length < 6) {
            throw new Error(
                "Password must contain at least 6 characters."
            );
        }

        // SECURITY: Public signup can only create citizens.
        role = "citizen";

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        await updateProfile(user, {
            displayName: name
        });

        const userData = {
            uid: user.uid,
            name: name,
            email: user.email,
            role: "citizen",
            phone: phone,
            department: department,
            vehicle: vehicle,
            available: false,
            latitude: null,
            longitude: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await set(
            ref(db, `${USER_PATH}/${user.uid}`),
            userData
        );

        return {
            success: true,
            user: user,
            data: userData
        };

    } catch (error) {
        console.error("Registration error:", error);

        return {
            success: false,
            error: getAuthErrorMessage(error)
        };
    }
}

// =========================================================
// LOGIN USER
// =========================================================

async function loginUser(email, password) {
    try {
        if (!email || !password) {
            throw new Error(
                "Email and password are required."
            );
        }

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        const snapshot = await get(
            ref(db, `${USER_PATH}/${user.uid}`)
        );

        let profile = null;

        if (snapshot.exists()) {
            profile = snapshot.val();
        }

        return {
            success: true,
            user: user,
            profile: profile
        };

    } catch (error) {
        console.error("Login error:", error);

        return {
            success: false,
            error: getAuthErrorMessage(error)
        };
    }
}

// =========================================================
// LOGOUT
// =========================================================

async function logoutUser() {
    try {
        await signOut(auth);

        return {
            success: true
        };

    } catch (error) {
        console.error("Logout error:", error);

        return {
            success: false,
            error: getAuthErrorMessage(error)
        };
    }
}

// =========================================================
// GET CURRENT FIREBASE USER
// =========================================================

function getCurrentUser() {
    return auth.currentUser;
}

// =========================================================
// GET USER PROFILE FROM DATABASE
// =========================================================

async function getUserProfile(uid = null) {
    try {
        const user = auth.currentUser;
        const userId = uid || user?.uid;

        if (!userId) {
            return null;
        }

        const snapshot = await get(
            ref(db, `${USER_PATH}/${userId}`)
        );

        if (!snapshot.exists()) {
            return null;
        }

        return snapshot.val();

    } catch (error) {
        console.error("Profile fetch error:", error);
        return null;
    }
}

// =========================================================
// GET CURRENT USER ROLE
// =========================================================

async function getCurrentUserRole() {
    const profile = await getUserProfile();

    return profile?.role || null;
}

// =========================================================
// CHECK ROLE
// =========================================================

async function hasRole(requiredRole) {
    const role = await getCurrentUserRole();

    return role === requiredRole;
}

// =========================================================
// CHECK MULTIPLE ROLES
// =========================================================

async function hasAnyRole(roles = []) {
    const role = await getCurrentUserRole();

    return roles.includes(role);
}

// =========================================================
// AUTH STATE LISTENER
// =========================================================

function observeAuthState(callback) {
    return onAuthStateChanged(
        auth,
        async (user) => {
            if (!user) {
                callback({
                    loggedIn: false,
                    user: null,
                    profile: null,
                    role: null
                });

                return;
            }

            const profile = await getUserProfile(user.uid);

            callback({
                loggedIn: true,
                user: user,
                profile: profile,
                role: profile?.role || null
            });
        }
    );
}

// =========================================================
// REQUIRE LOGIN
// =========================================================

async function requireLogin(
    redirectPage = "../index.html"
) {
    const user = auth.currentUser;

    if (!user) {
        window.location.href = redirectPage;
        return false;
    }

    return true;
}

// =========================================================
// REQUIRE SPECIFIC ROLE
// =========================================================

async function requireRole(
    requiredRole,
    redirectPage = "../index.html"
) {
    const user = auth.currentUser;

    if (!user) {
        window.location.href = redirectPage;
        return false;
    }

    const profile = await getUserProfile(user.uid);

    if (!profile || profile.role !== requiredRole) {
        window.location.href = redirectPage;
        return false;
    }

    return true;
}

// =========================================================
// UPDATE USER PROFILE
// =========================================================

async function updateUserProfile(updates = {}) {
    try {
        const user = auth.currentUser;

        if (!user) {
            throw new Error("User is not logged in.");
        }

        if (
            !updates ||
            typeof updates !== "object" ||
            Array.isArray(updates)
        ) {
            throw new Error("Invalid profile update data.");
        }

        // Remove protected fields from user input.
        const safeUpdates = {};

        for (const [key, value] of Object.entries(updates)) {
            if (
                !PROTECTED_FIELDS.includes(key) &&
                value !== undefined
            ) {
                safeUpdates[key] = value;
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            throw new Error("No valid profile fields to update.");
        }

        safeUpdates.updatedAt = Date.now();

        // Update Realtime Database.
        await update(
            ref(db, `${USER_PATH}/${user.uid}`),
            safeUpdates
        );

        // Update Firebase Auth display name.
        if (safeUpdates.name) {
            await updateProfile(user, {
                displayName: safeUpdates.name
            });
        }

        return {
            success: true
        };

    } catch (error) {
        console.error("Profile update error:", error);

        return {
            success: false,
            error: getAuthErrorMessage(error)
        };
    }
}

// =========================================================
// AUTH ERROR HANDLER
// =========================================================

function getAuthErrorMessage(error) {
    const code = error?.code || "";

    switch (code) {
        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Password is too weak.";

        case "auth/user-not-found":
            return "No account found with this email.";

        case "auth/wrong-password":
            return "Incorrect password.";

        case "auth/invalid-credential":
            return "Invalid email or password.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Please check your internet connection.";

        default:
            return error?.message ||
                "Something went wrong. Please try again.";
    }
}

// =========================================================
// REDIRECT USER BY ROLE
// =========================================================

async function redirectByRole() {
    const role = await getCurrentUserRole();

    if (!role) {
        return false;
    }

    switch (role) {
        case "citizen":
            window.location.href =
                "./citizen/dashboard.html";
            break;

        case "responder":
            window.location.href =
                "./responder/dashboard.html";
            break;

        case "admin":
            window.location.href =
                "./admin/dashboard.html";
            break;

        default:
            console.warn("Unknown user role:", role);
            return false;
    }

    return true;
}

// =========================================================
// EXPORT
// =========================================================

export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getUserProfile,
    getCurrentUserRole,
    hasRole,
    hasAnyRole,
    observeAuthState,
    requireLogin,
    requireRole,
    updateUserProfile,
    getAuthErrorMessage,
    redirectByRole
};
