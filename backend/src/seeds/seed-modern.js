import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

async function seed() {
  console.log("🚀 Starting MODERN Warehouse Seeding...");

  // 1. Clear Existing Data (Ordered to respect Foreign Keys)
  console.log("🧹 Cleaning up old inventory data...");
  await prisma.transaction.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.boxProduct.deleteMany();
  await prisma.rackLocation.deleteMany();
  await prisma.box.deleteMany();
  await prisma.pallet.deleteMany();
  await prisma.rackLevel.deleteMany();
  await prisma.section.deleteMany();
  await prisma.rack.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Cleanup complete.");

  // 2. Default Categories
  const categories = ["Spare Part", "Electronics", "Mechanical", "Consumables"];
  const categoryMap = {};
  for (const name of categories) {
    const cat = await prisma.category.create({ data: { name } });
    categoryMap[name] = cat.id;
  }
  console.log("✅ Categories created");

  // 3. Default Users
  const password = await bcrypt.hash("admin123", 12);
  const staffPassword = await bcrypt.hash("staff123", 12);
  
  const admin = await prisma.user.create({
    data: { username: "admin", passwordHash: password, name: "Administrator", role: "ADMIN" }
  });
  await prisma.user.create({
    data: { username: "gudang", passwordHash: staffPassword, name: "Staff Warehouse", role: "STAFF" }
  });
  console.log("✅ Users created (admin/admin123, gudang/staff123)");

  // 4. Create Warehouse Hierarchy (Floor -> Rack -> Section -> Level -> Pallet -> Box)
  console.log("🏗️ Building Warehouse Hierarchy...");
  const floorNames = ["Lantai 1", "Lantai 2"];
  
  for (const fName of floorNames) {
    const floor = await prisma.floor.create({ data: { name: fName } });
    console.log(`  🏢 Created Floor: ${fName}`);
    
    // Create 2 Racks per Floor (Rack A, B)
    for (const letter of ["A", "B"]) {
      const rack = await prisma.rack.create({
        data: { letter, floorId: floor.id }
      });
      console.log(`    📟 Created Rack: ${letter}`);
      
      // Create 3 Sections per Rack (Section 1, 2, 3)
      for (let sNum = 1; sNum <= 3; sNum++) {
        const section = await prisma.section.create({
          data: { number: sNum, rackId: rack.id }
        });
        
        // Create 2 Levels per Section (Level 1, 2)
        for (let lNum = 1; lNum <= 2; lNum++) {
          const level = await prisma.rackLevel.create({
            data: { number: lNum, sectionId: section.id }
          });
          
          // Create 1 Pallet per Level
          const pCode = `PAL-${floor.id}-${rack.letter}${sNum}-L${lNum}`;
          const pallet = await prisma.pallet.create({
            data: { 
              code: pCode, 
              name: `Pallet ${rack.letter}${sNum}-L${lNum}`, 
              rackLevelId: level.id 
            }
          });
          
          // Create 2 Boxes per Pallet
          for (let bNum = 1; bNum <= 2; bNum++) {
            await prisma.box.create({
              data: {
                code: `BOX-${pCode}-${bNum}`,
                name: `Box ${bNum} (${pCode})`,
                palletId: pallet.id
              }
            });
          }
        }
      }
    }
  }
  console.log("✅ Warehouse hierarchy built.");

  // 5. Create Sample Products & Place them in Boxes
  console.log("📦 Creating products and stocking boxes...");
  const sampleProducts = [
    { sku: "FAN-6020", name: "Cooling Fan 6020", unit: "pcs", categoryName: "Spare Part" },
    { sku: "SCR-M3", name: "Screw M3 x 10mm", unit: "pack", categoryName: "Mechanical" },
    { sku: "LED-RED-5", name: "LED Red 5mm", unit: "pcs", categoryName: "Electronics" }
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.create({
      data: { 
        name: p.name, 
        sku: p.sku, 
        unit: p.unit, 
        categoryId: categoryMap[p.categoryName],
        minStock: 10
      }
    });

    // Create a Stock record
    const totalQty = 100;
    await prisma.stock.create({
      data: { productId: product.id, quantity: totalQty }
    });

    // Pick a random box to put it in
    const boxes = await prisma.box.findMany({ take: 5 });
    if (boxes.length > 0) {
      const targetBox = boxes[Math.floor(Math.random() * boxes.length)];
      await prisma.boxProduct.create({
        data: {
          boxId: targetBox.id,
          productId: product.id,
          quantity: totalQty
        }
      });
      
      // Create a Transaction for history
      await prisma.transaction.create({
        data: {
          type: "IN",
          quantity: totalQty,
          productId: product.id,
          boxId: targetBox.id,
          userId: admin.id, // Use dynamic ID
          note: "Initial Seeding Stock"
        }
      });
    }
  }

  console.log("\n✨ MODERN SEEDING COMPLETE! ✨");
}

seed()
  .catch((err) => {
    console.error("\n❌ SEEDING FAILED!");
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
