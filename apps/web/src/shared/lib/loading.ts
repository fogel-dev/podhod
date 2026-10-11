export const minimumLoadingMs = 400;

// Start the request immediately, but keep the placeholder stable for one pulse.
// Aborting a departed screen also releases its timer.
export async function withMinimumLoading<T>(
  request: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  const minimum = new Promise<void>((resolve) => {
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
    const timer = setTimeout(finish, minimumLoadingMs);
    if (signal.aborted) finish();
    else signal.addEventListener('abort', finish, { once: true });
  });
  const [result] = await Promise.allSettled([request, minimum]);
  if (result.status === 'rejected') throw result.reason;
  return result.value;
}
