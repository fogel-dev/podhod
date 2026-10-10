import { request, write } from '@/shared/api';
import type { WriteContext } from '@/shared/api';
import type { components } from '@/shared/api';
export type Program = components['schemas']['Program'];
export type ProgramRevision = components['schemas']['ProgramRevision'];
export type ProgramRevisionInput =
  components['schemas']['ProgramRevisionInput'];
export const getProgramRevision = (
  id: string,
  revisionId: string,
  signal: AbortSignal,
) =>
  request<ProgramRevision>(`/programs/${id}/revisions/${revisionId}`, {
    signal,
  });
export const createProgram = (
  context: WriteContext,
  input: components['schemas']['CreateProgram'],
) => write<Program>('/programs', input, context);
export const publishProgram = (
  context: WriteContext,
  program: Program,
  revision: ProgramRevisionInput,
) =>
  write<Program>(
    `/programs/${program.id}/revisions`,
    { expectedVersion: program.version, revision },
    context,
  );
export const archiveProgram = (
  context: WriteContext,
  program: Program,
  effectiveFrom: string,
) =>
  write<Program>(
    `/programs/${program.id}/archive`,
    { expectedVersion: program.version, effectiveFrom },
    context,
  );
export const listPrograms = (signal?: AbortSignal) =>
  request<components['schemas']['ProgramPage']>('/programs?limit=100', {
    signal: signal ?? null,
  });
export const getProgram = (id: string, signal?: AbortSignal) =>
  request<Program>(`/programs/${id}`, { signal: signal ?? null });
