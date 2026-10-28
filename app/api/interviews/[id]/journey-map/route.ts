/**
 * 获取访谈项目用户旅程图 API
 *
 * @module app/api/interviews/[id]/journey-map/route
 * @description 获取指定访谈项目的用户旅程图
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

// ============================================
// 类型定义
// ============================================

interface JourneyMapData {
  id: string;
  title: string;
  stages: Array<{
    name: string;
    description: string;
  }>;
  actions?: Array<{
    stage: string;
    action: string;
    detail?: string;
  }>;
  emotions?: Array<{
    stage: string;
    emotion: 'happy' | 'neutral' | 'sad' | 'frustrated' | 'excited';
    intensity: 1 | 2 | 3 | 4 | 5;
    reason?: string;
  }>;
  painPoints?: Array<{
    stage: string;
    painPoint: string;
    severity: 'low' | 'medium' | 'high';
    frequency: 'rare' | 'occasional' | 'frequent';
  }>;
  opportunities?: Array<{
    stage: string;
    opportunity: string;
    potential: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }>;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
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
 * 从请求头获取用户ID
 */
async function extractUserId(request: NextRequest): Promise<string> {
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  throw new Error('UNAUTHORIZED');
}

// ============================================
// GET - 获取用户旅程图
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/journey-map:
 *   get:
 *     summary: 获取用户旅程图
 *     description: 获取指定访谈项目的用户旅程图，如果不存在则返回 null
 *     tags: [JourneyMap]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 访谈项目不存在或无权访问
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params;

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

    // 检查访谈项目是否存在且属于当前用户
    const interview = await prisma.interviewProject.findFirst({
      where: {
        id: interviewId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在或无权访问',
        },
        { status: 404 }
      );
    }

    // 获取用户旅程图（获取最新的一个）
    const journeyMap = await prisma.userJourneyMap.findFirst({
      where: {
        projectId: interviewId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 如果没有旅程图，返回 null
    if (!journeyMap) {
      return NextResponse.json<ApiResponse<JourneyMapData | null>>(
        {
          success: true,
          data: null,
        },
        { status: 200 }
      );
    }

    // 解析 JSON 字段并返回
    const journeyMapData: JourneyMapData = {
      id: journeyMap.id,
      title: journeyMap.title,
      stages: JSON.parse(journeyMap.stages),
      actions: journeyMap.actions ? JSON.parse(journeyMap.actions) : undefined,
      emotions: journeyMap.emotions ? JSON.parse(journeyMap.emotions) : undefined,
      painPoints: journeyMap.painPoints ? JSON.parse(journeyMap.painPoints) : undefined,
      opportunities: journeyMap.opportunities
        ? JSON.parse(journeyMap.opportunities)
        : undefined,
      projectId: journeyMap.projectId,
      createdAt: journeyMap.createdAt.toISOString(),
      updatedAt: journeyMap.updatedAt.toISOString(),
    };

    return NextResponse.json<ApiResponse<JourneyMapData>>(
      {
        success: true,
        data: journeyMapData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Journey Map Get API] 服务器错误:', error);

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
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}