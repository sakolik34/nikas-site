-- Allow visitors to submit a review without choosing a catalog product or rating.

begin;

alter table public.product_reviews
alter column product_id drop not null;

alter table public.product_reviews
alter column rating drop not null;

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

commit;
