import { InventoryError } from './errors.js';
import { buildPagination, buildTransactionWhere } from './query-utils.js';
import { applyGlobalStockDelta, normalizeLotNumber } from './transaction-shared.js';
import { executeInUseCase } from './use-cases/in-use-case.js';
import { executeOutUseCase } from './use-cases/out-use-case.js';
import { executeAdjustUseCase } from './use-cases/adjust-use-case.js';
import { executeMoveUseCase } from './use-cases/move-use-case.js';

const parseId = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const listTransactions = async ({ prisma, query }) => {
  const where = buildTransactionWhere(query);
  const { page, limit } = buildPagination(query);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const listTransactionsForExport = async ({ prisma, query }) => {
  const where = buildTransactionWhere(query);

  return prisma.transaction.findMany({
    where,
    include: {
      product: { select: { name: true, sku: true, unit: true } },
      user: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });
};

export const createInventoryTransaction = async ({ prisma, userId, input }) => {
  const productId = parseId(input.productId);
  const quantity = Number.parseInt(input.quantity, 10);
  const type = String(input.type || '').toUpperCase();

  if (!productId) throw new InventoryError(400, 'productId tidak valid');
  if (!Number.isFinite(quantity) || quantity < 0) throw new InventoryError(400, 'quantity tidak valid');
  if (type !== 'ADJUST' && quantity <= 0) throw new InventoryError(400, 'quantity harus lebih besar dari 0');

  const boxId = parseId(input.boxId);
  const targetBoxId = parseId(input.targetBoxId);
  const referenceNo = input.referenceNo ?? null;
  const note = input.note ?? null;
  const lotNumber = normalizeLotNumber(input.lotNumber);

  return prisma.$transaction(async (tx) => {
    const [product, stock] = await Promise.all([
      tx.product.findUnique({ where: { id: productId }, select: { id: true } }),
      tx.stock.findUnique({ where: { productId }, select: { quantity: true } }),
    ]);

    if (!product) throw new InventoryError(404, 'Produk tidak ditemukan');
    if (!stock) throw new InventoryError(404, 'Product stock record not found');

    let executed;

    if (type === 'IN') {
      if (!boxId) throw new InventoryError(400, 'Transaksi IN membutuhkan boxId agar stok sinkron.');
      executed = await executeInUseCase({ tx, productId, quantity, boxId, lotNumber });
    } else if (type === 'OUT') {
      if (!boxId) throw new InventoryError(400, 'Transaksi OUT membutuhkan boxId agar stok sinkron.');
      executed = await executeOutUseCase({ tx, productId, quantity, boxId, lotNumber });
    } else if (type === 'ADJUST') {
      executed = await executeAdjustUseCase({
        tx,
        productId,
        quantity,
        boxId,
        lotNumber,
        currentStockQuantity: stock.quantity,
      });
    } else if (type === 'MOVE') {
      executed = await executeMoveUseCase({ tx, productId, quantity, boxId, targetBoxId, lotNumber, note });
    } else {
      throw new InventoryError(400, 'Transaction type tidak valid');
    }

    const newStock = await applyGlobalStockDelta(tx, productId, executed.globalDelta);

    const transaction = await tx.transaction.create({
      data: {
        productId,
        type,
        quantity,
        referenceNo,
        boxId: executed.transactionBoxId,
        note: executed.note ?? note,
        userId,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return { transaction, newStock };
  });
};
