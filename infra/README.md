# Первый запуск небольшого VPS

EGO-22. 11 октября 2026 пользователь выполнил первый деплой на VDSina (Ubuntu 26.04, x86-64, диск расширен до 50 GiB; ОС показывает 1,6 GiB RAM). Домен: https://podhod-app.duckdns.org. По предоставленным логам БД healthy, migrate Exited (0), API/worker/web/proxy запущены; HTTPS health/readiness возвращают status=ok, HTTP — 308. Пользователь подтвердил работу сервиса. Нагрузочная проверка этого тарифа, физические устройства и PWA/push не подтверждены. Резервные копии по решению пользователя пока отложены в EGO-34. Требуются выбранный VPS, домен с DNS A на его IPv4, Docker Engine + Compose v2+, готовые образы. Целевой минимум — 1 vCPU / 2 GiB / 25 GiB; лимиты описаны в ADR-004. Сборку Go/React на VPS не выполнять.

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
5. Создать `/var/lib/podhod`, `postgres`, `caddy-data`, `caddy-config`, `media`. Каталоги Caddy и media: владелец 65532:65532, mode 0700; владельца каталога postgres определить по UID/GID пользователя postgres выбранного образа до первого запуска (команды ниже). media монтируется только API/worker, вне web root. Для local Compose задать PODHOD_MEDIA_DIR абсолютным каталогом с тем же владельцем; для запуска Go напрямую — MEDIA_DIR. Проверить свободный диск и отсутствие пересечения `PODHOD_UPSTREAM_SUBNET` с сетями хоста/VPN.

## Права каталогов перед первым запуском

На сервере под root, после загрузки образов. Значение PODHOD_DB_IMAGE скопировать из production.env (без чтения файла через source). Не менять секреты уже инициализированной БД.

```sh
set -e
PODHOD_DB_IMAGE=$(sed -n 's/^PODHOD_DB_IMAGE=//p' /etc/podhod/production.env)
test -n "$PODHOD_DB_IMAGE"
PODHOD_DB_UID=$(docker run --rm --entrypoint sh "$PODHOD_DB_IMAGE" -c 'id -u postgres')
PODHOD_DB_GID=$(docker run --rm --entrypoint sh "$PODHOD_DB_IMAGE" -c 'id -g postgres')
install -d -m 0700 /var/lib/podhod
install -d -o "$PODHOD_DB_UID" -g "$PODHOD_DB_GID" -m 0700 /var/lib/podhod/postgres
install -d -o 65532 -g 65532 -m 0700 /var/lib/podhod/media /var/lib/podhod/caddy-data /var/lib/podhod/caddy-config
```

Если каталоги Caddy созданы с другим владельцем, остановить proxy и выполнить chown -R 65532:65532 только для caddy-data/caddy-config. Ошибка mkdir /data/caddy: permission denied препятствует выпуску сертификата; exec /usr/bin/caddy: operation not permitted указывает на отсутствующую capability. Не удалять каталоги БД или TLS для исправления запуска.

## Образы через SSH без registry

Собирать из конкретного git archive на доверенной машине. Для текущего VDS x86-64 использовать --platform linux/amd64; git archive исключает локальные незакоммиченные изменения. Пример из корня репозитория на Mac с Docker Desktop:

```sh
set -e
PODHOD_RELEASE=$(git rev-parse HEAD)
PODHOD_BUNDLE=$(mktemp -d /tmp/podhod-deploy.XXXXXX)
git archive "$PODHOD_RELEASE" | tar -x -C "$PODHOD_BUNDLE"
docker build --platform linux/amd64 -f "$PODHOD_BUNDLE/apps/api/Dockerfile" -t "podhod-api:$PODHOD_RELEASE" "$PODHOD_BUNDLE"
docker build --platform linux/amd64 -f "$PODHOD_BUNDLE/apps/web/Dockerfile" -t "podhod-web:$PODHOD_RELEASE" "$PODHOD_BUNDLE"
docker save "podhod-api:$PODHOD_RELEASE" "podhod-web:$PODHOD_RELEASE" | gzip > "$PODHOD_BUNDLE/images.tar.gz"
printf '%s\n' "$PODHOD_RELEASE" > "$PODHOD_BUNDLE/RELEASE_SHA"
COPYFILE_DISABLE=1 tar --exclude=images.tar.gz -czf /tmp/podhod-source.tar.gz -C "$PODHOD_BUNDLE" .
scp /tmp/podhod-source.tar.gz "$PODHOD_BUNDLE/images.tar.gz" root@185.209.28.179:/root/
```

Только при первом запуске: распаковать source в новый /opt/podhod. При обновлении сначала распаковать в отдельный каталог релиза и проверить изменения; не перезаписывать работающий checkout автоматически. На сервере:

```sh
gzip -dc /root/images.tar.gz | docker load
cd /opt/podhod
PODHOD_RELEASE=$(cat RELEASE_SHA)
docker image inspect "podhod-api:$PODHOD_RELEASE" --format '{{.Id}}'
docker image inspect "podhod-web:$PODHOD_RELEASE" --format '{{.Id}}'
```

Полные значения sha256 из inspect записать в PODHOD_API_IMAGE и PODHOD_WEB_IMAGE. Caddy/PostgreSQL закрепить по registry digest. Для этого варианта пропустить compose pull и запускать up -d --pull never. Валидатор принимает локальные image ID только для API/web. Не использовать плавающие tags в production.env.

На первом VDS capability добавлена отдельным /etc/podhod/compose.override.yaml. После переноса обновлённого compose.production.yaml она уже есть в основном файле; override можно оставить (он задаёт ту же capability), либо убрать из последующих команд. При использовании старого файла обязательно передавать оба -f. Работающее окружение в этом проходе автоматически не обновляется.

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

Перед передачей env на VPS выполнить на машине с Node 22: `node tooling/deploy/validate.mjs /путь/вне/checkout/production.env`. Проверка отклоняет example-домен и плавающие image tags, не читает содержимое секретов. Node не нужен на самом VPS. Для проверки формата Compose в CI допускаются локальные tags; для реального релиза — registry digest либо полный локальный image ID sha256 для API/web, загруженных через docker load.

Миграция должна завершиться с кодом 0; API/worker запускаются только после неё. После обновления образа migrate должен быть пересоздан. Не выполнять `down -v` или удаление каталогов данных для исправления ошибки запуска. Проверить `curl --fail https://ДОМЕН/api/ready`, редирект HTTP → HTTPS, сертификат и отсутствие открытого 5432 с другого компьютера. Проверить реальную регистрацию, cookie Secure/HttpOnly, logout и сохранение аккаунта после перезапуска. Логи не должны содержать пароль, cookie или тела личных записей. Проверить `docker stats`, пиковую память при входах, свободный диск и рестарт контейнеров без OOM.

TLS автоматически обслуживает [Caddy](https://caddyserver.com/docs/automatic-https). Внутренние непривилегированные порты 8080/8443 опубликованы как 80/443, поэтому процесс proxy работает без root. Официальный бинарник Caddy имеет file capability NET_BIND_SERVICE; Compose сохраняет только её через cap_add, иначе exec может завершиться operation not permitted при cap_drop ALL. ACME требует реального домена, корректного DNS и доступных портов. Нельзя объявлять HTTPS проверенным после одной проверки синтаксиса Compose.

## Перед выпуском

11 октября 2026 пользователь решил пока не делать резервные копии. Они не настроены и не входят в текущую приёмку EGO-22; EGO-34 остаётся будущей задачей. Когда пользователь вернётся к этому этапу, настроить внешние зашифрованные копии БД и файлов, выполнить restore на чистом окружении и проверить свежесть копии; подробная автоматизация — EGO-34. До этого использовать окружение только для технических проверок без единственной копии личных данных. Подключить PWA/push проверку EGO-8 на целевых устройствах. Ни конфигурация, ни успешный CI не подтверждают установку PWA и доставку push. Production выпуск остаётся незавершённым до этих проверок.

При следующем релизе сохранить предыдущие digest и внешний backup, выполнить миграцию, затем обновить сервисы и проверить readiness. Rollback приложения только на совместимой схеме; destructive down migrations не применять. Выпуск и восстановление описаны в docs/deployment.md.
