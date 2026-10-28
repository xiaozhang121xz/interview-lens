/**
 * 实时转写 API - 列表与创建
 *
 * @module app/api/interviews/[id]/transcripts/route
 * @description 实时转写记录的保存和查询，支持断点续传
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import { interviewIdSchema } from '@/lib/validations/interview';
import type { RealtimeTranscript } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

// 转写创建输入验证
const transcriptCreateSchema = z.object({
  content: z.string().min(1, '转写内容不能为空').max(5000, '转写内容过长'),
  speaker: z.string().max(50).optional(),
  confidence: z.number().min(0).max(1).optional(),
  // 新增：会话ID，用于区分不同访谈进程
  sessionId: z.string().optional(),
  // 新增：关联的提纲问题ID
  outlineId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的提纲ID格式')
    .optional()
    .or(z.literal('')),
  // 新增：是否标记为核心要点
  isKeyPoint: z.boolean().optional().default(false),
});

// 转写查询参数验证
const transcriptQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  // 新增：按会话ID过滤
  sessionId: z.string().optional(),
});

type TranscriptCreateInput = z.infer<typeof transcriptCreateSchema>;
type TranscriptQueryInput = z.infer<typeof transcriptQuerySchema>;

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
// GET - 获取实时转写记录（断点续传）
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/transcripts:
 *   get:
 *     summary: 获取实时转写记录
 *     description: 获取指定访谈项目的实时转写记录列表，用于断点续传。按时间正序返回。
 *     tags: [Transcripts]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: 返回记录数量限制
 *       - name: offset
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: 偏移量，用于分页
 *       - name: sessionId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 会话ID，用于按会话过滤
 *     responses:
 *       200:
 *         description: 成功获取转写记录
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
 *                     transcripts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           speaker:
 *                             type: string
 *                             nullable: true
 *                           confidence:
 *                             type: number
 *                             nullable: true
 *                           sessionId:
 *                             type: string
 *                             nullable: true
 *                           outlineId:
 *                             type: string
 *                             nullable: true
 *                           isKeyPoint:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
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
    const validationResult = transcriptQuerySchema.safeParse(queryObject);
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

    const { limit, offset, sessionId } = validationResult.data;

    // 构建查询条件
    const where: Record<string, unknown> = { projectId: id };

    // 按会话ID过滤
    if (sessionId) {
      where.sessionId = sessionId;
    }

    // 获取转写记录（按时间正序）
    const [transcripts, total] = await Promise.all([
      prisma.realtimeTranscript.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.realtimeTranscript.count({
        where,
      }),
    ]);

    return NextResponse.json<ApiResponse<{
      transcripts: RealtimeTranscript[];
      total: number;
    }>>(
      {
        success: true,
        data: { transcripts, total },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取实时转写记录API错误:', error);

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
// POST - 保存实时转写记录
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/transcripts:
 *   post:
 *     summary: 保存实时转写记录
 *     description: 保存一条实时转写记录到数据库，支持自动保存机制。
 *     tags: [Transcripts]
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
 *                 maxLength: 5000
 *                 description: 转写内容
 *                 example: "客户表示目前的审批流程需要3-5个工作日"
 *               speaker:
 *                 type: string
 *                 maxLength: 50
 *                 description: 说话人标识
 *                 example: "客户"
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: 识别置信度
 *                 example: 0.95
 *               sessionId:
 *                 type: string
 *                 description: 会话ID，用于区分不同访谈进程
 *                 example: "abc123_1703548800000_x7k9m2"
 *               outlineId:
 *                 type: string
 *                 description: 关联的提纲问题ID
 *                 example: "507f1f77bcf86cd799439011"
 *               isKeyPoint:
 *                 type: boolean
 *                 default: false
 *                 description: 是否标记为核心要点
 *     responses:
 *       201:
 *         description: 转写记录保存成功
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
 *                     speaker:
 *                       type: string
 *                       nullable: true
 *                     confidence:
 *                       type: number
 *                       nullable: true
 *                     sessionId:
 *                       type: string
 *                       nullable: true
 *                     outlineId:
 *                       type: string
 *                       nullable: true
 *                     isKeyPoint:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "转写记录保存成功"
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
    const body: TranscriptCreateInput & { userId?: string } = await request.json();

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
    const validationResult = transcriptCreateSchema.safeParse(body);
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

    // 创建转写记录
    const transcript = await prisma.realtimeTranscript.create({
      data: {
        content: validatedData.content,
        speaker: validatedData.speaker || null,
        confidence: validatedData.confidence || null,
        projectId: id,
        sessionId: validatedData.sessionId || null,
        outlineId: validatedData.outlineId || null,
        isKeyPoint: validatedData.isKeyPoint || false,
      },
    });

    return NextResponse.json<ApiResponse<RealtimeTranscript>>(
      {
        success: true,
        data: transcript,
        message: '转写记录保存成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('保存实时转写记录API错误:', error);

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
// DELETE - 清空转写记录
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/transcripts:
 *   delete:
 *     summary: 清空实时转写记录
 *     description: 删除指定访谈项目的所有实时转写记录。
 *     tags: [Transcripts]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 转写记录清空成功
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权操作此访谈项目
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
    let userId: string;
    try {
      const body = await request.json().catch(() => ({}));
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

    // 删除所有转写记录
    await prisma.realtimeTranscript.deleteMany({
      where: { projectId: id },
    });

    return NextResponse.json<ApiResponse<never>>(
      {
        success: true,
        message: '转写记录清空成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('清空实时转写记录API错误:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}