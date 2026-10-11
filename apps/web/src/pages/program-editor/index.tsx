import { useCallback } from 'react';
import { ProgramEditor } from '@/features/program-editor';
import { getProgram } from '@/entities/program';
import type { Session } from '@/entities/user';
import type { Navigate } from '@/shared/lib/navigation';
import { useResource } from '@/shared/lib/resource';
import { PageTitle, ResourceState } from '@/shared/ui/kit';
export function ProgramEditorPage({
  id,
  session,
  navigate,
}: {
  id?: string | undefined;
  session: Session;
  navigate: Navigate;
}) {
  const load = useCallback(
    (signal: AbortSignal) =>
      id ? getProgram(id, signal) : Promise.resolve(null),
    [id],
  );
  const resource = useResource(id ?? 'new', load);
  return (
    <>
      <PageTitle title={id ? 'Изменить программу' : 'Новая программа'} />
      {resource.data === undefined ? (
        <ResourceState
          layout="editor"
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <ProgramEditor
          context={session}
          timezone={session.user.timezone}
          program={resource.data ?? undefined}
          onSaved={() => navigate({ view: 'program' })}
        />
      )}
    </>
  );
}
