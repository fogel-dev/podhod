import { useCallback, useRef } from 'react';
import { getProgramRevision } from '@/entities/program';
import type { PlanOccurrence } from '@/entities/calendar';
import { planStatus } from '@/entities/calendar';
import { getActiveWorkout, startWorkout } from '@/entities/workout';
import type { components, WriteContext } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { useAction } from '@/shared/lib/action';
import { dateLabel, isoWeekday, today } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { ResourceState } from '@/shared/ui/kit';
export function PlanCard({
  plan,
  context,
  navigate,
  onChanged,
}: {
  plan: PlanOccurrence;
  context: WriteContext;
  navigate: Navigate;
  onChanged: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) =>
      getProgramRevision(plan.programId, plan.programRevisionId, signal),
    [plan.programId, plan.programRevisionId],
  );
  const resource = useResource(plan.programRevisionId, load);
  const action = useAction();
  const pending = useRef<components['schemas']['StartWorkout'] | null>(null);
  const day = resource.data?.days.find(
    (value) => value.weekday === isoWeekday(plan.sourceDate),
  );
  return (
    <section className="surface">
      <div className="row">
        <h2>{planStatus[plan.status]}</h2>
        <span className="small muted">{dateLabel(plan.date)}</span>
      </div>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          {day?.exercises.map((exercise) => (
            <div className="review-exercise" key={exercise.id}>
              <strong>{exercise.nameSnapshot}</strong>
              <p className="small muted">
                {exercise.targets.length} подходов ·{' '}
                {exercise.targets
                  .map(
                    (target) =>
                      `${target.weightKg ?? '—'} кг × ${target.repsMin === target.repsMax ? target.repsMin : `${target.repsMin}–${target.repsMax}`}`,
                  )
                  .join(' / ')}
              </p>
            </div>
          ))}
          {plan.status === 'moved' && (
            <p className="small muted">
              Перенос с {dateLabel(plan.sourceDate)} на {dateLabel(plan.date)}
            </p>
          )}
          {day &&
            (plan.status === 'planned' ||
              plan.status === 'missed' ||
              plan.status === 'started') && (
              <button
                className="primary section"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const active = await getActiveWorkout();
                    if (active) {
                      navigate({ view: 'workout', id: active.id });
                      return;
                    }
                    pending.current ??= {
                      id: crypto.randomUUID(),
                      programRevisionId: plan.programRevisionId,
                      scheduledDate: plan.sourceDate,
                      localDate: today(resource.data!.timezone),
                      timezone: resource.data!.timezone,
                      startedAt: new Date().toISOString(),
                      exercises: day.exercises.map((exercise) => ({
                        id: crypto.randomUUID(),
                        exerciseId: exercise.exerciseId,
                        position: exercise.position,
                        note: exercise.note,
                        targets: exercise.targets.map((target) => ({
                          ...target,
                          id: crypto.randomUUID(),
                        })),
                      })),
                    };
                    const workout = await startWorkout(
                      context,
                      pending.current,
                    );
                    pending.current = null;
                    onChanged();
                    navigate({ view: 'workout', id: workout.id });
                  })
                }
              >
                {action.busy
                  ? 'Запускаем…'
                  : plan.status === 'started'
                    ? 'Продолжить тренировку'
                    : 'Начать тренировку'}
              </button>
            )}
          <p role="alert" className="form-message">
            {action.error}
          </p>
        </>
      )}
    </section>
  );
}
