import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireAdminOrPPIC } from '../middleware/auth.js';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { getStockOverview } from '../services/inventory/stock-service.js';
import { isInventoryError } from '../services/inventory/errors.js';

const upload = multer({ storage: multer.memoryStorage() });

export const stockRouter = Router();
stockRouter.use(authenticate);

const handleInventoryError = (err, res, next) => {
  if (isInventoryError(err)) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  return next(err);
};

// GET /api/stock - Dashboard summary and paginated inventory list
stockRouter.get('/', async (req, res, next) => {
  try {
    const data = await getStockOverview({ prisma, query: req.query });
    res.json(data);
  } catch (err) {
    handleInventoryError(err, res, next);
  }
});

// POST /api/stock/import-odoo - Import from Odoo Excel
stockRouter.post('/import-odoo', requireAdminOrPPIC, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const stats = { created: 0, updated: 0, skipped: 0, errors: [] };

    // Column Mapping: Location, Product, Lot, Inventoried Qty, Reserved Qty, UoM
    let colMap = { location: 1, product: 2, lot: 3, invQty: 4, resQty: 5, uom: 6 };

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value?.toString().toLowerCase();
      if (val?.includes('location')) colMap.location = colNumber;
      if (val?.includes('product')) colMap.product = colNumber;
      if (val?.includes('lot') || val?.includes('serial')) colMap.lot = colNumber;
      if (val?.includes('inventoried')) colMap.invQty = colNumber;
      if (val?.includes('reserved')) colMap.resQty = colNumber;
      if (val?.includes('unit')) colMap.uom = colNumber;
    });

    for (let i = 2; i <= worksheet.rowCount; i += 1) {
      const row = worksheet.getRow(i);
      const prodStr = row.getCell(colMap.product).value?.toString() || '';
      const invQty = Number.parseInt(row.getCell(colMap.invQty).value, 10) || 0;
      const resQty = Number.parseInt(row.getCell(colMap.resQty).value, 10) || 0;
      const unit = row.getCell(colMap.uom).value?.toString() || 'pcs';

      if (!prodStr) {
        stats.skipped += 1;
        continue;
      }

      try {
        let sku = prodStr;
        let name = prodStr;
        const match = prodStr.match(/\[(.*?)\]\s*(.*)/);
        if (match) {
          sku = match[1].trim();
          name = match[2].trim();
        }

        await prisma.$transaction(async (tx) => {
          const product = await tx.product.findUnique({ where: { sku } });
          if (!product) {
            const createdProduct = await tx.product.create({
              data: { sku, name, unit, description: 'Imported from Odoo' },
            });

            await tx.stock.create({
              data: { productId: createdProduct.id, quantity: invQty, reservedQuantity: resQty },
            });

            stats.created += 1;
            return;
          }

          await tx.stock.upsert({
            where: { productId: product.id },
            update: {
              quantity: { increment: invQty },
              reservedQuantity: { increment: resQty },
            },
            create: {
              productId: product.id,
              quantity: invQty,
              reservedQuantity: resQty,
            },
          });

          stats.updated += 1;
        });
      } catch (err) {
        stats.errors.push({ row: i, product: prodStr, error: err.message });
      }
    }

    res.json({ message: 'Import selesai', stats });
  } catch (err) {
    next(err);
  }
});

export default stockRouter;
