import { ensureBoxExists } from '../transaction-shared.js';

export const executeAdjustUseCase = async ({ tx, productId, quantity, boxId, lotNumber, currentStockQuantity }) => {
  if (!boxId) {
    return { globalDelta: quantity - currentStockQuantity, transactionBoxId: null, note: null };
  }

  await ensureBoxExists(tx, boxId);

  const existing = await tx.boxProduct.findUnique({
    where: { boxId_productId_lotNumber: { boxId, productId, lotNumber } },
    select: { quantity: true },
  });

  const oldQty = existing?.quantity ?? 0;
  const globalDelta = quantity - oldQty;

  if (quantity === 0) {
    await tx.boxProduct.deleteMany({ where: { boxId, productId, lotNumber } });
  } else {
    await tx.boxProduct.upsert({
      where: { boxId_productId_lotNumber: { boxId, productId, lotNumber } },
      update: { quantity },
      create: { boxId, productId, quantity, lotNumber },
    });
  }

  return { globalDelta, transactionBoxId: boxId, note: null };
};
