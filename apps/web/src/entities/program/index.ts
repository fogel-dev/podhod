import { request } from '@/shared/api';
import type { components } from '@/shared/api';
export type Program = components['schemas']['Program'];
export type ProgramRevision = components['schemas']['ProgramRevision'];
export const listPrograms = (signal?: AbortSignal) =>
  request<components['schemas']['ProgramPage']>('/programs?limit=100', {
    signal: signal ?? null,
  });
export const getProgram = (id: string, signal?: AbortSignal) =>
  request<Program>(`/programs/${id}`, { signal: signal ?? null });
