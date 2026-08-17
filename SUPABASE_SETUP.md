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
- варианты объёма и фасовки товаров;
- обычные заявки;
- товарные заявки;
- позиции товарных заявок;
- роли администраторов;
- rate limit таблицу;
- RLS policies;
- Storage bucket `product-images`;
- seed текущих товаров Nikas без цен.

Файл можно выполнять повторно: он не удаляет заявки и фотографии и не
перезаписывает товары, которые уже изменены через админку. После этого обновления
повторный запуск нужен один раз, чтобы добавить товарам отдельные поля цены на
украинском, русском и английском языках, товарам — отдельные варианты объёма и
фасовки, а позициям заявок — сохранённые фасовку и цену на момент отправки.

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

Telegram подключается только после создания бота. До этого момента заявки всё равно
сохраняются в Supabase и отображаются в админке со статусом «Telegram не настроен».

Когда бот будет готов:

1. Получите токен у `@BotFather`.
2. Добавьте бота в нужный чат или напишите ему личное сообщение.
3. Узнайте `chat_id`.
4. Добавьте оба значения как секреты Edge Functions.

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

Если функции ещё не развёрнуты или временно недоступны, сайт автоматически
сохраняет заявку напрямую в защищённые таблицы Supabase. Благодаря этому заявка
не пропадает. После развёртывания функций Telegram начинает работать без изменения
форм на сайте.

## 6. Проверить заявки

Обычная заявка:

1. Откройте `index.html`.
2. Заполните имя и телефон.
3. Отправьте форму в блоке контактов.
4. Проверьте таблицу `contact_requests`.
5. Проверьте Telegram.

Товарная заявка:

1. Откройте `category.html?category=all`.
2. Добавьте товар в заявку.
3. Откройте заявку и нажмите “Оформить заявку”.
4. Заполните имя и телефон.
5. Проверьте таблицы `product_requests` и `product_request_items`.
6. Проверьте Telegram.

Если Telegram не настроен или временно не отвечает, заявка все равно должна
сохраниться в базе, а поле `telegram_status` станет `skipped` или `failed`.

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
- загружать до 10 фотографий товара за раз;
- менять основное фото и порядок галереи;
- видеть оба типа заявок;
- менять статусы, контакты, комментарии, названия товаров и количество в заявках;
- копировать готовую заявку для отправки менеджеру.

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
