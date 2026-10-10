import { useCallback, useState } from 'react';
import { getBodyWeightHistory } from '@/entities/body-weight';
import { addDays, dateLabel, dateObject, today } from '@/shared/lib/date';
import { decimalLabel } from '@/shared/lib/decimal';
import { useResource } from '@/shared/lib/resource';
import type { Navigate } from '@/shared/lib/navigation';
import { ResourceState } from '@/shared/ui/kit';

export function BodyWeightProgress({
  timezone,
  navigate,
}: {
  timezone: string;
  navigate: Navigate;
}) {
  const [period, setPeriod] = useState(90);
  const to = today(timezone),
    from = addDays(to, 1 - period);
  const load = useCallback(
    (signal: AbortSignal) => getBodyWeightHistory(from, to, signal),
    [from, to],
  );
  const resource = useResource(`body-weight:${from}:${to}`, load);
  const items = resource.data?.items ?? [];
  const last = items.at(-1);
  const first = items[0];
  const values = items.map((item) => Number(item.weightKg));
  const low = Math.floor(Math.min(...values)) - 1;
  const high = Math.ceil(Math.max(...values)) + 1;
  const coords = items.map((item) => ({
    item,
    x:
      45 +
      ((dateObject(item.localDate).getTime() - dateObject(from).getTime()) /
        ((period - 1) * 86400000)) *
        265,
    y: 180 - ((Number(item.weightKg) - low) / (high - low)) * 135,
  }));
  return (
    <section className="section">
      <h2>Вес тела</h2>
      <div className="segment">
        {[30, 90, 365].map((days) => (
          <button
            type="button"
            key={days}
            aria-pressed={period === days}
            onClick={() => setPeriod(days)}
          >
            {days === 365 ? 'Год' : `${days} дней`}
          </button>
        ))}
      </div>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : last && first ? (
        <>
          <div className="metric">
            <p className="small muted">{dateLabel(last.localDate)}</p>
            <div className="big">
              {decimalLabel(last.weightKg)} <span className="unit">кг</span>
            </div>
            {items.length > 1 && (
              <p className="delta">
                {Number(last.weightKg) > Number(first.weightKg) ? '+' : ''}
                {decimalLabel(
                  (Number(last.weightKg) - Number(first.weightKg)).toFixed(2),
                )}{' '}
                кг за период
              </p>
            )}
          </div>
          <svg
            className="chart"
            viewBox="0 0 350 220"
            role="img"
            aria-label={`Вес тела, кг. ${items.length} записей. Значения доступны в таблице ниже.`}
          >
            {[0, 0.5, 1].map((ratio) => (
              <g key={ratio}>
                <line
                  className="gridline"
                  x1="45"
                  x2="310"
                  y1={180 - ratio * 135}
                  y2={180 - ratio * 135}
                />
                <text x="40" y={184 - ratio * 135} textAnchor="end">
                  {decimalLabel((low + ratio * (high - low)).toFixed(1))}
                </text>
              </g>
            ))}
            <polyline
              className="trend"
              points={coords.map(({ x, y }) => `${x},${y}`).join(' ')}
            />
            {coords.map(({ x, y, item }) => (
              <circle key={item.localDate} cx={x} cy={y} r="4">
                <title>
                  {dateLabel(item.localDate)}: {decimalLabel(item.weightKg)} кг
                </title>
              </circle>
            ))}
            <text x="45" y="210">
              {dateLabel(from)}
            </text>
            <text x="310" y="210" textAnchor="end">
              {dateLabel(to)}
            </text>
          </svg>
          <table className="progress-table">
            <thead>
              <tr>
                <th scope="col">Дата</th>
                <th scope="col">Вес, кг</th>
              </tr>
            </thead>
            <tbody>
              {[...items].reverse().map((item) => (
                <tr key={item.localDate}>
                  <td>
                    <button
                      className="text-button transparent"
                      onClick={() =>
                        navigate({ view: 'day', date: item.localDate })
                      }
                    >
                      {dateLabel(item.localDate)}
                    </button>
                  </td>
                  <td>{decimalLabel(item.weightKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <p className="muted">За этот период записей веса нет.</p>
          <button
            className="secondary-button"
            onClick={() => navigate({ view: 'day', date: to })}
          >
            Открыть сегодняшний день
          </button>
        </>
      )}
    </section>
  );
}
