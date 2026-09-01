const params = new URLSearchParams(window.location.search);
const selectedCategoryId = params.get("category") || "all";

const categoryTitle = document.getElementById("categoryTitle");
const categoryDescription = document.getElementById("categoryDescription");
const categoryBadge = document.getElementById("categoryBadge");
const productSectionTitle = document.getElementById("productSectionTitle");
const productCount = document.getElementById("productCount");
const productGrid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");

let pageState = {
    categories: [],
    products: [],
    error: null,
    loading: true
};

let productModal = null;
let activeProduct = null;
let productModalReturnFocus = null;
let syncingProductHistory = false;

function t(key, paramsValue) {
    return window.NikasI18n?.t(key, paramsValue) || key;
}

function field(record, name) {
    return window.NikasI18n?.field(record, name) || "";
}

function localizedValue(value) {
    return window.NikasI18n?.localizedValue(value) || "";
}

function productCountLabel(count) {
    return window.NikasI18n?.plural("product.count", count) || `${count} товаров`;
}

function findCategory() {
    if (selectedCategoryId === "all") {
        return {
            id: "all",
            title: {
                uk: t("category.all.title"),
                ru: t("category.all.title"),
                en: t("category.all.title")
            },
            shortTitle: {
                uk: t("category.all.title"),
                ru: t("category.all.title"),
                en: t("category.all.title")
            },
            description: {
                uk: t("category.all.description"),
                ru: t("category.all.description"),
                en: t("category.all.description")
            }
        };
    }

    return pageState.categories.find((category) => {
        return category.id === selectedCategoryId || category.slug === selectedCategoryId;
    });
}

function findProductCategory(product) {
    return pageState.categories.find((category) => {
        return category.id === product.categoryId || category.slug === product.categoryId;
    });
}

function createTextElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    return element;
}

function createLoadingCard() {
    const card = document.createElement("article");
    card.className = "product-card product-card-loading";
    card.append(createTextElement("p", "", t("product.loading")));
    return card;
}

function getProductId(product) {
    return product.id || `${product.categoryId}:${field(product, "name")}`;
}

function productPackOptions(product) {
    return Array.isArray(product.packOptions)
        ? product.packOptions
            .filter((packOption) => packOption.active !== false)
            .sort((first, second) => (first.displayOrder || 0) - (second.displayOrder || 0))
        : [];
}

function packOptionLabel(packOption) {
    return localizedValue(packOption?.label) || "";
}

function packSummary(product) {
    const options = productPackOptions(product)
        .map(packOptionLabel)
        .filter(Boolean);

    if (options.length) {
        return options.slice(0, 4).join(" / ");
    }

    return field(product, "pack");
}

function selectedPackOption() {
    const checked = productModal?.querySelector("[data-product-pack-option]:checked");

    if (!checked || !activeProduct) {
        return null;
    }

    return productPackOptions(activeProduct).find((packOption) => String(packOption.id) === checked.value) || null;
}

function clampQuantity(value) {
    return Math.max(1, Math.min(999, Math.floor(Number(value) || 1)));
}

function selectedProductQuantity() {
    const input = productModal?.querySelector("[data-product-quantity]");
    return clampQuantity(input?.value);
}

function requestProduct(product, packOption = null, quantity = 1) {
    const selectedPack = packOptionLabel(packOption);
    const productId = getProductId(product);

    return {
        id: packOption ? `${productId}:${packOption.id}` : productId,
        productId,
        slug: product.slug,
        name: product.name,
        pack: selectedPack || product.pack,
        price: product.price,
        shortDescription: product.shortDescription,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        quantity: clampQuantity(quantity)
    };
}

function createProductVisual(product, className = "") {
    const visual = document.createElement("div");
    visual.className = `product-photo ${className}`.trim();

    if (product.imageUrl) {
        const image = document.createElement("img");
        image.src = product.imageUrl;
        image.alt = field(product, "name");
        image.loading = "lazy";
        visual.append(image);

        if (product.imageDisclaimerEnabled) {
            visual.append(createTextElement("span", "product-image-disclaimer", t("product.imageDisclaimer")));
        }
    } else {
        visual.classList.add("product-photo-empty");
        const fallback = createTextElement("span", "product-photo-empty-label", t("product.imageMissing"));
        visual.append(fallback);
    }

    return visual;
}

function brieflyConfirm(button, messageKey, defaultKey) {
    button.textContent = t(messageKey);
    button.classList.add("confirmed");

    window.setTimeout(() => {
        button.textContent = t(defaultKey);
        button.classList.remove("confirmed");
    }, 1800);
}

function createProductCard(product) {
    const productName = field(product, "name");
    const productPack = packSummary(product);
    const hasPackOptions = productPackOptions(product).length > 0;
    const category = findProductCategory(product);

    const card = document.createElement("article");
    card.className = "product-card";

    const openButton = document.createElement("button");
    openButton.className = "product-card-main";
    openButton.type = "button";
    openButton.setAttribute("aria-label", t("product.openDetails", { name: productName }));
    openButton.addEventListener("click", () => openProductModal(product, openButton));

    const body = document.createElement("div");
    body.className = "product-card-body";

    const meta = createTextElement(
        "span",
        "product-meta",
        category ? field(category, "shortTitle") || field(category, "title") : t("category.page.badge")
    );
    const title = createTextElement("h3", "", productName);
    const description = createTextElement(
        "p",
        "product-card-description",
        field(product, "shortDescription") || field(product, "description")
    );

    const details = document.createElement("div");
    details.className = "product-details";

    const packing = document.createElement("span");
    packing.innerHTML = `<b>${t("product.packLabel")}:</b> `;
    packing.append(document.createTextNode(productPack || t("product.packOnRequest")));

    const price = createTextElement("strong", "", field(product, "price") || t("product.priceAvailability"));
    details.append(packing, price);

    const detailsHint = createTextElement("span", "product-open-hint", t("product.details"));
    body.append(meta, title, description, details, detailsHint);
    openButton.append(createProductVisual(product), body);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const addButton = document.createElement("button");
    addButton.className = "mini-button primary-mini";
    addButton.type = "button";
    addButton.textContent = t("cart.add");
    addButton.addEventListener("click", () => {
        if (hasPackOptions) {
            openProductModal(product, addButton);
            return;
        }

        window.NikasRequest?.addItem(requestProduct(product));
        brieflyConfirm(addButton, "cart.added", "cart.add");
    });

    const askButton = document.createElement("button");
    askButton.className = "mini-button";
    askButton.type = "button";
    askButton.textContent = t("cart.ask");
    askButton.addEventListener("click", () => {
        if (hasPackOptions) {
            openProductModal(product, askButton);
            return;
        }

        window.NikasRequest?.askProduct(requestProduct(product), {
            returnFocus: askButton
        });
    });

    actions.append(addButton, askButton);
    card.append(openButton, actions);
    return card;
}

function productImages(product) {
    const images = Array.isArray(product.images)
        ? product.images.filter((image) => image.imageUrl)
        : [];

    if (!images.length && product.imageUrl) {
        return [{
            id: `${getProductId(product)}-primary`,
            imageUrl: product.imageUrl,
            alt: product.name,
            isPrimary: true
        }];
    }

    return images;
}

function productHash(product) {
    return `#product=${encodeURIComponent(product.slug || product.id)}`;
}

function productFromLocation() {
    const match = window.location.hash.match(/^#product=([^&]+)$/);
    const value = match ? decodeURIComponent(match[1]) : "";

    return pageState.products.find((product) => product.slug === value || String(product.id) === value) || null;
}

function closeProductModal({ updateHistory = true } = {}) {
    if (!productModal || productModal.hidden) {
        return;
    }

    productModal.hidden = true;
    document.body.classList.remove("modal-open");
    activeProduct = null;

    if (productModalReturnFocus instanceof HTMLElement) {
        productModalReturnFocus.focus();
    }

    if (updateHistory && /^#product=/.test(window.location.hash)) {
        syncingProductHistory = true;
        window.history.back();
        window.setTimeout(() => {
            syncingProductHistory = false;
        }, 0);
    }
}

function setMainProductImage(url, alt, activeId, index, total) {
    const mainImage = productModal.querySelector("[data-product-main-image]");
    mainImage.src = url;
    mainImage.alt = alt;

    productModal.querySelectorAll("[data-product-thumbnail]").forEach((button) => {
        button.classList.toggle("active", button.dataset.productThumbnail === activeId);
    });

    const counter = productModal.querySelector("[data-product-gallery-counter]");
    if (counter && Number.isInteger(index) && total) {
        counter.textContent = t("product.photoPosition", { current: index + 1, total });
    }
}

function renderProductModal(product) {
    const panel = productModal.querySelector(".product-modal-panel");
    const productName = field(product, "name");
    const productPack = packSummary(product);
    const packOptions = productPackOptions(product);
    const images = productImages(product);

    panel.replaceChildren();

    const closeButton = createTextElement("button", "order-modal-close product-modal-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", t("product.closeDetails"));
    closeButton.addEventListener("click", closeProductModal);

    const layout = document.createElement("div");
    layout.className = "product-modal-layout";

    const gallery = document.createElement("section");
    gallery.className = "product-gallery";
    gallery.setAttribute("aria-label", t("product.gallery"));

    if (images.length) {
        const mainFrame = document.createElement("div");
        mainFrame.className = "product-gallery-main";
        const mainImage = document.createElement("img");
        const firstImage = images[0];
        mainImage.dataset.productMainImage = "true";
        mainImage.src = firstImage.imageUrl;
        mainImage.alt = localizedValue(firstImage.alt) || productName;
        mainFrame.append(mainImage);

        if (product.imageDisclaimerEnabled) {
            mainFrame.append(createTextElement("span", "product-gallery-disclaimer", t("product.imageDisclaimer")));
        }

        const selectImage = (requestedIndex) => {
            const index = (requestedIndex + images.length) % images.length;
            const image = images[index];
            const imageId = String(image.id || index);
            setMainProductImage(
                image.imageUrl,
                localizedValue(image.alt) || productName,
                imageId,
                index,
                images.length
            );
        };

        if (images.length > 1) {
            const controls = document.createElement("div");
            controls.className = "product-gallery-controls";

            const previous = createTextElement("button", "product-gallery-nav", "‹");
            previous.type = "button";
            previous.setAttribute("aria-label", t("product.previousPhoto"));
            previous.addEventListener("click", () => {
                const active = productModal.querySelector("[data-product-thumbnail].active")?.dataset.productThumbnail;
                const current = images.findIndex((image, index) => String(image.id || index) === active);
                selectImage(current - 1);
            });

            const counter = createTextElement("span", "product-gallery-counter", t("product.photoPosition", { current: 1, total: images.length }));
            counter.dataset.productGalleryCounter = "true";

            const next = createTextElement("button", "product-gallery-nav", "›");
            next.type = "button";
            next.setAttribute("aria-label", t("product.nextPhoto"));
            next.addEventListener("click", () => {
                const active = productModal.querySelector("[data-product-thumbnail].active")?.dataset.productThumbnail;
                const current = images.findIndex((image, index) => String(image.id || index) === active);
                selectImage(current + 1);
            });

            controls.append(previous, counter, next);
            mainFrame.append(controls);
        }
        gallery.append(mainFrame);

        if (images.length > 1) {
            const thumbnails = document.createElement("div");
            thumbnails.className = "product-gallery-thumbnails";

            images.forEach((image, index) => {
                const imageId = String(image.id || index);
                const alt = localizedValue(image.alt) || productName;
                const button = document.createElement("button");
                button.type = "button";
                button.dataset.productThumbnail = imageId;
                button.classList.toggle("active", index === 0);
                button.setAttribute("aria-label", t("product.showImage", { number: index + 1 }));

                const thumb = document.createElement("img");
                thumb.src = image.imageUrl;
                thumb.alt = "";
                button.append(thumb);
                button.addEventListener("click", () => {
                    setMainProductImage(image.imageUrl, alt, imageId, index, images.length);
                });
                thumbnails.append(button);
            });

            gallery.append(thumbnails);
        }
    } else {
        gallery.append(createProductVisual(product, "product-gallery-placeholder"));
    }

    const content = document.createElement("section");
    content.className = "product-modal-content";

    const category = findProductCategory(product);
    const eyebrow = createTextElement(
        "p",
        "eyebrow",
        category ? field(category, "title") : t("category.page.badge")
    );
    const title = createTextElement("h2", "", productName);
    title.id = "productModalTitle";
    const lead = createTextElement(
        "p",
        "product-modal-lead",
        field(product, "shortDescription") || field(product, "description")
    );

    const facts = document.createElement("dl");
    facts.className = "product-facts";
    const packTerm = createTextElement("dt", "", t("product.packLabel"));
    const packValue = createTextElement("dd", "", productPack || t("product.packOnRequest"));
    const priceTerm = createTextElement("dt", "", t("product.priceLabel"));
    const priceValue = createTextElement("dd", "", field(product, "price") || t("product.priceAvailability"));
    facts.append(packTerm, packValue, priceTerm, priceValue);

    let packChooser = null;

    if (packOptions.length) {
        packChooser = document.createElement("fieldset");
        packChooser.className = "product-pack-options";

        const legend = createTextElement("legend", "", t("product.packOptionsTitle"));
        const hint = createTextElement("p", "", t("product.packOptionsHint"));
        const choices = document.createElement("div");
        choices.className = "product-pack-option-choices";

        packOptions.forEach((packOption, index) => {
            const label = document.createElement("label");
            label.className = "product-pack-option";

            const input = document.createElement("input");
            input.type = "radio";
            input.name = `pack-option-${getProductId(product)}`;
            input.value = String(packOption.id);
            input.dataset.productPackOption = "true";
            input.checked = index === 0;

            const text = createTextElement("span", "", packOptionLabel(packOption));
            label.append(input, text);
            choices.append(label);
        });

        packChooser.append(legend, hint, choices);
    }

    const quantityBox = document.createElement("section");
    quantityBox.className = "product-request-quantity";

    const quantityTitle = createTextElement("h3", "", t("product.quantityTitle"));
    const quantityHint = createTextElement("p", "", t("product.quantityHint"));

    const quantityControls = document.createElement("div");
    quantityControls.className = "product-quantity-controls";

    const addOneButton = createTextElement("button", "button primary", t("product.quantityAddOne"));
    addOneButton.type = "button";
    addOneButton.addEventListener("click", () => {
        window.NikasRequest?.addItem(requestProduct(product, selectedPackOption(), 1), { open: false });
        brieflyConfirm(addOneButton, "cart.added", "product.quantityAddOne");
    });

    const customQuantity = document.createElement("label");
    customQuantity.className = "product-quantity-custom";

    const quantityLabel = createTextElement("span", "", t("product.quantityCustomLabel"));
    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.inputMode = "numeric";
    quantityInput.min = "1";
    quantityInput.max = "999";
    quantityInput.step = "1";
    quantityInput.value = "1";
    quantityInput.dataset.productQuantity = "true";
    quantityInput.addEventListener("input", () => {
        const cleanValue = quantityInput.value.replace(/[^\d]/g, "").slice(0, 3);
        quantityInput.value = cleanValue;
    });
    quantityInput.addEventListener("blur", () => {
        quantityInput.value = String(clampQuantity(quantityInput.value));
    });

    const addCustomButton = createTextElement("button", "button secondary", t("product.quantityAddCustom"));
    addCustomButton.type = "button";
    addCustomButton.addEventListener("click", () => {
        window.NikasRequest?.addItem(
            requestProduct(product, selectedPackOption(), selectedProductQuantity()),
            { open: false }
        );
        brieflyConfirm(addCustomButton, "cart.added", "product.quantityAddCustom");
    });

    customQuantity.append(quantityLabel, quantityInput);
    quantityControls.append(addOneButton, customQuantity, addCustomButton);
    quantityBox.append(quantityTitle, quantityHint, quantityControls);

    const descriptionTitle = createTextElement("h3", "", t("product.descriptionTitle"));
    const description = createTextElement(
        "p",
        "product-modal-description",
        field(product, "description") || field(product, "shortDescription") || t("product.descriptionMissing")
    );

    const actions = document.createElement("div");
    actions.className = "product-modal-actions";

    const askButton = createTextElement("button", "button secondary", t("cart.ask"));
    askButton.type = "button";
    askButton.addEventListener("click", () => {
        const returnFocus = productModalReturnFocus;
        const packOption = selectedPackOption();
        const quantity = selectedProductQuantity();
        closeProductModal();
        window.NikasRequest?.askProduct(requestProduct(product, packOption, quantity), { returnFocus });
    });

    actions.append(askButton);
    content.append(eyebrow, title, lead);

    if (packChooser) {
        content.append(packChooser);
    }

    content.append(quantityBox, facts, descriptionTitle, description, actions);
    layout.append(gallery, content);
    panel.append(closeButton, layout);
}

function createProductModal() {
    if (productModal) {
        return productModal;
    }

    productModal = document.createElement("div");
    productModal.className = "product-modal";
    productModal.hidden = true;
    productModal.setAttribute("role", "dialog");
    productModal.setAttribute("aria-modal", "true");
    productModal.setAttribute("aria-labelledby", "productModalTitle");

    const panel = document.createElement("div");
    panel.className = "product-modal-panel";
    productModal.append(panel);

    productModal.addEventListener("mousedown", (event) => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });

    document.body.append(productModal);
    return productModal;
}

function openProductModal(product, returnFocus, { updateHistory = true } = {}) {
    createProductModal();

    if (updateHistory && window.location.hash !== productHash(product)) {
        window.history.pushState({ nikasProduct: product.id }, "", `${window.location.pathname}${window.location.search}${productHash(product)}`);
    }

    activeProduct = product;
    productModalReturnFocus = returnFocus || document.activeElement;
    renderProductModal(product);
    productModal.hidden = false;
    document.body.classList.add("modal-open");
    productModal.querySelector(".product-modal-close").focus();
}

function syncProductModalWithLocation() {
    if (syncingProductHistory) {
        return;
    }

    const product = productFromLocation();

    if (product) {
        openProductModal(product, document.activeElement, { updateHistory: false });
        return;
    }

    closeProductModal({ updateHistory: false });
}

function renderCategoryPage() {
    const category = findCategory();
    productGrid.replaceChildren();

    if (pageState.loading) {
        categoryBadge.textContent = t("category.page.badge");
        categoryTitle.textContent = t("category.page.title");
        categoryDescription.textContent = t("category.page.description");
        productSectionTitle.textContent = t("category.page.positions");
        productCount.textContent = t("product.loading");
        emptyState.hidden = true;
        productGrid.append(createLoadingCard());
        return;
    }

    if (!category) {
        categoryTitle.textContent = t("category.notFound.title");
        categoryDescription.textContent = t("category.notFound.description");
        categoryBadge.textContent = t("category.page.badge");
        productSectionTitle.textContent = t("category.notFound.products");
        productCount.textContent = productCountLabel(0);
        emptyState.hidden = false;
        emptyState.textContent = t("product.empty");
        return;
    }

    const products = pageState.products;

    document.title = `${field(category, "title")} - Nikas`;
    categoryTitle.textContent = field(category, "title");
    categoryDescription.textContent = field(category, "description");
    categoryBadge.textContent = selectedCategoryId === "all"
        ? t("category.page.allBadge")
        : t("category.page.sectionBadge");
    productSectionTitle.textContent = field(category, "shortTitle") || field(category, "title");
    productCount.textContent = pageState.error
        ? t("product.loadError")
        : productCountLabel(products.length);
    emptyState.hidden = products.length > 0;
    emptyState.textContent = pageState.error ? t("product.loadError") : t("product.empty");

    products.forEach((product) => {
        productGrid.append(createProductCard(product));
    });
}

async function loadCategoryPage() {
    pageState.loading = true;
    renderCategoryPage();

    try {
        const [categoriesResult, productsResult] = await Promise.all([
            window.NikasApi.fetchCategories(),
            window.NikasApi.fetchProducts(selectedCategoryId)
        ]);

        pageState = {
            categories: categoriesResult.categories,
            products: productsResult.products,
            error: null,
            loading: false
        };
    } catch (error) {
        const fallback = window.NIKAS_FALLBACK_CATALOG || { categories: [], products: [] };
        pageState = {
            categories: fallback.categories.map(window.NikasApi.normalizeCategory),
            products: fallback.products
                .filter((product) => selectedCategoryId === "all" || product.categoryId === selectedCategoryId)
                .map(window.NikasApi.normalizeProduct),
            error,
            loading: false
        };
    }

    renderCategoryPage();
    syncProductModalWithLocation();
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeProductModal();
    }
});

window.addEventListener("nikas:languagechange", () => {
    renderCategoryPage();

    if (activeProduct && productModal && !productModal.hidden) {
        renderProductModal(activeProduct);
    }
});

window.addEventListener("popstate", syncProductModalWithLocation);

loadCategoryPage();
