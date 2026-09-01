-- Nikas: selectable fixed pack options and customer-entered physical amounts.
-- The customer may use either mode or both, depending on the product settings.

begin;

alter table public.products
add column if not exists predefined_pack_options_enabled boolean not null default true;

alter table public.products
add column if not exists custom_amount_enabled boolean not null default false;

comment on column public.products.predefined_pack_options_enabled is
'When true, show product_pack_options as selectable fixed variants.';

comment on column public.products.custom_amount_enabled is
'When true, allow the customer to enter a physical amount and choose l, kg or t.';

alter table public.product_request_items
add column if not exists amount_value numeric(12,3);

alter table public.product_request_items
add column if not exists amount_unit text;

alter table public.product_request_items
drop constraint if exists product_request_items_amount_pair_check;

alter table public.product_request_items
add constraint product_request_items_amount_pair_check check (
    (amount_value is null and amount_unit is null)
    or (
        amount_value > 0
        and amount_value <= 1000000
        and amount_unit in ('l', 'kg', 't')
    )
);

comment on column public.product_request_items.amount_value is
'Customer-entered physical amount. NULL when a predefined pack option is used.';

comment on column public.product_request_items.amount_unit is
'Stable physical unit code: l, kg or t.';

commit;
