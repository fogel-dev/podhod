import type { Progress } from '@/entities/progress';
import { decimalLabel, metricLabels, unitLabels } from '@/entities/progress';
import { dateLabel, dateObject } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
export function ProgressChart({
  progress,
  navigate,
}: {
  progress: Progress;
  navigate: Navigate;
}) {
  const points = progress.points;
  const values = points.map((point) => Number(point.value));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const from = dateObject(progress.from).getTime();
  const timeRange = Math.max(
    86400000,
    dateObject(progress.to).getTime() - from,
  );
  const coords = points.map((point) => ({
    x: 35 + ((dateObject(point.from).getTime() - from) / timeRange) * 280,
    y: 180 - ((Number(point.value) - min) / range) * 135,
    point,
  }));
  return (
    <>
      <div className="metric">
        <p className="small muted">
          {metricLabels[progress.metric]} · последнее значение
        </p>
        <div className="big">
          {decimalLabel(progress.summary.last)}{' '}
          <span className="unit">{unitLabels[progress.units]}</span>
        </div>
        {progress.summary.difference !== null && (
          <p className="delta">
            {Number(progress.summary.difference) > 0 ? '+' : ''}
            {decimalLabel(progress.summary.difference)}{' '}
            {unitLabels[progress.units]} за период
            {progress.summary.percentChange !== null
              ? ` (${Number(progress.summary.percentChange) > 0 ? '+' : ''}${decimalLabel(progress.summary.percentChange)}%)`
              : ''}
          </p>
        )}
      </div>
      {points.length >= 2 ? (
        <svg
          className="chart"
          viewBox="0 0 350 220"
          role="img"
          aria-label={`${metricLabels[progress.metric]}, ${unitLabels[progress.units]}. ${points.length} точек. Значения доступны в таблице ниже.`}
        >
          {[0, 0.5, 1].map((ratio) => (
            <g key={ratio}>
              <line
                className="gridline"
                x1="35"
                x2="315"
                y1={180 - ratio * 135}
                y2={180 - ratio * 135}
              />
              <text x="30" y={184 - ratio * 135} textAnchor="end">
                {new Intl.NumberFormat('ru', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(min + ratio * range)}
              </text>
            </g>
          ))}
          <polyline
            className="trend"
            points={coords.map(({ x, y }) => `${x},${y}`).join(' ')}
          />
          {coords.map(({ x, y, point }) => (
            <circle key={point.from} cx={x} cy={y} r="4">
              <title>
                {dateLabel(point.from)}: {decimalLabel(point.value)}{' '}
                {unitLabels[progress.units]}
              </title>
            </circle>
          ))}
          <text x="35" y="210">
            {dateLabel(progress.from)}
          </text>
          <text x="315" y="210" textAnchor="end">
            {dateLabel(progress.to)}
          </text>
        </svg>
      ) : (
        <p className="state-message">
          {points.length === 1
            ? 'Есть первая запись. После следующей тренировки появится график изменений.'
            : 'За выбранный период завершённых подходов нет.'}
        </p>
      )}
      <div className="summary-grid">
        <div>
          <strong>{progress.dataCount}</strong>
          <span>тренировок с фактическими подходами</span>
        </div>
        <div>
          <strong>{decimalLabel(progress.summary.max)}</strong>
          <span>максимум, {unitLabels[progress.units]}</span>
        </div>
      </div>
      {points.length > 0 && (
        <section className="section">
          <h2>Записи</h2>
          <table className="progress-table">
            <thead>
              <tr>
                <th scope="col">Дата</th>
                <th scope="col">{unitLabels[progress.units]}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.from}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate({ view: 'day', date: point.from })
                      }
                    >
                      {dateLabel(point.from)}
                      {point.from !== point.to
                        ? ` — ${dateLabel(point.to)}`
                        : ''}
                    </button>
                  </td>
                  <td>{decimalLabel(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
