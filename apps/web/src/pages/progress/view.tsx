import { useCallback, useState } from 'react';
import { getProgress, metricLabels } from '@/entities/progress';
import type { Progress } from '@/entities/progress';
import type { Exercise } from '@/entities/exercise';
import { ProgressChart } from '@/widgets/progress-chart';
import { useResource } from '@/shared/lib/resource';
import { addDays, today } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { ResourceState } from '@/shared/ui/kit';
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
      <label className="field">
        Упражнение
        <select
          value={exercise}
          onChange={(event) => {
            setExercise(event.target.value);
            try {
              localStorage.setItem(
                'podhod.progress.exercise',
                event.target.value,
              );
            } catch {
              /* optional preference */
            }
          }}
        >
          {exercises.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.archivedAt ? ' · в архиве' : ''}
            </option>
          ))}
        </select>
      </label>
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
      <label className="field">
        Показатель
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Progress['metric'])}
        >
          {Object.entries(metricLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
        <label className="field">
          Группировка
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as Progress['bucket'])}
          >
            <option value="session">По тренировкам</option>
            <option value="week">По неделям</option>
            <option value="month">По месяцам</option>
          </select>
        </label>
      </details>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
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
