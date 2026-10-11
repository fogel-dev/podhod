import { useCallback } from 'react';
import { getWorkout } from '@/entities/workout';
import type { Session } from '@/entities/user';
import { WorkoutSession } from '@/features/workout-session';
import { useResource } from '@/shared/lib/resource';
import type { Navigate } from '@/shared/lib/navigation';
import { ResourceState } from '@/shared/ui/kit';
export function WorkoutPage({
  id,
  session,
  navigate,
  onChanged,
}: {
  id: string;
  session: Session;
  navigate: Navigate;
  onChanged: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => getWorkout(id, signal),
    [id],
  );
  const resource = useResource(id, load);
  return resource.data ? (
    <WorkoutSession
      key={resource.data.version}
      initial={resource.data}
      context={session}
      navigate={navigate}
      onChanged={onChanged}
    />
  ) : (
    <ResourceState
      layout="workout"
      error={resource.error}
      retry={resource.reload}
    />
  );
}
