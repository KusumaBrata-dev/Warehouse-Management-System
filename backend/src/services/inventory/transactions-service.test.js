import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryTransaction } from './transactions-service.js';
import { InventoryError } from './errors.js';

const keyOf = (boxId, productId, lotNumber) => `${boxId}:${productId}:${lotNumber}`;

const createMockPrisma = ({ stocks, boxProducts, products = [1], boxes = [10, 11] }) => {
  const state = {
    products: new Set(products),
    stocks: new Map(Object.entries(stocks || {}).map(([k, v]) => [Number(k), v])),
    boxes: new Set(boxes),
    boxProducts: new Map(
      Object.entries(boxProducts || {}).map(([k, v]) => [k, v]),
    ),
    transactions: [],
  };

  let txId = 1;

  const tx = {
    product: {
      findUnique: async ({ where }) => (state.products.has(where.id) ? { id: where.id } : null),
    },
    stock: {
      findUnique: async ({ where }) => {
        if (!state.stocks.has(where.productId)) return null;
        return { quantity: state.stocks.get(where.productId) };
      },
      update: async ({ where, data }) => {
        const current = state.stocks.get(where.productId) ?? 0;
        const next = current + (data.quantity?.increment ?? 0);
        state.stocks.set(where.productId, next);
        return { quantity: next };
      },
      updateMany: async ({ where, data }) => {
        const current = state.stocks.get(where.productId) ?? 0;
        const gte = where.quantity?.gte ?? Number.MIN_SAFE_INTEGER;
        if (current < gte) return { count: 0 };
        const next = current - (data.quantity?.decrement ?? 0);
        state.stocks.set(where.productId, next);
        return { count: 1 };
      },
    },
    box: {
      findUnique: async ({ where }) => (state.boxes.has(where.id) ? { id: where.id } : null),
    },
    boxProduct: {
      findUnique: async ({ where }) => {
        const { boxId, productId, lotNumber } = where.boxId_productId_lotNumber;
        const key = keyOf(boxId, productId, lotNumber);
        if (!state.boxProducts.has(key)) return null;
        return { quantity: state.boxProducts.get(key) };
      },
      updateMany: async ({ where, data }) => {
        const key = keyOf(where.boxId, where.productId, where.lotNumber);
        const current = state.boxProducts.get(key);
        const gte = where.quantity?.gte ?? Number.MIN_SAFE_INTEGER;
        if (current === undefined || current < gte) return { count: 0 };
        const next = current - (data.quantity?.decrement ?? 0);
        state.boxProducts.set(key, next);
        return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        const key = keyOf(where.boxId, where.productId, where.lotNumber);
        const current = state.boxProducts.get(key);
        if (current === undefined) return { count: 0 };

        if (where.quantity?.lte !== undefined && current > where.quantity.lte) {
          return { count: 0 };
        }

        state.boxProducts.delete(key);
        return { count: 1 };
      },
      upsert: async ({ where, update, create }) => {
        const { boxId, productId, lotNumber } = where.boxId_productId_lotNumber;
        const key = keyOf(boxId, productId, lotNumber);
        if (state.boxProducts.has(key)) {
          const current = state.boxProducts.get(key);
          if (update.quantity?.increment !== undefined) {
            state.boxProducts.set(key, current + update.quantity.increment);
          }
          if (update.quantity !== undefined && typeof update.quantity === 'number') {
            state.boxProducts.set(key, update.quantity);
          }
        } else {
          state.boxProducts.set(key, create.quantity);
        }

        return { boxId, productId, lotNumber, quantity: state.boxProducts.get(key) };
      },
    },
    transaction: {
      create: async ({ data }) => {
        const created = {
          id: txId,
          ...data,
          product: {
            id: data.productId,
            name: `Product ${data.productId}`,
            sku: `SKU-${data.productId}`,
            unit: 'pcs',
          },
          user: { id: data.userId, name: `User ${data.userId}`, role: 'ADMIN' },
        };

        txId += 1;
        state.transactions.push(created);
        return created;
      },
    },
  };

  return {
    state,
    prisma: {
      $transaction: async (cb) => cb(tx),
    },
  };
};

test('createInventoryTransaction handles IN flow', async () => {
  const { prisma, state } = createMockPrisma({
    stocks: { 1: 10 },
    boxProducts: { '10:1:': 5 },
  });

  const result = await createInventoryTransaction({
    prisma,
    userId: 99,
    input: { productId: 1, type: 'IN', quantity: 3, boxId: 10, lotNumber: '' },
  });

  assert.equal(result.newStock, 13);
  assert.equal(state.stocks.get(1), 13);
  assert.equal(state.boxProducts.get('10:1:'), 8);
  assert.equal(state.transactions.length, 1);
});

test('createInventoryTransaction blocks OUT when box stock is insufficient', async () => {
  const { prisma, state } = createMockPrisma({
    stocks: { 1: 10 },
    boxProducts: { '10:1:': 2 },
  });

  await assert.rejects(
    () =>
      createInventoryTransaction({
        prisma,
        userId: 99,
        input: { productId: 1, type: 'OUT', quantity: 5, boxId: 10, lotNumber: '' },
      }),
    (err) => err instanceof InventoryError && err.status === 400,
  );

  assert.equal(state.stocks.get(1), 10);
  assert.equal(state.boxProducts.get('10:1:'), 2);
  assert.equal(state.transactions.length, 0);
});

test('createInventoryTransaction blocks MOVE to same source and target box', async () => {
  const { prisma } = createMockPrisma({
    stocks: { 1: 10 },
    boxProducts: { '10:1:': 5 },
  });

  await assert.rejects(
    () =>
      createInventoryTransaction({
        prisma,
        userId: 99,
        input: { productId: 1, type: 'MOVE', quantity: 2, boxId: 10, targetBoxId: 10, lotNumber: '' },
      }),
    (err) => err instanceof InventoryError && err.status === 400,
  );
});

test('createInventoryTransaction supports global ADJUST without box', async () => {
  const { prisma, state } = createMockPrisma({ stocks: { 1: 10 }, boxProducts: {} });

  const result = await createInventoryTransaction({
    prisma,
    userId: 99,
    input: { productId: 1, type: 'ADJUST', quantity: 4, lotNumber: '' },
  });

  assert.equal(result.newStock, 4);
  assert.equal(state.stocks.get(1), 4);
  assert.equal(state.transactions.length, 1);
});

test('createInventoryTransaction removes boxProduct when OUT depletes exact quantity', async () => {
  const { prisma, state } = createMockPrisma({
    stocks: { 1: 10 },
    boxProducts: { '10:1:': 3 },
  });

  const result = await createInventoryTransaction({
    prisma,
    userId: 99,
    input: { productId: 1, type: 'OUT', quantity: 3, boxId: 10, lotNumber: '' },
  });

  assert.equal(result.newStock, 7);
  assert.equal(state.stocks.get(1), 7);
  assert.equal(state.boxProducts.has('10:1:'), false);
  assert.equal(state.transactions.length, 1);
});

test('createInventoryTransaction supports box-level ADJUST to zero', async () => {
  const { prisma, state } = createMockPrisma({
    stocks: { 1: 10 },
    boxProducts: { '10:1:': 4 },
  });

  const result = await createInventoryTransaction({
    prisma,
    userId: 99,
    input: { productId: 1, type: 'ADJUST', quantity: 0, boxId: 10, lotNumber: '' },
  });

  assert.equal(result.newStock, 6);
  assert.equal(state.stocks.get(1), 6);
  assert.equal(state.boxProducts.has('10:1:'), false);
  assert.equal(state.transactions.length, 1);
});

test('createInventoryTransaction rejects IN without boxId', async () => {
  const { prisma } = createMockPrisma({
    stocks: { 1: 10 },
    boxProducts: {},
  });

  await assert.rejects(
    () =>
      createInventoryTransaction({
        prisma,
        userId: 99,
        input: { productId: 1, type: 'IN', quantity: 2, lotNumber: '' },
      }),
    (err) => err instanceof InventoryError && err.status === 400,
  );
});
