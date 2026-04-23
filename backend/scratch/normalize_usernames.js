import prisma from "../src/lib/prisma.js";

async function normalizeUsernames() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const normalized = user.username.toLowerCase();
    if (normalized !== user.username) {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: normalized }
      });
      console.log(`Normalized: ${user.username} -> ${normalized}`);
    }
  }
  console.log("✅ Username normalization complete.");
  await prisma.$disconnect();
}

normalizeUsernames();
