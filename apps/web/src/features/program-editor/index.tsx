import { confirmAction } from '@/shared/lib/confirmation';
import { useState } from 'react';
import { createProgram, publishProgram } from '@/entities/program';
import type { Program, ProgramRevisionInput } from '@/entities/program';
import type { Exercise, PlanExerciseInput } from '@/entities/exercise';
import type { WriteContext } from '@/shared/api';
import { useAction } from '@/shared/lib/action';
import { useUnsavedChanges } from '@/shared/lib/unsaved';
import {
  addDays,
  dateLabel,
  today,
  weekdayNames,
  weekdays,
} from '@/shared/lib/date';
import { ExerciseLibrary } from './library';
import { useExerciseReorder } from './reorder';
import { Icon } from '@/shared/ui/kit';
import { Select } from '@/shared/ui/select';
import { DatePicker } from '@/shared/ui/date-picker';
export { ExerciseLibrary } from './library';
type DraftDay = { weekday: number; exercises: PlanExerciseInput[] };
const freshTarget = (position: number) => ({
  id: crypto.randomUUID(),
  position,
  weightKg: '0.00',
  repsMin: 12,
  repsMax: 15,
});
function copyExercises(items: PlanExerciseInput[]) {
  return items.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    targets: item.targets.map((target) => ({
      ...target,
      id: crypto.randomUUID(),
    })),
  }));
}
export function ProgramEditor({
  context,
  timezone,
  program,
  onSaved,
}: {
  context: WriteContext;
  timezone: string;
  program?: Program | undefined;
  onSaved: (program: Program) => void;
}) {
  const initial = program?.currentRevision;
  const [id] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [name, setName] = useState(program?.name ?? '');
  const [start, setStart] = useState(initial?.startDate ?? today(timezone));
  const [end, setEnd] = useState(
    initial?.endDate ?? addDays(today(timezone), 27),
  );
  const [effective, setEffective] = useState(today(timezone));
  const zone = initial?.timezone ?? timezone;
  const [days, setDays] = useState<DraftDay[]>(
    initial?.days.map((day) => ({
      weekday: day.weekday,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        position: exercise.position,
        note: exercise.note,
        targets: exercise.targets,
      })),
    })) ?? [],
  );
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(
      initial?.days.flatMap((day) =>
        day.exercises.map((exercise) => [
          exercise.exerciseId,
          exercise.nameSnapshot,
        ]),
      ) ?? [],
    ),
  );
  const [selected, setSelected] = useState(
    days.length ? Math.min(...days.map((day) => day.weekday)) : 1,
  );
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(
    initial?.days.flatMap((day) =>
      day.exercises[0] ? [day.exercises[0].id] : [],
    ) ?? [],
  );
  const [copying, setCopying] = useState(false);
  const [targets, setTargets] = useState<number[]>([]);
  const fingerprint = JSON.stringify([name, start, end, effective, zone, days]);
  const [baseline] = useState(fingerprint);
  const guard = useUnsavedChanges(fingerprint !== baseline);
  const action = useAction();
  const activeDay = days.find((day) => day.weekday === selected) ?? days[0];
  function updateExercises(
    update: (items: PlanExerciseInput[]) => PlanExerciseInput[],
  ) {
    setDays((current) =>
      current.map((day) =>
        day.weekday === activeDay?.weekday
          ? { ...day, exercises: update(day.exercises) }
          : day,
      ),
    );
  }
  function moveExercise(from: number, to: number) {
    updateExercises((items) => {
      const reordered = [...items];
      const [moved] = reordered.splice(from, 1);
      if (!moved) return items;
      reordered.splice(to, 0, moved);
      return reordered.map((item, index) => ({ ...item, position: index + 1 }));
    });
  }
  const {
    list: reorderList,
    drag,
    start: startDrag,
    move: moveDrag,
    finish: finishDrag,
    style: dragStyle,
  } = useExerciseReorder(moveExercise);
  function addExercises(exercises: Exercise[]) {
    setNames((current) => ({
      ...current,
      ...Object.fromEntries(
        exercises.map((exercise) => [exercise.id, exercise.name]),
      ),
    }));
    const added = exercises
      .slice(0, 100 - (activeDay?.exercises.length ?? 0))
      .map((exercise, index) => ({
        id: crypto.randomUUID(),
        exerciseId: exercise.id,
        position: (activeDay?.exercises.length ?? 0) + index + 1,
        note: exercise.note,
        targets: [freshTarget(1), freshTarget(2), freshTarget(3)],
      }));
    updateExercises((items) => [...items, ...added]);
    setExpanded(added.length ? [added[added.length - 1]!.id] : []);
    setPicker(false);
  }
  const validDays =
    days.length > 0 && days.every((day) => day.exercises.length > 0);
  return (
    <div className="program-editor">
      <p className="eyebrow" aria-live="polite">
        Шаг {step + 1} из 4 ·{' '}
        {['Период', 'Дни недели', 'Упражнения', 'Проверка'][step]}
      </p>
      <div className="step-track" aria-hidden="true">
        {[0, 1, 2, 3].map((n) => (
          <span key={n} className={n <= step ? 'filled' : ''} />
        ))}
      </div>
      {picker ? (
        <>
          <button className="text-button" onClick={() => setPicker(false)}>
            К упражнениям дня
          </button>
          <ExerciseLibrary
            context={context}
            onSelect={addExercises}
            selectionLimit={100 - (activeDay?.exercises.length ?? 0)}
          />
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 3) {
              if (step === 1)
                setSelected(Math.min(...days.map((day) => day.weekday)));
              setStep(step + 1);
              return;
            }
            void action.run(async () => {
              const revision: ProgramRevisionInput = {
                startDate: start,
                endDate: end,
                effectiveFrom: program ? effective : start,
                timezone: zone,
                days: [...days]
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((day) => ({
                    ...day,
                    exercises: day.exercises.map((exercise) => ({
                      ...exercise,
                      targets: exercise.targets.map((target) => ({
                        ...target,
                        weightKg:
                          target.weightKg === null
                            ? null
                            : Number(target.weightKg).toFixed(2),
                      })),
                    })),
                  })),
              };
              const saved = program
                ? await publishProgram(context, program, revision)
                : await createProgram(context, {
                    id,
                    name: name.trim(),
                    revision,
                  });
              guard.release();
              onSaved(saved);
            });
          }}
        >
          <fieldset disabled={action.busy}>
            {step === 0 && (
              <>
                <label className="field">
                  Название
                  <input
                    required
                    maxLength={120}
                    value={name}
                    disabled={!!program}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <div className="dates">
                  <DatePicker
                    label="Начало"
                    value={start}
                    onChange={(date) => {
                      setStart(date);
                      if (date > end) setEnd(date);
                    }}
                  />
                  <DatePicker
                    label="Окончание"
                    value={end}
                    min={start}
                    onChange={setEnd}
                  />
                </div>
                <div className="segment">
                  {[4, 8].map((weeks) => (
                    <button
                      type="button"
                      key={weeks}
                      aria-pressed={end === addDays(start, weeks * 7 - 1)}
                      onClick={() => setEnd(addDays(start, weeks * 7 - 1))}
                    >
                      {weeks} {weeks === 4 ? 'недели' : 'недель'}
                    </button>
                  ))}
                </div>
                {program && (
                  <div className="field">
                    <DatePicker
                      label="Применить изменения с"
                      min={today(timezone)}
                      max={end}
                      value={effective}
                      onChange={setEffective}
                    />
                    <span className="field-hint">
                      Завершённые тренировки останутся прежними.
                    </span>
                  </div>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <h2>Когда тренироваться</h2>
                <p className="muted small">
                  Выберите конкретные дни. Расписание повторяется каждую неделю.
                </p>
                <div className="daypick">
                  {weekdays.map((label, index) => (
                    <button
                      type="button"
                      key={label}
                      aria-label={weekdayNames[index]}
                      aria-pressed={days.some(
                        (day) => day.weekday === index + 1,
                      )}
                      onClick={async () => {
                        const weekday = index + 1;
                        if (days.some((d) => d.weekday === weekday)) {
                          if (
                            days.find((d) => d.weekday === weekday)?.exercises
                              .length &&
                            !(await confirmAction(
                              'Убрать день и его упражнения из черновика?',
                            ))
                          )
                            return;
                          setDays(days.filter((d) => d.weekday !== weekday));
                        } else {
                          setDays([...days, { weekday, exercises: [] }]);
                          setSelected(weekday);
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="muted small">
                  Тренировочных дней в неделю: {days.length}
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <div className="field">
                  <span>День программы</span>
                  <Select
                    label="День программы"
                    value={String(activeDay?.weekday ?? days[0]?.weekday)}
                    onChange={(value) => setSelected(Number(value))}
                    options={[...days]
                      .sort((a, b) => a.weekday - b.weekday)
                      .map((day) => ({
                        value: String(day.weekday),
                        label: `${weekdayNames[day.weekday - 1]} · ${day.exercises.length} упр.`,
                      }))}
                  />
                </div>
                {!activeDay && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setSelected(days[0]?.weekday ?? 1)}
                  >
                    Открыть выбранный день
                  </button>
                )}
                <div className="reorder-list" ref={reorderList}>
                  {activeDay?.exercises.map((exercise, index) => (
                    <article
                      className={`exercise-card reorder-card ${drag?.id === exercise.id ? 'is-dragging' : ''} ${expanded.includes(exercise.id) ? '' : 'is-collapsed'}`}
                      key={exercise.id}
                      data-exercise-id={exercise.id}
                      style={dragStyle(exercise.id, index)}
                    >
                      <div className="exercise-drag-header">
                        <button
                          type="button"
                          className="drag-handle"
                          aria-label={`Перетащить ${names[exercise.exerciseId]}`}
                          disabled={activeDay.exercises.length < 2}
                          onPointerDown={(event) =>
                            startDrag(event, exercise.id)
                          }
                          onPointerMove={moveDrag}
                          onPointerUp={() => finishDrag()}
                          onPointerCancel={() => finishDrag(true)}
                          onLostPointerCapture={() => finishDrag(true)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') finishDrag(true);
                            if (event.key === 'ArrowUp' && index > 0) {
                              event.preventDefault();
                              moveExercise(index, index - 1);
                            }
                            if (
                              event.key === 'ArrowDown' &&
                              index < activeDay.exercises.length - 1
                            ) {
                              event.preventDefault();
                              moveExercise(index, index + 1);
                            }
                          }}
                        >
                          <svg
                            width="20"
                            height="24"
                            viewBox="0 0 20 24"
                            aria-hidden="true"
                          >
                            {[6, 12, 18].map((y) => (
                              <g key={y}>
                                <circle cx="7" cy={y} r="1.5" />
                                <circle cx="13" cy={y} r="1.5" />
                              </g>
                            ))}
                          </svg>
                        </button>
                        <h3>{names[exercise.exerciseId]}</h3>
                        <button
                          type="button"
                          className="round-icon exercise-delete"
                          aria-label={`Удалить ${names[exercise.exerciseId]}`}
                          onClick={() =>
                            updateExercises((items) =>
                              items
                                .filter((item) => item.id !== exercise.id)
                                .map((item, i) => ({
                                  ...item,
                                  position: i + 1,
                                })),
                            )
                          }
                        >
                          <Icon name="trash" />
                        </button>
                        <button
                          type="button"
                          className="round-icon"
                          aria-expanded={expanded.includes(exercise.id)}
                          aria-controls={`exercise-settings-${exercise.id}`}
                          aria-label={`${expanded.includes(exercise.id) ? 'Свернуть' : 'Развернуть'} ${names[exercise.exerciseId]}`}
                          onClick={() =>
                            setExpanded((items) =>
                              items.includes(exercise.id)
                                ? items.filter((id) => id !== exercise.id)
                                : [...items, exercise.id],
                            )
                          }
                        >
                          <Icon
                            name={
                              expanded.includes(exercise.id)
                                ? 'chevron-up'
                                : 'chevron-down'
                            }
                          />
                        </button>
                      </div>
                      <div
                        className="exercise-settings"
                        id={`exercise-settings-${exercise.id}`}
                        onInvalidCapture={(event) => {
                          if (expanded.includes(exercise.id)) return;
                          event.preventDefault();
                          const field = event.target as HTMLElement;
                          setExpanded((items) =>
                            items.includes(exercise.id)
                              ? items
                              : [...items, exercise.id],
                          );
                          requestAnimationFrame(() => field.focus());
                        }}
                      >
                        <div className="target-head" aria-hidden="true">
                          <span>Подход</span>
                          <span>Кг</span>
                          <span>От</span>
                          <span>До</span>
                        </div>
                        {exercise.targets.map((target, targetIndex) => (
                          <div className="target-group" key={target.id}>
                            <div className="target-row">
                              <span>{targetIndex + 1}</span>
                              <input
                                aria-label={`Вес подхода ${targetIndex + 1}, кг`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max="99999.99"
                                step="0.01"
                                required
                                value={target.weightKg ?? ''}
                                onChange={(e) =>
                                  updateExercises((items) =>
                                    items.map((item) =>
                                      item.id === exercise.id
                                        ? {
                                            ...item,
                                            targets: item.targets.map((t) =>
                                              t.id === target.id
                                                ? {
                                                    ...t,
                                                    weightKg:
                                                      e.target.value === ''
                                                        ? null
                                                        : e.target.value,
                                                  }
                                                : t,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <input
                                aria-label={`Минимум повторений подхода ${targetIndex + 1}`}
                                type="number"
                                min="1"
                                max="1000"
                                required
                                value={target.repsMin}
                                onChange={(e) =>
                                  updateExercises((items) =>
                                    items.map((item) =>
                                      item.id === exercise.id
                                        ? {
                                            ...item,
                                            targets: item.targets.map((t) =>
                                              t.id === target.id
                                                ? {
                                                    ...t,
                                                    repsMin: Number(
                                                      e.target.value,
                                                    ),
                                                  }
                                                : t,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <input
                                aria-label={`Максимум повторений подхода ${targetIndex + 1}`}
                                type="number"
                                min={target.repsMin}
                                max="1000"
                                required
                                value={target.repsMax}
                                onChange={(e) =>
                                  updateExercises((items) =>
                                    items.map((item) =>
                                      item.id === exercise.id
                                        ? {
                                            ...item,
                                            targets: item.targets.map((t) =>
                                              t.id === target.id
                                                ? {
                                                    ...t,
                                                    repsMax: Number(
                                                      e.target.value,
                                                    ),
                                                  }
                                                : t,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <button
                              type="button"
                              className="text-button target-copy"
                              disabled={exercise.targets.length < 2}
                              aria-label={`Повторить параметры подхода ${targetIndex + 1} во всех подходах`}
                              onClick={() =>
                                updateExercises((items) =>
                                  items.map((item) =>
                                    item.id === exercise.id
                                      ? {
                                          ...item,
                                          targets: item.targets.map(
                                            (other) => ({
                                              ...other,
                                              weightKg: target.weightKg,
                                              repsMin: target.repsMin,
                                              repsMax: target.repsMax,
                                            }),
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            >
                              Повторить во всех
                            </button>
                          </div>
                        ))}
                        <p className="field-hint">
                          Целевые повторения: от / до.
                        </p>
                        <div className="actions">
                          <button
                            type="button"
                            className="text-button"
                            disabled={exercise.targets.length >= 100}
                            onClick={() =>
                              updateExercises((items) =>
                                items.map((item) =>
                                  item.id === exercise.id
                                    ? {
                                        ...item,
                                        targets: [
                                          ...item.targets,
                                          freshTarget(item.targets.length + 1),
                                        ],
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            Добавить подход
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={exercise.targets.length <= 1}
                            onClick={() =>
                              updateExercises((items) =>
                                items.map((item) =>
                                  item.id === exercise.id
                                    ? {
                                        ...item,
                                        targets: item.targets.slice(0, -1),
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            Убрать последний
                          </button>
                        </div>
                        <label className="field">
                          Заметка к упражнению
                          <textarea
                            maxLength={10000}
                            value={exercise.note}
                            onChange={(e) =>
                              updateExercises((items) =>
                                items.map((item) =>
                                  item.id === exercise.id
                                    ? { ...item, note: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="sr-only" role="status">
                  {drag ? `Перемещение: позиция ${drag.to + 1}` : ''}
                </p>
                {activeDay && (
                  <button
                    type="button"
                    className="primary"
                    disabled={activeDay.exercises.length >= 100}
                    onClick={() => setPicker(true)}
                  >
                    Добавить упражнение
                  </button>
                )}
                {activeDay &&
                  activeDay.exercises.length > 0 &&
                  days.length > 1 && (
                    <button
                      type="button"
                      className="text-button wide"
                      onClick={() => {
                        setTargets([]);
                        setCopying(!copying);
                      }}
                    >
                      Скопировать в другие дни
                    </button>
                  )}
                {copying && (
                  <section className="surface">
                    <h3>Выберите дни для копирования</h3>
                    {days
                      .filter((day) => day.weekday !== selected)
                      .map((day) => (
                        <label className="check-label" key={day.weekday}>
                          <input
                            type="checkbox"
                            checked={targets.includes(day.weekday)}
                            onChange={(e) =>
                              setTargets(
                                e.target.checked
                                  ? [...targets, day.weekday]
                                  : targets.filter(
                                      (value) => value !== day.weekday,
                                    ),
                              )
                            }
                          />
                          {weekdayNames[day.weekday - 1]}
                        </label>
                      ))}
                    <button
                      type="button"
                      className="secondary-button wide"
                      disabled={!targets.length}
                      onClick={async () => {
                        if (
                          days.some(
                            (day) =>
                              targets.includes(day.weekday) &&
                              day.exercises.length,
                          ) &&
                          !(await confirmAction(
                            'Заменить существующие упражнения выбранных дней?',
                          ))
                        )
                          return;
                        setDays(
                          days.map((day) =>
                            targets.includes(day.weekday)
                              ? {
                                  ...day,
                                  exercises: copyExercises(
                                    activeDay?.exercises ?? [],
                                  ),
                                }
                              : day,
                          ),
                        );
                        setCopying(false);
                      }}
                    >
                      Скопировать набор
                    </button>
                  </section>
                )}
                <p className="field-hint">
                  Заполнено дней:{' '}
                  {days.filter((day) => day.exercises.length).length} из{' '}
                  {days.length}
                </p>
              </>
            )}
            {step === 3 && (
              <>
                <h2>{name}</h2>
                <p className="muted">
                  {dateLabel(start)} — {dateLabel(end)}
                </p>
                {days.map((day) => (
                  <section className="section" key={day.weekday}>
                    <h3>{weekdayNames[day.weekday - 1]}</h3>
                    {day.exercises.map((exercise) => (
                      <div className="review-exercise" key={exercise.id}>
                        <strong>{names[exercise.exerciseId]}</strong>
                        <p className="small muted">
                          {exercise.targets
                            .map(
                              (target) =>
                                `${target.weightKg ?? '—'} кг × ${target.repsMin === target.repsMax ? target.repsMin : `${target.repsMin}–${target.repsMax}`}`,
                            )
                            .join(' · ')}
                        </p>
                      </div>
                    ))}
                  </section>
                ))}
                <p className="field-hint section">
                  План сохраняется отдельной версией. Фактическая история не
                  изменяется.
                </p>
              </>
            )}
            <p role="alert" className="form-message">
              {action.error}
            </p>
            <div className="actions">
              {step > 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep(step - 1)}
                >
                  Назад
                </button>
              )}
              <button
                className="primary"
                disabled={
                  (step === 1 && !days.length) || (step >= 2 && !validDays)
                }
              >
                {action.busy
                  ? 'Сохраняем…'
                  : step === 3
                    ? 'Сохранить программу'
                    : 'Продолжить'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
