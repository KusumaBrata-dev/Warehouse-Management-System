import prisma from './src/lib/prisma.js';

async function main() {
  // 1. Delete old dummy products
  const skusToDelete = ['PART-LCD-01', 'PART-KEY-01', 'PART-BAC-01', 'PART-BAT-01'];
  
  // Need to delete BoxProducts first
  await prisma.boxProduct.deleteMany({
    where: { product: { sku: { in: skusToDelete } } }
  });
  
  // Need to delete transactions and stock related to them
  await prisma.transaction.deleteMany({
    where: { product: { sku: { in: skusToDelete } } }
  });
  await prisma.stock.deleteMany({
    where: { product: { sku: { in: skusToDelete } } }
  });
  
  // Delete the products
  await prisma.product.deleteMany({
    where: { sku: { in: skusToDelete } }
  });

  // Delete old dummy boxes
  await prisma.box.deleteMany({
    where: { code: 'BOX-BAREBONE-01' }
  });

  console.log('✅ Old dummy data wiped.');

  // 2. Create the exact setup user requested for TN35
  const shelf = await prisma.rackLevel.upsert({
    where: { id: 1 }, // Note: Seeding rack levels might depend on existing data, but let's adjust the nomenclature
    update: {},
    create: { id: 1, number: 1, sectionId: 1 } // Simplified for seeding
  }).catch(() => null);

  const pallet = await prisma.pallet.upsert({
    where: { code: 'PAL-TN35' },
    update: {},
    create: { code: 'PAL-TN35', name: 'Pallet BNI TN35', rackLevelId: 1 }
  });

  const box = await prisma.box.upsert({
    where: { code: 'BOX-TN35' },
    update: { palletId: pallet.id },
    create: { code: 'BOX-TN35', name: 'Box Barebone TN35 (BNI)', palletId: pallet.id }
  });

  const parts = [
    { name: 'LCD TN35', sku: 'PART-TN35-LCD' },
    { name: 'baterai TN35', sku: 'PART-TN35-BAT' },
    { name: 'Keyboard TN35', sku: 'PART-TN35-KEY' },
  ];

  for (const part of parts) {
    let product = await prisma.product.findUnique({ where: { sku: part.sku } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: part.name,
          sku: part.sku,
          unit: 'pcs',
          minStock: 5,
        }
      });
      await prisma.stock.create({
        data: { productId: product.id, quantity: 100 }
      });
    }

    await prisma.boxProduct.upsert({
      where: { boxId_productId: { boxId: box.id, productId: product.id } },
      update: { quantity: 1 },
      create: { boxId: box.id, productId: product.id, quantity: 1 }
    });
  }

  console.log('✅ TN35 Box configuration successfully created! Scan code: BOX-TN35');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
