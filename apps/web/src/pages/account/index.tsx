import { useState } from 'react';
import { PasswordForm } from '@/features/password-auth';
import { DevicesSettings } from '@/features/account-settings';
import { AppAvailability } from '@/features/app-availability';
import { logout } from '@/entities/user';
import type { Session } from '@/entities/user';
import { ApiError } from '@/shared/api';
import { Brand } from '@/shared/ui/brand';
import { ThemeControl } from '@/shared/ui/theme';
export function AccountPage({
  session,
  onChanged,
  onLogout,
  embedded = false,
}: {
  session: Session;
  onChanged: () => Promise<void>;
  onLogout: () => void;
  embedded?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className={embedded ? 'account-embedded' : 'account-page'}>
      {!embedded && (
        <header className="page-header">
          <Brand />
          <ThemeControl />
        </header>
      )}
      <h1 tabIndex={-1}>Настройки</h1>
      <section className="settings-section">
        <h2>{session.user.login}</h2>
        <p className="account-email">{session.user.email}</p>
        <p className="field-hint">
          Почта не подтверждена. Вход — по логину и паролю.
        </p>
      </section>
      <AppAvailability />
      <PasswordForm session={session} onChanged={onChanged} />
      <DevicesSettings session={session} onChanged={onChanged} />
      <p role="alert" className="form-message">
        {error}
      </p>
      <button
        className="secondary-button"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          setBusy(true);
          setError('');
          void logout(session)
            .then(onLogout)
            .catch((failure: unknown) => {
              if (failure instanceof ApiError && failure.status === 401)
                onLogout();
              else
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Не удалось выйти',
                );
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? 'Выходим…' : 'Выйти из аккаунта'}
      </button>
    </div>
  );
}
