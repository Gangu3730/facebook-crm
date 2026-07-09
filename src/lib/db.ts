import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

// Parse MySQL database URL
const urlStr = process.env.DATABASE_URL || '';
let host = '127.0.0.1';
let port = 3306;
let user = 'root';
let password = '';
let database = 'crm';

if (urlStr) {
  try {
    const parsed = new URL(urlStr);
    host = parsed.hostname || '127.0.0.1';
    port = parsed.port ? parseInt(parsed.port, 10) : 3306;
    user = decodeURIComponent(parsed.username || 'root');
    password = decodeURIComponent(parsed.password || '');
    database = parsed.pathname.replace(/^\//, '') || 'crm';
  } catch (e) {
    console.error('Failed to parse DATABASE_URL, using defaults:', e);
  }
}

const adapter = new PrismaMariaDb({
  host,
  port,
  user,
  password,
  database,
  connectionLimit: 10,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

export { prisma };
export default prisma;
