import { useEffect, useRef, useState } from 'react';
import type { Route, Tab } from '@/shared/lib/navigation';
export const tabNames: Tab[] = ['today', 'calendar', 'program', 'progress'];
export function routeHash(route: Route) {
  const parameters = new URLSearchParams(
    Object.entries(route).filter(([key]) => key !== 'view'),
  );
  return `#/${route.view}${parameters.size ? `?${parameters}` : ''}`;
}
export function parseRoute(hash: string): Route {
  const [view = 'today', query] = hash.replace(/^#\/?/, '').split('?');
  const parameters = new URLSearchParams(query);
  if (tabNames.includes(view as Tab)) return { view: view as Tab };
  if (view === 'account' || view === 'library') return { view };
  const id = parameters.get('id');
  if (view === 'program-editor')
    return id && /^[a-f0-9-]{36}$/i.test(id) ? { view, id } : { view };
  if (view === 'workout' && id && /^[a-f0-9-]{36}$/i.test(id))
    return { view, id };
  const date = parameters.get('date');
  if (
    view === 'day' &&
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
  )
    return { view, date };
  return { view: 'today' };
}
export const scrollPositions = new Map<string, number>();
async function canLeave(confirm: (message: string) => Promise<boolean>) {
  return (
    window.dispatchEvent(
      new Event('podhod:before-navigate', { cancelable: true }),
    ) ||
    (await confirm(
      'Есть несохранённые изменения. Покинуть экран и потерять их?',
    ))
  );
}
export function useNavigation(confirm: (message: string) => Promise<boolean>) {
  const pending = useRef(false);
  const [frame, setFrame] = useState(() => {
    const route = parseRoute(location.hash);
    const tab = tabNames.includes(route.view as Tab)
      ? (route.view as Tab)
      : tabNames.includes(history.state?.tab)
        ? (history.state.tab as Tab)
        : 'today';
    return {
      route,
      tab,
      index:
        typeof history.state?.index === 'number'
          ? (history.state.index as number)
          : 0,
    };
  });
  useEffect(() => {
    history.scrollRestoration = 'manual';
    history.replaceState(
      { tab: frame.tab, index: frame.index },
      '',
      routeHash(frame.route),
    );
    let restored: (() => void) | null = null;
    let approved = false;
    let active = true;
    async function pop() {
      if (restored) {
        const resolve = restored;
        restored = null;
        resolve();
        return;
      }
      if (routeHash(parseRoute(location.hash)) === routeHash(frame.route))
        return;
      const nextIndex =
        typeof history.state?.index === 'number'
          ? (history.state.index as number)
          : 0;
      if (
        !approved &&
        !window.dispatchEvent(
          new Event('podhod:before-navigate', { cancelable: true }),
        )
      ) {
        if (pending.current) return;
        pending.current = true;
        const delta = frame.index - nextIndex || 1;
        await new Promise<void>((resolve) => {
          restored = resolve;
          history.go(delta);
        });
        if (!active) {
          pending.current = false;
          return;
        }
        const accepted = await confirm(
          'Есть несохранённые изменения. Покинуть экран и потерять их?',
        );
        pending.current = false;
        if (!active) return;
        if (accepted) {
          approved = true;
          history.go(-delta);
        }
        return;
      }
      approved = false;
      scrollPositions.set(routeHash(frame.route), window.scrollY);
      const route = parseRoute(location.hash);
      const tab = tabNames.includes(route.view as Tab)
        ? (route.view as Tab)
        : ((history.state?.tab as Tab) ?? frame.tab);
      setFrame({ route, tab, index: nextIndex });
    }
    window.addEventListener('popstate', pop);
    return () => {
      active = false;
      restored?.();
      window.removeEventListener('popstate', pop);
    };
  }, [frame, confirm]);
  async function navigate(route: Route) {
    if (routeHash(route) === routeHash(frame.route) || pending.current) return;
    pending.current = true;
    const allowed = await canLeave(confirm);
    pending.current = false;
    if (!allowed) return;
    scrollPositions.set(routeHash(frame.route), window.scrollY);
    const tab = tabNames.includes(route.view as Tab)
      ? (route.view as Tab)
      : frame.tab;
    const next = { route, tab, index: frame.index + 1 };
    history.pushState({ tab, index: next.index }, '', routeHash(route));
    setFrame(next);
  }
  function back() {
    if (frame.index > 0) history.back();
    else navigate({ view: frame.tab });
  }
  return { route: frame.route, tab: frame.tab, navigate, back };
}
