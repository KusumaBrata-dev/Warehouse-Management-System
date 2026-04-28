import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, transactionSchema } from '../validations/wms.js';
import {
  createInventoryTransaction,
  listTransactions,
  listTransactionsForExport,
} from '../services/inventory/transactions-service.js';
import { isInventoryError } from '../services/inventory/errors.js';

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

const handleInventoryError = (err, res, next) => {
  if (isInventoryError(err)) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  return next(err);
};

// GET /api/transactions/export - Excel export
transactionsRouter.get('/export', async (req, res, next) => {
  try {
    const transactions = await listTransactionsForExport({ prisma, query: req.query });

    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Warehouse Inventory System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Transaction History', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'WAREHOUSE INVENTORY - TRANSACTION HISTORY';
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f1629' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      sheet.mergeCells('A2:J2');
      sheet.getCell('A2').value = `Period: ${startDate || 'All'} - ${endDate || 'All'}`;
      sheet.getCell('A2').alignment = { horizontal: 'center' };
      sheet.getCell('A2').font = { italic: true };
    }

    const headerRow = sheet.addRow(['No', 'Date', 'SKU', 'Product Name', 'Type', 'Quantity', 'Unit', 'Reference No', 'User', 'Note']);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };
      cell.alignment = { horizontal: 'center' };
    });

    sheet.columns = [
      { width: 5 },
      { width: 20 },
      { width: 15 },
      { width: 30 },
      { width: 10 },
      { width: 10 },
      { width: 8 },
      { width: 20 },
      { width: 15 },
      { width: 30 },
    ];

    transactions.forEach((t, index) => {
      const row = sheet.addRow([
        index + 1,
        new Date(t.date).toLocaleString('id-ID'),
        t.product.sku,
        t.product.name,
        t.type,
        t.quantity,
        t.product.unit,
        t.referenceNo || '-',
        t.user.name,
        t.note || '-',
      ]);

      const typeCell = row.getCell(5);
      if (t.type === 'IN') typeCell.font = { color: { argb: 'FF10b981' }, bold: true };
      if (t.type === 'OUT') typeCell.font = { color: { argb: 'FFf43f5e' }, bold: true };
      if (t.type === 'ADJUST' || t.type === 'MOVE') typeCell.font = { color: { argb: 'FFf59e0b' }, bold: true };

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
        });
      }
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow(['', '', '', 'TOTAL TRANSACTIONS:', transactions.length]);
    totalRow.getCell(4).font = { bold: true };
    totalRow.getCell(5).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    handleInventoryError(err, res, next);
  }
});

// GET /api/transactions - List with filters
transactionsRouter.get('/', async (req, res, next) => {
  try {
    const data = await listTransactions({ prisma, query: req.query });
    res.json(data);
  } catch (err) {
    handleInventoryError(err, res, next);
  }
});

// POST /api/transactions - Create transaction (IN/OUT/ADJUST/MOVE)
transactionsRouter.post('/', validate(transactionSchema), async (req, res, next) => {
  try {
    const result = await createInventoryTransaction({
      prisma,
      userId: req.user.id,
      input: req.validData,
    });

    res.status(201).json(result);
  } catch (err) {
    handleInventoryError(err, res, next);
  }
});

export default transactionsRouter;
