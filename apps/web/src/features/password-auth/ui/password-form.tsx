import { useState } from 'react';
import type { FormEvent } from 'react';
import { changePassword } from '@/entities/user';
import type { Session } from '@/entities/user';

export function PasswordForm({
  session,
  onChanged,
}: {
  session: Session;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    const input = {
      currentPassword: String(data.get('currentPassword')),
      password: String(data.get('password')),
      passwordConfirmation: String(data.get('passwordConfirmation')),
    };
    if (input.password !== input.passwordConfirmation) {
      setMessage('Пароли не совпадают');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await changePassword(session, input);
      form.reset();
      await onChanged();
      setMessage('Пароль изменён. На остальных устройствах выполнен выход.');
    } catch (failure) {
      setMessage(
        failure instanceof Error
          ? failure.message
          : 'Не удалось изменить пароль',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <h2>Пароль</h2>
      <form
        className="form-stack"
        onSubmit={(event) => {
          void submit(event);
        }}
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
          <label>
            Текущий пароль
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              minLength={15}
              maxLength={128}
            />
          </label>
          <label>
            Новый пароль
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={15}
              maxLength={128}
            />
          </label>
          <label>
            Подтвердите новый пароль
            <input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={15}
              maxLength={128}
            />
          </label>
        </fieldset>
        <p role="status" className="form-message">
          {message}
        </p>
        <button className="secondary-button" disabled={busy}>
          Изменить пароль
        </button>
      </form>
    </section>
  );
}
