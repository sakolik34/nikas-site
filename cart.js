const CART_STORAGE_KEY = "nikas-cart";

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
let orderSending = false;

function i18n() {
    return window.NikasI18n;
}

function t(key, params) {
    return i18n()?.t(key, params) || key;
}

function readCart() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
        return Array.isArray(savedCart) ? savedCart.map(normalizeCartItem).filter(Boolean) : [];
    } catch {
        return [];
    }
}

function normalizeCartItem(item) {
    if (!item || !item.id) {
        return null;
    }

    return {
        id: String(item.id),
        productId: item.productId || item.id,
        slug: item.slug || "",
        categoryId: item.categoryId || item.category_id || "",
        name: item.name || item.nameSnapshot || "",
        pack: item.pack || "",
        quantity: Math.max(1, Number(item.quantity) || 1)
    };
}

function saveCart(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(normalizeCartItem).filter(Boolean)));
}

function getCartCount(items) {
    return items.reduce((total, item) => total + item.quantity, 0);
}

function getItemName(item) {
    return i18n()?.localizedValue(item.name) || String(item.name || "");
}

function getItemPack(item) {
    return i18n()?.localizedValue(item.pack) || String(item.pack || "");
}

function getPluralLabel(count) {
    return i18n()?.plural("cart.items", count) || `${count} товаров`;
}

function setCartState(isOpen) {
    if (!cartDropdown || !cartButton) {
        return;
    }

    cartDropdown.classList.toggle("open", isOpen);
    cartButton.setAttribute("aria-expanded", String(isOpen));
    cartButton.setAttribute("aria-label", isOpen ? t("cart.close") : t("cart.open"));
}

function setOrderMessage(text, type = "") {
    if (!orderMessage) {
        return;
    }

    orderMessage.textContent = text;
    orderMessage.classList.toggle("error", type === "error");
    orderMessage.classList.toggle("success", type === "success");
}

function setOrderSubmitState() {
    if (!orderForm || !orderSubmit) {
        return;
    }

    const name = orderForm.elements.name.value.trim();
    const phone = orderForm.elements.phone.value.trim();
    const items = readCart();
    const ready = Boolean(name && phone && items.length && orderForm.checkValidity() && !orderSending);

    orderSubmit.disabled = !ready;

    if (!items.length) {
        setOrderMessage(t("cart.empty"), "error");
    } else if (!name || !phone) {
        setOrderMessage(t("form.fillRequired"));
    } else if (!orderSending) {
        setOrderMessage(t("form.ready"), "success");
    }
}

function createField(labelKey, name, type = "text", required = false, autocomplete = "") {
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = t(labelKey);

    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.required = required;

    if (autocomplete) {
        input.autocomplete = autocomplete;
    }

    label.append(span, input);
    return label;
}

function renderOrderItems(container) {
    container.replaceChildren();

    readCart().forEach((item) => {
        const row = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = getItemName(item);

        const meta = document.createElement("span");
        const pack = getItemPack(item);
        meta.textContent = pack ? `${pack} · ${item.quantity}` : String(item.quantity);

        row.append(title, meta);
        container.append(row);
    });
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
    panel.className = "order-modal-panel";

    const closeButton = document.createElement("button");
    closeButton.className = "order-modal-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", t("cart.closeModal"));
    closeButton.addEventListener("click", closeOrderModal);

    const title = document.createElement("h2");
    title.id = "orderModalTitle";
    title.textContent = t("cart.orderTitle");

    const intro = document.createElement("p");
    intro.className = "order-modal-intro";
    intro.textContent = t("cart.orderIntro");

    const itemsTitle = document.createElement("strong");
    itemsTitle.className = "order-items-title";
    itemsTitle.textContent = t("cart.orderItems");

    const itemsList = document.createElement("ul");
    itemsList.className = "order-items-list";
    itemsList.dataset.orderItemsList = "true";

    orderForm = document.createElement("form");
    orderForm.className = "contact-form order-form";
    orderForm.noValidate = true;

    const nameField = createField("form.name", "name", "text", true, "name");
    const phoneField = createField("form.phone", "phone", "tel", true, "tel");
    const emailField = createField("form.email", "email", "email", false, "email");

    const commentLabel = document.createElement("label");
    commentLabel.className = "contact-form-wide";
    const commentSpan = document.createElement("span");
    commentSpan.textContent = t("cart.orderComment");
    const comment = document.createElement("textarea");
    comment.name = "comment";
    comment.rows = 5;
    comment.placeholder = t("cart.orderCommentPlaceholder");
    commentLabel.append(commentSpan, comment);

    const honeypot = document.createElement("label");
    honeypot.className = "form-honeypot";
    honeypot.setAttribute("aria-hidden", "true");
    const honeypotText = document.createElement("span");
    honeypotText.textContent = t("form.honeypot");
    const honeypotInput = document.createElement("input");
    honeypotInput.name = "website";
    honeypotInput.type = "text";
    honeypotInput.tabIndex = -1;
    honeypotInput.autocomplete = "off";
    honeypot.append(honeypotText, honeypotInput);

    orderMessage = document.createElement("p");
    orderMessage.className = "form-message contact-form-wide";
    orderMessage.setAttribute("aria-live", "polite");

    orderSubmit = document.createElement("button");
    orderSubmit.className = "button primary contact-submit contact-form-wide";
    orderSubmit.type = "submit";
    orderSubmit.textContent = t("cart.submitOrder");
    orderSubmit.disabled = true;

    orderForm.append(nameField, phoneField, emailField, commentLabel, honeypot, orderMessage, orderSubmit);
    orderForm.addEventListener("input", setOrderSubmitState);
    orderForm.addEventListener("submit", handleOrderSubmit);

    panel.append(closeButton, title, intro, itemsTitle, itemsList, orderForm);
    orderModal.append(panel);
    document.body.append(orderModal);

    return orderModal;
}

function openOrderModal() {
    if (readCart().length === 0) {
        setCartState(true);
        return;
    }

    const modal = createOrderModal();
    renderOrderItems(modal.querySelector("[data-order-items-list]"));
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setCartState(false);
    setOrderSubmitState();
    orderForm.elements.name.focus();
}

function closeOrderModal() {
    if (!orderModal || orderSending) {
        return;
    }

    orderModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function serializeOrderItems(items) {
    return items.map((item, index) => ({
        productId: item.productId,
        productSlug: item.slug,
        categoryId: item.categoryId,
        name: getItemName(item),
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

    const items = readCart();
    let success = false;

    try {
        await window.NikasApi.submitProductRequest({
            name: orderForm.elements.name.value.trim(),
            phone: orderForm.elements.phone.value.trim(),
            email: orderForm.elements.email.value.trim(),
            comment: orderForm.elements.comment.value.trim(),
            website: orderForm.elements.website.value.trim(),
            items: serializeOrderItems(items)
        });

        clearCart();
        orderForm.reset();
        success = true;
        setOrderMessage(t("cart.orderSuccess"), "success");
        orderSubmit.textContent = t("cart.submitOrder");
    } catch (error) {
        setOrderMessage(error?.message || t("cart.orderError"), "error");
    } finally {
        orderSending = false;
        orderSubmit.textContent = t("cart.submitOrder");
        if (success) {
            orderSubmit.disabled = true;
        } else {
            setOrderSubmitState();
        }
    }
}

function renderCart() {
    if (!cartDropdown) {
        return;
    }

    const items = readCart();
    const count = getCartCount(items);

    cartCount.textContent = String(count);
    cartCount.hidden = count === 0;
    cartSummary.textContent = getPluralLabel(count);
    cartEmpty.hidden = items.length > 0;
    cartList.replaceChildren();

    items.forEach((item) => {
        const row = document.createElement("article");
        row.className = "cart-item";

        const info = document.createElement("div");
        info.className = "cart-item-info";

        const title = document.createElement("strong");
        title.textContent = getItemName(item);

        const meta = document.createElement("span");
        const pack = getItemPack(item);
        meta.textContent = pack ? `${t("product.priceAvailability")} · ${pack}` : t("product.priceAvailability");

        info.append(title, meta);

        const controls = document.createElement("div");
        controls.className = "cart-item-controls";

        const minusButton = document.createElement("button");
        minusButton.type = "button";
        minusButton.textContent = "-";
        minusButton.setAttribute("aria-label", t("cart.decrease", { name: getItemName(item) }));
        minusButton.dataset.cartAction = "decrease";
        minusButton.dataset.cartId = item.id;

        const quantity = document.createElement("span");
        quantity.textContent = String(item.quantity);

        const plusButton = document.createElement("button");
        plusButton.type = "button";
        plusButton.textContent = "+";
        plusButton.setAttribute("aria-label", t("cart.increase", { name: getItemName(item) }));
        plusButton.dataset.cartAction = "increase";
        plusButton.dataset.cartId = item.id;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "cart-remove";
        removeButton.textContent = t("cart.remove");
        removeButton.dataset.cartAction = "remove";
        removeButton.dataset.cartId = item.id;

        controls.append(minusButton, quantity, plusButton, removeButton);
        row.append(info, controls);
        cartList.append(row);
    });

    cartClear.hidden = items.length === 0;
    cartOrderLink.hidden = items.length === 0;
    cartOrderLink.textContent = t("cart.order");
}

function addItem(product) {
    const productId = String(product.id || product.productId || product.slug);
    const items = readCart();
    const existingItem = items.find((item) => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        items.push({
            id: productId,
            productId,
            slug: product.slug || "",
            name: product.name,
            pack: product.pack || "",
            categoryId: product.categoryId,
            quantity: 1
        });
    }

    saveCart(items);
    renderCart();
    setCartState(true);
}

function changeItemQuantity(id, delta) {
    const items = readCart()
        .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0);

    saveCart(items);
    renderCart();
    setOrderSubmitState();
}

function removeItem(id) {
    saveCart(readCart().filter((item) => item.id !== id));
    renderCart();
    setOrderSubmitState();
}

function clearCart() {
    saveCart([]);
    renderCart();
    setCartState(false);
}

if (cartButton) {
    cartButton.addEventListener("click", (event) => {
        event.stopPropagation();
        document.getElementById("contactDropdown")?.classList.remove("open");
        document.getElementById("contactButton")?.setAttribute("aria-expanded", "false");
        setCartState(!cartDropdown.classList.contains("open"));
    });
}

if (cartMenu) {
    cartMenu.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

if (cartList) {
    cartList.addEventListener("click", (event) => {
        event.stopPropagation();
        const button = event.target.closest("[data-cart-action]");

        if (!button) {
            return;
        }

        const id = button.dataset.cartId;
        const action = button.dataset.cartAction;

        if (action === "increase") {
            changeItemQuantity(id, 1);
        }

        if (action === "decrease") {
            changeItemQuantity(id, -1);
        }

        if (action === "remove") {
            removeItem(id);
        }
    });
}

if (cartClear) {
    cartClear.addEventListener("click", (event) => {
        event.stopPropagation();
        clearCart();
    });
}

if (cartOrderLink) {
    cartOrderLink.addEventListener("click", (event) => {
        event.stopPropagation();
        openOrderModal();
    });
}

document.addEventListener("click", (event) => {
    if (cartDropdown && !cartDropdown.contains(event.target)) {
        setCartState(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setCartState(false);
        closeOrderModal();
    }
});

window.addEventListener("nikas:languagechange", () => {
    renderCart();

    if (orderModal && !orderModal.hidden) {
        const itemsList = orderModal.querySelector("[data-order-items-list]");
        renderOrderItems(itemsList);
        orderModal.querySelector("#orderModalTitle").textContent = t("cart.orderTitle");
        orderModal.querySelector(".order-modal-intro").textContent = t("cart.orderIntro");
        orderModal.querySelector(".order-items-title").textContent = t("cart.orderItems");
        orderSubmit.textContent = t("cart.submitOrder");
        setOrderSubmitState();
    }
});

window.NikasCart = {
    addItem,
    clearCart,
    getItems: readCart,
    render: renderCart,
    setOpen: setCartState
};

renderCart();
