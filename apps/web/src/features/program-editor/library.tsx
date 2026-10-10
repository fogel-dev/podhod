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
import { Empty, ResourceState } from '@/shared/ui/kit';
export function ExerciseLibrary({
  context,
  onSelect,
}: {
  context: WriteContext;
  onSelect?: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [id, setId] = useState(() => crypto.randomUUID());
  const action = useAction();
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
            if (!editing) onSelect?.(saved);
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
            Советы по технике публикуются только с проверенным источником.
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
        Поиск в вашей библиотеке
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
      <p role="alert">{action.error}</p>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : resource.data.items.length ? (
        resource.data.items.map((exercise) => (
          <article className="exercise-card" key={exercise.id}>
            <div className="row">
              {onSelect ? (
                <button
                  className="exercise-name"
                  disabled={!!exercise.archivedAt}
                  onClick={() => onSelect(exercise)}
                >
                  {exercise.name}
                </button>
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
                onClick={() => {
                  if (
                    !exercise.archivedAt &&
                    !window.confirm(
                      'Убрать упражнение в архив? История и планы сохранятся.',
                    )
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
          </article>
        ))
      ) : (
        <Empty title={query ? 'Ничего не найдено' : 'Библиотека пока пуста'}>
          <p className="muted">
            Создайте упражнение, чтобы выбирать его в следующих программах.
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
