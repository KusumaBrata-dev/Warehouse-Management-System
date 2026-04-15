import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

async function seed() {
  console.log("🌱 Seeding database...");

  // Default categories
  const categories = [
    "Raw Material",
    "Spare Part",
    "Consumable",
    "Finished Goods",
    "Packaging",
    "Chemical",
  ];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ Categories created");

  // Default admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      name: "Administrator",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user created: admin / admin123`);

  // Sample PPIC user
  const ppicPassword = await bcrypt.hash("ppic123", 12);
  await prisma.user.upsert({
    where: { username: "ppic" },
    update: {},
    create: {
      username: "ppic",
      passwordHash: ppicPassword,
      name: "PPIC Staff",
      role: "PPIC",
    },
  });
  console.log(`✅ PPIC user created: ppic / ppic123`);

  // Sample warehouse staff
  const staffPassword = await bcrypt.hash("staff123", 12);
  await prisma.user.upsert({
    where: { username: "gudang" },
    update: {},
    create: {
      username: "gudang",
      passwordHash: staffPassword,
      name: "Staff Gudang",
      role: "STAFF",
    },
  });
  console.log(`✅ Staff user created: gudang / staff123`);

  // Sample Products
  const sampleProducts = [
    { sku: "PROD-001", name: "Sample Raw Material", unit: "kg" },
    { sku: "PROD-002", name: "Sample Spare Part", unit: "pcs" },
  ];

  const defaultCategory = await prisma.category.findFirst();

  for (const productData of sampleProducts) {
    const existing = await prisma.product.findUnique({
      where: { sku: productData.sku },
    });
    if (!existing) {
      const product = await prisma.product.create({
        data: { ...productData, categoryId: defaultCategory?.id },
      });
      await prisma.stock.create({
        data: {
          productId: product.id,
          quantity: Math.floor(Math.random() * 100) + 5,
        },
      });
      await prisma.rackLocation.create({
        data: {
          productId: product.id,
          rackCode: `A-${Math.ceil(Math.random() * 5)}`,
          row: "A",
          level: Math.ceil(Math.random() * 5),
        },
      });
    }
  }
  console.log("✅ Sample products created");

  console.log("\n🎉 Database seeded successfully!\n");
  console.log("Default accounts:");
  console.log("  admin   / admin123  (ADMIN)");
  console.log("  ppic    / ppic123   (PPIC)");
  console.log("  gudang  / staff123  (STAFF)\n");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
