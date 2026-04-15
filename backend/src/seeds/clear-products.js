import prisma from '../lib/prisma.js';

async function main() {
  console.log('🧹 Menghapus seluruh data Produk dan Stok...');

  try {
    // Menghapus data dengan urutan yang benar (constraint dependencies)
    const delBoxProducts = await prisma.boxProduct.deleteMany({});
    console.log(`- BoxProduct dihapus: ${delBoxProducts.count}`);

    const delTransactions = await prisma.transaction.deleteMany({});
    console.log(`- Transaksi dihapus: ${delTransactions.count}`);

    const delStock = await prisma.stock.deleteMany({});
    console.log(`- Stok dihapus: ${delStock.count}`);

    const delProducts = await prisma.product.deleteMany({});
    console.log(`- Produk dihapus: ${delProducts.count}`);

    // Kita juga hapus kategori karena biasanya kategori spesifik untuk produk
    const delCategories = await prisma.category.deleteMany({});
    console.log(`- Kategori dihapus: ${delCategories.count}`);

    console.log('\n✅ Database sekarang bersih dari data Produk/Stok.');
    console.log('Hierarki Lokasi (Floor, Rack, Section, Level) tetap dipertahankan.');
  } catch (error) {
    console.error('❌ Gagal membersihkan database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
