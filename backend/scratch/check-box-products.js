import prisma from '../src/lib/prisma.js';

async function main() {
  const boxProducts = await prisma.boxProduct.findMany({
    include: {
      box: {
        include: {
          pallet: {
            include: {
              rackLevel: {
                include: {
                  section: {
                    include: {
                      rack: {
                        include: {
                          floor: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      product: true
    }
  });
  
  console.log('--- MODERN INVENTORY STATUS ---');
  console.log(`BoxProduct records: ${boxProducts.length}`);
  
  if (boxProducts.length > 0) {
    boxProducts.forEach(bp => {
      console.log(`- Product: ${bp.product.name}, Qty: ${bp.quantity}, Box: ${bp.box?.name || 'N/A'}`);
    });
  } else {
    console.log('[WARNING] No BoxProduct records found. Inventory will appear EMPTY in stock lists.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
