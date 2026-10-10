import { confirmAction } from '@/shared/lib/confirmation';
import { useCallback } from 'react';
import { archiveProgram, listPrograms } from '@/entities/program';
import type { Session } from '@/entities/user';
import type { Navigate } from '@/shared/lib/navigation';
import { useAction } from '@/shared/lib/action';
import { dateLabel, today, weekdayNames } from '@/shared/lib/date';
import { useResource } from '@/shared/lib/resource';
import { Empty, PageTitle, ResourceState } from '@/shared/ui/kit';
export function ProgramPage({
  session,
  navigate,
}: {
  session: Session;
  navigate: Navigate;
}) {
  const action = useAction();
  const load = useCallback((signal: AbortSignal) => listPrograms(signal), []);
  const resource = useResource('programs', load);
  return (
    <>
      <PageTitle title="Программа" subtitle="Ваш тренировочный план" />
      <div className="actions">
        <button
          className="primary"
          onClick={() => navigate({ view: 'program-editor' })}
        >
          Создать программу
        </button>
      </div>
      <button
        className="text-button wide"
        onClick={() => navigate({ view: 'library' })}
      >
        Библиотека упражнений
      </button>
      <p role="alert">{action.error}</p>
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
              </div>
            ))}
            <div className="actions">
              <button
                className="text-button"
                onClick={() =>
                  navigate({ view: 'program-editor', id: program.id })
                }
              >
                Изменить
              </button>
              <button
                className="text-button"
                disabled={action.busy}
                onClick={async () => {
                  if (
                    !(await confirmAction(
                      'Завершить программу с сегодняшнего дня? Сохранённая история останется.',
                    ))
                  )
                    return;
                  void action.run(async () => {
                    await archiveProgram(
                      session,
                      program,
                      today(program.currentRevision.timezone),
                    );
                    resource.reload();
                  });
                }}
              >
                Завершить программу
              </button>
            </div>
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
