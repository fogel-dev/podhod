import { useCallback } from 'react';
import { getCalendar, planStatus } from '@/entities/calendar';
import { PhotoImage } from '@/entities/photo';
import type { WriteContext } from '@/shared/api';
import { useResource } from '@/shared/lib/resource';
import { dateLabel, dateObject, shiftMonth, weekdays } from '@/shared/lib/date';
import { Icon, ResourceState } from '@/shared/ui/kit';
export function MonthCalendar({
  context,
  month,
  onMonth,
  currentDate,
  onDay,
}: {
  context: WriteContext;
  month: string;
  onMonth: (month: string) => void;
  currentDate: string;
  onDay: (date: string) => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => getCalendar(month, signal),
    [month],
  );
  const resource = useResource(month, load);
  const offset = (dateObject(`${month}-01`).getUTCDay() + 6) % 7;
  return (
    <section className="month-calendar" aria-label="Месячный календарь">
      <div className="row monthhead">
        <h2>
          {dateObject(`${month}-01`).toLocaleDateString('ru', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </h2>
        <div className="row month-actions">
          <button
            className="round-icon"
            aria-label="Предыдущий месяц"
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <Icon name="back" />
          </button>
          <button
            className="round-icon"
            aria-label="Следующий месяц"
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <Icon name="next" />
          </button>
        </div>
      </div>
      <div className="week" aria-hidden="true">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.reload} />
      ) : (
        <div className="calendar-grid">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {resource.data.days.map((day) => (
            <button
              key={day.date}
              className={`calendar-day ${day.date === currentDate ? 'today' : ''}`}
              onClick={() => onDay(day.date)}
              aria-label={`${dateLabel(day.date)}${day.date === currentDate ? ', сегодня' : ''}${day.plans.map((p) => `, ${planStatus[p.status]}`).join('')}${day.workoutSummaries.length ? ', есть результат' : ''}${day.notePresent ? ', заметка' : ''}${day.photoCount ? `, фото: ${day.photoCount}` : ''}`}
            >
              <span className="num">{Number(day.date.slice(-2))}</span>
              <span className="day-markers">
                {day.workoutSummaries.some((w) => w.status === 'completed') ? (
                  <span className="calendar-check">✓</span>
                ) : day.plans.length > 0 ? (
                  <span
                    className={`dot ${day.plans.some((p) => p.status === 'missed') ? 'missed' : ''}`}
                  />
                ) : null}
                {day.notePresent && <span className="note-dot" />}
                {day.photoCount > 0 && (
                  <span className="photo-stack" aria-hidden="true">
                    {day.thumbnailPhotoIds.map((id) => (
                      <PhotoImage
                        key={id}
                        context={context}
                        id={id}
                        alt=""
                        compact
                      />
                    ))}
                    {day.photoCount > 2 && (
                      <span className="stack-count">+{day.photoCount - 2}</span>
                    )}
                    {!day.thumbnailPhotoIds.length && (
                      <span className="photo-count">{day.photoCount} фото</span>
                    )}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="legend">
        <span>● План</span>
        <span>✓ Завершена</span>
        <span>○ Пропущена</span>
      </div>
    </section>
  );
}
