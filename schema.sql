create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.admin_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    is_admin boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.admin_profiles
        where admin_profiles.user_id = auth.uid()
          and admin_profiles.is_admin = true
    );
$$;

revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

create table if not exists public.categories (
    id text primary key,
    slug text not null unique,
    image_path text,
    active boolean not null default true,
    display_order integer not null default 0,
    title_uk text not null,
    title_ru text not null,
    title_en text not null,
    short_title_uk text,
    short_title_ru text,
    short_title_en text,
    description_uk text,
    description_ru text,
    description_en text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    category_id text not null references public.categories(id) on update cascade on delete restrict,
    active boolean not null default true,
    display_order integer not null default 0,
    name_uk text not null,
    name_ru text not null,
    name_en text not null,
    short_description_uk text,
    short_description_ru text,
    short_description_en text,
    description_uk text,
    description_ru text,
    description_en text,
    pack_uk text,
    pack_ru text,
    pack_en text,
    price_uk text,
    price_ru text,
    price_en text,
    image_disclaimer_enabled boolean not null default false,
    predefined_pack_options_enabled boolean not null default true,
    custom_amount_enabled boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.products add column if not exists price_uk text;
alter table public.products add column if not exists price_ru text;
alter table public.products add column if not exists price_en text;
alter table public.products add column if not exists image_disclaimer_enabled boolean not null default false;
alter table public.products add column if not exists predefined_pack_options_enabled boolean not null default true;
alter table public.products add column if not exists custom_amount_enabled boolean not null default false;

create table if not exists public.product_images (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    storage_path text not null,
    storage_provider text not null default 'r2' check (storage_provider = 'r2'),
    object_key text not null,
    is_primary boolean not null default false,
    display_order integer not null default 0,
    alt_uk text,
    alt_ru text,
    alt_en text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (product_id, storage_path)
);

alter table public.product_images add column if not exists storage_provider text not null default 'r2';
alter table public.product_images add column if not exists object_key text;

alter table public.product_images
drop constraint if exists product_images_storage_provider_check;

alter table public.product_images
drop constraint if exists product_images_r2_key_check;

alter table public.product_images
add constraint product_images_storage_provider_check
check (storage_provider = 'r2');

alter table public.product_images
add constraint product_images_r2_key_check
check (
    object_key ~* '^products/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

create or replace function public.enforce_product_image_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    perform pg_advisory_xact_lock(hashtextextended(new.product_id::text, 0));

    if (
        select count(*)
        from public.product_images
        where product_id = new.product_id
    ) >= 10 then
        raise exception 'A product can have at most 10 images.'
            using errcode = '23514';
    end if;

    return new;
end;
$$;

drop trigger if exists product_images_limit_before_insert on public.product_images;
create trigger product_images_limit_before_insert
before insert on public.product_images
for each row execute function public.enforce_product_image_limit();

revoke all on function public.enforce_product_image_limit() from public, anon, authenticated;

create table if not exists public.product_pack_options (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    active boolean not null default true,
    display_order integer not null default 0,
    label_uk text,
    label_ru text not null check (char_length(label_ru) between 1 and 220),
    label_en text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.contact_requests (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 120),
    phone text not null check (char_length(phone) between 5 and 40),
    email text check (email is null or char_length(email) <= 180),
    message text check (message is null or char_length(message) <= 2000),
    language text not null default 'ru' check (language in ('uk', 'ru', 'en')),
    status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
    source_path text,
    idempotency_key text not null unique,
    request_fingerprint text,
    telegram_status text not null default 'pending' check (telegram_status in ('pending', 'sent', 'failed', 'skipped')),
    telegram_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.product_requests (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 120),
    phone text not null check (char_length(phone) between 5 and 40),
    email text check (email is null or char_length(email) <= 180),
    comment text check (comment is null or char_length(comment) <= 2000),
    language text not null default 'ru' check (language in ('uk', 'ru', 'en')),
    status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
    source_path text,
    idempotency_key text not null unique,
    request_fingerprint text,
    telegram_status text not null default 'pending' check (telegram_status in ('pending', 'sent', 'failed', 'skipped')),
    telegram_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.product_request_items (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.product_requests(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    product_slug text,
    category_id text,
    product_name_snapshot text not null,
    pack_snapshot text check (pack_snapshot is null or char_length(pack_snapshot) <= 220),
    price_snapshot text check (price_snapshot is null or char_length(price_snapshot) <= 120),
    quantity integer not null default 1 check (quantity between 1 and 999),
    amount_value numeric(12,3),
    amount_unit text,
    display_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.product_request_items add column if not exists pack_snapshot text;
alter table public.product_request_items add column if not exists price_snapshot text;
alter table public.product_request_items add column if not exists amount_value numeric(12,3);
alter table public.product_request_items add column if not exists amount_unit text;
alter table public.product_request_items drop constraint if exists product_request_items_amount_pair_check;
alter table public.product_request_items add constraint product_request_items_amount_pair_check check (
    (amount_value is null and amount_unit is null)
    or (
        amount_value > 0
        and amount_value <= 1000000
        and amount_unit in ('l', 'kg', 't')
    )
);

create table if not exists public.submission_rate_limits (
    rate_key text primary key,
    window_start timestamptz not null default now(),
    attempts integer not null default 1,
    updated_at timestamptz not null default now()
);

create index if not exists categories_active_order_idx on public.categories (active, display_order);
create index if not exists products_active_category_order_idx on public.products (active, category_id, display_order);
create index if not exists product_images_product_order_idx on public.product_images (product_id, is_primary desc, display_order);
create unique index if not exists product_images_object_key_idx
on public.product_images (object_key)
where object_key is not null;
create index if not exists product_pack_options_product_order_idx on public.product_pack_options (product_id, active, display_order);
create index if not exists contact_requests_status_created_idx on public.contact_requests (status, created_at desc);
create index if not exists product_requests_status_created_idx on public.product_requests (status, created_at desc);
create index if not exists product_request_items_request_idx on public.product_request_items (request_id, display_order);

drop trigger if exists admin_profiles_updated_at on public.admin_profiles;
create trigger admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists product_images_updated_at on public.product_images;
create trigger product_images_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

drop trigger if exists product_pack_options_updated_at on public.product_pack_options;
create trigger product_pack_options_updated_at
before update on public.product_pack_options
for each row execute function public.set_updated_at();

drop trigger if exists contact_requests_updated_at on public.contact_requests;
create trigger contact_requests_updated_at
before update on public.contact_requests
for each row execute function public.set_updated_at();

drop trigger if exists product_requests_updated_at on public.product_requests;
create trigger product_requests_updated_at
before update on public.product_requests
for each row execute function public.set_updated_at();

insert into public.categories (
    id, slug, active, display_order,
    title_uk, title_ru, title_en,
    short_title_uk, short_title_ru, short_title_en,
    description_uk, description_ru, description_en
) values
    ('spices', 'spices', true, 10,
     'Спеції', 'Специи', 'Spices',
     'Спеції', 'Специи', 'Spices',
     'Перець, паприка, сушений часник та базові позиції для кухні, фасування і виробництва.',
     'Перец, паприка, сушеный чеснок и базовые позиции для кухни, фасовки и производства.',
     'Pepper, paprika, dried garlic and core ingredients for kitchens, packing and production.'),
    ('flavor-enhancers', 'flavor-enhancers', true, 20,
     'Функціональні добавки', 'Функциональные добавки', 'Functional Additives',
     'Функціональні добавки', 'Функциональные добавки', 'Functional Additives',
     'Функціональні добавки для стабільності, смаку та технологічних процесів у виробництві.',
     'Функциональные добавки для стабильности, вкуса и технологических процессов в производстве.',
     'Functional ingredients for stability, taste and production processes.'),
    ('proteins', 'proteins', true, 30,
     'Соєві продукти', 'Соевые продукты', 'Soy Products',
     'Соєві продукти', 'Соевые продукты', 'Soy Products',
     'Соєві продукти та інгредієнти для харчового виробництва.',
     'Соевые продукты и ингредиенты для пищевого производства.',
     'Soy products and ingredients for food production.')
on conflict (id) do nothing;

insert into public.products (
    slug, category_id, active, display_order,
    name_uk, name_ru, name_en,
    short_description_uk, short_description_ru, short_description_en,
    description_uk, description_ru, description_en,
    pack_uk, pack_ru, pack_en
) values
    ('red-ground-pepper', 'spices', true, 10,
     'Перець червоний мелений', 'Перец красный молотый', 'Ground Red Pepper',
     'Гостра мелена позиція для соусів, маринадів, сумішей і м''ясних страв.',
     'Острая молотая позиция для соусов, маринадов, смесей и мясных блюд.',
     'A hot ground ingredient for sauces, marinades, blends and meat dishes.',
     'Підходить для фасування, HoReCa та виробництва харчових сумішей.',
     'Подходит для фасовки, HoReCa и производства пищевых смесей.',
     'Suitable for packing, HoReCa and food blend production.',
     'Фасування 1 / 5 / 25 кг', 'Фасовка 1 / 5 / 25 кг', 'Packing 1 / 5 / 25 kg'),
    ('black-ground-pepper', 'spices', true, 20,
     'Перець чорний мелений', 'Перец черный молотый', 'Ground Black Pepper',
     'Базова спеція для кухні, фасування, HoReCa та харчового виробництва.',
     'Базовая специя для кухни, фасовки, HoReCa и пищевого производства.',
     'A core spice for kitchens, packing, HoReCa and food production.',
     'Класична позиція для щоденного використання та оптових поставок.',
     'Классическая позиция для ежедневного использования и оптовых поставок.',
     'A classic item for daily use and wholesale supply.',
     'Фасування від 1 кг', 'Фасовка от 1 кг', 'Packing from 1 kg'),
    ('sweet-ground-paprika', 'spices', true, 30,
     'Паприка мелена солодка', 'Паприка молотая сладкая', 'Sweet Ground Paprika',
     'Яскрава паприка для кольору, м''якого смаку, сумішей і напівфабрикатів.',
     'Яркая паприка для цвета, мягкого вкуса, смесей и полуфабрикатов.',
     'Bright paprika for color, mild flavor, blends and semi-finished products.',
     'Позиція для магазинів, виробництва та професійної кухні.',
     'Позиция для магазинов, производства и профессиональной кухни.',
     'An item for shops, production and professional kitchens.',
     'Мішки до 25 кг', 'Мешки до 25 кг', 'Bags up to 25 kg'),
    ('black-peppercorn', 'spices', true, 40,
     'Перець чорний горошок', 'Перец черный горошек', 'Black Peppercorn',
     'Класичний перець горошком для фасування, млинів і виробництва.',
     'Классический перец горошком для фасовки, мельниц и производства.',
     'Classic peppercorns for packing, grinders and production.',
     'Цільна спеція для маринадів, сумішей і професійної кухні.',
     'Цельная специя для маринадов, смесей и профессиональной кухни.',
     'A whole spice for marinades, blends and professional kitchens.',
     'Фасування 1 / 5 / 25 кг', 'Фасовка 1 / 5 / 25 кг', 'Packing 1 / 5 / 25 kg'),
    ('dried-garlic-ground', 'spices', true, 50,
     'Часник сушений мелений', 'Чеснок сушеный молотый', 'Ground Dried Garlic',
     'Сильний аромат для сумішей, соусів, снеків, маринадів і виробництва.',
     'Сильный аромат для смесей, соусов, снеков, маринадов и производства.',
     'A strong aroma for blends, sauces, snacks, marinades and production.',
     'Зручна суха позиція для рецептур і фасування.',
     'Удобная сухая позиция для рецептур и фасовки.',
     'A convenient dry ingredient for recipes and packing.',
     'Фасування від 1 кг', 'Фасовка от 1 кг', 'Packing from 1 kg'),
    ('monosodium-glutamate-e621', 'flavor-enhancers', true, 60,
     'Глутамат натрію E621', 'Глутамат натрия E621', 'Monosodium Glutamate E621',
     'Функціональна добавка для виробництва, сумішей, снеків і напівфабрикатів.',
     'Функциональная добавка для производства, смесей, снеков и полуфабрикатов.',
     'A functional additive for production, blends, snacks and semi-finished products.',
     'Технологічний інгредієнт для професійних харчових задач.',
     'Технологический ингредиент для профессиональных пищевых задач.',
     'A technical ingredient for professional food applications.',
     'Мішки 25 кг', 'Мешки 25 кг', '25 kg bags'),
    ('citric-acid-food-grade', 'flavor-enhancers', true, 70,
     'Лимонна кислота харчова', 'Лимонная кислота пищевая', 'Food Grade Citric Acid',
     'Базова харчова кислота для виробництва, напоїв, соусів і фасування.',
     'Базовая пищевая кислота для производства, напитков, соусов и фасовки.',
     'A core food acid for production, drinks, sauces and packing.',
     'Підходить для технологічних процесів і оптових поставок.',
     'Подходит для технологических процессов и оптовых поставок.',
     'Suitable for technical processes and wholesale supply.',
     'Мішки 25 кг', 'Мешки 25 кг', '25 kg bags'),
    ('soy-protein-isolate-90', 'proteins', true, 80,
     'Соєвий ізолят 90%', 'Соевый изолят 90%', 'Soy Protein Isolate 90%',
     'Соєвий продукт для харчового виробництва, фаршів і технологічних задач.',
     'Соевый продукт для пищевого производства, фаршей и технологических задач.',
     'A soy ingredient for food production, mince products and technical tasks.',
     'Інгредієнт для виробників і оптових замовлень.',
     'Ингредиент для производителей и оптовых заказов.',
     'An ingredient for manufacturers and wholesale orders.',
     'Мішки 20 / 25 кг', 'Мешки 20 / 25 кг', '20 / 25 kg bags')
on conflict (slug) do nothing;

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_pack_options enable row level security;
alter table public.contact_requests enable row level security;
alter table public.product_requests enable row level security;
alter table public.product_request_items enable row level security;
alter table public.submission_rate_limits enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.product_pack_options to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_images to authenticated;
grant select, insert, update, delete on public.product_pack_options to authenticated;
grant select, update on public.contact_requests to authenticated;
grant select, update on public.product_requests to authenticated;
grant select, insert, update, delete on public.product_request_items to authenticated;

-- Only Supabase Edge Functions use service_role. It is never sent to browsers.
-- Reset privileges first so old deployments cannot leave broader grants behind.
revoke all on public.submission_rate_limits from service_role;
revoke all on public.contact_requests from service_role;
revoke all on public.product_requests from service_role;
revoke all on public.product_request_items from service_role;
grant select, insert, update on public.submission_rate_limits to service_role;
grant select, insert, update on public.contact_requests to service_role;
grant select, insert, update, delete on public.product_requests to service_role;
grant insert on public.product_request_items to service_role;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories for select
using (active = true);

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
on public.categories for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can read active product images" on public.product_images;
create policy "Public can read active product images"
on public.product_images for select
using (
    exists (
        select 1 from public.products
        where products.id = product_images.product_id
          and products.active = true
    )
);

drop policy if exists "Admins can manage product images" on public.product_images;
create policy "Admins can manage product images"
on public.product_images for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can read active product pack options" on public.product_pack_options;
create policy "Public can read active product pack options"
on public.product_pack_options for select
using (
    active = true
    and exists (
        select 1 from public.products
        where products.id = product_pack_options.product_id
          and products.active = true
    )
);

drop policy if exists "Admins can manage product pack options" on public.product_pack_options;
create policy "Admins can manage product pack options"
on public.product_pack_options for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists "Admins can manage admin profiles" on public.admin_profiles;
create policy "Admins can manage admin profiles"
on public.admin_profiles for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can create contact requests" on public.contact_requests;

drop policy if exists "Admins can manage contact requests" on public.contact_requests;
create policy "Admins can manage contact requests"
on public.contact_requests for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can create product requests" on public.product_requests;

drop policy if exists "Admins can manage product requests" on public.product_requests;
create policy "Admins can manage product requests"
on public.product_requests for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can create product request items" on public.product_request_items;

drop policy if exists "Admins can manage product request items" on public.product_request_items;
create policy "Admins can manage product request items"
on public.product_request_items for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can read rate limits" on public.submission_rate_limits;
create policy "Admins can read rate limits"
on public.submission_rate_limits for select
to authenticated
using (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product image files" on storage.objects;
create policy "Public can read product image files"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins can manage product image files" on storage.objects;
create policy "Admins can manage product image files"
on storage.objects for all
to authenticated
using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));
