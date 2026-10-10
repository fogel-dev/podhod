import { useRef, useState } from 'react';
import { message } from './resource';
export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(message(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { run, busy, error, clear: () => setError('') };
}
