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
    const reviewRatingOptions = document.getElementById("reviewRatingOptions");
    const reviewsPagination = document.getElementById("reviewsPagination");
    const reviewsPreviousPage = document.getElementById("reviewsPreviousPage");
    const reviewsNextPage = document.getElementById("reviewsNextPage");
    const reviewsPaginationStatus = document.getElementById("reviewsPaginationStatus");

    if (!reviewsGrid || !reviewDialog || !reviewForm) {
        return;
    }

    let products = [];
    let reviews = [];
    let submissionKey = "";
    let selectedRating = 0;
    let currentPage = 1;
    const reviewsPerPage = 6;

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

        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
            ? new Date(`${value}T12:00:00`)
            : new Date(value);

        return new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function starText(rating) {
        const amount = Math.max(0, Math.min(5, Number(rating) || 0));
        return "★".repeat(amount) + "☆".repeat(5 - amount);
    }

    function reviewTraits(value) {
        return Array.isArray(value) ? value.filter(Boolean) : [];
    }

    function reviewTraitLabel(value) {
        const key = {
            current_price: "currentPrice",
            fast_shipping: "fastShipping",
            good_service: "goodService",
            accurate_description: "accurateDescription",
            in_stock: "inStock",
            polite_seller: "politeSeller",
            quick_contact: "quickContact",
            not_shipped: "notShipped",
            higher_price: "higherPrice",
            out_of_stock: "outOfStock",
            no_contact: "noContact",
            different_from_description: "differentFromDescription",
            slow_shipping: "slowShipping",
            rude_seller: "rudeSeller"
        }[value];

        return key ? t(`reviews.trait.${key}`) : value;
    }

    function paintRating(value) {
        reviewRatingOptions?.querySelectorAll("label").forEach((label, index) => {
            label.classList.toggle("is-lit", index < value);
        });
    }

    function renderReviews() {
        reviewsGrid.replaceChildren();
        reviewsEmpty.hidden = reviews.length > 0;

        const totalPages = Math.max(1, Math.ceil(reviews.length / reviewsPerPage));
        currentPage = Math.min(currentPage, totalPages);
        const start = (currentPage - 1) * reviewsPerPage;
        const pageReviews = reviews.slice(start, start + reviewsPerPage);

        if (reviewsPagination) {
            reviewsPagination.hidden = reviews.length <= reviewsPerPage;
            reviewsPreviousPage.disabled = currentPage === 1;
            reviewsNextPage.disabled = currentPage === totalPages;
            reviewsPaginationStatus.textContent = t("reviews.pageStatus", {
                current: currentPage,
                total: totalPages
            });
        }

        pageReviews.forEach((review) => {
            const card = document.createElement("article");
            card.className = "review-card";

            const meta = document.createElement("div");
            meta.className = "review-card-meta";
            const product = document.createElement("strong");
            product.textContent = productName(review.product);
            const date = document.createElement("time");
            date.dateTime = review.review_date || review.created_at;
            date.textContent = formatDate(review.review_date || review.created_at);
            meta.append(product, date);

            const rating = document.createElement("p");
            rating.className = "review-stars";
            rating.hidden = !review.rating;
            rating.setAttribute("aria-label", `${t("reviews.ratingLabel")} ${review.rating || 0}/5`);
            rating.textContent = starText(review.rating);

            const body = document.createElement("p");
            body.className = "review-body";
            body.textContent = review.body || t("reviews.noText");

            const traits = reviewTraits(review.review_traits);
            const traitList = document.createElement("ul");
            traitList.className = "review-traits";
            traitList.hidden = traits.length === 0;
            traits.forEach((trait) => {
                const item = document.createElement("li");
                item.textContent = reviewTraitLabel(trait);
                traitList.append(item);
            });

            const author = document.createElement("p");
            author.className = "review-author";
            author.textContent = review.author_name || t("reviews.unknownAuthor");

            card.append(meta, rating, body, traitList, author);
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
            currentPage = 1;
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

    reviewRatingOptions?.querySelectorAll("label").forEach((label) => {
        const input = label.querySelector("input");
        const rating = Number(input?.value || 0);

        label.addEventListener("pointerenter", () => paintRating(rating));
        label.addEventListener("click", () => {
            selectedRating = rating;
            paintRating(selectedRating);
        });
        input?.addEventListener("change", () => {
            selectedRating = Number(input.value);
            paintRating(selectedRating);
        });
    });
    reviewRatingOptions?.addEventListener("pointerleave", () => paintRating(selectedRating));

    reviewsPreviousPage?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderReviews();
        }
    });

    reviewsNextPage?.addEventListener("click", () => {
        const totalPages = Math.ceil(reviews.length / reviewsPerPage);
        if (currentPage < totalPages) {
            currentPage += 1;
            renderReviews();
        }
    });

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
                traits: Array.from(reviewForm.querySelectorAll('input[name="traits"]:checked'), (input) => input.value),
                website: reviewForm.elements.website.value
            });

            reviewForm.reset();
            submissionKey = "";
            selectedRating = 0;
            paintRating(0);
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
