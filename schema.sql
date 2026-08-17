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
        where admin_profiles.user_id = is_admin.user_id
          and admin_profiles.is_admin = true
    );
$$;

create table if not exists public.categories (
    id text primary key,
    slug text not null unique,
    tone text not null default 'pepper',
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
    tone text not null default 'pepper',
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
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.products add column if not exists price_uk text;
alter table public.products add column if not exists price_ru text;
alter table public.products add column if not exists price_en text;

create table if not exists public.product_images (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    storage_path text not null,
    is_primary boolean not null default false,
    display_order integer not null default 0,
    alt_uk text,
    alt_ru text,
    alt_en text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (product_id, storage_path)
);

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
    display_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.product_request_items add column if not exists pack_snapshot text;
alter table public.product_request_items add column if not exists price_snapshot text;

create table if not exists public.submission_rate_limits (
    rate_key text primary key,
    window_start timestamptz not null default now(),
    attempts integer not null default 1,
    updated_at timestamptz not null default now()
);

create index if not exists categories_active_order_idx on public.categories (active, display_order);
create index if not exists products_active_category_order_idx on public.products (active, category_id, display_order);
create index if not exists product_images_product_order_idx on public.product_images (product_id, is_primary desc, display_order);
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
    id, slug, tone, active, display_order,
    title_uk, title_ru, title_en,
    short_title_uk, short_title_ru, short_title_en,
    description_uk, description_ru, description_en
) values
    ('spices', 'spices', 'pepper', true, 10,
     'Спеції', 'Специи', 'Spices',
     'Спеції', 'Специи', 'Spices',
     'Перець, паприка, сушений часник та базові позиції для кухні, фасування і виробництва.',
     'Перец, паприка, сушеный чеснок и базовые позиции для кухни, фасовки и производства.',
     'Pepper, paprika, dried garlic and core ingredients for kitchens, packing and production.'),
    ('flavor-enhancers', 'flavor-enhancers', 'additives', true, 20,
     'Підсилювачі смаку', 'Усилители вкуса', 'Flavor Enhancers',
     'Підсилювачі смаку', 'Усилители вкуса', 'Flavor Enhancers',
     'Глутамат натрію, харчові кислоти та технологічні інгредієнти для виробництва.',
     'Глутамат натрия, пищевые кислоты и технологические ингредиенты для производства.',
     'Monosodium glutamate, food acids and technical ingredients for production.'),
    ('proteins', 'proteins', 'soy', true, 30,
     'Білки', 'Белки', 'Proteins',
     'Білки', 'Белки', 'Proteins',
     'Соєві білкові інгредієнти для харчового виробництва та технологічних задач.',
     'Соевые белковые ингредиенты для пищевого производства и технологических задач.',
     'Soy protein ingredients for food production and technical tasks.')
on conflict (id) do nothing;

insert into public.products (
    slug, category_id, tone, active, display_order,
    name_uk, name_ru, name_en,
    short_description_uk, short_description_ru, short_description_en,
    description_uk, description_ru, description_en,
    pack_uk, pack_ru, pack_en
) values
    ('red-ground-pepper', 'spices', 'pepper', true, 10,
     'Перець червоний мелений', 'Перец красный молотый', 'Ground Red Pepper',
     'Гостра мелена позиція для соусів, маринадів, сумішей і м''ясних страв.',
     'Острая молотая позиция для соусов, маринадов, смесей и мясных блюд.',
     'A hot ground ingredient for sauces, marinades, blends and meat dishes.',
     'Підходить для фасування, HoReCa та виробництва харчових сумішей.',
     'Подходит для фасовки, HoReCa и производства пищевых смесей.',
     'Suitable for packing, HoReCa and food blend production.',
     'Фасування 1 / 5 / 25 кг', 'Фасовка 1 / 5 / 25 кг', 'Packing 1 / 5 / 25 kg'),
    ('black-ground-pepper', 'spices', 'whole', true, 20,
     'Перець чорний мелений', 'Перец черный молотый', 'Ground Black Pepper',
     'Базова спеція для кухні, фасування, HoReCa та харчового виробництва.',
     'Базовая специя для кухни, фасовки, HoReCa и пищевого производства.',
     'A core spice for kitchens, packing, HoReCa and food production.',
     'Класична позиція для щоденного використання та оптових поставок.',
     'Классическая позиция для ежедневного использования и оптовых поставок.',
     'A classic item for daily use and wholesale supply.',
     'Фасування від 1 кг', 'Фасовка от 1 кг', 'Packing from 1 kg'),
    ('sweet-ground-paprika', 'spices', 'mixes', true, 30,
     'Паприка мелена солодка', 'Паприка молотая сладкая', 'Sweet Ground Paprika',
     'Яскрава паприка для кольору, м''якого смаку, сумішей і напівфабрикатів.',
     'Яркая паприка для цвета, мягкого вкуса, смесей и полуфабрикатов.',
     'Bright paprika for color, mild flavor, blends and semi-finished products.',
     'Позиція для магазинів, виробництва та професійної кухні.',
     'Позиция для магазинов, производства и профессиональной кухни.',
     'An item for shops, production and professional kitchens.',
     'Мішки до 25 кг', 'Мешки до 25 кг', 'Bags up to 25 kg'),
    ('black-peppercorn', 'spices', 'whole', true, 40,
     'Перець чорний горошок', 'Перец черный горошек', 'Black Peppercorn',
     'Класичний перець горошком для фасування, млинів і виробництва.',
     'Классический перец горошком для фасовки, мельниц и производства.',
     'Classic peppercorns for packing, grinders and production.',
     'Цільна спеція для маринадів, сумішей і професійної кухні.',
     'Цельная специя для маринадов, смесей и профессиональной кухни.',
     'A whole spice for marinades, blends and professional kitchens.',
     'Фасування 1 / 5 / 25 кг', 'Фасовка 1 / 5 / 25 кг', 'Packing 1 / 5 / 25 kg'),
    ('dried-garlic-ground', 'spices', 'vegetables', true, 50,
     'Часник сушений мелений', 'Чеснок сушеный молотый', 'Ground Dried Garlic',
     'Сильний аромат для сумішей, соусів, снеків, маринадів і виробництва.',
     'Сильный аромат для смесей, соусов, снеков, маринадов и производства.',
     'A strong aroma for blends, sauces, snacks, marinades and production.',
     'Зручна суха позиція для рецептур і фасування.',
     'Удобная сухая позиция для рецептур и фасовки.',
     'A convenient dry ingredient for recipes and packing.',
     'Фасування від 1 кг', 'Фасовка от 1 кг', 'Packing from 1 kg'),
    ('monosodium-glutamate-e621', 'flavor-enhancers', 'additives', true, 60,
     'Глутамат натрію E621', 'Глутамат натрия E621', 'Monosodium Glutamate E621',
     'Підсилювач смаку для виробництва, сумішей, снеків і напівфабрикатів.',
     'Усилитель вкуса для производства, смесей, снеков и полуфабрикатов.',
     'A flavor enhancer for production, blends, snacks and semi-finished products.',
     'Технологічний інгредієнт для професійних харчових задач.',
     'Технологический ингредиент для профессиональных пищевых задач.',
     'A technical ingredient for professional food applications.',
     'Мішки 25 кг', 'Мешки 25 кг', '25 kg bags'),
    ('citric-acid-food-grade', 'flavor-enhancers', 'citric', true, 70,
     'Лимонна кислота харчова', 'Лимонная кислота пищевая', 'Food Grade Citric Acid',
     'Базова харчова кислота для виробництва, напоїв, соусів і фасування.',
     'Базовая пищевая кислота для производства, напитков, соусов и фасовки.',
     'A core food acid for production, drinks, sauces and packing.',
     'Підходить для технологічних процесів і оптових поставок.',
     'Подходит для технологических процессов и оптовых поставок.',
     'Suitable for technical processes and wholesale supply.',
     'Мішки 25 кг', 'Мешки 25 кг', '25 kg bags'),
    ('soy-protein-isolate-90', 'proteins', 'soy', true, 80,
     'Соєвий ізолят 90%', 'Соевый изолят 90%', 'Soy Protein Isolate 90%',
     'Білкова позиція для харчового виробництва, фаршів і технологічних задач.',
     'Белковая позиция для пищевого производства, фаршей и технологических задач.',
     'A protein ingredient for food production, mince products and technical tasks.',
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
grant insert on public.contact_requests to anon, authenticated;
grant insert on public.product_requests to anon, authenticated;
grant insert on public.product_request_items to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_images to authenticated;
grant select, insert, update, delete on public.product_pack_options to authenticated;
grant select, update on public.contact_requests to authenticated;
grant select, update on public.product_requests to authenticated;
grant select, insert, update, delete on public.product_request_items to authenticated;

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
create policy "Public can create contact requests"
on public.contact_requests for insert
to anon, authenticated
with check (status = 'new');

drop policy if exists "Admins can manage contact requests" on public.contact_requests;
create policy "Admins can manage contact requests"
on public.contact_requests for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can create product requests" on public.product_requests;
create policy "Public can create product requests"
on public.product_requests for insert
to anon, authenticated
with check (status = 'new');

drop policy if exists "Admins can manage product requests" on public.product_requests;
create policy "Admins can manage product requests"
on public.product_requests for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can create product request items" on public.product_request_items;
create policy "Public can create product request items"
on public.product_request_items for insert
to anon, authenticated
with check (quantity between 1 and 999);

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
