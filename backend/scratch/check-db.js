import prisma from '../src/lib/prisma.js';

async function main() {
  const floors = await prisma.floor.findMany();
  const products = await prisma.product.findMany();
  const users = await prisma.user.findMany();
  
  console.log('--- DATABASE STATUS ---');
  console.log(`Floors: ${floors.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Users: ${users.length}`);
  
  if (floors.length === 0) {
    console.log('\n[WARNING] Warehouse hierarchy is EMPTY!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
