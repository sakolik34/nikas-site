# Nikas: Cloudflare R2 для фотографий товаров

Этот переход меняет только хранение фотографий товаров.

- Supabase остаётся базой данных и системой входа администраторов.
- Cloudflare R2 хранит новые JPG, PNG и WebP.
- `images.nikascompany.com` публично отдаёт изображения посетителям.
- `media-api.nikascompany.com` принимает защищённые команды админки.
- Интерфейс `/admin.html` остаётся прежним: выбрать файлы и сохранить товар.

## Что уже сделано в коде

1. Каталог понимает и старые Supabase-фотографии, и новые R2-фотографии.
2. Новые изображения загружаются только через защищённый Worker.
3. Worker проверяет действующий Supabase access token и `admin_profiles.is_admin`.
4. В браузере нет R2 API token, Access Key, Secret Key или Supabase `service_role`.
5. Разрешены только JPG, PNG и WebP до 5 МБ. Проверяется не только MIME type, но и сигнатура файла.
6. Имя создаётся через `crypto.randomUUID()` в формате:

```text
products/<product_uuid>/<image_uuid>.webp
```

7. Если запись в Supabase не создалась, Worker удаляет уже загруженный объект из R2.
8. Если R2 не удалил файл, удалённая запись базы восстанавливается.
9. База отдельно запрещает больше 10 фотографий на один товар.
10. Новые URL изображений создаются уникальными. Браузер хранит их в кеше не дольше суток, поэтому обычное обновление фото видно сразу по новому адресу, а удалённое фото не останется в кеше на год.

## Безопасный порядок включения

Не публикуйте новый `nikas-api.js` раньше, чем будут развернуты и проверены обе
Supabase Edge Functions для заявок. В финальной версии сайта посетитель больше не
может записывать заявку прямо в таблицы базы: все заявки проходят проверку на
сервере. Правильный порядок такой:

1. выполнить миграцию изображений в Supabase;
   если проект был создан по старой версии схемы — выполнить также миграцию
   `20260829_request_functions_support.sql`;
2. создать R2 bucket и подключить домен изображений;
3. развернуть Worker для админской загрузки фото;
4. развернуть и проверить обе Supabase Edge Functions;
5. выполнить миграцию блокировки прямых заявок;
6. только затем опубликовать обновлённый основной сайт через GitHub.

## 1. Обновить Supabase

Откройте Supabase → SQL Editor → New query.

Вставьте весь файл:

```text
supabase/migrations/20260826_cloudflare_r2_product_images.sql
```

Нажмите **Run**. Успешный результат обычно выглядит как `Success. No rows returned`.

Миграция безопасная и повторяемая. Она:

- не удаляет товары, заявки и фотографии;
- добавляет `storage_provider` и `object_key`;
- добавляет лимит 10 фотографий;
- усиливает проверку роли администратора.

## 2. Создать R2 bucket

В Cloudflare откройте **R2 object storage** и создайте bucket:

```text
nikas-product-images
```

Для фотографий можно выбрать стандартный класс хранения. Создавать R2 API token для сайта или админки не нужно: Worker получает доступ через R2 Binding.

## 3. Подключить публичный домен изображений

Откройте bucket `nikas-product-images` → **Settings** → **Custom Domains** → **Add**.

Укажите:

```text
images.nikascompany.com
```

Дождитесь статуса **Active**. Публичный адрес `r2.dev` для production включать не нужно. Если он включён для теста, после подключения домена его лучше выключить.

## 4. Развернуть защищённый Worker

Код Worker находится в:

```text
cloudflare/image-worker
```

Конфигурация уже содержит:

- Worker `nikas-image-api`;
- R2 Binding `PRODUCT_IMAGES` → `nikas-product-images`;
- custom domain `media-api.nikascompany.com`;
- разрешённые origins сайта и локальной проверки;
- Supabase URL и publishable key;
- Workers Logs.

Publishable key не является серверным секретом. `service_role` и R2 secret в проект не добавляются.

Для развёртывания через Wrangler:

```bash
cd "/Users/aleksandrlymar/Desktop/Nikas/cloudflare/image-worker"
pnpm install
pnpm exec wrangler login
pnpm exec wrangler deploy
```

При первом `wrangler login` откроется Cloudflare и попросит подтвердить ваш аккаунт.

После развёртывания проверьте в браузере:

```text
https://media-api.nikascompany.com/api/health
```

Ожидаемый ответ:

```json
{"ok":true,"service":"nikas-image-api"}
```

## 5. Развернуть защищённые заявки и закрыть прямой доступ

Сначала разверните функции из `supabase/functions/` по инструкции в
`SUPABASE_SETUP.md`. Обе формы сайта должны успешно создать тестовые заявки в
админке. Только после такой проверки откройте Supabase → SQL Editor → New query,
вставьте весь файл и нажмите **Run**:

```text
supabase/migrations/20260828_lock_down_public_requests.sql
supabase/migrations/20260829_request_functions_support.sql
```

Этот короткий SQL ничего не удаляет. Он запрещает браузеру обходить серверную
проверку и создавать записи напрямую в таблицах заявок, при этом сохраняет для
вошедшего администратора возможность добавлять позиции в уже существующую
товарную заявку.

## 6. Обновить основной сайт

Отправьте в GitHub обновлённые файлы сайта, включая:

```text
admin.html
admin.css
admin.js
nikas-api.js
supabase-config.js
_headers
.gitignore
supabase/schema.sql
supabase/migrations/20260826_cloudflare_r2_product_images.sql
supabase/migrations/20260828_lock_down_public_requests.sql
cloudflare/image-worker/*
supabase/functions/*
```

После commit Cloudflare должен автоматически развернуть новую версию основного сайта.
Файл `_headers` добавляет CSP, защиту от iframe-встраивания и другие браузерные
заголовки. Cloudflare применяет его сам, отдельная настройка в Dashboard не нужна.

## 7. Финальная проверка

1. Откройте `https://nikascompany.com/admin.html`.
2. Войдите обычным администраторским email и паролем.
3. Создайте тестовый товар или откройте существующий.
4. Выберите JPG, PNG или WebP и нажмите **Сохранить товар**.
5. В админке возле изображения должна появиться отметка **Cloudflare R2**.
6. Откройте каталог и подробное окно товара.
7. В адресе изображения должно быть:

```text
https://images.nikascompany.com/products/...
```

8. Удалите тестовое фото и убедитесь, что оно исчезло из админки и R2.

Если удалённую фотографию всё ещё видно по её старой прямой ссылке, подождите до
24 часов или очистите именно этот URL через Cloudflare → **Caching** → **Purge
Cache**. На страницах каталога такого эффекта обычно нет: при новой загрузке
создаётся новый адрес изображения.

## Старые изображения

Автоматический перенос старых изображений намеренно не добавлен. Старые записи пока продолжают работать через Supabase Storage и помечаются в админке как **Supabase (старое)**.

Если они не нужны, безопасный путь такой:

1. удалить старое фото в админке;
2. выбрать нужный файл заново;
3. сохранить товар;
4. убедиться, что новое фото помечено **Cloudflare R2**.

Не удаляйте старый Supabase bucket до того, как в админке не останется фотографий с отметкой **Supabase (старое)**.

## Что не должно попадать в GitHub

Никогда не добавляйте в файлы сайта или Worker:

```text
Supabase service_role key
Cloudflare API token
R2 Access Key ID
R2 Secret Access Key
Telegram bot token
```

R2 Binding работает без этих ключей в коде.
