import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🏗️  Initializing Full Warehouse Hierarchy (Grid System)...');
  
  if (!prisma) {
    throw new Error('Prisma client is undefined! Check backend/src/lib/prisma.js');
  }

  // 1. Create Default Users
  console.log('👤 Seeding default users...');
  const users = [
    { username: 'admin', password: 'admin123', name: 'Administrator', role: 'ADMIN' },
    { username: 'ppic', password: 'ppic123', name: 'PPIC Staff', role: 'PPIC' },
    { username: 'gudang', password: 'staff123', name: 'Staff Gudang', role: 'STAFF' },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { 
        username: u.username, 
        passwordHash, 
        name: u.name, 
        role: u.role 
      }
    });
  }
  console.log('✅ Default users created.');

  // 2. Create Floors
  const createFloor = async (name) => {
    let f = await prisma.floor.findUnique({ where: { name } });
    if (!f) f = await prisma.floor.create({ data: { name } });
    return f;
  };

  const floor1 = await createFloor('Gudang Lantai 1');
  const floor2 = await createFloor('Gudang Lantai 2');

  const floors = [floor1, floor2];
  const rackLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const sections = [1, 2, 3, 4, 5, 6, 7];
  const levels = [1, 2, 3];

  let totalLevels = 0;

  for (const floor of floors) {
    for (const letter of rackLetters) {
      console.log(`  └─ Creating Rack ${letter} on ${floor.name}`);
      const rack = await prisma.rack.create({
        data: { letter, floorId: floor.id }
      });

      for (const sectionNum of sections) {
        const section = await prisma.section.create({
          data: { number: sectionNum, rackId: rack.id }
        });

        for (const levelNum of levels) {
          await prisma.rackLevel.create({
            data: { number: levelNum, sectionId: section.id }
          });
          totalLevels++;
        }
      }
    }
  }

  console.log(`✅ Created ${floors.length} Floors, ${rackLetters.length * floors.length} Racks, ${totalLevels} Levels.`);

  // 3. Restore TN35 Demo Data
  const levelA1L1 = await prisma.rackLevel.findFirst({
    where: {
      number: 1,
      section: {
        number: 1,
        rack: {
          letter: 'A',
          floor: { name: 'Gudang Lantai 1' }
        }
      }
    }
  });

  if (levelA1L1) {
    const pallet = await prisma.pallet.create({
      data: {
        code: 'PAL-TN35',
        name: 'Pallet BNI TN35',
        rackLevelId: levelA1L1.id
      }
    });

    const box = await prisma.box.create({
      data: {
        code: 'TN35',
        name: 'Box Barebone TN35 (BNI)',
        palletId: pallet.id
      }
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
          data: { name: part.name, sku: part.sku, unit: 'pcs', minStock: 5 }
        });
        await prisma.stock.create({ data: { productId: product.id, quantity: 100 } });
      }

      await prisma.boxProduct.create({
        data: { boxId: box.id, productId: product.id, quantity: 10 }
      });
    }
    console.log('📦 TN35 Demo data restored to Lantai 1 -> Rak A1 -> Level 1');
  }

  console.log('🚀 Warehouse initialization complete!');
}

main().catch(console.error).finally(() => prisma?.$disconnect());
