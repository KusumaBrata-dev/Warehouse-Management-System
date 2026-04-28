import { InventoryError } from './errors.js';

export const normalizeLotNumber = (lotNumber) => String(lotNumber ?? '').trim();

export const ensureBoxExists = async (tx, boxId, label = 'Box') => {
  const box = await tx.box.findUnique({ where: { id: boxId }, select: { id: true } });
  if (!box) throw new InventoryError(404, `${label} tidak ditemukan`);
};

export const decrementBoxStock = async (
  tx,
  { boxId, productId, lotNumber, quantity, notFoundMessage, insufficientMessage },
) => {
  const changed = await tx.boxProduct.updateMany({
    where: {
      boxId,
      productId,
      lotNumber,
      quantity: { gte: quantity },
    },
    data: {
      quantity: { decrement: quantity },
    },
  });

  if (changed.count === 0) {
    const existing = await tx.boxProduct.findUnique({
      where: { boxId_productId_lotNumber: { boxId, productId, lotNumber } },
      select: { quantity: true },
    });

    if (!existing) throw new InventoryError(400, notFoundMessage);
    throw new InventoryError(400, `${insufficientMessage} Tersedia: ${existing.quantity}`);
  }

  await tx.boxProduct.deleteMany({
    where: { boxId, productId, lotNumber, quantity: { lte: 0 } },
  });
};

export const applyGlobalStockDelta = async (tx, productId, globalDelta) => {
  if (globalDelta === 0) {
    const stock = await tx.stock.findUnique({ where: { productId }, select: { quantity: true } });
    return stock?.quantity ?? 0;
  }

  if (globalDelta > 0) {
    const updated = await tx.stock.update({
      where: { productId },
      data: { quantity: { increment: globalDelta } },
      select: { quantity: true },
    });
    return updated.quantity;
  }

  const requiredQty = Math.abs(globalDelta);
  const updated = await tx.stock.updateMany({
    where: { productId, quantity: { gte: requiredQty } },
    data: { quantity: { decrement: requiredQty } },
  });

  if (updated.count === 0) {
    throw new InventoryError(400, 'Transaksi ini akan mengakibatkan stok negatif di pusat.');
  }

  const stock = await tx.stock.findUnique({ where: { productId }, select: { quantity: true } });
  return stock?.quantity ?? 0;
};
