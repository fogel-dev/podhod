import type { ReactNode } from 'react';
export function Icon({
  name,
}: {
  name:
    | 'today'
    | 'calendar'
    | 'program'
    | 'progress'
    | 'settings'
    | 'back'
    | 'next'
    | 'check'
    | 'plus'
    | 'sun'
    | 'moon'
    | 'close'
    | 'chevron-down'
    | 'chevron-up'
    | 'trash';
}) {
  const paths = {
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-up': 'M6 15l6-6 6 6',
    trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    close: 'M6 6l12 12 M18 6L6 18',
    sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
    moon: 'M20 14a8 8 0 0 1-10-10A8 8 0 1 0 20 14z',
    today: 'M5 4h14v16H5z M9 2v4 M15 2v4 M8 10h8 M8 14h5',
    calendar:
      'M3 5h18v16H3z M3 9h18 M7 3v4 M17 3v4 M7 13h2 M12 13h2 M17 13h1 M7 17h2 M12 17h2',
    program: 'M4 7v10 M7 4v16 M17 4v16 M20 7v10 M7 12h10',
    progress: 'M4 3v18h17 M7 16l4-5 4 2 5-7',
    settings:
      'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
    back: 'M15 5l-7 7 7 7',
    next: 'M9 5l7 7-7 7',
    check: 'M5 12l4 4L19 6',
    plus: 'M12 5v14 M5 12h14',
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function ResourceState({
  error,
  retry,
  layout = 'list',
}: {
  error?: string | undefined;
  retry: () => void;
  layout?: SkeletonLayout;
}) {
  return error ? (
    <div className="state-message">
      <p role="alert">{error}</p>
      <button className="text-button" onClick={retry}>
        Повторить
      </button>
    </div>
  ) : (
    <Skeleton layout={layout} />
  );
}
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="screen-header">
      {subtitle && <p className="eyebrow">{subtitle}</p>}
      <div className="row">
        <h1 tabIndex={-1}>{title}</h1>
        {action}
      </div>
    </header>
  );
}

type SkeletonLayout =
  | 'list'
  | 'today'
  | 'calendar'
  | 'day'
  | 'editor'
  | 'progress'
  | 'workout'
  | 'access';
export function Skeleton({
  layout = 'list',
  cells = 35,
}: {
  layout?: SkeletonLayout;
  cells?: number;
}) {
  return (
    <div
      className={`skeleton skeleton-${layout}`}
      role="status"
      aria-label="Загрузка страницы"
      aria-busy="true"
    >
      <div aria-hidden="true">
        {layout === 'calendar' ? (
          <div className="calendar-grid">
            {Array.from({ length: cells }, (_, index) => (
              <div className="calendar-day" key={index}>
                <span className="skeleton-block skeleton-number" />
              </div>
            ))}
          </div>
        ) : layout === 'today' ? (
          <div className="surface skeleton-card">
            <span className="skeleton-block skeleton-title" />
            <span className="skeleton-block skeleton-control" />
          </div>
        ) : layout === 'editor' || layout === 'access' ? (
          <>
            <span className="skeleton-block skeleton-line" />
            {Array.from({ length: 3 }, (_, index) => (
              <div className="skeleton-field" key={index}>
                <span className="skeleton-block skeleton-label" />
                <span className="skeleton-block skeleton-control" />
              </div>
            ))}
          </>
        ) : layout === 'day' ? (
          <>
            <div className="section">
              <span className="skeleton-block skeleton-title" />
              <span className="skeleton-block skeleton-title" />
            </div>
            <div className="section">
              <span className="skeleton-block skeleton-title" />
              <div className="note-board">
                {[0, 1, 2].map((index) => (
                  <span className="skeleton-block skeleton-note" key={index} />
                ))}
              </div>
              <span className="skeleton-block skeleton-control" />
            </div>
            <div className="section">
              <span className="skeleton-block skeleton-title" />
              <span className="skeleton-block skeleton-control" />
            </div>
          </>
        ) : layout === 'progress' ? (
          <>
            <span className="skeleton-block skeleton-control" />
            <div className="skeleton-block skeleton-chart" />
            <span className="skeleton-block skeleton-line" />
          </>
        ) : (
          <>
            {layout === 'workout' && (
              <span className="skeleton-block skeleton-title" />
            )}
            {Array.from({ length: 2 }, (_, index) => (
              <div className="surface skeleton-card" key={index}>
                <span className="skeleton-block skeleton-title" />
                <span className="skeleton-block skeleton-line" />
                <span className="skeleton-block skeleton-line short" />
                <span className="skeleton-block skeleton-control" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
