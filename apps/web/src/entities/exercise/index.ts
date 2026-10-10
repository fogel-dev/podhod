import { request, write } from '@/shared/api';
import type { components, WriteContext } from '@/shared/api';
export type Exercise = components['schemas']['Exercise'];
export type PlanExerciseInput = components['schemas']['PlanExerciseInput'];
export const listExercises = (
  query: string,
  archived: boolean,
  signal: AbortSignal,
) =>
  request<components['schemas']['ExercisePage']>(
    `/exercises?limit=100&q=${encodeURIComponent(query)}&includeArchived=${archived}`,
    { signal },
  );
export const createExercise = (
  context: WriteContext,
  input: components['schemas']['CreateExercise'],
) => write<Exercise>('/exercises', input, context);
export const updateExercise = (
  context: WriteContext,
  exercise: Exercise,
  patch: components['schemas']['ExercisePatch'],
) =>
  write<Exercise>(
    `/exercises/${exercise.id}`,
    patch,
    context,
    'PATCH',
    exercise.version,
  );
