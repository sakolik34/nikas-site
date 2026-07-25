const adminLogin = document.getElementById("adminLogin");
const adminApp = document.getElementById("adminApp");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminGlobalMessage = document.getElementById("adminGlobalMessage");
const adminLogout = document.getElementById("adminLogout");
const productsList = document.getElementById("productsList");
const productForm = document.getElementById("productForm");
const productFormTitle = document.getElementById("productFormTitle");
const productFormMessage = document.getElementById("productFormMessage");
const productSearch = document.getElementById("productSearch");
const productCategoryFilter = document.getElementById("productCategoryFilter");
const newProductButton = document.getElementById("newProductButton");
const resetProductForm = document.getElementById("resetProductForm");
const saveProductButton = document.getElementById("saveProductButton");
const deactivateProductButton = document.getElementById("deactivateProductButton");
const productImages = document.getElementById("productImages");
const contactRequestsList = document.getElementById("contactRequestsList");
const productRequestsList = document.getElementById("productRequestsList");

let supabaseAdmin = null;
let categories = [];
let products = [];
let selectedProductId = "";
let currentUser = null;
let savingProduct = false;

function withTimeout(promise, ms, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        })
    ]);
}

function t(key, params) {
    return window.NikasI18n?.t(key, params) || key;
}

function setMessage(element, text, type = "") {
    if (!element) {
        return;
    }

    element.textContent = text;
    element.classList.toggle("error", type === "error");
    element.classList.toggle("success", type === "success");
}

function localField(record, field) {
    return window.NikasI18n?.field(record, field) || "";
}

async function isReady() {
    supabaseAdmin = await window.NikasApi?.readyClient();
    return Boolean(supabaseAdmin);
}

function showLogin() {
    document.body.classList.remove("admin-authenticated");
    adminLogin.hidden = false;
    adminApp.hidden = true;
    window.scrollTo({ top: 0, behavior: "auto" });
}

function showApp() {
    document.body.classList.add("admin-authenticated");
    adminLogin.hidden = true;
    adminApp.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
}

async function verifyAdmin(user) {
    if (!user) {
        return false;
    }

    const { data, error } = await supabaseAdmin
        .from("admin_profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.is_admin === true;
}

async function initAdmin() {
    setMessage(adminLoginMessage, "Подключаемся к Supabase...");

    if (!await isReady()) {
        showLogin();
        setMessage(adminLoginMessage, t("errors.backendNotConfigured"), "error");
        return;
    }

    const { data } = await withTimeout(
        supabaseAdmin.auth.getSession(),
        12000,
        "Supabase слишком долго отвечает. Проверьте интернет и ключи в supabase-config.js."
    );
    currentUser = data.session?.user || null;

    if (!currentUser) {
        showLogin();
        setMessage(adminLoginMessage, "");
        return;
    }

    try {
        setMessage(adminLoginMessage, "Проверяем права администратора...");
        const adminAllowed = await withTimeout(
            verifyAdmin(currentUser),
            12000,
            "Не удалось быстро проверить роль администратора. Проверьте GRANT и строку в admin_profiles."
        );

        if (!adminAllowed) {
            await supabaseAdmin.auth.signOut();
            currentUser = null;
            showLogin();
            setMessage(adminLoginMessage, "Пользователь вошел, но не имеет роли администратора.", "error");
            return;
        }

        showApp();
        await loadAdminData();
    } catch (error) {
        showLogin();
        setMessage(adminLoginMessage, error?.message || "Не удалось проверить права администратора.", "error");
    }
}

function setButtonLoading(button, loading, loadingText, defaultText) {
    button.disabled = loading;
    button.textContent = loading ? loadingText : defaultText;
}

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!await isReady()) {
            setMessage(adminLoginMessage, t("errors.backendNotConfigured"), "error");
            return;
        }

        const button = adminLoginForm.querySelector("button");
        setButtonLoading(button, true, "Входим...", "Войти");
        setMessage(adminLoginMessage, "");

        const email = adminLoginForm.elements.email.value.trim();
        const password = adminLoginForm.elements.password.value;

        try {
            setMessage(adminLoginMessage, "Проверяем email и пароль...");
            const { data, error } = await withTimeout(
                supabaseAdmin.auth.signInWithPassword({ email, password }),
                12000,
                "Вход занимает слишком много времени. Проверьте интернет, Supabase URL и publishable key."
            );

            if (error) {
                throw error;
            }

            currentUser = data.user;
            setMessage(adminLoginMessage, "Пароль принят. Проверяем роль администратора...");
            await initAdmin();
        } catch (error) {
            setMessage(adminLoginMessage, error?.message || "Не удалось войти.", "error");
        } finally {
            setButtonLoading(button, false, "Входим...", "Войти");
        }
    });
}

if (adminLogout) {
    adminLogout.addEventListener("click", async () => {
        await supabaseAdmin?.auth.signOut();
        currentUser = null;
        showLogin();
    });
}

document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
        const target = button.dataset.adminTab;

        document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
            tab.classList.toggle("active", tab === button);
        });

        document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
            panel.classList.toggle("active", panel.dataset.adminPanel === target);
        });
    });
});

function option(value, label) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = label;
    return element;
}

function populateCategoryControls() {
    const productCategorySelect = productForm.elements.category_id;
    productCategorySelect.replaceChildren();
    productCategoryFilter.replaceChildren(option("all", "Все категории"));

    categories.forEach((category) => {
        const label = localField(category, "title") || category.id;
        productCategorySelect.append(option(category.id, label));
        productCategoryFilter.append(option(category.id, label));
    });
}

async function loadAdminData() {
    setMessage(adminGlobalMessage, "Загружаем данные...");

    const [categoriesResult, productsResult] = await Promise.all([
        supabaseAdmin.from("categories").select("*").order("display_order", { ascending: true }),
        supabaseAdmin.from("products").select("*, images:product_images(*)").order("display_order", { ascending: true })
    ]);

    if (categoriesResult.error) {
        throw categoriesResult.error;
    }

    if (productsResult.error) {
        throw productsResult.error;
    }

    categories = (categoriesResult.data || []).map(window.NikasApi.normalizeCategory);
    products = (productsResult.data || []).map(window.NikasApi.normalizeProduct);
    populateCategoryControls();
    renderProducts();
    await Promise.all([loadContactRequests(), loadProductRequests()]);
    setMessage(adminGlobalMessage, "Данные загружены.", "success");
}

function createBadge(text, type = "") {
    const badge = document.createElement("span");
    badge.className = `admin-badge ${type}`.trim();
    badge.textContent = text;
    return badge;
}

function renderProducts() {
    const search = productSearch.value.trim().toLowerCase();
    const categoryFilter = productCategoryFilter.value;
    productsList.replaceChildren();

    const filteredProducts = products.filter((product) => {
        const productName = `${localField(product, "name")} ${product.slug}`.toLowerCase();
        const matchesSearch = !search || productName.includes(search);
        const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (!filteredProducts.length) {
        const empty = document.createElement("p");
        empty.className = "admin-message";
        empty.textContent = "Товары не найдены.";
        productsList.append(empty);
        return;
    }

    filteredProducts.forEach((product) => {
        const card = document.createElement("article");
        card.className = "admin-card";
        card.classList.toggle("active", product.id === selectedProductId);

        const title = document.createElement("h3");
        title.textContent = localField(product, "name") || product.slug;

        const slug = document.createElement("p");
        slug.textContent = product.slug;

        const badges = document.createElement("div");
        badges.className = "admin-badges";
        badges.append(
            createBadge(product.categoryId),
            createBadge(product.active ? "Показывается" : "Скрыт", product.active ? "green" : "warm")
        );

        const editButton = document.createElement("button");
        editButton.className = "admin-secondary";
        editButton.type = "button";
        editButton.textContent = "Редактировать";
        editButton.addEventListener("click", () => fillProductForm(product.id));

        card.append(title, slug, badges, editButton);
        productsList.append(card);
    });
}

function resetForm() {
    selectedProductId = "";
    productForm.reset();
    productForm.elements.active.checked = true;
    productForm.elements.display_order.value = "0";
    productFormTitle.textContent = "Новый товар";
    productImages.replaceChildren();
    setMessage(productFormMessage, "");
    renderProducts();
}

async function renderProductImages(productId) {
    productImages.replaceChildren();

    if (!productId) {
        const hint = document.createElement("p");
        hint.className = "admin-message";
        hint.textContent = "Сначала сохраните товар, затем добавьте фото.";
        productImages.append(hint);
        return;
    }

    const { data, error } = await supabaseAdmin
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("is_primary", { ascending: false })
        .order("display_order", { ascending: true });

    if (error) {
        setMessage(productFormMessage, error.message, "error");
        return;
    }

    if (!data?.length) {
        const empty = document.createElement("p");
        empty.className = "admin-message";
        empty.textContent = "Фото пока не загружены.";
        productImages.append(empty);
        return;
    }

    data.forEach((image) => {
        const row = document.createElement("div");
        row.className = "admin-image-row";

        const img = document.createElement("img");
        img.src = supabaseAdmin.storage
            .from(window.NIKAS_SUPABASE_CONFIG.productImagesBucket || "product-images")
            .getPublicUrl(image.storage_path).data.publicUrl;
        img.alt = image.alt_ru || "Фото товара";

        const path = document.createElement("p");
        path.textContent = image.storage_path;

        const primary = document.createElement("button");
        primary.type = "button";
        primary.className = image.is_primary ? "admin-primary" : "admin-secondary";
        primary.textContent = image.is_primary ? "Главное" : "Сделать главным";
        primary.disabled = image.is_primary;
        primary.addEventListener("click", () => makeImagePrimary(productId, image.id));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-danger";
        remove.textContent = "Удалить";
        remove.addEventListener("click", () => deleteProductImage(productId, image));

        row.append(img, path, primary, remove);
        productImages.append(row);
    });
}

async function fillProductForm(productId) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
        return;
    }

    selectedProductId = productId;
    productFormTitle.textContent = localField(product, "name") || product.slug;
    productForm.elements.id.value = product.id;
    productForm.elements.slug.value = product.slug;
    productForm.elements.category_id.value = product.categoryId;
    productForm.elements.display_order.value = product.displayOrder;
    productForm.elements.tone.value = product.tone;
    productForm.elements.active.checked = product.active;

    ["uk", "ru", "en"].forEach((language) => {
        productForm.elements[`name_${language}`].value = product.name?.[language] || product[`name_${language}`] || "";
        productForm.elements[`short_description_${language}`].value = product.shortDescription?.[language] || product[`short_description_${language}`] || "";
        productForm.elements[`description_${language}`].value = product.description?.[language] || product[`description_${language}`] || "";
        productForm.elements[`pack_${language}`].value = product.pack?.[language] || product[`pack_${language}`] || "";
    });

    renderProducts();
    await renderProductImages(productId);
}

function productPayload() {
    const form = productForm.elements;

    return {
        slug: form.slug.value.trim(),
        category_id: form.category_id.value,
        tone: form.tone.value,
        active: form.active.checked,
        display_order: Number(form.display_order.value) || 0,
        name_uk: form.name_uk.value.trim(),
        name_ru: form.name_ru.value.trim(),
        name_en: form.name_en.value.trim(),
        short_description_uk: form.short_description_uk.value.trim() || null,
        short_description_ru: form.short_description_ru.value.trim() || null,
        short_description_en: form.short_description_en.value.trim() || null,
        description_uk: form.description_uk.value.trim() || null,
        description_ru: form.description_ru.value.trim() || null,
        description_en: form.description_en.value.trim() || null,
        pack_uk: form.pack_uk.value.trim() || null,
        pack_ru: form.pack_ru.value.trim() || null,
        pack_en: form.pack_en.value.trim() || null
    };
}

function safeFileName(fileName) {
    return fileName.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-");
}

async function uploadPrimaryImage(productId) {
    const file = productForm.elements.image.files?.[0];

    if (!file) {
        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Поддерживаются только JPG, PNG и WebP.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Размер изображения не должен превышать 5 МБ.");
    }

    const bucket = window.NIKAS_SUPABASE_CONFIG.productImagesBucket || "product-images";
    const storagePath = `${productId}/${Date.now()}-${safeFileName(file.name)}`;
    const upload = await supabaseAdmin.storage.from(bucket).upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false
    });

    if (upload.error) {
        throw upload.error;
    }

    await supabaseAdmin
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);

    const insert = await supabaseAdmin
        .from("product_images")
        .insert({
            product_id: productId,
            storage_path: storagePath,
            is_primary: true,
            display_order: 0,
            alt_uk: productForm.elements.name_uk.value.trim(),
            alt_ru: productForm.elements.name_ru.value.trim(),
            alt_en: productForm.elements.name_en.value.trim()
        });

    if (insert.error) {
        throw insert.error;
    }

    productForm.elements.image.value = "";
}

async function saveProduct(event) {
    event.preventDefault();

    if (savingProduct || !productForm.checkValidity()) {
        setMessage(productFormMessage, "Заполните обязательные поля.", "error");
        return;
    }

    savingProduct = true;
    saveProductButton.disabled = true;
    setMessage(productFormMessage, "Сохраняем товар...");

    try {
        const payload = productPayload();
        const productId = productForm.elements.id.value;
        let savedProductId = productId;
        let response;

        if (productId) {
            response = await supabaseAdmin
                .from("products")
                .update(payload)
                .eq("id", productId)
                .select("id")
                .single();
        } else {
            response = await supabaseAdmin
                .from("products")
                .insert(payload)
                .select("id")
                .single();
        }

        if (response.error) {
            throw response.error;
        }

        savedProductId = response.data.id;
        await uploadPrimaryImage(savedProductId);
        await loadAdminData();
        await fillProductForm(savedProductId);
        setMessage(productFormMessage, "Товар сохранен.", "success");
    } catch (error) {
        setMessage(productFormMessage, error?.message || "Не удалось сохранить товар.", "error");
    } finally {
        savingProduct = false;
        saveProductButton.disabled = false;
    }
}

async function deactivateProduct() {
    const productId = productForm.elements.id.value;

    if (!productId) {
        return;
    }

    if (!window.confirm("Скрыть товар с публичного сайта? Старые заявки сохранят историю товара.")) {
        return;
    }

    const { error } = await supabaseAdmin
        .from("products")
        .update({ active: false })
        .eq("id", productId);

    if (error) {
        setMessage(productFormMessage, error.message, "error");
        return;
    }

    await loadAdminData();
    await fillProductForm(productId);
    setMessage(productFormMessage, "Товар скрыт.", "success");
}

async function makeImagePrimary(productId, imageId) {
    await supabaseAdmin.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    const { error } = await supabaseAdmin.from("product_images").update({ is_primary: true }).eq("id", imageId);

    if (error) {
        setMessage(productFormMessage, error.message, "error");
        return;
    }

    await renderProductImages(productId);
}

async function deleteProductImage(productId, image) {
    if (!window.confirm("Удалить это изображение товара?")) {
        return;
    }

    const bucket = window.NIKAS_SUPABASE_CONFIG.productImagesBucket || "product-images";
    const storage = await supabaseAdmin.storage.from(bucket).remove([image.storage_path]);

    if (storage.error) {
        setMessage(productFormMessage, storage.error.message, "error");
        return;
    }

    const { error } = await supabaseAdmin.from("product_images").delete().eq("id", image.id);

    if (error) {
        setMessage(productFormMessage, error.message, "error");
        return;
    }

    await renderProductImages(productId);
}

async function loadContactRequests() {
    const filter = document.querySelector("[data-request-filter='contact']").value;
    let query = supabaseAdmin
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);

    if (filter !== "all") {
        query = query.eq("status", filter);
    }

    const { data, error } = await query;

    if (error) {
        renderRequestError(contactRequestsList, error.message);
        return;
    }

    renderContactRequests(data || []);
}

async function loadProductRequests() {
    const filter = document.querySelector("[data-request-filter='product']").value;
    let query = supabaseAdmin
        .from("product_requests")
        .select("*, items:product_request_items(*)")
        .order("created_at", { ascending: false })
        .limit(80);

    if (filter !== "all") {
        query = query.eq("status", filter);
    }

    const { data, error } = await query;

    if (error) {
        renderRequestError(productRequestsList, error.message);
        return;
    }

    renderProductRequests(data || []);
}

function renderRequestError(container, message) {
    container.replaceChildren();
    const error = document.createElement("p");
    error.className = "admin-message error";
    error.textContent = message;
    container.append(error);
}

function requestStatusSelect(row, type) {
    const select = document.createElement("select");
    ["new", "in_progress", "completed"].forEach((status) => {
        select.append(option(status, t(`status.${status}`)));
    });
    select.value = row.status;
    select.addEventListener("change", () => updateRequestStatus(type, row.id, select.value));
    return select;
}

function renderContactRequests(rows) {
    contactRequestsList.replaceChildren();

    if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "admin-message";
        empty.textContent = "Заявок пока нет.";
        contactRequestsList.append(empty);
        return;
    }

    rows.forEach((row) => {
        const card = document.createElement("article");
        card.className = "request-card";

        const head = document.createElement("div");
        head.className = "request-card-head";
        const title = document.createElement("h3");
        title.textContent = row.name;
        head.append(title, requestStatusSelect(row, "contact"));

        const details = document.createElement("p");
        details.textContent = `${row.phone}${row.email ? ` · ${row.email}` : ""}`;

        const meta = document.createElement("p");
        meta.textContent = `${new Date(row.created_at).toLocaleString()} · ${row.language} · Telegram: ${row.telegram_status}`;

        const message = document.createElement("p");
        message.textContent = row.message || "Без вопроса.";

        card.append(head, details, meta, message);
        contactRequestsList.append(card);
    });
}

function renderProductRequests(rows) {
    productRequestsList.replaceChildren();

    if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "admin-message";
        empty.textContent = "Товарных заявок пока нет.";
        productRequestsList.append(empty);
        return;
    }

    rows.forEach((row) => {
        const card = document.createElement("article");
        card.className = "request-card";

        const head = document.createElement("div");
        head.className = "request-card-head";
        const title = document.createElement("h3");
        title.textContent = row.name;
        head.append(title, requestStatusSelect(row, "product"));

        const details = document.createElement("p");
        details.textContent = `${row.phone}${row.email ? ` · ${row.email}` : ""}`;

        const meta = document.createElement("p");
        meta.textContent = `${new Date(row.created_at).toLocaleString()} · ${row.language} · Telegram: ${row.telegram_status}`;

        const comment = document.createElement("p");
        comment.textContent = row.comment || "Без комментария.";

        const list = document.createElement("ol");
        list.className = "request-items";
        [...(row.items || [])]
            .sort((first, second) => first.display_order - second.display_order)
            .forEach((item) => {
                const li = document.createElement("li");
                li.textContent = `${item.product_name_snapshot} - ${item.quantity}`;
                list.append(li);
            });

        card.append(head, details, meta, comment, list);
        productRequestsList.append(card);
    });
}

async function updateRequestStatus(type, id, status) {
    const table = type === "contact" ? "contact_requests" : "product_requests";
    const { error } = await supabaseAdmin.from(table).update({ status }).eq("id", id);

    if (error) {
        setMessage(adminGlobalMessage, error.message, "error");
        return;
    }

    setMessage(adminGlobalMessage, "Статус обновлен.", "success");

    if (type === "contact") {
        await loadContactRequests();
    } else {
        await loadProductRequests();
    }
}

productSearch.addEventListener("input", renderProducts);
productCategoryFilter.addEventListener("change", renderProducts);
newProductButton.addEventListener("click", resetForm);
resetProductForm.addEventListener("click", resetForm);
productForm.addEventListener("submit", saveProduct);
deactivateProductButton.addEventListener("click", deactivateProduct);

document.querySelectorAll("[data-request-filter]").forEach((select) => {
    select.addEventListener("change", () => {
        if (select.dataset.requestFilter === "contact") {
            loadContactRequests();
        } else {
            loadProductRequests();
        }
    });
});

document.querySelectorAll("[data-refresh-requests]").forEach((button) => {
    button.addEventListener("click", () => {
        if (button.dataset.refreshRequests === "contact") {
            loadContactRequests();
        } else {
            loadProductRequests();
        }
    });
});

window.addEventListener("nikas:languagechange", () => {
    populateCategoryControls();
    renderProducts();
    loadContactRequests();
    loadProductRequests();
});

initAdmin();
