import { useSyncExternalStore } from 'react';
import {
  confirmationSnapshot,
  subscribeConfirmation,
  settleConfirmation,
} from '@/shared/lib/confirmation';
import { Dialog } from '../dialog';

export function ConfirmationHost() {
  const request = useSyncExternalStore(
    subscribeConfirmation,
    confirmationSnapshot,
  );
  if (!request) return null;
  return (
    <Dialog title="Подтверждение" onClose={() => settleConfirmation(false)}>
      <p className="confirmation-message">{request.message}</p>
      <div className="actions confirmation-actions">
        <button
          type="button"
          className="secondary-button"
          data-autofocus
          onClick={() => settleConfirmation(false)}
        >
          Отмена
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => settleConfirmation(true)}
        >
          Подтвердить
        </button>
      </div>
    </Dialog>
  );
}
