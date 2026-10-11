import { useCallback, useState } from 'react';
import { getProgress, metricLabels } from '@/entities/progress';
import type { Progress } from '@/entities/progress';
import type { Exercise } from '@/entities/exercise';
import { ProgressChart } from '@/widgets/progress-chart';
import { useResource } from '@/shared/lib/resource';
import { addDays, today } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { ResourceState } from '@/shared/ui/kit';
import { Select } from '@/shared/ui/select';
export function ProgressView({
  exercises,
  timezone,
  navigate,
}: {
  exercises: Exercise[];
  timezone: string;
  navigate: Navigate;
}) {
  const [exercise, setExercise] = useState(() => {
    try {
      const selected = localStorage.getItem('podhod.progress.exercise');
      if (exercises.some((item) => item.id === selected)) return selected!;
    } catch {
      /* optional preference */
    }
    return exercises[0]?.id ?? '';
  });
  const date = today(timezone);
  const [from, setFrom] = useState(addDays(date, -41));
  const [to, setTo] = useState(date);
  const [metric, setMetric] = useState<Progress['metric']>('maxWeight');
  const [bucket, setBucket] = useState<Progress['bucket']>('session');
  const load = useCallback(
    (signal: AbortSignal) =>
      getProgress(exercise, from, to, metric, bucket, signal),
    [exercise, from, to, metric, bucket],
  );
  const resource = useResource(
    `${exercise}:${from}:${to}:${metric}:${bucket}`,
    load,
  );
  return (
    <>
      <div className="field">
        <span>Упражнение</span>
        <Select
          label="Упражнение"
          value={exercise}
          onChange={(value) => {
            setExercise(value);
            try {
              localStorage.setItem('podhod.progress.exercise', value);
            } catch {
              /* optional preference */
            }
          }}
          options={exercises.map((item) => ({
            value: item.id,
            label: `${item.name}${item.archivedAt ? ' · в архиве' : ''}`,
          }))}
        />
      </div>
      <div className="segment" aria-label="Период">
        {[6, 12].map((weeks) => (
          <button
            key={weeks}
            aria-pressed={
              from === addDays(date, -(weeks * 7 - 1)) && to === date
            }
            onClick={() => {
              setFrom(addDays(date, -(weeks * 7 - 1)));
              setTo(date);
            }}
          >
            {weeks} недель
          </button>
        ))}
      </div>
      <div className="field">
        <span>Показатель</span>
        <Select
          label="Показатель"
          value={metric}
          onChange={(value) => setMetric(value as Progress['metric'])}
          options={Object.entries(metricLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
      <details className="progress-options">
        <summary>Даты и группировка</summary>
        <div className="dates">
          <label className="field">
            С
            <input
              type="date"
              required
              max={to}
              value={from}
              onChange={(e) => {
                if (e.target.value) setFrom(e.target.value);
              }}
            />
          </label>
          <label className="field">
            По
            <input
              type="date"
              required
              min={from}
              value={to}
              onChange={(e) => {
                if (e.target.value) setTo(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="field">
          <span>Группировка</span>
          <Select
            label="Группировка"
            value={bucket}
            onChange={(value) => setBucket(value as Progress['bucket'])}
            options={[
              { value: 'session', label: 'По тренировкам' },
              { value: 'week', label: 'По неделям' },
              { value: 'month', label: 'По месяцам' },
            ]}
          />
        </div>
      </details>
      {!resource.data ? (
        <ResourceState
          layout="progress"
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <ProgressChart progress={resource.data} navigate={navigate} />
      )}
      <p className="field-hint section">
        Только выполненные подходы завершённых тренировок. План и пропуски не
        учитываются.
      </p>
    </>
  );
}
