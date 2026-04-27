import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireAdminOrPPIC } from '../middleware/auth.js';

export const suppliersRouter = Router();

suppliersRouter.use(authenticate);

// GET /api/suppliers
suppliersRouter.get('/', async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
});

// POST /api/suppliers
suppliersRouter.post('/', requireAdminOrPPIC, async (req, res, next) => {
  try {
    const { name, code, address, phone } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and Code are required' });

    const supplier = await prisma.supplier.create({
      data: { name, code, address, phone },
    });
    res.status(201).json(supplier);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Supplier code already exists' });
    next(err);
  }
});

// PUT /api/suppliers/:id
suppliersRouter.put('/:id', requireAdminOrPPIC, async (req, res, next) => {
  try {
    const { name, code, address, phone } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { name, code, address, phone },
    });
    res.json(supplier);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Supplier not found' });
    next(err);
  }
});

// DELETE /api/suppliers/:id
suppliersRouter.delete('/:id', requireAdminOrPPIC, async (req, res, next) => {
  try {
    await prisma.supplier.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default suppliersRouter;
