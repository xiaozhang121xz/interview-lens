/**
 * 访谈记录 API - 列表与创建 (T017)
 *
 * @module app/api/interviews/[id]/records/route
 * @description 访谈记录列表查询和创建API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  recordCreateSchema,
  recordQuerySchema,
  type RecordCreateInput,
} from '@/lib/validations/record';
import { interviewIdSchema } from '@/lib/validations/interview';
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
// GET - 获取访谈记录列表 (T017)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/records:
 *   get:
 *     summary: 获取访谈记录列表
 *     description: 获取指定访谈项目的所有记录，支持按类型、是否重点、关联提纲、会话筛选。
 *     tags: [Records]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *       - name: type
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [answer, note, pain_point, requirement, other]
 *         description: 记录类型筛选
 *       - name: isHighlight
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: 是否重点记录筛选
 *       - name: outlineId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 关联提纲ID筛选
 *       - name: sessionId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 会话ID筛选
 *     responses:
 *       200:
 *         description: 成功获取记录列表
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
 *                         description: 记录ID
 *                       content:
 *                         type: string
 *                         description: 记录内容
 *                       type:
 *                         type: string
 *                         enum: [answer, note, pain_point, requirement, other]
 *                         description: 记录类型
 *                       isHighlight:
 *                         type: boolean
 *                         description: 是否重点记录
 *                       sessionId:
 *                         type: string
 *                         nullable: true
 *                         description: 会话ID
 *                       source:
 *                         type: string
 *                         enum: [manual, ai, follow_up]
 *                         description: 记录来源
 *                       outline:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           question:
 *                             type: string
 *                           order:
 *                             type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validationResult = recordQuerySchema.safeParse(queryObject);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '查询参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { type, isHighlight, outlineId, sessionId } = validationResult.data;

    // 构建查询条件
    const where: Record<string, unknown> = { projectId: id };

    if (type) {
      where.type = type;
    }

    if (isHighlight !== undefined) {
      where.isHighlight = isHighlight;
    }

    if (outlineId) {
      where.outlineId = outlineId;
    }

    // 按会话ID过滤
    if (sessionId) {
      where.sessionId = sessionId;
    }

    // 获取记录列表
    const records = await prisma.interviewRecord.findMany({
      where,
      orderBy: { createdAt: 'asc' },
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

    return NextResponse.json<ApiResponse<InterviewRecord[]>>(
      {
        success: true,
        data: records,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取访谈记录列表API错误:', error);

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
// POST - 添加访谈记录 (T017)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/records:
 *   post:
 *     summary: 添加访谈记录
 *     description: 为访谈项目添加一条新的记录。可以关联到指定的提纲问题。
 *     tags: [Records]
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 description: 记录内容
 *                 example: "客户表示目前的审批流程需要3-5个工作日，严重影响了业务效率。"
 *               type:
 *                 type: string
 *                 enum: [answer, note, pain_point, requirement, other]
 *                 default: note
 *                 description: 记录类型
 *               isHighlight:
 *                 type: boolean
 *                 default: false
 *                 description: 是否重点记录
 *               outlineId:
 *                 type: string
 *                 description: 关联的提纲ID
 *               sessionId:
 *                 type: string
 *                 description: 会话ID，用于区分不同访谈进程
 *               source:
 *                 type: string
 *                 enum: [manual, ai, follow_up]
 *                 default: manual
 *                 description: 记录来源
 *     responses:
 *       201:
 *         description: 访谈记录添加成功
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
 *                       description: 新创建的记录ID
 *                     content:
 *                       type: string
 *                     type:
 *                       type: string
 *                     isHighlight:
 *                       type: boolean
 *                     sessionId:
 *                       type: string
 *                       nullable: true
 *                     source:
 *                       type: string
 *                     outline:
 *                       type: object
 *                       nullable: true
 *                 message:
 *                   type: string
 *                   example: "访谈记录添加成功"
 *       400:
 *         description: 请求参数验证失败或关联提纲不存在
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
    const body: RecordCreateInput & { userId?: string } = await request.json();

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
    const validationResult = recordCreateSchema.safeParse(body);
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

    // 如果指定了outlineId，验证其存在性
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

    // 创建访谈记录
    const record = await prisma.interviewRecord.create({
      data: {
        content: validatedData.content,
        type: validatedData.type || 'note',
        isHighlight: validatedData.isHighlight || false,
        outlineId: validatedData.outlineId || null,
        projectId: id,
        sessionId: validatedData.sessionId || null,
        source: validatedData.source || 'manual',
      },
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
        data: record,
        message: '访谈记录添加成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('添加访谈记录API错误:', error);

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