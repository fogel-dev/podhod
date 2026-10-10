import { useEffect, useState } from 'react';
import { storedTheme } from '../../lib/theme';
import { Icon } from '../kit';
const labels = { light: 'Светлое', dark: 'Тёмное' };
export function ThemeControl() {
  const [theme, setTheme] = useState(storedTheme);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const current = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const next = current === 'dark' ? 'light' : 'dark';
  const label = `Оформление: ${labels[current]}. Переключить на ${labels[next].toLowerCase()}`;
  return (
    <button
      type="button"
      className="theme-control"
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme(next);
        try {
          localStorage.setItem('podhod.theme', next);
        } catch {
          /* Preference may be unavailable in private mode. */
        }
        document.documentElement.dataset.theme = next;
      }}
    >
      <Icon name={current === 'light' ? 'sun' : 'moon'} />
    </button>
  );
}
