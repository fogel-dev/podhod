export function decimalLabel(value: string | null) {
  if (value === null) return '—';
  const [integer = '0', fraction] = value.split('.');
  const tail = fraction?.replace(/0+$/, '');
  return (
    (integer === '-0' ? '-0' : BigInt(integer).toLocaleString('ru')) +
    (tail ? `,${tail}` : '')
  );
}
