import { confirmAction } from '@/shared/lib/confirmation';
import { useCallback, useState } from 'react';
import {
  createExercise,
  listExercises,
  updateExercise,
} from '@/entities/exercise';
import type { Exercise } from '@/entities/exercise';
import type { WriteContext } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { useAction } from '@/shared/lib/action';
import { useUnsavedChanges } from '@/shared/lib/unsaved';
import { Empty, ResourceState } from '@/shared/ui/kit';
export function ExerciseLibrary({
  context,
  onSelect,
  selectionLimit = 100,
}: {
  context: WriteContext;
  onSelect?: (exercises: Exercise[]) => void;
  selectionLimit?: number;
}) {
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [id, setId] = useState(() => crypto.randomUUID());
  const action = useAction();
  useUnsavedChanges(
    form && (name !== (editing?.name ?? '') || note !== (editing?.note ?? '')),
  );
  const load = useCallback(
    (signal: AbortSignal) => listExercises(query, archived, signal),
    [query, archived],
  );
  const resource = useResource(`${query}:${archived}`, load);
  if (form)
    return (
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () => {
            const saved = editing
              ? await updateExercise(context, editing, {
                  name: name.trim(),
                  note,
                })
              : await createExercise(context, { id, name: name.trim(), note });
            setForm(false);
            resource.reload();
            if (!editing && onSelect)
              setSelected((items) =>
                items.length < selectionLimit ? [...items, saved] : items,
              );
          });
        }}
      >
        <h2>{editing ? 'Изменить упражнение' : 'Новое упражнение'}</h2>
        <fieldset disabled={action.busy}>
          <label>
            Название
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Личная заметка
            <textarea
              maxLength={10000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <p className="field-hint">
            Название доступно всем пользователям. Личная заметка видна только
            вам.
          </p>
          <p role="alert">{action.error}</p>
          <div className="actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setForm(false)}
            >
              Отмена
            </button>
            <button className="primary">
              {action.busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </fieldset>
      </form>
    );
  return (
    <section className="library">
      <label className="field">
        Поиск в общей библиотеке
        <input
          type="search"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="row">
        <button
          className="text-button"
          onClick={() => {
            setEditing(null);
            setName('');
            setNote('');
            setId(crypto.randomUUID());
            setForm(true);
            action.clear();
          }}
        >
          Новое упражнение
        </button>
        {!onSelect && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />{' '}
            Архив
          </label>
        )}
      </div>
      {onSelect && (
        <div className="library-selection">
          <span className="small muted">Выбрано: {selected.length}</span>
          <button
            className="primary"
            disabled={!selected.length}
            onClick={() => onSelect(selected)}
          >
            Добавить выбранные ({selected.length})
          </button>
        </div>
      )}
      <p role="alert">{action.error}</p>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : resource.data.items.length ? (
        resource.data.items.map((exercise) => (
          <article className="exercise-card" key={exercise.id}>
            <div className="row">
              {onSelect ? (
                <label className="check-label exercise-choice">
                  <input
                    type="checkbox"
                    checked={selected.some((item) => item.id === exercise.id)}
                    disabled={
                      !!exercise.archivedAt ||
                      (selected.length >= selectionLimit &&
                        !selected.some((item) => item.id === exercise.id))
                    }
                    onChange={(event) =>
                      setSelected((items) =>
                        event.target.checked
                          ? [...items, exercise]
                          : items.filter((item) => item.id !== exercise.id),
                      )
                    }
                  />
                  <strong>{exercise.name}</strong>
                </label>
              ) : (
                <h3>{exercise.name}</h3>
              )}
              {exercise.archivedAt && (
                <span className="small muted">В архиве</span>
              )}
            </div>
            {exercise.note && (
              <p className="small muted preserve-lines">{exercise.note}</p>
            )}
            {exercise.canEdit && (
              <div className="actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setEditing(exercise);
                    setName(exercise.name);
                    setNote(exercise.note);
                    setForm(true);
                    action.clear();
                  }}
                >
                  Изменить
                </button>
                <button
                  className="text-button"
                  disabled={action.busy}
                  onClick={async () => {
                    if (
                      !exercise.archivedAt &&
                      !(await confirmAction(
                        'Убрать упражнение в архив? История и планы сохранятся.',
                      ))
                    )
                      return;
                    void action.run(async () => {
                      await updateExercise(context, exercise, {
                        archived: !exercise.archivedAt,
                      });
                      resource.reload();
                    });
                  }}
                >
                  {exercise.archivedAt ? 'Восстановить' : 'В архив'}
                </button>
              </div>
            )}
          </article>
        ))
      ) : (
        <Empty title={query ? 'Ничего не найдено' : 'Библиотека пока пуста'}>
          <p className="muted">
            Добавьте упражнение в общую библиотеку, чтобы выбирать его в
            программах.
          </p>
        </Empty>
      )}
      {resource.data?.nextCursor && (
        <p className="field-hint">
          Показаны первые 100 упражнений. Уточните поиск.
        </p>
      )}
    </section>
  );
}
