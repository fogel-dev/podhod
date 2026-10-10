import { ExerciseLibrary } from '@/features/program-editor';
import type { Session } from '@/entities/user';
import { PageTitle } from '@/shared/ui/kit';
export function LibraryPage({ session }: { session: Session }) {
  return (
    <>
      <PageTitle title="Упражнения" subtitle="Общая библиотека" />
      <ExerciseLibrary context={session} />
    </>
  );
}
