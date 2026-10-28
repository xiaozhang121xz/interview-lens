/**
 * 阶段总结 API - 保存和查询阶段总结
 *
 * @module app/api/interviews/[id]/stage-summary/route
 * @description 访谈阶段总结的 CRUD 操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

// 阶段总结创建请求验证
const stageSummaryCreateSchema = z.object({
  sessionId: z.string().optional(),
  keyFindings: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
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
  // 优先从 Authorization header 获取
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
  if (body?.userId && typeof body.userId === 'string') {
    return body.userId;
  }

  // 默认返回空字符串，后续会验证权限
  return '';
}

/**
 * 验证用户是否有访谈权限
 */
async function validateInterviewAccess(
  interviewId: string,
  userId: string
): Promise<boolean> {
  const interview = await prisma.interviewProject.findFirst({
    where: {
      id: interviewId,
      userId: userId,
    },
    select: { id: true },
  });
  return !!interview;
}

// ============================================
// API 处理函数
// ============================================

/**
 * GET - 获取最新的阶段总结
 *
 * @query sessionId - 可选，按会话ID筛选
 * @query limit - 可选，返回数量限制，默认返回最新一条
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params;
    const userId = await extractUserId(request);

    // 验证访谈 ID
    if (!interviewId || interviewId.length !== 24) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: '访谈 ID 格式不正确',
        },
        { status: 400 }
      );
    }

    // 验证权限
    if (userId && !await validateInterviewAccess(interviewId, userId)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: '无权限访问此访谈',
        },
        { status: 403 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 1;

    // 查询阶段总结
    const summaries = await prisma.stageSummary.findMany({
      where: {
        projectId: interviewId,
        ...(sessionId ? { sessionId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // 解析 JSON 字段
    const parsedSummaries = summaries.map((summary) => ({
      ...summary,
      keyFindings: summary.keyFindings ? JSON.parse(summary.keyFindings) : [],
      painPoints: summary.painPoints ? JSON.parse(summary.painPoints) : [],
      requirements: summary.requirements ? JSON.parse(summary.requirements) : [],
      suggestions: summary.suggestions ? JSON.parse(summary.suggestions) : [],
    }));

    return NextResponse.json<ApiResponse<typeof parsedSummaries>>(
      {
        success: true,
        data: parsedSummaries,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[StageSummary API] GET error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: '获取阶段总结失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - 创建阶段总结
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params;
    const userId = await extractUserId(request);

    // 验证访谈 ID
    if (!interviewId || interviewId.length !== 24) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: '访谈 ID 格式不正确',
        },
        { status: 400 }
      );
    }

    // 验证权限
    if (!userId || !await validateInterviewAccess(interviewId, userId)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: '无权限访问此访谈',
        },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const validation = stageSummaryCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: '请求参数验证失败',
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 创建阶段总结
    const summary = await prisma.stageSummary.create({
      data: {
        projectId: interviewId,
        sessionId: data.sessionId,
        keyFindings: data.keyFindings ? JSON.stringify(data.keyFindings) : null,
        painPoints: data.painPoints ? JSON.stringify(data.painPoints) : null,
        requirements: data.requirements ? JSON.stringify(data.requirements) : null,
        suggestions: data.suggestions ? JSON.stringify(data.suggestions) : null,
      },
    });

    // 返回解析后的数据
    const parsedSummary = {
      ...summary,
      keyFindings: summary.keyFindings ? JSON.parse(summary.keyFindings) : [],
      painPoints: summary.painPoints ? JSON.parse(summary.painPoints) : [],
      requirements: summary.requirements ? JSON.parse(summary.requirements) : [],
      suggestions: summary.suggestions ? JSON.parse(summary.suggestions) : [],
    };

    return NextResponse.json<ApiResponse<typeof parsedSummary>>(
      {
        success: true,
        data: parsedSummary,
        message: '阶段总结保存成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[StageSummary API] POST error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: '保存阶段总结失败',
      },
      { status: 500 }
    );
  }
}