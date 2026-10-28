import { PrismaClient } from '@prisma/client';

const middlewareDatabaseUrl = process.env.SHENTONG_MIDDLEWARE_MONGO_URI;

// 兼容旧部署环境，但不再修改本地 .env 文件，也不会打印连接串。
if (middlewareDatabaseUrl) {
  process.env.DATABASE_URL = middlewareDatabaseUrl;
}

const globalForPrisma = globalThis as typeof globalThis & {
  __interviewLensPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__interviewLensPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__interviewLensPrisma = prisma;
}

export default prisma;
