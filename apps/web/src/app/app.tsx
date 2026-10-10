import { useEffect, useState } from 'react';
import { AccessPage } from '@/pages/access';
import { AccountPage } from '@/pages/account';
import { getSession } from '@/entities/user';
import type { Session } from '@/entities/user';
import { ApiError } from '@/shared/api';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void getSession(controller.signal)
      .then(setSession)
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (failure instanceof ApiError && failure.status === 401)
          setSession(null);
        else
          setError(
            'Не удалось подключиться. Проверьте соединение и попробуйте ещё раз.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  async function refresh() {
    try {
      setSession(await getSession());
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401)
        setSession(null);
      else throw failure;
    }
  }
  if (loading)
    return (
      <main className="connection-state" role="status">
        Подключаемся…
      </main>
    );
  if (error)
    return (
      <main className="connection-state">
        <p role="alert">{error}</p>
        <button
          className="primary"
          onClick={() => {
            setError('');
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Повторить
        </button>
      </main>
    );
  return session ? (
    <AccountPage
      key={session.user.id}
      session={session}
      onChanged={refresh}
      onLogout={() => setSession(null)}
    />
  ) : (
    <AccessPage onAuthenticated={setSession} />
  );
}
