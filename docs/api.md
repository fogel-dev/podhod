# API «Подход»: контракт первой версии

Дата: 10 октября 2026. EGO-9. Статус: проект контракта принят пользователем; маршруты ниже ещё не реализованы. Сейчас существует только `GET /api/health`. [Модель данных](backend.md) задаёт доменные правила, [ADR-002](adr/002-backend.md) — решения.

## Общие правила

База `/api/v1`, HTTPS, JSON UTF-8, camelCase, UUID строкой. Даты `YYYY-MM-DD`, время RFC3339 с offset, сервер возвращает UTC; timezone IANA отдельно. Decimal вес и объём передаются строками (`"42.50"`), чтобы исключить округление float. Nullable явно передаётся как null. Ответ содержит только разрешённые поля, не SQL-модель целиком.

Создание: 201, чтение/команды: 200, удаление без тела: 204, фоновые операции: 202 с ID и status URL. 400 — структура, 401 — сессия, 403 — CSRF/запрет действия, 404 — отсутствие или чужой ресурс, 409 — версия/доменный конфликт, 410 — cursor истёк, 413 — размер, 422 — значения, 429 — лимит с Retry-After. Ошибка 5xx не подтверждает, что команда не выполнилась: повторяется тот же ID.

```json
{
  "error": {
    "code": "version_conflict",
    "message": "Запись изменена на другом устройстве",
    "requestId": "uuid",
    "details": { "currentVersion": 8, "aggregateId": "uuid" }
  }
}
```

Конфликт синхронизации дополнительно возвращает serverAggregate; field errors — массив `{path, code}`. Технические сообщения SQL/провайдера и токены наружу не выходят. GET приватных данных — `Cache-Control: no-store`; CDN не кеширует `/api`. Same-origin cookie auth и CSRF описаны в backend.md.

Изменения корней требуют `If-Match: "<version>"`, отсутствие — 428; в командах вместо заголовка поле expectedVersion. Создание требует `Idempotency-Key: <UUID>` и `X-Device-Id`; ключ равен commandId внутренней операции. Повтор с иным телом — 409 idempotency_key_reused. GET возвращает version и ETag. Исключения: login/request и verify используют challenge протокол, logout идемпотентен сам по себе. 409 никогда не скрывается автоматическим overwrite.

Списки: `limit` по умолчанию 30, максимум 100, подписанный непрозрачный cursor, ответ `{items, nextCursor}`. Сортировка стабильная по полю и ID. Общий JSON body до 1 MiB, заметка до 10 000 символов, название до 120. Месячный календарь — строго один месяц, запрос прогресса — максимум 5 лет и 500 точек после агрегации. Все пределы уточняются по UX до реализации и отражаются в OpenAPI. Upload бинарных файлов проходит отдельно в storage.

## Вход, пользователь, устройства

| Метод и путь                | Вход                                      | Результат                                                                       |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| POST `/auth/email/request`  | email                                     | 202 challengeId, expiresAt, retryAfterSeconds; одинаково для новых/существующих |
| POST `/auth/email/verify`   | challengeId, code, deviceLabel, deviceId? | user, deviceId, csrfToken; Set-Cookie                                           |
| GET `/auth/session`         | cookie                                    | user, deviceId, expiresAt, csrfToken; 401 без сессии                            |
| POST `/auth/logout`         | CSRF                                      | отзыв текущей сессии, очистка cookie                                            |
| GET `/me`                   | —                                         | id, email, timezone, locale, version                                            |
| PATCH `/me`                 | timezone/locale, If-Match                 | обновлённые настройки; историю не переносит                                     |
| GET `/me/devices`           | —                                         | устройства и последний доступ, без токенов                                      |
| DELETE `/me/devices/{id}`   | If-Match                                  | отзыв сессий и push устройства                                                  |
| POST `/me/exports`          | Idempotency-Key                           | 202 exportId                                                                    |
| GET `/me/exports/{id}`      | —                                         | queued/ready/failed, краткая download ссылка при ready                          |
| POST `/me/deletion/request` | CSRF                                      | новый email challenge для удаления                                              |
| POST `/me/deletion/confirm` | challengeId, code, Idempotency-Key        | 202, сессии отозваны; удаление продолжает worker                                |

Challenge удаления отдельного purpose, не подходит для login и наоборот. Идентичный успешный повтор verify не создаёт вторую сессию: при потере cookie пользователь запрашивает новый код. Список devices возвращает version для отзыва; при отзыве текущего cookie удаляется.

## Библиотека и программы

| Метод и путь                                    | Вход / действие                                                                | Результат                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| GET `/exercises`                                | q, includeArchived, cursor                                                     | личная библиотека                                                    |
| POST `/exercises`                               | id, name, note                                                                 | созданное упражнение                                                 |
| GET `/exercises/{id}`                           | —                                                                              | упражнение и techniqueGuide с источником либо null                   |
| PATCH `/exercises/{id}`                         | name/note/archived, If-Match                                                   | новая version; старые снимки не меняются                             |
| GET `/programs`                                 | includeArchived, cursor                                                        | программы и текущие ревизии                                          |
| POST `/programs`                                | id, name, полная revision                                                      | атомарная публикация первой ревизии                                  |
| GET `/programs/{id}`                            | —                                                                              | корень и полная текущая ревизия                                      |
| GET `/programs/{id}/revisions/{revisionId}`     | —                                                                              | собственная неизменяемая ревизия для офлайн/истории                  |
| POST `/programs/{id}/revisions`                 | полная revision, expectedVersion, effectiveFrom                                | новая ревизия и version программы                                    |
| POST `/programs/{id}/copy-day`                  | expectedVersion, effectiveFrom, sourceWeekday, targetWeekdays, replaceExisting | создаёт ревизию с копией; без replace конфликт при заполненных целях |
| POST `/programs/{id}/archive`                   | expectedVersion, effectiveFrom                                                 | прекращает будущий план с даты, сохраняет прошлое                    |
| PUT `/programs/{id}/exceptions/{sourceDate}`    | expectedVersion программы, action, targetDate?                                 | отмена или перенос будущей плановой даты                             |
| DELETE `/programs/{id}/exceptions/{sourceDate}` | If-Match программы                                                             | снятие исключения с проверкой занятой даты                           |

Архивирование имеет `archived_from date` в корне (помимо archived_at технического времени), чтобы история расписания сохранялась; end_date ревизии не переписывается. GET календаря учитывает эту границу. Публикация ревизии, копирование, архивирование и исключения изменяют одну version программы. GET показывает исключения вместе с корнем, чтобы офлайн снимок был полным.

Форма ревизии:

```text
startDate, endDate, timezone, effectiveFrom
days[]: weekday, exercises[]
exercise: id, exerciseId, position, note, targets[]
target: id, position, weightKg, repsMin, repsMax
```

Сервер берёт имя упражнения из библиотеки и сохраняет snapshot; source/revision ID из чужого аккаунта запрещены. Позиции последовательные от 1, IDs дочерних строк уникальны. Draft мастера хранится клиентом; отдельная серверная сущность черновика пока не нужна. Проверенные technique guides публикуются отдельным административным процессом без публичного endpoint в MVP.

## Тренировки и команды

| Метод и путь                        | Вход / действие                                                                             | Результат                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GET `/workouts`                     | from, to, status, cursor                                                                    | краткие результаты/активные                                |
| GET `/workouts/active`              | —                                                                                           | активная или null                                          |
| POST `/workouts`                    | id, programRevisionId?, scheduledDate?, localDate, timezone, startedAt, snapshot/упражнения | start; snapshot сверяется с ревизией, ad hoc с библиотекой |
| GET `/workouts/{id}`                | —                                                                                           | текущая ревизия, план, факты, отдых, сводка и version      |
| POST `/workouts/{id}/commands`      | единая command envelope                                                                     | принятая команда, новая version и полный агрегат           |
| GET `/workouts/{id}/revisions`      | cursor                                                                                      | список исправлений с reason                                |
| GET `/workouts/{id}/revisions/{id}` | —                                                                                           | прежний результат для просмотра                            |

Команды active: `complete_set` (setId, actualWeightKg, actualReps, completedAt), `begin_set` (setId, startedAt), `undo_last_set` (setId), `correct_set` (setId, actualWeightKg, actualReps), `replace_active_exercises` (полный список, сохраняющий IDs уже выполненных подходов и отдыха), `finish_workout` (finishedAt, skipRemaining), `discard_workout`. Все требуют expectedVersion; replace не удаляет completed подходы, изменения таких фактов — correction. Добавленный во время тренировки план не переписывает программу.

Для completed: `correct_result` (reason, полный исправленный результат с approach/rest timestamp и позициями) создаёт следующую ревизию. Автоматической команды «переписать по новому плану» нет. Конкретные схемы command payload должны быть закрытым discriminated union в OpenAPI, не arbitrary JSON.

```json
{
  "commandId": "uuid",
  "deviceId": "uuid",
  "aggregateId": "uuid",
  "expectedVersion": 3,
  "type": "complete_set",
  "occurredAt": "2026-10-10T11:30:00Z",
  "payload": {
    "setId": "uuid",
    "actualWeightKg": "42.50",
    "actualReps": 10,
    "completedAt": "2026-10-10T11:30:00Z"
  }
}
```

Выше структурный пример, не seed данные. Начальный start использует expectedVersion=0, ID снимка и стабильные клиентские IDs подходов; сервер возвращает version=1. Один успешный command увеличивает version ровно на 1 даже при нескольких изменённых строках.

## Календарь, день и прогресс

| Метод и путь                   | Вход                                        | Результат                                                                                 |
| ------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| GET `/calendar`                | month YYYY-MM                               | days: date, plans, workoutSummaries, notePresent, photoCount, thumbnailPhotoIds; timezone |
| GET `/days/{date}`             | —                                           | планы, результаты, заметка и первая страница фото; ссылки через media endpoint            |
| PUT `/days/{date}/note`        | body, If-Match либо version=0 для новой     | запись заметки                                                                            |
| DELETE `/days/{date}/note`     | If-Match                                    | tombstone                                                                                 |
| GET `/progress/exercises`      | cursor                                      | упражнения с completed фактами                                                            |
| GET `/progress/exercises/{id}` | from, to, metric, bucket=session/week/month | points, units, summary, dataCount                                                         |

Метрики `maxWeight`, `completedSets`, `totalReps`, `volume`. Для bucket session точка — тренировка; week/month: maxWeight = максимум, остальные = сумма, интервал в timezone пользователя с явной подписью. Возвращаем период и правила агрегации. Summary содержит first/last/max и разницу, nullable процент. По каждой точке можно открыть IDs тренировок; большие списки через отдельный GET workouts с exerciseId и датами. Не смешиваем данные разных exerciseId.

## Фото, напоминания, синхронизация

| Метод и путь                      | Вход / действие                                                | Результат                                                           |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| POST `/photos/uploads`            | id, localDate, workoutId?, mimeType, sizeBytes, checksumSha256 | photoId, uploadUrl, requiredHeaders, expiresAt                      |
| POST `/photos/{id}/complete`      | expectedVersion, checksumSha256                                | 202 processing или текущий ready при повторе                        |
| GET `/photos`                     | date, cursor                                                   | metadata, status, ID; без постоянных storage URL                    |
| GET `/photos/{id}`                | —                                                              | metadata и version                                                  |
| POST `/photos/read-urls`          | до 50 собственных photoId, variant                             | временные ссылки ready файлов; CSRF, не кешировать                  |
| PATCH `/photos/{id}`              | localDate/position, If-Match                                   | перенос фото внутри дневника                                        |
| DELETE `/photos/{id}`             | If-Match                                                       | tombstone сразу, физическое удаление job                            |
| GET `/reminders`                  | —                                                              | enabled, localTime, timezone, version                               |
| PUT `/reminders`                  | настройка, If-Match                                            | сохранённое правило и перерасчёт                                    |
| GET `/push/config`                | —                                                              | VAPID publicKey, supported contract version                         |
| POST `/push/subscriptions`        | deviceId, endpoint, keys, expirationTime                       | подписка для текущего устройства                                    |
| DELETE `/push/subscriptions/{id}` | If-Match                                                       | отзыв; другие устройства остаются                                   |
| POST `/push/test`                 | subscriptionId                                                 | 202 deliveryId; rate limit 3/час, проверка только своего устройства |
| POST `/sync/bootstrap`            | Idempotency-Key                                                | snapshotId, watermark, expiresAt                                    |
| GET `/sync/bootstrap/{id}`        | cursor                                                         | часть согласованного снимка, nextCursor                             |
| GET `/sync/changes`               | cursor?, limit                                                 | changes, nextCursor, highWatermark, hasMore                         |
| POST `/sync/commands`             | commands[]                                                     | results[] в порядке отправки                                        |

Для bootstrap snapshot хранится 15 минут в приватном временном объекте, сборка одной repeatable-read транзакцией с ограничением размера; API возвращает 202 пока собирается, GET — состояние и затем страницы. Его watermark читается в том же снимке. Данные snapshot зашифрованы storage и удаляются job. Pending локальные записи клиент не заменяет этим архивом. `sync/changes` без cursor начинается с watermark последнего bootstrap, переданного клиентом в подписанном initialCursor ответа bootstrap.

Результат batch: `{commandId, status: applied|duplicate|conflict|rejected|dependency_failed, version?, aggregate?, error?}`. При отклонении не выполняем следующие зависимые команды того же агрегата, другие агрегаты могут продолжиться. Разрешены типы create_exercise, start_workout и тренировочные команды, put_day_note/delete_day_note; публикация программы и photo bytes не проходят sync batch. Фото загружается отдельным протоколом после восстановления сети.

Read URLs и upload reservation имеют rate limit по пользователю. Повтор reservation с тем же ключом возвращает ту же photo запись; истёкшую ссылку обновляет POST `/photos/{id}/upload-url` только для pending/failed с новой version и отдельным staging key. Failed обработку повторяет новый upload, не произвольное изменение ready объекта.

## Health и совместимость

`GET /api/health` остаётся liveness без приватных данных. Добавить `GET /api/ready`: 200 при доступной БД и совместимой версии схемы, иначе 503. Метрики доступны только внутренней сети, не публичным пользователям. Недоступность mail/storage/push отражается отдельно и не блокирует запись подходов в БД.

Машиночитаемый контракт — `docs/openapi.yaml` (EGO-18): схемы запросов, ответов, errors, nullable, limits, security и command union. `npm run api:generate` генерирует TypeScript DTO в `shared/api/schema.d.ts`; public API — `shared/api/index.ts`. DTO не заменяют доменные модели Go. `npm run api:check` валидирует контракт и актуальность генерации, `npm run api:compatibility -- <git-ref>` проверяет совместимость с предыдущим контрактом. CI сравнивает с base PR либо предыдущим push. Описание endpoint не означает его реализацию.

Уточнения EGO-18: seq/watermark передаются decimal-строками (bigint), версии ограничены безопасным целым JavaScript; `sync/changes` требует initialCursor из bootstrap, отсутствие — 422 bootstrap_required. Во всех изменяющих REST операциях используется ID команды для безопасного повтора, кроме auth challenge/logout и получения read URL; командные endpoints берут commandId из envelope. Маршрут прежней ревизии тренировки использует `{revisionId}` для однозначного имени параметра. Unknown fields запроса запрещены, клиент игнорирует неизвестные поля ответа. Полная форма и ограничения — в OpenAPI.

Добавления полей обратно совместимы; клиент игнорирует неизвестные поля. Ломающий контракт — новая API версия. Старые PWA могут открыться после недели офлайна: как минимум поддерживаем предыдущий выпущенный клиент в пределах окна 90 дней; более старый получает явную upgrade_required, локальная очередь сохраняется. Service worker не перезагружает страницу посреди тренировки. Миграции expand → совместимый код → перенос → contract после завершения окна поддержки.
