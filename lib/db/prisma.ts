/**
 * Prisma Client 实例
 * 使用全局变量避免开发环境热重载时创建多个连接
 *
 * 数据库连接优先级：
 * 1. SHENTONG_MIDDLEWARE_MONGO_URI（系统环境变量）
 * 2. DATABASE_URL（.env.local 文件）
 *
 * 自动更新规则：
 * - 如果检测到 SHENTONG_MIDDLEWARE_MONGO_URI 与 DATABASE_URL 不匹配
 * - 自动更新 .env.local 为 SHENTONG_MIDDLEWARE_MONGO_URI
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// 动态设置数据库连接（运行时环境变量适配）
const shentongUri = process.env.SHENTONG_MIDDLEWARE_MONGO_URI;
let databaseUrl = process.env.DATABASE_URL;

// 开发环境下自动同步配置
if (process.env.NODE_ENV === "development" && shentongUri) {
  // 如果系统环境变量与配置文件不匹配，自动更新 .env.local
  if (shentongUri !== databaseUrl) {
    const envPath = path.join(process.cwd(), ".env.local");

    try {
      // 读取现有配置
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }

      // 更新或添加 DATABASE_URL
      if (envContent.includes("DATABASE_URL=")) {
        envContent = envContent.replace(
          /DATABASE_URL=.*/,
          `DATABASE_URL="${shentongUri}"`
        );
      } else {
        envContent += `\n# MongoDB数据库连接（自动同步自系统环境变量）\nDATABASE_URL="${shentongUri}"\n`;
      }

      // 写入文件
      fs.writeFileSync(envPath, envContent);
      console.log("\n[数据库配置] 已自动同步 .env.local 为系统环境变量");
      console.log(`  DATABASE_URL: ${shentongUri.replace(/:([^@]+)@/, ":***@")}\n`);

      // 更新当前进程的环境变量
      databaseUrl = shentongUri;
    } catch (error) {
      console.warn("[数据库配置] 无法自动更新 .env.local:", error);
    }
  }

  // 使用 SHENTONG_MIDDLEWARE_MONGO_URI
  process.env.DATABASE_URL = shentongUri;
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
