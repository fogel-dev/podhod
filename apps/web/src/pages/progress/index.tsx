import { useCallback } from 'react';
import { getProgressExercises } from '@/entities/progress';
import type { Navigate } from '@/shared/lib/navigation';
import { ProgressView } from './view';
import { useResource } from '@/shared/lib/resource';
import { Empty, PageTitle, ResourceState } from '@/shared/ui/kit';
export function ProgressPage({
  timezone,
  navigate,
}: {
  timezone: string;
  navigate: Navigate;
}) {
  const load = useCallback(
    (signal: AbortSignal) => getProgressExercises(signal),
    [],
  );
  const resource = useResource('progress-exercises', load);
  return (
    <>
      <PageTitle title="Прогресс" subtitle="По завершённым тренировкам" />
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : resource.data.items.length ? (
        <ProgressView
          exercises={resource.data.items}
          timezone={timezone}
          navigate={navigate}
        />
      ) : (
        <Empty title="Первые результаты впереди">
          <p className="muted">
            Завершите тренировку, чтобы увидеть фактический прогресс.
          </p>
          <button
            className="primary"
            onClick={() => navigate({ view: 'today' })}
          >
            К тренировкам
          </button>
        </Empty>
      )}
      {resource.data?.nextCursor && (
        <p className="field-hint">
          Показаны первые 100 упражнений с результатами.
        </p>
      )}
    </>
  );
}
