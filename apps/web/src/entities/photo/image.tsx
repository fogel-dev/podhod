import { useCallback } from 'react';
import { readPhoto } from './index';
import type { WriteContext } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { useObjectUrl } from '@/shared/lib/object-url';
export function PhotoImage({
  context,
  id,
  variant = 'thumbnail',
  alt,
  compact = false,
}: {
  context: WriteContext;
  id: string;
  variant?: 'image' | 'thumbnail';
  alt: string;
  compact?: boolean;
}) {
  const load = useCallback(
    (signal: AbortSignal) => readPhoto(context, id, variant, signal),
    [context, id, variant],
  );
  const resource = useResource(`${id}:${variant}`, load);
  const url = useObjectUrl(resource.data);
  return url ? (
    <img src={url} alt={alt} className="photo-image" />
  ) : (
    <span
      className="photo-unavailable"
      role={resource.error ? undefined : 'status'}
    >
      {compact ? (
        '▧'
      ) : resource.error ? (
        <>
          <span>Фото недоступно</span>
          <button
            type="button"
            className="text-button"
            onClick={resource.reload}
          >
            Повторить
          </button>
        </>
      ) : (
        'Загружаем фото…'
      )}
    </span>
  );
}
