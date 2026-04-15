import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('--- USERS IN DATABASE ---');
    console.dir(users.map(u => ({ id: u.id, username: u.username, role: u.role, isActive: u.isActive })));
    console.log('-------------------------');
  } catch (err) {
    console.error('Failed to fetch users:', err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
