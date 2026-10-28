/**
 * 访谈提纲 API - 列表与创建 (T014)
 *
 * @module app/api/interviews/[id]/outlines/route
 * @description 访谈提纲列表查询和创建API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  outlineCreateSchema,
  type OutlineCreateInput,
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
// GET - 获取访谈提纲列表 (T014)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/outlines:
 *   get:
 *     summary: 获取访谈提纲列表
 *     description: 获取指定访谈项目的所有提纲问题，按order升序排列。
 *     tags: [Outlines]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 成功获取提纲列表
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
 *                         description: 提纲ID
 *                       question:
 *                         type: string
 *                         description: 问题内容
 *                       priority:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                         description: 优先级（1-5，5最高）
 *                       order:
 *                         type: integer
 *                         description: 排序顺序
 *                       status:
 *                         type: string
 *                         enum: [pending, asked, skipped]
 *                         description: 问题状态
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                         description: 备注信息
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
      select: { userId: true },
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

    // 获取提纲列表（按order排序，然后按priority排序）
    const outlines = await prisma.interviewOutline.findMany({
      where: { projectId: id },
      orderBy: [{ order: 'asc' }, { priority: 'desc' }],
    });

    return NextResponse.json<ApiResponse<InterviewOutline[]>>(
      {
        success: true,
        data: outlines,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取访谈提纲列表API错误:', error);

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此资源',
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
// POST - 添加提纲问题 (T014)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/outlines:
 *   post:
 *     summary: 添加提纲问题
 *     description: 为访谈项目添加一个新的提纲问题。如果未指定order，将自动添加到末尾。
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
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 maxLength: 500
 *                 description: 问题内容
 *                 example: "请介绍一下您当前的业务流程是怎样的？"
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *                 description: 优先级（1-5，5最高）
 *               order:
 *                 type: integer
 *                 default: 0
 *                 description: 排序顺序（0表示自动添加到末尾）
 *               notes:
 *                 type: string
 *                 maxLength: 200
 *                 description: 备注信息
 *     responses:
 *       201:
 *         description: 提纲问题添加成功
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
 *                       description: 新创建的提纲ID
 *                     question:
 *                       type: string
 *                       description: 问题内容
 *                     priority:
 *                       type: integer
 *                       description: 优先级
 *                     order:
 *                       type: integer
 *                       description: 排序顺序
 *                     status:
 *                       type: string
 *                       enum: [pending]
 *                       description: 初始状态为pending
 *                 message:
 *                   type: string
 *                   example: "提纲问题添加成功"
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
    const body: OutlineCreateInput & { userId?: string } = await request.json();

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
    const validationResult = outlineCreateSchema.safeParse(body);
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

    // 如果没有指定order，自动获取最大order+1
    let order = validatedData.order;
    if (order === 0) {
      const maxOrder = await prisma.interviewOutline.aggregate({
        where: { projectId: id },
        _max: { order: true },
      });
      order = (maxOrder._max.order || 0) + 1;
    }

    // 创建提纲问题
    const outline = await prisma.interviewOutline.create({
      data: {
        question: validatedData.question,
        priority: validatedData.priority || 3,
        order,
        status: 'pending',
        notes: validatedData.notes || null,
        projectId: id,
        // 新增字段 - 提纲生成优化
        isCore: validatedData.isCore ?? true,
        reasoning: validatedData.reasoning || null,
        source: validatedData.source || 'manual',
        relatedInsight: validatedData.relatedInsight || null,
        // 新增字段 - 结构化引用
        relatedPainPointIndex: validatedData.relatedPainPointIndex ?? null,
        relatedPriorityAreaIndex: validatedData.relatedPriorityAreaIndex ?? null,
        relatedBusinessScenarioKey: validatedData.relatedBusinessScenarioKey || null,
        insightReferenceType: validatedData.insightReferenceType || null,
      },
    });

    return NextResponse.json<ApiResponse<InterviewOutline>>(
      {
        success: true,
        data: outline,
        message: '提纲问题添加成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('添加提纲问题API错误:', error);

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
// DELETE - 清空访谈提纲
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const deleted = await prisma.interviewOutline.deleteMany({
      where: { projectId: id },
    });

    return NextResponse.json(
      {
        success: true,
        deletedCount: deleted.count,
        message: deleted.count > 0 ? '提纲已清空' : '当前没有可清空的提纲',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('清空访谈提纲API错误:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}
