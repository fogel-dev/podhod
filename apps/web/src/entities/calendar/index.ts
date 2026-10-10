import { request } from '@/shared/api';
import type { components } from '@/shared/api';
export type Calendar = components['schemas']['Calendar'];
export type Day = components['schemas']['Day'];
export type PlanOccurrence = components['schemas']['PlanOccurrence'];
export const getCalendar = (month: string, signal: AbortSignal) =>
  request<Calendar>(`/calendar?month=${month}`, { signal: signal ?? null });
export const getDay = (date: string, signal?: AbortSignal) =>
  request<Day>(`/days/${date}`, { signal: signal ?? null });
export const planStatus = {
  planned: 'По плану',
  missed: 'Пропущена',
  cancelled: 'Отменена',
  moved: 'Перенесена',
  started: 'В процессе',
  completed: 'Завершена',
};
