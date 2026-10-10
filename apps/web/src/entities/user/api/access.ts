import { request } from '@/shared/api';
import type { components } from '@/shared/api';

export type Session = components['schemas']['Session'];
export type User = components['schemas']['User'];
export type Device = components['schemas']['Device'];
export type RegisterInput = components['schemas']['PasswordRegister'];
export type LoginInput = components['schemas']['PasswordLogin'];
export type PasswordInput = components['schemas']['PasswordChange'];

const csrfHeaders = (session: Session) => ({
  'X-CSRF-Token': session.csrfToken,
});
export const getSession = (signal?: AbortSignal) =>
  request<Session>('/auth/session', { signal: signal ?? null });
export const register = (input: RegisterInput) =>
  request<Session>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const login = (input: LoginInput) =>
  request<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const logout = (session: Session) =>
  request<void>('/auth/logout', {
    method: 'POST',
    headers: csrfHeaders(session),
  });
export const changePassword = (session: Session, input: PasswordInput) =>
  request<void>('/auth/password/change', {
    method: 'POST',
    headers: csrfHeaders(session),
    body: JSON.stringify(input),
  });
export const getDevices = (signal?: AbortSignal) =>
  request<components['schemas']['DevicePage']>('/me/devices', {
    signal: signal ?? null,
  });
export const revokeDevice = (session: Session, device: Device) =>
  request<void>(`/me/devices/${device.id}`, {
    method: 'DELETE',
    headers: { ...csrfHeaders(session), 'If-Match': `"${device.version}"` },
  });
export const updateTimezone = (session: Session, timezone: string) =>
  request<User>('/me', {
    method: 'PATCH',
    headers: {
      ...csrfHeaders(session),
      'If-Match': `"${session.user.version}"`,
    },
    body: JSON.stringify({ timezone }),
  });
