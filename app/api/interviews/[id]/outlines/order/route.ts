/**
 * 访谈提纲 - 批量更新顺序 (T016)
 *
 * @module app/api/interviews/[id]/outlines/order/route
 * @description 批量更新提纲顺序API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  outlineOrderUpdateSchema,
  type OutlineOrderUpdateInput,
} from '@/lib/validations/outline';
import { interviewIdSchema } from '@/lib/validations/interview';
import type { InterviewOutline } from '@prisma/client';

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
// PUT - 批量更新提纲顺序 (T016)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/outlines/order:
 *   put:
 *     summary: 批量更新提纲顺序
 *     description: 批量更新多个提纲问题的排序顺序。使用事务保证原子性，所有更新要么全部成功，要么全部失败。
 *     tags: [Outlines]
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
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - order
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 提纲ID
 *                     order:
 *                       type: integer
 *                       description: 新的排序顺序
 *                 description: 包含id和order的数组
 *                 example:
 *                   - id: "outline-1"
 *                     order: 1
 *                   - id: "outline-2"
 *                     order: 2
 *     responses:
 *       200:
 *         description: 提纲顺序更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       order:
 *                         type: integer
 *                 message:
 *                   type: string
 *                   example: "提纲顺序更新成功"
 *       400:
 *         description: 请求参数验证失败或提纲ID不存在
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
    const body: OutlineOrderUpdateInput & { userId?: string } = await request.json();

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
    const validationResult = outlineOrderUpdateSchema.safeParse(body);
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

    const validatedData = validationResult.data;

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

    // 验证所有提纲ID都属于该访谈项目
    const outlineIds = validatedData.items.map((item) => item.id);
    const existingOutlines = await prisma.interviewOutline.findMany({
      where: {
        id: { in: outlineIds },
        projectId: id,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingOutlines.map((o) => o.id));
    const invalidIds = outlineIds.filter((oid) => !existingIds.has(oid));

    if (invalidIds.length > 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: `以下提纲ID不存在或不属于此访谈项目: ${invalidIds.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 使用事务批量更新顺序（原子性操作）
    const updatedOutlines = await prisma.$transaction(
      validatedData.items.map((item) =>
        prisma.interviewOutline.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json<ApiResponse<InterviewOutline[]>>(
      {
        success: true,
        data: updatedOutlines,
        message: '提纲顺序更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('批量更新提纲顺序API错误:', error);

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