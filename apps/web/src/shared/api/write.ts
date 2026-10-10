import { ApiError, request } from './client';
export type WriteContext = { csrfToken: string; deviceId: string };
const receipts = new Map<string, string>();
export async function write<T>(
  path: string,
  body: unknown,
  context: WriteContext,
  method = 'POST',
  version?: number,
) {
  const json = body === undefined ? undefined : JSON.stringify(body);
  const identity = JSON.stringify([
    context.deviceId,
    path,
    method,
    version,
    json,
  ]);
  const key = receipts.get(identity) ?? crypto.randomUUID();
  receipts.set(identity, key);
  try {
    const result = await request<T>(path, {
      method,
      ...(json === undefined ? {} : { body: json }),
      headers: {
        'X-CSRF-Token': context.csrfToken,
        'X-Device-Id': context.deviceId,
        'Idempotency-Key': key,
        ...(version === undefined ? {} : { 'If-Match': `"${version}"` }),
      },
    });
    receipts.delete(identity);
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status < 500)
      receipts.delete(identity);
    throw error;
  }
}
