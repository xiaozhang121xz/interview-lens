/**
 * 访谈项目 API - 详情、更新、删除
 *
 * @module app/api/interviews/[id]/route
 * @description 访谈项目详情查询、更新和删除API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  interviewUpdateSchema,
  interviewIdSchema,
  type InterviewUpdateInput,
} from '@/lib/validations/interview';
import type {
  InterviewProject,
  Customer,
  InterviewOutline,
  InterviewRecord,
  AIInsight,
  RequirementItem,
  UserPersona,
  PRDDocument,
  InterviewInsightReport,
} from '@prisma/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

interface InterviewDetail extends InterviewProject {
  customer: Customer | null;
  outlines: InterviewOutline[];
  records: InterviewRecord[];
  insights: AIInsight[];
  requirements: RequirementItem[];
  persona: UserPersona | null;
  prd: PRDDocument | null;
  insightReports: InterviewInsightReport[]; // 访谈分析报告
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

// ============================================
// GET - 获取访谈详情 (T010)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}:
 *   get:
 *     summary: 获取访谈详情
 *     description: 获取访谈项目完整信息，包含客户信息、提纲、记录、AI洞察和需求列表。
 *     tags: [Interviews]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 成功获取访谈详情
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
 *                     title:
 *                       type: string
 *                       description: 访谈标题
 *                     objective:
 *                       type: string
 *                       description: 访谈目标
 *                     status:
 *                       type: string
 *                       enum: [draft, prepared, in_progress, completed, archived]
 *                       description: 访谈状态
 *                     customer:
 *                       type: object
 *                       nullable: true
 *                       description: 关联的客户信息
 *                     outlines:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: 访谈提纲列表
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: 访谈记录列表
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: AI洞察列表
 *                     requirements:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: 需求列表
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

    // 获取用户ID
    const userId = await getCurrentUserId(request);

    // 并行获取访谈详情和关联数据（性能优化）
    const [interview, persona, prd, insightReports] = await Promise.all([
      prisma.interviewProject.findUnique({
        where: { id },
        include: {
          customer: true,
          outlines: {
            orderBy: [{ order: 'asc' }, { priority: 'desc' }],
          },
          records: {
            orderBy: { createdAt: 'asc' },
          },
          insights: {
            orderBy: { createdAt: 'desc' },
          },
          requirements: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.userPersona.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pRDDocument.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
      }),
      // 查询所有分析报告（用于版本管理）
      prisma.interviewInsightReport.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 检查访谈是否存在
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

    // 合并数据
    const interviewDetail: InterviewDetail = {
      ...interview,
      persona,
      prd,
      insightReports,
    } as InterviewDetail;

    return NextResponse.json<ApiResponse<InterviewDetail>>(
      {
        success: true,
        data: interviewDetail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取访谈详情API错误:', error);

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
// PUT - 更新访谈项目 (T011)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}:
 *   put:
 *     summary: 更新访谈项目
 *     description: 更新访谈项目的基本信息。只有资源所有者才能更新。
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
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: 访谈标题
 *                 example: "XX公司数字化转型需求调研"
 *               objective:
 *                 type: string
 *                 maxLength: 500
 *                 description: 访谈目标
 *               background:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 访谈背景
 *               customerId:
 *                 type: string
 *                 description: 客户ID
 *               interviewDate:
 *                 type: string
 *                 format: date-time
 *                 description: 访谈日期
 *     responses:
 *       200:
 *         description: 访谈项目更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InterviewProject'
 *                 message:
 *                   type: string
 *                   example: "访谈项目更新成功"
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
    const body: InterviewUpdateInput & { userId?: string } = await request.json();

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
    const validationResult = interviewUpdateSchema.safeParse(body);
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

    if (validatedData.customerId !== undefined) {
      const customer = await prisma.customer.findUnique({
        where: { id: validatedData.customerId },
        select: { id: true, userId: true },
      });

      if (!customer) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: '客户不存在',
          },
          { status: 404 }
        );
      }

      if (customer.userId !== userId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: '无权关联该客户',
          },
          { status: 403 }
        );
      }
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.objective !== undefined) updateData.objective = validatedData.objective;
    if (validatedData.background !== undefined) updateData.background = validatedData.background || null;
    if (validatedData.customerId !== undefined) updateData.customerId = validatedData.customerId;
    if (validatedData.interviewDate !== undefined) updateData.interviewDate = validatedData.interviewDate || null;

    // 更新访谈项目
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
        message: '访谈项目更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新访谈项目API错误:', error);

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
// DELETE - 删除访谈项目 (T013)
// ============================================

/**
 * @swagger
 * /api/interviews/{id}:
 *   delete:
 *     summary: 删除访谈项目
 *     description: 删除访谈项目及其所有关联数据（提纲、记录、AI洞察、需求等）。此操作不可逆。
 *     tags: [Interviews]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 访谈项目删除成功
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
 *                       example: "访谈项目删除成功"
 *                 message:
 *                   type: string
 *                   example: "访谈项目删除成功"
 *       400:
 *         description: 无效的访谈ID格式
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权删除此访谈项目
 *       404:
 *         description: 访谈项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function DELETE(
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

    // 检查关联数据数量（用于日志记录）
    const [outlineCount, recordCount, insightCount, requirementCount] = await Promise.all([
      prisma.interviewOutline.count({ where: { projectId: id } }),
      prisma.interviewRecord.count({ where: { projectId: id } }),
      prisma.aIInsight.count({ where: { projectId: id } }),
      prisma.requirementItem.count({ where: { projectId: id } }),
    ]);

    console.log(
      `删除访谈项目 ${id} 将同时删除: 提纲 ${outlineCount} 条, 记录 ${recordCount} 条, 洞察 ${insightCount} 条, 需求 ${requirementCount} 条`
    );

    // 删除访谈项目（级联删除关联数据 - Prisma schema 中配置了 onDelete: Cascade）
    await prisma.interviewProject.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<{ message: string }>>(
      {
        success: true,
        data: { message: '访谈项目删除成功' },
        message: '访谈项目删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除访谈项目API错误:', error);

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此访谈项目',
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
