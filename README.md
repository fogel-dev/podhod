# Подход

Mobile-first приложение для тренировок. Один репозиторий, два независимых приложения:

```text
apps/
  web/          React + TypeScript + Vite, FSD
    src/app/    запуск и глобальные стили
    src/shared/ общие ресурсы
  api/          Go HTTP API
    cmd/api/    точка входа
    internal/   конфигурация и HTTP-сервер
design/         согласованный интерактивный макет; не входит в приложение
docs/           требования, дизайн, архитектурные решения
```

## Локальный запуск

Node.js 22.20.0, npm 11.6.1, Go 1.27.2. Docker нужен только для контейнерного запуска.

В корне:

```sh
npm ci
npm run dev
```

Во втором терминале:

```sh
cd apps/api
go run ./cmd/api
```

Фронт: http://127.0.0.1:5173. Vite пересылает `/api` в Go на `127.0.0.1:8080`. `GET /api/health` проверяет процесс; `GET /api/ready` — доступность PostgreSQL и применённость миграций без раскрытия подключения. Начиная с EGO-19 запуск API требует `DATABASE_URL` либо `DATABASE_URL_FILE`; секреты хранятся вне репозитория.

Для текущего Windows-окружения SDK Go скачан в игнорируемую `.tools/go`. Если Go ещё не установлен в PATH, из `apps/api` можно запускать `../../.tools/go/bin/go.exe run ./cmd/api`. Для других компьютеров SDK устанавливается отдельно.

API читает `HTTP_ADDR` из окружения; по умолчанию `127.0.0.1:8080`. `.env.example` — справка, файл `.env` автоматически не загружается. В PowerShell: `$env:HTTP_ADDR = '127.0.0.1:8080'`.

## Проверки и сборка

```sh
npm run check
npm run build
npm run preview
```

Из `apps/api`:

```sh
go vet ./...
go test ./...
go build -trimpath -o bin/api ./cmd/api
```

`npm run format` форматирует новые исходники и документы; дизайн-прототип исключён. Go форматируется через `gofmt -w .` из `apps/api`. GitHub Actions проверяет оба приложения и контейнерные сборки отдельно.

## Контейнеры и деплой

```sh
export PODHOD_SECRETS_DIR="/tmp/podhod-dev-secrets"
node tooling/dev/secrets.mjs
docker compose up --build
```

В PowerShell задайте `$env:PODHOD_SECRETS_DIR = Join-Path $env:TEMP 'podhod-dev-secrets'`, затем выполните команды `node` и `docker compose`. Скрипт создаёт случайные пароли вне репозитория, не печатает и не заменяет существующие значения. Это каталог для разработки; production требует постоянного защищённого каталога и резервной копии секретов.

Compose запускает PostgreSQL в закрытой сети, создаёт отдельные login/runtime роли и применяет миграции перед API. Вне Compose администратор выполняет `apps/api/db/bootstrap.sql`, создаёт login роли и выдаёт членство в `podhod_migrator`, `podhod_api`, `podhod_worker`. `go run ./cmd/migrate` запускается с migration подключением, API — с runtime подключением. Миграции встроены в binary, сериализуются advisory lock и проверяются по SHA-256; изменять применённые файлы запрещено.

Для интеграционных тестов `TEST_DATABASE_URL` указывает на отдельный тестовый PostgreSQL с административными правами. Тесты создают/удаляют только базы `podhod_test_*`; в CI эта база запускается отдельным service. Не использовать production подключение для тестов.

Приложение открывается на http://127.0.0.1:8080, `/api` проксируется в Go. Frontend и API имеют отдельные Dockerfile с контекстом из корня: их можно собирать и выкатывать независимо из одного репозитория. API не публикуется наружу в Compose. `API_UPSTREAM` задаётся при запуске web-контейнера; секреты не нужны для сборки фронта. Для выпуска потребуются домен, TLS на внешнем reverse proxy и окружение хостинга; автоматического деплоя пока нет.

## Границы текущего этапа

Инициализированы сборки, проверки, глобальные стили, шрифты и сервер; добавлены OpenAPI/DTO и основа PostgreSQL с миграциями доступа/очереди/синхронизации. React пока рендерит пустой корень: продуктовые экраны появятся в своих задачах. Нет моков, seed-данных и фиктивных CRUD. PWA manifest, service worker, установка и Web Push будут реализованы и проверены в EGO-8/EGO-16; нынешняя сборка ещё не является готовой PWA.

Схема FSD и причины выбора монорепозитория: [ADR-001](docs/adr/001-monorepo.md). Дизайн: [docs/design.md](docs/design.md). Статусы работы: [Linear](https://linear.app/egor-fogel/project/podhod-0fb97512cb40).

Принятый проект бэкенда EGO-9: [модель данных и сценарии](docs/backend.md), [API](docs/api.md), [бюджетный деплой](docs/deployment.md), [ADR-002](docs/adr/002-backend.md). Продуктовые endpoint ещё предстоит реализовать; текущий API содержит health и readiness.

Задачи EGO-18–EGO-34 и ранняя проверка PWA EGO-8: [порядок реализации](docs/implementation-plan.md). Актуальные статусы — в Linear.

Пользователь разрешил выполнять задачи принятого плана последовательно без промежуточного ревью: после проверок — коммит и push с номером Linear, Done и переход к следующей задаче.
