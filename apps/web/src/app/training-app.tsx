import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { TodayPage } from '@/pages/today';
import { CalendarPage } from '@/pages/calendar';
import { ProgramPage } from '@/pages/program';
import { ProgressPage } from '@/pages/progress';
import { DayPage } from '@/pages/day';
import { AccountPage } from '@/pages/account';
import { ProgramEditorPage } from '@/pages/program-editor';
import { LibraryPage } from '@/pages/library';
import { WorkoutPage } from '@/pages/workout';
import { getActiveWorkout } from '@/entities/workout';
import { useResource } from '@/shared/lib/resource';
import type { Session } from '@/entities/user';
import type { Tab } from '@/shared/lib/navigation';
import { routeHash, scrollPositions, useNavigation } from './navigation';
import { confirmAction } from '@/shared/lib/confirmation';
import { today } from '@/shared/lib/date';
import { Brand } from '@/shared/ui/brand';
import { ThemeControl } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/kit';

const tabs: { view: Tab; label: string }[] = [
  { view: 'today', label: 'Сегодня' },
  { view: 'calendar', label: 'Календарь' },
  { view: 'program', label: 'Программа' },
  { view: 'progress', label: 'Прогресс' },
];
export function TrainingApp({
  session,
  onChanged,
  onLogout,
}: {
  session: Session;
  onChanged: () => Promise<void>;
  onLogout: () => void;
}) {
  const { route, tab, navigate, back } = useNavigation(confirmAction);
  const [months, setMonths] = useState({
    today: today(session.user.timezone).slice(0, 7),
    calendar: today(session.user.timezone).slice(0, 7),
  });
  const main = useRef<HTMLElement>(null);
  const loadActive = useCallback(
    (signal: AbortSignal) => getActiveWorkout(signal),
    [],
  );
  const active = useResource(`active:${JSON.stringify(route)}`, loadActive);
  useLayoutEffect(() => {
    const target = scrollPositions.get(routeHash(route)) ?? 0;
    let focused = false;
    const restore = () => {
      const heading = main.current?.querySelector<HTMLElement>('h1');
      if (heading && !focused) {
        heading.focus({ preventScroll: true });
        focused = true;
      }
      window.scrollTo({ top: target, behavior: 'instant' });
      if (
        focused &&
        document.documentElement.scrollHeight >= target + innerHeight
      )
        observer.disconnect();
    };
    const observer = new ResizeObserver(restore);
    if (main.current) observer.observe(main.current);
    restore();
    return () => observer.disconnect();
  }, [route]);
  const detail = !tabs.some((item) => item.view === route.view);
  return (
    <>
      <div className="training-app">
        <header className="app-top">
          <Brand />
          <div className="header-controls">
            <ThemeControl />
            <button
              className="round-icon"
              aria-label="Настройки"
              onClick={() => navigate({ view: 'account' })}
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>
        <main
          ref={main}
          className={`screen ${detail ? 'detail-screen' : ''}`}
          key={JSON.stringify(route)}
        >
          {detail && (
            <button className="back text-button" onClick={back}>
              <Icon name="back" /> Назад
            </button>
          )}
          {route.view === 'today' && (
            <TodayPage
              session={session}
              timezone={session.user.timezone}
              navigate={navigate}
              month={months.today}
              onMonth={(month) =>
                setMonths((current) => ({ ...current, today: month }))
              }
            />
          )}
          {route.view === 'calendar' && (
            <CalendarPage
              session={session}
              timezone={session.user.timezone}
              navigate={navigate}
              month={months.calendar}
              onMonth={(month) =>
                setMonths((current) => ({ ...current, calendar: month }))
              }
            />
          )}
          {route.view === 'program' && (
            <ProgramPage session={session} navigate={navigate} />
          )}
          {route.view === 'program-editor' && (
            <ProgramEditorPage
              id={route.id}
              session={session}
              navigate={navigate}
            />
          )}
          {route.view === 'library' && <LibraryPage session={session} />}
          {route.view === 'progress' && (
            <ProgressPage
              timezone={session.user.timezone}
              navigate={navigate}
            />
          )}
          {route.view === 'day' && (
            <DayPage
              date={route.date}
              session={session}
              navigate={navigate}
              onChanged={active.reload}
            />
          )}
          {route.view === 'workout' && (
            <WorkoutPage
              id={route.id}
              session={session}
              navigate={navigate}
              onChanged={active.reload}
            />
          )}
          {route.view === 'account' && (
            <AccountPage
              session={session}
              onChanged={onChanged}
              onLogout={onLogout}
              embedded
            />
          )}
        </main>
        {active.data && route.view !== 'workout' && (
          <button
            className="active-workout-link"
            onClick={() => navigate({ view: 'workout', id: active.data!.id })}
          >
            <Icon name="program" />
            Вернуться к тренировке
            <Icon name="next" />
          </button>
        )}
      </div>
      <nav className="bottom-nav" aria-label="Разделы приложения">
        {tabs.map((item) => (
          <button
            key={item.view}
            aria-current={tab === item.view ? 'page' : undefined}
            onClick={() => navigate({ view: item.view })}
          >
            <Icon name={item.view} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
