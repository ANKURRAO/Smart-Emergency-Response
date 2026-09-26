import { auth, db } from "../firebase.js";

import {
    requireRole,
    getUserProfile,
    updateUserProfile,
    logoutUser
} from "../auth.js";

import {
    $,
    $$,
    setText,
    showToast,
    setLoading
} from "../common.js";


import {
    ref,
    update
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


let currentUser = null;
let profile = null;


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


            await loadProfile();
            setupForm();
            setupLogout();

        } catch (error) {

            console.error(error);

            showToast(
                "Profile load nahi ho saka.",
                "error"
            );
        }
    }
);


async function loadProfile() {

    setLoading(true);


    try {

        profile =
            await getUserProfile(
                currentUser.uid
            );


        if (!profile) {

            showToast(
                "Profile data nahi mila.",
                "error"
            );

            return;
        }


        fillProfileForm();
        updateProfileHeader();

    } finally {

        setLoading(false);
    }
}


function fillProfileForm() {

    setValue(
        "#name",
        profile.name ||
        currentUser.displayName ||
        ""
    );


    setValue(
        "#email",
        profile.email ||
        currentUser.email ||
        ""
    );


    setValue(
        "#phone",
        profile.phone ||
        ""
    );


    setValue(
        "#department",
        profile.department ||
        ""
    );


    setValue(
        "#vehicle",
        profile.vehicle ||
        ""
    );


    setValue(
        "#address",
        profile.address ||
        ""
    );


    setValue(
        "#available",
        profile.available === true
            ? "true"
            : "false"
    );


    const availability =
        $("#availability");


    if (
        availability &&
        availability.type === "checkbox"
    ) {

        availability.checked =
            profile.available === true;
    }
}


function updateProfileHeader() {

    const name =
        profile.name ||
        currentUser.displayName ||
        "Responder";


    setText(
        "#profileName",
        name
    );


    setText(
        "#responderName",
        name
    );


    setText(
        "#profileEmail",
        profile.email ||
        currentUser.email ||
        ""
    );


    const avatar =
        $("#profileAvatar") ||
        $("#responderAvatar");


    if (avatar) {

        avatar.textContent =
            getInitials(name);
    }
}


function setupForm() {

    const form =
        $("#profileForm") ||
        $("#responderProfileForm");


    if (!form) return;


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            await saveProfile(
                form
            );
        }
    );


    const availability =
        $("#availability");


    if (
        availability &&
        availability.type === "checkbox"
    ) {

        availability.addEventListener(
            "change",
            () => {

                setAvailabilityValue(
                    availability.checked
                );
            }
        );
    }
}


async function saveProfile(form) {

    const name =
        getValue("#name").trim();


    const phone =
        getValue("#phone").trim();


    const department =
        getValue("#department").trim();


    const vehicle =
        getValue("#vehicle").trim();


    const address =
        getValue("#address").trim();


    let available;


    const checkbox =
        $("#availability");


    if (
        checkbox &&
        checkbox.type === "checkbox"
    ) {

        available =
            checkbox.checked;

    } else {

        available =
            getValue("#available") ===
            "true";
    }


    if (!name) {

        showToast(
            "Name required hai.",
            "error"
        );

        return;
    }


    try {

        setLoading(true);


        await updateUserProfile({

            name,
            phone,
            department,
            vehicle,
            address,
            available

        });


        await update(
            ref(
                db,
                `users/${currentUser.uid}`
            ),
            {
                name,
                phone,
                department,
                vehicle,
                address,
                available,
                updatedAt: Date.now()
            }
        );


        profile = {
            ...profile,
            name,
            phone,
            department,
            vehicle,
            address,
            available
        };


        updateProfileHeader();


        showToast(
            "Profile successfully updated.",
            "success"
        );


    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        showToast(
            "Profile update nahi ho saka.",
            "error"
        );


    } finally {

        setLoading(false);
    }
}


function setAvailabilityValue(
    available
) {

    const select =
        $("#available");


    if (
        select &&
        select.tagName === "SELECT"
    ) {

        select.value =
            available
                ? "true"
                : "false";
    }
}


function setupLogout() {

    $$(
        "[data-action='logout'], #logoutBtn"
    ).forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                try {

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
}


function getValue(selector) {

    const element =
        $(selector);


    return element?.value || "";
}


function setValue(
    selector,
    value
) {

    const element =
        $(selector);


    if (element) {
        element.value = value;
    }
}


function getInitials(name) {

    return name
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