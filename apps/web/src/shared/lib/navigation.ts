export type Tab = 'today' | 'calendar' | 'program' | 'progress';
export type Route =
  | { view: Tab }
  | { view: 'account' }
  | { view: 'day'; date: string }
  | { view: 'program-editor'; id?: string }
  | { view: 'workout'; id: string };
export type Navigate = (route: Route) => void;
