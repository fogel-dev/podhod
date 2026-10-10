import { useEffect, useState } from 'react';
export function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!startedAt) return;
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, [startedAt]);
  return startedAt ? Math.max(0, (now - Date.parse(startedAt)) / 1000) : 0;
}
