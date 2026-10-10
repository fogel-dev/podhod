import { useState } from 'react';
import { storedTheme } from '../../lib/theme';
import type { Theme } from '../../lib/theme';
export function ThemeControl() {
  const [theme, setTheme] = useState(storedTheme);
  return (
    <label className="theme-control">
      Оформление
      <select
        value={theme}
        onChange={(event) => {
          const next = event.target.value as Theme;
          setTheme(next);
          try {
            localStorage.setItem('podhod.theme', next);
          } catch {
            /* Preference may be unavailable in private mode. */
          }
          if (next === 'system') delete document.documentElement.dataset.theme;
          else document.documentElement.dataset.theme = next;
        }}
      >
        <option value="system">Системное</option>
        <option value="light">Светлое</option>
        <option value="dark">Тёмное</option>
      </select>
    </label>
  );
}
