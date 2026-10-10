import { useCallback } from 'react';
import { request } from '@/shared/api';
import type { components } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { Empty, PageTitle, ResourceState } from '@/shared/ui/kit';
export function ProgressPage() {
  const load = useCallback(
    (signal: AbortSignal) =>
      request<components['schemas']['ExercisePage']>('/progress/exercises', {
        signal,
      }),
    [],
  );
  const resource = useResource('progress-exercises', load);
  return (
    <>
      <PageTitle title="Прогресс" subtitle="По завершённым тренировкам" />
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : resource.data.items.length ? (
        resource.data.items.map((exercise) => (
          <section className="surface" key={exercise.id}>
            <h2>{exercise.name}</h2>
          </section>
        ))
      ) : (
        <Empty title="Первые результаты впереди">
          <p className="muted">
            Завершите тренировку, чтобы увидеть фактический прогресс.
          </p>
        </Empty>
      )}
    </>
  );
}
