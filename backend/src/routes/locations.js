import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import QRCode from 'qrcode';

export const locationsRouter = Router();

locationsRouter.use(authenticate);

// GET /api/locations/floors — List floors for sidebar
locationsRouter.get('/floors', async (req, res, next) => {
  try {
    const floors = await prisma.floor.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(floors);
  } catch (err) {
    next(err);
  }
});

// GET /api/locations/personal — List items assigned to specific persons
locationsRouter.get('/personal', async (req, res, next) => {
  try {
    const personalBoxes = await prisma.box.findMany({
      where: { isPersonal: true },
      include: {
        holder: { select: { id: true, name: true, role: true } },
        boxProducts: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(personalBoxes);
  } catch (err) {
    next(err);
  }
});

// GET /api/locations — List hierarchy filtered by floor
locationsRouter.get('/', async (req, res, next) => {
  try {
    const { floorId } = req.query;
    
    const where = floorId ? { id: parseInt(floorId) } : {};

    const floors = await prisma.floor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        racks: {
          orderBy: { letter: 'asc' },
          include: {
            sections: {
              orderBy: { number: 'asc' },
              include: {
                levels: {
                  orderBy: { number: 'asc' },
                  include: {
                    pallets: {
                      include: {
                        boxes: {
                          include: {
                            boxProducts: { include: { product: true } }
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
    });

    res.json(floors);
  } catch (err) {
    next(err);
  }
});

// GET /api/locations/search — Global inventory search
locationsRouter.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const searchData = await Promise.all([
      // 1. Search Products
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } }
          ]
        },
        include: {
          boxProducts: {
            include: {
              box: {
                include: {
                  pallet: {
                    include: {
                      rackLevel: {
                        include: {
                          section: { include: { rack: { include: { floor: true } } } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        take: 20
      }),
      // 2. Search Boxes
      prisma.box.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } }
          ]
        },
        include: {
          pallet: {
            include: {
              rackLevel: {
                include: {
                  section: { include: { rack: { include: { floor: true } } } }
                }
              }
            }
          }
        },
        take: 20
      }),
      // 3. Search Pallets
      prisma.pallet.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } }
          ]
        },
        include: {
          rackLevel: {
            include: {
              section: { include: { rack: { include: { floor: true } } } }
            }
          }
        },
        take: 20
      }),
      // 4. Search Personnel (Staff)
      prisma.user.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' }
        },
        include: {
          boxes: { include: { boxProducts: { include: { product: true } } } }
        },
        take: 10
      })
    ]);

    const [products, boxes, pallets, users] = searchData;

    // Format results with path
    const results = [
      ...products.flatMap(product => product.boxProducts.map(bp => ({
        id: `product-${product.id}-${bp.boxId}`,
        type: 'product',
        title: product.name,
        name: product.name,
        code: product.sku,
        boxCode: bp.box.code,
        path: formatPath(bp.box.pallet?.rackLevel),
        location: bp.box.pallet?.rackLevel
      }))),
      ...boxes.map(box => ({
        id: `box-${box.id}`,
        type: 'box',
        title: box.name,
        name: box.name,
        code: box.code,
        path: formatPath(box.pallet?.rackLevel) || (box.isPersonal ? `Staf: ${box.holder?.name}` : 'Tanpa Lokasi'),
        location: box.pallet?.rackLevel
      })),
      ...pallets.map(p => ({
        id: `pallet-${p.id}`,
        type: 'pallet',
        title: p.name,
        name: p.name,
        code: p.code,
        path: formatPath(p.rackLevel),
        location: p.rackLevel
      })),
      ...users.map(u => ({
        id: `user-${u.id}`,
        type: 'user',
        title: u.name,
        name: u.name,
        code: u.role,
        path: `Staff Gudang (${u.boxes?.length || 0} Assets)`,
        location: null
      }))
    ];

    // Add search for personal boxes
    const personalBoxesSearch = await prisma.box.findMany({
      where: {
        isPersonal: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { holder: { name: { contains: q, mode: 'insensitive' } } }
        ]
      },
      include: { holder: true },
      take: 10
    });

    results.push(...personalBoxesSearch.map(box => ({
      id: `personal-box-${box.id}`,
      type: 'personal-box',
      name: box.name || `Asset: ${box.holder?.name}`,
      code: box.code,
      path: `Personil: ${box.holder?.name || 'Unassigned'}`,
      location: null
    })));

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/locations/racks — Add new rack row to a floor
locationsRouter.post('/racks', async (req, res, next) => {
  try {
    const { letter, floorId } = req.body;
    const rack = await prisma.rack.create({
      data: { letter, floorId: parseInt(floorId) }
    });
    res.json(rack);
  } catch (err) {
    next(err);
  }
});

// POST /api/locations/sections — Add new section (column) to a rack
locationsRouter.post('/sections', async (req, res, next) => {
  try {
    const { number, rackId } = req.body;
    const section = await prisma.section.create({
      data: { number: parseInt(number), rackId: parseInt(rackId) }
    });
    res.json(section);
  } catch (err) {
    next(err);
  }
});

// POST /api/locations/levels — Add new level to a section
locationsRouter.post('/levels', async (req, res, next) => {
  try {
    const { number, sectionId } = req.body;
    const level = await prisma.rackLevel.create({
      data: { number: parseInt(number), sectionId: parseInt(sectionId) }
    });
    res.json(level);
  } catch (err) {
    next(err);
  }
});

function formatPath(level) {
  if (!level) return 'Tidak terdata';
  const f = level.section.rack.floor.name;
  const r = level.section.rack.letter;
  const s = level.section.number;
  const l = level.number;
  return `${f} > Rak ${r}${s} > Level ${l}`;
}

// POST /api/locations/pallets — Register new pallet
locationsRouter.post('/pallets', async (req, res, next) => {
  try {
    const { code, name, rackLevelId } = req.body;
    if (!code || !rackLevelId) return res.status(400).json({ error: 'Kode dan Level Rak wajib diisi' });
    
    const pallet = await prisma.pallet.create({
      data: { code, name: name || null, rackLevelId: parseInt(rackLevelId) },
      include: {
        rackLevel: {
          include: { section: { include: { rack: { include: { floor: true } } } } }
        }
      }
    });
    res.json(pallet);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Kode Pallet sudah digunakan' });
    next(err);
  }
});

// POST /api/locations/boxes/personal — Register new personal box
locationsRouter.post('/boxes/personal', async (req, res, next) => {
  try {
    const { code, name, holderId } = req.body;
    if (!code || !holderId) return res.status(400).json({ error: 'Kode dan Pemegang (Staff) wajib diisi' });

    const box = await prisma.box.create({
      data: { 
        code, 
        name: name || null, 
        isPersonal: true, 
        holderId: parseInt(holderId) 
      },
      include: { holder: true }
    });
    res.json(box);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Kode Asset/Box sudah digunakan' });
    next(err);
  }
});

// PUT /api/locations/boxes/:id — Update box info
locationsRouter.put('/boxes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const box = await prisma.box.update({
      where: { id: parseInt(id) },
      data: { name, code }
    });
    res.json(box);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/boxes/:id — Delete a box (only if empty)
locationsRouter.delete('/boxes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const bid = parseInt(id);

    const box = await prisma.box.findUnique({
      where: { id: bid },
      include: { boxProducts: true }
    });

    if (!box) return res.status(404).json({ error: 'Box tidak ditemukan' });
    if (box.boxProducts.some(bp => bp.quantity > 0)) {
      return res.status(400).json({ error: 'Box tidak dapat dihapus karena masih berisi produk.' });
    }

    await prisma.box.delete({ where: { id: bid } });
    res.json({ message: 'Box berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/locations/pallets/:id/move — Move a pallet to a new level
locationsRouter.patch('/pallets/:id/move', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rackLevelId } = req.body;
    const updatedPallet = await prisma.pallet.update({
      where: { id: parseInt(id) },
      data: { rackLevelId: parseInt(rackLevelId) },
      include: {
        rackLevel: {
          include: {
            section: { include: { rack: { include: { floor: true } } } }
          }
        }
      }
    });
    res.json(updatedPallet);
  } catch (err) {
    next(err);
  }
});

// POST /api/locations/cleanup-auto — Delete empty auto-generated boxes
locationsRouter.post('/cleanup-auto', async (req, res, next) => {
  try {
    const boxes = await prisma.box.findMany({
      where: { name: { contains: 'Auto-Generated' } },
      include: { boxProducts: true }
    });
    
    let deletedCount = 0;
    for (const box of boxes) {
      // Check if box is effectively empty (no products or all qty 0)
      const isEmpty = box.boxProducts.length === 0 || box.boxProducts.every(bp => bp.quantity === 0);
      
      if (isEmpty) {
        // Disconnect transactions from this box so it can be deleted
        await prisma.transaction.updateMany({
          where: { boxId: box.id },
          data: { boxId: null }
        });
        
        // Clear box items (the items themselves remain in Master Stock)
        await prisma.boxProduct.deleteMany({ where: { boxId: box.id } });
        
        // Finally delete the box
        await prisma.box.delete({ where: { id: box.id } });
        deletedCount++;
      }
    }
    
    res.json({ message: `Berhasil menghapus ${deletedCount} box auto-generated yang kosong.` });
  } catch (err) {
    next(err);
  }
});

// GET /api/locations/box-inventory — List inventory grouped by Box
locationsRouter.get('/box-inventory', async (req, res, next) => {
  try {
    const boxes = await prisma.box.findMany({
      include: {
        pallet: {
          include: {
            rackLevel: {
              include: {
                section: { include: { rack: { include: { floor: true } } } }
              }
            }
          }
        },
        boxProducts: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(boxes);
  } catch (err) {
    next(err);
  }
});

// GET /api/locations/qr — Generate QR for any location type
locationsRouter.get('/qr', async (req, res, next) => {
  try {
    const { type, id } = req.query;
    if (!type || !id) return res.status(400).json({ error: 'type and id are required' });

    let name = '';
    let qrValue = '';

    if (type === 'floor') {
      const f = await prisma.floor.findUnique({ where: { id: parseInt(id) } });
      name = f.name;
      qrValue = `LOC:FLR:${f.id}`;
    } else if (type === 'rack') {
      const r = await prisma.rack.findUnique({ where: { id: parseInt(id) }, include: { floor: true } });
      name = `Rak ${r.letter} (${r.floor.name})`;
      qrValue = `LOC:RCK:${r.id}`;
    } else if (type === 'section') {
      const s = await prisma.section.findUnique({ where: { id: parseInt(id) }, include: { rack: true } });
      name = `Baris ${s.rack.letter}${s.number}`;
      qrValue = `LOC:SEC:${s.id}`;
    } else if (type === 'level') {
      const l = await prisma.rackLevel.findUnique({ where: { id: parseInt(id) }, include: { section: { include: { rack: true } } } });
      name = `Rak ${l.section.rack.letter}${l.section.number} Level ${l.number}`;
      qrValue = `LOC:LVL:${l.id}`;
    } else if (type === 'pallet') {
      const p = await prisma.pallet.findUnique({ where: { id: parseInt(id) } });
      name = p.name || p.code;
      qrValue = `LOC:PAL:${p.id}`; 
    } else if (type === 'box') {
      const b = await prisma.box.findUnique({ where: { id: parseInt(id) } });
      name = b.name || b.code;
      qrValue = `LOC:BOX:${b.id}`;
    }

    const qrBuffer = await QRCode.toBuffer(qrValue, {
      width: 400,
      margin: 2,
      color: { dark: '#0f1629', light: '#ffffff' }
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/boxes/:id
locationsRouter.delete('/boxes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const boxId = parseInt(id);
    
    // Disconnect transactions
    await prisma.transaction.updateMany({
      where: { boxId },
      data: { boxId: null }
    });
    
    // Delete BoxProducts
    await prisma.boxProduct.deleteMany({ where: { boxId } });
    
    // Delete Box
    await prisma.box.delete({ where: { id: boxId } });
    
    res.json({ message: 'Box berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/locations/pallets/:id/move
locationsRouter.patch('/pallets/:id/move', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newLevelId } = req.body;
    if (!newLevelId) return res.status(400).json({ error: 'newLevelId is required' });

    const pallet = await prisma.pallet.update({
      where: { id: parseInt(id) },
      data: { rackLevelId: parseInt(newLevelId) },
      include: {
        rackLevel: {
          include: {
            section: { include: { rack: { include: { floor: true } } } }
          }
        }
      }
    });

    res.json({ message: 'Pallet berhasil dipindah', pallet });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/pallets/:id
locationsRouter.delete('/pallets/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const palletId = parseInt(id);
    
    // Get all boxes in this pallet
    const boxes = await prisma.box.findMany({ where: { palletId } });
    
    for (const box of boxes) {
       await prisma.transaction.updateMany({ where: { boxId: box.id }, data: { boxId: null } });
       await prisma.boxProduct.deleteMany({ where: { boxId: box.id } });
       await prisma.box.delete({ where: { id: box.id } });
    }
    
    await prisma.pallet.delete({ where: { id: palletId } });
    
    res.json({ message: 'Pallet dan seluruh isinya berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/levels/:id
locationsRouter.delete('/levels/:id', async (req, res, next) => {
  try {
    await prisma.rackLevel.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Level Rak berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/sections/:id
locationsRouter.delete('/sections/:id', async (req, res, next) => {
  try {
    await prisma.section.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Seksi/Kolom berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/racks/:id
locationsRouter.delete('/racks/:id', async (req, res, next) => {
  try {
    await prisma.rack.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Rak berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

export default locationsRouter;
