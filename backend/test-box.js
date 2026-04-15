// test-box.js
import prisma from './src/lib/prisma.js';

async function main() {
  // 1. Create a RackLevel (e.g. Rack A-4 Level 2)
  // Note: Seeding rack levels might depend on existing data, but let's adjust the nomenclature
  const rackLevel = await prisma.rackLevel.upsert({
    where: { id: 1 }, 
    update: {},
    create: { number: 1, sectionId: 1 } 
  }).catch(() => ({ id: 1 }));

  // 2. Create a Pallet on that level
  const pallet = await prisma.pallet.upsert({
    where: { code: 'PAL-LAPTOP-01' },
    update: {},
    create: { code: 'PAL-LAPTOP-01', name: 'Pallet Laptop Barebone', rackLevelId: rackLevel.id }
  });

  // 3. Create the Barebone Box
  const box = await prisma.box.upsert({
    where: { code: 'BOX-BAREBONE-01' },
    update: {},
    create: { code: 'BOX-BAREBONE-01', name: 'Dus Barebone Laptop', palletId: pallet.id }
  });

  console.log(`✅ Box Created! Scan QR: BOX-BAREBONE-01`);

  // 4. Assure products exist: LCD, Keyboard, Backdoor, Baterai
  const partNames = ['LCD Monitor 14"', 'Keyboard UK Layout', 'Backdoor Casing', 'Baterai 5000mAh'];
  
  for (const partName of partNames) {
    const sku = `PART-${partName.substring(0,3).toUpperCase()}-01`;
    let product = await prisma.product.findUnique({ where: { sku } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: partName,
          sku: sku,
          unit: 'pcs',
          minStock: 5,
        }
      });
      // Give initial general stock
      await prisma.stock.create({
        data: { productId: product.id, quantity: 100 }
      });
    }

    // Add 1 pc of this part into the Box
    await prisma.boxProduct.upsert({
      where: { boxId_productId: { boxId: box.id, productId: product.id } },
      update: { quantity: 1 },
      create: { boxId: box.id, productId: product.id, quantity: 1 }
    });

    console.log(`✅ Added 1 pcs of "${product.name}" to Box BOX-BAREBONE-01`);
  }

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
