-- Nikas: visible category names plus the optional disclosure for AI/artistic product images.
-- Existing products keep their category IDs and remain in the same sections.

begin;

alter table public.products
add column if not exists image_disclaimer_enabled boolean not null default false;

comment on column public.products.image_disclaimer_enabled is
'When true, show a small disclosure that product photos are artistic representations and may differ from the real product.';

update public.categories
set
    title_uk = 'Спеції',
    title_ru = 'Специи',
    title_en = 'Spices',
    short_title_uk = 'Спеції',
    short_title_ru = 'Специи',
    short_title_en = 'Spices',
    description_uk = 'Перець, паприка, сушений часник та базові позиції для кухні, фасування і виробництва.',
    description_ru = 'Перец, паприка, сушеный чеснок и базовые позиции для кухни, фасовки и производства.',
    description_en = 'Pepper, paprika, dried garlic and core ingredients for kitchens, packing and production.'
where id = 'spices';

update public.categories
set
    title_uk = 'Функціональні добавки',
    title_ru = 'Функциональные добавки',
    title_en = 'Functional Additives',
    short_title_uk = 'Функціональні добавки',
    short_title_ru = 'Функциональные добавки',
    short_title_en = 'Functional Additives',
    description_uk = 'Функціональні добавки для стабільності, смаку та технологічних процесів у виробництві.',
    description_ru = 'Функциональные добавки для стабильности, вкуса и технологических процессов в производстве.',
    description_en = 'Functional ingredients for stability, taste and production processes.'
where id = 'flavor-enhancers';

update public.categories
set
    title_uk = 'Соєві продукти',
    title_ru = 'Соевые продукты',
    title_en = 'Soy Products',
    short_title_uk = 'Соєві продукти',
    short_title_ru = 'Соевые продукты',
    short_title_en = 'Soy Products',
    description_uk = 'Соєві продукти та інгредієнти для харчового виробництва.',
    description_ru = 'Соевые продукты и ингредиенты для пищевого производства.',
    description_en = 'Soy products and ingredients for food production.'
where id = 'proteins';

commit;
