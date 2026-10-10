import { useState } from 'react';
import type { Session } from '@/entities/user';
import { MonthCalendar } from '@/widgets/month-calendar';
import { today } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { PageTitle } from '@/shared/ui/kit';
export function CalendarPage({
  session,
  timezone,
  navigate,
}: {
  session: Session;
  timezone: string;
  navigate: Navigate;
}) {
  const date = today(timezone);
  const [month, setMonth] = useState(date.slice(0, 7));
  return (
    <>
      <PageTitle title="Календарь" subtitle="Тренировки и записи" />
      <MonthCalendar
        context={session}
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
