export type Theme = 'system' | 'light' | 'dark';
export function storedTheme(): Theme {
  try {
    const value = localStorage.getItem('podhod.theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
export function applyTheme() {
  const theme = storedTheme();
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
