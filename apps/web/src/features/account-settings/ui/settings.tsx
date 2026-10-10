import { useEffect, useState } from 'react';
import { getDevices, revokeDevice, updateTimezone } from '@/entities/user';
import type { Device, Session } from '@/entities/user';
import { ApiError } from '@/shared/api';

export function TimezoneSettings({
  session,
  onChanged,
}: {
  session: Session;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  return (
    <section className="settings-section">
      <h2>Часовой пояс</h2>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          const timezone = String(
            new FormData(event.currentTarget).get('timezone'),
          ).trim();
          setBusy(true);
          setMessage('');
          void updateTimezone(session, timezone)
            .then(onChanged)
            .then(() => setMessage('Часовой пояс сохранён'))
            .catch((failure: unknown) =>
              setMessage(
                failure instanceof Error
                  ? failure.message
                  : 'Не удалось сохранить',
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Часовой пояс IANA
          <input
            key={session.user.timezone}
            name="timezone"
            required
            maxLength={100}
            defaultValue={session.user.timezone}
            disabled={busy}
            aria-describedby="timezone-hint"
          />
        </label>
        <p id="timezone-hint" className="field-hint">
          Например, Asia/Novosibirsk. История тренировок сохраняет свои даты.
        </p>
        <p role="status" className="form-message">
          {message}
        </p>
        <button className="secondary-button" disabled={busy}>
          Сохранить
        </button>
      </form>
    </section>
  );
}

export function DevicesSettings({
  session,
  onChanged,
}: {
  session: Session;
  onChanged: () => Promise<void>;
}) {
  const [devices, setDevices] = useState<Device[]>([]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState<string | null>(null),
    [retry, setRetry] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void getDevices(controller.signal)
      .then((data) => {
        setDevices(data.items);
        setMessage('');
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setMessage(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить устройства',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session.csrfToken, retry]);
  async function revoke(device: Device) {
    if (busy) return;
    setBusy(device.id);
    setMessage('');
    try {
      await revokeDevice(session, device);
      await onChanged();
      setRetry((value) => value + 1);
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        (failure.status === 401 || failure.status === 409)
      ) {
        await onChanged();
        setRetry((value) => value + 1);
      }
      setMessage(
        failure instanceof Error
          ? failure.message
          : 'Не удалось отозвать устройство',
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="settings-section">
      <h2>Устройства</h2>
      {loading && <p role="status">Загрузка…</p>}
      <ul className="device-list">
        {devices.map((device) => (
          <li key={device.id}>
            <div>
              <h3>{device.label}</h3>
              <p className="field-hint">
                {device.id === session.deviceId
                  ? 'Это устройство'
                  : `Последний доступ: ${new Date(device.lastSeenAt).toLocaleString('ru-RU')}`}
              </p>
            </div>
            <button
              className="text-button"
              disabled={busy !== null}
              onClick={() => {
                void revoke(device);
              }}
            >
              {busy === device.id ? 'Подождите…' : 'Выйти'}
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="form-message">
        {message}
      </p>
      {message && (
        <button
          className="secondary-button"
          onClick={() => {
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Обновить список
        </button>
      )}
    </section>
  );
}
