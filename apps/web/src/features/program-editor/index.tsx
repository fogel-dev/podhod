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
export { ExerciseLibrary } from './library';
type DraftDay = { weekday: number; exercises: PlanExerciseInput[] };
const freshTarget = (position: number) => ({
  id: crypto.randomUUID(),
  position,
  weightKg: '0.00',
  repsMin: 10,
  repsMax: 10,
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
    initial?.endDate ?? addDays(today(timezone), 41),
  );
  const [effective, setEffective] = useState(today(timezone));
  const [zone, setZone] = useState(initial?.timezone ?? timezone);
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
  const [selected, setSelected] = useState(days[0]?.weekday ?? 1);
  const [picker, setPicker] = useState(false);
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
  function addExercise(exercise: Exercise) {
    setNames((current) => ({ ...current, [exercise.id]: exercise.name }));
    updateExercises((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        exerciseId: exercise.id,
        position: items.length + 1,
        note: '',
        targets: [freshTarget(1), freshTarget(2), freshTarget(3)],
      },
    ]);
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
          <ExerciseLibrary context={context} onSelect={addExercise} />
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 3) {
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
                  <label className="field">
                    Начало
                    <input
                      type="date"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Окончание
                    <input
                      type="date"
                      required
                      min={start}
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                </div>
                <div className="segment">
                  {[6, 12].map((weeks) => (
                    <button
                      type="button"
                      key={weeks}
                      aria-pressed={end === addDays(start, weeks * 7 - 1)}
                      onClick={() => setEnd(addDays(start, weeks * 7 - 1))}
                    >
                      {weeks} недель
                    </button>
                  ))}
                </div>
                <label className="field">
                  Часовой пояс
                  <input
                    required
                    maxLength={100}
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  />
                </label>
                {program && (
                  <label className="field">
                    Применить изменения с
                    <input
                      type="date"
                      required
                      min={today(timezone)}
                      max={end}
                      value={effective}
                      onChange={(e) => setEffective(e.target.value)}
                    />
                    <span className="field-hint">
                      Завершённые тренировки останутся прежними.
                    </span>
                  </label>
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
                      onClick={() => {
                        const weekday = index + 1;
                        if (days.some((d) => d.weekday === weekday)) {
                          if (
                            days.find((d) => d.weekday === weekday)?.exercises
                              .length &&
                            !window.confirm(
                              'Убрать день и его упражнения из черновика?',
                            )
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
                <label className="field">
                  День программы
                  <select
                    value={activeDay?.weekday ?? days[0]?.weekday}
                    onChange={(e) => setSelected(Number(e.target.value))}
                  >
                    {[...days]
                      .sort((a, b) => a.weekday - b.weekday)
                      .map((day) => (
                        <option key={day.weekday} value={day.weekday}>
                          {weekdayNames[day.weekday - 1]} ·{' '}
                          {day.exercises.length} упр.
                        </option>
                      ))}
                  </select>
                </label>
                {!activeDay && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setSelected(days[0]?.weekday ?? 1)}
                  >
                    Открыть выбранный день
                  </button>
                )}
                {activeDay?.exercises.map((exercise, index) => (
                  <article className="exercise-card" key={exercise.id}>
                    <div className="row">
                      <h3>{names[exercise.exerciseId]}</h3>
                      <button
                        type="button"
                        className="text-button"
                        aria-label={`Удалить ${names[exercise.exerciseId]}`}
                        onClick={() =>
                          updateExercises((items) =>
                            items
                              .filter((item) => item.id !== exercise.id)
                              .map((item, i) => ({ ...item, position: i + 1 })),
                          )
                        }
                      >
                        Убрать
                      </button>
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className="text-button"
                        disabled={index === 0}
                        onClick={() =>
                          updateExercises((items) => {
                            const reordered = [...items];
                            [reordered[index - 1], reordered[index]] = [
                              reordered[index]!,
                              reordered[index - 1]!,
                            ];
                            return reordered.map((item, i) => ({
                              ...item,
                              position: i + 1,
                            }));
                          })
                        }
                      >
                        Выше
                      </button>
                    </div>
                    <div className="target-head" aria-hidden="true">
                      <span>Подход</span>
                      <span>Кг</span>
                      <span>От</span>
                      <span>До</span>
                    </div>
                    {exercise.targets.map((target, targetIndex) => (
                      <div className="target-row" key={target.id}>
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
                                              repsMin: Number(e.target.value),
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
                                              repsMax: Number(e.target.value),
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
                    ))}
                    <p className="field-hint">Целевые повторения: от / до.</p>
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
                  </article>
                ))}
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
                      onClick={() => {
                        if (
                          days.some(
                            (day) =>
                              targets.includes(day.weekday) &&
                              day.exercises.length,
                          ) &&
                          !window.confirm(
                            'Заменить существующие упражнения выбранных дней?',
                          )
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
                <p className="small muted">{zone}</p>
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
