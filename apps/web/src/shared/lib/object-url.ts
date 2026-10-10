import { useEffect, useState } from 'react';
export function useObjectUrl(blob: Blob | undefined) {
  const [state, setState] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!blob) return;
    let url = '';
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        url = URL.createObjectURL(blob);
        setState({ blob, url });
      }
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob]);
  return state?.blob === blob ? state?.url : undefined;
}
