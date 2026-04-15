import prisma from '../src/lib/prisma.js';

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('--- USERS IN DATABASE ---');
    console.log(JSON.stringify(users.map(u => ({ id: u.id, username: u.username, role: u.role, isActive: u.isActive })), null, 2));
    console.log('-------------------------');
  } catch (err) {
    console.error('Failed to fetch users:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
