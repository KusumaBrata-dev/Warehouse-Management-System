import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionSchema } from './wms.js';

const base = {
  productId: 1,
  lotNumber: '',
};

test('transactionSchema accepts ADJUST with zero quantity', () => {
  const result = transactionSchema.safeParse({
    ...base,
    type: 'ADJUST',
    quantity: 0,
  });

  assert.equal(result.success, true);
});

test('transactionSchema rejects zero quantity for IN', () => {
  const result = transactionSchema.safeParse({
    ...base,
    type: 'IN',
    quantity: 0,
    boxId: 10,
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path.join('.') === 'quantity'));
});

test('transactionSchema rejects OUT without boxId', () => {
  const result = transactionSchema.safeParse({
    ...base,
    type: 'OUT',
    quantity: 1,
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path.join('.') === 'boxId'));
});

test('transactionSchema rejects MOVE with same source and target box', () => {
  const result = transactionSchema.safeParse({
    ...base,
    type: 'MOVE',
    quantity: 1,
    boxId: 10,
    targetBoxId: 10,
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path.join('.') === 'targetBoxId'));
});
