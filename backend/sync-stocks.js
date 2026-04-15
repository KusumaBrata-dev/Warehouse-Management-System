import prisma from './src/lib/prisma.js';

async function syncStocks() {
  console.log('🔄 Synchronizing Stocks with Box Products...');
  
  // 1. Ensure a "General/Unassigned" Box exists for orphaned products
  let generalBox = await prisma.box.findUnique({ where: { code: 'UNASSIGNED' } });
  if (!generalBox) {
    // Find any pallet or create one
    let pallet = await prisma.pallet.findFirst();
    if (!pallet) {
      console.log('❌ No pallets found. Please create at least one location first.');
      process.exit(1);
    }
    generalBox = await prisma.box.create({
      data: { code: 'UNASSIGNED', name: 'Box Unassigned (Auto-Generated)', palletId: pallet.id }
    });
    console.log(`📦 Created General Box: ${generalBox.code}`);
  }

  const products = await prisma.product.findMany({
    include: {
      stock: true,
      boxProducts: true
    }
  });

  for (const product of products) {
    const boxSum = product.boxProducts.reduce((sum, bp) => sum + bp.quantity, 0);
    const globalStock = product.stock?.quantity || 0;

    if (boxSum !== globalStock) {
      console.log(`🔍 Processing ${product.sku}: Global=${globalStock}, total in boxes=${boxSum}`);
      
      if (boxSum === 0 && globalStock > 0) {
        // Orphaned stock: Move to General Box
        await prisma.boxProduct.create({
          data: { boxId: generalBox.id, productId: product.id, quantity: globalStock }
        });
        console.log(`   ➡️  Moved ${globalStock} ${product.unit} of ${product.sku} to ${generalBox.code}`);
      } else {
        // Mismatch between boxes and global: Box is Source of Truth
        await prisma.stock.update({
          where: { productId: product.id },
          data: { quantity: boxSum }
        });
        console.log(`   ✅ Adjusted Global Stock of ${product.sku} to ${boxSum} (matching boxes)`);
      }
    }
  }
  
  console.log('✨ Data Synchronization Complete!');
}

syncStocks().catch(console.error).finally(() => prisma.$disconnect());
