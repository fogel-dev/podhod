type Request = { message: string; resolve: (accepted: boolean) => void };
let current: Request | null = null;
const listeners = new Set<() => void>();
export const confirmationSnapshot = () => current;
export function subscribeConfirmation(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function confirmAction(message: string): Promise<boolean> {
  if (current) return Promise.resolve(false);
  return new Promise((resolve) => {
    current = { message, resolve };
    listeners.forEach((listener) => listener());
  });
}
export function settleConfirmation(accepted: boolean) {
  const request = current;
  if (!request) return;
  current = null;
  listeners.forEach((listener) => listener());
  request.resolve(accepted);
}
