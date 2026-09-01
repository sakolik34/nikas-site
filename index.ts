import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type ProductRequestItem = {
    productId?: string;
    productSlug?: string;
    categoryId?: string;
    name?: string;
    pack?: string;
    price?: string;
    quantity?: number;
    amountValue?: number | string;
    amountUnit?: string;
    displayOrder?: number;
};

type ProductRequestPayload = {
    idempotencyKey?: string;
    language?: string;
    name?: string;
    phone?: string;
    email?: string;
    comment?: string;
    website?: string;
    sourcePath?: string;
    items?: ProductRequestItem[];
};

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
        }
    });
}

function cleanText(value: unknown, maxLength: number) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizePhone(value: unknown) {
    return String(value || "").trim().replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ").slice(0, 40);
}

function normalizeEmail(value: unknown) {
    const email = cleanText(value, 180).toLowerCase();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeAmountValue(value: unknown) {
    const normalized = Number(String(value ?? "").trim().replace(",", "."));

    if (!Number.isFinite(normalized) || normalized <= 0 || normalized > 1000000) {
        return null;
    }

    return Math.round(normalized * 1000) / 1000;
}

function formatAmount(value: number, unit: string) {
    const formattedValue = new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 3
    }).format(value);
    const units: Record<string, string> = { l: "л", kg: "кг", t: "т" };
    return `${formattedValue} ${units[unit] || unit}`;
}

function formatRequestDate(value: string, timeZone: string) {
    return new Intl.DateTimeFormat("ru-RU", {
        timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(new Date(value));
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertValid(payload: ProductRequestPayload) {
    const name = cleanText(payload.name, 120);
    const phone = normalizePhone(payload.phone);
    const email = normalizeEmail(payload.email);
    const comment = cleanText(payload.comment, 2000);
    const language = ["uk", "ru", "en"].includes(String(payload.language)) ? String(payload.language) : "ru";
    const idempotencyKey = cleanText(payload.idempotencyKey, 120);
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (name.length < 2) {
        throw new Error("Name is required.");
    }

    if (phone.length < 5) {
        throw new Error("Phone is required.");
    }

    if (payload.email && !email) {
        throw new Error("Email is invalid.");
    }

    if (!idempotencyKey) {
        throw new Error("Request key is missing.");
    }

    if (!items.length || items.length > 50) {
        throw new Error("Product list is empty or too large.");
    }

    const normalizedItems = items.map((item, index) => {
        const itemName = cleanText(item.name, 220);
        const quantity = Math.max(1, Math.min(999, Math.floor(Number(item.quantity) || 1)));
        const productId = cleanText(item.productId, 80);
        const hasAmountValue = item.amountValue !== undefined
            && item.amountValue !== null
            && String(item.amountValue).trim() !== "";
        const hasAmountUnit = Boolean(cleanText(item.amountUnit, 4));
        const amountValue = hasAmountValue ? normalizeAmountValue(item.amountValue) : null;
        const amountUnit = hasAmountUnit ? cleanText(item.amountUnit, 4) : null;

        if (!itemName) {
            throw new Error("Product name is required.");
        }

        if (hasAmountValue !== hasAmountUnit) {
            throw new Error("Product amount and unit must be provided together.");
        }

        if (hasAmountValue && (amountValue === null || !["l", "kg", "t"].includes(amountUnit || ""))) {
            throw new Error("Product amount is invalid.");
        }

        return {
            product_id: productId && isUuid(productId) ? productId : null,
            product_slug: cleanText(item.productSlug, 140) || null,
            category_id: cleanText(item.categoryId, 80) || null,
            product_name_snapshot: itemName,
            pack: cleanText(item.pack, 220) || null,
            price: cleanText(item.price, 120) || null,
            quantity,
            amount_value: amountValue,
            amount_unit: amountValue !== null ? amountUnit : null,
            display_order: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index
        };
    });

    return {
        name,
        phone,
        email: email || null,
        comment: comment || null,
        language,
        idempotencyKey,
        sourcePath: cleanText(payload.sourcePath, 260) || null,
        items: normalizedItems
    };
}

function htmlEscape(value: unknown) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function sha256(value: string) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(supabase: ReturnType<typeof createClient>, request: Request) {
    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    const rateKey = await sha256(`product-request:${forwardedFor.split(",")[0]}:${userAgent}:${windowStart}`);

    const { data } = await supabase
        .from("submission_rate_limits")
        .select("rate_key, attempts")
        .eq("rate_key", rateKey)
        .maybeSingle();

    if (data && data.attempts >= 4) {
        return { allowed: false, rateKey };
    }

    await supabase
        .from("submission_rate_limits")
        .upsert({
            rate_key: rateKey,
            window_start: windowStart,
            attempts: data ? data.attempts + 1 : 1
        }, { onConflict: "rate_key" });

    return { allowed: true, rateKey };
}

async function sendTelegram(message: string) {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!token || !chatId) {
        return { status: "skipped", error: "Telegram secrets are not configured." };
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        return { status: "failed", error: errorText.slice(0, 500) };
    }

    return { status: "sent", error: null };
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
        return json({ error: "Server is not configured." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
    });

    let payload: ProductRequestPayload;

    try {
        payload = await request.json();
    } catch {
        return json({ error: "Invalid JSON." }, 400);
    }

    if (payload.website) {
        return json({ ok: true, skipped: true });
    }

    const rate = await enforceRateLimit(supabase, request);

    if (!rate.allowed) {
        return json({ error: "Too many requests. Please try again later." }, 429);
    }

    let validated: ReturnType<typeof assertValid>;

    try {
        validated = assertValid(payload);
    } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Validation failed." }, 400);
    }

    const existing = await supabase
        .from("product_requests")
        .select("id, telegram_status")
        .eq("idempotency_key", validated.idempotencyKey)
        .maybeSingle();

    if (existing.data) {
        return json({ ok: true, requestId: existing.data.id, duplicate: true });
    }

    const { data: requestRow, error: insertError } = await supabase
        .from("product_requests")
        .insert({
            name: validated.name,
            phone: validated.phone,
            email: validated.email,
            comment: validated.comment,
            language: validated.language,
            source_path: validated.sourcePath,
            idempotency_key: validated.idempotencyKey,
            request_fingerprint: rate.rateKey,
            status: "new"
        })
        .select("id, created_at")
        .single();

    if (insertError || !requestRow) {
        console.error("Could not insert product request", {
            code: insertError?.code,
            message: insertError?.message,
            details: insertError?.details
        });
        return json({ error: "Could not save request." }, 500);
    }

    const itemsToInsert = validated.items.map((item) => ({
        product_id: item.product_id,
        product_slug: item.product_slug,
        category_id: item.category_id,
        product_name_snapshot: item.product_name_snapshot,
        pack_snapshot: item.pack,
        price_snapshot: item.price,
        quantity: item.quantity,
        amount_value: item.amount_value,
        amount_unit: item.amount_unit,
        display_order: item.display_order,
        request_id: requestRow.id
    }));

    let { error: itemsError } = await supabase
        .from("product_request_items")
        .insert(itemsToInsert);

    if (itemsError && /pack_snapshot|price_snapshot|amount_value|amount_unit/i.test(itemsError.message || "")) {
        const legacyItems = itemsToInsert.map(({
            pack_snapshot,
            price_snapshot,
            amount_value,
            amount_unit,
            ...item
        }) => item);
        const legacyInsert = await supabase
            .from("product_request_items")
            .insert(legacyItems);
        itemsError = legacyInsert.error;
    }

    if (itemsError) {
        console.error("Could not insert product request items", {
            code: itemsError.code,
            message: itemsError.message,
            details: itemsError.details
        });
        await supabase.from("product_requests").delete().eq("id", requestRow.id);
        return json({ error: "Could not save request items." }, 500);
    }

    const productLines = validated.items.map((item, index) => {
        const pack = item.pack ? ` (${htmlEscape(item.pack)})` : "";
        const price = item.price ? ` · ${htmlEscape(item.price)}` : "";
        const amount = item.amount_value !== null && item.amount_unit
            ? ` — объём: ${htmlEscape(formatAmount(item.amount_value, item.amount_unit))}`
            : "";
        const positions = item.quantity > 1 || !amount
            ? ` — количество позиций: ${item.quantity}`
            : "";
        return `${index + 1}. ${htmlEscape(item.product_name_snapshot)}${pack}${amount}${positions}${price}`;
    });

    const requestNumber = String(requestRow.id).slice(0, 8).toUpperCase();
    const lines = [
        "<b>Новая товарная заявка Nikas</b>",
        `<b>№${htmlEscape(requestNumber)}</b>`,
        "",
        `Имя: ${htmlEscape(validated.name)}`,
        "<b>Товары:</b>",
        ...productLines,
        `Комментарий: ${htmlEscape(validated.comment || "—")}`,
        "",
        `Телефон: ${htmlEscape(validated.phone)}`,
        `Почта: ${htmlEscape(validated.email || "—")}`,
        `Язык: ${htmlEscape(validated.language)}`,
        "",
        `Дата(Киев): ${htmlEscape(formatRequestDate(requestRow.created_at, "Europe/Kyiv"))}`,
        `Дата(Берлин): ${htmlEscape(formatRequestDate(requestRow.created_at, "Europe/Berlin"))}`,
        "",
        `ID: <code>${htmlEscape(requestRow.id)}</code>`
    ];

    const telegram = await sendTelegram(lines.join("\n"));

    await supabase
        .from("product_requests")
        .update({
            telegram_status: telegram.status,
            telegram_error: telegram.error
        })
        .eq("id", requestRow.id);

    return json({
        ok: true,
        requestId: requestRow.id,
        telegramDelivered: telegram.status === "sent"
    });
});
