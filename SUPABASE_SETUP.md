# Nikas Supabase Setup

Этот файл описывает ручные шаги, которые нужно выполнить в Supabase после внесения кода в сайт.

## 1. Создать проект Supabase

Создайте проект в Supabase и скопируйте:

- Project URL;
- public `anon key`.

Вставьте их в `supabase-config.js`:

```js
window.NIKAS_SUPABASE_CONFIG = {
    url: "https://YOUR_PROJECT_REF.supabase.co",
    anonKey: "YOUR_PUBLIC_ANON_KEY",
    productImagesBucket: "product-images",
    edgeFunctions: {
        submitContact: "submit-contact",
        submitProductRequest: "submit-product-request"
    }
};
```

Нельзя вставлять в frontend `service_role` key, Telegram token или другие секреты.

## 2. Выполнить SQL

Откройте Supabase SQL Editor и выполните файл:

```text
supabase/schema.sql
```

Он создаст:

- категории;
- товары;
- изображения товаров;
- обычные заявки;
- товарные заявки;
- позиции товарных заявок;
- роли администраторов;
- rate limit таблицу;
- RLS policies;
- Storage bucket `product-images`;
- seed текущих товаров Nikas без цен.

## 3. Создать администратора

1. В Supabase откройте Authentication.
2. Создайте пользователя вручную по email и паролю.
3. Скопируйте `user_id`.
4. В SQL Editor выполните:

```sql
insert into public.admin_profiles (user_id, email, is_admin)
values ('USER_UUID_HERE', 'admin@example.com', true)
on conflict (user_id) do update set
    email = excluded.email,
    is_admin = true;
```

Только пользователи с `is_admin = true` смогут управлять товарами и заявками.

## 4. Добавить Telegram Secrets

В Supabase CLI или Dashboard добавьте секреты для Edge Functions:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
supabase secrets set TELEGRAM_CHAT_ID="YOUR_TELEGRAM_CHAT_ID"
```

Также Edge Functions используют стандартные Supabase secrets:

- `SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.

## 5. Развернуть Edge Functions

Через Supabase CLI:

```bash
supabase functions deploy submit-contact
supabase functions deploy submit-product-request
```

Публичный сайт вызывает только эти функции и использует только `anon key`.

## 6. Проверить заявки

Обычная заявка:

1. Откройте `index.html`.
2. Заполните имя и телефон.
3. Отправьте форму в блоке контактов.
4. Проверьте таблицу `contact_requests`.
5. Проверьте Telegram.

Товарная заявка:

1. Откройте `category.html?category=all`.
2. Добавьте товар в корзину.
3. Откройте корзину и нажмите “Оформить”.
4. Заполните имя и телефон.
5. Проверьте таблицы `product_requests` и `product_request_items`.
6. Проверьте Telegram.

Если Telegram не настроен или временно не отвечает, заявка все равно должна сохраниться в базе, а поле `telegram_status` станет `skipped` или `failed`.

## 7. Проверить RLS

Публичный пользователь должен:

- читать только активные категории, товары и изображения;
- создавать заявки через Edge Functions.

Публичный пользователь не должен:

- читать заявки;
- менять статусы заявок;
- создавать или редактировать товары;
- управлять изображениями;
- видеть скрытые товары.

Администратор после входа в `admin.html` должен:

- видеть товары;
- добавлять и редактировать товары;
- скрывать товары;
- загружать, удалять и менять основное фото;
- видеть оба типа заявок;
- менять статусы заявок.

## 8. Локальный запуск

Для статической проверки можно запустить:

```bash
python3 -m http.server 8088 --bind 127.0.0.1
```

И открыть:

```text
http://127.0.0.1:8088/index.html
http://127.0.0.1:8088/category.html?category=all
http://127.0.0.1:8088/admin.html
```

Без реальных Supabase URL и anon key публичный каталог работает на fallback-данных, но отправка заявок и админка покажут сообщение, что Supabase еще не настроен.
