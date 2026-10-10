import { confirmAction } from '@/shared/lib/confirmation';
import { useState } from 'react';
import { deleteNote, getDay, putNote } from '@/entities/calendar';
import type { DayNote } from '@/entities/calendar';
import type { WriteContext } from '@/shared/api';
import { useAction } from '@/shared/lib/action';
import { useUnsavedChanges } from '@/shared/lib/unsaved';
import { Dialog } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/kit';

export function DayNoteEditor({
  context,
  date,
  initial,
  onChanged,
}: {
  context: WriteContext;
  date: string;
  initial: DayNote[];
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState(initial);
  const [editing, setEditing] = useState<{
    id: string;
    note: DayNote | null;
  } | null>(null);
  return (
    <section className="section">
      <h2>Заметки</h2>
      <div className="note-board">
        {notes.map((note) => (
          <button
            type="button"
            className="note-sticker"
            key={note.id}
            aria-label={`Открыть заметку: ${note.body.slice(0, 80) || 'Без текста'}`}
            onClick={() => setEditing({ id: note.id, note })}
          >
            <span>{note.body || 'Без текста'}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="secondary-button wide note-create"
        disabled={notes.length >= 100}
        onClick={() => setEditing({ id: crypto.randomUUID(), note: null })}
      >
        <Icon name="plus" /> Создать заметку
      </button>
      {editing && (
        <NoteSheet
          key={editing.id}
          context={context}
          date={date}
          id={editing.id}
          initial={editing.note}
          onClose={() => setEditing(null)}
          onSaved={(note) => {
            setNotes((previous) =>
              [...previous.filter((item) => item.id !== note.id), note].sort(
                (a, b) =>
                  a.createdAt.localeCompare(b.createdAt) ||
                  a.id.localeCompare(b.id),
              ),
            );
            onChanged();
            setEditing(null);
          }}
          onDeleted={(id) => {
            setNotes((previous) => previous.filter((note) => note.id !== id));
            onChanged();
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function NoteSheet({
  context,
  date,
  id,
  initial,
  onClose,
  onSaved,
  onDeleted,
}: {
  context: WriteContext;
  date: string;
  id: string;
  initial: DayNote | null;
  onClose: () => void;
  onSaved: (note: DayNote) => void;
  onDeleted: (id: string) => void;
}) {
  const [note, setNote] = useState(initial);
  const [body, setBody] = useState(initial?.body ?? '');
  const action = useAction();
  const dirty = body !== (note?.body ?? '');
  useUnsavedChanges(dirty);
  return (
    <Dialog
      title={note ? 'Заметка' : 'Новая заметка'}
      busy={action.busy}
      onClose={async () => {
        if (
          !dirty ||
          (await confirmAction('Закрыть без сохранения изменений?'))
        )
          onClose();
      }}
    >
      <form
        className="note-sheet-form"
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () =>
            onSaved(await putNote(context, date, body, note?.version ?? 0, id)),
          );
        }}
      >
        <label className="field">
          Как прошёл день
          <textarea
            autoFocus
            required
            maxLength={10000}
            value={body}
            disabled={action.busy}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="actions">
          <button className="primary" disabled={action.busy || !body.trim()}>
            {action.busy ? 'Сохраняем…' : 'Сохранить заметку'}
          </button>
          {note && (
            <button
              type="button"
              className="secondary-button"
              disabled={action.busy}
              onClick={async () => {
                if (!(await confirmAction('Удалить эту заметку?'))) return;
                void action.run(async () => {
                  await deleteNote(context, note);
                  onDeleted(note.id);
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
            className="secondary-button wide"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const current = (await getDay(date)).notes.find(
                  (item) => item.id === id,
                );
                if (!current)
                  throw new Error(
                    'Заметка удалена. Закройте панель и обновите день.',
                  );
                if (
                  !dirty ||
                  (await confirmAction(
                    'Загрузить актуальную заметку и заменить несохранённый текст?',
                  ))
                ) {
                  setNote(current);
                  setBody(current.body);
                }
              })
            }
          >
            Загрузить актуальную заметку
          </button>
        )}
      </form>
    </Dialog>
  );
}
