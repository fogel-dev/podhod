import { useState } from 'react';
import { deleteNote, getDay, putNote } from '@/entities/calendar';
import type { DayNote } from '@/entities/calendar';
import type { WriteContext } from '@/shared/api';
import { useAction } from '@/shared/lib/action';
import { useUnsavedChanges } from '@/shared/lib/unsaved';
export function DayNoteEditor({
  context,
  date,
  initial,
  onChanged,
}: {
  context: WriteContext;
  date: string;
  initial: DayNote | null;
  onChanged: () => void;
}) {
  const [note, setNote] = useState(initial);
  const [body, setBody] = useState(initial?.body ?? '');
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const [remote, setRemote] = useState<DayNote | null | undefined>();
  useUnsavedChanges(body !== (note?.body ?? ''));
  return (
    <section className="section">
      <h2>Заметка</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () => {
            const result = await putNote(
              context,
              date,
              body,
              note?.version ?? 0,
            );
            setNote(result);
            setSaved(true);
            onChanged();
          });
        }}
      >
        <label className="field">
          Как прошёл день
          <textarea
            maxLength={10000}
            value={body}
            disabled={action.busy}
            onChange={(e) => {
              setBody(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <div className="actions">
          <button className="primary" disabled={action.busy}>
            {action.busy ? 'Сохраняем…' : 'Сохранить заметку'}
          </button>
          {note && (
            <button
              type="button"
              className="text-button"
              disabled={action.busy}
              onClick={() => {
                if (!window.confirm('Удалить заметку этого дня?')) return;
                void action.run(async () => {
                  await deleteNote(context, note);
                  setNote(null);
                  setBody('');
                  setSaved(false);
                  onChanged();
                });
              }}
            >
              Удалить
            </button>
          )}
        </div>
        <p role="alert" className="form-message">
          {action.error}
        </p>
        {action.error && (
          <button
            type="button"
            className="text-button wide"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                setRemote((await getDay(date)).note);
              })
            }
          >
            Посмотреть актуальную заметку
          </button>
        )}
        {remote !== undefined && (
          <section className="surface section">
            <h3>Версия с сервера</h3>
            <p className="preserve-lines small">
              {remote?.body || 'Заметки на сервере нет.'}
            </p>
            <div className="actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setNote(remote);
                  setBody(remote?.body ?? '');
                  setRemote(undefined);
                  setSaved(false);
                }}
              >
                Загрузить её
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Использовать актуальную версию и затем заменить её вашим текстом при сохранении?',
                    )
                  ) {
                    setNote(remote);
                    setRemote(undefined);
                  }
                }}
              >
                Оставить мой текст
              </button>
            </div>
          </section>
        )}
        {saved && (
          <p role="status" className="toast">
            Заметка сохранена
          </p>
        )}
      </form>
    </section>
  );
}
