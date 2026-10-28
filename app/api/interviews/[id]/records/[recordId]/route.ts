/**
 * 访谈记录 API - 更新与删除 (T018)
 *
 * @module app/api/interviews/[id]/records/[recordId]/route
 * @description 访谈记录更新和删除API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  recordUpdateSchema,
  recordIdSchema,
  type RecordUpdateInput,
} from '@/lib/validations/record';
import type { InterviewRecord } from '@prisma/client';

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
 * 验证记录所有权（通过访谈项目）
 */
async function validateRecordOwnership(
  interviewId: string,
  recordId: string,
  userId: string
): Promise<InterviewRecord | null> {
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

  // 验证记录存在且属于该访谈项目
  const record = await prisma.interviewRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    return null;
  }

  if (record.projectId !== interviewId) {
    throw new Error('RECORD_MISMATCH');
  }

  return record;
}

// ============================================
// PUT - 更新访谈记录 (T018)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/records/{recordId}:
 *   put:
 *     summary: 更新访谈记录
 *     description: 更新访谈记录的内容、类型、重点标记或关联提纲。只有资源所有者才能更新。
 *     tags: [Records]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *       - name: recordId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 记录ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 description: 记录内容
 *               type:
 *                 type: string
 *                 enum: [answer, note, pain_point, requirement, other]
 *                 description: 记录类型
 *               isHighlight:
 *                 type: boolean
 *                 description: 是否重点记录
 *               outlineId:
 *                 type: string
 *                 nullable: true
 *                 description: 关联的提纲ID（null表示取消关联）
 *     responses:
 *       200:
 *         description: 访谈记录更新成功
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
 *                     content:
 *                       type: string
 *                     type:
 *                       type: string
 *                     isHighlight:
 *                       type: boolean
 *                 message:
 *                   type: string
 *                   example: "访谈记录更新成功"
 *       400:
 *         description: 请求参数验证失败或关联提纲不存在
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权操作此访谈项目
 *       404:
 *         description: 访谈项目或记录不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params;

    // 验证ID格式
    const idValidation = recordIdSchema.safeParse({ id, recordId });
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
    const body: RecordUpdateInput & { userId?: string } = await request.json();

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
    const validationResult = recordUpdateSchema.safeParse(body);
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
    let existingRecord: InterviewRecord | null = null;
    try {
      existingRecord = await validateRecordOwnership(id, recordId, userId);
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
        if (err.message === 'RECORD_MISMATCH') {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              message: '记录不属于此访谈项目',
            },
            { status: 400 }
          );
        }
      }
      throw err;
    }

    if (!existingRecord) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '记录不存在',
        },
        { status: 404 }
      );
    }

    // 如果指定了新的outlineId，验证其存在性
    if (validatedData.outlineId) {
      const outline = await prisma.interviewOutline.findUnique({
        where: { id: validatedData.outlineId },
      });

      if (!outline) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: '关联的提纲问题不存在',
          },
          { status: 400 }
        );
      }
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (validatedData.content !== undefined) updateData.content = validatedData.content;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.isHighlight !== undefined) updateData.isHighlight = validatedData.isHighlight;
    if (validatedData.outlineId !== undefined) {
      updateData.outlineId = validatedData.outlineId || null;
    }

    // 更新记录
    const updatedRecord = await prisma.interviewRecord.update({
      where: { id: recordId },
      data: updateData,
      include: {
        outline: {
          select: {
            id: true,
            question: true,
            order: true,
          },
        },
      },
    });

    return NextResponse.json<ApiResponse<InterviewRecord>>(
      {
        success: true,
        data: updatedRecord,
        message: '访谈记录更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新访谈记录API错误:', error);

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
// DELETE - 删除访谈记录 (T018)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/records/{recordId}:
 *   delete:
 *     summary: 删除访谈记录
 *     description: 删除指定的访谈记录。此操作不可逆。
 *     tags: [Records]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *       - name: recordId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 记录ID
 *     responses:
 *       200:
 *         description: 访谈记录删除成功
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
 *                       example: "访谈记录删除成功"
 *                 message:
 *                   type: string
 *                   example: "访谈记录删除成功"
 *       400:
 *         description: 无效的ID格式或记录不属于此访谈项目
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权删除此记录
 *       404:
 *         description: 访谈项目或记录不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params;

    // 验证ID格式
    const idValidation = recordIdSchema.safeParse({ id, recordId });
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
    let existingRecord: InterviewRecord | null = null;
    try {
      existingRecord = await validateRecordOwnership(id, recordId, userId);
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
              message: '无权删除此记录',
            },
            { status: 403 }
          );
        }
        if (err.message === 'RECORD_MISMATCH') {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              message: '记录不属于此访谈项目',
            },
            { status: 400 }
          );
        }
      }
      throw err;
    }

    if (!existingRecord) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '记录不存在',
        },
        { status: 404 }
      );
    }

    // 删除记录
    await prisma.interviewRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json<ApiResponse<{ message: string }>>(
      {
        success: true,
        data: { message: '访谈记录删除成功' },
        message: '访谈记录删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除访谈记录API错误:', error);

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此记录',
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