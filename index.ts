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
    quantity?: number;
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
        const quantity = Math.max(1, Math.min(999, Number(item.quantity) || 1));
        const productId = cleanText(item.productId, 80);

        if (!itemName) {
            throw new Error("Product name is required.");
        }

        return {
            product_id: productId && isUuid(productId) ? productId : null,
            product_slug: cleanText(item.productSlug, 140) || null,
            category_id: cleanText(item.categoryId, 80) || null,
            product_name_snapshot: itemName,
            quantity,
            display_order: Number.isFinite(item.displayOrder) ? Number(item.displayOrder) : index
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
        return json({ error: "Could not save request." }, 500);
    }

    const itemsToInsert = validated.items.map((item) => ({
        ...item,
        request_id: requestRow.id
    }));

    const { error: itemsError } = await supabase
        .from("product_request_items")
        .insert(itemsToInsert);

    if (itemsError) {
        return json({ error: "Could not save request items." }, 500);
    }

    const productLines = validated.items.map((item, index) => {
        return `${index + 1}. ${htmlEscape(item.product_name_snapshot)} - ${item.quantity}`;
    });

    const lines = [
        "<b>Новая товарная заявка Nikas</b>",
        `ID: <code>${htmlEscape(requestRow.id)}</code>`,
        `Имя: ${htmlEscape(validated.name)}`,
        `Телефон: ${htmlEscape(validated.phone)}`,
        validated.email ? `Email: ${htmlEscape(validated.email)}` : "",
        validated.comment ? `Комментарий: ${htmlEscape(validated.comment)}` : "",
        "",
        "<b>Товары:</b>",
        ...productLines,
        "",
        `Язык: ${htmlEscape(validated.language)}`,
        `Дата: ${htmlEscape(requestRow.created_at)}`
    ].filter(Boolean);

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
