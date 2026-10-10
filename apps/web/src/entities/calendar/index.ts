import { request, write } from '@/shared/api';
import type { WriteContext } from '@/shared/api';
import type { components } from '@/shared/api';
export type Calendar = components['schemas']['Calendar'];
export type Day = components['schemas']['Day'];
export type PlanOccurrence = components['schemas']['PlanOccurrence'];
export type DayNote = components['schemas']['DayNote'];
export const putNote = (
  context: WriteContext,
  date: string,
  body: string,
  version: number,
  id: string,
) =>
  write<DayNote>(
    `/days/${date}/notes/${id}`,
    { body },
    context,
    'PUT',
    version,
  );
export const deleteNote = (context: WriteContext, note: DayNote) =>
  write<void>(
    `/days/${note.localDate}/notes/${note.id}`,
    undefined,
    context,
    'DELETE',
    note.version,
  );
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
