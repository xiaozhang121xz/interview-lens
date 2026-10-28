/**
 * 数据库状态检测 API
 * GET /api/system/db-status
 *
 * 用于检测当前项目连接的数据库环境状态
 * 仅返回健康状态，不暴露数据库地址、库名或环境变量来源。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

/**
 * GET /api/system/db-status
 * 获取数据库连接状态
 *
 * @returns {Object} 数据库状态信息
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // 执行简单查询测试连接（MongoDB 使用 $runCommandRaw）
    await Promise.race([
      prisma.$runCommandRaw({ ping: 1 }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('DATABASE_HEALTH_CHECK_TIMEOUT')),
          HEALTH_CHECK_TIMEOUT_MS
        )
      ),
    ]);

    const response = {
      success: true,
      data: {
        status: 'connected' as const,
        database: {
          type: 'MongoDB',
          host: 'hidden',
          port: 'hidden',
          database: 'hidden',
          connectionString: 'hidden',
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'unknown',
          hasConnectionUri: Boolean(
            process.env.SHENTONG_MIDDLEWARE_MONGO_URI || process.env.DATABASE_URL
          ),
        },
        latency: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: {
          status: 'error' as const,
          database: {
            type: 'MongoDB',
            host: 'hidden',
            port: 'hidden',
            database: 'hidden',
            connectionString: 'hidden',
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'unknown',
            hasConnectionUri: Boolean(
              process.env.SHENTONG_MIDDLEWARE_MONGO_URI || process.env.DATABASE_URL
            ),
          },
          error: '数据库连接不可用',
          latency: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}
