import { useCallback, useState } from 'react';
import { getDay, planStatus } from '@/entities/calendar';
import { MonthCalendar } from '@/widgets/month-calendar';
import { dateLabel, today } from '@/shared/lib/date';
import { useResource } from '@/shared/lib/resource';
import type { Navigate } from '@/shared/lib/navigation';
import { PageTitle, ResourceState } from '@/shared/ui/kit';
export function TodayPage({
  timezone,
  navigate,
}: {
  timezone: string;
  navigate: Navigate;
}) {
  const date = today(timezone);
  const [month, setMonth] = useState(date.slice(0, 7));
  const load = useCallback(
    (signal: AbortSignal) => getDay(date, signal),
    [date],
  );
  const resource = useResource(date, load);
  return (
    <>
      <PageTitle title="Сегодня" subtitle={dateLabel(date)} />
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : (
        <section className="surface training-card">
          <p className="eyebrow">
            {resource.data.workouts.some((w) => w.status === 'completed')
              ? 'Тренировка сохранена'
              : resource.data.plans.some((p) => p.status === 'planned')
                ? 'Ваша тренировка'
                : 'День восстановления'}
          </p>
          <h2>
            {resource.data.plans.some((p) => p.status === 'planned')
              ? 'Всё готово к тренировке'
              : 'Ваш личный дневник'}
          </h2>
          <p className="muted small">
            {resource.data.plans.length
              ? resource.data.plans.map((p) => planStatus[p.status]).join(' · ')
              : 'Планы, результаты и заметки — в календаре.'}
          </p>
          <button
            className="primary"
            onClick={() => navigate({ view: 'day', date })}
          >
            Открыть день
          </button>
        </section>
      )}
      <MonthCalendar
        month={month}
        onMonth={setMonth}
        currentDate={date}
        onDay={(value) => navigate({ view: 'day', date: value })}
      />
      <button
        className="text-button wide"
        onClick={() => navigate({ view: 'program' })}
      >
        Открыть программу
      </button>
    </>
  );
}
