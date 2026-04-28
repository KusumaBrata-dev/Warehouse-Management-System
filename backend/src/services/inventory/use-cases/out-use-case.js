import { ensureBoxExists, decrementBoxStock } from '../transaction-shared.js';

export const executeOutUseCase = async ({ tx, productId, quantity, boxId, lotNumber }) => {
  await ensureBoxExists(tx, boxId);

  await decrementBoxStock(tx, {
    boxId,
    productId,
    lotNumber,
    quantity,
    notFoundMessage: 'Produk tidak ditemukan di box.',
    insufficientMessage: 'Stok di box tidak cukup.',
  });

  return { globalDelta: -quantity, transactionBoxId: boxId, note: null };
};
