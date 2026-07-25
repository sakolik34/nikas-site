(function () {
    const STORAGE_KEY = "nikas-language";
    const SUPPORTED_LANGUAGES = ["uk", "ru", "en"];
    const FALLBACK_LANGUAGE = "ru";

    const TRANSLATIONS = {
        uk: {
            "language.name.uk": "Українська",
            "language.name.ru": "Русский",
            "language.name.en": "English",
            "language.switcherLabel": "Мова",
            "language.prompt.title": "Оберіть мову сайту",
            "language.prompt.text": "Ми запам'ятаємо вибір для наступних відвідувань.",
            "language.prompt.continue": "Продовжити",
            "nav.home": "Головна",
            "nav.catalog": "Каталог",
            "nav.about": "Про компанію",
            "nav.contacts": "Контакти",
            "nav.openMenu": "Відкрити меню",
            "nav.closeMenu": "Закрити меню",
            "nav.mainNav": "Основна навігація",
            "nav.sidebar": "Меню сайту",
            "contact.open": "Зв'язатися",
            "contact.menu": "Контакти Nikas",
            "contact.phone": "Телефон",
            "contact.quick": "Швидкий зв'язок",
            "cart.title": "Кошик",
            "cart.open": "Відкрити кошик",
            "cart.close": "Закрити кошик",
            "cart.empty": "Поки нічого не вибрано.",
            "cart.clear": "Очистити",
            "cart.order": "Оформити",
            "cart.remove": "Прибрати",
            "cart.increase": "Додати {name}",
            "cart.decrease": "Зменшити {name}",
            "cart.items.one": "{count} товар",
            "cart.items.few": "{count} товари",
            "cart.items.many": "{count} товарів",
            "cart.added": "Додано",
            "cart.add": "До кошика",
            "cart.ask": "Запитати",
            "cart.orderTitle": "Товарна заявка",
            "cart.orderIntro": "Залиште контакти, і ми уточнимо ціну, наявність та умови поставки.",
            "cart.orderItems": "Обрані товари",
            "cart.orderComment": "Коментар",
            "cart.orderCommentPlaceholder": "Наприклад: потрібна фасовка, обсяг або місто доставки",
            "cart.submitOrder": "Надіслати товарну заявку",
            "cart.orderSuccess": "Заявку збережено. Ми зв'яжемося з вами найближчим часом.",
            "cart.orderError": "Не вдалося надіслати заявку. Спробуйте ще раз.",
            "cart.closeModal": "Закрити форму заявки",
            "product.priceAvailability": "Ціну та наявність уточнюйте",
            "product.loading": "Завантажуємо товари...",
            "product.empty": "У цьому розділі поки немає товарів.",
            "product.loadError": "Не вдалося завантажити товари. Показуємо локальний каталог.",
            "product.count.one": "{count} товар",
            "product.count.few": "{count} товари",
            "product.count.many": "{count} товарів",
            "hero.eyebrow": "Харчові продукти Nikas",
            "hero.title": "Nikas - ідеальний вибір якісних продуктів.",
            "hero.text": "Якісні спеції та харчові інгредієнти для торгівлі, виробництва і професійної кухні.",
            "hero.catalog": "Дивитися каталог",
            "hero.contact": "Зв'язатися",
            "catalog.eyebrow": "Міні-каталог Nikas",
            "catalog.title": "Основні напрями компанії",
            "catalog.note": "Оберіть напрям, щоб переглянути товари та надіслати заявку.",
            "catalog.allProducts": "Усі продукти",
            "category.spices.title": "Спеції",
            "category.spices.description": "Перець, паприка, сушений часник та базові позиції для кухні і виробництва.",
            "category.flavor.title": "Підсилювачі смаку",
            "category.flavor.description": "Глутамат натрію, харчові кислоти та технологічні інгредієнти.",
            "category.protein.title": "Білки",
            "category.protein.description": "Соєві білкові інгредієнти для харчового виробництва.",
            "category.page.back": "Назад до міні-каталогу",
            "category.page.badge": "Каталог Nikas",
            "category.page.allBadge": "Усі напрями",
            "category.page.sectionBadge": "Розділ каталогу",
            "category.page.title": "Каталог товарів",
            "category.page.description": "Оберіть товар, щоб додати його в кошик або надіслати заявку менеджеру.",
            "category.page.all": "Дивитися всі товари",
            "category.page.contact": "Зв'язатися",
            "category.page.productsBadge": "Товари розділу",
            "category.page.positions": "Позиції",
            "category.all.title": "Усі товари",
            "category.all.description": "Загальний список позицій Nikas з усіх основних напрямів каталогу.",
            "category.notFound.title": "Розділ не знайдено",
            "category.notFound.description": "Такої категорії поки немає. Поверніться до міні-каталогу та оберіть інший розділ.",
            "category.notFound.products": "Немає товарів",
            "contacts.eyebrow": "Контакти",
            "contacts.title": "Зв'яжіться з нами",
            "contacts.text": "Залиште заявку, і ми підготуємо відповідь щодо спецій, харчових інгредієнтів, фасування або оптового замовлення.",
            "form.name": "Ім'я *",
            "form.phone": "Телефон *",
            "form.email": "Пошта",
            "form.question": "Питання",
            "form.submit": "Надіслати заявку",
            "form.ready": "Усе готово, заявку можна надіслати.",
            "form.fillRequired": "Заповніть ім'я та телефон, щоб надіслати заявку.",
            "form.sending": "Надсилаємо заявку...",
            "form.success": "Заявку збережено. Ми зв'яжемося з вами найближчим часом.",
            "form.error": "Не вдалося надіслати заявку. Спробуйте ще раз.",
            "form.honeypot": "Не заповнюйте це поле",
            "footer.brand": "Спеції та харчові інгредієнти для торгівлі, виробництва і професійної кухні.",
            "footer.info": "Інформація",
            "footer.products": "Продукція",
            "footer.contacts": "Наші контакти",
            "footer.scheduleTitle": "Графік роботи:",
            "footer.schedule": "Пн-Пт 9:00-18:00\nСб-Нд - вихідний",
            "footer.addressTitle": "Адреса:",
            "footer.address": "Україна, адресу компанії уточнюємо",
            "about.back": "Повернутися назад",
            "about.presentation": "Міні-презентація компанії",
            "about.introText": "Преміальна основа для розповіді про компанію, асортимент спецій, харчові інгредієнти та майбутні поставки.",
            "status.new": "Нова",
            "status.in_progress": "У роботі",
            "status.completed": "Завершена",
            "errors.backendNotConfigured": "Supabase ще не налаштовано. Додайте URL та anon key у supabase-config.js."
        },
        ru: {
            "language.name.uk": "Українська",
            "language.name.ru": "Русский",
            "language.name.en": "English",
            "language.switcherLabel": "Язык",
            "language.prompt.title": "Выберите язык сайта",
            "language.prompt.text": "Мы запомним выбор для следующих посещений.",
            "language.prompt.continue": "Продолжить",
            "nav.home": "Главная",
            "nav.catalog": "Каталог",
            "nav.about": "О компании",
            "nav.contacts": "Контакты",
            "nav.openMenu": "Открыть меню",
            "nav.closeMenu": "Закрыть меню",
            "nav.mainNav": "Основная навигация",
            "nav.sidebar": "Меню сайта",
            "contact.open": "Связаться",
            "contact.menu": "Контакты Nikas",
            "contact.phone": "Телефон",
            "contact.quick": "Быстрая связь",
            "cart.title": "Корзина",
            "cart.open": "Открыть корзину",
            "cart.close": "Закрыть корзину",
            "cart.empty": "Пока ничего не выбрано.",
            "cart.clear": "Очистить",
            "cart.order": "Оформить",
            "cart.remove": "Убрать",
            "cart.increase": "Добавить {name}",
            "cart.decrease": "Уменьшить {name}",
            "cart.items.one": "{count} товар",
            "cart.items.few": "{count} товара",
            "cart.items.many": "{count} товаров",
            "cart.added": "Добавлено",
            "cart.add": "В корзину",
            "cart.ask": "Спросить",
            "cart.orderTitle": "Товарная заявка",
            "cart.orderIntro": "Оставьте контакты, и мы уточним цену, наличие и условия поставки.",
            "cart.orderItems": "Выбранные товары",
            "cart.orderComment": "Комментарий",
            "cart.orderCommentPlaceholder": "Например: нужна фасовка, объем или город доставки",
            "cart.submitOrder": "Отправить товарную заявку",
            "cart.orderSuccess": "Заявка сохранена. Мы свяжемся с вами в ближайшее время.",
            "cart.orderError": "Не удалось отправить заявку. Попробуйте еще раз.",
            "cart.closeModal": "Закрыть форму заявки",
            "product.priceAvailability": "Цену и наличие уточняйте",
            "product.loading": "Загружаем товары...",
            "product.empty": "В этом разделе пока нет товаров.",
            "product.loadError": "Не удалось загрузить товары. Показываем локальный каталог.",
            "product.count.one": "{count} товар",
            "product.count.few": "{count} товара",
            "product.count.many": "{count} товаров",
            "hero.eyebrow": "Пищевые продукты Nikas",
            "hero.title": "Nikas - идеальный выбор качественных продуктов.",
            "hero.text": "Качественные специи и пищевые ингредиенты для торговли, производства и профессиональной кухни.",
            "hero.catalog": "Смотреть каталог",
            "hero.contact": "Связаться",
            "catalog.eyebrow": "Мини-каталог Nikas",
            "catalog.title": "Основные направления компании",
            "catalog.note": "Выберите направление, чтобы посмотреть товары и отправить заявку.",
            "catalog.allProducts": "Все продукты",
            "category.spices.title": "Специи",
            "category.spices.description": "Перец, паприка, сушеный чеснок и базовые позиции для кухни и производства.",
            "category.flavor.title": "Усилители вкуса",
            "category.flavor.description": "Глутамат натрия, пищевые кислоты и технологические ингредиенты.",
            "category.protein.title": "Белки",
            "category.protein.description": "Соевые белковые ингредиенты для пищевого производства.",
            "category.page.back": "Назад к мини-каталогу",
            "category.page.badge": "Каталог Nikas",
            "category.page.allBadge": "Все направления",
            "category.page.sectionBadge": "Раздел каталога",
            "category.page.title": "Каталог товаров",
            "category.page.description": "Выберите товар, чтобы добавить его в корзину или отправить заявку менеджеру.",
            "category.page.all": "Смотреть все товары",
            "category.page.contact": "Связаться",
            "category.page.productsBadge": "Товары раздела",
            "category.page.positions": "Позиции",
            "category.all.title": "Все товары",
            "category.all.description": "Общий список позиций Nikas из всех основных направлений каталога.",
            "category.notFound.title": "Раздел не найден",
            "category.notFound.description": "Такой категории пока нет. Вернитесь к мини-каталогу и выберите другой раздел.",
            "category.notFound.products": "Нет товаров",
            "contacts.eyebrow": "Контакты",
            "contacts.title": "Свяжитесь с нами",
            "contacts.text": "Оставьте заявку, и мы подготовим ответ по специям, пищевым ингредиентам, фасовке или оптовому заказу.",
            "form.name": "Имя *",
            "form.phone": "Телефон *",
            "form.email": "Почта",
            "form.question": "Вопрос",
            "form.submit": "Отправить заявку",
            "form.ready": "Все готово, заявку можно отправить.",
            "form.fillRequired": "Заполните имя и телефон, чтобы отправить заявку.",
            "form.sending": "Отправляем заявку...",
            "form.success": "Заявка сохранена. Мы свяжемся с вами в ближайшее время.",
            "form.error": "Не удалось отправить заявку. Попробуйте еще раз.",
            "form.honeypot": "Не заполняйте это поле",
            "footer.brand": "Специи и пищевые ингредиенты для торговли, производства и профессиональной кухни.",
            "footer.info": "Информация",
            "footer.products": "Продукция",
            "footer.contacts": "Наши контакты",
            "footer.scheduleTitle": "График работы:",
            "footer.schedule": "Пн-Пт 9:00-18:00\nСб-Вс - выходной",
            "footer.addressTitle": "Адрес:",
            "footer.address": "Украина, адрес компании уточняется",
            "about.back": "Вернуться назад",
            "about.presentation": "Мини-презентация компании",
            "about.introText": "Премиальная основа для рассказа о компании, ассортименте специй, пищевых ингредиентах и будущих поставках.",
            "status.new": "Новая",
            "status.in_progress": "В работе",
            "status.completed": "Завершена",
            "errors.backendNotConfigured": "Supabase пока не настроен. Добавьте URL и anon key в supabase-config.js."
        },
        en: {
            "language.name.uk": "Українська",
            "language.name.ru": "Русский",
            "language.name.en": "English",
            "language.switcherLabel": "Language",
            "language.prompt.title": "Choose site language",
            "language.prompt.text": "We will remember your choice for future visits.",
            "language.prompt.continue": "Continue",
            "nav.home": "Home",
            "nav.catalog": "Catalog",
            "nav.about": "About",
            "nav.contacts": "Contacts",
            "nav.openMenu": "Open menu",
            "nav.closeMenu": "Close menu",
            "nav.mainNav": "Main navigation",
            "nav.sidebar": "Site menu",
            "contact.open": "Contact",
            "contact.menu": "Nikas contacts",
            "contact.phone": "Phone",
            "contact.quick": "Quick contact",
            "cart.title": "Cart",
            "cart.open": "Open cart",
            "cart.close": "Close cart",
            "cart.empty": "No products selected yet.",
            "cart.clear": "Clear",
            "cart.order": "Submit",
            "cart.remove": "Remove",
            "cart.increase": "Add {name}",
            "cart.decrease": "Decrease {name}",
            "cart.items.one": "{count} item",
            "cart.items.few": "{count} items",
            "cart.items.many": "{count} items",
            "cart.added": "Added",
            "cart.add": "Add to cart",
            "cart.ask": "Ask",
            "cart.orderTitle": "Product request",
            "cart.orderIntro": "Leave your contacts and we will confirm price, availability and delivery details.",
            "cart.orderItems": "Selected products",
            "cart.orderComment": "Comment",
            "cart.orderCommentPlaceholder": "For example: packing, volume or delivery city",
            "cart.submitOrder": "Send product request",
            "cart.orderSuccess": "Request saved. We will contact you soon.",
            "cart.orderError": "Could not send the request. Please try again.",
            "cart.closeModal": "Close request form",
            "product.priceAvailability": "Please enquire about price and availability",
            "product.loading": "Loading products...",
            "product.empty": "There are no products in this section yet.",
            "product.loadError": "Could not load products. Showing the local catalog.",
            "product.count.one": "{count} product",
            "product.count.few": "{count} products",
            "product.count.many": "{count} products",
            "hero.eyebrow": "Nikas Food Products",
            "hero.title": "Nikas - the ideal choice of quality products.",
            "hero.text": "Quality spices and food ingredients for retail, production and professional kitchens.",
            "hero.catalog": "View catalog",
            "hero.contact": "Contact",
            "catalog.eyebrow": "Nikas mini catalog",
            "catalog.title": "Main company directions",
            "catalog.note": "Choose a direction to view products and send a request.",
            "catalog.allProducts": "All products",
            "category.spices.title": "Spices",
            "category.spices.description": "Pepper, paprika, dried garlic and core items for kitchens and production.",
            "category.flavor.title": "Flavor Enhancers",
            "category.flavor.description": "Monosodium glutamate, food acids and technical ingredients.",
            "category.protein.title": "Proteins",
            "category.protein.description": "Soy protein ingredients for food production.",
            "category.page.back": "Back to mini catalog",
            "category.page.badge": "Nikas catalog",
            "category.page.allBadge": "All directions",
            "category.page.sectionBadge": "Catalog section",
            "category.page.title": "Product catalog",
            "category.page.description": "Choose a product to add it to the cart or send a request to a manager.",
            "category.page.all": "View all products",
            "category.page.contact": "Contact",
            "category.page.productsBadge": "Section products",
            "category.page.positions": "Items",
            "category.all.title": "All products",
            "category.all.description": "The full list of Nikas items across all main catalog directions.",
            "category.notFound.title": "Section not found",
            "category.notFound.description": "This category does not exist yet. Return to the mini catalog and choose another section.",
            "category.notFound.products": "No products",
            "contacts.eyebrow": "Contacts",
            "contacts.title": "Contact us",
            "contacts.text": "Leave a request and we will respond about spices, food ingredients, packing or wholesale orders.",
            "form.name": "Name *",
            "form.phone": "Phone *",
            "form.email": "Email",
            "form.question": "Question",
            "form.submit": "Send request",
            "form.ready": "Everything is ready. You can send the request.",
            "form.fillRequired": "Fill in name and phone to send the request.",
            "form.sending": "Sending request...",
            "form.success": "Request saved. We will contact you soon.",
            "form.error": "Could not send the request. Please try again.",
            "form.honeypot": "Do not fill this field",
            "footer.brand": "Spices and food ingredients for retail, production and professional kitchens.",
            "footer.info": "Information",
            "footer.products": "Products",
            "footer.contacts": "Our contacts",
            "footer.scheduleTitle": "Working hours:",
            "footer.schedule": "Mon-Fri 9:00-18:00\nSat-Sun - closed",
            "footer.addressTitle": "Address:",
            "footer.address": "Ukraine, company address to be confirmed",
            "about.back": "Go back",
            "about.presentation": "Company mini presentation",
            "about.introText": "A premium base for telling the company story, spice assortment, food ingredients and future supply.",
            "status.new": "New",
            "status.in_progress": "In progress",
            "status.completed": "Completed",
            "errors.backendNotConfigured": "Supabase is not configured yet. Add URL and anon key in supabase-config.js."
        }
    };

    let currentLanguage = normalizeLanguage(localStorage.getItem(STORAGE_KEY)) || FALLBACK_LANGUAGE;
    let initialized = false;
    let promptElement = null;

    function normalizeLanguage(language) {
        return SUPPORTED_LANGUAGES.includes(language) ? language : null;
    }

    function format(text, params = {}) {
        return String(text).replace(/\{(\w+)\}/g, (_, key) => {
            return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : "";
        });
    }

    function t(key, params) {
        const value = TRANSLATIONS[currentLanguage]?.[key]
            || TRANSLATIONS[FALLBACK_LANGUAGE]?.[key]
            || TRANSLATIONS.uk?.[key]
            || key;

        return format(value, params);
    }

    function pluralKey(baseKey, count) {
        const language = currentLanguage;

        if (language === "en") {
            return count === 1 ? `${baseKey}.one` : `${baseKey}.many`;
        }

        const lastDigit = count % 10;
        const lastTwo = count % 100;

        if (lastDigit === 1 && lastTwo !== 11) {
            return `${baseKey}.one`;
        }

        if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
            return `${baseKey}.few`;
        }

        return `${baseKey}.many`;
    }

    function plural(baseKey, count) {
        return t(pluralKey(baseKey, count), { count });
    }

    function localizedValue(value, language = currentLanguage) {
        if (value == null) {
            return "";
        }

        if (typeof value !== "object") {
            return String(value);
        }

        return value[language] || value.uk || value.ru || value.en || Object.values(value).find(Boolean) || "";
    }

    function field(record, baseName, language = currentLanguage) {
        if (!record) {
            return "";
        }

        if (record[baseName] && typeof record[baseName] === "object") {
            return localizedValue(record[baseName], language);
        }

        const suffixValue = record[`${baseName}_${language}`]
            || record[`${baseName}_uk`]
            || record[`${baseName}_ru`]
            || record[`${baseName}_en`];

        return suffixValue || record[baseName] || "";
    }

    function applyTranslations(root = document) {
        root.querySelectorAll("[data-i18n]").forEach((element) => {
            element.textContent = t(element.dataset.i18n);
        });

        root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
            element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
        });

        root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
            element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
        });

        root.querySelectorAll("[data-i18n-title]").forEach((element) => {
            element.setAttribute("title", t(element.dataset.i18nTitle));
        });

        root.querySelectorAll("[data-i18n-value]").forEach((element) => {
            element.value = t(element.dataset.i18nValue);
        });

        document.documentElement.lang = currentLanguage;
        renderLanguageSwitchers();
    }

    function setLanguage(language, options = {}) {
        const normalized = normalizeLanguage(language) || FALLBACK_LANGUAGE;
        currentLanguage = normalized;

        if (options.persist !== false) {
            localStorage.setItem(STORAGE_KEY, currentLanguage);
        }

        applyTranslations();
        window.dispatchEvent(new CustomEvent("nikas:languagechange", {
            detail: { language: currentLanguage }
        }));
    }

    function renderLanguageSwitchers() {
        document.querySelectorAll("[data-language-switcher]").forEach((container) => {
            if (container.dataset.languageReady === "true") {
                const select = container.querySelector("select");

                if (select && select.value !== currentLanguage) {
                    select.value = currentLanguage;
                }

                return;
            }

            container.dataset.languageReady = "true";
            container.classList.add("language-switcher");

            const label = document.createElement("label");
            const labelText = document.createElement("span");
            labelText.textContent = t("language.switcherLabel");

            const select = document.createElement("select");
            select.className = "language-select";
            select.setAttribute("aria-label", t("language.switcherLabel"));

            SUPPORTED_LANGUAGES.forEach((language) => {
                const option = document.createElement("option");
                option.value = language;
                option.textContent = t(`language.name.${language}`);
                select.append(option);
            });

            select.value = currentLanguage;
            select.addEventListener("change", () => setLanguage(select.value));

            label.append(labelText, select);
            container.replaceChildren(label);
        });
    }

    function createLanguagePrompt() {
        if (localStorage.getItem(STORAGE_KEY) || promptElement) {
            return;
        }

        promptElement = document.createElement("div");
        promptElement.className = "language-prompt";
        promptElement.setAttribute("role", "dialog");
        promptElement.setAttribute("aria-modal", "true");

        const panel = document.createElement("div");
        panel.className = "language-prompt-panel";

        const title = document.createElement("h2");
        title.textContent = t("language.prompt.title");

        const text = document.createElement("p");
        text.textContent = t("language.prompt.text");

        const choices = document.createElement("div");
        choices.className = "language-prompt-actions";

        SUPPORTED_LANGUAGES.forEach((language) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = t(`language.name.${language}`);
            button.addEventListener("click", () => {
                setLanguage(language);
                promptElement.remove();
                promptElement = null;
            });
            choices.append(button);
        });

        panel.append(title, text, choices);
        promptElement.append(panel);
        document.body.append(promptElement);
    }

    function init(options = {}) {
        if (initialized) {
            return;
        }

        initialized = true;
        applyTranslations();

        if (options.prompt !== false) {
            createLanguagePrompt();
        }
    }

    window.NikasI18n = {
        init,
        t,
        plural,
        setLanguage,
        getLanguage: () => currentLanguage,
        localizedValue,
        field,
        applyTranslations,
        supportedLanguages: SUPPORTED_LANGUAGES
    };

    document.addEventListener("DOMContentLoaded", () => init());
})();
