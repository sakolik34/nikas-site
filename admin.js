const adminLogin = document.getElementById("adminLogin");
const adminApp = document.getElementById("adminApp");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminGlobalMessage = document.getElementById("adminGlobalMessage");
const adminLogout = document.getElementById("adminLogout");
const productsList = document.getElementById("productsList");
const productForm = document.getElementById("productForm");
const productFormTitle = document.getElementById("productFormTitle");
const productFormMode = document.getElementById("productFormMode");
const productFormMessage = document.getElementById("productFormMessage");
const productSearch = document.getElementById("productSearch");
const productCategoryFilter = document.getElementById("productCategoryFilter");
const newProductButton = document.getElementById("newProductButton");
const resetProductForm = document.getElementById("resetProductForm");
const saveProductButton = document.getElementById("saveProductButton");
const deactivateProductButton = document.getElementById("deactivateProductButton");
const deleteProductButton = document.getElementById("deleteProductButton");
const productsTotalCount = document.getElementById("productsTotalCount");
const productsActiveCount = document.getElementById("productsActiveCount");
const productsWithoutImagesCount = document.getElementById("productsWithoutImagesCount");
const productImages = document.getElementById("productImages");
const imageSelectionHint = document.getElementById("imageSelectionHint");
const imageStorageStatus = document.getElementById("imageStorageStatus");
const uploadProductImagesButton = document.getElementById("uploadProductImagesButton");
const priceFieldHint = document.getElementById("priceFieldHint");
const packOptionsList = document.getElementById("packOptionsList");
const addPackOptionButton = document.getElementById("addPackOptionButton");
const packOptionsHint = document.getElementById("packOptionsHint");
const contactRequestsList = document.getElementById("contactRequestsList");
const productRequestsList = document.getElementById("productRequestsList");
const contactRequestsSummary = document.getElementById("contactRequestsSummary");
const productRequestsSummary = document.getElementById("productRequestsSummary");
const contactRequestsBadge = document.getElementById("contactRequestsBadge");
const productRequestsBadge = document.getElementById("productRequestsBadge");

let supabaseAdmin = null;
let categories = [];
let products = [];
let contactRequests = [];
let productRequests = [];
let selectedProductId = "";
let currentUser = null;
let savingProduct = false;
let supportsPriceFields = false;
let supportsRequestItemSnapshots = false;
let supportsPackOptions = false;
let supportsR2Images = false;

function withTimeout(promise, ms, message) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
    });

    return Promise.race([promise, timeout]).finally(() => {
        window.clearTimeout(timeoutId);
    });
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

function setProductFormMode(mode) {
    const isCreating = mode === "create";

    productForm.dataset.mode = mode;
    productFormMode.textContent = isCreating ? "Создание нового товара" : "Редактирование товара";
    productFormTitle.textContent = isCreating ? "Новый товар" : productFormTitle.textContent;
    resetProductForm.textContent = isCreating ? "Очистить форму" : "Создать новый товар";
    saveProductButton.textContent = isCreating ? "Создать товар" : "Сохранить изменения";
    deactivateProductButton.hidden = isCreating;
    deleteProductButton.hidden = isCreating;
    uploadProductImagesButton.disabled = isCreating || !supportsR2Images;
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

function mediaApiBaseUrl() {
    return String(window.NIKAS_SUPABASE_CONFIG?.mediaApiBaseUrl || "").replace(/\/+$/, "");
}

async function currentAccessToken() {
    const { data, error } = await supabaseAdmin.auth.getSession();

    if (error) {
        throw error;
    }

    if (!data.session?.access_token) {
        throw new Error("Сеанс администратора закончился. Войдите заново.");
    }

    return data.session.access_token;
}

async function mediaApiRequest(path, options = {}) {
    const baseUrl = mediaApiBaseUrl();

    if (!baseUrl) {
        throw new Error("Адрес Cloudflare Image API не указан в supabase-config.js.");
    }

    const token = await currentAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set("authorization", `Bearer ${token}`);
    const isImageUpload = path === "/api/admin/images/upload" && options.method === "POST";
    const timeoutMs = isImageUpload ? 120000 : 45000;
    const timeoutMessage = isImageUpload
        ? "Загрузка фотографии не получила ответ за 2 минуты. Проверьте интернет и попробуйте один файл ещё раз."
        : "Cloudflare слишком долго отвечает. Попробуйте ещё раз.";
    let response;

    try {
        response = await withTimeout(
            fetch(`${baseUrl}${path}`, { ...options, headers }),
            timeoutMs,
            timeoutMessage
        );
    } catch (error) {
        if (error?.message === timeoutMessage) {
            throw error;
        }
        throw new Error("Не удалось связаться с Cloudflare Image API. Проверьте Worker и интернет.");
    }

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        // A non-JSON response is handled by the generic status error below.
    }

    if (!response.ok) {
        throw new Error(payload?.error || `Cloudflare Image API вернул ошибку ${response.status}.`);
    }

    return payload;
}

async function initAdmin() {
    setMessage(adminLoginMessage, "Подключаемся к Supabase...");

    try {
        if (!await isReady()) {
            showLogin();
            setMessage(adminLoginMessage, t("errors.backendNotConfigured"), "error");
            return;
        }
    } catch (error) {
        showLogin();
        setMessage(
            adminLoginMessage,
            error?.message || "Не удалось подключиться к Supabase. Проверьте интернет и обновите страницу.",
            "error"
        );
        return;
    }

    try {
        const { data } = await withTimeout(
            supabaseAdmin.auth.getSession(),
            12000,
            "Supabase слишком долго отвечает. Проверьте интернет и ключи в supabase-config.js."
        );
        currentUser = data.session?.user || null;
    } catch (error) {
        showLogin();
        setMessage(adminLoginMessage, error?.message || "Не удалось проверить текущий вход.", "error");
        return;
    }

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

        if (target === "contacts") {
            loadContactRequests();
        } else if (target === "orders") {
            loadProductRequests();
        }
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

function configurePriceFields() {
    ["uk", "ru", "en"].forEach((language) => {
        productForm.elements[`price_${language}`].disabled = !supportsPriceFields;
    });

    priceFieldHint.textContent = supportsPriceFields
        ? "Цена подключена к базе и будет отображаться в карточке и подробном окне товара."
        : "Чтобы включить индивидуальные цены, один раз повторно выполните обновлённый файл supabase/schema.sql.";
    priceFieldHint.classList.toggle("admin-warning", !supportsPriceFields);
}

function configurePackOptions() {
    if (addPackOptionButton) {
        addPackOptionButton.disabled = !supportsPackOptions;
    }

    packOptionsHint.textContent = supportsPackOptions
        ? "Добавляйте любые варианты объёма, веса или упаковки. Порядок строк будет таким же на сайте."
        : "Чтобы включить варианты объёма и фасовки, один раз повторно выполните обновлённый файл supabase/schema.sql.";
    packOptionsHint.classList.toggle("admin-warning", !supportsPackOptions);

    if (!supportsPackOptions) {
        packOptionsList.replaceChildren();
        const message = document.createElement("p");
        message.className = "admin-message admin-warning";
        message.textContent = "Таблица вариантов ещё не создана в Supabase.";
        packOptionsList.append(message);
    }
}

function attachPackOptions(productRows, packOptionsRows) {
    const byProductId = new Map();

    (packOptionsRows || []).forEach((optionRow) => {
        const productId = optionRow.product_id;

        if (!byProductId.has(productId)) {
            byProductId.set(productId, []);
        }

        byProductId.get(productId).push(optionRow);
    });

    return (productRows || []).map((product) => ({
        ...product,
        packOptions: byProductId.get(product.id) || []
    }));
}

async function loadAdminData() {
    setMessage(adminGlobalMessage, "Загружаем данные...");

    const [
        categoriesResult,
        priceProbeResult,
        requestItemSnapshotProbeResult,
        packOptionsProbeResult,
        r2ImagesProbeResult
    ] = await Promise.all([
        supabaseAdmin.from("categories").select("*").order("display_order", { ascending: true }),
        supabaseAdmin.from("products").select("price_ru").limit(1),
        supabaseAdmin.from("product_request_items").select("pack_snapshot, price_snapshot").limit(1),
        supabaseAdmin.from("product_pack_options").select("id").limit(1),
        supabaseAdmin.from("product_images").select("storage_provider, object_key").limit(1)
    ]);

    if (categoriesResult.error) {
        throw categoriesResult.error;
    }

    supportsPriceFields = !priceProbeResult.error;
    supportsRequestItemSnapshots = !requestItemSnapshotProbeResult.error;
    supportsPackOptions = !packOptionsProbeResult.error;
    supportsR2Images = !r2ImagesProbeResult.error;

    const [productsResult, packOptionsResult] = await Promise.all([
        supabaseAdmin.from("products").select("*, images:product_images(*)").order("display_order", { ascending: true }),
        supportsPackOptions
            ? supabaseAdmin
                .from("product_pack_options")
                .select("*")
                .order("display_order", { ascending: true })
            : Promise.resolve({ data: [], error: null })
    ]);

    if (productsResult.error) {
        throw productsResult.error;
    }

    if (packOptionsResult.error) {
        throw packOptionsResult.error;
    }

    categories = (categoriesResult.data || []).map(window.NikasApi.normalizeCategory);
    products = attachPackOptions(productsResult.data || [], packOptionsResult.data || [])
        .map(window.NikasApi.normalizeProduct);
    configurePriceFields();
    configurePackOptions();
    configureImageStorage();
    populateCategoryControls();
    renderProducts();
    await Promise.all([loadContactRequests(), loadProductRequests()]);
    setMessage(adminGlobalMessage, "Данные загружены.", "success");
}

function configureImageStorage() {
    const configured = Boolean(mediaApiBaseUrl());
    const ready = supportsR2Images && configured;

    productForm.elements.image.disabled = !ready;
    uploadProductImagesButton.disabled = !ready || !productForm.elements.id.value;
    imageStorageStatus.classList.toggle("admin-warning", !ready);

    if (!supportsR2Images) {
        imageStorageStatus.textContent = "Сначала выполните миграцию Cloudflare R2 для изображений.";
        return;
    }

    if (!configured) {
        imageStorageStatus.textContent = "В supabase-config.js не указан адрес Cloudflare Image API.";
        return;
    }

    imageStorageStatus.textContent = "Новые фотографии будут храниться в Cloudflare R2. Секретные ключи не передаются в браузер.";
}

function updateProductOverview() {
    const total = products.length;
    const active = products.filter((product) => product.active).length;
    const withoutImages = products.filter((product) => !(product.images || []).some((image) => image.imageUrl)).length;

    productsTotalCount.textContent = String(total);
    productsActiveCount.textContent = String(active);
    productsWithoutImagesCount.textContent = String(withoutImages);
}

function createBadge(text, type = "") {
    const badge = document.createElement("span");
    badge.className = `admin-badge ${type}`.trim();
    badge.textContent = text;
    return badge;
}

function countByStatus(rows, status) {
    return rows.filter((row) => row.status === status).length;
}

function setTabBadge(element, count) {
    if (!element) {
        return;
    }

    element.textContent = String(count);
    element.hidden = count === 0;
}

function updateRequestBadges() {
    setTabBadge(contactRequestsBadge, countByStatus(contactRequests, "new"));
    setTabBadge(productRequestsBadge, countByStatus(productRequests, "new"));
}

function renderProducts() {
    const search = productSearch.value.trim().toLowerCase();
    const categoryFilter = productCategoryFilter.value;
    productsList.replaceChildren();
    updateProductOverview();

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

        const main = document.createElement("div");
        main.className = "admin-card-main";

        const preview = document.createElement("div");
        preview.className = "admin-card-preview";

        if (product.imageUrl) {
            const image = document.createElement("img");
            image.src = product.imageUrl;
            image.alt = "";
            preview.append(image);
        } else {
            preview.classList.add("empty");
            preview.textContent = "Нет фото";
        }

        const copy = document.createElement("div");
        copy.className = "admin-card-copy";

        const title = document.createElement("h3");
        title.textContent = localField(product, "name") || product.slug;

        const slug = document.createElement("p");
        slug.textContent = product.slug;

        copy.append(title, slug);
        main.append(preview, copy);

        const badges = document.createElement("div");
        badges.className = "admin-badges";
        badges.append(
            createBadge(product.categoryId),
            product.packOptions?.length ? createBadge(`${product.packOptions.length} вариантов`) : createBadge("Без вариантов", "neutral"),
            createBadge(product.active ? "Показывается" : "Скрыт", product.active ? "green" : "warm")
        );

        const editButton = document.createElement("button");
        editButton.className = "admin-secondary";
        editButton.type = "button";
        editButton.textContent = "Редактировать";
        editButton.addEventListener("click", () => fillProductForm(product.id));

        card.append(main, badges, editButton);
        productsList.append(card);
    });
}

function movePackOptionRow(row, direction) {
    const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;

    if (!sibling) {
        return;
    }

    if (direction < 0) {
        packOptionsList.insertBefore(row, sibling);
    } else {
        packOptionsList.insertBefore(sibling, row);
    }
}

function packOptionInput(labelText, language, value = "") {
    const label = document.createElement("label");
    label.className = "admin-pack-option-field";

    const caption = document.createElement("span");
    caption.textContent = labelText;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 220;
    input.value = value || "";
    input.dataset.packOptionLanguage = language;

    if (language === "ru") {
        input.placeholder = "Например: мешок 25 кг";
    } else if (language === "uk") {
        input.placeholder = "Необязательно";
    } else {
        input.placeholder = "Optional";
    }

    label.append(caption, input);
    return label;
}

function createPackOptionRow(packOption = {}) {
    const row = document.createElement("div");
    row.className = "admin-pack-option-row";
    row.dataset.packOptionId = packOption.id || "";

    const label = packOption.label || {
        uk: packOption.label_uk,
        ru: packOption.label_ru,
        en: packOption.label_en
    };

    row.append(
        packOptionInput("Українська", "uk", label.uk),
        packOptionInput("Русский", "ru", label.ru),
        packOptionInput("English", "en", label.en)
    );

    const actions = document.createElement("div");
    actions.className = "admin-pack-option-actions";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "admin-icon-button";
    up.textContent = "↑";
    up.title = "Поднять вариант выше";
    up.addEventListener("click", () => movePackOptionRow(row, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "admin-icon-button";
    down.textContent = "↓";
    down.title = "Опустить вариант ниже";
    down.addEventListener("click", () => movePackOptionRow(row, 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-danger";
    remove.textContent = "Удалить";
    remove.addEventListener("click", () => row.remove());

    actions.append(up, down, remove);
    row.append(actions);
    return row;
}

function renderPackOptions(packOptions = []) {
    packOptionsList.replaceChildren();

    if (!supportsPackOptions) {
        configurePackOptions();
        return;
    }

    const sortedOptions = [...packOptions].sort((first, second) => {
        return (first.displayOrder || first.display_order || 0) - (second.displayOrder || second.display_order || 0);
    });

    sortedOptions.forEach((packOption) => {
        packOptionsList.append(createPackOptionRow(packOption));
    });
}

function collectPackOptions() {
    return [...packOptionsList.querySelectorAll(".admin-pack-option-row")]
        .map((row, displayOrder) => {
            const value = (language) => row
                .querySelector(`[data-pack-option-language="${language}"]`)
                ?.value
                .trim() || "";
            const fallback = value("ru") || value("uk") || value("en");

            if (!fallback) {
                return null;
            }

            return {
                id: row.dataset.packOptionId || "",
                active: true,
                display_order: displayOrder,
                label_uk: value("uk") || fallback,
                label_ru: value("ru") || fallback,
                label_en: value("en") || fallback
            };
        })
        .filter(Boolean);
}

async function saveProductPackOptions(productId) {
    if (!supportsPackOptions) {
        return;
    }

    const nextOptions = collectPackOptions();
    const existing = await supabaseAdmin
        .from("product_pack_options")
        .select("id")
        .eq("product_id", productId);

    if (existing.error) {
        throw existing.error;
    }

    const nextIds = nextOptions.map((packOption) => packOption.id).filter(Boolean);
    const removeIds = (existing.data || [])
        .map((packOption) => packOption.id)
        .filter((id) => !nextIds.includes(id));
    const operations = [];

    if (removeIds.length) {
        operations.push(
            supabaseAdmin
                .from("product_pack_options")
                .delete()
                .in("id", removeIds)
        );
    }

    nextOptions.forEach((packOption) => {
        const { id, ...payload } = packOption;

        if (id) {
            operations.push(
                supabaseAdmin
                    .from("product_pack_options")
                    .update(payload)
                    .eq("id", id)
            );
            return;
        }

        operations.push(
            supabaseAdmin
                .from("product_pack_options")
                .insert({
                    ...payload,
                    product_id: productId
                })
        );
    });

    const results = await Promise.all(operations);
    const error = results.find((result) => result.error)?.error;

    if (error) {
        throw error;
    }
}

function resetForm() {
    selectedProductId = "";
    productForm.reset();
    productForm.elements.id.value = "";
    productForm.elements.active.checked = true;
    productForm.elements.display_order.value = "0";
    setProductFormMode("create");
    renderPackOptions();
    productImages.replaceChildren();
    imageSelectionHint.textContent = "Файлы не выбраны. До 10 фотографий, каждая не больше 5 МБ.";
    uploadProductImagesButton.disabled = true;
    setMessage(productFormMessage, "");
    renderProducts();
    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const sortedImages = [...data].sort((first, second) => {
        if (first.is_primary !== second.is_primary) {
            return first.is_primary ? -1 : 1;
        }

        return first.display_order - second.display_order;
    });

    const count = document.createElement("p");
    count.className = "admin-image-count";
    count.textContent = `Загружено фотографий: ${sortedImages.length}`;
    productImages.append(count);

    sortedImages.forEach((image, index) => {
        const row = document.createElement("div");
        row.className = "admin-image-row";

        const img = document.createElement("img");
        const imageUrl = window.NikasApi.resolveProductImageUrl(image);
        img.src = imageUrl;
        img.alt = image.alt_ru || "Фото товара";
        img.loading = "lazy";
        img.addEventListener("error", () => {
            if (img.dataset.retried === "true" || !imageUrl) {
                return;
            }

            const retryUrl = new URL(imageUrl);
            retryUrl.searchParams.set("retry", Date.now().toString());
            img.dataset.retried = "true";
            img.src = retryUrl.toString();
        });

        const info = document.createElement("div");
        info.className = "admin-image-info";
        const title = document.createElement("strong");
        title.textContent = image.is_primary ? "Главное фото" : `Фото ${index + 1}`;
        const provider = document.createElement("span");
        provider.className = "admin-image-provider cloudflare";
        provider.textContent = "Cloudflare R2";
        const path = document.createElement("p");
        path.textContent = (image.object_key || image.storage_path || "").split("/").pop();
        info.append(title, provider, path);

        const orderControls = document.createElement("div");
        orderControls.className = "admin-image-order";

        const up = document.createElement("button");
        up.type = "button";
        up.className = "admin-icon-button";
        up.textContent = "↑";
        up.title = "Переместить выше";
        up.setAttribute("aria-label", "Переместить фотографию выше");
        up.disabled = index === 0 || Boolean(sortedImages[index - 1]?.is_primary);
        up.addEventListener("click", () => moveProductImage(productId, sortedImages, index, -1));

        const down = document.createElement("button");
        down.type = "button";
        down.className = "admin-icon-button";
        down.textContent = "↓";
        down.title = "Переместить ниже";
        down.setAttribute("aria-label", "Переместить фотографию ниже");
        down.disabled = index === sortedImages.length - 1;
        down.addEventListener("click", () => moveProductImage(productId, sortedImages, index, 1));

        orderControls.append(up, down);

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

        const actions = document.createElement("div");
        actions.className = "admin-image-actions";
        actions.append(orderControls, primary, remove);

        row.append(img, info, actions);
        productImages.append(row);
    });
}

async function moveProductImage(productId, images, index, direction) {
    const targetIndex = index + direction;
    const currentImage = images[index];
    const targetImage = images[targetIndex];

    if (!currentImage || !targetImage || targetImage.is_primary) {
        return;
    }

    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updates = await Promise.all(reordered.map((image, displayOrder) => {
        return supabaseAdmin
            .from("product_images")
            .update({ display_order: displayOrder })
            .eq("id", image.id);
    }));
    const error = updates.find((result) => result.error)?.error;

    if (error) {
        setMessage(productFormMessage, error.message, "error");
        return;
    }

    await renderProductImages(productId);
}

async function fillProductForm(productId) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
        return;
    }

    selectedProductId = productId;
    setProductFormMode("edit");
    productFormTitle.textContent = localField(product, "name") || product.slug;
    productForm.elements.id.value = product.id;
    productForm.elements.slug.value = product.slug;
    productForm.elements.category_id.value = product.categoryId;
    productForm.elements.display_order.value = product.displayOrder;
    productForm.elements.active.checked = product.active;

    ["uk", "ru", "en"].forEach((language) => {
        productForm.elements[`name_${language}`].value = product.name?.[language] || product[`name_${language}`] || "";
        productForm.elements[`short_description_${language}`].value = product.shortDescription?.[language] || product[`short_description_${language}`] || "";
        productForm.elements[`description_${language}`].value = product.description?.[language] || product[`description_${language}`] || "";
        productForm.elements[`pack_${language}`].value = product.pack?.[language] || product[`pack_${language}`] || "";
        productForm.elements[`price_${language}`].value = product.price?.[language] || product[`price_${language}`] || "";
    });

    renderPackOptions(product.packOptions || []);
    renderProducts();
    await renderProductImages(productId);
}

function productPayload() {
    const form = productForm.elements;
    const russianName = form.name_ru.value.trim();

    const payload = {
        slug: form.slug.value.trim(),
        category_id: form.category_id.value,
        active: form.active.checked,
        display_order: Number(form.display_order.value) || 0,
        name_uk: form.name_uk.value.trim() || russianName,
        name_ru: russianName,
        name_en: form.name_en.value.trim() || russianName,
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

    if (supportsPriceFields) {
        payload.price_uk = form.price_uk.value.trim() || null;
        payload.price_ru = form.price_ru.value.trim() || null;
        payload.price_en = form.price_en.value.trim() || null;
    }

    return payload;
}

async function uploadProductImages(productId) {
    const files = [...(productForm.elements.image.files || [])];

    if (!files.length) {
        return;
    }

    if (!supportsR2Images) {
        throw new Error("Сначала выполните SQL-миграцию Cloudflare R2 в Supabase.");
    }

    if (files.length > 10) {
        throw new Error("За один раз можно добавить не больше 10 фотографий.");
    }

    files.forEach((file) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            throw new Error(`Файл «${file.name}» не подходит. Используйте JPG, PNG или WebP.`);
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new Error(`Файл «${file.name}» больше 5 МБ.`);
        }
    });

    const existing = await supabaseAdmin
        .from("product_images")
        .select("id, is_primary, display_order")
        .eq("product_id", productId);

    if (existing.error) {
        throw existing.error;
    }

    if ((existing.data?.length || 0) + files.length > 10) {
        throw new Error("Для одного товара можно хранить не больше 10 фотографий.");
    }

    for (const [index, file] of files.entries()) {
        setMessage(productFormMessage, `Загружаем фото ${index + 1} из ${files.length}...`);
        const body = new FormData();
        body.append("productId", productId);
        body.append("file", file);
        body.append("altUk", productForm.elements.name_uk.value.trim() || productForm.elements.name_ru.value.trim());
        body.append("altRu", productForm.elements.name_ru.value.trim());
        body.append("altEn", productForm.elements.name_en.value.trim() || productForm.elements.name_ru.value.trim());

        await mediaApiRequest("/api/admin/images/upload", {
            method: "POST",
            body
        });
    }

    productForm.elements.image.value = "";
    imageSelectionHint.textContent = "Файлы загружены. Можно выбрать следующую группу фотографий.";
}

async function uploadSelectedProductImages() {
    const productId = String(productForm.elements.id.value || "").trim();

    if (!productId) {
        setMessage(productFormMessage, "Сначала сохраните товар, затем добавляйте фотографии.", "error");
        return;
    }

    if (!(productForm.elements.image.files || []).length) {
        setMessage(productFormMessage, "Сначала выберите хотя бы одну фотографию.", "error");
        return;
    }

    savingProduct = true;
    uploadProductImagesButton.disabled = true;
    saveProductButton.disabled = true;
    setMessage(productFormMessage, "Загружаем фотографии...");

    try {
        await uploadProductImages(productId);
        await loadAdminData();
        await fillProductForm(productId);
        setMessage(productFormMessage, "Фотографии добавлены. Можно выбрать следующую по одной.", "success");
    } catch (error) {
        setMessage(productFormMessage, error?.message || "Не удалось загрузить фотографии.", "error");
    } finally {
        savingProduct = false;
        saveProductButton.disabled = false;
        uploadProductImagesButton.disabled = !productForm.elements.id.value || !supportsR2Images;
    }
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
        const productId = String(productForm.elements.id.value || "").trim();
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
        await saveProductPackOptions(savedProductId);
        await uploadProductImages(savedProductId);
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
    const { data: previousPrimary } = await supabaseAdmin
        .from("product_images")
        .select("id")
        .eq("product_id", productId)
        .eq("is_primary", true)
        .maybeSingle();
    const reset = await supabaseAdmin
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);

    if (reset.error) {
        setMessage(productFormMessage, reset.error.message, "error");
        return;
    }

    const { error } = await supabaseAdmin
        .from("product_images")
        .update({ is_primary: true, display_order: 0 })
        .eq("id", imageId);

    if (error) {
        if (previousPrimary?.id) {
            await supabaseAdmin
                .from("product_images")
                .update({ is_primary: true, display_order: 0 })
                .eq("id", previousPrimary.id);
        }
        setMessage(productFormMessage, error.message, "error");
        return;
    }

    await renderProductImages(productId);
}

async function deleteProductImage(productId, image) {
    if (!window.confirm("Удалить это изображение товара?")) {
        return;
    }

    try {
        if (image.storage_provider === "r2" && image.object_key) {
            await mediaApiRequest("/api/admin/images", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ imageId: image.id, productId })
            });
        } else {
            // This is pre-R2 metadata only. It cannot point to a current R2 file.
            const { error } = await supabaseAdmin
                .from("product_images")
                .delete()
                .eq("id", image.id)
                .eq("product_id", productId);

            if (error) {
                throw error;
            }
        }
    } catch (error) {
        setMessage(productFormMessage, error?.message || "Не удалось удалить фотографию.", "error");
        return;
    }

    if (image.is_primary) {
        const { data: nextImage, error: nextImageError } = await supabaseAdmin
            .from("product_images")
            .select("id")
            .eq("product_id", productId)
            .order("display_order", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (nextImageError) {
            setMessage(productFormMessage, nextImageError.message, "error");
            return;
        }

        if (nextImage?.id) {
            const primaryUpdate = await supabaseAdmin
                .from("product_images")
                .update({ is_primary: true, display_order: 0 })
                .eq("id", nextImage.id);

            if (primaryUpdate.error) {
                setMessage(productFormMessage, primaryUpdate.error.message, "error");
                return;
            }
        }
    }

    await renderProductImages(productId);
}

async function deleteProduct() {
    const productId = String(productForm.elements.id.value || "").trim();
    const product = products.find((item) => item.id === productId);

    if (!productId || !product) {
        return;
    }

    const productName = localField(product, "name") || product.slug;
    const confirmed = window.confirm(
        `Удалить товар «${productName}»?\n\nФотографии будут удалены из Cloudflare R2. Прошлые заявки сохранят историю товара.`
    );

    if (!confirmed) {
        return;
    }

    deleteProductButton.disabled = true;
    setMessage(productFormMessage, "Удаляем товар и фотографии...");

    try {
        const { data: images, error: imagesError } = await supabaseAdmin
            .from("product_images")
            .select("id, object_key, storage_provider")
            .eq("product_id", productId);

        if (imagesError) {
            throw imagesError;
        }

        for (const image of images || []) {
            if (image.storage_provider !== "r2" || !image.object_key) {
                continue;
            }

            await mediaApiRequest("/api/admin/images", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ imageId: image.id, productId })
            });
        }

        const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);

        if (error) {
            throw error;
        }

        resetForm();
        await loadAdminData();
        setMessage(adminGlobalMessage, `Товар «${productName}» удалён.`, "success");
    } catch (error) {
        setMessage(productFormMessage, error?.message || "Не удалось удалить товар.", "error");
    } finally {
        deleteProductButton.disabled = false;
    }
}

async function loadContactRequests() {
    const filter = document.querySelector("[data-request-filter='contact']").value;
    contactRequestsSummary.textContent = "Загружаем заявки на созвон...";
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
        contactRequestsSummary.textContent = "Не удалось загрузить заявки на созвон.";
        renderRequestError(contactRequestsList, error.message);
        return;
    }

    contactRequests = data || [];
    updateRequestBadges();
    renderContactRequests();
}

async function loadProductRequests() {
    const filter = document.querySelector("[data-request-filter='product']").value;
    productRequestsSummary.textContent = "Загружаем товарные заявки...";
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
        productRequestsSummary.textContent = "Не удалось загрузить товарные заявки.";
        renderRequestError(productRequestsList, error.message);
        return;
    }

    productRequests = data || [];
    updateRequestBadges();
    renderProductRequests();
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

function requestSearchValue(type) {
    return document.querySelector(`[data-request-search="${type}"]`)?.value.trim().toLowerCase() || "";
}

function filterContactRequests(rows) {
    const search = requestSearchValue("contact");

    if (!search) {
        return rows;
    }

    return rows.filter((row) => {
        return [row.name, row.phone, row.email, row.message, row.id]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search);
    });
}

function filterProductRequests(rows) {
    const search = requestSearchValue("product");

    if (!search) {
        return rows;
    }

    return rows.filter((row) => {
        const itemNames = (row.items || []).map((item) => item.product_name_snapshot).join(" ");
        return [row.name, row.phone, row.email, row.comment, row.id, itemNames]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search);
    });
}

function formatRequestDate(value) {
    return new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(value));
}

function telegramStatus(status) {
    const labels = {
        sent: ["Отправлено в Telegram", "green"],
        failed: ["Ошибка Telegram", "warm"],
        skipped: ["Telegram не настроен", "neutral"],
        pending: ["Ожидает Telegram", "neutral"]
    };

    return labels[status] || ["Статус Telegram неизвестен", "neutral"];
}

function createContactAction(href, label, value) {
    const link = document.createElement("a");
    link.className = "request-contact-link";
    link.href = href;

    const caption = document.createElement("span");
    caption.textContent = label;
    const text = document.createElement("strong");
    text.textContent = value;
    link.append(caption, text);
    return link;
}

function createRequestHeading(row, type) {
    const head = document.createElement("div");
    head.className = "request-card-head";

    const identity = document.createElement("div");
    identity.className = "request-identity";
    const eyebrow = document.createElement("p");
    eyebrow.className = "request-id";
    eyebrow.textContent = `№ ${row.id.slice(0, 8).toUpperCase()} · ${formatRequestDate(row.created_at)}`;
    const title = document.createElement("h3");
    title.textContent = row.name;
    identity.append(eyebrow, title);

    const statusWrap = document.createElement("label");
    statusWrap.className = "request-status-control";
    const statusLabel = document.createElement("span");
    statusLabel.textContent = "Статус заявки";
    statusWrap.append(statusLabel, requestStatusSelect(row, type));

    head.append(identity, statusWrap);
    return head;
}

function createRequestMeta(row) {
    const meta = document.createElement("div");
    meta.className = "request-meta";

    const language = createBadge(`Язык: ${String(row.language || "ru").toUpperCase()}`);
    const [telegramLabel, telegramTone] = telegramStatus(row.telegram_status);
    const telegram = createBadge(telegramLabel, telegramTone);

    if (row.telegram_error) {
        telegram.title = row.telegram_error;
    }

    meta.append(language, telegram);
    return meta;
}

function createRequestContacts(row) {
    const contacts = document.createElement("div");
    contacts.className = "request-contact-grid";
    contacts.append(createContactAction(`tel:${row.phone.replace(/[^\d+]/g, "")}`, "Телефон", row.phone));

    if (row.email) {
        contacts.append(createContactAction(`mailto:${row.email}`, "Электронная почта", row.email));
    }

    return contacts;
}

function requestFormField(labelText, name, value, type = "text", required = false) {
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = labelText;
    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.value = value || "";
    input.required = required;

    if (name === "name") {
        input.minLength = 2;
        input.maxLength = 120;
    } else if (name === "phone") {
        input.minLength = 5;
        input.maxLength = 40;
    } else if (name === "email") {
        input.maxLength = 180;
    }

    label.append(span, input);
    return label;
}

function requestTextarea(labelText, name, value) {
    const label = document.createElement("label");
    label.className = "request-editor-wide";
    const span = document.createElement("span");
    span.textContent = labelText;
    const textarea = document.createElement("textarea");
    textarea.name = name;
    textarea.rows = 4;
    textarea.maxLength = 2000;
    textarea.value = value || "";
    label.append(span, textarea);
    return label;
}

function requestCopyText(row, type) {
    const lines = [
        type === "contact" ? "Обращение с сайта Nikas" : "Заявка на товары Nikas",
        `Номер: ${row.id}`,
        `Дата: ${formatRequestDate(row.created_at)}`,
        `Имя: ${row.name}`,
        `Телефон: ${row.phone}`,
        row.email ? `Email: ${row.email}` : ""
    ];

    if (type === "contact") {
        lines.push(row.message ? `Вопрос: ${row.message}` : "Вопрос: не указан");
    } else {
        lines.push(row.comment ? `Комментарий: ${row.comment}` : "Комментарий: не указан");
        lines.push("", "Товары:");
        [...(row.items || [])]
            .sort((first, second) => first.display_order - second.display_order)
            .forEach((item, index) => {
                const pack = item.pack_snapshot ? ` (${item.pack_snapshot})` : "";
                const price = item.price_snapshot ? ` · ${item.price_snapshot}` : "";
                lines.push(`${index + 1}. ${item.product_name_snapshot}${pack} — ${item.quantity}${price}`);
            });
    }

    return lines.filter((line) => line !== "").join("\n");
}

async function copyRequest(row, type, button) {
    const text = requestCopyText(row, type);

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.append(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }

        button.textContent = "Скопировано";
        window.setTimeout(() => {
            button.textContent = "Скопировать заявку";
        }, 1200);
    } catch {
        setMessage(adminGlobalMessage, "Не удалось скопировать заявку.", "error");
    }
}

function requestItemField(labelText, fieldName, value, options = {}) {
    const label = document.createElement("label");
    label.className = `request-item-field request-item-field-${fieldName}`;

    const caption = document.createElement("span");
    caption.textContent = labelText;

    const input = document.createElement("input");
    input.type = options.type || "text";
    input.value = value || "";
    input.dataset.requestItemField = fieldName;
    input.required = options.required === true;
    input.disabled = options.disabled === true;

    if (options.disabled) {
        input.title = "Поле включится после повторного запуска supabase/schema.sql.";
    }

    if (options.maxLength) {
        input.maxLength = options.maxLength;
    }

    if (options.type === "number") {
        input.min = String(options.min || 1);
        input.max = String(options.max || 999);
        input.inputMode = "numeric";
    }

    label.append(caption, input);
    return label;
}

function createRequestItemEditRow(item = {}) {
    const itemRow = document.createElement("div");
    itemRow.className = "request-item-edit-row";
    itemRow.dataset.requestItemRow = "";
    itemRow.dataset.requestItemId = item.id || "";
    itemRow.dataset.productId = item.product_id || "";
    itemRow.dataset.productSlug = item.product_slug || "";
    itemRow.dataset.categoryId = item.category_id || "";

    const name = requestItemField(
        "Товар *",
        "name",
        item.product_name_snapshot,
        { required: true, maxLength: 220 }
    );
    const pack = requestItemField(
        "Фасовка",
        "pack",
        item.pack_snapshot,
        { maxLength: 220, disabled: !supportsRequestItemSnapshots }
    );
    const price = requestItemField(
        "Цена",
        "price",
        item.price_snapshot,
        { maxLength: 120, disabled: !supportsRequestItemSnapshots }
    );
    const quantity = requestItemField(
        "Количество",
        "quantity",
        String(item.quantity || 1),
        { type: "number", min: 1, max: 999, required: true }
    );

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-icon-button request-item-remove";
    remove.textContent = "×";
    remove.title = "Удалить позицию из заявки";
    remove.setAttribute("aria-label", "Удалить позицию из заявки");
    remove.addEventListener("click", () => itemRow.remove());

    itemRow.append(name, pack, price, quantity, remove);
    return itemRow;
}

function createRequestEditor(row, type) {
    const details = document.createElement("details");
    details.className = "request-editor-details";

    const summary = document.createElement("summary");
    summary.textContent = "Открыть и редактировать";

    const form = document.createElement("form");
    form.className = "request-editor-form";
    form.dataset.requestEditor = type;
    form.dataset.requestId = row.id;

    form.append(
        requestFormField("Имя клиента *", "name", row.name, "text", true),
        requestFormField("Телефон *", "phone", row.phone, "tel", true),
        requestFormField("Электронная почта", "email", row.email, "email")
    );

    if (type === "contact") {
        form.append(requestTextarea("Вопрос или сообщение", "message", row.message));
    } else {
        form.append(requestTextarea("Комментарий клиента", "comment", row.comment));

        const itemEditor = document.createElement("div");
        itemEditor.className = "request-item-editor request-editor-wide";
        const itemHeading = document.createElement("div");
        itemHeading.className = "request-item-editor-heading";
        const itemTitle = document.createElement("strong");
        itemTitle.textContent = "Товары и количество";

        const addItem = document.createElement("button");
        addItem.type = "button";
        addItem.className = "admin-secondary";
        addItem.textContent = "Добавить позицию";
        itemHeading.append(itemTitle, addItem);
        itemEditor.append(itemHeading);

        if (!supportsRequestItemSnapshots) {
            const schemaHint = document.createElement("p");
            schemaHint.className = "admin-message admin-warning request-item-schema-hint";
            schemaHint.textContent = "Фасовка и цена включатся после повторного запуска supabase/schema.sql.";
            itemEditor.append(schemaHint);
        }

        const itemRows = document.createElement("div");
        itemRows.className = "request-item-edit-rows";
        itemRows.dataset.requestItemRows = "";
        addItem.addEventListener("click", () => {
            itemRows.append(createRequestItemEditRow());
            itemRows.lastElementChild?.querySelector("input")?.focus();
        });
        itemEditor.append(itemRows);

        [...(row.items || [])]
            .sort((first, second) => first.display_order - second.display_order)
            .forEach((item) => {
                itemRows.append(createRequestItemEditRow(item));
            });

        form.append(itemEditor);
    }

    const message = document.createElement("p");
    message.className = "admin-message request-editor-wide";
    message.setAttribute("aria-live", "polite");

    const actions = document.createElement("div");
    actions.className = "request-editor-actions request-editor-wide";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "admin-secondary";
    copy.textContent = "Скопировать заявку";
    copy.addEventListener("click", () => copyRequest(row, type, copy));

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "admin-primary";
    save.textContent = "Сохранить изменения";

    actions.append(copy, save);
    form.append(message, actions);
    form.addEventListener("submit", (event) => saveRequestChanges(event, row, type, message, save));
    details.append(summary, form);
    return details;
}

async function saveRequestChanges(event, row, type, message, button) {
    event.preventDefault();
    const form = event.currentTarget;
    const itemRows = type === "product"
        ? [...form.querySelectorAll("[data-request-item-row]")]
        : [];

    if (!form.checkValidity()) {
        setMessage(message, "Заполните имя, телефон и проверьте почту.", "error");
        return;
    }

    if (type === "product" && !itemRows.length) {
        setMessage(message, "В товарной заявке должна остаться хотя бы одна позиция.", "error");
        return;
    }

    setButtonLoading(button, true, "Сохраняем...", "Сохранить изменения");
    setMessage(message, "Сохраняем изменения...");

    const table = type === "contact" ? "contact_requests" : "product_requests";
    const payload = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim() || null
    };

    if (type === "contact") {
        payload.message = form.elements.message.value.trim() || null;
    } else {
        payload.comment = form.elements.comment.value.trim() || null;
    }

    const update = await supabaseAdmin.from(table).update(payload).eq("id", row.id);

    if (update.error) {
        setMessage(message, update.error.message, "error");
        setButtonLoading(button, false, "Сохраняем...", "Сохранить изменения");
        return;
    }

    if (type === "product") {
        const originalItemIds = (row.items || []).map((item) => item.id).filter(Boolean);
        const retainedItemIds = itemRows.map((itemRow) => itemRow.dataset.requestItemId).filter(Boolean);
        const removedItemIds = originalItemIds.filter((id) => !retainedItemIds.includes(id));
        const itemChanges = itemRows.map((itemRow, displayOrder) => {
            const value = (fieldName) => {
                return itemRow.querySelector(`[data-request-item-field="${fieldName}"]`)?.value.trim() || "";
            };
            const itemPayload = {
                request_id: row.id,
                product_name_snapshot: value("name"),
                quantity: Math.max(1, Math.min(999, Number(value("quantity")) || 1)),
                display_order: displayOrder
            };

            if (supportsRequestItemSnapshots) {
                itemPayload.pack_snapshot = value("pack") || null;
                itemPayload.price_snapshot = value("price") || null;
            }
            const itemId = itemRow.dataset.requestItemId;

            if (itemId) {
                return supabaseAdmin
                    .from("product_request_items")
                    .update(itemPayload)
                    .eq("id", itemId);
            }

            return supabaseAdmin
                .from("product_request_items")
                .insert({
                    ...itemPayload,
                    product_id: itemRow.dataset.productId || null,
                    product_slug: itemRow.dataset.productSlug || null,
                    category_id: itemRow.dataset.categoryId || null
                });
        });

        if (removedItemIds.length) {
            itemChanges.push(
                supabaseAdmin
                    .from("product_request_items")
                    .delete()
                    .in("id", removedItemIds)
            );
        }

        const itemResults = await Promise.all(itemChanges);
        const itemError = itemResults.find((result) => result.error)?.error;

        if (itemError) {
            setMessage(message, itemError.message, "error");
            setButtonLoading(button, false, "Сохраняем...", "Сохранить изменения");
            return;
        }
    }

    setMessage(message, "Изменения сохранены.", "success");
    setButtonLoading(button, false, "Сохраняем...", "Сохранить изменения");

    if (type === "contact") {
        await loadContactRequests();
    } else {
        await loadProductRequests();
    }
}

function renderContactRequests() {
    contactRequestsList.replaceChildren();
    const rows = filterContactRequests(contactRequests);
    const newCount = countByStatus(contactRequests, "new");
    contactRequestsSummary.textContent = `Показано заявок на созвон: ${rows.length}. Новых: ${newCount}.`;

    if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "admin-message";
        empty.textContent = contactRequests.length ? "По вашему поиску ничего не найдено." : "Заявок на созвон пока нет.";
        contactRequestsList.append(empty);
        return;
    }

    rows.forEach((row) => {
        const card = document.createElement("article");
        card.className = "request-card";

        const message = document.createElement("p");
        message.className = "request-message";
        message.textContent = row.message || "Клиент не оставил вопрос.";

        card.append(
            createRequestHeading(row, "contact"),
            createRequestContacts(row),
            createRequestMeta(row),
            message,
            createRequestEditor(row, "contact")
        );
        contactRequestsList.append(card);
    });
}

function renderProductRequests() {
    productRequestsList.replaceChildren();
    const rows = filterProductRequests(productRequests);
    const newCount = countByStatus(productRequests, "new");
    productRequestsSummary.textContent = `Показано товарных заявок: ${rows.length}. Новых: ${newCount}.`;

    if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "admin-message";
        empty.textContent = productRequests.length ? "По вашему поиску ничего не найдено." : "Заявок на товары пока нет.";
        productRequestsList.append(empty);
        return;
    }

    rows.forEach((row) => {
        const card = document.createElement("article");
        card.className = "request-card";

        const comment = document.createElement("p");
        comment.className = "request-message";
        comment.textContent = row.comment || "Клиент не оставил комментарий.";

        const list = document.createElement("ol");
        list.className = "request-items";
        [...(row.items || [])]
            .sort((first, second) => first.display_order - second.display_order)
            .forEach((item) => {
                const li = document.createElement("li");
                const itemCopy = document.createElement("div");
                itemCopy.className = "request-item-copy";
                const name = document.createElement("strong");
                name.textContent = item.product_name_snapshot;
                itemCopy.append(name);

                const details = [item.pack_snapshot, item.price_snapshot].filter(Boolean).join(" · ");

                if (details) {
                    const detail = document.createElement("small");
                    detail.textContent = details;
                    itemCopy.append(detail);
                }

                const quantity = document.createElement("span");
                quantity.textContent = `Количество: ${item.quantity}`;
                li.append(itemCopy, quantity);
                list.append(li);
            });

        card.append(
            createRequestHeading(row, "product"),
            createRequestContacts(row),
            createRequestMeta(row),
            comment,
            list,
            createRequestEditor(row, "product")
        );
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
addPackOptionButton.addEventListener("click", () => {
    if (!supportsPackOptions) {
        setMessage(productFormMessage, "Сначала выполните обновлённый supabase/schema.sql.", "error");
        return;
    }

    packOptionsList.append(createPackOptionRow());
    packOptionsList.lastElementChild?.querySelector("input")?.focus();
});
productForm.addEventListener("submit", saveProduct);
deactivateProductButton.addEventListener("click", deactivateProduct);
deleteProductButton.addEventListener("click", deleteProduct);
uploadProductImagesButton.addEventListener("click", uploadSelectedProductImages);
productForm.elements.image.addEventListener("change", () => {
    const files = [...(productForm.elements.image.files || [])];
    const hasProduct = Boolean(productForm.elements.id.value);
    uploadProductImagesButton.disabled = !hasProduct || !files.length || !supportsR2Images;
    imageSelectionHint.textContent = files.length
        ? hasProduct
            ? `Выбрано файлов: ${files.length}. Нажмите «Загрузить выбранные фото».`
            : `Выбрано файлов: ${files.length}. Сначала создайте товар, затем они загрузятся автоматически.`
        : "Файлы не выбраны. До 10 фотографий, каждая не больше 5 МБ.";
});

document.querySelectorAll("[data-request-search]").forEach((input) => {
    input.addEventListener("input", () => {
        if (input.dataset.requestSearch === "contact") {
            renderContactRequests();
        } else {
            renderProductRequests();
        }
    });
});

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

window.setInterval(() => {
    const requestEditorOpen = Boolean(document.querySelector(".request-editor-details[open]"));

    if (
        !document.hidden
        && !requestEditorOpen
        && document.body.classList.contains("admin-authenticated")
    ) {
        loadContactRequests();
        loadProductRequests();
    }
}, 45000);

initAdmin();
