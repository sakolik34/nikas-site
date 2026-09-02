-- Fixed review traits and an explicit DELETE permission for administrators.

begin;

alter table public.product_reviews
    add column if not exists review_traits text[] not null default '{}'::text[];

alter table public.product_reviews
    drop constraint if exists product_reviews_review_traits_check;

alter table public.product_reviews
    add constraint product_reviews_review_traits_check check (
        review_traits <@ array[
            'current_price', 'fast_shipping', 'good_service', 'accurate_description',
            'in_stock', 'polite_seller', 'quick_contact', 'not_shipped',
            'higher_price', 'out_of_stock', 'no_contact', 'different_from_description',
            'slow_shipping', 'rude_seller'
        ]::text[]
    );

grant delete on public.product_reviews to authenticated;

drop policy if exists "Admins can delete product reviews" on public.product_reviews;
create policy "Admins can delete product reviews"
on public.product_reviews for delete
to authenticated
using (public.is_admin(auth.uid()));

commit;
