(function () {
    const reviewsGrid = document.getElementById("reviewsGrid");
    const reviewsEmpty = document.getElementById("reviewsEmpty");
    const reviewDialog = document.getElementById("reviewDialog");
    const reviewForm = document.getElementById("reviewForm");
    const openReviewDialog = document.getElementById("openReviewDialog");
    const closeReviewDialog = document.getElementById("closeReviewDialog");
    const reviewProductId = document.getElementById("reviewProductId");
    const reviewFormMessage = document.getElementById("reviewFormMessage");
    const reviewSubmit = document.getElementById("reviewSubmit");

    if (!reviewsGrid || !reviewDialog || !reviewForm) {
        return;
    }

    let products = [];
    let reviews = [];
    let submissionKey = "";

    function t(key, params) {
        return window.NikasI18n?.t(key, params) || key;
    }

    function productName(product) {
        return window.NikasI18n?.field(product, "name") || product?.slug || t("reviews.product");
    }

    function setMessage(text, type = "") {
        reviewFormMessage.textContent = text;
        reviewFormMessage.classList.toggle("error", type === "error");
        reviewFormMessage.classList.toggle("success", type === "success");
    }

    function renderProducts() {
        const selectedId = reviewProductId.value;
        reviewProductId.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.selected = !selectedId;
        placeholder.textContent = t("reviews.productPlaceholder");
        reviewProductId.append(placeholder);

        products.forEach((product) => {
            const item = document.createElement("option");
            item.value = product.id;
            item.textContent = productName(product);
            reviewProductId.append(item);
        });

        if (products.some((product) => product.id === selectedId)) {
            reviewProductId.value = selectedId;
        }
    }

    function formatDate(value) {
        const language = window.NikasI18n?.getLanguage?.() || "ru";
        const locale = { uk: "uk-UA", ru: "ru-RU", en: "en-US" }[language] || "ru-RU";

        return new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(new Date(value));
    }

    function starText(rating) {
        const amount = Math.max(1, Math.min(5, Number(rating) || 1));
        return "★".repeat(amount) + "☆".repeat(5 - amount);
    }

    function renderReviews() {
        reviewsGrid.replaceChildren();
        reviewsEmpty.hidden = reviews.length > 0;

        reviews.forEach((review) => {
            const card = document.createElement("article");
            card.className = "review-card";

            const meta = document.createElement("div");
            meta.className = "review-card-meta";
            const product = document.createElement("strong");
            product.textContent = productName(review.product);
            const date = document.createElement("time");
            date.dateTime = review.created_at;
            date.textContent = formatDate(review.created_at);
            meta.append(product, date);

            const rating = document.createElement("p");
            rating.className = "review-stars";
            rating.setAttribute("aria-label", `${t("reviews.ratingLabel")} ${review.rating}/5`);
            rating.textContent = starText(review.rating);

            const body = document.createElement("p");
            body.className = "review-body";
            body.textContent = review.body || t("reviews.noText");

            const author = document.createElement("p");
            author.className = "review-author";
            author.textContent = review.author_name || t("reviews.unknownAuthor");

            card.append(meta, rating, body, author);
            reviewsGrid.append(card);
        });
    }

    async function loadData() {
        try {
            const [catalog, publishedReviews] = await Promise.all([
                window.NikasApi.fetchProducts("all"),
                window.NikasApi.fetchPublishedReviews()
            ]);
            products = catalog.products || [];
            reviews = publishedReviews;
            renderProducts();
            renderReviews();
        } catch (error) {
            reviews = [];
            reviewsEmpty.hidden = false;
            reviewsEmpty.textContent = t("reviews.empty");
            console.error("Could not load reviews", error);
        }
    }

    function closeDialog() {
        reviewDialog.close();
        document.body.classList.remove("modal-open");
    }

    openReviewDialog.addEventListener("click", () => {
        if (!products.length) {
            setMessage(t("reviews.empty"), "error");
            return;
        }

        reviewDialog.showModal();
        document.body.classList.add("modal-open");
        reviewProductId.focus();
    });

    closeReviewDialog.addEventListener("click", closeDialog);
    reviewDialog.addEventListener("click", (event) => {
        if (event.target === reviewDialog) {
            closeDialog();
        }
    });
    reviewDialog.addEventListener("cancel", () => document.body.classList.remove("modal-open"));

    reviewForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!reviewForm.checkValidity()) {
            setMessage(t("reviews.error"), "error");
            reviewForm.reportValidity();
            return;
        }

        reviewSubmit.disabled = true;
        reviewSubmit.textContent = t("reviews.sending");
        setMessage("");

        try {
            if (!submissionKey) {
                submissionKey = window.NikasApi.createIdempotencyKey("review");
            }

            await window.NikasApi.submitReview({
                idempotencyKey: submissionKey,
                productId: reviewForm.elements.productId.value,
                name: reviewForm.elements.name.value,
                rating: reviewForm.elements.rating.value,
                body: reviewForm.elements.body.value,
                website: reviewForm.elements.website.value
            });

            reviewForm.reset();
            submissionKey = "";
            renderProducts();
            setMessage(t("reviews.success"), "success");
            window.setTimeout(closeDialog, 2600);
        } catch (error) {
            setMessage(error?.message || t("reviews.error"), "error");
        } finally {
            reviewSubmit.disabled = false;
            reviewSubmit.textContent = t("reviews.submit");
        }
    });

    window.addEventListener("nikas:languagechange", () => {
        renderProducts();
        renderReviews();
    });

    loadData();
})();
