import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireAdminOrPPIC } from '../middleware/auth.js';
import { validate, receivePOSchema } from '../validations/wms.js';

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(authenticate);

// GET /api/purchase-orders
purchaseOrdersRouter.get('/', async (req, res, next) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        user: { select: { name: true } },
        products: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pos);
  } catch (err) {
    next(err);
  }
});

// GET /api/purchase-orders/:id
purchaseOrdersRouter.get('/:id', async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supplier: true,
        user: { select: { name: true } },
        products: { include: { product: true } },
        transactions: { include: { product: true, box: true } }
      },
    });
    if (!po) return res.status(404).json({ error: 'PO not found' });
    res.json(po);
  } catch (err) {
    next(err);
  }
});

// POST /api/purchase-orders — Restricted to Admin/PPIC
purchaseOrdersRouter.post('/', requireAdminOrPPIC, async (req, res, next) => {
  try {
    const { poNumber, supplierId, notes, products } = req.body;
    if (!poNumber || !supplierId || !products || products.length === 0) {
      return res.status(400).json({ error: 'PO Number, Supplier, and Products are required' });
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: parseInt(supplierId),
        notes,
        userId: req.user.id,
        products: {
          create: products.map(it => ({
            productId: parseInt(it.productId),
            description: it.description || null,
            quantity: parseInt(it.quantity),
            price: it.price ? parseFloat(it.price) : null,
          })),
        },
      },
      include: { products: true },
    });

    res.status(201).json(po);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'PO Number already exists' });
    next(err);
  }
});

// POST /api/purchase-orders/:id/receive
// This is the core "Inbound" logic (receiving items to warehouse)
purchaseOrdersRouter.post('/:id/receive', requireAdminOrPPIC, validate(receivePOSchema), async (req, res, next) => {
  try {
    const poId = parseInt(req.params.id);
    const { products: receivedProducts, palletCode, note } = req.validData;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { products: true, supplier: true },
    });

    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (po.status === 'RECEIVED') return res.status(400).json({ error: 'PO already received' });

    // ── Find INCOMING Area ─────────────────────────────────────────────────
    const incomingFloor = await prisma.floor.findFirst({
      where: { name: 'Incoming Area' },
      include: { racks: { include: { sections: { include: { levels: true } } } } }
    });
    if (!incomingFloor) return res.status(500).json({ error: 'Incoming Area tidak ditemukan.' });
    const firstLevel = incomingFloor.racks[0]?.sections[0]?.levels[0];
    if (!firstLevel) return res.status(500).json({ error: 'Struktur rak Incoming Area belum di-seed.' });

    await prisma.$transaction(async (tx) => {
      const ts = Date.now();

      // ── Resolve Pallet ──
      let pallet;
      if (palletCode) {
        pallet = await tx.pallet.findUnique({ where: { code: palletCode } });
        if (!pallet) {
          pallet = await tx.pallet.create({
            data: { code: palletCode, name: `Pallet PO ${po.poNumber}`, rackLevelId: firstLevel.id, status: 'LOCKED' }
          });
        } else {
          await tx.pallet.update({ where: { id: pallet.id }, data: { status: 'LOCKED' } });
        }
      } else {
        pallet = await tx.pallet.create({
          data: { code: `PLT-PO-${ts}`, name: `Pallet PO ${po.poNumber}`, rackLevelId: firstLevel.id, status: 'LOCKED' }
        });
      }

      // ── Resolve Box ──
      // For POs, we'll create a dedicated box for this receipt batch unless one is provided
      let box = await tx.box.create({
        data: {
          code: `BOX-PO-${ts}`,
          name: `Inbound PO ${po.poNumber}`,
          status: 'RECEIVED',
          palletId: pallet.id
        }
      });

      for (const rx of receivedProducts) {
        const pid = parseInt(rx.productId);
        const qty = parseInt(rx.quantity);
        const lot = rx.lotNumber || '';
        const bid = rx.boxId ? parseInt(rx.boxId) : box.id;

        // 1. Transaction (IN)
        await tx.transaction.create({
          data: {
            productId: pid,
            type: 'IN',
            quantity: qty,
            userId: req.user.id,
            boxId: bid,
            purchaseOrderId: poId,
            toLocationCode: 'INCOMING',
            note: [
              note,
              `PO: ${po.poNumber}`,
              `Supplier: ${po.supplier.name}`,
              `Pallet: ${pallet.code}`,
              lot ? `Lot: ${lot}` : null
            ].filter(Boolean).join(' | '),
          },
        });

        // 2. Global Stock
        await tx.stock.upsert({
          where: { productId: pid },
          update: { quantity: { increment: qty } },
          create: { productId: pid, quantity: qty },
        });

        // 3. BoxProduct
        await tx.boxProduct.upsert({
          where: { boxId_productId_lotNumber: { boxId: bid, productId: pid, lotNumber: lot } },
          update: { quantity: { increment: qty } },
          create: { boxId: bid, productId: pid, quantity: qty, lotNumber: lot },
        });

        // 4. Mark box as RECEIVED
        await tx.box.update({
          where: { id: bid },
          data: { status: 'RECEIVED' },
        });
      }

      // 5. Unlock Pallet
      await tx.pallet.update({
        where: { id: pallet.id },
        data: { status: 'RECEIVED' }
      });

      // 6. Update PO Status
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED' },
      });
    });

    res.json({ message: 'PO received successfully and stock updated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/purchase-orders/:id/cancel
purchaseOrdersRouter.put('/:id/cancel', requireAdminOrPPIC, async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id: parseInt(id) } });

    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (po.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' },
      include: {
        supplier: true,
        user: { select: { name: true } },
        products: { include: { product: true } },
      },
    });

    res.json(updatedPo);
  } catch (err) {
    next(err);
  }
});

export default purchaseOrdersRouter;
