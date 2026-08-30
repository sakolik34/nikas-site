-- Nikas: use Cloudflare R2 as the only product-image storage.
-- Safe for the current project: legacy Supabase Storage image metadata is removed.
-- Product records, R2 images and historical customer requests are not deleted.

begin;

delete from public.product_images
where storage_provider is distinct from 'r2'
   or object_key is null;

-- Keep storage_path temporarily as a compatibility mirror for the deployed
-- image Worker. It is no longer a Supabase Storage path and always equals the
-- R2 object key.
update public.product_images
set storage_path = object_key
where storage_path is distinct from object_key;

-- Tone used to power decorative color placeholders in the browser. Product
-- images now come only from R2, so the field has no business purpose anymore.
alter table public.categories
drop column if exists tone;

alter table public.products
drop column if exists tone;

alter table public.product_images
drop constraint if exists product_images_storage_provider_check;

alter table public.product_images
drop constraint if exists product_images_r2_key_check;

alter table public.product_images
alter column storage_provider set default 'r2';

alter table public.product_images
alter column object_key set not null;

alter table public.product_images
add constraint product_images_storage_provider_check
check (storage_provider = 'r2');

alter table public.product_images
add constraint product_images_r2_key_check
check (
    object_key ~* '^products/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

comment on column public.product_images.storage_path is
'Compatibility mirror of object_key for the Cloudflare R2 image Worker. Not a Supabase Storage path.';

comment on column public.product_images.storage_provider is
'Always r2. Product images are stored only in Cloudflare R2.';

commit;
