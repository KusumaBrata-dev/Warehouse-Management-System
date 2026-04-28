import { InventoryError } from '../errors.js';
import { ensureBoxExists, decrementBoxStock } from '../transaction-shared.js';

export const executeMoveUseCase = async ({ tx, productId, quantity, boxId, targetBoxId, lotNumber, note }) => {
  if (!boxId || !targetBoxId) {
    throw new InventoryError(400, 'MOVE membutuhkan boxId dan targetBoxId');
  }
  if (boxId === targetBoxId) {
    throw new InventoryError(400, 'Box asal dan tujuan tidak boleh sama');
  }

  await ensureBoxExists(tx, boxId, 'Box asal');
  await ensureBoxExists(tx, targetBoxId, 'Box tujuan');

  await decrementBoxStock(tx, {
    boxId,
    productId,
    lotNumber,
    quantity,
    notFoundMessage: 'Produk tidak ditemukan di box asal.',
    insufficientMessage: 'Stok di box asal tidak cukup.',
  });

  await tx.boxProduct.upsert({
    where: { boxId_productId_lotNumber: { boxId: targetBoxId, productId, lotNumber } },
    update: { quantity: { increment: quantity } },
    create: { boxId: targetBoxId, productId, quantity, lotNumber },
  });

  const finalNote = `${note || ''} (Pindah ke Box ID ${targetBoxId})`.trim();

  return { globalDelta: 0, transactionBoxId: boxId, note: finalNote };
};
