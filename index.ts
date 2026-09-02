import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type ReviewPayload = {
    idempotencyKey?: string;
    language?: string;
    productId?: string;
    name?: string;
    rating?: number | null;
    body?: string;
    traits?: string[];
    website?: string;
    sourcePath?: string;
};

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}

function cleanText(value: unknown, maxLength: number) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function currentKyivDate() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Kyiv",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

    return `${value.year}-${value.month}-${value.day}`;
}

const reviewTraits = new Set([
    "current_price", "fast_shipping", "good_service", "accurate_description",
    "in_stock", "polite_seller", "quick_contact", "not_shipped",
    "higher_price", "out_of_stock", "no_contact", "different_from_description",
    "slow_shipping", "rude_seller"
]);

function cleanTraits(value: unknown) {
    const values = Array.isArray(value) ? value : [];
    return [...new Set(values.map((item) => cleanText(item, 48)).filter((item) => reviewTraits.has(item)))];
}

function assertValid(payload: ReviewPayload) {
    const productId = cleanText(payload.productId, 80);
    const authorName = cleanText(payload.name, 120);
    const body = cleanText(payload.body, 2000);
    const traits = cleanTraits(payload.traits);
    const rating = Number(payload.rating);
    const language = ["uk", "ru", "en"].includes(String(payload.language)) ? String(payload.language) : "ru";
    const idempotencyKey = cleanText(payload.idempotencyKey, 120);

    if (productId && !isUuid(productId)) {
        throw new Error("Product is invalid.");
    }

    if (payload.rating !== null && payload.rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        throw new Error("Rating must be from 1 to 5.");
    }

    if (!idempotencyKey) {
        throw new Error("Review key is missing.");
    }

    return {
        productId: productId || null,
        authorName: authorName || null,
        body: body || null,
        traits,
        rating: payload.rating === null || payload.rating === undefined ? null : rating,
        language,
        idempotencyKey,
        sourcePath: cleanText(payload.sourcePath, 260) || null
    };
}

async function sha256(value: string) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(supabase: ReturnType<typeof createClient>, request: Request) {
    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const windowStart = new Date(Math.floor(Date.now() / 600000) * 600000).toISOString();
    const rateKey = await sha256(`review:${forwardedFor.split(",")[0]}:${userAgent}:${windowStart}`);

    const { data } = await supabase
        .from("submission_rate_limits")
        .select("rate_key, attempts")
        .eq("rate_key", rateKey)
        .maybeSingle();

    if (data && data.attempts >= 3) {
        return { allowed: false, rateKey };
    }

    const { error } = await supabase
        .from("submission_rate_limits")
        .upsert({
            rate_key: rateKey,
            window_start: windowStart,
            attempts: data ? data.attempts + 1 : 1
        }, { onConflict: "rate_key" });

    if (error) {
        throw error;
    }

    return { allowed: true, rateKey };
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

    let payload: ReviewPayload;

    try {
        payload = await request.json();
    } catch {
        return json({ error: "Invalid JSON." }, 400);
    }

    if (payload.website) {
        return json({ ok: true, skipped: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
    });

    let validated: ReturnType<typeof assertValid>;

    try {
        validated = assertValid(payload);
        const rate = await enforceRateLimit(supabase, request);

        if (!rate.allowed) {
            return json({ error: "Too many reviews. Please try again later." }, 429);
        }

        const existing = await supabase
            .from("product_reviews")
            .select("id")
            .eq("idempotency_key", validated.idempotencyKey)
            .maybeSingle();

        if (existing.data) {
            return json({ ok: true, reviewId: existing.data.id, duplicate: true });
        }

        if (validated.productId) {
            const { data: product, error: productError } = await supabase
                .from("products")
                .select("id")
                .eq("id", validated.productId)
                .eq("active", true)
                .maybeSingle();

            if (productError || !product) {
                return json({ error: "Product is unavailable." }, 400);
            }
        }

        const { data: review, error: insertError } = await supabase
            .from("product_reviews")
            .insert({
                product_id: validated.productId,
                author_name: validated.authorName,
                rating: validated.rating,
                body: validated.body,
                review_traits: validated.traits,
                language: validated.language,
                review_date: currentKyivDate(),
                status: "pending",
                source: "website",
                source_path: validated.sourcePath,
                idempotency_key: validated.idempotencyKey,
                request_fingerprint: rate.rateKey
            })
            .select("id")
            .single();

        if (insertError || !review) {
            console.error("Could not insert review", {
                code: insertError?.code,
                message: insertError?.message,
                details: insertError?.details
            });
            return json({ error: "Could not save review." }, 500);
        }

        return json({ ok: true, reviewId: review.id });
    } catch (error) {
        console.error("Review submission failed", error);
        return json({ error: error instanceof Error ? error.message : "Validation failed." }, 400);
    }
});
