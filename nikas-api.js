(function () {
    const SUPABASE_JS_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    let client = null;
    let libraryPromise = null;

    function getConfig() {
        return window.NIKAS_SUPABASE_CONFIG || {};
    }

    function hasRealSupabaseConfig() {
        const config = getConfig();
        const url = config.url || "";
        const anonKey = config.anonKey || "";

        return Boolean(
            url
            && anonKey
            && !url.includes("YOUR_")
            && !anonKey.includes("YOUR_")
            && url.startsWith("https://")
        );
    }

    function loadSupabaseLibrary() {
        if (window.supabase) {
            return Promise.resolve(window.supabase);
        }

        if (libraryPromise) {
            return libraryPromise;
        }

        libraryPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = SUPABASE_JS_CDN;
            script.async = true;
            script.onload = () => resolve(window.supabase);
            script.onerror = () => reject(new Error("Could not load Supabase client library."));
            document.head.append(script);
        });

        return libraryPromise;
    }

    function createClientFromGlobal() {
        if (!hasRealSupabaseConfig() || !window.supabase) {
            return null;
        }

        if (!client) {
            const config = getConfig();
            client = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                }
            });
        }

        return client;
    }

    function getClient() {
        return createClientFromGlobal();
    }

    async function getClientAsync() {
        if (!hasRealSupabaseConfig()) {
            return null;
        }

        if (!window.supabase) {
            await loadSupabaseLibrary();
        }

        return createClientFromGlobal();
    }

    function fallbackCatalog() {
        return window.NIKAS_FALLBACK_CATALOG || window.NIKAS_CATALOG || { categories: [], products: [] };
    }

    function toCamelCategory(category) {
        return {
            id: category.id || category.slug,
            slug: category.slug || category.id,
            tone: category.tone || "pepper",
            active: category.active !== false,
            displayOrder: category.display_order ?? category.displayOrder ?? 0,
            title: category.title || {
                uk: category.title_uk,
                ru: category.title_ru,
                en: category.title_en
            },
            shortTitle: category.shortTitle || {
                uk: category.short_title_uk || category.title_uk,
                ru: category.short_title_ru || category.title_ru,
                en: category.short_title_en || category.title_en
            },
            description: category.description || {
                uk: category.description_uk,
                ru: category.description_ru,
                en: category.description_en
            }
        };
    }

    function publicImageUrl(storagePath) {
        const supabaseClient = getClient();
        const bucket = getConfig().productImagesBucket || "product-images";

        if (!supabaseClient || !storagePath) {
            return "";
        }

        return supabaseClient.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl || "";
    }

    function sortImages(images = []) {
        return [...images].sort((first, second) => {
            if (first.is_primary !== second.is_primary) {
                return first.is_primary ? -1 : 1;
            }

            return (first.display_order || 0) - (second.display_order || 0);
        });
    }

    function pickPrimaryImage(images = []) {
        if (!Array.isArray(images) || images.length === 0) {
            return null;
        }

        return sortImages(images)[0];
    }

    function normalizeProductImages(product) {
        const rawImages = product.images || product.product_images || [];

        if (!Array.isArray(rawImages)) {
            return [];
        }

        return sortImages(rawImages).map((image, index) => {
            const storagePath = image.storage_path || image.storagePath || "";
            return {
                ...image,
                id: image.id || `${product.id || product.slug}-image-${index}`,
                storagePath,
                imageUrl: image.imageUrl || image.url || publicImageUrl(storagePath),
                isPrimary: image.is_primary ?? image.isPrimary ?? index === 0,
                displayOrder: image.display_order ?? image.displayOrder ?? index,
                alt: image.alt || {
                    uk: image.alt_uk,
                    ru: image.alt_ru,
                    en: image.alt_en
                }
            };
        });
    }

    function normalizeProductPackOptions(product) {
        const rawOptions = product.packOptions || product.pack_options || product.product_pack_options || [];

        if (!Array.isArray(rawOptions)) {
            return [];
        }

        return [...rawOptions]
            .filter((packOption) => packOption.active !== false)
            .sort((first, second) => (first.display_order ?? first.displayOrder ?? 0) - (second.display_order ?? second.displayOrder ?? 0))
            .map((packOption, index) => ({
                id: packOption.id || `${product.id || product.slug}-pack-option-${index}`,
                active: packOption.active !== false,
                displayOrder: packOption.display_order ?? packOption.displayOrder ?? index,
                label: packOption.label || {
                    uk: packOption.label_uk,
                    ru: packOption.label_ru,
                    en: packOption.label_en
                }
            }));
    }

    function toCamelProduct(product) {
        const images = normalizeProductImages(product);
        const primaryImage = images.find((image) => image.isPrimary) || images[0] || null;
        const imagePath = primaryImage?.storagePath || product.primaryImagePath || product.image_path || "";
        const packOptions = normalizeProductPackOptions(product);

        return {
            id: product.id || product.slug,
            slug: product.slug || product.id,
            categoryId: product.category_id || product.categoryId,
            tone: product.tone || product.category?.tone || "pepper",
            active: product.active !== false,
            displayOrder: product.display_order ?? product.displayOrder ?? 0,
            name: product.name || {
                uk: product.name_uk,
                ru: product.name_ru,
                en: product.name_en
            },
            shortDescription: product.shortDescription || {
                uk: product.short_description_uk,
                ru: product.short_description_ru,
                en: product.short_description_en
            },
            description: product.description || {
                uk: product.description_uk,
                ru: product.description_ru,
                en: product.description_en
            },
            pack: product.pack || {
                uk: product.pack_uk,
                ru: product.pack_ru,
                en: product.pack_en
            },
            price: product.price || {
                uk: product.price_uk,
                ru: product.price_ru,
                en: product.price_en
            },
            imagePath,
            imageUrl: product.imageUrl || primaryImage?.imageUrl || publicImageUrl(imagePath),
            images,
            packOptions
        };
    }

    function attachPackOptions(productRows, packOptionRows) {
        const byProductId = new Map();

        (packOptionRows || []).forEach((packOption) => {
            const productId = packOption.product_id;

            if (!byProductId.has(productId)) {
                byProductId.set(productId, []);
            }

            byProductId.get(productId).push(packOption);
        });

        return (productRows || []).map((product) => ({
            ...product,
            packOptions: byProductId.get(product.id) || []
        }));
    }

    async function fetchCategories() {
        const supabaseClient = await getClientAsync();

        if (!supabaseClient) {
            return {
                source: "fallback",
                categories: fallbackCatalog().categories.map(toCamelCategory)
            };
        }

        const { data, error } = await supabaseClient
            .from("categories")
            .select("*")
            .eq("active", true)
            .order("display_order", { ascending: true });

        if (error) {
            throw error;
        }

        return {
            source: "supabase",
            categories: (data || []).map(toCamelCategory)
        };
    }

    async function fetchProducts(categoryId = "all") {
        const supabaseClient = await getClientAsync();

        if (!supabaseClient) {
            const products = fallbackCatalog().products
                .filter((product) => product.active !== false)
                .filter((product) => categoryId === "all" || product.categoryId === categoryId)
                .sort((first, second) => (first.displayOrder || 0) - (second.displayOrder || 0));

            return {
                source: "fallback",
                products: products.map(toCamelProduct)
            };
        }

        let query = supabaseClient
            .from("products")
            .select("*, category:categories(*), images:product_images(*)")
            .eq("active", true)
            .order("display_order", { ascending: true });

        if (categoryId !== "all") {
            query = query.eq("category_id", categoryId);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        let packOptions = [];
        const productIds = (data || []).map((product) => product.id).filter(Boolean);

        if (productIds.length) {
            const packOptionsResult = await supabaseClient
                .from("product_pack_options")
                .select("*")
                .in("product_id", productIds)
                .eq("active", true)
                .order("display_order", { ascending: true });

            if (!packOptionsResult.error) {
                packOptions = packOptionsResult.data || [];
            }
        }

        return {
            source: "supabase",
            products: attachPackOptions(data || [], packOptions).map(toCamelProduct)
        };
    }

    function createIdempotencyKey(prefix) {
        const randomPart = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        return `${prefix}-${randomPart}`;
    }

    function createUuid() {
        if (crypto?.randomUUID) {
            return crypto.randomUUID();
        }

        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
            const random = Math.random() * 16 | 0;
            const value = character === "x" ? random : (random & 0x3 | 0x8);
            return value.toString(16);
        });
    }

    function isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
    }

    function isMissingRequestSnapshotColumn(error) {
        const message = String(error?.message || "").toLowerCase();
        return message.includes("pack_snapshot") || message.includes("price_snapshot");
    }

    function isAccessPolicyError(error) {
        const message = String(error?.message || "").toLowerCase();
        return error?.code === "42501"
            || message.includes("row-level security")
            || message.includes("permission denied");
    }

    async function invokeFunction(name, payload) {
        const supabaseClient = await getClientAsync();

        if (!supabaseClient) {
            throw new Error(window.NikasI18n?.t("errors.backendNotConfigured") || "Supabase is not configured.");
        }

        const invocation = supabaseClient.functions.invoke(name, {
            body: payload
        });
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error("Secure request service timed out.")), 8000);
        });
        let response;

        try {
            response = await Promise.race([invocation, timeout]);
        } finally {
            window.clearTimeout(timeoutId);
        }

        const { data, error } = response;

        if (error) {
            throw error;
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return data;
    }

    function currentLanguage() {
        return window.NikasI18n?.getLanguage() || "ru";
    }

    function prepareContactPayload(formValues) {
        return {
            idempotencyKey: formValues.idempotencyKey || createIdempotencyKey("contact"),
            language: currentLanguage(),
            name: formValues.name || "",
            phone: formValues.phone || "",
            email: formValues.email || "",
            message: formValues.message || "",
            website: formValues.website || "",
            sourcePath: window.location.pathname
        };
    }

    function clampQuantity(value) {
        return Math.max(1, Math.min(999, Math.floor(Number(value) || 1)));
    }

    function cleanPayloadText(value, maxLength = 500) {
        return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
    }

    function normalizeProductRequestItems(items) {
        return (Array.isArray(items) ? items : [])
            .map((item, index) => ({
                productId: cleanPayloadText(item.productId, 80),
                productSlug: cleanPayloadText(item.productSlug, 140),
                categoryId: cleanPayloadText(item.categoryId, 80),
                name: cleanPayloadText(item.name, 220),
                pack: cleanPayloadText(item.pack, 220),
                price: cleanPayloadText(item.price, 120),
                quantity: clampQuantity(item.quantity),
                displayOrder: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index
            }))
            .filter((item) => item.name);
    }

    function prepareProductRequestPayload(formValues) {
        return {
            idempotencyKey: formValues.idempotencyKey || createIdempotencyKey("product-request"),
            language: currentLanguage(),
            name: formValues.name || "",
            phone: formValues.phone || "",
            email: formValues.email || "",
            comment: formValues.comment || "",
            website: formValues.website || "",
            sourcePath: window.location.pathname,
            items: normalizeProductRequestItems(formValues.items)
        };
    }

    function directContactRow(payload) {
        return {
            id: createUuid(),
            name: String(payload.name || "").trim(),
            phone: String(payload.phone || "").trim(),
            email: String(payload.email || "").trim() || null,
            message: String(payload.message || "").trim() || null,
            language: payload.language,
            source_path: payload.sourcePath,
            idempotency_key: payload.idempotencyKey,
            status: "new",
            telegram_status: "skipped",
            telegram_error: "Saved directly because the Telegram Edge Function is not available yet."
        };
    }

    async function submitContactDirect(payload) {
        if (payload.website) {
            return { ok: true, skipped: true };
        }

        const supabaseClient = await getClientAsync();

        if (!supabaseClient) {
            throw new Error(window.NikasI18n?.t("errors.backendNotConfigured") || "Supabase is not configured.");
        }

        const row = directContactRow(payload);
        const { error } = await supabaseClient.from("contact_requests").insert(row);

        if (error && error.code !== "23505") {
            throw error;
        }

        return {
            ok: true,
            requestId: row.id,
            duplicate: error?.code === "23505",
            telegramDelivered: false,
            savedDirectly: true
        };
    }

    async function submitProductDirect(payload) {
        if (payload.website) {
            return { ok: true, skipped: true };
        }

        const supabaseClient = await getClientAsync();

        if (!supabaseClient) {
            throw new Error(window.NikasI18n?.t("errors.backendNotConfigured") || "Supabase is not configured.");
        }

        if (!payload.items.length) {
            throw new Error(window.NikasI18n?.t("cart.empty") || "Product list is empty.");
        }

        const requestId = createUuid();
        const requestRow = {
            id: requestId,
            name: String(payload.name || "").trim(),
            phone: String(payload.phone || "").trim(),
            email: String(payload.email || "").trim() || null,
            comment: String(payload.comment || "").trim() || null,
            language: payload.language,
            source_path: payload.sourcePath,
            idempotency_key: payload.idempotencyKey,
            status: "new",
            telegram_status: "skipped",
            telegram_error: "Saved directly because the Telegram Edge Function is not available yet."
        };

        const requestInsert = await supabaseClient.from("product_requests").insert(requestRow);

        if (requestInsert.error?.code === "23505") {
            return {
                ok: true,
                duplicate: true,
                telegramDelivered: false,
                savedDirectly: true
            };
        }

        if (requestInsert.error) {
            if (isAccessPolicyError(requestInsert.error)) {
                throw new Error("Supabase пока не пропускает товарную заявку. Выполните свежий supabase/schema.sql в SQL Editor и попробуйте снова.");
            }

            throw requestInsert.error;
        }

        const itemRows = payload.items.map((item, index) => ({
            request_id: requestId,
            product_id: isUuid(item.productId) ? item.productId : null,
            product_slug: String(item.productSlug || "").trim() || null,
            category_id: String(item.categoryId || "").trim() || null,
            product_name_snapshot: String(item.name || "").trim(),
            pack_snapshot: String(item.pack || "").trim() || null,
            price_snapshot: String(item.price || "").trim() || null,
            quantity: clampQuantity(item.quantity),
            display_order: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index
        }));

        let itemsInsert = await supabaseClient.from("product_request_items").insert(itemRows);

        if (itemsInsert.error && isMissingRequestSnapshotColumn(itemsInsert.error)) {
            const legacyRows = itemRows.map(({ pack_snapshot, price_snapshot, ...item }) => item);
            itemsInsert = await supabaseClient.from("product_request_items").insert(legacyRows);
        }

        if (itemsInsert.error) {
            if (isAccessPolicyError(itemsInsert.error)) {
                throw new Error("Заявка создана, но Supabase не пропускает товары внутри заявки. Выполните свежий supabase/schema.sql в SQL Editor и попробуйте снова.");
            }

            throw new Error(`Заявка сохранена, но товары не добавились: ${itemsInsert.error.message}`);
        }

        return {
            ok: true,
            requestId,
            telegramDelivered: false,
            savedDirectly: true
        };
    }

    async function submitWithFallback(functionName, payload, directSubmit) {
        try {
            return await invokeFunction(functionName, payload);
        } catch (functionError) {
            try {
                return await directSubmit(payload);
            } catch (databaseError) {
                const message = databaseError?.message
                    || functionError?.message
                    || window.NikasI18n?.t("form.error")
                    || "Could not save the request.";
                throw new Error(message);
            }
        }
    }

    async function submitContactRequest(formValues) {
        const config = getConfig();
        const payload = prepareContactPayload(formValues);
        return submitWithFallback(
            config.edgeFunctions?.submitContact || "submit-contact",
            payload,
            submitContactDirect
        );
    }

    async function submitProductRequest(formValues) {
        const config = getConfig();
        const payload = prepareProductRequestPayload(formValues);
        return submitWithFallback(
            config.edgeFunctions?.submitProductRequest || "submit-product-request",
            payload,
            submitProductDirect
        );
    }

    window.NikasApi = {
        getClient,
        readyClient: getClientAsync,
        isConfigured: hasRealSupabaseConfig,
        fetchCategories,
        fetchProducts,
        submitContactRequest,
        submitProductRequest,
        createIdempotencyKey,
        normalizeCategory: toCamelCategory,
        normalizeProduct: toCamelProduct
    };
})();
