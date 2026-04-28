import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();
const password = (process.env.SEED_ADMIN_PASSWORD || 'admin12345').trim();
const name = (process.env.SEED_ADMIN_NAME || 'Administrator').trim();

async function main() {
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD minimal 8 karakter');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      name,
      role: 'ADMIN',
      isActive: true,
      passwordHash,
    },
    create: {
      username,
      name,
      role: 'ADMIN',
      isActive: true,
      passwordHash,
    },
  });

  console.log(`Admin siap: username=${user.username}, role=${user.role}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
