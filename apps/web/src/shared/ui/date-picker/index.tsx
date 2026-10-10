import { useEffect, useRef, useState } from 'react';
import {
  addDays,
  dateObject,
  isoWeekday,
  shiftMonth,
  weekdays,
} from '@/shared/lib/date';
import { Dialog } from '../dialog';
import { Icon } from '../kit';

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div className="field">
      <span>{label}</span>
      <button
        ref={trigger}
        type="button"
        className="date-picker-trigger"
        aria-label={`${label}: ${dateObject(value).toLocaleDateString('ru', { timeZone: 'UTC' })}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>
          {dateObject(value).toLocaleDateString('ru', { timeZone: 'UTC' })}
        </span>
        <Icon name="calendar" />
      </button>
      {open && (
        <DateCalendar
          label={label}
          value={value}
          min={min}
          max={max}
          onClose={close}
          onSelect={(date) => {
            onChange(date);
            close();
          }}
        />
      )}
    </div>
  );
}

function DateCalendar({
  label,
  value,
  min,
  max,
  onSelect,
  onClose,
}: {
  label: string;
  value: string;
  min: string | undefined;
  max: string | undefined;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const initial = min && value < min ? min : max && value > max ? max : value;
  const [focused, setFocused] = useState(initial);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
      ?.focus();
  }, [focused, month]);
  const first = `${month}-01`;
  const count = dateObject(
    addDays(`${shiftMonth(month, 1)}-01`, -1),
  ).getUTCDate();
  const allowed = (date: string) =>
    (!min || date >= min) && (!max || date <= max);
  function move(date: string) {
    const next = min && date < min ? min : max && date > max ? max : date;
    setFocused(next);
    setMonth(next.slice(0, 7));
  }
  function changeMonth(direction: number) {
    const next = shiftMonth(month, direction);
    const last = dateObject(
      addDays(`${shiftMonth(next, 1)}-01`, -1),
    ).getUTCDate();
    move(
      `${next}-${String(Math.min(dateObject(focused).getUTCDate(), last)).padStart(2, '0')}`,
    );
  }
  return (
    <Dialog title={label} onClose={onClose}>
      <div className="date-picker-calendar">
        <div className="row monthhead">
          <h3 aria-live="polite">
            {dateObject(first).toLocaleDateString('ru', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </h3>
          <div className="actions month-actions">
            <button
              type="button"
              className="round-icon"
              aria-label="Предыдущий месяц"
              disabled={!!min && month <= min.slice(0, 7)}
              onClick={() => changeMonth(-1)}
            >
              <Icon name="back" />
            </button>
            <button
              type="button"
              className="round-icon"
              aria-label="Следующий месяц"
              disabled={!!max && month >= max.slice(0, 7)}
              onClick={() => changeMonth(1)}
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
        <div
          ref={grid}
          className="date-picker-grid"
          role="group"
          aria-label="Дни месяца"
        >
          {Array.from({ length: isoWeekday(first) - 1 }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = addDays(first, i);
            return (
              <button
                type="button"
                key={date}
                data-date={date}
                data-autofocus={date === focused ? '' : undefined}
                aria-label={dateObject(date).toLocaleDateString('ru', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
                aria-pressed={date === value}
                disabled={!allowed(date)}
                tabIndex={date === focused ? 0 : -1}
                onFocus={() => setFocused(date)}
                onClick={() => onSelect(date)}
                onKeyDown={(event) => {
                  const offsets: Record<string, number> = {
                    ArrowLeft: -1,
                    ArrowRight: 1,
                    ArrowUp: -7,
                    ArrowDown: 7,
                    Home: 1 - isoWeekday(date),
                    End: 7 - isoWeekday(date),
                  };
                  if (event.key in offsets) {
                    event.preventDefault();
                    move(addDays(date, offsets[event.key]!));
                  }
                  if (event.key === 'PageUp' || event.key === 'PageDown') {
                    event.preventDefault();
                    changeMonth(event.key === 'PageUp' ? -1 : 1);
                  }
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
