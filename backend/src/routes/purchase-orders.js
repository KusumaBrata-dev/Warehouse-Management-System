import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

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

// POST /api/purchase-orders
purchaseOrdersRouter.post('/', async (req, res, next) => {
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
// This is the core "Inbound" logic
purchaseOrdersRouter.post('/:id/receive', async (req, res, next) => {
  try {
    const poId = parseInt(req.params.id);
    const { products: receivedProducts } = req.body; // Array of { productId, quantity, boxId }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { products: true },
    });

    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (po.status === 'RECEIVED') return res.status(400).json({ error: 'PO already received' });

    await prisma.$transaction(async (tx) => {
      for (const rx of receivedProducts) {
        const pid = parseInt(rx.productId);
        const qty = parseInt(rx.quantity);
        const bid = parseInt(rx.boxId);

        // 1. Create Transaction (IN)
        await tx.transaction.create({
          data: {
            productId: pid,
            type: 'IN',
            quantity: qty,
            userId: req.user.id,
            boxId: bid,
            purchaseOrderId: poId,
            note: `Received from PO ${po.poNumber}`,
          },
        });

        // 2. Update Global Stock
        await tx.stock.upsert({
          where: { productId: pid },
          update: { quantity: { increment: qty } },
          create: { productId: pid, quantity: qty },
        });

        // 3. Update BoxProduct (Physical Location)
        await tx.boxProduct.upsert({
          where: { boxId_productId_lotNumber: { boxId: bid, productId: pid, lotNumber: null } },
          update: { quantity: { increment: qty } },
          create: { boxId: bid, productId: pid, quantity: qty },
        });
      }

      // 4. Update PO Status
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED' },
      });
    });

    res.json({ message: 'PO received successfully and stock updated' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/purchase-orders/:id/cancel
purchaseOrdersRouter.put('/:id/cancel', async (req, res, next) => {
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
