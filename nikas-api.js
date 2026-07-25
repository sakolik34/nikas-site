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

    function pickPrimaryImage(images = []) {
        if (!Array.isArray(images) || images.length === 0) {
            return null;
        }

        return [...images].sort((first, second) => {
            if (first.is_primary !== second.is_primary) {
                return first.is_primary ? -1 : 1;
            }

            return (first.display_order || 0) - (second.display_order || 0);
        })[0];
    }

    function toCamelProduct(product) {
        const primaryImage = pickPrimaryImage(product.images || product.product_images);
        const imagePath = primaryImage?.storage_path || product.primaryImagePath || product.image_path || "";

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
            imagePath,
            imageUrl: product.imageUrl || publicImageUrl(imagePath),
            images: Array.isArray(product.images || product.product_images)
                ? (product.images || product.product_images)
                : []
        };
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

        return {
            source: "supabase",
            products: (data || []).map(toCamelProduct)
        };
    }

    function createIdempotencyKey(prefix) {
        const randomPart = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        return `${prefix}-${randomPart}`;
    }

    async function invokeFunction(name, payload) {
        const supabaseClient = await getClientAsync();

        if (!supabaseClient) {
            throw new Error(window.NikasI18n?.t("errors.backendNotConfigured") || "Supabase is not configured.");
        }

        const { data, error } = await supabaseClient.functions.invoke(name, {
            body: payload
        });

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
            items: Array.isArray(formValues.items) ? formValues.items : []
        };
    }

    async function submitContactRequest(formValues) {
        const config = getConfig();
        return invokeFunction(config.edgeFunctions?.submitContact || "submit-contact", prepareContactPayload(formValues));
    }

    async function submitProductRequest(formValues) {
        const config = getConfig();
        return invokeFunction(config.edgeFunctions?.submitProductRequest || "submit-product-request", prepareProductRequestPayload(formValues));
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
