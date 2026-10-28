/**
 * 会话管理 API - 开始/结束会话、获取当前会话信息
 *
 * @module app/api/interviews/[id]/session/route
 * @description 访谈会话管理，支持多轮访谈的会话隔离
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import { interviewIdSchema } from '@/lib/validations/interview';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

// 会话结束请求验证
const sessionEndSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  userId: z.string().optional(),
});

// sessionId 生成规则：{interviewId}_{timestamp}_{randomSuffix}
function generateSessionId(interviewId: string): string {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${interviewId}_${timestamp}_${suffix}`;
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
 * 从请求头或请求体获取用户ID
 */
async function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
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

  // 从请求体获取
  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  throw new Error('UNAUTHORIZED');
}

/**
 * 验证访谈项目所有权
 */
async function validateInterviewOwnership(
  interviewId: string,
  userId: string
): Promise<boolean> {
  const interview = await prisma.interviewProject.findUnique({
    where: { id: interviewId },
    select: { userId: true },
  });

  if (!interview) {
    throw new Error('NOT_FOUND');
  }

  if (interview.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  return true;
}

// ============================================
// GET - 获取当前活跃会话信息
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/session/current:
 *   get:
 *     summary: 获取当前活跃会话信息
 *     description: 获取指定访谈项目的当前活跃会话详细信息，包括转写数和记录数统计。
 *     tags: [Session]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 成功获取会话信息
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
 *                     sessionId:
 *                       type: string
 *                       nullable: true
 *                       description: 当前会话ID
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 会话开始时间
 *                     transcriptCount:
 *                       type: integer
 *                       description: 当前会话的转写数量
 *                     recordCount:
 *                       type: integer
 *                       description: 当前会话的记录数量
 *       400:
 *         description: 无效的访谈ID格式
 *       403:
 *         description: 无权访问此访谈项目
 *       404:
 *         description: 访谈项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证ID格式
    const idValidation = interviewIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的访谈ID格式',
          errors: idValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 获取用户ID（可选，用于权限检查）
    const userId = await getCurrentUserId(request);

    // 获取访谈项目
    const interview = await prisma.interviewProject.findUnique({
      where: { id },
      select: { userId: true, currentSessionId: true, sessionStartTime: true },
    });

    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在',
        },
        { status: 404 }
      );
    }

    // 权限检查
    if (userId && interview.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此访谈项目',
        },
        { status: 403 }
      );
    }

    // 如果没有活跃会话
    if (!interview.currentSessionId) {
      return NextResponse.json<
        ApiResponse<{
          sessionId: null;
          startTime: null;
          transcriptCount: 0;
          recordCount: 0;
        }>
      >(
        {
          success: true,
          data: {
            sessionId: null,
            startTime: null,
            transcriptCount: 0,
            recordCount: 0,
          },
        },
        { status: 200 }
      );
    }

    // 并行获取转写数和记录数
    const [transcriptCount, recordCount] = await Promise.all([
      prisma.realtimeTranscript.count({
        where: { projectId: id, sessionId: interview.currentSessionId },
      }),
      prisma.interviewRecord.count({
        where: { projectId: id, sessionId: interview.currentSessionId },
      }),
    ]);

    return NextResponse.json<
      ApiResponse<{
        sessionId: string;
        startTime: Date | null;
        transcriptCount: number;
        recordCount: number;
      }>
    >(
      {
        success: true,
        data: {
          sessionId: interview.currentSessionId,
          startTime: interview.sessionStartTime,
          transcriptCount,
          recordCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取当前会话信息API错误:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST - 会话操作（开始/结束）
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/session:
 *   post:
 *     summary: 会话操作
 *     description: 开始新会话或结束当前会话
 *     tags: [Session]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [start, end]
 *                 description: 操作类型
 *               sessionId:
 *                 type: string
 *                 description: 结束会话时需要提供的会话ID
 *     responses:
 *       200:
 *         description: 操作成功
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权操作此访谈项目
 *       404:
 *         description: 访谈项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证ID格式
    const idValidation = interviewIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的访谈ID格式',
          errors: idValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 解析请求体
    const body: { action?: string; sessionId?: string; userId?: string } =
      await request.json();

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

    // 验证资源所有权
    try {
      await validateInterviewOwnership(id, userId);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'NOT_FOUND') {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              message: '访谈项目不存在',
            },
            { status: 404 }
          );
        }
        if (err.message === 'FORBIDDEN') {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              message: '无权操作此访谈项目',
            },
            { status: 403 }
          );
        }
      }
      throw err;
    }

    const action = body.action;

    // 处理开始会话
    if (action === 'start') {
      const sessionId = generateSessionId(id);
      const startTime = new Date();

      // 更新访谈项目的当前会话
      await prisma.interviewProject.update({
        where: { id },
        data: {
          currentSessionId: sessionId,
          sessionStartTime: startTime,
          status: 'in_progress', // 自动更新状态为进行中
        },
      });

      return NextResponse.json<
        ApiResponse<{ sessionId: string; startTime: Date }>
      >(
        {
          success: true,
          data: { sessionId, startTime },
          message: '会话已开始',
        },
        { status: 200 }
      );
    }

    // 处理结束会话
    if (action === 'end') {
      // 验证请求参数
      const validationResult = sessionEndSchema.safeParse(body);
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

      const { sessionId } = validationResult.data;

      // 验证会话ID是否匹配当前活跃会话
      const interview = await prisma.interviewProject.findUnique({
        where: { id },
        select: { currentSessionId: true },
      });

      if (!interview || interview.currentSessionId !== sessionId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: '会话ID不匹配或会话已结束',
          },
          { status: 400 }
        );
      }

      // 清除当前会话信息
      await prisma.interviewProject.update({
        where: { id },
        data: {
          currentSessionId: null,
          sessionStartTime: null,
        },
      });

      return NextResponse.json<ApiResponse<never>>(
        {
          success: true,
          message: '会话已结束',
        },
        { status: 200 }
      );
    }

    // 未知操作
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '无效的操作类型，支持: start, end',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('会话操作API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权操作此访谈项目',
        },
        { status: 403 }
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