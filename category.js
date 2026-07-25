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

function t(key, paramsValue) {
    return window.NikasI18n?.t(key, paramsValue) || key;
}

function field(record, name) {
    return window.NikasI18n?.field(record, name) || "";
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

    return pageState.categories.find((category) => category.id === selectedCategoryId || category.slug === selectedCategoryId);
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

function createProductVisual(product) {
    const visual = document.createElement("div");
    visual.className = `product-photo product-tone-${product.tone || "pepper"}`;
    visual.setAttribute("aria-label", field(product, "name"));

    if (product.imageUrl) {
        const image = document.createElement("img");
        image.src = product.imageUrl;
        image.alt = field(product, "name");
        image.loading = "lazy";
        visual.append(image);
    }

    return visual;
}

function createProductCard(product) {
    const productId = getProductId(product);
    const productName = field(product, "name");
    const productPack = field(product, "pack");

    const card = document.createElement("article");
    card.className = "product-card";

    const body = document.createElement("div");
    body.className = "product-card-body";

    const meta = createTextElement("span", "product-meta", productPack || t("product.priceAvailability"));
    const title = createTextElement("h3", "", productName);
    const description = createTextElement("p", "", field(product, "shortDescription") || field(product, "description"));

    const details = document.createElement("div");
    details.className = "product-details";
    details.append(
        createTextElement("span", "", productPack),
        createTextElement("strong", "", t("product.priceAvailability"))
    );

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const orderButton = document.createElement("button");
    orderButton.className = "mini-button primary-mini";
    orderButton.type = "button";
    orderButton.textContent = t("cart.add");
    orderButton.addEventListener("click", (event) => {
        event.stopPropagation();
        window.NikasCart.addItem({
            id: productId,
            productId,
            slug: product.slug,
            name: product.name,
            pack: product.pack,
            categoryId: product.categoryId
        });

        orderButton.textContent = t("cart.added");
        setTimeout(() => {
            orderButton.textContent = t("cart.add");
        }, 900);
    });

    const contactLink = document.createElement("a");
    contactLink.className = "mini-button";
    contactLink.href = "./index.html#contacts";
    contactLink.textContent = t("cart.ask");

    actions.append(orderButton, contactLink);
    body.append(meta, title, description, details, actions);
    card.append(createProductVisual(product), body);

    return card;
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
    categoryBadge.textContent = selectedCategoryId === "all" ? t("category.page.allBadge") : t("category.page.sectionBadge");
    productSectionTitle.textContent = field(category, "shortTitle") || field(category, "title");
    productCount.textContent = pageState.error ? t("product.loadError") : productCountLabel(products.length);
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
}

window.addEventListener("nikas:languagechange", renderCategoryPage);
loadCategoryPage();
