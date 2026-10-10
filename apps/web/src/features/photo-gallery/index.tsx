import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletePhoto,
  getPhotos,
  PhotoImage,
  updatePhoto,
  uploadPhoto,
} from '@/entities/photo';
import type { Photo } from '@/entities/photo';
import type { WriteContext } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { useAction } from '@/shared/lib/action';
import { useObjectUrl } from '@/shared/lib/object-url';
import { dateLabel } from '@/shared/lib/date';
import { Dialog } from '@/shared/ui/dialog';
import { ResourceState } from '@/shared/ui/kit';
export function PhotoGallery({
  context,
  date,
  onChanged,
}: {
  context: WriteContext;
  date: string;
  onChanged: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => getPhotos(date, signal),
    [date],
  );
  const resource = useResource(date, load);
  const [file, setFile] = useState<File>();
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [moveDate, setMoveDate] = useState(date);
  const uploadId = useRef<string>('');
  const [retryId, setRetryId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const action = useAction();
  const preview = useObjectUrl(file);
  const processing = resource.data?.items.some(
    (photo) => photo.status === 'processing',
  );
  useEffect(() => {
    if (!processing) return;
    const interval = window.setInterval(resource.reload, 3000);
    return () => clearInterval(interval);
  }, [processing, resource.reload]);
  async function sendFile() {
    if (!file) return;
    await uploadPhoto(context, file, date, uploadId.current);
    setFile(undefined);
    setRetryId(null);
    if (input.current) input.current.value = '';
    resource.reload();
    onChanged();
  }
  return (
    <section className="section">
      <div className="row">
        <h2>Фотографии</h2>
        <button
          className="text-button"
          disabled={action.busy}
          onClick={resource.reload}
        >
          Обновить
        </button>
      </div>
      <p className="small muted">Видны только вам · до 20 фотографий в день.</p>
      <label className="file-control">
        {retryId ? 'Выберите исходное фото для повтора' : 'Добавить фотографию'}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={action.busy}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            setFile(selected);
            uploadId.current = retryId ?? crypto.randomUUID();
            action.clear();
          }}
        />
      </label>
      {file && (
        <div className="upload-preview">
          {preview && (
            <img src={preview} alt="Предпросмотр выбранной фотографии" />
          )}
          <p className="small muted">
            {file.name} · {(file.size / 1048576).toFixed(1)} МБ
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={action.busy}
              onClick={() => void action.run(sendFile)}
            >
              {action.busy
                ? 'Загружаем…'
                : action.error
                  ? 'Повторить загрузку'
                  : 'Загрузить'}
            </button>
            <button
              className="secondary-button"
              disabled={action.busy}
              onClick={() => {
                setFile(undefined);
                setRetryId(null);
                resource.reload();
                if (input.current) input.current.value = '';
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      <p role="alert" className="form-message">
        {action.error}
      </p>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : resource.data.items.length ? (
        <div className="gallery">
          {[...resource.data.items]
            .sort((a, b) => a.position - b.position)
            .map((photo) => (
              <figure key={photo.id}>
                {photo.status === 'ready' ? (
                  <button
                    className="photo-button"
                    onClick={() => {
                      setViewing(photo);
                      setMoveDate(photo.localDate);
                    }}
                  >
                    <PhotoImage
                      context={context}
                      id={photo.id}
                      alt={`Фото ${photo.position}, ${dateLabel(date)}`}
                    />
                  </button>
                ) : (
                  <div className="photo-unavailable">
                    {photo.status === 'processing'
                      ? 'Обрабатываем…'
                      : photo.status === 'failed'
                        ? 'Не удалось обработать'
                        : 'Загрузка не завершена'}
                  </div>
                )}
                <figcaption>
                  {photo.position} ·{' '}
                  {photo.status === 'ready'
                    ? dateLabel(date)
                    : photo.status === 'processing'
                      ? 'Можно продолжать тренировку'
                      : 'Выберите исходный файл для повтора'}
                </figcaption>
                <div className="actions">
                  {(photo.status === 'failed' ||
                    photo.status === 'pending') && (
                    <button
                      className="text-button"
                      disabled={action.busy}
                      onClick={() => {
                        setRetryId(photo.id);
                        uploadId.current = photo.id;
                        input.current?.click();
                      }}
                    >
                      Повторить
                    </button>
                  )}
                  <button
                    className="text-button"
                    disabled={action.busy}
                    onClick={() => {
                      if (!window.confirm('Удалить эту фотографию?')) return;
                      void action.run(async () => {
                        await deletePhoto(context, photo);
                        resource.reload();
                        onChanged();
                      });
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </figure>
            ))}
        </div>
      ) : (
        <p className="state-message">
          Фотографий пока нет. Можно добавить фото и в день без тренировки.
        </p>
      )}
      {viewing && (
        <Dialog
          title={`Фото ${viewing.position}`}
          busy={action.busy}
          onClose={() => setViewing(null)}
        >
          <PhotoImage
            context={context}
            id={viewing.id}
            variant="image"
            alt={`Фото ${viewing.position}, ${dateLabel(viewing.localDate)}`}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                await updatePhoto(context, viewing, { localDate: moveDate });
                setViewing(null);
                resource.reload();
                onChanged();
              });
            }}
          >
            <label className="field">
              Дата фотографии
              <input
                type="date"
                required
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
              />
            </label>
            <button
              className="secondary-button wide"
              disabled={action.busy || moveDate === viewing.localDate}
            >
              Перенести фото
            </button>
          </form>
          <p role="alert">{action.error}</p>
        </Dialog>
      )}
    </section>
  );
}
