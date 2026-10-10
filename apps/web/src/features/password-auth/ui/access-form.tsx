import { useState } from 'react';
import type { FormEvent } from 'react';
import { login, register } from '@/entities/user';
import type { Session } from '@/entities/user';

export function AccessForm({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (busy) return;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '');
    if (
      mode === 'register' &&
      value('password') !== value('passwordConfirmation')
    ) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const input = {
        login: value('login').trim(),
        password: value('password'),
        deviceLabel: /iPhone|iPad|iPod/.test(navigator.userAgent)
          ? 'Устройство Apple'
          : /Android/.test(navigator.userAgent)
            ? 'Устройство Android'
            : 'Компьютер',
      };
      const session =
        mode === 'register'
          ? await register({
              ...input,
              email: value('email').trim(),
              passwordConfirmation: value('passwordConfirmation'),
            })
          : await login(input);
      form.reset();
      onAuthenticated(session);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Нет соединения с сервером',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="access-section">
      <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
      <form
        key={mode}
        onSubmit={(event) => {
          void submit(event);
        }}
        className="form-stack"
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
          {mode === 'register' && (
            <label>
              Почта
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                inputMode="email"
              />
            </label>
          )}
          <label>
            Логин
            <input
              name="login"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z][a-zA-Z0-9_]{2,31}"
              aria-describedby={mode === 'register' ? 'login-hint' : undefined}
            />
          </label>
          {mode === 'register' && (
            <p className="field-hint" id="login-hint">
              От 3 до 32 символов: латинские буквы, цифры и _. Начните с буквы.
            </p>
          )}
          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              required
              minLength={mode === 'register' ? 8 : undefined}
              maxLength={128}
              aria-describedby={
                mode === 'register' ? 'password-hint' : undefined
              }
            />
          </label>
          {mode === 'register' && (
            <p className="field-hint" id="password-hint">
              Не менее 8 символов.
            </p>
          )}
          {mode === 'register' && (
            <label>
              Подтверждение пароля
              <input
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </label>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="form-message">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={() => {
          setError('');
          setMode(mode === 'login' ? 'register' : 'login');
        }}
      >
        {mode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
      </button>
      <p className="field-hint">
        Сброс пароля по почте пока недоступен. Сохраните пароль в менеджере
        паролей.
      </p>
    </section>
  );
}
