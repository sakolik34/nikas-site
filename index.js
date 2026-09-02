const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const sidebarLinks = document.querySelectorAll(".sidebar-menu a");
const contactDropdown = document.getElementById("contactDropdown");
const contactButton = document.getElementById("contactButton");
const contactForm = document.getElementById("contactForm");
const contactSubmit = document.getElementById("contactSubmit");
const contactFormMessage = document.getElementById("contactFormMessage");

let contactSending = false;
let contactSuccessTimer = null;

function t(key, params) {
    return window.NikasI18n?.t(key, params) || key;
}

function setContactState(isOpen) {
    if (!contactDropdown || !contactButton) {
        return;
    }

    contactDropdown.classList.toggle("open", isOpen);
    contactButton.setAttribute("aria-expanded", String(isOpen));
}

function setMenuState(isOpen) {
    if (!menuButton || !sidebar || !overlay) {
        return;
    }

    menuButton.classList.toggle("active", isOpen);
    sidebar.classList.toggle("open", isOpen);
    overlay.classList.toggle("show", isOpen);
    overlay.hidden = !isOpen;
    sidebar.setAttribute("aria-hidden", String(!isOpen));
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? t("nav.closeMenu") : t("nav.openMenu"));
}

if (menuButton) {
    menuButton.addEventListener("click", () => {
        setMenuState(!sidebar.classList.contains("open"));
        setContactState(false);
        window.NikasRequest?.setOpen(false);
    });
}

if (overlay) {
    overlay.addEventListener("click", () => {
        setMenuState(false);
    });
}

sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
        setMenuState(false);
    });
});

if (contactButton) {
    contactButton.addEventListener("click", (event) => {
        event.stopPropagation();
        window.NikasRequest?.setOpen(false);
        setContactState(!contactDropdown.classList.contains("open"));
    });
}

document.addEventListener("click", (event) => {
    if (contactDropdown && !contactDropdown.contains(event.target)) {
        setContactState(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setMenuState(false);
        setContactState(false);
    }
});

function setFormMessage(text, type = "") {
    if (!contactFormMessage) {
        return;
    }

    contactFormMessage.textContent = text;
    contactFormMessage.classList.toggle("error", type === "error");
    contactFormMessage.classList.toggle("success", type === "success");
}

function setContactSubmitLabel(key) {
    const label = contactSubmit?.querySelector("span");

    if (label) {
        label.textContent = t(key);
    }
}

function clearContactSuccessTimer() {
    if (!contactSuccessTimer) {
        return;
    }

    window.clearTimeout(contactSuccessTimer);
    contactSuccessTimer = null;
}

function showContactSuccessMessage(result = {}) {
    clearContactSuccessTimer();
    const requestId = String(result?.requestId || "").trim();
    const requestNumber = requestId ? requestId.slice(0, 8).toUpperCase() : "";
    const message = requestNumber
        ? t("form.successWithNumber", { number: requestNumber })
        : t("form.success");

    setFormMessage(message, "success");
    contactSubmit?.classList.add("is-submitted");
    setContactSubmitLabel("form.sent");
    contactSuccessTimer = window.setTimeout(() => {
        contactSuccessTimer = null;
        contactSubmit?.classList.remove("is-submitted");
        updateContactSubmitState();
    }, 7000);
}

function isContactFormReady() {
    if (!contactForm) {
        return false;
    }

    const name = contactForm.elements.name.value.trim();
    const phone = contactForm.elements.phone.value.trim();

    return Boolean(name && phone && contactForm.checkValidity() && !contactSending);
}

function updateContactSubmitState() {
    if (!contactForm || !contactSubmit) {
        return;
    }

    if (contactSuccessTimer) {
        contactSubmit.disabled = true;
        contactSubmit.classList.add("is-submitted");
        setContactSubmitLabel("form.sent");
        return;
    }

    contactSubmit.classList.remove("is-submitted");
    contactSubmit.disabled = !isContactFormReady();

    if (contactSending) {
        setContactSubmitLabel("form.sending");
        setFormMessage(t("form.sending"));
    } else if (contactSubmit.disabled) {
        setContactSubmitLabel("form.submit");
        setFormMessage(t("form.fillRequired"));
    } else {
        setContactSubmitLabel("form.submit");
        setFormMessage(t("form.ready"), "success");
    }
}

function contactFormValues() {
    return {
        name: contactForm.elements.name.value.trim(),
        phone: contactForm.elements.phone.value.trim(),
        email: contactForm.elements.email.value.trim(),
        message: contactForm.elements.question.value.trim(),
        website: contactForm.elements.website?.value.trim() || ""
    };
}

async function handleContactSubmit(event) {
    event.preventDefault();
    updateContactSubmitState();

    if (!contactForm || !contactSubmit || contactSubmit.disabled) {
        return;
    }

    contactSending = true;
    contactSubmit.disabled = true;
    setContactSubmitLabel("form.sending");
    setFormMessage(t("form.sending"));

    let submitted = false;

    try {
        const result = await window.NikasApi.submitContactRequest(contactFormValues());
        contactForm.reset();
        submitted = true;
        showContactSuccessMessage(result);
    } catch (error) {
        clearContactSuccessTimer();
        setFormMessage(error?.message || t("form.error"), "error");
    } finally {
        contactSending = false;
        contactSubmit.disabled = true;

        if (!submitted) {
            updateContactSubmitState();
        }
    }
}

if (contactForm) {
    updateContactSubmitState();
    contactForm.addEventListener("input", () => {
        clearContactSuccessTimer();
        updateContactSubmitState();
    });
    contactForm.addEventListener("submit", handleContactSubmit);
}

window.addEventListener("nikas:languagechange", () => {
    setMenuState(sidebar?.classList.contains("open"));
    if (contactSuccessTimer) {
        setContactSubmitLabel("form.sent");
        setFormMessage(t("form.success"), "success");
        return;
    }
    updateContactSubmitState();
});
