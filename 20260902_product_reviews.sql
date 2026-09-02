-- Nikas: moderated product reviews. Browser visitors can only read published rows;
-- new reviews are inserted exclusively by the submit-review Edge Function.

begin;

create table if not exists public.product_reviews (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete cascade,
    author_name text check (author_name is null or char_length(author_name) between 1 and 120),
    rating smallint check (rating between 1 and 5),
    body text check (body is null or char_length(body) between 1 and 2000),
    review_traits text[] not null default '{}'::text[] check (
        review_traits <@ array[
            'current_price', 'fast_shipping', 'good_service', 'accurate_description',
            'in_stock', 'polite_seller', 'quick_contact', 'not_shipped',
            'higher_price', 'out_of_stock', 'no_contact', 'different_from_description',
            'slow_shipping', 'rude_seller'
        ]::text[]
    ),
    language text not null default 'ru' check (language in ('uk', 'ru', 'en')),
    review_date date not null default current_date,
    status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
    source text not null default 'website' check (source in ('website', 'admin')),
    source_path text,
    idempotency_key text unique,
    request_fingerprint text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists product_reviews_status_created_idx
on public.product_reviews (status, created_at desc);

create index if not exists product_reviews_status_review_date_idx
on public.product_reviews (status, review_date desc);

create index if not exists product_reviews_product_created_idx
on public.product_reviews (product_id, created_at desc);

drop trigger if exists product_reviews_updated_at on public.product_reviews;
create trigger product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

alter table public.product_reviews enable row level security;

revoke all on public.product_reviews from anon, authenticated, service_role;
grant select on public.product_reviews to anon;
grant select, insert, update, delete on public.product_reviews to authenticated;
grant select, insert, update on public.product_reviews to service_role;

drop policy if exists "Public can read published product reviews" on public.product_reviews;
create policy "Public can read published product reviews"
on public.product_reviews for select
to anon, authenticated
using (
    status = 'published'
    and (
        product_id is null
        or exists (
            select 1
            from public.products
            where products.id = product_reviews.product_id
              and products.active = true
        )
    )
);

drop policy if exists "Admins can manage product reviews" on public.product_reviews;
create policy "Admins can manage product reviews"
on public.product_reviews for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

commit;
