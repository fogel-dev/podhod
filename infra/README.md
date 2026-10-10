# Первый запуск небольшого VPS

EGO-22. Это подготовленная конфигурация, не подтверждение состоявшегося деплоя. Требуются выбранный VPS, домен с DNS A на его IPv4, Docker Engine + Compose v2+, готовые образы и внешний backup. Целевой минимум — 1 vCPU / 2 GiB / 25 GiB; лимиты описаны в ADR-004. Сборку Go/React на VPS не выполнять.

## Кандидаты на 10 октября 2026

| Провайдер                                               | Опубликованная конфигурация | Цена                         | Ограничение выбора                                                                 |
| ------------------------------------------------------- | --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| [Selectel](https://selectel.ru/services/cloud/vps-vds/) | 1 vCPU / 2 GiB / 25 GiB     | 250 ₽/месяц                  | Кандидат; цену, наличие в регионе, IPv4 и оплату ещё проверить в конкретном заказе |
| [VDSina](https://vdsina.ru/pricing/standard)            | 1 core / 1 GiB / 10 GiB     | 5 ₽/сутки, 150 ₽ за 30 дней  | Для подготовленного профиля не хватает RAM; диск слишком тесный                    |
| [VDSina](https://vdsina.ru/pricing/standard)            | 1 core / 2 GiB / 50 GiB     | 20 ₽/сутки, 600 ₽ за 30 дней | Дороже, больше диска; 31 день — 620 ₽                                              |

Это сравнение опубликованных тарифов, а не гарантия цены заказа или самого дешёвого VPS на рынке. Домен и внешний backup оплачиваются отдельно. [S3 Selectel](https://docs.selectel.ru/s3/about/payment/) тарифицирует хранение, запросы и трафик; полный бюджет копий считается после выбора региона и ожидаемого объёма. Пока ресурсы не созданы и способ оплаты не проверен. Не покупать по одной маркетинговой цене без подтверждения полной суммы.

## Подготовка

1. Установить обновления ОС и Docker по официальной инструкции для выбранного дистрибутива. SSH — по ключу; открыть 80/443 TCP и SSH только для оператора. Не публиковать PostgreSQL. Проверить правила сети Docker, а не полагаться только на UFW.
2. Checkout конкретного принятого коммита в `/opt/podhod`. Скопировать `infra/production.env.example` в `/etc/podhod/production.env` вне checkout. Указать домен и реальные API/web/Caddy/PostgreSQL образы с `@sha256:`. PostgreSQL — 18.6-alpine, совместимый с миграциями. Go-образ содержит API/worker/migrate. Caddy использует стандартный образ с Caddyfile adapter; проверить его версию, подпись/источник и digest. Реестр может быть приватным, credentials на сервере отдельно.
3. Под root создать `/etc/podhod/secrets` с mode 0700. Существующий `node tooling/dev/secrets.mjs` можно выполнить на доверенной машине с `PODHOD_SECRETS_DIR` вне checkout: он создаёт случайные пароли и ключи, не печатая их. Передать по SSH/SCP в защищённый каталог. Значения не менять после инициализации БД без согласованной ротации. URL внутри файлов использует hostname `db`.
4. Compose file-backed secrets сохраняют права исходных файлов. На Linux файлы внутри root-owned каталога 0700 должны быть 0444, чтобы отдельные non-root UID контейнеров могли читать свои mounts; родительский каталог по-прежнему закрыт. Секреты монтируются только потребителям. Не использовать dev-файлы mode 0600 с владельцем root: API 65532 их не прочитает. Скопировать ключи auth/job и recovery в отдельное защищённое место вне VPS.
5. Создать `/var/lib/podhod`, `postgres`, `caddy-data`, `caddy-config`. Каталоги Caddy: владелец 65532:65532, mode 0700; каталог postgres отдаётся entrypoint PostgreSQL для первичной настройки. Проверить свободный диск и отсутствие пересечения `PODHOD_UPSTREAM_SUBNET` с сетями хоста/VPN.

## Запуск и проверка

Из `/opt/podhod`, с защищённым env-файлом:

```sh
docker compose --env-file /etc/podhod/production.env -f compose.production.yaml config --quiet
docker compose --env-file /etc/podhod/production.env -f compose.production.yaml pull
docker compose --env-file /etc/podhod/production.env -f compose.production.yaml run --rm --no-deps proxy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose --env-file /etc/podhod/production.env -f compose.production.yaml run --rm --no-deps web -t -c /etc/nginx/podhod.conf
docker compose --env-file /etc/podhod/production.env -f compose.production.yaml up -d
docker compose --env-file /etc/podhod/production.env -f compose.production.yaml ps --all
```

Перед передачей env на VPS выполнить на машине с Node 22: `node tooling/deploy/validate.mjs /путь/вне/checkout/production.env`. Проверка отклоняет example-домен и плавающие image tags, не читает содержимое секретов. Node не нужен на самом VPS. Для проверки формата Compose в CI допускаются локальные tags; для реального релиза — только digest.

Миграция должна завершиться с кодом 0; API/worker запускаются только после неё. После обновления образа migrate должен быть пересоздан. Не выполнять `down -v` или удаление каталогов данных для исправления ошибки запуска. Проверить `curl --fail https://ДОМЕН/api/ready`, редирект HTTP → HTTPS, сертификат и отсутствие открытого 5432 с другого компьютера. Проверить реальную регистрацию, cookie Secure/HttpOnly, logout и сохранение аккаунта после перезапуска. Логи не должны содержать пароль, cookie или тела личных записей. Проверить `docker stats`, пиковую память при входах, свободный диск и рестарт контейнеров без OOM.

TLS автоматически обслуживает [Caddy](https://caddyserver.com/docs/automatic-https). Внутренние непривилегированные порты 8080/8443 опубликованы как 80/443, поэтому процесс proxy может работать без root и capabilities. ACME требует реального домена, корректного DNS и доступных портов. Нельзя объявлять HTTPS проверенным после одной проверки синтаксиса Compose.

## Перед выпуском

Настроить внешние зашифрованные копии БД и файлов, выполнить restore на чистом окружении и проверить свежесть копии; подробная автоматизация — EGO-34. До этого использовать окружение только для технических проверок без единственной копии личных данных. Подключить PWA/push проверку EGO-8 на целевых устройствах. Ни конфигурация, ни успешный CI не подтверждают установку PWA и доставку push. Production выпуск остаётся незавершённым до этих проверок.

При следующем релизе сохранить предыдущие digest и внешний backup, выполнить миграцию, затем обновить сервисы и проверить readiness. Rollback приложения только на совместимой схеме; destructive down migrations не применять. Выпуск и восстановление описаны в docs/deployment.md.
