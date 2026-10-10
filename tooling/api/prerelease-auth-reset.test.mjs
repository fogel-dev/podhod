import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { approvedReset } from './compatibility.mjs';

test('prerelease reset is limited to the exact approved pair', () => {
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  const approval = {
    issue: 'EGO-21',
    reason:
      'Password registration replaces unreleased email authentication; ADR-003',
    before: hash('before'),
    after: hash('after'),
  };
  assert.equal(approvedReset('before', 'after', approval), true);
  assert.equal(
    approvedReset('before', 'after with unrelated breaking change', approval),
    false,
  );
  assert.equal(approvedReset('other baseline', 'after', approval), false);
  assert.equal(
    approvedReset('before', 'after', { ...approval, issue: 'other' }),
    false,
  );
});
