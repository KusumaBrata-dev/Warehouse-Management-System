import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import ExcelJS from 'exceljs';

const upload = multer({ storage: multer.memoryStorage() });

export const stockRouter = Router();
stockRouter.use(authenticate);

// GET /api/stock — Dashboard summary
stockRouter.get('/', async (req, res, next) => {
  try {
    const stocks = await prisma.stock.findMany({
      include: {
        product: { 
          include: { 
            category: true, 
            boxProducts: {
              include: {
                box: {
                  include: {
                    pallet: {
                      include: {
                        rackLevel: {
                          include: {
                            section: {
                              include: {
                                rack: {
                                  include: { floor: true }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          } 
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    // Format location strings for frontend
    const stocksWithPath = stocks.map(s => {
      const locations = s.product.boxProducts.map(bp => {
        const p = bp.box.pallet;
        if (!p) return `Box: ${bp.box.name}`;
        const l = p.rackLevel;
        const sec = l.section;
        const r = sec.rack;
        const f = r.floor;
        return `${f.name} > Rak ${r.letter}${sec.number} > L${l.number} > ${bp.box.name}`;
      });
      return { ...s, locationPath: locations.length > 0 ? locations[0] : (locations.length > 1 ? `${locations[0]} (+${locations.length - 1} more)` : 'Belum Ada Lokasi') };
    });

    const total = stocks.length;
    const lowStock = stocks.filter(s => s.quantity <= s.product.minStock && s.product.minStock > 0).length;
    const outOfStock = stocks.filter(s => s.quantity === 0).length;
    const totalQty = stocks.reduce((sum, s) => sum + s.quantity, 0);

    res.json({ summary: { total, lowStock, outOfStock, totalQty }, stocks: stocksWithPath });
  } catch (err) {
    next(err);
  }
});

// POST /api/stock/import-odoo — Import from Odoo Excel
stockRouter.post('/import-odoo', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const stats = { created: 0, updated: 0, skipped: 0, errors: [] };

    // Column Mapping: Location, Product, Lot, Inventoried Qty, Reserved Qty, UoM
    // We assume columns are in order or we find them by header
    let colMap = { location: 1, product: 2, lot: 3, invQty: 4, resQty: 5, uom: 6 };

    // Find headers
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

    // Start from row 2
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const locStr = row.getCell(colMap.location).value?.toString() || '';
      const prodStr = row.getCell(colMap.product).value?.toString() || '';
      const lotStr = row.getCell(colMap.lot).value?.toString() || null;
      const invQty = parseInt(row.getCell(colMap.invQty).value) || 0;
      const resQty = parseInt(row.getCell(colMap.resQty).value) || 0;
      const unit = row.getCell(colMap.uom).value?.toString() || 'pcs';

      if (!prodStr) continue;

      try {
        // 1. Parse SKU/Name: [SKU] Name
        let sku = prodStr;
        let name = prodStr;
        const match = prodStr.match(/\[(.*?)\]\s*(.*)/);
        if (match) {
          sku = match[1].trim();
          name = match[2].trim();
        }

        await prisma.$transaction(async (tx) => {
          // 2. Find/Create Product
          let product = await tx.product.findUnique({ where: { sku } });
          if (!product) {
            product = await tx.product.create({
              data: { sku, name, unit, description: 'Imported from Odoo' }
            });
            await tx.stock.create({ data: { productId: product.id, quantity: 0 } });
            stats.created++;
          }

          // 3. Find/Create Box for Location
          // Logic: Find box by code matching locStr
          let box = await tx.box.findUnique({ where: { code: locStr } });
          
          if (!box && locStr) {
            // Create a virtual box in a default "Imported" location
            // First, ensure we have an "Odoo Import" structure
            let floor = await tx.floor.upsert({
              where: { name: 'AREA IMPORT' },
              update: {},
              create: { name: 'AREA IMPORT' }
            });

            let rack = await tx.rack.findFirst({ where: { floorId: floor.id, letter: 'O' } });
            if (!rack) rack = await tx.rack.create({ data: { floorId: floor.id, letter: 'O' } });

            let section = await tx.section.findFirst({ where: { rackId: rack.id, number: 1 } });
            if (!section) section = await tx.section.create({ data: { rackId: rack.id, number: 1 } });

            let level = await tx.rackLevel.findFirst({ where: { sectionId: section.id, number: 1 } });
            if (!level) level = await tx.rackLevel.create({ data: { sectionId: section.id, number: 1 } });

            let pallet = await tx.pallet.findUnique({ where: { code: 'OD-IMPORT' } });
            if (!pallet) pallet = await tx.pallet.create({ data: { code: 'OD-IMPORT', name: 'Pallet Odoo Import', rackLevelId: level.id } });

            box = await tx.box.create({
              data: { code: locStr, name: `Loc: ${locStr}`, palletId: pallet.id }
            });
          }

          if (box) {
            // 4. Update BoxProduct (Upsert)
            // Note: lotNumber is part of unique constraint now
            const boxProduct = await tx.boxProduct.upsert({
              where: { boxId_productId_lotNumber: { boxId: box.id, productId: product.id, lotNumber: lotStr } },
              update: { 
                quantity: invQty, 
                reservedQuantity: resQty 
              },
              create: { 
                boxId: box.id, 
                productId: product.id, 
                lotNumber: lotStr, 
                quantity: invQty, 
                reservedQuantity: resQty 
              }
            });

            // 5. Update Global Stock (Recalculate for accuracy)
            const allProductsInBoxes = await tx.boxProduct.findMany({ where: { productId: product.id } });
            const totalQty = allProductsInBoxes.reduce((sum, bi) => sum + bi.quantity, 0);
            const totalRes = allProductsInBoxes.reduce((sum, bi) => sum + bi.reservedQuantity, 0);

            await tx.stock.update({
              where: { productId: product.id },
              data: { quantity: totalQty, reservedQuantity: totalRes }
            });
          }
        });

        stats.updated++;
      } catch (err) {
        stats.errors.push({ row: i, product: prodStr, error: err.message });
      }
    }

    res.json({ message: 'Import selesai', stats });
  } catch (err) {
    next(err);
  }
});
