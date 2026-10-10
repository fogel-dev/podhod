import { useEffect, useState } from 'react';
import { ApiError } from '@/shared/api';

export function message(error: unknown) {
  if (error instanceof ApiError && error.status === 409)
    return 'Запись изменилась на другом устройстве. Обновите данные перед повторным сохранением.';
  if (error instanceof ApiError && error.status === 401)
    return 'Сессия завершена. Войдите снова.';
  return error instanceof ApiError
    ? error.message
    : 'Нет соединения с сервером. Попробуйте ещё раз.';
}

export function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [revision, setRevision] = useState(0);
  const identity = `${key}:${revision}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: '' },
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key: identity, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({ key: identity, error: message(error) });
      },
    );
    return () => controller.abort();
  }, [identity, load]);
  return {
    data: state.key === identity ? state.data : undefined,
    error: state.key === identity ? state.error : undefined,
    reload: () => setRevision((value) => value + 1),
  };
}
