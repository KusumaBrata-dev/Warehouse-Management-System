import prisma from "../src/lib/prisma.js";
import bcrypt from "bcryptjs";

async function resetAdmin() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: passwordHash, isActive: true },
    create: {
      username: "admin",
      passwordHash: passwordHash,
      name: "Administrator",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Admin credentials reset: admin / admin123");
  await prisma.$disconnect();
}

resetAdmin();
