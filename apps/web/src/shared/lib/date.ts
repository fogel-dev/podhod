export const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const weekdayNames = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];
export function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join('-');
}
export const dateObject = (date: string) => new Date(`${date}T12:00:00Z`);
export const dateLabel = (date: string) =>
  dateObject(date).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
export function addDays(date: string, days: number) {
  const result = dateObject(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export const isoWeekday = (date: string) => dateObject(date).getUTCDay() || 7;
export function shiftMonth(month: string, shift: number) {
  const date = dateObject(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + shift);
  return date.toISOString().slice(0, 7);
}
export function duration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
