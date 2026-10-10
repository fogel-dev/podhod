# Порядок реализации принятого бэкенда

Уточнение текущего прохода: по новому запросу пользователя выполняются серверные EGO-23/24/25/26/29/30/31 по очереди; остальные задачи позже. EGO-22/EGO-8 остаются проверками выпуска, их отсутствие не блокирует локальную разработку доменного API. Интерфейс и офлайн-клиент сохраняются в родительских этапах и EGO-28. Результаты реализации — [backend-implementation.md](backend-implementation.md).

10 октября 2026. Архитектура EGO-9 принята пользователем. Linear — источник статусов; этот документ фиксирует порядок и ссылки, не автоматизирует переходы. Общие решения: [ADR-002](adr/002-backend.md), [данные](backend.md), [API](api.md), [деплой](deployment.md).

Следующая задача выбирается по зависимостям. По уточнению пользователя 10 октября 2026 выполняем по одной задаче: In Progress → проверки → коммит/push → Done → следующая задача, без промежуточного пользовательского ревью. При недоступности ресурсов фиксируем блокировку; зависимость не считаем выполненной без результата. Покупки и реальные проверки устройств требуют соответствующих ресурсов и участия пользователя.

| Порядок | Задача                                                                                                                                                                            | Этап                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1       | [EGO-18: Контракт API: OpenAPI и типы клиента](https://linear.app/egor-fogel/issue/EGO-18/kontrakt-api-openapi-i-tipy-klienta)                                                    | EGO-11                      |
| 2       | [EGO-19: PostgreSQL: миграции, роли и готовность API](https://linear.app/egor-fogel/issue/EGO-19/postgresql-migracii-roli-i-gotovnost-api)                                        | EGO-11                      |
| 3       | [EGO-20: Go worker: очередь PostgreSQL и безопасные повторы](https://linear.app/egor-fogel/issue/EGO-20/go-worker-ochered-postgresql-i-bezopasnye-povtory)                        | EGO-11                      |
| 4       | [EGO-21: Доступ: регистрация, пароль, сессии и изоляция аккаунтов](https://linear.app/egor-fogel/issue/EGO-21/dostup-registraciya-parol-sessii-i-izolyaciya-akkauntov)            | EGO-11                      |
| 5       | [EGO-22: Инфраструктура: бюджетный хостинг и HTTPS-окружение](https://linear.app/egor-fogel/issue/EGO-22/infrastruktura-byudzhetnyj-hosting-i-https-okruzhenie)                   | EGO-17                      |
| 6       | [EGO-8: PWA: проверить установку и Web Push на реальных устройствах](https://linear.app/egor-fogel/issue/EGO-8/pwa-proverit-ustanovku-i-web-push-na-realnyh-ustrojstvah)          | Ранняя техническая проверка |
| 7       | [EGO-23: Библиотека упражнений: API, архивирование и источники техники](https://linear.app/egor-fogel/issue/EGO-23/biblioteka-uprazhnenij-api-arhivirovanie-i-istochniki-tehniki) | EGO-12                      |
| 8       | [EGO-24: Программы: ревизии, недельный план и переносы](https://linear.app/egor-fogel/issue/EGO-24/programmy-revizii-nedelnyj-plan-i-perenosy)                                    | EGO-12                      |
| 9       | [EGO-25: Тренировки: снимок плана, подходы и интервалы отдыха](https://linear.app/egor-fogel/issue/EGO-25/trenirovki-snimok-plana-podhody-i-intervaly-otdyha)                     | EGO-13                      |
| 10      | [EGO-26: История: исправление результата без перезаписи ревизий](https://linear.app/egor-fogel/issue/EGO-26/istoriya-ispravlenie-rezultata-bez-perezapisi-revizij)                | EGO-13                      |
| 11      | [EGO-27: Синхронизация API: команды, bootstrap и журнал изменений](https://linear.app/egor-fogel/issue/EGO-27/sinhronizaciya-api-komandy-bootstrap-i-zhurnal-izmenenij)           | EGO-16                      |
| 12      | [EGO-28: Офлайн-клиент: IndexedDB, восстановление и конфликты](https://linear.app/egor-fogel/issue/EGO-28/oflajn-klient-indexeddb-vosstanovlenie-i-konflikty)                     | EGO-16                      |
| 13      | [EGO-29: Календарь и дневник: планы, результаты и заметки](https://linear.app/egor-fogel/issue/EGO-29/kalendar-i-dnevnik-plany-rezultaty-i-zametki)                               | EGO-14                      |
| 14      | [EGO-30: Приватные фотографии: загрузка, обработка и галерея](https://linear.app/egor-fogel/issue/EGO-30/privatnye-fotografii-zagruzka-obrabotka-i-galereya)                      | EGO-14                      |
| 15      | [EGO-31: Прогресс: фактические метрики и графики](https://linear.app/egor-fogel/issue/EGO-31/progress-fakticheskie-metriki-i-grafiki)                                             | EGO-15                      |
| 16      | [EGO-32: Напоминания: Web Push, timezone и настройки](https://linear.app/egor-fogel/issue/EGO-32/napominaniya-web-push-timezone-i-nastrojki)                                      | EGO-16                      |
| 17      | [EGO-33: Данные пользователя: экспорт и удаление аккаунта](https://linear.app/egor-fogel/issue/EGO-33/dannye-polzovatelya-eksport-i-udalenie-akkaunta)                            | EGO-17                      |
| 18      | [EGO-34: Эксплуатация: backup/restore, выпуск и наблюдение](https://linear.app/egor-fogel/issue/EGO-34/ekspluataciya-backuprestore-vypusk-i-nablyudenie)                          | EGO-17                      |

EGO-11–EGO-17 остаются этапами, конкретные задачи вложены в них. EGO-22 выполняется рано, хотя относится к инфраструктуре выпуска; финальная приёмка EGO-17 проводится после всего списка. Дневник может следовать за EGO-28, не ожидая завершения всего EGO-16: production напоминания EGO-32 идут позднее.

Каждая задача содержит свой объём, критерии приёмки и зависимости в Linear. Продуктовые этапы включают подключённый к API интерфейс и проверку обеих тем, доступности и переходов. Завершение серверной части само по себе не закрывает пользовательский сценарий. Покупка хостинга, домена и сервисов требует выбора конкретного предложения; данный план не является заказом ресурсов.

Уточнение доступа: [ADR-003](adr/003-authentication.md). Регистрация с почтой, логином и паролем без рассылки входит в EGO-21. Telegram/Яндекс/VK — будущий этап Backlog, не часть текущего прохода MVP и не блокируют парольный вход. Задачи внешних интеграций включаются в порядок отдельно после основного этапа.

- [EGO-35: Telegram-бот](https://linear.app/egor-fogel/issue/EGO-35/dostup-vhod-i-privyazka-cherez-telegram-bota).
- [EGO-36: Яндекс ID](https://linear.app/egor-fogel/issue/EGO-36/dostup-vhod-i-privyazka-cherez-yandeks-id).
- [EGO-37: VK ID](https://linear.app/egor-fogel/issue/EGO-37/dostup-vhod-i-privyazka-cherez-vk-id).
