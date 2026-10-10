import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
export function Dialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div className="sheet-content">
        <div className="row">
          <h2>{title}</h2>
          <button
            className="text-button"
            disabled={busy}
            onClick={onClose}
            aria-label="Закрыть"
          >
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
