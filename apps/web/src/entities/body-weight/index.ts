import { request, write } from '@/shared/api';
import type { WriteContext, components } from '@/shared/api';
export type BodyWeight = components['schemas']['BodyWeight'];
export const saveBodyWeight = (
  context: WriteContext,
  date: string,
  weightKg: string,
  version: number,
) =>
  write<BodyWeight>(
    `/days/${date}/body-weight`,
    { weightKg },
    context,
    'PUT',
    version,
  );
export const getBodyWeightHistory = (
  from: string,
  to: string,
  signal: AbortSignal,
) =>
  request<components['schemas']['BodyWeightHistory']>(
    `/body-weight?${new URLSearchParams({ from, to })}`,
    { signal },
  );
