import { useCallback, useEffect, useState } from 'react';
import { request } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { ResourceState } from '@/shared/ui/kit';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function AppAvailability() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  );
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const completed = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', completed);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', completed);
    };
  }, []);
  const load = useCallback(
    (signal: AbortSignal) => request('/push/config', { signal }),
    [],
  );
  const push = useResource('push-capability', load);
  return (
    <section className="settings-section">
      <h2>Приложение и уведомления</h2>
      <p>
        {installed
          ? 'Приложение открыто с домашнего экрана.'
          : 'Добавьте «Подход» на домашний экран, когда установка станет доступна в браузере.'}
      </p>
      {prompt && (
        <button
          className="primary"
          onClick={() =>
            void prompt
              .prompt()
              .then(() => prompt.userChoice)
              .then(() => setPrompt(null))
          }
        >
          Установить приложение
        </button>
      )}
      <h3>Напоминания о тренировках</h3>
      {!push.data ? (
        <>
          <p className="field-hint">
            Доступность уведомлений проверяется на сервере. Разрешение браузера
            понадобится при подключении напоминаний.
          </p>
          <ResourceState error={push.error} retry={push.reload} />
        </>
      ) : (
        <p className="field-hint">
          Сервер уведомлений доступен. Подключение напоминаний будет доступно
          после проверки доставки на устройствах.
        </p>
      )}
    </section>
  );
}
