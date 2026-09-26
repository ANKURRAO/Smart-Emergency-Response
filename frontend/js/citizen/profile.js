import { auth, db } from "../firebase.js";

import {
    getUserProfile,
    requireRole,
    updateUserProfile,
    logoutUser
} from "../auth.js";

import {
    $,
    $$,
    showToast,
    setLoading,
    escapeHTML
} from "../common.js";

import {
    ref,
    update
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let currentProfile = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            currentUser =
                await requireRole("citizen");

            if (!currentUser) {
                return;
            }


            await loadProfile();

            setupProfileForm();
            setupLogout();
            setupPasswordInfo();

        } catch (error) {

            console.error(
                "Profile page error:",
                error
            );

            showToast(
                "Profile page load nahi ho saka.",
                "error"
            );

        }

    }
);


async function loadProfile() {

    try {

        currentProfile =
            await getUserProfile(
                currentUser.uid
            );


        if (!currentProfile) {

            currentProfile = {

                uid:
                    currentUser.uid,

                name:
                    currentUser.displayName ||
                    "Citizen",

                email:
                    currentUser.email ||
                    "",

                phone:
                    "",

                role:
                    "citizen"

            };

        }


        renderProfile(
            currentProfile
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Profile data load nahi ho saka.",
            "error"
        );

    }

}


function renderProfile(profile) {

    setInputValue(
        [
            "#name",
            "#fullName",
            "#profileName",
            "[name='name']"
        ],
        profile.name ||
        currentUser.displayName ||
        ""
    );


    setInputValue(
        [
            "#email",
            "#profileEmail",
            "[name='email']"
        ],
        profile.email ||
        currentUser.email ||
        ""
    );


    setInputValue(
        [
            "#phone",
            "#mobile",
            "[name='phone']"
        ],
        profile.phone ||
        ""
    );


    setInputValue(
        [
            "#address",
            "#profileAddress",
            "[name='address']"
        ],
        profile.address ||
        ""
    );


    setText(
        [
            "#profileRole",
            "#userRole"
        ],
        profile.role ||
        "citizen"
    );


    setText(
        [
            "#profileUid",
            "#userId"
        ],
        profile.uid ||
        currentUser.uid
    );


    setAvatar(
        profile.name ||
        currentUser.displayName ||
        "Citizen"
    );

}


function setupProfileForm() {

    const form =
        $("#profileForm") ||
        $("form[data-form='profile']");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await saveProfile(form);

        }
    );

}


async function saveProfile(form) {

    const button =
        form.querySelector(
            "button[type='submit']"
        );


    try {

        if (button) {
            setLoading(
                button,
                true
            );
        }


        const data =
            readProfileForm(
                form
            );


        const validation =
            validateProfile(
                data
            );


        if (!validation.valid) {

            showToast(
                validation.message,
                "error"
            );

            return;
        }


        await updateUserProfile({

            name:
                data.name,

            phone:
                data.phone,

            address:
                data.address,

            updatedAt:
                Date.now()

        });


        currentProfile = {

            ...currentProfile,

            ...data,

            updatedAt:
                Date.now()

        };


        renderProfile(
            currentProfile
        );


        showToast(
            "Profile successfully update ho gaya.",
            "success"
        );


    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        showToast(
            getProfileErrorMessage(
                error
            ),
            "error"
        );


    } finally {

        if (button) {
            setLoading(
                button,
                false
            );
        }

    }

}


function readProfileForm(form) {

    return {

        name:
            getInputValue(
                form,
                [
                    "#name",
                    "#fullName",
                    "#profileName",
                    "[name='name']"
                ]
            ),

        phone:
            getInputValue(
                form,
                [
                    "#phone",
                    "#mobile",
                    "[name='phone']"
                ]
            ),

        address:
            getInputValue(
                form,
                [
                    "#address",
                    "#profileAddress",
                    "[name='address']"
                ]
            )

    };

}


function validateProfile(data) {

    if (!data.name) {

        return {

            valid: false,

            message:
                "Name required hai."

        };

    }


    if (
        data.phone &&
        !/^[0-9+\-\s()]{7,20}$/.test(
            data.phone
        )
    ) {

        return {

            valid: false,

            message:
                "Valid phone number enter karein."

        };

    }


    return {
        valid: true
    };

}


function setupLogout() {

    const buttons = [
        "#logoutBtn",
        "#logoutButton",
        "[data-action='logout']"
    ];


    buttons.forEach(selector => {

        const button =
            $(selector);


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                try {

                    await logoutUser();


                    window.location.href =
                        "../index.html";


                } catch (error) {

                    console.error(
                        error
                    );


                    showToast(
                        "Logout failed.",
                        "error"
                    );

                }

            }
        );

    });

}


function setupPasswordInfo() {

    const buttons = [
        "#changePasswordBtn",
        "#passwordBtn"
    ];


    buttons.forEach(selector => {

        const button =
            $(selector);


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                showToast(
                    "Password change ke liye Firebase Authentication flow add kiya ja sakta hai.",
                    "info"
                );

            }
        );

    });

}


function setInputValue(
    selectors,
    value
) {

    selectors.forEach(selector => {

        const element =
            $(selector);


        if (element) {

            element.value =
                value ?? "";

        }

    });

}


function setText(
    selectors,
    value
) {

    selectors.forEach(selector => {

        const element =
            $(selector);


        if (element) {

            element.textContent =
                value ?? "";

        }

    });

}


function setAvatar(name) {

    const initials =
        String(name || "Citizen")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                word =>
                    word.charAt(0)
            )
            .join("")
            .toUpperCase();


    [
        "#profileAvatar",
        "#userAvatar",
        "[data-user-avatar]"
    ].forEach(selector => {

        const element =
            $(selector);


        if (element) {
            element.textContent =
                initials || "C";
        }

    });

}


function getInputValue(
    form,
    selectors
) {

    for (const selector of selectors) {

        const element =
            form.querySelector(
                selector
            );


        if (element) {
            return element.value.trim();
        }

    }


    return "";

}


function getProfileErrorMessage(
    error
) {

    if (
        error?.code ===
        "auth/requires-recent-login"
    ) {

        return "Security ke liye dobara login karna required hai.";

    }


    if (
        error?.code ===
        "PERMISSION_DENIED"
    ) {

        return "Firebase Database permission denied.";

    }


    return (
        error?.message ||
        "Profile update nahi ho saka."
    );

}