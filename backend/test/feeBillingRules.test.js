import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldIncludeFeeForRun } from '../services/feeService.js';

const fee = (categoryId, billingCycle) => ({ categoryId, billingCycle });

test('monthly billing includes only recurring monthly categories', () => {
  const options = { billingMode: 'monthly' };
  assert.equal(shouldIncludeFeeForRun(fee('tuition', 'monthly'), options), true);
  assert.equal(shouldIncludeFeeForRun(fee('exam', 'term'), options), false);
  assert.equal(shouldIncludeFeeForRun(fee('session', 'annual'), options), false);
  assert.equal(shouldIncludeFeeForRun(fee('admission', 'one_time'), options), false);
});

test('additional billing includes only explicitly selected categories', () => {
  const options = { billingMode: 'selected', categoryIds: ['exam', 'sports'] };
  assert.equal(shouldIncludeFeeForRun(fee('exam', 'term'), options), true);
  assert.equal(shouldIncludeFeeForRun(fee('sports', 'annual'), options), true);
  assert.equal(shouldIncludeFeeForRun(fee('admission', 'one_time'), options), false);
});

test('one-time categories cannot be billed to the same student twice', () => {
  const options = {
    billingMode: 'selected',
    categoryIds: ['admission'],
    previouslyBilledOneTimeIds: ['admission'],
  };
  assert.equal(shouldIncludeFeeForRun(fee('admission', 'one_time'), options), false);
});

test('term and annual categories can be billed again under a new reference', () => {
  const options = {
    billingMode: 'selected',
    categoryIds: new Set(['exam', 'session']),
    previouslyBilledOneTimeIds: new Set(['exam', 'session']),
  };
  assert.equal(shouldIncludeFeeForRun(fee('exam', 'term'), options), true);
  assert.equal(shouldIncludeFeeForRun(fee('session', 'annual'), options), true);
});
