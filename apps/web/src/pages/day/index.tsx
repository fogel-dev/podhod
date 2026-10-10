import { useCallback } from 'react';
import { getDay, planStatus } from '@/entities/calendar';
import { PlanCard } from '@/features/start-workout';
import type { Session } from '@/entities/user';
import type { Navigate } from '@/shared/lib/navigation';
import { dateLabel } from '@/shared/lib/date';
import { useResource } from '@/shared/lib/resource';
import { Empty, PageTitle, ResourceState } from '@/shared/ui/kit';
export function DayPage({
  date,
  session,
  navigate,
  onChanged,
}: {
  date: string;
  session: Session;
  navigate: Navigate;
  onChanged: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => getDay(date, signal),
    [date],
  );
  const resource = useResource(date, load);
  return (
    <>
      <PageTitle title={dateLabel(date)} subtitle="Дневник" />
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          {resource.data.plans.map((plan) =>
            plan.programRevisionId ? (
              <PlanCard
                key={plan.programId}
                plan={plan}
                context={session}
                navigate={navigate}
                onChanged={onChanged}
              />
            ) : (
              <section className="surface" key={plan.programId}>
                <h2>{planStatus[plan.status]}</h2>
                <p className="muted">{dateLabel(plan.date)}</p>
              </section>
            ),
          )}
          {resource.data.workouts.map((workout) => (
            <section className="surface" key={workout.id}>
              <h2>
                {workout.status === 'completed'
                  ? 'Результат тренировки'
                  : 'Активная тренировка'}
              </h2>
              <p>
                {workout.summary.completedSets} подходов ·{' '}
                {workout.summary.totalReps} повторений
              </p>
              <button
                className="text-button wide"
                onClick={() => navigate({ view: 'workout', id: workout.id })}
              >
                {workout.status === 'completed'
                  ? 'Посмотреть результат'
                  : 'Продолжить тренировку'}
              </button>
            </section>
          ))}
          {resource.data.note && (
            <section className="section">
              <h2>Заметка</h2>
              <p className="preserve-lines">{resource.data.note.body}</p>
            </section>
          )}
          {!resource.data.plans.length &&
            !resource.data.workouts.length &&
            !resource.data.note && (
              <Empty title="Записей пока нет">
                <p className="muted">
                  Здесь будут планы и результаты этого дня.
                </p>
              </Empty>
            )}
        </>
      )}
    </>
  );
}
