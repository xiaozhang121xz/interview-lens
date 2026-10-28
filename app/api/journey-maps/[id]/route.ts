/**
 * 用户旅程图更新 API
 *
 * @module app/api/journey-maps/[id]/route
 * @description 更新用户旅程图内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
}

interface JourneyMapResponse {
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

// ============================================
// 验证 Schema
// ============================================

const journeyStageSchema = z.object({
  name: z.string().min(1, '阶段名称不能为空'),
  description: z.string(),
});

const journeyActionSchema = z.object({
  stage: z.string(),
  action: z.string(),
  detail: z.string().optional(),
});

const journeyEmotionSchema = z.object({
  stage: z.string(),
  emotion: z.enum(['happy', 'neutral', 'sad', 'frustrated', 'excited']),
  intensity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  reason: z.string().optional(),
});

const journeyPainPointSchema = z.object({
  stage: z.string(),
  painPoint: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  frequency: z.enum(['rare', 'occasional', 'frequent']),
});

const journeyOpportunitySchema = z.object({
  stage: z.string(),
  opportunity: z.string(),
  potential: z.enum(['low', 'medium', 'high']),
  effort: z.enum(['low', 'medium', 'high']),
});

const updateJourneyMapSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  stages: z.array(journeyStageSchema).optional(),
  actions: z.array(journeyActionSchema).optional(),
  emotions: z.array(journeyEmotionSchema).optional(),
  painPoints: z.array(journeyPainPointSchema).optional(),
  opportunities: z.array(journeyOpportunitySchema).optional(),
});

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
 * 从请求头或请求体获取用户ID
 */
async function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  throw new Error('UNAUTHORIZED');
}

// ============================================
// PUT - 更新用户旅程图
// ============================================

/**
 * @swagger
 * /api/journey-maps/{id}:
 *   put:
 *     summary: 更新用户旅程图
 *     description: 更新指定ID的用户旅程图内容，支持更新标题、阶段、行为、情绪、痛点和机会点
 *     tags: [JourneyMap]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 旅程图ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *               emotions:
 *                 type: array
 *                 items:
 *                   type: object
 *               painPoints:
 *                 type: array
 *                 items:
 *                   type: object
 *               opportunities:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 旅程图不存在或无权访问
 *       500:
 *         description: 服务器内部错误
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyMapId } = await params;

    // 解析请求体
    const body = await request.json();

    // 获取用户ID
    let userId: string;
    try {
      userId = await extractUserId(request, body);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 验证请求体
    const validationResult = updateJourneyMapSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '请求参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // 检查旅程图是否存在且属于当前用户
    const existingJourneyMap = await prisma.userJourneyMap.findFirst({
      where: {
        id: journeyMapId,
      },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingJourneyMap) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '旅程图不存在',
        },
        { status: 404 }
      );
    }

    if (existingJourneyMap.project.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此旅程图',
        },
        { status: 404 }
      );
    }

    // 构建更新数据
    const dataToUpdate: Record<string, unknown> = {};
    if (updateData.title) dataToUpdate.title = updateData.title;
    if (updateData.stages) dataToUpdate.stages = JSON.stringify(updateData.stages);
    if (updateData.actions !== undefined) {
      dataToUpdate.actions = updateData.actions ? JSON.stringify(updateData.actions) : null;
    }
    if (updateData.emotions !== undefined) {
      dataToUpdate.emotions = updateData.emotions ? JSON.stringify(updateData.emotions) : null;
    }
    if (updateData.painPoints !== undefined) {
      dataToUpdate.painPoints = updateData.painPoints ? JSON.stringify(updateData.painPoints) : null;
    }
    if (updateData.opportunities !== undefined) {
      dataToUpdate.opportunities = updateData.opportunities ? JSON.stringify(updateData.opportunities) : null;
    }

    // 更新数据库
    const updatedJourneyMap = await prisma.userJourneyMap.update({
      where: {
        id: journeyMapId,
      },
      data: dataToUpdate,
    });

    // 返回更新后的数据
    return NextResponse.json<ApiResponse<JourneyMapResponse>>(
      {
        success: true,
        data: {
          id: updatedJourneyMap.id,
          title: updatedJourneyMap.title,
          stages: JSON.parse(updatedJourneyMap.stages),
          actions: updatedJourneyMap.actions ? JSON.parse(updatedJourneyMap.actions) : undefined,
          emotions: updatedJourneyMap.emotions ? JSON.parse(updatedJourneyMap.emotions) : undefined,
          painPoints: updatedJourneyMap.painPoints ? JSON.parse(updatedJourneyMap.painPoints) : undefined,
          opportunities: updatedJourneyMap.opportunities ? JSON.parse(updatedJourneyMap.opportunities) : undefined,
          projectId: updatedJourneyMap.projectId,
          createdAt: updatedJourneyMap.createdAt.toISOString(),
          updatedAt: updatedJourneyMap.updatedAt.toISOString(),
        },
        message: '更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Journey Map Update API] 服务器错误:', error);

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

// ============================================
// DELETE - 删除用户旅程图
// ============================================

/**
 * @swagger
 * /api/journey-maps/{id}:
 *   delete:
 *     summary: 删除用户旅程图
 *     description: 删除指定ID的用户旅程图
 *     tags: [JourneyMap]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 旅程图ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 旅程图不存在或无权访问
 *       500:
 *         description: 服务器内部错误
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyMapId } = await params;

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

    // 检查旅程图是否存在且属于当前用户
    const existingJourneyMap = await prisma.userJourneyMap.findFirst({
      where: {
        id: journeyMapId,
      },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingJourneyMap) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '旅程图不存在',
        },
        { status: 404 }
      );
    }

    if (existingJourneyMap.project.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此旅程图',
        },
        { status: 404 }
      );
    }

    // 删除旅程图
    await prisma.userJourneyMap.delete({
      where: {
        id: journeyMapId,
      },
    });

    return NextResponse.json<ApiResponse<never>>(
      {
        success: true,
        message: '删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Journey Map Delete API] 服务器错误:', error);

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