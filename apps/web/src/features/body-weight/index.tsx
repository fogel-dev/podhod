import { useState } from 'react';
import { saveBodyWeight } from '@/entities/body-weight';
import type { BodyWeight } from '@/entities/body-weight';
import type { WriteContext } from '@/shared/api';
import { dateLabel, today } from '@/shared/lib/date';
import { decimalLabel } from '@/shared/lib/decimal';
import { useAction } from '@/shared/lib/action';
import { useUnsavedChanges } from '@/shared/lib/unsaved';

export function BodyWeightRecorder({
  date,
  timezone,
  initial,
  suggestion,
  context,
  onChanged,
}: {
  date: string;
  timezone: string;
  initial: BodyWeight | null;
  suggestion?: BodyWeight | null;
  context: WriteContext;
  onChanged: () => void;
}) {
  const [record, setRecord] = useState(initial);
  const [value, setValue] = useState(
    initial?.weightKg ?? suggestion?.weightKg ?? '',
  );
  const action = useAction();
  const normalized = value.replace(',', '.');
  const dirty = value !== (record?.weightKg ?? suggestion?.weightKg ?? '');
  useUnsavedChanges(dirty);
  const editable = date === today(timezone);
  return (
    <section className="section body-weight-section">
      <h2>Вес тела</h2>
      {editable ? (
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const saved = await saveBodyWeight(
                context,
                date,
                normalized,
                record?.version ?? 0,
              );
              setRecord(saved);
              setValue(saved.weightKg);
              onChanged();
            });
          }}
        >
          <label className="field">
            Вес, кг
            <input
              required
              inputMode="decimal"
              maxLength={6}
              pattern="[0-9]{1,3}([.,][0-9]{1,2})?"
              value={value}
              disabled={action.busy}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          {!record && suggestion && (
            <p className="field-hint">
              Последняя запись: {decimalLabel(suggestion.weightKg)} кг ·{' '}
              {dateLabel(suggestion.localDate)}. Подтвердите вес на сегодня.
            </p>
          )}
          <button
            className="primary"
            disabled={
              action.busy ||
              (!!record && !dirty) ||
              !/^[0-9]{1,3}(\.[0-9]{1,2})?$/.test(normalized) ||
              Number(normalized) <= 0 ||
              Number(normalized) > 500
            }
          >
            {action.busy ? 'Сохраняем…' : 'Зафиксировать вес'}
          </button>
          {record && !dirty && (
            <p className="field-hint" role="status">
              Вес записан: {decimalLabel(record.weightKg)} кг
            </p>
          )}
          {action.error && (
            <>
              <p className="error-message" role="alert">
                {action.error}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={onChanged}
              >
                Обновить запись
              </button>
            </>
          )}
        </form>
      ) : (
        <>
          <p className={record || suggestion ? 'body-weight-value' : 'muted'}>
            {record
              ? `${decimalLabel(record.weightKg)} кг`
              : suggestion
                ? `${decimalLabel(suggestion.weightKg)} кг`
                : 'Вес не записан'}
          </p>
          {!record && suggestion && (
            <p className="field-hint">
              Последняя запись · {dateLabel(suggestion.localDate)}. На этот день
              вес не зафиксирован.
            </p>
          )}
        </>
      )}
    </section>
  );
}
