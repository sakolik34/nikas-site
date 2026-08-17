const REQUEST_STORAGE_KEY = "nikas-request";
const LEGACY_CART_STORAGE_KEY = "nikas-cart";

const cartDropdown = document.getElementById("cartDropdown");
const cartButton = document.getElementById("cartButton");
const cartMenu = document.getElementById("cartMenu");
const cartCount = document.getElementById("cartCount");
const cartSummary = document.getElementById("cartSummary");
const cartEmpty = document.getElementById("cartEmpty");
const cartList = document.getElementById("cartList");
const cartClear = document.getElementById("cartClear");
const cartOrderLink = document.getElementById("cartOrderLink");

let orderModal = null;
let orderForm = null;
let orderMessage = null;
let orderSubmit = null;
let orderItemsList = null;
let orderSuccess = null;
let orderFormLayout = null;
let orderSending = false;
let returnFocusElement = null;

function clampQuantity(value) {
    return Math.max(1, Math.min(999, Math.floor(Number(value) || 1)));
}

function i18n() {
    return window.NikasI18n;
}

function t(key, params) {
    return i18n()?.t(key, params) || key;
}

function normalizeRequestItem(item) {
    if (!item || !(item.id || item.productId || item.slug)) {
        return null;
    }

    const id = String(item.id || item.productId || item.slug);

    return {
        id,
        productId: item.productId || item.id || "",
        slug: item.slug || "",
        categoryId: item.categoryId || item.category_id || "",
        name: item.name || item.nameSnapshot || "",
        pack: item.pack || "",
        price: item.price || "",
        shortDescription: item.shortDescription || "",
        imageUrl: item.imageUrl || "",
        quantity: clampQuantity(item.quantity)
    };
}

function migrateLegacyRequest() {
    if (localStorage.getItem(REQUEST_STORAGE_KEY) || !localStorage.getItem(LEGACY_CART_STORAGE_KEY)) {
        return;
    }

    localStorage.setItem(REQUEST_STORAGE_KEY, localStorage.getItem(LEGACY_CART_STORAGE_KEY));
}

function readRequest() {
    migrateLegacyRequest();

    try {
        const savedRequest = JSON.parse(localStorage.getItem(REQUEST_STORAGE_KEY));
        return Array.isArray(savedRequest)
            ? savedRequest.map(normalizeRequestItem).filter(Boolean)
            : [];
    } catch {
        return [];
    }
}

function saveRequest(items) {
    const normalizedItems = items.map(normalizeRequestItem).filter(Boolean);
    localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(normalizedItems));
    window.dispatchEvent(new CustomEvent("nikas:requestchange", {
        detail: { items: normalizedItems }
    }));
}

function getRequestCount(items) {
    return items.reduce((total, item) => total + item.quantity, 0);
}

function getLocalizedItemValue(value) {
    const localized = i18n()?.localizedValue(value);

    if (localized) {
        return localized;
    }

    return value && typeof value !== "object" ? String(value) : "";
}

function getItemName(item) {
    return getLocalizedItemValue(item.name);
}

function getItemPack(item) {
    return getLocalizedItemValue(item.pack);
}

function getItemPrice(item) {
    return getLocalizedItemValue(item.price);
}

function getPluralLabel(count) {
    return i18n()?.plural("cart.items", count) || `${count} товаров`;
}

function setRequestState(isOpen) {
    if (!cartDropdown || !cartButton) {
        return;
    }

    cartDropdown.classList.toggle("open", isOpen);
    cartButton.setAttribute("aria-expanded", String(isOpen));
    cartButton.setAttribute("aria-label", isOpen ? t("cart.close") : t("cart.open"));
}

function createText(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className || "";
    element.textContent = text;
    return element;
}

function createItemImage(item, className) {
    const frame = document.createElement("div");
    frame.className = className;

    if (item.imageUrl) {
        const image = document.createElement("img");
        image.src = item.imageUrl;
        image.alt = "";
        image.loading = "lazy";
        frame.append(image);
    } else {
        const letter = createText("span", "", getItemName(item).slice(0, 1).toUpperCase() || "N");
        frame.append(letter);
    }

    return frame;
}

function createQuantityControl(item, context = "menu") {
    const controls = document.createElement("div");
    controls.className = "cart-item-controls";

    const minusButton = document.createElement("button");
    minusButton.type = "button";
    minusButton.textContent = "−";
    minusButton.setAttribute("aria-label", t("cart.decrease", { name: getItemName(item) }));
    minusButton.dataset.requestAction = "decrease";
    minusButton.dataset.requestId = item.id;

    const quantity = createText("span", "cart-item-quantity", String(item.quantity));
    quantity.setAttribute("aria-label", t("cart.quantity"));

    const plusButton = document.createElement("button");
    plusButton.type = "button";
    plusButton.textContent = "+";
    plusButton.setAttribute("aria-label", t("cart.increase", { name: getItemName(item) }));
    plusButton.dataset.requestAction = "increase";
    plusButton.dataset.requestId = item.id;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "cart-remove";
    removeButton.textContent = context === "modal" ? "×" : t("cart.remove");
    removeButton.setAttribute("aria-label", t("cart.removeItem", { name: getItemName(item) }));
    removeButton.dataset.requestAction = "remove";
    removeButton.dataset.requestId = item.id;

    controls.append(minusButton, quantity, plusButton, removeButton);
    return controls;
}

function renderRequestMenu() {
    if (!cartDropdown) {
        return;
    }

    const items = readRequest();
    const count = getRequestCount(items);

    cartCount.textContent = String(count);
    cartCount.hidden = count === 0;
    cartSummary.textContent = getPluralLabel(count);
    cartEmpty.hidden = items.length > 0;
    cartList.replaceChildren();

    items.forEach((item) => {
        const row = document.createElement("article");
        row.className = "cart-item";

        const top = document.createElement("div");
        top.className = "cart-item-main";

        const info = document.createElement("div");
        info.className = "cart-item-info";
        info.append(createText("strong", "", getItemName(item)));

        if (getItemPack(item)) {
            info.append(createText("span", "", getItemPack(item)));
        }

        info.append(createText("span", "cart-item-price", getItemPrice(item) || t("product.priceAvailability")));

        top.append(createItemImage(item, "cart-item-image"), info);
        row.append(top, createQuantityControl(item));
        cartList.append(row);
    });

    cartClear.hidden = items.length === 0;
    cartOrderLink.hidden = items.length === 0;
    cartOrderLink.textContent = t("cart.order");
}

function setOrderMessage(text, type = "") {
    if (!orderMessage) {
        return;
    }

    orderMessage.textContent = text;
    orderMessage.classList.toggle("error", type === "error");
    orderMessage.classList.toggle("success", type === "success");
}

function createField({
    labelKey,
    name,
    type = "text",
    required = false,
    autocomplete = "",
    placeholderKey = ""
}) {
    const label = document.createElement("label");
    const span = createText("span", "", t(labelKey));
    span.dataset.i18n = labelKey;

    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.required = required;

    if (required) {
        input.setAttribute("aria-required", "true");
    }

    if (autocomplete) {
        input.autocomplete = autocomplete;
    }

    if (placeholderKey) {
        input.placeholder = t(placeholderKey);
        input.dataset.i18nPlaceholder = placeholderKey;
    }

    if (name === "name") {
        input.minLength = 2;
        input.maxLength = 120;
    }

    if (name === "phone") {
        input.minLength = 5;
        input.maxLength = 40;
        input.inputMode = "tel";
    }

    label.append(span, input);
    return label;
}

function renderOrderItems() {
    if (!orderItemsList) {
        return;
    }

    orderItemsList.replaceChildren();

    readRequest().forEach((item) => {
        const row = document.createElement("li");
        row.className = "order-item";

        const main = document.createElement("div");
        main.className = "order-item-main";

        const info = document.createElement("div");
        info.className = "order-item-info";
        info.append(createText("strong", "", getItemName(item)));

        if (getItemPack(item)) {
            info.append(createText("span", "", getItemPack(item)));
        }

        info.append(createText("span", "cart-item-price", getItemPrice(item) || t("product.priceAvailability")));

        main.append(createItemImage(item, "order-item-image"), info);
        row.append(main, createQuantityControl(item, "modal"));
        orderItemsList.append(row);
    });
}

function setOrderSubmitState(options = {}) {
    if (!orderForm || !orderSubmit || orderSending || !orderSuccess?.hidden) {
        return;
    }

    const updateMessage = options.updateMessage !== false;
    const name = orderForm.elements.name.value.trim();
    const phone = orderForm.elements.phone.value.trim();
    const items = readRequest();
    const ready = Boolean(name && phone && items.length && orderForm.checkValidity());

    orderSubmit.disabled = !ready;

    if (!updateMessage) {
        return;
    }

    if (!items.length) {
        setOrderMessage(t("cart.empty"), "error");
    } else if (!name || !phone) {
        setOrderMessage(t("form.fillRequired"));
    } else if (!orderForm.checkValidity()) {
        setOrderMessage(t("form.checkFields"), "error");
    } else {
        setOrderMessage(t("form.ready"), "success");
    }
}

function resetOrderSuccess() {
    if (!orderSuccess || !orderFormLayout) {
        return;
    }

    orderSuccess.hidden = true;
    orderFormLayout.hidden = false;
}

function showOrderSuccess(result) {
    if (!orderSuccess || !orderFormLayout) {
        return;
    }

    orderFormLayout.hidden = true;
    orderSuccess.hidden = false;

    const requestId = result?.requestId || "";
    const number = requestId ? requestId.slice(0, 8).toUpperCase() : "";
    const numberElement = orderSuccess.querySelector("[data-request-number]");
    numberElement.textContent = number ? t("cart.requestNumber", { number }) : "";
    numberElement.hidden = !number;
    orderSuccess.querySelector("button").focus();
}

function createOrderModal() {
    if (orderModal) {
        return orderModal;
    }

    orderModal = document.createElement("div");
    orderModal.className = "order-modal";
    orderModal.hidden = true;
    orderModal.setAttribute("role", "dialog");
    orderModal.setAttribute("aria-modal", "true");
    orderModal.setAttribute("aria-labelledby", "orderModalTitle");

    const panel = document.createElement("div");
    panel.className = "order-modal-panel request-modal-panel";

    const closeButton = document.createElement("button");
    closeButton.className = "order-modal-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", t("cart.closeModal"));
    closeButton.dataset.i18nAriaLabel = "cart.closeModal";
    closeButton.addEventListener("click", closeOrderModal);

    const heading = document.createElement("header");
    heading.className = "request-modal-heading";

    const eyebrow = createText("p", "eyebrow", t("cart.requestEyebrow"));
    eyebrow.dataset.i18n = "cart.requestEyebrow";

    const title = createText("h2", "", t("cart.orderTitle"));
    title.id = "orderModalTitle";
    title.dataset.i18n = "cart.orderTitle";

    const intro = createText("p", "order-modal-intro", t("cart.orderIntro"));
    intro.dataset.i18n = "cart.orderIntro";
    heading.append(eyebrow, title, intro);

    orderFormLayout = document.createElement("div");
    orderFormLayout.className = "request-modal-layout";

    const summary = document.createElement("section");
    summary.className = "request-summary";

    const itemsHeading = document.createElement("div");
    itemsHeading.className = "request-summary-heading";
    const itemsTitle = createText("h3", "", t("cart.orderItems"));
    itemsTitle.dataset.i18n = "cart.orderItems";
    const itemsHint = createText("p", "", t("cart.quantityHint"));
    itemsHint.dataset.i18n = "cart.quantityHint";
    itemsHeading.append(itemsTitle, itemsHint);

    orderItemsList = document.createElement("ul");
    orderItemsList.className = "order-items-list";
    orderItemsList.addEventListener("click", handleRequestAction);

    summary.append(itemsHeading, orderItemsList);

    orderForm = document.createElement("form");
    orderForm.className = "contact-form order-form";
    orderForm.noValidate = true;

    const nameField = createField({
        labelKey: "form.name",
        name: "name",
        required: true,
        autocomplete: "name",
        placeholderKey: "form.namePlaceholder"
    });
    const phoneField = createField({
        labelKey: "form.phone",
        name: "phone",
        type: "tel",
        required: true,
        autocomplete: "tel",
        placeholderKey: "form.phonePlaceholder"
    });
    const emailField = createField({
        labelKey: "form.email",
        name: "email",
        type: "email",
        autocomplete: "email",
        placeholderKey: "form.emailPlaceholder"
    });

    const commentLabel = document.createElement("label");
    commentLabel.className = "contact-form-wide";
    const commentSpan = createText("span", "", t("cart.orderComment"));
    commentSpan.dataset.i18n = "cart.orderComment";
    const comment = document.createElement("textarea");
    comment.name = "comment";
    comment.rows = 5;
    comment.maxLength = 2000;
    comment.placeholder = t("cart.orderCommentPlaceholder");
    comment.dataset.i18nPlaceholder = "cart.orderCommentPlaceholder";
    commentLabel.append(commentSpan, comment);

    const honeypot = document.createElement("label");
    honeypot.className = "form-honeypot";
    honeypot.setAttribute("aria-hidden", "true");
    const honeypotText = createText("span", "", t("form.honeypot"));
    const honeypotInput = document.createElement("input");
    honeypotInput.name = "website";
    honeypotInput.type = "text";
    honeypotInput.tabIndex = -1;
    honeypotInput.autocomplete = "off";
    honeypot.append(honeypotText, honeypotInput);

    orderMessage = document.createElement("p");
    orderMessage.className = "form-message contact-form-wide";
    orderMessage.setAttribute("aria-live", "polite");

    const privacy = createText("p", "request-privacy contact-form-wide", t("cart.privacy"));
    privacy.dataset.i18n = "cart.privacy";

    orderSubmit = document.createElement("button");
    orderSubmit.className = "button primary contact-submit contact-form-wide";
    orderSubmit.type = "submit";
    orderSubmit.textContent = t("cart.submitOrder");
    orderSubmit.dataset.i18n = "cart.submitOrder";
    orderSubmit.disabled = true;

    orderForm.append(
        nameField,
        phoneField,
        emailField,
        commentLabel,
        honeypot,
        orderMessage,
        privacy,
        orderSubmit
    );
    orderForm.addEventListener("input", setOrderSubmitState);
    orderForm.addEventListener("submit", handleOrderSubmit);

    orderFormLayout.append(summary, orderForm);

    orderSuccess = document.createElement("section");
    orderSuccess.className = "request-success";
    orderSuccess.hidden = true;
    orderSuccess.innerHTML = `
        <span class="request-success-icon" aria-hidden="true">✓</span>
        <h3 data-i18n="cart.successTitle">${t("cart.successTitle")}</h3>
        <p data-i18n="cart.orderSuccess">${t("cart.orderSuccess")}</p>
        <strong data-request-number></strong>
    `;
    const successClose = createText("button", "button primary", t("cart.successClose"));
    successClose.type = "button";
    successClose.dataset.i18n = "cart.successClose";
    successClose.addEventListener("click", closeOrderModal);
    orderSuccess.append(successClose);

    panel.append(closeButton, heading, orderFormLayout, orderSuccess);
    orderModal.append(panel);
    orderModal.addEventListener("mousedown", (event) => {
        if (event.target === orderModal) {
            closeOrderModal();
        }
    });
    document.body.append(orderModal);

    return orderModal;
}

function openOrderModal(options = {}) {
    if (readRequest().length === 0) {
        setRequestState(true);
        return;
    }

    const modal = createOrderModal();
    returnFocusElement = options.returnFocus || document.activeElement;
    resetOrderSuccess();
    renderOrderItems();

    if (options.comment && !orderForm.elements.comment.value.trim()) {
        orderForm.elements.comment.value = options.comment;
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");
    setRequestState(false);
    setOrderSubmitState();

    const focusTarget = options.focusComment
        ? orderForm.elements.comment
        : orderForm.elements.name;
    focusTarget.focus();
}

function closeOrderModal() {
    if (!orderModal || orderSending) {
        return;
    }

    orderModal.hidden = true;
    document.body.classList.remove("modal-open");

    if (!orderSuccess?.hidden) {
        orderForm.reset();
        resetOrderSuccess();
    }

    if (returnFocusElement instanceof HTMLElement) {
        returnFocusElement.focus();
    }
}

function serializeOrderItems(items) {
    return items.map((item, index) => ({
        productId: item.productId,
        productSlug: item.slug,
        categoryId: item.categoryId,
        name: getItemName(item),
        pack: getItemPack(item),
        price: getItemPrice(item),
        quantity: item.quantity,
        displayOrder: index
    }));
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    setOrderSubmitState();

    if (!orderForm || orderSubmit.disabled) {
        return;
    }

    orderSending = true;
    orderSubmit.disabled = true;
    orderSubmit.textContent = t("form.sending");
    setOrderMessage(t("form.sending"));

    const items = readRequest();
    let result = null;

    try {
        result = await window.NikasApi.submitProductRequest({
            name: orderForm.elements.name.value.trim(),
            phone: orderForm.elements.phone.value.trim(),
            email: orderForm.elements.email.value.trim(),
            comment: orderForm.elements.comment.value.trim(),
            website: orderForm.elements.website.value.trim(),
            items: serializeOrderItems(items)
        });

        clearRequest({ closeMenu: true });
        showOrderSuccess(result);
    } catch (error) {
        setOrderMessage(error?.message || t("cart.orderError"), "error");
    } finally {
        orderSending = false;
        orderSubmit.textContent = t("cart.submitOrder");

        if (!result) {
            setOrderSubmitState({ updateMessage: false });
        }
    }
}

function addItem(product, options = {}) {
    const normalizedProduct = normalizeRequestItem(product);

    if (!normalizedProduct) {
        return;
    }

    const increment = options.increment !== false;
    const items = readRequest();
    const existingItem = items.find((item) => item.id === normalizedProduct.id);
    const addedQuantity = clampQuantity(normalizedProduct.quantity);

    if (existingItem) {
        if (options.replaceQuantity) {
            existingItem.quantity = addedQuantity;
        } else if (increment) {
            existingItem.quantity = Math.min(999, existingItem.quantity + addedQuantity);
        } else {
            existingItem.quantity = Math.max(existingItem.quantity, addedQuantity);
        }
    } else {
        items.push(normalizedProduct);
    }

    saveRequest(items);
    renderRequestMenu();
    renderOrderItems();

    if (options.open !== false) {
        setRequestState(true);
    }
}

function askProduct(product, options = {}) {
    const item = normalizeRequestItem(product);

    if (!item) {
        return;
    }

    addItem(item, { increment: false, open: false, replaceQuantity: true });
    openOrderModal({
        comment: t("cart.askPrefill", { name: getItemName(item) }),
        focusComment: true,
        returnFocus: options.returnFocus
    });
}

function changeItemQuantity(id, delta) {
    const items = readRequest()
        .map((item) => item.id === id
            ? { ...item, quantity: Math.max(0, Math.min(999, item.quantity + delta)) }
            : item)
        .filter((item) => item.quantity > 0);

    saveRequest(items);
    renderRequestMenu();
    renderOrderItems();

    if (!items.length && orderModal && !orderModal.hidden) {
        closeOrderModal();
        setRequestState(true);
    } else {
        setOrderSubmitState();
    }
}

function removeItem(id) {
    saveRequest(readRequest().filter((item) => item.id !== id));
    renderRequestMenu();
    renderOrderItems();

    if (!readRequest().length && orderModal && !orderModal.hidden) {
        closeOrderModal();
        setRequestState(true);
    } else {
        setOrderSubmitState();
    }
}

function clearRequest(options = {}) {
    saveRequest([]);
    renderRequestMenu();
    renderOrderItems();

    if (options.closeMenu !== false) {
        setRequestState(false);
    }
}

function handleRequestAction(event) {
    const button = event.target.closest("[data-request-action]");

    if (!button) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const id = button.dataset.requestId;
    const action = button.dataset.requestAction;

    if (action === "increase") {
        changeItemQuantity(id, 1);
    } else if (action === "decrease") {
        changeItemQuantity(id, -1);
    } else if (action === "remove") {
        removeItem(id);
    }
}

if (cartButton) {
    cartButton.addEventListener("click", (event) => {
        event.stopPropagation();
        document.getElementById("contactDropdown")?.classList.remove("open");
        document.getElementById("contactButton")?.setAttribute("aria-expanded", "false");
        setRequestState(!cartDropdown.classList.contains("open"));
    });
}

cartMenu?.addEventListener("click", (event) => event.stopPropagation());
cartList?.addEventListener("click", handleRequestAction);

cartClear?.addEventListener("click", (event) => {
    event.stopPropagation();
    clearRequest();
});

cartOrderLink?.addEventListener("click", (event) => {
    event.stopPropagation();
    openOrderModal({ returnFocus: cartOrderLink });
});

document.addEventListener("click", (event) => {
    if (cartDropdown && !cartDropdown.contains(event.target)) {
        setRequestState(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setRequestState(false);
        closeOrderModal();
    }
});

window.addEventListener("nikas:languagechange", () => {
    renderRequestMenu();
    renderOrderItems();

    if (orderModal) {
        i18n()?.applyTranslations(orderModal);
        setOrderSubmitState();
    }
});

window.NikasRequest = {
    addItem,
    askProduct,
    clear: clearRequest,
    getItems: readRequest,
    open: openOrderModal,
    render: renderRequestMenu,
    setOpen: setRequestState
};

window.NikasCart = {
    addItem,
    clearCart: clearRequest,
    getItems: readRequest,
    render: renderRequestMenu,
    setOpen: setRequestState
};

renderRequestMenu();
