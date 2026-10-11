import { ApiError, request, write } from '@/shared/api';
import type { components, WriteContext } from '@/shared/api';
export type Photo = components['schemas']['Photo'];
export const MAX_PHOTOS_PER_DAY = 2;
export { PhotoImage } from './image';
export const getPhoto = (id: string) => request<Photo>(`/photos/${id}`);
export const getPhotos = (date: string, signal: AbortSignal) =>
  request<components['schemas']['PhotoPage']>(
    `/photos?date=${date}&limit=100`,
    { signal },
  );
export const deletePhoto = (context: WriteContext, photo: Photo) =>
  write<void>(
    `/photos/${photo.id}`,
    undefined,
    context,
    'DELETE',
    photo.version,
  );
export const updatePhoto = (
  context: WriteContext,
  photo: Photo,
  patch: components['schemas']['PhotoPatch'],
) =>
  write<Photo>(`/photos/${photo.id}`, patch, context, 'PATCH', photo.version);
export async function readPhoto(
  context: WriteContext,
  id: string,
  variant: 'image' | 'thumbnail',
  signal: AbortSignal,
) {
  const links = await request<components['schemas']['PhotoReadUrls']>(
    '/photos/read-urls',
    {
      method: 'POST',
      signal,
      headers: { 'X-CSRF-Token': context.csrfToken },
      body: JSON.stringify({ photoIds: [id], variant }),
    },
  );
  const link = links.items[0];
  if (!link) throw new Error('Фотография недоступна');
  const url = new URL(link.url, location.origin);
  if (url.origin !== location.origin)
    throw new Error('Недопустимая ссылка фотографии');
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  if (!response.ok)
    throw new ApiError(response.status, 'Не удалось загрузить фотографию');
  return response.blob();
}
export async function uploadPhoto(
  context: WriteContext,
  file: File,
  date: string,
  id: string,
) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size === 0 ||
    file.size > 10485760
  )
    throw new ApiError(422, 'Выберите JPEG, PNG или WebP размером до 10 МБ.');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await file.arrayBuffer(),
  );
  const checksumSha256 = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  let existing: Photo | undefined;
  try {
    existing = await getPhoto(id);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  if (existing?.status === 'ready' || existing?.status === 'processing')
    return existing;
  const ticket = existing
    ? await write<components['schemas']['PhotoUpload']>(
        `/photos/${id}/upload-url`,
        { expectedVersion: existing.version, checksumSha256 },
        context,
      )
    : await write<components['schemas']['PhotoUpload']>(
        '/photos/uploads',
        {
          id,
          localDate: date,
          mimeType: file.type,
          sizeBytes: file.size,
          checksumSha256,
        },
        context,
      );
  const url = new URL(ticket.uploadUrl, location.origin);
  if (url.origin !== location.origin)
    throw new Error('Недопустимая ссылка загрузки');
  const uploaded = await fetch(url, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { ...ticket.requiredHeaders, 'X-CSRF-Token': context.csrfToken },
    body: file,
  });
  if (!uploaded.ok)
    throw new ApiError(
      uploaded.status,
      'Не удалось загрузить фото. Повторите отправку.',
    );
  return write<Photo>(
    `/photos/${id}/complete`,
    { expectedVersion: ticket.version, checksumSha256 },
    context,
  );
}
