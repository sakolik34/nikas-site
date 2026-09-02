(function () {
    // Change this to true when the company presentation is ready to return.
    const features = Object.freeze({
        aboutPage: false
    });

    window.NIKAS_SITE_FEATURES = features;

    if (!features.aboutPage) {
        const style = document.createElement("style");
        style.textContent = '[data-feature="about"] { display: none !important; }';
        document.head.append(style);

        document.addEventListener("DOMContentLoaded", () => {
            document.querySelectorAll('[data-feature="about"]').forEach((element) => {
                element.hidden = true;
            });
        });

        if (location.pathname.endsWith("/about.html")) {
            location.replace("./index.html");
        }
    }
})();
