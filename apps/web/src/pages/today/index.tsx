import { useCallback } from 'react';
import { getDay, planStatus } from '@/entities/calendar';
import type { Session } from '@/entities/user';
import { MonthCalendar } from '@/widgets/month-calendar';
import { dateLabel, today } from '@/shared/lib/date';
import { useResource } from '@/shared/lib/resource';
import type { Navigate } from '@/shared/lib/navigation';
import { PageTitle, ResourceState } from '@/shared/ui/kit';
export function TodayPage({
  session,
  timezone,
  navigate,
  month,
  onMonth,
}: {
  session: Session;
  timezone: string;
  navigate: Navigate;
  month: string;
  onMonth: (month: string) => void;
}) {
  const date = today(timezone);
  const load = useCallback(
    (signal: AbortSignal) => getDay(date, signal),
    [date],
  );
  const resource = useResource(date, load);
  const workout =
    resource.data?.workouts.find((value) => value.status === 'active') ??
    resource.data?.workouts.find((value) => value.status === 'completed');
  return (
    <>
      <PageTitle title="Сегодня" subtitle={dateLabel(date)} />
      {!resource.data ? (
        <ResourceState
          layout="today"
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <section
          className={`surface training-card ${!workout && !resource.data.plans.some((p) => p.status === 'planned') ? 'recovery-card' : ''}`}
        >
          <p className="eyebrow">
            {resource.data.workouts.some((w) => w.status === 'completed')
              ? 'Тренировка сохранена'
              : resource.data.plans.some((p) => p.status === 'planned')
                ? 'Ваша тренировка'
                : 'Сегодня'}
          </p>
          <h2>
            {resource.data.plans.some((p) => p.status === 'planned')
              ? 'Всё готово к тренировке'
              : workout
                ? workout.status === 'active'
                  ? 'Тренировка продолжается'
                  : 'Результат тренировки'
                : 'День восстановления'}
          </h2>
          {(workout ||
            resource.data.plans.some((p) => p.status === 'planned')) && (
            <p className="muted small">
              {resource.data.plans.length
                ? resource.data.plans
                    .map((p) => planStatus[p.status])
                    .join(' · ')
                : 'Планы, результаты и заметки — в календаре.'}
            </p>
          )}
          <button
            className="primary"
            onClick={() =>
              workout
                ? navigate({ view: 'workout', id: workout.id })
                : navigate({ view: 'day', date })
            }
          >
            {workout?.status === 'active'
              ? 'Продолжить тренировку'
              : workout
                ? 'Посмотреть результат'
                : resource.data.plans.some((p) => p.status === 'planned')
                  ? 'Открыть тренировку'
                  : 'Открыть день'}
          </button>
        </section>
      )}
      <MonthCalendar
        context={session}
        month={month}
        onMonth={onMonth}
        currentDate={date}
        onDay={(value) => navigate({ view: 'day', date: value })}
      />
      <button
        className="text-button wide program-link"
        onClick={() => navigate({ view: 'program' })}
      >
        Открыть программу
      </button>
    </>
  );
}
