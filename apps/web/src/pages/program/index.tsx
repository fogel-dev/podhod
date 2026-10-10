import { useCallback } from 'react';
import { listPrograms } from '@/entities/program';
import { dateLabel, weekdayNames } from '@/shared/lib/date';
import { useResource } from '@/shared/lib/resource';
import { Empty, PageTitle, ResourceState } from '@/shared/ui/kit';
export function ProgramPage() {
  const load = useCallback((signal: AbortSignal) => listPrograms(signal), []);
  const resource = useResource('programs', load);
  return (
    <>
      <PageTitle title="Программа" subtitle="Ваш тренировочный план" />
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : resource.data.items.length ? (
        resource.data.items.map((program) => (
          <section className="surface" key={program.id}>
            <h2>{program.name}</h2>
            <p className="muted small">
              {dateLabel(program.currentRevision.startDate)} —{' '}
              {dateLabel(program.currentRevision.endDate)}
            </p>
            {program.currentRevision.days.map((day) => (
              <div className="section" key={day.weekday}>
                <h3>{weekdayNames[day.weekday - 1]}</h3>
                {day.exercises.map((exercise) => (
                  <p key={exercise.id}>
                    {exercise.nameSnapshot} · {exercise.targets.length} подходов
                  </p>
                ))}
              </div>
            ))}
          </section>
        ))
      ) : (
        <Empty title="Пока нет программы">
          <p className="muted">Ваше расписание будет здесь.</p>
        </Empty>
      )}
    </>
  );
}
