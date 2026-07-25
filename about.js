const story = document.querySelector("[data-about-story]");
const slides = Array.from(document.querySelectorAll("[data-slide]"));
const dots = Array.from(document.querySelectorAll("[data-slide-dot]"));
const backButton = document.querySelector("[data-back-button]");
const progressBar = document.querySelector("[data-about-progress]");
const currentSlideLabel = document.querySelector("[data-current-slide]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = reduceMotion ? "auto" : "smooth";

function formatSlideNumber(index) {
    return String(index + 1).padStart(2, "0");
}

function setActiveSlide(index) {
    dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === index;
        dot.classList.toggle("active", isActive);
        dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (currentSlideLabel) {
        currentSlideLabel.textContent = formatSlideNumber(index);
    }
}

function updateProgress() {
    if (!story || !progressBar) {
        return;
    }

    const maxScroll = Math.max(story.scrollHeight - story.clientHeight, 1);
    const progress = Math.min(Math.max(story.scrollTop / maxScroll, 0), 1);
    progressBar.style.width = `${progress * 100}%`;
}

if (backButton) {
    backButton.addEventListener("click", (event) => {
        const cameFromSameSite = document.referrer && new URL(document.referrer).origin === window.location.origin;

        if (cameFromSameSite && window.history.length > 1) {
            event.preventDefault();
            window.history.back();
        }
    });
}

if (story && slides.length) {
    const slideObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const slideIndex = slides.indexOf(entry.target);

            if (entry.isIntersecting && slideIndex >= 0) {
                entry.target.classList.add("is-visible");
                setActiveSlide(slideIndex);
            }
        });
    }, {
        root: story,
        threshold: 0.5,
    });

    slides.forEach((slide) => slideObserver.observe(slide));

    dots.forEach((dot) => {
        dot.addEventListener("click", () => {
            const slideIndex = Number(dot.dataset.slideDot);
            const slide = slides[slideIndex];

            if (slide) {
                story.scrollTo({
                    top: slide.offsetTop,
                    behavior: scrollBehavior,
                });
            }
        });
    });

    story.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    setActiveSlide(0);
}

const productTabs = Array.from(document.querySelectorAll("[data-company-tab]"));
const productPanels = Array.from(document.querySelectorAll("[data-company-panel]"));

productTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.companyTab;

        productTabs.forEach((item) => {
            const isActive = item === tab;
            item.classList.toggle("active", isActive);
            item.setAttribute("aria-selected", String(isActive));
        });

        productPanels.forEach((panel) => {
            const isActive = panel.dataset.companyPanel === target;
            panel.hidden = !isActive;
            panel.classList.toggle("active", isActive);
        });
    });
});

const processButtons = Array.from(document.querySelectorAll("[data-process-step]"));
const processNumber = document.querySelector("[data-process-number]");
const processTitle = document.querySelector("[data-process-output-title]");
const processText = document.querySelector("[data-process-output-text]");

function setProcessStep(button) {
    processButtons.forEach((item) => item.classList.toggle("active", item === button));

    if (processNumber) {
        processNumber.textContent = button.dataset.processStep;
    }

    if (processTitle) {
        processTitle.textContent = button.dataset.processTitle;
    }

    if (processText) {
        processText.textContent = button.dataset.processText;
    }
}

processButtons.forEach((button) => {
    button.addEventListener("click", () => setProcessStep(button));
});

const supplyRail = document.querySelector("[data-supply-rail]");
const railControls = Array.from(document.querySelectorAll("[data-rail-control]"));

railControls.forEach((button) => {
    button.addEventListener("click", () => {
        if (!supplyRail) {
            return;
        }

        const direction = Number(button.dataset.railControl);
        const distance = supplyRail.clientWidth * 0.82;
        supplyRail.scrollBy({
            left: direction * distance,
            behavior: scrollBehavior,
        });
    });
});
