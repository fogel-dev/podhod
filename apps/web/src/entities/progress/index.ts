import { request } from '@/shared/api';
import type { components } from '@/shared/api';
export type Progress = components['schemas']['Progress'];
export const getProgressExercises = (signal: AbortSignal) =>
  request<components['schemas']['ExercisePage']>(
    '/progress/exercises?limit=100',
    { signal },
  );
export const getProgress = (
  exercise: string,
  from: string,
  to: string,
  metric: Progress['metric'],
  bucket: Progress['bucket'],
  signal: AbortSignal,
) =>
  request<Progress>(
    `/progress/exercises/${exercise}?${new URLSearchParams({ from, to, metric, bucket })}`,
    { signal },
  );
export const metricLabels: Record<Progress['metric'], string> = {
  maxWeight: 'Рабочий вес',
  completedSets: 'Подходы',
  totalReps: 'Повторения',
  volume: 'Объём',
};
export const unitLabels = {
  kg: 'кг',
  sets: 'подходов',
  reps: 'повторений',
  kg_reps: 'кг × повторения',
};
export { decimalLabel } from '@/shared/lib/decimal';
