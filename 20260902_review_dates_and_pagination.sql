-- A separately editable calendar date for each review.
-- Existing reviews keep the calendar day of their original creation in Kyiv time.

begin;

alter table public.product_reviews
    add column if not exists review_date date;

update public.product_reviews
set review_date = (created_at at time zone 'Europe/Kyiv')::date
where review_date is null;

alter table public.product_reviews
    alter column review_date set default current_date;

alter table public.product_reviews
    alter column review_date set not null;

create index if not exists product_reviews_status_review_date_idx
    on public.product_reviews (status, review_date desc);

commit;
