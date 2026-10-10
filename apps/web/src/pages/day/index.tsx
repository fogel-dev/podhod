import { useCallback } from 'react';
import { getDay, planStatus } from '@/entities/calendar';
import { dateLabel } from '@/shared/lib/date';
import { useResource } from '@/shared/lib/resource';
import { Empty, PageTitle, ResourceState } from '@/shared/ui/kit';
export function DayPage({ date }: { date: string }) {
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
          {resource.data.plans.map((plan) => (
            <section className="surface" key={plan.programId}>
              <h2>{planStatus[plan.status]}</h2>
              <p className="muted">{dateLabel(plan.date)}</p>
            </section>
          ))}
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
