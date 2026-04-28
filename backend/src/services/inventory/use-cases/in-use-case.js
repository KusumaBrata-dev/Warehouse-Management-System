import { ensureBoxExists } from '../transaction-shared.js';

export const executeInUseCase = async ({ tx, productId, quantity, boxId, lotNumber }) => {
  await ensureBoxExists(tx, boxId);

  await tx.boxProduct.upsert({
    where: { boxId_productId_lotNumber: { boxId, productId, lotNumber } },
    update: { quantity: { increment: quantity } },
    create: { boxId, productId, quantity, lotNumber },
  });

  return { globalDelta: quantity, transactionBoxId: boxId, note: null };
};
