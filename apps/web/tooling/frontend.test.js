import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  duration,
  isoWeekday,
  shiftMonth,
} from '../src/shared/lib/date.ts';
import { decimalLabel } from '../src/shared/lib/decimal.ts';
import { parseRoute, routeHash } from '../src/app/navigation.ts';

test('calendar arithmetic crosses leap days, years and Sunday correctly', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(isoWeekday('2026-10-11'), 7);
});
test('elapsed time keeps hours and clamps negative intervals', () => {
  assert.equal(duration(3661.9), '61:01');
  assert.equal(duration(-1), '00:00');
});
test('decimal display preserves negative fractions and exact large values', () => {
  assert.equal(decimalLabel('-0.2500'), '-0,25');
  assert.equal(
    decimalLabel('9007199254740993.1250').replace(/\s/g, ''),
    '9007199254740993,125',
  );
  assert.equal(decimalLabel(null), '—');
});
test('deep links roundtrip and impossible calendar dates are rejected', () => {
  const route = { view: 'day', date: '2024-02-29' };
  assert.deepEqual(parseRoute(routeHash(route)), route);
  assert.deepEqual(parseRoute('#/day?date=2026-02-30'), { view: 'today' });
  assert.deepEqual(parseRoute('#/unknown'), { view: 'today' });
});
