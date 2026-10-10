// Generated from docs/openapi.yaml. Run npm run api:generate; do not edit.
export interface paths {
  '/api/v1/auth/session': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getSession
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getSession'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/logout': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * logout
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['logout'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/me': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getMe
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getMe'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * updateMe
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    patch: operations['updateMe'];
    trace?: never;
  };
  '/api/v1/me/devices': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listDevices
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listDevices'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/me/devices/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * revokeDevice
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    delete: operations['revokeDevice'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/me/exports': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * createExport
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['createExport'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/me/exports/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getExport
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getExport'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/me/deletion/request': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * requestAccountDeletion
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['requestAccountDeletion'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/me/deletion/confirm': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * confirmAccountDeletion
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['confirmAccountDeletion'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/exercises': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listExercises
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listExercises'];
    put?: never;
    /**
     * createExercise
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['createExercise'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/exercises/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getExercise
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getExercise'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * updateExercise
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    patch: operations['updateExercise'];
    trace?: never;
  };
  '/api/v1/programs': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listPrograms
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listPrograms'];
    put?: never;
    /**
     * createProgram
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['createProgram'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/programs/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getProgram
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getProgram'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/programs/{id}/revisions/{revisionId}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getProgramRevision
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getProgramRevision'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/programs/{id}/revisions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * publishProgramRevision
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['publishProgramRevision'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/programs/{id}/copy-day': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * copyProgramDay
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['copyProgramDay'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/programs/{id}/archive': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * archiveProgram
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['archiveProgram'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/programs/{id}/exceptions/{sourceDate}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /**
     * putScheduleException
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    put: operations['putScheduleException'];
    post?: never;
    /**
     * deleteScheduleException
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    delete: operations['deleteScheduleException'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/workouts': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listWorkouts
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listWorkouts'];
    put?: never;
    /**
     * startWorkout
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['startWorkout'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/workouts/active': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getActiveWorkout
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getActiveWorkout'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/workouts/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getWorkout
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getWorkout'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/workouts/{id}/commands': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * commandWorkout
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['commandWorkout'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/workouts/{id}/revisions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listWorkoutRevisions
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listWorkoutRevisions'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/workouts/{id}/revisions/{revisionId}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getWorkoutRevision
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getWorkoutRevision'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/calendar': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getCalendar
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getCalendar'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/days/{date}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getDay
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getDay'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/days/{date}/note': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /**
     * putDayNote
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    put: operations['putDayNote'];
    post?: never;
    /**
     * deleteDayNote
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    delete: operations['deleteDayNote'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/progress/exercises': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listProgressExercises
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listProgressExercises'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/progress/exercises/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getExerciseProgress
     * @description Период <= 5 лет, <= 500 агрегированных точек; только current completed revisions. Bucket: maxWeight=max, остальные=sum.
     */
    get: operations['getExerciseProgress'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos/uploads': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * reservePhotoUpload
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['reservePhotoUpload'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos/{id}/upload-url': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * renewPhotoUpload
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['renewPhotoUpload'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos/{id}/complete': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * completePhotoUpload
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['completePhotoUpload'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * listPhotos
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['listPhotos'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getPhoto
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getPhoto'];
    put?: never;
    post?: never;
    /**
     * deletePhoto
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    delete: operations['deletePhoto'];
    options?: never;
    head?: never;
    /**
     * updatePhoto
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    patch: operations['updatePhoto'];
    trace?: never;
  };
  '/api/v1/photos/read-urls': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * getPhotoReadUrls
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['getPhotoReadUrls'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/reminders': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getReminders
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getReminders'];
    /**
     * putReminders
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    put: operations['putReminders'];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/push/config': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getPushConfig
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getPushConfig'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/push/subscriptions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * subscribePush
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['subscribePush'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/push/subscriptions/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * unsubscribePush
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    delete: operations['unsubscribePush'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/push/test': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * testPush
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['testPush'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/sync/bootstrap': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * createBootstrap
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['createBootstrap'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/sync/bootstrap/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getBootstrapPage
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['getBootstrapPage'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/sync/changes': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getChanges
     * @description Нужен initialCursor из bootstrap или предыдущий nextCursor. Отсутствие cursor: 422 bootstrap_required. Повтор страницы безопасен по entityVersion.
     */
    get: operations['getChanges'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/sync/commands': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * syncCommands
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['syncCommands'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * health
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['health'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/ready': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * ready
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    get: operations['ready'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/register': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Регистрация без отправки писем
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['register'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/login': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Вход по логину и паролю
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['login'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/password/change': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Смена пароля с отзывом остальных сессий
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    post: operations['changePassword'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos/{id}/content': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /**
     * Загрузить исходные байты фотографии
     * @description Приватный filesystem adapter ADR-004. Сессия владельца и подписанная capability обязательны. Cache-Control: no-store. Ключи хранилища не передаются клиенту.
     */
    put: operations['uploadPhotoContent'];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/photos/{id}/content/{variant}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Прочитать готовую фотографию или миниатюру
     * @description Приватный filesystem adapter ADR-004. Сессия владельца и подписанная capability обязательны. Cache-Control: no-store. Ключи хранилища не передаются клиенту.
     */
    get: operations['readPhotoContent'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/days/{date}/notes/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /**
     * Сохранить отдельную заметку
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    put: operations['putDayNoteById'];
    post?: never;
    /**
     * Удалить отдельную заметку
     * @description Правила в docs/api.md и docs/backend.md. Неизвестные поля запроса отклоняются, поля ответа клиент игнорирует.
     */
    delete: operations['deleteDayNoteById'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/days/{date}/body-weight': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /**
     * Записать вес тела на текущий день
     * @description Одна приватная запись на день. Изменение разрешено только на текущую дату в часовом поясе пользователя. If-Match 0 создаёт запись, текущая версия обновляет её. Прошлые и будущие даты отклоняются.
     */
    put: operations['putBodyWeight'];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/body-weight': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * История веса тела
     * @description Приватная история пользователя по возрастанию даты. Диапазон не больше 366 дней включительно.
     */
    get: operations['getBodyWeightHistory'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    User: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      /** Format: email */
      email: string | null;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      locale: string;
      login: string;
      emailVerified: boolean;
    };
    Device: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      label: string;
      /** Format: date-time */
      lastSeenAt: string;
      /** Format: date-time */
      revokedAt: string | null;
    };
    DevicePage: {
      items: components['schemas']['Device'][];
      nextCursor: string | null;
    };
    Challenge: {
      /** Format: uuid */
      flowId: string;
      /** Format: date-time */
      expiresAt: string;
    };
    Session: {
      user: components['schemas']['User'];
      /** Format: uuid */
      deviceId: string;
      /** Format: date-time */
      expiresAt: string;
      csrfToken: string;
    };
    UserPatch: {
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone?: string;
      /** @enum {string} */
      locale?: 'ru';
    };
    DeleteConfirm: {
      /** Format: uuid */
      flowId: string;
    };
    Export: {
      /** Format: uuid */
      id: string;
      /** @enum {string} */
      status: 'queued' | 'ready' | 'failed';
      /** Format: date-time */
      expiresAt: string | null;
      /** Format: uri */
      downloadUrl: string | null;
    };
    ExportAccepted: {
      /** Format: uuid */
      exportId: string;
      /** Format: uri */
      statusUrl: string;
    };
    DeleteAccepted: {
      /** @enum {string} */
      status: 'deleting';
    };
    TechniqueGuide: {
      body: string;
      sourceTitle: string;
      /** Format: uri */
      sourceUrl: string;
      /** Format: date-time */
      reviewedAt: string;
      /** Format: date-time */
      sourceAccessedAt: string;
    };
    Exercise: {
      /** @description Только автор может изменять и архивировать упражнение. */
      canEdit: boolean;
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      name: string;
      note: string;
      /** Format: date-time */
      archivedAt: string | null;
      techniqueGuide: components['schemas']['TechniqueGuide'] | null;
    };
    ExercisePage: {
      items: components['schemas']['Exercise'][];
      nextCursor: string | null;
    };
    CreateExercise: {
      /** Format: uuid */
      id: string;
      name: string;
      note?: string;
    };
    ExercisePatch: {
      name?: string;
      note?: string;
      archived?: boolean;
    };
    Target: {
      /** Format: uuid */
      id: string;
      position: number;
      /** @description Килограммы, decimal с двумя знаками; от 0.00 до 99999.99. */
      weightKg: string | null;
      repsMin: number;
      repsMax: number;
    };
    PlanExerciseInput: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      exerciseId: string;
      position: number;
      note: string;
      targets: components['schemas']['Target'][];
    };
    PlanExercise: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      exerciseId: string;
      position: number;
      note: string;
      targets: components['schemas']['Target'][];
      nameSnapshot: string;
    };
    ProgramDayInput: {
      weekday: number;
      exercises: components['schemas']['PlanExerciseInput'][];
    };
    ProgramDay: {
      weekday: number;
      exercises: components['schemas']['PlanExercise'][];
    };
    ProgramRevisionInput: {
      /** Format: date */
      startDate: string;
      /** Format: date */
      endDate: string;
      /** Format: date */
      effectiveFrom: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      days: components['schemas']['ProgramDayInput'][];
    };
    ProgramRevision: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      programId: string;
      revisionNo: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date */
      startDate: string;
      /** Format: date */
      endDate: string;
      /** Format: date */
      effectiveFrom: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      days: components['schemas']['ProgramDay'][];
    };
    ScheduleException: {
      /** Format: date */
      sourceDate: string;
      /** @enum {string} */
      action: 'cancel' | 'move';
      /** Format: date */
      targetDate: string | null;
    };
    Program: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      name: string;
      currentRevision: components['schemas']['ProgramRevision'];
      /** Format: date-time */
      archivedAt: string | null;
      /** Format: date */
      archivedFrom: string | null;
      exceptions: components['schemas']['ScheduleException'][];
    };
    ProgramPage: {
      items: components['schemas']['Program'][];
      nextCursor: string | null;
    };
    CreateProgram: {
      /** Format: uuid */
      id: string;
      name: string;
      revision: components['schemas']['ProgramRevisionInput'];
    };
    PublishRevision: {
      expectedVersion: number;
      revision: components['schemas']['ProgramRevisionInput'];
    };
    CopyDay: {
      expectedVersion: number;
      /** Format: date */
      effectiveFrom: string;
      sourceWeekday: number;
      targetWeekdays: number[];
      replaceExisting: boolean;
    };
    ArchiveProgram: {
      expectedVersion: number;
      /** Format: date */
      effectiveFrom: string;
    };
    MoveException: {
      expectedVersion: number;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      action: 'move';
      /** Format: date */
      targetDate: string;
    };
    CancelException: {
      expectedVersion: number;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      action: 'cancel';
    };
    PutException:
      | components['schemas']['MoveException']
      | components['schemas']['CancelException'];
    WorkoutSet: {
      /** Format: uuid */
      id: string;
      position: number;
      /** @description Килограммы, decimal с двумя знаками; от 0.00 до 99999.99. */
      plannedWeightKg: string | null;
      plannedRepsMin: number | null;
      plannedRepsMax: number | null;
      /** @enum {string} */
      status: 'pending' | 'completed' | 'skipped';
      /** @description Килограммы, decimal с двумя знаками; от 0.00 до 99999.99. */
      actualWeightKg: string | null;
      actualReps: number | null;
      /** Format: date-time */
      startedAt: string | null;
      /** Format: date-time */
      completedAt: string | null;
    };
    WorkoutExercise: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      exerciseId: string;
      position: number;
      nameSnapshot: string;
      note: string;
      techniqueSnapshot: components['schemas']['TechniqueGuide'] | null;
      sets: components['schemas']['WorkoutSet'][];
    };
    RestInterval: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      afterSetId: string;
      /** Format: date-time */
      startedAt: string;
      /** Format: date-time */
      endedAt: string | null;
      /** @enum {string|null} */
      endReason: 'next_set' | 'finish' | 'correction' | null;
    };
    WorkoutRevision: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      workoutId: string;
      revisionNo: number;
      reason: string | null;
      /** Format: date-time */
      createdAt: string;
      exercises: components['schemas']['WorkoutExercise'][];
      restIntervals: components['schemas']['RestInterval'][];
    };
    WorkoutSummary: {
      durationSeconds: number;
      completedSets: number;
      totalReps: number;
      volume: string;
      totalRestSeconds: number;
      meanBetweenSetRestSeconds: number | null;
    };
    Workout: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      /** Format: uuid */
      programId: string | null;
      /** Format: uuid */
      programRevisionId: string | null;
      /** Format: date */
      scheduledDate: string | null;
      /** Format: date */
      localDate: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      /** @enum {string} */
      status: 'active' | 'completed' | 'discarded';
      /** Format: date-time */
      startedAt: string;
      /** Format: date-time */
      finishedAt: string | null;
      currentRevision: components['schemas']['WorkoutRevision'];
      summary: components['schemas']['WorkoutSummary'];
    };
    WorkoutPage: {
      items: components['schemas']['Workout'][];
      nextCursor: string | null;
    };
    WorkoutRevisionPage: {
      items: components['schemas']['WorkoutRevision'][];
      nextCursor: string | null;
    };
    StartWorkout: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      programRevisionId: string | null;
      /** Format: date */
      scheduledDate: string | null;
      /** Format: date */
      localDate: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      /** Format: date-time */
      startedAt: string;
      exercises: components['schemas']['PlanExerciseInput'][];
    };
    CompleteSetPayload: {
      /** Format: uuid */
      setId: string;
      /** @description Килограммы, decimal с двумя знаками; от 0.00 до 99999.99. */
      actualWeightKg: string;
      actualReps: number;
      /** Format: date-time */
      completedAt: string;
    };
    BeginSetPayload: {
      /** Format: uuid */
      setId: string;
      /** Format: date-time */
      startedAt: string;
    };
    UndoSetPayload: {
      /** Format: uuid */
      setId: string;
    };
    CorrectSetPayload: {
      /** Format: uuid */
      setId: string;
      /** @description Килограммы, decimal с двумя знаками; от 0.00 до 99999.99. */
      actualWeightKg: string;
      actualReps: number;
    };
    ReplaceExercisesPayload: {
      exercises: components['schemas']['WorkoutExercise'][];
    };
    FinishPayload: {
      /** Format: date-time */
      finishedAt: string;
      skipRemaining: boolean;
    };
    DiscardPayload: Record<string, never>;
    CorrectResultPayload: {
      reason: string;
      /** Format: date-time */
      startedAt: string;
      /** Format: date-time */
      finishedAt: string;
      exercises: components['schemas']['WorkoutExercise'][];
      restIntervals: components['schemas']['RestInterval'][];
    };
    NoteInput: {
      body: string;
    };
    DayNote: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      /** Format: date */
      localDate: string;
      body: string;
    };
    CompleteSetCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'complete_set';
      payload: components['schemas']['CompleteSetPayload'];
    };
    BeginSetCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'begin_set';
      payload: components['schemas']['BeginSetPayload'];
    };
    UndoLastSetCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'undo_last_set';
      payload: components['schemas']['UndoSetPayload'];
    };
    CorrectSetCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'correct_set';
      payload: components['schemas']['CorrectSetPayload'];
    };
    ReplaceActiveExercisesCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'replace_active_exercises';
      payload: components['schemas']['ReplaceExercisesPayload'];
    };
    FinishWorkoutCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'finish_workout';
      payload: components['schemas']['FinishPayload'];
    };
    DiscardWorkoutCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'discard_workout';
      payload: components['schemas']['DiscardPayload'];
    };
    CorrectResultCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'correct_result';
      payload: components['schemas']['CorrectResultPayload'];
    };
    CreateExerciseCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      /** @enum {integer} */
      expectedVersion: 0;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'create_exercise';
      payload: components['schemas']['CreateExercise'];
    };
    StartWorkoutCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      /** @enum {integer} */
      expectedVersion: 0;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'start_workout';
      payload: components['schemas']['StartWorkout'];
    };
    PutDayNoteCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'put_day_note';
      payload: components['schemas']['NoteInput'];
    };
    DeleteDayNoteCommand: {
      /** Format: uuid */
      commandId: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: uuid */
      aggregateId: string;
      expectedVersion: number;
      /** Format: date-time */
      occurredAt: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: 'delete_day_note';
      payload: components['schemas']['DiscardPayload'];
    };
    WorkoutCommand:
      | components['schemas']['CompleteSetCommand']
      | components['schemas']['BeginSetCommand']
      | components['schemas']['UndoLastSetCommand']
      | components['schemas']['CorrectSetCommand']
      | components['schemas']['ReplaceActiveExercisesCommand']
      | components['schemas']['FinishWorkoutCommand']
      | components['schemas']['DiscardWorkoutCommand']
      | components['schemas']['CorrectResultCommand'];
    SyncCommand:
      | components['schemas']['CompleteSetCommand']
      | components['schemas']['BeginSetCommand']
      | components['schemas']['UndoLastSetCommand']
      | components['schemas']['CorrectSetCommand']
      | components['schemas']['ReplaceActiveExercisesCommand']
      | components['schemas']['FinishWorkoutCommand']
      | components['schemas']['DiscardWorkoutCommand']
      | components['schemas']['CorrectResultCommand']
      | components['schemas']['CreateExerciseCommand']
      | components['schemas']['StartWorkoutCommand']
      | components['schemas']['PutDayNoteCommand']
      | components['schemas']['DeleteDayNoteCommand'];
    Aggregate:
      | components['schemas']['User']
      | components['schemas']['Device']
      | components['schemas']['Exercise']
      | components['schemas']['Program']
      | components['schemas']['Workout']
      | components['schemas']['DayNote']
      | components['schemas']['Photo']
      | components['schemas']['ReminderRule']
      | components['schemas']['PushSubscription'];
    ApiError: {
      code: string;
      message: string;
      /** Format: uuid */
      requestId: string;
      details?: {
        currentVersion?: number;
        /** Format: uuid */
        aggregateId?: string;
        serverAggregate?: components['schemas']['Aggregate'];
        fieldErrors?: {
          path: string;
          code: string;
        }[];
      };
    };
    ErrorEnvelope: {
      error: components['schemas']['ApiError'];
    };
    CommandResult: {
      /** Format: uuid */
      commandId: string;
      /** @enum {string} */
      status:
        'applied' | 'duplicate' | 'conflict' | 'rejected' | 'dependency_failed';
      version?: number;
      aggregate?: components['schemas']['Aggregate'];
      error?: components['schemas']['ApiError'];
    };
    SyncBatch: {
      commands: components['schemas']['SyncCommand'][];
    };
    SyncBatchResult: {
      results: components['schemas']['CommandResult'][];
    };
    PlanOccurrence: {
      /** Format: uuid */
      programId: string;
      /** Format: uuid */
      programRevisionId: string;
      /** Format: date */
      sourceDate: string;
      /** Format: date */
      date: string;
      /** @enum {string} */
      status:
        'planned' | 'missed' | 'cancelled' | 'moved' | 'started' | 'completed';
    };
    CalendarDay: {
      /** Format: date */
      date: string;
      plans: components['schemas']['PlanOccurrence'][];
      workoutSummaries: components['schemas']['Workout'][];
      notePresent: boolean;
      photoCount: number;
      thumbnailPhotoIds: string[];
    };
    Calendar: {
      month: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      days: components['schemas']['CalendarDay'][];
    };
    Day: {
      /** Format: date */
      date: string;
      plans: components['schemas']['PlanOccurrence'][];
      workouts: components['schemas']['Workout'][];
      note: components['schemas']['DayNote'] | null;
      photos: components['schemas']['PhotoPage'];
      notes: components['schemas']['DayNote'][];
      bodyWeight: components['schemas']['BodyWeight'] | null;
    };
    ProgressPoint: {
      /** Format: date */
      from: string;
      /** Format: date */
      to: string;
      workoutIds: string[];
      value: string;
    };
    ProgressSummary: {
      first: string | null;
      last: string | null;
      max: string | null;
      difference: string | null;
      percentChange: string | null;
    };
    Progress: {
      /** Format: uuid */
      exerciseId: string;
      /** Format: date */
      from: string;
      /** Format: date */
      to: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
      /** @enum {string} */
      metric: 'maxWeight' | 'completedSets' | 'totalReps' | 'volume';
      /** @enum {string} */
      bucket: 'session' | 'week' | 'month';
      /** @enum {string} */
      units: 'kg' | 'sets' | 'reps' | 'kg_reps';
      /** @enum {string} */
      aggregation: 'max' | 'sum';
      points: components['schemas']['ProgressPoint'][];
      summary: components['schemas']['ProgressSummary'];
      dataCount: number;
    };
    Photo: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      /** Format: date */
      localDate: string;
      /** Format: uuid */
      workoutId: string | null;
      /** @enum {string} */
      status: 'pending' | 'processing' | 'ready' | 'failed' | 'deleting';
      sizeBytes: number;
      width: number | null;
      height: number | null;
      position: number;
      errorCode: string | null;
    };
    PhotoPage: {
      items: components['schemas']['Photo'][];
      nextCursor: string | null;
    };
    PhotoUploadInput: {
      /** Format: uuid */
      id: string;
      /** Format: date */
      localDate: string;
      /** Format: uuid */
      workoutId?: string | null;
      /** @enum {string} */
      mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
      sizeBytes: number;
      /** @description SHA-256 hex lowercase; upload adapter формирует checksum header провайдера. */
      checksumSha256: string;
    };
    PhotoUpload: {
      /** Format: uuid */
      photoId: string;
      version: number;
      /** Format: uri */
      uploadUrl: string;
      requiredHeaders: {
        [key: string]: string;
      };
      /** Format: date-time */
      expiresAt: string;
    };
    PhotoComplete: {
      expectedVersion: number;
      /** @description SHA-256 hex lowercase; upload adapter формирует checksum header провайдера. */
      checksumSha256: string;
    };
    PhotoPatch: {
      /** Format: date */
      localDate?: string;
      position?: number;
    };
    PhotoReadInput: {
      photoIds: string[];
      /** @enum {string} */
      variant: 'image' | 'thumbnail';
    };
    PhotoReadUrls: {
      items: {
        /** Format: uuid */
        photoId: string;
        /** Format: uri */
        url: string;
        /** Format: date-time */
        expiresAt: string;
      }[];
    };
    ReminderRule: {
      version: number;
      enabled: boolean;
      localTime: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
    };
    ReminderInput: {
      enabled: boolean;
      localTime: string;
      /** @description IANA timezone; сервер проверяет существование в tzdata. */
      timezone: string;
    };
    PushConfig: {
      publicKey: string;
      contractVersion: string;
    };
    PushSubscription: {
      /** Format: uuid */
      id: string;
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      /** Format: uuid */
      deviceId: string;
      /** Format: date-time */
      expiresAt: string | null;
      /** Format: date-time */
      disabledAt: string | null;
    };
    PushSubscribe: {
      /** Format: uuid */
      deviceId: string;
      /** Format: uri */
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
      /** Format: date-time */
      expirationTime: string | null;
    };
    PushTest: {
      /** Format: uuid */
      subscriptionId: string;
    };
    PushTestAccepted: {
      /** Format: uuid */
      deliveryId: string;
    };
    Bootstrap: {
      /** Format: uuid */
      snapshotId: string;
      /** @enum {string} */
      status: 'queued' | 'ready' | 'failed';
      /** @description bigint строкой без потери точности JavaScript. */
      watermark: string | null;
      initialCursor: string | null;
      /** Format: date-time */
      expiresAt: string;
    };
    BootstrapPage: {
      snapshot: components['schemas']['Bootstrap'];
      items: components['schemas']['Aggregate'][];
      nextCursor: string | null;
    };
    UserChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'user';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['User'];
    };
    DeviceChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'device';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['Device'];
    };
    ExerciseChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'exercise';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['Exercise'];
    };
    ProgramChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'program';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['Program'];
    };
    WorkoutChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'workout';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['Workout'];
    };
    DayNoteChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'day_note';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['DayNote'];
    };
    PhotoChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'photo';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['Photo'];
    };
    ReminderRuleChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'reminder';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['ReminderRule'];
    };
    PushSubscriptionChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType: 'push_subscription';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'upsert';
      entityVersion: number;
      aggregate: components['schemas']['PushSubscription'];
    };
    DeleteChange: {
      /** @description bigint строкой без потери точности JavaScript. */
      seq: string;
      /** @enum {string} */
      entityType:
        | 'user'
        | 'device'
        | 'exercise'
        | 'program'
        | 'workout'
        | 'day_note'
        | 'photo'
        | 'reminder'
        | 'push_subscription';
      /** Format: uuid */
      entityId: string;
      /** @enum {string} */
      operation: 'delete';
      entityVersion: number;
    };
    Change:
      | components['schemas']['UserChange']
      | components['schemas']['DeviceChange']
      | components['schemas']['ExerciseChange']
      | components['schemas']['ProgramChange']
      | components['schemas']['WorkoutChange']
      | components['schemas']['DayNoteChange']
      | components['schemas']['PhotoChange']
      | components['schemas']['ReminderRuleChange']
      | components['schemas']['PushSubscriptionChange']
      | components['schemas']['DeleteChange'];
    Changes: {
      changes: components['schemas']['Change'][];
      nextCursor: string;
      /** @description bigint строкой без потери точности JavaScript. */
      highWatermark: string;
      hasMore: boolean;
    };
    Health: {
      /** @enum {string} */
      status: 'ok';
    };
    PasswordRegister: {
      /** Format: email */
      email: string;
      login: string;
      password: string;
      passwordConfirmation: string;
      deviceLabel: string;
    };
    PasswordLogin: {
      login: string;
      password: string;
      deviceLabel: string;
    };
    PasswordChange: {
      currentPassword: string;
      password: string;
      passwordConfirmation: string;
    };
    BodyWeight: {
      /** Format: date */
      localDate: string;
      weightKg: string;
      /** Format: int64 */
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
    };
    BodyWeightInput: {
      /** @description Вес в кг, больше 0 и не больше 500 */
      weightKg: string;
    };
    BodyWeightHistory: {
      items: components['schemas']['BodyWeight'][];
    };
  };
  responses: {
    /** @description Некорректный JSON/структура */
    Error400: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Нужен вход */
    Error401: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description CSRF или действие запрещено */
    Error403: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Запись не найдена или чужая */
    Error404: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Конфликт версии/ID/доменных правил */
    Error409: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Срок snapshot/cursor истёк */
    Error410: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Превышен размер */
    Error413: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Недопустимые значения */
    Error422: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Требуется версия */
    Error428: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Лимит запросов */
    Error429: {
      headers: {
        /** @description Секунды до повтора */
        'Retry-After'?: number;
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Внутренняя ошибка */
    Error500: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Сервис временно недоступен */
    Error503: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Неподдерживаемый тип содержимого */
    Error415: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
  };
  parameters: {
    /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
    IdempotencyKey: string;
    /** @description ID устройства из текущей сессии, не средство авторизации. */
    DeviceId: string;
    /** @description Version в кавычках; "0" только для новой заметки/правила. */
    IfMatch: string;
    /** @description Токен текущей сессии. Также обязательна проверка Origin. */
    Csrf: string;
    Limit: number;
    Cursor: string;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  getSession: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Session'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  logout: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getMe: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['User'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  updateMe: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['UserPatch'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['User'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      415: components['responses']['Error415'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listDevices: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['DevicePage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  revokeDevice: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  createExport: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Принято; фоновая операция продолжается */
      202: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ExportAccepted'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getExport: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Export'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  requestAccountDeletion: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Принято; фоновая операция продолжается */
      202: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Challenge'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  confirmAccountDeletion: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['DeleteConfirm'];
      };
    };
    responses: {
      /** @description Принято; фоновая операция продолжается */
      202: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['DeleteAccepted'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listExercises: {
    parameters: {
      query?: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
        q?: string;
        includeArchived?: boolean;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ExercisePage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  createExercise: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateExercise'];
      };
    };
    responses: {
      /** @description Создано */
      201: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Exercise'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getExercise: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Exercise'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  updateExercise: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ExercisePatch'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Exercise'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listPrograms: {
    parameters: {
      query?: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
        includeArchived?: boolean;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ProgramPage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  createProgram: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateProgram'];
      };
    };
    responses: {
      /** @description Создано */
      201: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Program'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getProgram: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Program'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getProgramRevision: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        revisionId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ProgramRevision'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  publishProgramRevision: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PublishRevision'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Program'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  copyProgramDay: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CopyDay'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Program'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  archiveProgram: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ArchiveProgram'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Program'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  putScheduleException: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
        sourceDate: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PutException'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Program'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  deleteScheduleException: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
        sourceDate: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listWorkouts: {
    parameters: {
      query: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
        from: string;
        to: string;
        status?: 'active' | 'completed' | 'discarded';
        exerciseId?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['WorkoutPage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  startWorkout: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['StartWorkout'];
      };
    };
    responses: {
      /** @description Создано */
      201: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Workout'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getActiveWorkout: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Workout'] | null;
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getWorkout: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Workout'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  commandWorkout: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['WorkoutCommand'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CommandResult'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listWorkoutRevisions: {
    parameters: {
      query?: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['WorkoutRevisionPage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getWorkoutRevision: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        revisionId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['WorkoutRevision'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getCalendar: {
    parameters: {
      query: {
        month: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Calendar'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getDay: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        date: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Day'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  putDayNote: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        date: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['NoteInput'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['DayNote'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  deleteDayNote: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        date: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listProgressExercises: {
    parameters: {
      query?: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ExercisePage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getExerciseProgress: {
    parameters: {
      query: {
        from: string;
        to: string;
        metric: 'maxWeight' | 'completedSets' | 'totalReps' | 'volume';
        bucket?: 'session' | 'week' | 'month';
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Progress'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  reservePhotoUpload: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PhotoUploadInput'];
      };
    };
    responses: {
      /** @description Создано */
      201: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PhotoUpload'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  renewPhotoUpload: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PhotoComplete'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PhotoUpload'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  completePhotoUpload: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PhotoComplete'];
      };
    };
    responses: {
      /** @description Принято; фоновая операция продолжается */
      202: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Photo'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  listPhotos: {
    parameters: {
      query: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
        date: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PhotoPage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getPhoto: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Photo'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  deletePhoto: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  updatePhoto: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PhotoPatch'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Photo'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getPhotoReadUrls: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PhotoReadInput'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PhotoReadUrls'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getReminders: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ReminderRule'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  putReminders: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ReminderInput'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ReminderRule'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getPushConfig: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PushConfig'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  subscribePush: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PushSubscribe'];
      };
    };
    responses: {
      /** @description Создано */
      201: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PushSubscription'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  unsubscribePush: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  testPush: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PushTest'];
      };
    };
    responses: {
      /** @description Принято; фоновая операция продолжается */
      202: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PushTestAccepted'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  createBootstrap: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Принято; фоновая операция продолжается */
      202: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Bootstrap'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getBootstrapPage: {
    parameters: {
      query?: {
        limit?: components['parameters']['Limit'];
        cursor?: components['parameters']['Cursor'];
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BootstrapPage'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      410: components['responses']['Error410'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getChanges: {
    parameters: {
      query?: {
        cursor?: components['parameters']['Cursor'];
        limit?: components['parameters']['Limit'];
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Changes'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      410: components['responses']['Error410'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  syncCommands: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['SyncBatch'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['SyncBatchResult'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  health: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Health'];
        };
      };
      400: components['responses']['Error400'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  ready: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Health'];
        };
      };
      400: components['responses']['Error400'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  register: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PasswordRegister'];
      };
    };
    responses: {
      /** @description Успешно */
      201: {
        headers: {
          /** @description __Host-podhod_session; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000 */
          'Set-Cookie'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Session'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      415: components['responses']['Error415'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  login: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PasswordLogin'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description __Host-podhod_session; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000 */
          'Set-Cookie'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Session'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      415: components['responses']['Error415'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  changePassword: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PasswordChange'];
      };
    };
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      415: components['responses']['Error415'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  uploadPhotoContent: {
    parameters: {
      query: {
        /** @description Подписанная capability с TTL; требуется активная сессия владельца. URL не журналировать. */
        token: string;
      };
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'image/jpeg': string;
        'image/png': string;
        'image/webp': string;
      };
    };
    responses: {
      /** @description Загрузка сохранена; далее complete */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      /** @description Неверный MIME */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorEnvelope'];
        };
      };
      422: components['responses']['Error422'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  readPhotoContent: {
    parameters: {
      query: {
        /** @description Подписанная capability с TTL; требуется активная сессия владельца. URL не журналировать. */
        token: string;
      };
      header?: never;
      path: {
        id: string;
        variant: 'image' | 'thumbnail';
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Приватный JPEG без EXIF/GPS */
      200: {
        headers: {
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'image/jpeg': string;
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      /** @description Неверный MIME */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorEnvelope'];
        };
      };
      422: components['responses']['Error422'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  putDayNoteById: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        date: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['NoteInput'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['DayNote'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  deleteDayNoteById: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        date: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  putBodyWeight: {
    parameters: {
      query?: never;
      header: {
        /** @description Токен текущей сессии. Также обязательна проверка Origin. */
        'X-CSRF-Token': components['parameters']['Csrf'];
        /** @description Version в кавычках; "0" только для новой заметки/правила. */
        'If-Match': components['parameters']['IfMatch'];
        /** @description ID команды; одинаковый ID+payload возвращает первоначальный результат. */
        'Idempotency-Key': components['parameters']['IdempotencyKey'];
        /** @description ID устройства из текущей сессии, не средство авторизации. */
        'X-Device-Id': components['parameters']['DeviceId'];
      };
      path: {
        date: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['BodyWeightInput'];
      };
    };
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          /** @description Текущая версия */
          ETag?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BodyWeight'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      428: components['responses']['Error428'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
  getBodyWeightHistory: {
    parameters: {
      query: {
        from: string;
        to: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Успешно */
      200: {
        headers: {
          /** @description Приватный ответ не кешируется */
          'Cache-Control'?: 'no-store';
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BodyWeightHistory'];
        };
      };
      400: components['responses']['Error400'];
      401: components['responses']['Error401'];
      403: components['responses']['Error403'];
      404: components['responses']['Error404'];
      409: components['responses']['Error409'];
      413: components['responses']['Error413'];
      422: components['responses']['Error422'];
      429: components['responses']['Error429'];
      500: components['responses']['Error500'];
      503: components['responses']['Error503'];
    };
  };
}
