import { useState } from 'react';
import { MonthCalendar } from '@/widgets/month-calendar';
import { today } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { PageTitle } from '@/shared/ui/kit';
export function CalendarPage({
  timezone,
  navigate,
}: {
  timezone: string;
  navigate: Navigate;
}) {
  const date = today(timezone);
  const [month, setMonth] = useState(date.slice(0, 7));
  return (
    <>
      <PageTitle title="Календарь" subtitle="Тренировки и записи" />
      <MonthCalendar
        month={month}
        onMonth={setMonth}
        currentDate={date}
        onDay={(value) => navigate({ view: 'day', date: value })}
      />
      <button
        className="text-button wide"
        onClick={() => setMonth(date.slice(0, 7))}
      >
        К текущему месяцу
      </button>
    </>
  );
}
