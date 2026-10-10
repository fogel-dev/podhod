import { confirmAction } from '@/shared/lib/confirmation';
import { useCallback, useRef, useState } from 'react';
import { commandWorkout, getWorkoutHistory } from '@/entities/workout';
import type { Workout, WorkoutCommand, WorkoutSet } from '@/entities/workout';
import type { WriteContext } from '@/shared/api';
import { useAction } from '@/shared/lib/action';
import { useResource } from '@/shared/lib/resource';
import { useElapsed } from '@/shared/lib/timer';
import { useUnsavedChanges } from '@/shared/lib/unsaved';
import { dateLabel, duration } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { Dialog } from '@/shared/ui/dialog';
import { Select } from '@/shared/ui/select';
import { Icon, PageTitle, ResourceState } from '@/shared/ui/kit';
type CommandData = WorkoutCommand extends infer C
  ? C extends WorkoutCommand
    ? Pick<C, 'type' | 'payload'>
    : never
  : never;
function FactForm({
  set,
  busy,
  onSave,
}: {
  set: WorkoutSet;
  busy: boolean;
  onSave: (weight: string, reps: number) => void;
}) {
  const [weight, setWeight] = useState(
    set.actualWeightKg ?? set.plannedWeightKg ?? '0',
  );
  const [reps, setReps] = useState(
    String(set.actualReps ?? set.plannedRepsMin ?? 1),
  );
  return (
    <form
      className="form-stack section"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(Number(weight).toFixed(2), Number(reps));
      }}
    >
      <fieldset disabled={busy}>
        <div className="dates">
          <label>
            Фактический вес, кг
            <input
              autoFocus
              required
              type="number"
              inputMode="decimal"
              min="0"
              max="99999.99"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label>
            Повторения
            <input
              required
              type="number"
              inputMode="numeric"
              min="1"
              max="1000"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </label>
        </div>
        <p className="field-hint">
          План: {set.plannedWeightKg ?? '—'} кг · {set.plannedRepsMin ?? '—'}–
          {set.plannedRepsMax ?? '—'} повторений. Сохранится введённый факт.
        </p>
        <button className="primary">
          {busy
            ? 'Сохраняем…'
            : set.status === 'completed'
              ? 'Исправить подход'
              : 'Подход выполнен'}
        </button>
      </fieldset>
    </form>
  );
}
function History({ id }: { id: string }) {
  const load = useCallback(
    (signal: AbortSignal) => getWorkoutHistory(id, signal),
    [id],
  );
  const resource = useResource(id, load);
  const [selected, setSelected] = useState('');
  const revision = resource.data?.items.find((item) => item.id === selected);
  return (
    <section className="section">
      <h2>Версии результата</h2>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <div className="field">
            <span>Ревизия</span>
            <Select
              label="Ревизия"
              value={selected}
              onChange={setSelected}
              options={[
                { value: '', label: 'Выберите версию' },
                ...[...resource.data.items]
                  .sort((a, b) => b.revisionNo - a.revisionNo)
                  .map((item) => ({
                    value: item.id,
                    label: `Версия ${item.revisionNo}${item.reason ? ` · ${item.reason.slice(0, 80)}` : ''}`,
                  })),
              ]}
            />
          </div>
          {revision && (
            <div className="surface">
              <p className="preserve-lines">
                {revision.reason ?? 'Первоначальный результат'}
              </p>
              {revision.exercises.map((exercise) => (
                <div className="review-exercise" key={exercise.id}>
                  <h3>{exercise.nameSnapshot}</h3>
                  {exercise.sets.map((set) => (
                    <p key={set.id} className="small muted">
                      {set.position}.{' '}
                      {set.status === 'completed'
                        ? `${set.actualWeightKg} кг × ${set.actualReps}`
                        : 'Не выполнен'}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
          {resource.data.nextCursor && (
            <p className="field-hint">Показаны первые 100 версий.</p>
          )}
        </>
      )}
    </section>
  );
}
export function WorkoutSession({
  initial,
  context,
  onChanged,
  navigate,
}: {
  initial: Workout;
  context: WriteContext;
  onChanged: () => void;
  navigate: Navigate;
}) {
  const [workout, setWorkout] = useState(initial);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [fact, setFact] = useState<WorkoutSet | null>(null);
  const [history, setHistory] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [reason, setReason] = useState('');
  const [correction, setCorrection] = useState(
    initial.currentRevision.exercises,
  );
  const pending = useRef<WorkoutCommand | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const action = useAction();
  useUnsavedChanges(unconfirmed || action.busy);
  const exercises = workout.currentRevision.exercises;
  const allSets = exercises.flatMap((exercise) => exercise.sets);
  const nextSet =
    allSets.find((set) => set.status === 'pending' && set.startedAt) ??
    allSets.find((set) => set.status === 'pending');
  const rest = workout.currentRevision.restIntervals.find(
    (interval) => !interval.endedAt,
  );
  const elapsed = useElapsed(rest?.startedAt ?? null);
  const total = useElapsed(
    workout.status === 'active' ? workout.startedAt : null,
  );
  const selected = exercises.find((exercise) => exercise.id === exerciseId);
  async function send(command: WorkoutCommand) {
    pending.current = command;
    setUnconfirmed(true);
    const result = await commandWorkout(context, command);
    pending.current = null;
    setUnconfirmed(false);
    setWorkout(result);
    setFact(null);
    setCorrecting(false);
    onChanged();
  }
  function perform(data: CommandData) {
    const command = {
      ...data,
      commandId: crypto.randomUUID(),
      deviceId: context.deviceId,
      aggregateId: workout.id,
      expectedVersion: workout.version,
      occurredAt: new Date().toISOString(),
    } as WorkoutCommand;
    void action.run(() => send(command));
  }
  const blocked = action.busy || unconfirmed;
  return (
    <>
      <PageTitle
        title={
          selected
            ? selected.nameSnapshot
            : workout.status === 'completed'
              ? 'Тренировка завершена'
              : workout.status === 'discarded'
                ? 'Тренировка отменена'
                : 'Тренировка'
        }
        subtitle={dateLabel(workout.localDate)}
      />
      {selected && (
        <button className="text-button" onClick={() => setExerciseId(null)}>
          Все упражнения
        </button>
      )}
      <div
        className="workout-progress"
        aria-label={`Выполнено ${allSets.filter((set) => set.status === 'completed').length} из ${allSets.length} подходов`}
      >
        {allSets.map((set) => (
          <span
            key={set.id}
            className={set.status === 'completed' ? 'filled' : ''}
          />
        ))}
      </div>
      <p className="small muted section">
        {workout.status === 'active'
          ? `Время тренировки ${duration(total)}`
          : `${duration(workout.summary.durationSeconds)} · ${workout.summary.completedSets} подходов`}
      </p>
      {unconfirmed && !action.busy && (
        <section className="surface section">
          <p role="alert">{action.error}</p>
          <p className="field-hint">
            Изменение ещё не подтверждено. Не закрывайте экран до проверки
            результата.
          </p>
          <div className="actions">
            <button
              className="primary"
              onClick={() => {
                const command = pending.current;
                if (command) void action.run(() => send(command));
              }}
            >
              Повторить отправку
            </button>
            <button
              className="secondary-button"
              onClick={async () => {
                if (
                  await confirmAction(
                    'Загрузить состояние с сервера? Введённые неподтверждённые значения останутся только на этом экране до обновления.',
                  )
                )
                  window.location.reload();
              }}
            >
              Проверить на сервере
            </button>
          </div>
        </section>
      )}
      <div
        className={`exercise-list ${selected ? 'exercise-detail' : ''}`}
        key={selected?.id ?? 'all'}
      >
        {(selected ? [selected] : exercises).map((exercise) => (
          <article className="exercise-card" key={exercise.id}>
            <div className="row">
              <button
                className="exercise-name"
                onClick={() => setExerciseId(exercise.id)}
              >
                {exercise.nameSnapshot}
                <Icon name="next" />
              </button>
              <span className="exercise-weight">
                {exercise.sets[0]?.plannedWeightKg ?? '—'} <small>кг</small>
              </span>
            </div>
            <p className="small muted">
              План · {exercise.sets.length} подходов
            </p>
            <div className="sets">
              {exercise.sets.map((set) => (
                <button
                  className={`set ${set.status === 'completed' ? 'completed' : set.id === nextSet?.id ? 'current' : ''}`}
                  key={set.id}
                  disabled={
                    workout.status !== 'active' ||
                    blocked ||
                    (set.status === 'pending' &&
                      (!!rest || set.id !== nextSet?.id)) ||
                    set.status === 'skipped'
                  }
                  aria-label={`Подход ${set.position}${set.status === 'completed' ? `, выполнен: ${set.actualWeightKg} кг, ${set.actualReps} повторений` : `, план ${set.plannedWeightKg ?? '—'} кг, ${set.plannedRepsMin ?? '—'}–${set.plannedRepsMax ?? '—'} повторений`}`}
                  onClick={() => setFact(set)}
                >
                  {set.status === 'completed' ? (
                    <Icon name="check" />
                  ) : (
                    set.position
                  )}
                </button>
              ))}
            </div>
            {selected && (
              <>
                <div className="section">
                  <h3>План и факт</h3>
                  {exercise.sets.map((set) => (
                    <p key={set.id} className="small muted review-exercise">
                      Подход {set.position}: план {set.plannedWeightKg ?? '—'}{' '}
                      кг × {set.plannedRepsMin ?? '—'}–
                      {set.plannedRepsMax ?? '—'}
                      {set.status === 'completed'
                        ? ` · факт ${set.actualWeightKg} кг × ${set.actualReps}`
                        : ''}
                    </p>
                  ))}
                </div>
                <div className="section">
                  <h3>Заметка</h3>
                  <p className="preserve-lines small muted">
                    {exercise.note || 'Заметки к упражнению пока нет.'}
                  </p>
                </div>
                <div className="section">
                  <h3>Техника</h3>
                  {exercise.techniqueSnapshot ? (
                    <>
                      <p className="preserve-lines small">
                        {exercise.techniqueSnapshot.body}
                      </p>
                      <a
                        className="source-link"
                        href={exercise.techniqueSnapshot.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {exercise.techniqueSnapshot.sourceTitle}
                      </a>
                      <p className="field-hint">
                        Проверено{' '}
                        {new Date(
                          exercise.techniqueSnapshot.reviewedAt,
                        ).toLocaleDateString('ru')}
                      </p>
                    </>
                  ) : (
                    <p className="small muted">
                      Проверенный материал для этого упражнения пока не
                      опубликован.
                    </p>
                  )}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      {workout.status === 'active' && (
        <>
          <p className="workout-hint">
            Нажмите на текущий подход, чтобы записать фактический вес и
            повторения.
          </p>
          {rest && (
            <aside className="rest-dock" aria-label="Отдых">
              <div className="row">
                <span className="small muted">Отдых</span>
                <button
                  className="text-button"
                  disabled={blocked}
                  onClick={() =>
                    perform({
                      type: 'undo_last_set',
                      payload: { setId: rest.afterSetId },
                    })
                  }
                >
                  Отменить подход
                </button>
              </div>
              <div className="timer" aria-label={`Отдых ${duration(elapsed)}`}>
                {duration(elapsed)}
              </div>
              {nextSet ? (
                <button
                  className="primary"
                  disabled={blocked}
                  onClick={() =>
                    perform({
                      type: 'begin_set',
                      payload: {
                        setId: nextSet.id,
                        startedAt: new Date().toISOString(),
                      },
                    })
                  }
                >
                  Приступить к подходу
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={blocked}
                  onClick={() =>
                    perform({
                      type: 'finish_workout',
                      payload: {
                        finishedAt: new Date().toISOString(),
                        skipRemaining: false,
                      },
                    })
                  }
                >
                  Завершить тренировку
                </button>
              )}
            </aside>
          )}
          <button
            className="text-button wide"
            disabled={blocked}
            onClick={async () => {
              const remains = allSets.some((set) => set.status === 'pending');
              if (
                remains &&
                !(await confirmAction(
                  'Завершить тренировку? Невыполненные подходы будут отмечены пропущенными.',
                ))
              )
                return;
              perform({
                type: 'finish_workout',
                payload: {
                  finishedAt: new Date().toISOString(),
                  skipRemaining: remains,
                },
              });
            }}
          >
            Завершить тренировку
          </button>
          <button
            className="text-button wide"
            disabled={blocked}
            onClick={async () => {
              if (
                await confirmAction(
                  'Отменить тренировку? Её подходы не попадут в прогресс.',
                )
              )
                perform({ type: 'discard_workout', payload: {} });
            }}
          >
            Отменить тренировку
          </button>
        </>
      )}
      {workout.status === 'completed' && (
        <>
          <div className="summary-grid section">
            <div>
              <strong>{workout.summary.completedSets}</strong>
              <span>подходов</span>
            </div>
            <div>
              <strong>{workout.summary.totalReps}</strong>
              <span>повторений</span>
            </div>
            <div>
              <strong>
                {Number(workout.summary.volume).toLocaleString('ru')}
              </strong>
              <span>кг × повторения</span>
            </div>
            <div>
              <strong>{duration(workout.summary.totalRestSeconds)}</strong>
              <span>всего отдыха</span>
            </div>
            <div>
              <strong>
                {workout.summary.meanBetweenSetRestSeconds === null
                  ? '—'
                  : duration(workout.summary.meanBetweenSetRestSeconds)}
              </strong>
              <span>средний отдых между подходами</span>
            </div>
          </div>
          <button
            className="primary section"
            onClick={() => navigate({ view: 'day', date: workout.localDate })}
          >
            Заметка и фотографии дня
          </button>
          <div className="actions">
            <button
              className="text-button"
              disabled={blocked}
              onClick={() => {
                setReason('');
                setCorrection(workout.currentRevision.exercises);
                setCorrecting(true);
              }}
            >
              Исправить результат
            </button>
            <button
              className="text-button"
              onClick={() => setHistory(!history)}
            >
              Версии результата
            </button>
          </div>
          {history && <History key={workout.version} id={workout.id} />}
        </>
      )}
      {fact && (
        <Dialog
          title={`Подход ${fact.position}`}
          busy={action.busy}
          onClose={() => setFact(null)}
        >
          <FactForm
            set={fact}
            busy={blocked}
            onSave={(weight, reps) =>
              perform(
                fact.status === 'completed'
                  ? {
                      type: 'correct_set',
                      payload: {
                        setId: fact.id,
                        actualWeightKg: weight,
                        actualReps: reps,
                      },
                    }
                  : {
                      type: 'complete_set',
                      payload: {
                        setId: fact.id,
                        actualWeightKg: weight,
                        actualReps: reps,
                        completedAt: new Date().toISOString(),
                      },
                    },
              )
            }
          />
          {action.error && <p role="alert">{action.error}</p>}
        </Dialog>
      )}
      {correcting && (
        <Dialog
          title="Исправить результат"
          busy={action.busy}
          onClose={() => setCorrecting(false)}
        >
          <form
            className="form-stack section"
            onSubmit={(event) => {
              event.preventDefault();
              perform({
                type: 'correct_result',
                payload: {
                  reason: reason.trim(),
                  startedAt: workout.startedAt,
                  finishedAt: workout.finishedAt!,
                  restIntervals: workout.currentRevision.restIntervals,
                  exercises: correction.map((exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                      set.status === 'completed'
                        ? {
                            ...set,
                            actualWeightKg: Number(set.actualWeightKg).toFixed(
                              2,
                            ),
                          }
                        : set,
                    ),
                  })),
                },
              });
            }}
          >
            <fieldset disabled={blocked}>
              <label>
                Причина исправления
                <textarea
                  required
                  maxLength={10000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {correction.map((exercise) => (
                <section key={exercise.id}>
                  <h3>{exercise.nameSnapshot}</h3>
                  {exercise.sets
                    .filter((set) => set.status === 'completed')
                    .map((set) => (
                      <div className="dates" key={set.id}>
                        <label className="field">
                          Подход {set.position}, кг
                          <input
                            required
                            type="number"
                            min="0"
                            max="99999.99"
                            step="0.01"
                            value={set.actualWeightKg ?? ''}
                            onChange={(e) =>
                              setCorrection((items) =>
                                items.map((item) => ({
                                  ...item,
                                  sets: item.sets.map((s) =>
                                    s.id === set.id
                                      ? { ...s, actualWeightKg: e.target.value }
                                      : s,
                                  ),
                                })),
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          Повторения
                          <input
                            required
                            type="number"
                            min="1"
                            max="1000"
                            value={set.actualReps ?? ''}
                            onChange={(e) =>
                              setCorrection((items) =>
                                items.map((item) => ({
                                  ...item,
                                  sets: item.sets.map((s) =>
                                    s.id === set.id
                                      ? {
                                          ...s,
                                          actualReps: Number(e.target.value),
                                        }
                                      : s,
                                  ),
                                })),
                              )
                            }
                          />
                        </label>
                      </div>
                    ))}
                </section>
              ))}
              <p className="field-hint">
                Сохранится новая версия. Предыдущий результат останется в
                истории.
              </p>
              <button className="primary">Сохранить исправление</button>
            </fieldset>
          </form>
          {action.error && <p role="alert">{action.error}</p>}
        </Dialog>
      )}
    </>
  );
}
