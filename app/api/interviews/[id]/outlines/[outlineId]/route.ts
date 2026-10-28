/**
 * 访谈提纲 API - 更新与删除 (T015)
 *
 * @module app/api/interviews/[id]/outlines/[outlineId]/route
 * @description 访谈提纲更新和删除API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  outlineUpdateSchema,
  outlineIdSchema,
  type OutlineUpdateInput,
} from '@/lib/validations/outline';
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
 * 验证提纲所有权（通过访谈项目）
 */
async function validateOutlineOwnership(
  interviewId: string,
  outlineId: string,
  userId: string
): Promise<InterviewOutline | null> {
  // 先验证访谈项目所有权
  const interview = await prisma.interviewProject.findUnique({
    where: { id: interviewId },
    select: { userId: true },
  });

  if (!interview) {
    throw new Error('INTERVIEW_NOT_FOUND');
  }

  if (interview.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  // 验证提纲存在且属于该访谈项目
  const outline = await prisma.interviewOutline.findUnique({
    where: { id: outlineId },
  });

  if (!outline) {
    return null;
  }

  if (outline.projectId !== interviewId) {
    throw new Error('OUTLINE_MISMATCH');
  }

  return outline;
}

// ============================================
// PUT - 更新提纲问题 (T015)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/outlines/{outlineId}:
 *   put:
 *     summary: 更新提纲问题
 *     description: 更新提纲问题的内容、优先级、状态或排序。只有资源所有者才能更新。
 *     tags: [Outlines]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *       - name: outlineId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 提纲ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 maxLength: 500
 *                 description: 问题内容
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: 优先级（1-5，5最高）
 *               status:
 *                 type: string
 *                 enum: [pending, asked, skipped]
 *                 description: 问题状态
 *               order:
 *                 type: integer
 *                 description: 排序顺序
 *               notes:
 *                 type: string
 *                 maxLength: 200
 *                 description: 备注信息
 *     responses:
 *       200:
 *         description: 提纲问题更新成功
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
 *                     question:
 *                       type: string
 *                     priority:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     order:
 *                       type: integer
 *                 message:
 *                   type: string
 *                   example: "提纲问题更新成功"
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权操作此访谈项目
 *       404:
 *         description: 访谈项目或提纲不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outlineId: string }> }
) {
  try {
    const { id, outlineId } = await params;

    // 验证ID格式
    const idValidation = outlineIdSchema.safeParse({ id, outlineId });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的ID格式',
          errors: idValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 解析请求体
    const body: OutlineUpdateInput & { userId?: string } = await request.json();

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
    const validationResult = outlineUpdateSchema.safeParse(body);
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
    let existingOutline: InterviewOutline | null = null;
    try {
      existingOutline = await validateOutlineOwnership(id, outlineId, userId);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'INTERVIEW_NOT_FOUND') {
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
        if (err.message === 'OUTLINE_MISMATCH') {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              message: '提纲不属于此访谈项目',
            },
            { status: 400 }
          );
        }
      }
      throw err;
    }

    if (!existingOutline) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '提纲问题不存在',
        },
        { status: 404 }
      );
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (validatedData.question !== undefined) updateData.question = validatedData.question;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.order !== undefined) updateData.order = validatedData.order;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes || null;

    // 更新提纲
    const updatedOutline = await prisma.interviewOutline.update({
      where: { id: outlineId },
      data: updateData,
    });

    return NextResponse.json<ApiResponse<InterviewOutline>>(
      {
        success: true,
        data: updatedOutline,
        message: '提纲问题更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新提纲问题API错误:', error);

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

// ============================================
// DELETE - 删除提纲问题 (T015)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/outlines/{outlineId}:
 *   delete:
 *     summary: 删除提纲问题
 *     description: 删除指定的提纲问题。删除后，关联的访谈记录的outlineId将被设为null。
 *     tags: [Outlines]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *       - name: outlineId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 提纲ID
 *     responses:
 *       200:
 *         description: 提纲问题删除成功
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
 *                     message:
 *                       type: string
 *                       example: "提纲问题删除成功"
 *                 message:
 *                   type: string
 *                   example: "提纲问题删除成功"
 *       400:
 *         description: 无效的ID格式或提纲不属于此访谈项目
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权删除此提纲问题
 *       404:
 *         description: 访谈项目或提纲不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outlineId: string }> }
) {
  try {
    const { id, outlineId } = await params;

    // 验证ID格式
    const idValidation = outlineIdSchema.safeParse({ id, outlineId });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的ID格式',
          errors: idValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 获取用户ID
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 验证资源所有权
    let existingOutline: InterviewOutline | null = null;
    try {
      existingOutline = await validateOutlineOwnership(id, outlineId, userId);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'INTERVIEW_NOT_FOUND') {
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
              message: '无权删除此提纲问题',
            },
            { status: 403 }
          );
        }
        if (err.message === 'OUTLINE_MISMATCH') {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              message: '提纲不属于此访谈项目',
            },
            { status: 400 }
          );
        }
      }
      throw err;
    }

    if (!existingOutline) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '提纲问题不存在',
        },
        { status: 404 }
      );
    }

    // 检查关联的记录数量
    const relatedRecordsCount = await prisma.interviewRecord.count({
      where: { outlineId },
    });

    // 删除提纲（关联记录的outlineId会被设为null）
    await prisma.interviewOutline.delete({
      where: { id: outlineId },
    });

    return NextResponse.json<ApiResponse<{ message: string }>>(
      {
        success: true,
        data: { message: '提纲问题删除成功' },
        message: relatedRecordsCount > 0
          ? `提纲问题删除成功，${relatedRecordsCount}条关联记录的关联已解除`
          : '提纲问题删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除提纲问题API错误:', error);

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此提纲问题',
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