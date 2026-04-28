import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPagination,
  buildTransactionWhere,
  parseSearch,
  parseStockFilter,
} from './query-utils.js';
import { InventoryError } from './errors.js';

test('buildTransactionWhere parses filters safely', () => {
  const where = buildTransactionWhere({
    type: 'out',
    productId: '12',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  });

  assert.equal(where.type, 'OUT');
  assert.equal(where.productId, 12);
  assert.ok(where.date.gte instanceof Date);
  assert.ok(where.date.lte instanceof Date);
});

test('buildTransactionWhere throws on invalid date', () => {
  assert.throws(
    () => buildTransactionWhere({ startDate: 'invalid-date' }),
    (err) => err instanceof InventoryError && err.status === 400,
  );
});

test('buildPagination uses defaults and validates positive numbers', () => {
  const defaults = buildPagination({});
  assert.deepEqual(defaults, { page: 1, limit: 50 });

  const custom = buildPagination({ page: '2', limit: '25' });
  assert.deepEqual(custom, { page: 2, limit: 25 });

  assert.throws(
    () => buildPagination({ page: '0' }),
    (err) => err instanceof InventoryError && err.status === 400,
  );
});

test('parseStockFilter and parseSearch normalize input', () => {
  assert.equal(parseStockFilter('LOW'), 'low');
  assert.equal(parseStockFilter('out'), 'out');
  assert.equal(parseSearch('  sku-01 '), 'sku-01');

  assert.throws(
    () => parseStockFilter('critical'),
    (err) => err instanceof InventoryError && err.status === 400,
  );
});
