# Звіт про підготовку CinemaNOVA для комісії

Дата: 2026-11-09.

## Джерело та історія
Копія поточного коду гілки dev приватного проєкту. Файли прочитані під час підготовки; це не аудит старої історії. Історія комітів, гілки, теги, GitHub Secrets та SSH-ключі серверів не переносилися. Основний репозиторій не змінювався.

## Зміни
- Видалено вбудовані резервні ключі TMDB із server.ts, src/services/tmdb.ts та src/services/posterLookup.ts; використовуються змінні оточення.
- Видалено значення Google OAuth Client ID з прикладу налаштувань та коду. Client ID є публічним ідентифікатором, але копія має використовувати власний.
- Внутрішні адреси серверів замінено локальними адресами або прикладами. Списки вузлів синхронізації користувачів у server/routes/api.ts очищено: копія не надсилає логіни й паролі на робочі сервери.
- Тестові адреси облікових записів замінено адресами example.invalid. Старі вбудовані паролі замінено явним демонстраційним значенням PUBLIC_DEMO_ONLY. Це публічні демонстраційні облікові записи; вони не призначені для реального сервісу.
- Паролі PostgreSQL та pgAdmin у docker-compose.yml тепер обов’язково задаються через .env.
- MinIO вимкнено в .env.example; адреса за замовчуванням локальна; ключі сховища залишено порожніми.
- Шість конфігурацій GitHub Actions перенесено до docs/ci-examples/*.example. Вони не запускаються; адреси та реєстр образів замінено прикладами, перевірку SSH host key увімкнено.
- Не перенесено scripts/__pycache__/transcribe.cpython-311.pyc. Додано правила ігнорування кешів Python, .pem, .key, id_rsa, id_ed25519 та .ssh.
- Збережено вихідний код, міграції та файли залежностей. П’ять PNG більші за 1 МБ недоступні для завантаження через підключення: AuthEllipse.png і HomeBack.png замінено відповідними наявними WebP; CodeVhid Mobile.png, NewPassMobile.png, RestorepassMobile.png — на наявне VhidMobile.png. Посилання в App.tsx та AuthModal.tsx оновлено. Три мобільні фони в копії тому виглядатимуть інакше.

## Перевірки та межі
Переглянуто всі 132 текстові файли. Пошук маркерів приватних ключів у них збігів не дав. Перевірено відсутність старих вбудованих паролів, ідентифікатора Google, внутрішніх адрес та знайдених ключів TMDB в очищеному тексті. JSON-файли перевірено на синтаксис. Це перевірка відомих шаблонів, не гарантія відсутності всіх можливих секретів. Зображення перенесено як двійкові файли; аналіз прихованих даних у зображеннях не виконувався.

Збирання та запуск із зовнішніми сервісами не перевірялися. У початковому проєкті є демонстраційна автентифікація, зберігання паролів у відкритому вигляді та локальному сховищі браузера. Ця копія призначена для огляду коду, не для розгортання з реальними користувачами. Якщо знайдені у вихідному коді ключі використовуються, їх потрібно відкликати чи замінити в сервісі постачальника; очищення копії цього не робить.

## Перелік змінених файлів
- .env.example
- .github/workflows/backend.yml → docs/ci-examples/backend.yml.example
- .github/workflows/cd-prod.yml → docs/ci-examples/cd-prod.yml.example
- .github/workflows/cd-stage.yml → docs/ci-examples/cd-stage.yml.example
- .github/workflows/ci.yml → docs/ci-examples/ci.yml.example
- .github/workflows/frontend.yml → docs/ci-examples/frontend.yml.example
- .github/workflows/sonar.yml → docs/ci-examples/sonar.yml.example
- .gitignore
- docker-compose.yml
- server.ts
- server/db.ts
- server/minioClient.ts
- server/routes/api.ts
- src/App.tsx
- src/components/AdminPanel.tsx
- src/components/AuthModal.tsx
- src/components/ProfileView.tsx
- src/components/RegisterModal.tsx
- src/data/movies.ts
- src/services/posterLookup.ts
- src/services/tmdb.ts
- src/utils/googleAuth.ts
