import { request, write } from '@/shared/api';
import type { components, WriteContext } from '@/shared/api';
export type Workout = components['schemas']['Workout'];
export type WorkoutExercise = components['schemas']['WorkoutExercise'];
export type WorkoutSet = components['schemas']['WorkoutSet'];
export type WorkoutCommand = components['schemas']['WorkoutCommand'];
export const getActiveWorkout = (signal?: AbortSignal) =>
  request<Workout | null>('/workouts/active', { signal: signal ?? null });
export const getWorkout = (id: string, signal?: AbortSignal) =>
  request<Workout>(`/workouts/${id}`, { signal: signal ?? null });
export const startWorkout = (
  context: WriteContext,
  input: components['schemas']['StartWorkout'],
) => write<Workout>('/workouts', input, context);
export async function commandWorkout(
  context: WriteContext,
  command: WorkoutCommand,
) {
  const result = await write<components['schemas']['CommandResult']>(
    `/workouts/${command.aggregateId}/commands`,
    command,
    context,
  );
  if (
    !result.aggregate ||
    !('currentRevision' in result.aggregate) ||
    !('status' in result.aggregate)
  )
    throw new Error('Сервер не вернул тренировку');
  return result.aggregate as Workout;
}
export const getWorkoutHistory = (id: string, signal: AbortSignal) =>
  request<components['schemas']['WorkoutRevisionPage']>(
    `/workouts/${id}/revisions?limit=100`,
    { signal },
  );
