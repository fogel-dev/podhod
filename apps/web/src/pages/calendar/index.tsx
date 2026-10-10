import type { Session } from '@/entities/user';
import { MonthCalendar } from '@/widgets/month-calendar';
import { today } from '@/shared/lib/date';
import type { Navigate } from '@/shared/lib/navigation';
import { PageTitle } from '@/shared/ui/kit';
export function CalendarPage({
  session,
  timezone,
  navigate,
  month,
  onMonth,
}: {
  session: Session;
  timezone: string;
  navigate: Navigate;
  month: string;
  onMonth: (month: string) => void;
}) {
  const date = today(timezone);
  return (
    <>
      <PageTitle title="Календарь" subtitle="Тренировки и записи" />
      <MonthCalendar
        context={session}
        month={month}
        onMonth={onMonth}
        currentDate={date}
        onDay={(value) => navigate({ view: 'day', date: value })}
      />
      <button
        className="text-button wide"
        onClick={() => onMonth(date.slice(0, 7))}
      >
        К текущему месяцу
      </button>
    </>
  );
}
