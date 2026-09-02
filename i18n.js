(function () {
    const STORAGE_KEY = "nikas-language";
    const SUPPORTED_LANGUAGES = ["uk", "ru", "en"];
    const FALLBACK_LANGUAGE = "ru";
    const SHORT_LANGUAGE_NAMES = {
        uk: "Укр.",
        ru: "Рус.",
        en: "Eng."
    };
    const MOBILE_HEADER_QUERY = "(max-width: 640px)";

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
            "nav.reviews": "Відгуки",
            "nav.openMenu": "Відкрити меню",
            "nav.closeMenu": "Закрити меню",
            "nav.mainNav": "Основна навігація",
            "nav.sidebar": "Меню сайту",
            "contact.open": "Зв'язатися",
            "contact.menu": "Контакти Nikas",
            "contact.phone": "Телефон",
            "contact.quick": "Швидкий зв'язок",
            "quick.barLabel": "Швидкі дії Nikas",
            "quick.whatsapp": "WhatsApp",
            "quick.telegram": "Telegram",
            "quick.request": "Заявка",
            "quick.download": "Завантажити перелік продуктів PDF",
            "quick.downloadShort": "Перелік",
            "quick.downloadTitle": "Завантажити PDF-перелік продуктів Nikas",
            "cart.title": "Заявка",
            "cart.open": "Відкрити заявку",
            "cart.close": "Закрити заявку",
            "cart.empty": "Додавайте товари, які хочете уточнити або замовити.",
            "cart.clear": "Очистити",
            "cart.order": "Оформити заявку",
            "cart.remove": "Прибрати",
            "cart.removeItem": "Прибрати {name} із заявки",
            "cart.increase": "Додати {name}",
            "cart.decrease": "Зменшити {name}",
            "cart.quantity": "Кількість",
            "cart.quantityHint": "Вкажіть потрібну кількість кожної позиції.",
            "cart.items.one": "{count} товар",
            "cart.items.few": "{count} товари",
            "cart.items.many": "{count} товарів",
            "cart.added": "Додано",
            "cart.add": "Додати до заявки",
            "cart.ask": "Запитати",
            "cart.requestEyebrow": "Запит менеджеру Nikas",
            "cart.orderTitle": "Оформлення заявки",
            "cart.orderIntro": "Перевірте обрані товари та залиште контакти. Менеджер уточнить ціну, наявність, фасування і доставку.",
            "cart.orderItems": "Обрані товари",
            "cart.orderComment": "Деталі заявки (необов'язково)",
            "cart.orderCommentPlaceholder": "Наприклад: потрібна фасовка 25 кг, доставка до Києва або дзвінок після 15:00",
            "cart.submitOrder": "Надіслати заявку менеджеру",
            "cart.askPrefill": "Хочу уточнити ціну, наявність та умови щодо товару «{name}».",
            "cart.privacy": "Контакти використовуються лише для відповіді на цю заявку.",
            "cart.successTitle": "Заявку прийнято",
            "cart.orderSuccess": "Ми зберегли її в системі. Менеджер зв'яжеться з вами найближчим часом.",
            "cart.requestNumber": "Номер заявки: {number}",
            "cart.successClose": "Готово",
            "cart.orderError": "Не вдалося надіслати заявку. Спробуйте ще раз.",
            "cart.closeModal": "Закрити форму заявки",
            "product.priceAvailability": "Ціну та наявність уточнюйте",
            "product.priceLabel": "Ціна",
            "product.packLabel": "Фасування",
            "product.packOptionsTitle": "Оберіть об'єм або фасування",
            "product.packOptionsHint": "Варіант збережеться у заявці для менеджера.",
            "product.quantityTitle": "Скільки потрібно?",
            "product.quantityHint": "Оберіть фасування вище та додайте одну позицію або впишіть потрібну кількість.",
            "product.quantityAddOne": "Додати 1",
            "product.quantityCustomLabel": "Кількість",
            "product.quantityAddCustom": "Додати вказану",
            "product.customAmountOnlyTitle": "Вкажіть потрібну вам кількість",
            "product.orCustomAmount": "або вкажіть кількість самостійно",
            "product.customAmountLabel": "Кількість",
            "product.customAmountPlaceholder": "Наприклад, 12,5",
            "product.customAmountUnitLabel": "Одиниця",
            "product.customAmountAdd": "Додати цю кількість",
            "product.customAmountInvalid": "Вкажіть число більше нуля та виберіть одиницю.",
            "product.customUnitsSummary": "л / кг / т",
            "product.amountUnitL": "л",
            "product.amountUnitKg": "кг",
            "product.amountUnitT": "т",
            "product.packOnRequest": "Уточнюється менеджером",
            "product.details": "Докладніше про товар",
            "product.openDetails": "Відкрити інформацію про {name}",
            "product.closeDetails": "Закрити інформацію про товар",
            "product.gallery": "Фотографії товару",
            "product.showImage": "Показати фото {number}",
            "product.previousPhoto": "Попереднє фото",
            "product.nextPhoto": "Наступне фото",
            "product.photoPosition": "Фото {current} з {total}",
            "product.imageDisclaimer": "Зображення є художнім зображенням товару. Реальний зовнішній вигляд може відрізнятися.",
            "product.imageDisclaimerOpen": "Показати примітку до зображення",
            "product.descriptionTitle": "Опис",
            "product.descriptionMissing": "Детальний опис уточнюється.",
            "product.imageMissing": "Фото додасть менеджер",
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
            "category.flavor.title": "Функціональні добавки",
            "category.flavor.description": "Функціональні добавки для стабільності, смаку та технологічних процесів у виробництві.",
            "category.protein.title": "Соєві продукти",
            "category.protein.description": "Соєві продукти та інгредієнти для харчового виробництва.",
            "category.page.back": "Назад до міні-каталогу",
            "category.page.badge": "Каталог Nikas",
            "category.page.allBadge": "Усі напрями",
            "category.page.sectionBadge": "Розділ каталогу",
            "category.page.title": "Каталог товарів",
            "category.page.description": "Відкрийте товар, перегляньте подробиці та додайте потрібні позиції до заявки менеджеру.",
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
            "reviews.eyebrow": "Відгуки",
            "reviews.title": "Що говорять про товари Nikas",
            "reviews.description": "Публікуємо відгуки після перевірки, щоб інформація була чесною та корисною.",
            "reviews.empty": "Тут незабаром з'являться відгуки покупців.",
            "reviews.ctaQuestion": "Ви вже замовляли у нас?",
            "reviews.ctaText": "Поділіться враженням про товар. Відгук з'явиться після перевірки.",
            "reviews.ctaButton": "Написати відгук",
            "reviews.formTitle": "Написати відгук",
            "reviews.formIntro": "Усі поля необов'язкові. Можна залишити лише оцінку або додати деталі за бажанням.",
            "reviews.productLabel": "Придбаний товар (необов'язково)",
            "reviews.productPlaceholder": "Оберіть товар",
            "reviews.nameLabel": "Ваше ім'я (необов'язково)",
            "reviews.namePlaceholder": "Наприклад, Олександр",
            "reviews.ratingLabel": "Ваша оцінка (необов'язково)",
            "reviews.textLabel": "Текст відгуку (необов'язково)",
            "reviews.textPlaceholder": "Розкажіть, що вам сподобалося",
            "reviews.traitsLabel": "Що особливо запам'яталося (необов'язково)",
            "reviews.traitsPositive": "Позитивне",
            "reviews.traitsNegative": "Можна покращити",
            "reviews.trait.currentPrice": "Актуальна ціна",
            "reviews.trait.fastShipping": "Швидко відправили",
            "reviews.trait.goodService": "Гарне обслуговування",
            "reviews.trait.accurateDescription": "Актуальний опис",
            "reviews.trait.inStock": "Товар був у наявності",
            "reviews.trait.politeSeller": "Ввічливий продавець",
            "reviews.trait.quickContact": "Швидко зв'язалися",
            "reviews.trait.notShipped": "Товар не відправили",
            "reviews.trait.higherPrice": "Ціна вища за заявлену",
            "reviews.trait.outOfStock": "Товару не було в наявності",
            "reviews.trait.noContact": "Зі мною не зв'язалися",
            "reviews.trait.differentFromDescription": "Товар не відповідав опису",
            "reviews.trait.slowShipping": "Відправляли довше обіцяного",
            "reviews.trait.rudeSeller": "Неввічливий продавець",
            "product.networkError": "Немає підключення до інтернету. Перевірте мережу та перезавантажте сторінку.",
            "reviews.submit": "Надіслати відгук",
            "reviews.sending": "Надсилаємо відгук...",
            "reviews.success": "Дякуємо. Після перевірки відгук з'явиться на сторінці.",
            "reviews.error": "Не вдалося надіслати відгук. Спробуйте ще раз.",
            "reviews.close": "Закрити",
            "reviews.unknownAuthor": "Покупець Nikas",
            "reviews.noText": "Покупець залишив оцінку без текстового коментаря.",
            "reviews.product": "Товар",
            "reviews.pageStatus": "Сторінка {current} з {total}",
            "reviews.previousPage": "Попередня сторінка",
            "reviews.nextPage": "Наступна сторінка",
            "form.name": "Ім'я та прізвище *",
            "form.phone": "Телефон *",
            "form.email": "Електронна пошта (необов'язково)",
            "form.question": "Що хочете уточнити? (необов'язково)",
            "form.namePlaceholder": "Наприклад, Олександр",
            "form.phonePlaceholder": "+380 00 000 00 00",
            "form.emailPlaceholder": "name@example.com",
            "form.questionPlaceholder": "Напишіть товар, потрібний обсяг, фасування або умови доставки",
            "form.submit": "Надіслати заявку",
            "form.ready": "Усе готово, заявку можна надіслати.",
            "form.fillRequired": "Заповніть ім'я та телефон, щоб надіслати заявку.",
            "form.checkFields": "Перевірте правильність заповнення полів.",
            "form.sending": "Надсилаємо заявку...",
            "form.sent": "Заявку надіслано",
            "form.success": "Ми отримали вашу заявку. Менеджер зв'яжеться з вами найближчим часом.",
            "form.successWithNumber": "Заявку №{number} прийнято. Менеджер зв'яжеться з вами найближчим часом.",
            "form.error": "Не вдалося надіслати заявку. Спробуйте ще раз.",
            "form.honeypot": "Не заповнюйте це поле",
            "footer.brand": "Спеції та харчові інгредієнти для торгівлі, виробництва і професійної кухні.",
            "footer.info": "Інформація",
            "footer.products": "Продукція",
            "footer.contacts": "Наші контакти",
            "footer.scheduleTitle": "Графік роботи:",
            "footer.schedule": "Пн-Пт 9:00-18:00\nСб-Нд - вихідний",
            "footer.addressTitle": "Адреса:",
            "footer.address": "м. Дніпро, вул. Базова, буд. 8",
            "footer.company": "ТОВ \"СК\"НІКАС\"",
            "footer.copyright": "© 2026 Усі права захищено.",
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
            "nav.reviews": "Отзывы",
            "nav.openMenu": "Открыть меню",
            "nav.closeMenu": "Закрыть меню",
            "nav.mainNav": "Основная навигация",
            "nav.sidebar": "Меню сайта",
            "contact.open": "Связаться",
            "contact.menu": "Контакты Nikas",
            "contact.phone": "Телефон",
            "contact.quick": "Быстрая связь",
            "quick.barLabel": "Быстрые действия Nikas",
            "quick.whatsapp": "WhatsApp",
            "quick.telegram": "Telegram",
            "quick.request": "Заявка",
            "quick.download": "Скачать перечень продуктов PDF",
            "quick.downloadShort": "Перечень",
            "quick.downloadTitle": "Скачать PDF-перечень продуктов Nikas",
            "cart.title": "Заявка",
            "cart.open": "Открыть заявку",
            "cart.close": "Закрыть заявку",
            "cart.empty": "Добавляйте товары, которые хотите уточнить или заказать.",
            "cart.clear": "Очистить",
            "cart.order": "Оформить заявку",
            "cart.remove": "Убрать",
            "cart.removeItem": "Убрать {name} из заявки",
            "cart.increase": "Добавить {name}",
            "cart.decrease": "Уменьшить {name}",
            "cart.quantity": "Количество",
            "cart.quantityHint": "Укажите нужное количество каждой позиции.",
            "cart.items.one": "{count} товар",
            "cart.items.few": "{count} товара",
            "cart.items.many": "{count} товаров",
            "cart.added": "Добавлено",
            "cart.add": "Добавить в заявку",
            "cart.ask": "Спросить",
            "cart.requestEyebrow": "Запрос менеджеру Nikas",
            "cart.orderTitle": "Оформление заявки",
            "cart.orderIntro": "Проверьте выбранные товары и оставьте контакты. Менеджер уточнит цену, наличие, фасовку и доставку.",
            "cart.orderItems": "Выбранные товары",
            "cart.orderComment": "Детали заявки (необязательно)",
            "cart.orderCommentPlaceholder": "Например: нужна фасовка 25 кг, доставка в Киев или звонок после 15:00",
            "cart.submitOrder": "Отправить заявку менеджеру",
            "cart.askPrefill": "Хочу уточнить цену, наличие и условия по товару «{name}».",
            "cart.privacy": "Контакты используются только для ответа на эту заявку.",
            "cart.successTitle": "Заявка принята",
            "cart.orderSuccess": "Мы сохранили её в системе. Менеджер свяжется с вами в ближайшее время.",
            "cart.requestNumber": "Номер заявки: {number}",
            "cart.successClose": "Готово",
            "cart.orderError": "Не удалось отправить заявку. Попробуйте еще раз.",
            "cart.closeModal": "Закрыть форму заявки",
            "product.priceAvailability": "Цену и наличие уточняйте",
            "product.priceLabel": "Цена",
            "product.packLabel": "Фасовка",
            "product.packOptionsTitle": "Выберите объём или фасовку",
            "product.packOptionsHint": "Выбранный вариант сохранится в заявке для менеджера.",
            "product.quantityTitle": "Сколько нужно?",
            "product.quantityHint": "Выберите фасовку выше и добавьте одну позицию или впишите нужное количество.",
            "product.quantityAddOne": "Добавить 1",
            "product.quantityCustomLabel": "Количество",
            "product.quantityAddCustom": "Добавить указанное",
            "product.customAmountOnlyTitle": "Укажите нужное вам количество",
            "product.orCustomAmount": "или укажите количество самостоятельно",
            "product.customAmountLabel": "Количество",
            "product.customAmountPlaceholder": "Например, 12,5",
            "product.customAmountUnitLabel": "Единица",
            "product.customAmountAdd": "Добавить это количество",
            "product.customAmountInvalid": "Укажите число больше нуля и выберите единицу.",
            "product.customUnitsSummary": "л / кг / т",
            "product.amountUnitL": "л",
            "product.amountUnitKg": "кг",
            "product.amountUnitT": "т",
            "product.packOnRequest": "Уточняется менеджером",
            "product.details": "Подробнее о товаре",
            "product.openDetails": "Открыть информацию о {name}",
            "product.closeDetails": "Закрыть информацию о товаре",
            "product.gallery": "Фотографии товара",
            "product.showImage": "Показать фото {number}",
            "product.previousPhoto": "Предыдущее фото",
            "product.nextPhoto": "Следующее фото",
            "product.photoPosition": "Фото {current} из {total}",
            "product.imageDisclaimer": "Изображение является художественным изображением товара, реальный внешний вид может отличаться.",
            "product.imageDisclaimerOpen": "Показать примечание к изображению",
            "product.descriptionTitle": "Описание",
            "product.descriptionMissing": "Подробное описание уточняется.",
            "product.imageMissing": "Фото добавит менеджер",
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
            "category.flavor.title": "Функциональные добавки",
            "category.flavor.description": "Функциональные добавки для стабильности, вкуса и технологических процессов в производстве.",
            "category.protein.title": "Соевые продукты",
            "category.protein.description": "Соевые продукты и ингредиенты для пищевого производства.",
            "category.page.back": "Назад к мини-каталогу",
            "category.page.badge": "Каталог Nikas",
            "category.page.allBadge": "Все направления",
            "category.page.sectionBadge": "Раздел каталога",
            "category.page.title": "Каталог товаров",
            "category.page.description": "Откройте товар, изучите подробности и добавьте нужные позиции в заявку менеджеру.",
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
            "reviews.eyebrow": "Отзывы",
            "reviews.title": "Что говорят о товарах Nikas",
            "reviews.description": "Публикуем отзывы после проверки, чтобы информация была честной и полезной.",
            "reviews.empty": "Здесь скоро появятся отзывы покупателей.",
            "reviews.ctaQuestion": "Вы уже у нас заказывали?",
            "reviews.ctaText": "Поделитесь впечатлением о товаре. Отзыв появится после проверки.",
            "reviews.ctaButton": "Написать отзыв",
            "reviews.formTitle": "Написать отзыв",
            "reviews.formIntro": "Все поля необязательны. Можно оставить только оценку или добавить детали по желанию.",
            "reviews.productLabel": "Приобретенный товар (необязательно)",
            "reviews.productPlaceholder": "Выберите товар",
            "reviews.nameLabel": "Ваше имя (необязательно)",
            "reviews.namePlaceholder": "Например, Александр",
            "reviews.ratingLabel": "Ваша оценка (необязательно)",
            "reviews.textLabel": "Текст отзыва (необязательно)",
            "reviews.textPlaceholder": "Расскажите, что вам понравилось",
            "reviews.traitsLabel": "Что особенно запомнилось (необязательно)",
            "reviews.traitsPositive": "Положительное",
            "reviews.traitsNegative": "Можно улучшить",
            "reviews.trait.currentPrice": "Актуальная цена",
            "reviews.trait.fastShipping": "Быстро отправили",
            "reviews.trait.goodService": "Хорошее обслуживание",
            "reviews.trait.accurateDescription": "Актуальное описание",
            "reviews.trait.inStock": "Товар был в наличии",
            "reviews.trait.politeSeller": "Вежливый продавец",
            "reviews.trait.quickContact": "Быстро связались",
            "reviews.trait.notShipped": "Товар не отправили",
            "reviews.trait.higherPrice": "Цена выше заявленной",
            "reviews.trait.outOfStock": "Товара не было в наличии",
            "reviews.trait.noContact": "Со мной не связались",
            "reviews.trait.differentFromDescription": "Товар не соответствовал описанию",
            "reviews.trait.slowShipping": "Отправляли дольше обещанного",
            "reviews.trait.rudeSeller": "Невежливый продавец",
            "product.networkError": "Нет подключения к интернету. Проверьте сеть и перезагрузите страницу.",
            "reviews.submit": "Отправить отзыв",
            "reviews.sending": "Отправляем отзыв...",
            "reviews.success": "Спасибо. После проверки отзыв появится на странице.",
            "reviews.error": "Не удалось отправить отзыв. Попробуйте еще раз.",
            "reviews.close": "Закрыть",
            "reviews.unknownAuthor": "Покупатель Nikas",
            "reviews.noText": "Покупатель оставил оценку без текстового комментария.",
            "reviews.product": "Товар",
            "reviews.pageStatus": "Страница {current} из {total}",
            "reviews.previousPage": "Предыдущая страница",
            "reviews.nextPage": "Следующая страница",
            "form.name": "Имя и фамилия *",
            "form.phone": "Телефон *",
            "form.email": "Электронная почта (необязательно)",
            "form.question": "Что хотите уточнить? (необязательно)",
            "form.namePlaceholder": "Например, Александр",
            "form.phonePlaceholder": "+380 00 000 00 00",
            "form.emailPlaceholder": "name@example.com",
            "form.questionPlaceholder": "Напишите товар, нужный объём, фасовку или условия доставки",
            "form.submit": "Отправить заявку",
            "form.ready": "Все готово, заявку можно отправить.",
            "form.fillRequired": "Заполните имя и телефон, чтобы отправить заявку.",
            "form.checkFields": "Проверьте правильность заполнения полей.",
            "form.sending": "Отправляем заявку...",
            "form.sent": "Заявка отправлена",
            "form.success": "Мы получили вашу заявку. Менеджер свяжется с вами в ближайшее время.",
            "form.successWithNumber": "Заявка №{number} принята. Менеджер свяжется с вами в ближайшее время.",
            "form.error": "Не удалось отправить заявку. Попробуйте еще раз.",
            "form.honeypot": "Не заполняйте это поле",
            "footer.brand": "Специи и пищевые ингредиенты для торговли, производства и профессиональной кухни.",
            "footer.info": "Информация",
            "footer.products": "Продукция",
            "footer.contacts": "Наши контакты",
            "footer.scheduleTitle": "График работы:",
            "footer.schedule": "Пн-Пт 9:00-18:00\nСб-Вс - выходной",
            "footer.addressTitle": "Адрес:",
            "footer.address": "г. Днепр, ул. Базовая, д. 8",
            "footer.company": "ООО \"СК\"НИКАС\"",
            "footer.copyright": "© 2026 Все права защищены.",
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
            "nav.reviews": "Reviews",
            "nav.openMenu": "Open menu",
            "nav.closeMenu": "Close menu",
            "nav.mainNav": "Main navigation",
            "nav.sidebar": "Site menu",
            "contact.open": "Contact",
            "contact.menu": "Nikas contacts",
            "contact.phone": "Phone",
            "contact.quick": "Quick contact",
            "quick.barLabel": "Nikas quick actions",
            "quick.whatsapp": "WhatsApp",
            "quick.telegram": "Telegram",
            "quick.request": "Request",
            "quick.download": "Download product list PDF",
            "quick.downloadShort": "List",
            "quick.downloadTitle": "Download the Nikas PDF product list",
            "cart.title": "Request",
            "cart.open": "Open request",
            "cart.close": "Close request",
            "cart.empty": "Add the products you would like to enquire about or order.",
            "cart.clear": "Clear",
            "cart.order": "Complete request",
            "cart.remove": "Remove",
            "cart.removeItem": "Remove {name} from the request",
            "cart.increase": "Add {name}",
            "cart.decrease": "Decrease {name}",
            "cart.quantity": "Quantity",
            "cart.quantityHint": "Set the required quantity for each item.",
            "cart.items.one": "{count} item",
            "cart.items.few": "{count} items",
            "cart.items.many": "{count} items",
            "cart.added": "Added",
            "cart.add": "Add to request",
            "cart.ask": "Ask",
            "cart.requestEyebrow": "Request to a Nikas manager",
            "cart.orderTitle": "Complete your request",
            "cart.orderIntro": "Review the selected products and leave your contact details. A manager will confirm price, availability, packing and delivery.",
            "cart.orderItems": "Selected products",
            "cart.orderComment": "Request details (optional)",
            "cart.orderCommentPlaceholder": "For example: 25 kg packing, delivery city or preferred call time",
            "cart.submitOrder": "Send request to manager",
            "cart.askPrefill": "I would like to confirm the price, availability and terms for “{name}”.",
            "cart.privacy": "Your contact details are used only to respond to this request.",
            "cart.successTitle": "Request received",
            "cart.orderSuccess": "It has been saved in our system. A manager will contact you shortly.",
            "cart.requestNumber": "Request number: {number}",
            "cart.successClose": "Done",
            "cart.orderError": "Could not send the request. Please try again.",
            "cart.closeModal": "Close request form",
            "product.priceAvailability": "Please enquire about price and availability",
            "product.priceLabel": "Price",
            "product.packLabel": "Packing",
            "product.packOptionsTitle": "Choose volume or packing",
            "product.packOptionsHint": "The selected option will be saved in the request for the manager.",
            "product.quantityTitle": "How much do you need?",
            "product.quantityHint": "Choose the packing above and add one item or enter the required quantity.",
            "product.quantityAddOne": "Add 1",
            "product.quantityCustomLabel": "Quantity",
            "product.quantityAddCustom": "Add entered amount",
            "product.customAmountOnlyTitle": "Enter the amount you need",
            "product.orCustomAmount": "or enter the amount yourself",
            "product.customAmountLabel": "Amount",
            "product.customAmountPlaceholder": "For example, 12.5",
            "product.customAmountUnitLabel": "Unit",
            "product.customAmountAdd": "Add this amount",
            "product.customAmountInvalid": "Enter a number greater than zero and choose a unit.",
            "product.customUnitsSummary": "L / kg / t",
            "product.amountUnitL": "L",
            "product.amountUnitKg": "kg",
            "product.amountUnitT": "t",
            "product.packOnRequest": "Confirmed by a manager",
            "product.details": "Product details",
            "product.openDetails": "Open information about {name}",
            "product.closeDetails": "Close product information",
            "product.gallery": "Product photos",
            "product.showImage": "Show photo {number}",
            "product.previousPhoto": "Previous photo",
            "product.nextPhoto": "Next photo",
            "product.photoPosition": "Photo {current} of {total}",
            "product.imageDisclaimer": "This image is an artistic representation of the product. The actual appearance may differ.",
            "product.imageDisclaimerOpen": "Show image note",
            "product.descriptionTitle": "Description",
            "product.descriptionMissing": "A detailed description will be provided on request.",
            "product.imageMissing": "A manager will add a photo",
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
            "category.flavor.title": "Functional Additives",
            "category.flavor.description": "Functional ingredients for stability, taste and production processes.",
            "category.protein.title": "Soy Products",
            "category.protein.description": "Soy products and ingredients for food production.",
            "category.page.back": "Back to mini catalog",
            "category.page.badge": "Nikas catalog",
            "category.page.allBadge": "All directions",
            "category.page.sectionBadge": "Catalog section",
            "category.page.title": "Product catalog",
            "category.page.description": "Open a product, review the details and add the required items to your manager request.",
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
            "reviews.eyebrow": "Reviews",
            "reviews.title": "What customers say about Nikas products",
            "reviews.description": "We publish reviews after moderation to keep the information useful and reliable.",
            "reviews.empty": "Customer reviews will appear here soon.",
            "reviews.ctaQuestion": "Have you ordered from us already?",
            "reviews.ctaText": "Share your experience with a product. Your review will appear after moderation.",
            "reviews.ctaButton": "Write a review",
            "reviews.formTitle": "Write a review",
            "reviews.formIntro": "Every field is optional. You can leave only a rating or add details if you wish.",
            "reviews.productLabel": "Purchased product (optional)",
            "reviews.productPlaceholder": "Choose a product",
            "reviews.nameLabel": "Your name (optional)",
            "reviews.namePlaceholder": "For example, Alex Smith",
            "reviews.ratingLabel": "Your rating (optional)",
            "reviews.textLabel": "Review text (optional)",
            "reviews.textPlaceholder": "Tell us what you liked",
            "reviews.traitsLabel": "What stood out (optional)",
            "reviews.traitsPositive": "Positive",
            "reviews.traitsNegative": "Could be improved",
            "reviews.trait.currentPrice": "Accurate price",
            "reviews.trait.fastShipping": "Quick dispatch",
            "reviews.trait.goodService": "Good service",
            "reviews.trait.accurateDescription": "Accurate description",
            "reviews.trait.inStock": "Item was in stock",
            "reviews.trait.politeSeller": "Polite seller",
            "reviews.trait.quickContact": "Quick response",
            "reviews.trait.notShipped": "Item was not shipped",
            "reviews.trait.higherPrice": "Price was higher than listed",
            "reviews.trait.outOfStock": "Item was unavailable",
            "reviews.trait.noContact": "No response received",
            "reviews.trait.differentFromDescription": "Item differed from description",
            "reviews.trait.slowShipping": "Dispatch took longer than promised",
            "reviews.trait.rudeSeller": "Rude seller",
            "product.networkError": "No internet connection. Check your network and reload the page.",
            "reviews.submit": "Send review",
            "reviews.sending": "Sending review...",
            "reviews.success": "Thank you. Your review will appear on the page after moderation.",
            "reviews.error": "Could not send the review. Please try again.",
            "reviews.close": "Close",
            "reviews.unknownAuthor": "Nikas customer",
            "reviews.noText": "The customer left a rating without a written comment.",
            "reviews.product": "Product",
            "reviews.pageStatus": "Page {current} of {total}",
            "reviews.previousPage": "Previous page",
            "reviews.nextPage": "Next page",
            "form.name": "Full name *",
            "form.phone": "Phone *",
            "form.email": "Email (optional)",
            "form.question": "What would you like to clarify? (optional)",
            "form.namePlaceholder": "For example, Alex Smith",
            "form.phonePlaceholder": "+380 00 000 00 00",
            "form.emailPlaceholder": "name@example.com",
            "form.questionPlaceholder": "Specify the product, volume, packing or delivery requirements",
            "form.submit": "Send request",
            "form.ready": "Everything is ready. You can send the request.",
            "form.fillRequired": "Fill in name and phone to send the request.",
            "form.checkFields": "Please check that the fields are filled in correctly.",
            "form.sending": "Sending request...",
            "form.sent": "Request sent",
            "form.success": "We received your request. A manager will contact you soon.",
            "form.successWithNumber": "Request #{number} has been received. A manager will contact you soon.",
            "form.error": "Could not send the request. Please try again.",
            "form.honeypot": "Do not fill this field",
            "footer.brand": "Spices and food ingredients for retail, production and professional kitchens.",
            "footer.info": "Information",
            "footer.products": "Products",
            "footer.contacts": "Our contacts",
            "footer.scheduleTitle": "Working hours:",
            "footer.schedule": "Mon-Fri 9:00-18:00\nSat-Sun - closed",
            "footer.addressTitle": "Address:",
            "footer.address": "8 Bazova St., Dnipro",
            "footer.company": "LLC \"RMC\"NIKAS\"",
            "footer.copyright": "© 2026 All rights reserved.",
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
            const isMobileHeaderSwitcher = container.closest(".site-header") && window.matchMedia(MOBILE_HEADER_QUERY).matches;

            if (container.dataset.languageReady === "true") {
                const select = container.querySelector("select");

                if (select && select.value !== currentLanguage) {
                    select.value = currentLanguage;
                }

                if (select) {
                    [...select.options].forEach((option) => {
                        option.textContent = isMobileHeaderSwitcher
                            ? SHORT_LANGUAGE_NAMES[option.value]
                            : t(`language.name.${option.value}`);
                    });
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
                option.textContent = isMobileHeaderSwitcher ? SHORT_LANGUAGE_NAMES[language] : t(`language.name.${language}`);
                select.append(option);
            });

            select.value = currentLanguage;
            select.addEventListener("change", () => setLanguage(select.value));

            label.append(labelText, select);
            container.replaceChildren(label);
        });
    }

    window.matchMedia(MOBILE_HEADER_QUERY).addEventListener("change", renderLanguageSwitchers);

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
