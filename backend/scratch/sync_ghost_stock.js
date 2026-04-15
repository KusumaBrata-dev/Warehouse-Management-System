import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/warehouse_db?schema=public"
    }
  }
});

async function syncAll() {
  console.log('--- SYNCING STOCK START ---');
  const items = await prisma.item.findMany({
    include: {
      stock: true,
      boxItems: true
    }
  });

  for (const item of items) {
    const boxSum = item.boxItems.reduce((acc, bi) => acc + bi.quantity, 0);
    const globalStock = item.stock?.quantity ?? 0;

    if (boxSum !== globalStock) {
      console.log(`[!] Mismatch Item ${item.sku} (${item.name}): Global=${globalStock}, SumBoxes=${boxSum}`);
      
      // We assume SUM(Boxes) is the real physical stock because of the user's focus on boxes.
      // But if there's global stock higher than boxes, we might need an 'Unassigned Box'.
      // For now, let's just update Global Stock to match Box Sum to ensure sync.
      
      await prisma.stock.update({
        where: { itemId: item.id },
        data: { quantity: boxSum }
      });
      console.log(`[✓] Updated Item ${item.sku} Global Stock to ${boxSum}`);
    }
  }
  console.log('--- SYNCING STOCK COMPLETE ---');
  await prisma.$disconnect();
}

syncAll().catch(e => {
  console.error(e);
  process.exit(1);
});
