/**
 * 访谈项目状态 API - 更新状态
 *
 * @module app/api/interviews/[id]/status/route
 * @description 访谈项目状态更新API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  interviewIdSchema,
  interviewStatusUpdateSchema,
  STATUS_TRANSITIONS,
  type InterviewStatusType,
} from '@/lib/validations/interview';
import type { InterviewProject } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
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
): Promise<InterviewProject | null> {
  const interview = await prisma.interviewProject.findUnique({
    where: { id: interviewId },
  });

  if (!interview) {
    return null;
  }

  if (interview.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  return interview;
}

/**
 * 验证状态流转是否合法
 */
function isValidStatusTransition(
  currentStatus: string,
  newStatus: InterviewStatusType
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

// ============================================
// PUT - 更新访谈状态 (T012)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/status:
 *   put:
 *     summary: 更新访谈状态
 *     description: 更新访谈项目的状态。支持状态流转验证，确保状态转换符合业务规则。状态流转规则：draft->prepared->in_progress->completed->archived。
 *     tags: [Interviews]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, prepared, in_progress, completed, archived]
 *                 description: 新的访谈状态
 *                 example: "in_progress"
 *     responses:
 *       200:
 *         description: 访谈状态更新成功
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
 *                     id:
 *                       type: string
 *                       description: 访谈ID
 *                     status:
 *                       type: string
 *                       enum: [draft, prepared, in_progress, completed, archived]
 *                       description: 更新后的状态
 *                 message:
 *                   type: string
 *                   example: "访谈状态更新成功"
 *       400:
 *         description: 状态流转不合法或请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权操作此访谈项目
 *       404:
 *         description: 访谈项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function PUT(
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
    const body: z.infer<typeof interviewStatusUpdateSchema> & { userId?: string } =
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

    // 验证请求体
    const validationResult = interviewStatusUpdateSchema.safeParse(body);
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

    const { status: newStatus } = validationResult.data;

    // 验证资源所有权
    const existingInterview = await validateInterviewOwnership(id, userId);
    if (!existingInterview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在',
        },
        { status: 404 }
      );
    }

    // 验证状态流转
    if (!isValidStatusTransition(existingInterview.status, newStatus)) {
      const allowedStatuses = STATUS_TRANSITIONS[existingInterview.status];
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: `状态流转不合法。当前状态: ${existingInterview.status}, 允许流转到: ${allowedStatuses.length > 0 ? allowedStatuses.join(', ') : '无（终态）'}`,
        },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    // 如果状态变为 in_progress 且没有访谈日期，设置为当前时间
    if (newStatus === 'in_progress' && !existingInterview.interviewDate) {
      updateData.interviewDate = new Date();
    }

    // 更新访谈状态
    const updatedInterview = await prisma.interviewProject.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
      },
    });

    return NextResponse.json<ApiResponse<InterviewProject>>(
      {
        success: true,
        data: updatedInterview,
        message: '访谈状态更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新访谈状态API错误:', error);

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