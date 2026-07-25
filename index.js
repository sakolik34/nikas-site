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
        window.NikasCart?.setOpen(false);
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
        window.NikasCart?.setOpen(false);
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

    contactSubmit.disabled = !isContactFormReady();

    if (contactSending) {
        setFormMessage(t("form.sending"));
    } else if (contactSubmit.disabled) {
        setFormMessage(t("form.fillRequired"));
    } else {
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
    setFormMessage(t("form.sending"));

    try {
        await window.NikasApi.submitContactRequest(contactFormValues());
        contactForm.reset();
        setFormMessage(t("form.success"), "success");
    } catch (error) {
        setFormMessage(error?.message || t("form.error"), "error");
    } finally {
        contactSending = false;
        updateContactSubmitState();
    }
}

if (contactForm) {
    updateContactSubmitState();
    contactForm.addEventListener("input", updateContactSubmitState);
    contactForm.addEventListener("submit", handleContactSubmit);
}

window.addEventListener("nikas:languagechange", () => {
    setMenuState(sidebar?.classList.contains("open"));
    updateContactSubmitState();
});
