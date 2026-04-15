import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- CLEANUP AUTO-GENERATED BOXES START ---');
  
  // 1. Find the boxes
  const autoBoxes = await prisma.box.findMany({
    where: {
      name: { contains: 'Auto-Generated' }
    },
    include: {
      items: true
    }
  });

  console.log(`Found ${autoBoxes.length} auto-generated boxes.`);

  for (const box of autoBoxes) {
    if (box.items.length > 0) {
      console.log(`[!] Box ${box.name} (ID: ${box.id}) HAS ITEMS. Skipping deletion to prevent data loss. Please relocate items first.`);
      continue;
    }
    
    await prisma.box.delete({
      where: { id: box.id }
    });
    console.log(`[✓] Deleted Box: ${box.name} (ID: ${box.id})`);
  }

  console.log('--- CLEANUP COMPLETE ---');
  await prisma.$disconnect();
}

cleanup().catch(e => {
  console.error(e);
  process.exit(1);
});
