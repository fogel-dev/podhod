import { AccessForm } from '@/features/password-auth';
import type { Session } from '@/entities/user';
import { Brand } from '@/shared/ui/brand';
import { ThemeControl } from '@/shared/ui/theme';
export function AccessPage({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}) {
  return (
    <main className="access-page">
      <header className="page-header">
        <Brand />
        <ThemeControl />
      </header>
      <AccessForm onAuthenticated={onAuthenticated} />
    </main>
  );
}
