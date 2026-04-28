import test from 'node:test';
import assert from 'node:assert/strict';

const RUN_INTEGRATION = process.env.RUN_INTEGRATION_TESTS === '1';
const integrationTest = RUN_INTEGRATION ? test : test.skip;

integrationTest('transaction flow end-to-end on real DB', async (t) => {
  const [{ default: prisma }, { createInventoryTransaction }] = await Promise.all([
    import('../../lib/prisma.js'),
    import('./transactions-service.js'),
  ]);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    await prisma.$disconnect();
    t.skip('Database tidak aktif atau tidak dapat diakses');
    return;
  }

  const scope = `itx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const sku = `IT-SKU-${scope}`;
  const username = `it-user-${scope}`;
  const boxCodeA = `IT-BOX-A-${scope}`;
  const boxCodeB = `IT-BOX-B-${scope}`;

  let user;
  let product;
  let boxA;
  let boxB;

  try {
    user = await prisma.user.create({
      data: {
        username,
        passwordHash: 'integration-test-only',
        name: `Integration ${scope}`,
        role: 'ADMIN',
        isActive: true,
      },
    });

    product = await prisma.product.create({
      data: {
        name: `Integration Product ${scope}`,
        sku,
        unit: 'pcs',
        minStock: 2,
      },
    });

    await prisma.stock.create({
      data: {
        productId: product.id,
        quantity: 0,
      },
    });

    boxA = await prisma.box.create({
      data: {
        code: boxCodeA,
        name: `Box A ${scope}`,
      },
    });

    boxB = await prisma.box.create({
      data: {
        code: boxCodeB,
        name: `Box B ${scope}`,
      },
    });

    const inResult = await createInventoryTransaction({
      prisma,
      userId: user.id,
      input: {
        productId: product.id,
        type: 'IN',
        quantity: 10,
        boxId: boxA.id,
        lotNumber: '',
        note: scope,
      },
    });

    assert.equal(inResult.newStock, 10);

    const moveResult = await createInventoryTransaction({
      prisma,
      userId: user.id,
      input: {
        productId: product.id,
        type: 'MOVE',
        quantity: 4,
        boxId: boxA.id,
        targetBoxId: boxB.id,
        lotNumber: '',
        note: scope,
      },
    });

    assert.equal(moveResult.newStock, 10);

    const outResult = await createInventoryTransaction({
      prisma,
      userId: user.id,
      input: {
        productId: product.id,
        type: 'OUT',
        quantity: 3,
        boxId: boxB.id,
        lotNumber: '',
        note: scope,
      },
    });

    assert.equal(outResult.newStock, 7);

    const adjustResult = await createInventoryTransaction({
      prisma,
      userId: user.id,
      input: {
        productId: product.id,
        type: 'ADJUST',
        quantity: 8,
        lotNumber: '',
        note: scope,
      },
    });

    assert.equal(adjustResult.newStock, 8);

    const [stock, boxALot, boxBLot, txCount] = await Promise.all([
      prisma.stock.findUnique({ where: { productId: product.id } }),
      prisma.boxProduct.findUnique({
        where: { boxId_productId_lotNumber: { boxId: boxA.id, productId: product.id, lotNumber: '' } },
      }),
      prisma.boxProduct.findUnique({
        where: { boxId_productId_lotNumber: { boxId: boxB.id, productId: product.id, lotNumber: '' } },
      }),
      prisma.transaction.count({ where: { note: { contains: scope } } }),
    ]);

    assert.equal(stock?.quantity, 8);
    assert.equal(boxALot?.quantity, 6);
    assert.equal(boxBLot?.quantity, 1);
    assert.equal(txCount, 4);
  } finally {
    await prisma.transaction.deleteMany({ where: { note: { contains: scope } } });

    if (product?.id) {
      await prisma.boxProduct.deleteMany({ where: { productId: product.id } });
      await prisma.stock.deleteMany({ where: { productId: product.id } });
      await prisma.product.deleteMany({ where: { id: product.id } });
    }

    if (boxA?.id || boxB?.id) {
      await prisma.box.deleteMany({ where: { id: { in: [boxA?.id, boxB?.id].filter(Boolean) } } });
    }

    if (user?.id) {
      await prisma.user.deleteMany({ where: { id: user.id } });
    }

    await prisma.$disconnect();
  }
});
