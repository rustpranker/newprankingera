PRANKS CATALOG — UPDATED PACKAGE
===============================

Что обновлено:
- Для каждого из 25 пранков добавлено уникальное описание и цена (можешь редактировать в frontend/index.html -> ITEMS).
- Логотип теперь является ссылкой (LOGO_LINK в конфиге) — просто заменяй значение в скрипте или редактируй anchor #logoLink.
- Фронтенд отправляет POST на backend /api/order с заголовком x-secret (SHARED_SECRET).

Деплой на Railway:
1. Создай новый проект на Railway и загрузить папку backend (или подключить репозиторий).
2. В Settings -> Variables добавь: BOT_TOKEN, ADMIN_ID, SHARED_SECRET (значение SHARED_SECRET — тот же, что и в frontend)
3. После деплоя получишь BACKEND_URL (пример https://xyz.up.railway.app).
4. В frontend/index.html установи BACKEND_URL и SHARED_SECRET в конфигурации вверху скрипта.
5. Задеплой frontend на статический хост (Netlify, Vercel, Cloudflare Pages) или размести файл под pranking.xyz.

Безопасность:
- НЕ хранить BOT_TOKEN в публичных репозиториях. Используй env vars на Railway.
- SHARED_SECRET в frontend виден пользователям — это минимальная защита; для продакшена рекомендую серверную авторизацию.

