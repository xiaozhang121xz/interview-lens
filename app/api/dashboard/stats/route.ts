/**
 * 首页统计 API
 *
 * @module app/api/dashboard/stats/route
 * @description 首页统计数据API，返回用户相关的统计信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import type { InterviewProject, Customer } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface InterviewStats {
  total: number;
  completed: number;
  inProgress: number;
  draft: number;
}

interface InterviewsByStatus {
  draft: number;
  prepared: number;
  in_progress: number;
  completed: number;
  archived: number;
}

interface DashboardStats {
  customerCount: number;
  interviewStats: InterviewStats;
  recentInterviews: InterviewWithCustomer[];
  interviewsByStatus: InterviewsByStatus;
}

interface InterviewWithCustomer extends InterviewProject {
  customer: Pick<Customer, 'id' | 'name' | 'industry'> | null;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从请求中获取当前用户ID
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    return payload?.id || null;
  } catch {
    return null;
  }
}

/**
 * 从请求头或查询参数获取用户ID
 */
async function extractUserId(request: NextRequest): Promise<string> {
  // 优先从Authorization header获取
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  // 从查询参数获取（兼容模式）
  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get('userId');
  if (queryUserId) {
    return queryUserId;
  }

  throw new Error('UNAUTHORIZED');
}

// ============================================
// GET - 获取首页统计数据 (T024)
// ============================================

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: 获取首页统计数据
 *     description: 获取当前用户的首页统计数据，包括客户数量、访谈统计、最近访谈等。使用Promise.all并行查询优化性能。
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: 成功获取统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerCount:
 *                       type: integer
 *                       description: 客户总数
 *                       example: 10
 *                     interviewStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: 访谈总数
 *                         completed:
 *                           type: integer
 *                           description: 已完成访谈数
 *                         inProgress:
 *                           type: integer
 *                           description: 进行中访谈数
 *                         draft:
 *                           type: integer
 *                           description: 草稿访谈数
 *                     recentInterviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           status:
 *                             type: string
 *                           customer:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               industry:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     interviewsByStatus:
 *                       type: object
 *                       properties:
 *                         draft:
 *                           type: integer
 *                         prepared:
 *                           type: integer
 *                         in_progress:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         archived:
 *                           type: integer
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    let userId: string;
    try {
      userId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 并行执行所有查询（性能优化：消除瀑布流）
    const [
      customerCount,
      totalInterviews,
      completedInterviews,
      inProgressInterviews,
      draftInterviews,
      preparedInterviews,
      archivedInterviews,
      recentInterviews,
    ] = await Promise.all([
      // 客户总数
      prisma.customer.count({
        where: { userId },
      }),
      // 访谈总数
      prisma.interviewProject.count({
        where: { userId },
      }),
      // 已完成访谈数
      prisma.interviewProject.count({
        where: { userId, status: 'completed' },
      }),
      // 进行中访谈数
      prisma.interviewProject.count({
        where: { userId, status: 'in_progress' },
      }),
      // 草稿访谈数
      prisma.interviewProject.count({
        where: { userId, status: 'draft' },
      }),
      // 准备中访谈数
      prisma.interviewProject.count({
        where: { userId, status: 'prepared' },
      }),
      // 已归档访谈数
      prisma.interviewProject.count({
        where: { userId, status: 'archived' },
      }),
      // 最近5个访谈（按创建时间倒序）
      prisma.interviewProject.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              industry: true,
            },
          },
        },
      }),
    ]);

    // 组装响应数据
    const dashboardStats: DashboardStats = {
      customerCount,
      interviewStats: {
        total: totalInterviews,
        completed: completedInterviews,
        inProgress: inProgressInterviews,
        draft: draftInterviews,
      },
      recentInterviews: recentInterviews as InterviewWithCustomer[],
      interviewsByStatus: {
        draft: draftInterviews,
        prepared: preparedInterviews,
        in_progress: inProgressInterviews,
        completed: completedInterviews,
        archived: archivedInterviews,
      },
    };

    return NextResponse.json<ApiResponse<DashboardStats>>(
      {
        success: true,
        data: dashboardStats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取首页统计数据API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}