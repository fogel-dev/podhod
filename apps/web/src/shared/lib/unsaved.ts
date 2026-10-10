import { useEffect, useRef } from 'react';
export function useUnsavedChanges(dirty: boolean) {
  const released = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: Event) => {
      if (!released.current) event.preventDefault();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (!released.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('podhod:before-navigate', guard);
    window.addEventListener('beforeunload', unload);
    return () => {
      window.removeEventListener('podhod:before-navigate', guard);
      window.removeEventListener('beforeunload', unload);
    };
  }, [dirty]);
  return {
    release: () => {
      released.current = true;
    },
  };
}
