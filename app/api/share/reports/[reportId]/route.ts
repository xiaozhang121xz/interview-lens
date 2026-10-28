/**
 * 分享报告详情 API
 *
 * @module app/api/share/reports/[reportId]/route
 * @description 获取指定分享报告的完整内容（版本管理功能）
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
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
}

interface ShareReportDetail {
  id: string;
  interviewId: string;
  token: string;
  shareUrl: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  theme: string;
  expiresAt?: string;
  content: unknown; // 解析后的结构化数据
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
 * 从请求头获取用户ID
 */
async function extractUserId(request: NextRequest): Promise<string | null> {
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

  return null;
}

// ============================================
// GET - 获取报告详情
// ============================================

/**
 * @swagger
 * /api/share/reports/{reportId}:
 *   get:
 *     summary: 获取分享报告详情
 *     description: 获取指定分享报告的完整内容，包含客户信息、访谈信息、用户画像、旅程图等。
 *     tags: [ShareReports]
 *     parameters:
 *       - name: reportId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 报告ID
 *     responses:
 *       200:
 *         description: 成功获取报告详情
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
 *                       description: 报告ID
 *                     interviewId:
 *                       type: string
 *                       description: 所属访谈项目ID
 *                     token:
 *                       type: string
 *                       description: 分享链接token
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *                     theme:
 *                       type: string
 *                       description: 主题风格
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 过期时间
 *                     content:
 *                       type: object
 *                       description: 报告完整内容（JSON结构）
 *       400:
 *         description: 无效的报告ID格式
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权访问此报告
 *       404:
 *         description: 报告不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    // 基本ID验证
    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的报告ID格式',
          error: { code: 'INVALID_REPORT_ID', message: '报告ID不能为空' },
        },
        { status: 400 }
      );
    }

    // 获取用户ID
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
          error: { code: 'UNAUTHORIZED', message: '请先登录' },
        },
        { status: 401 }
      );
    }

    // 查询报告
    const report = await prisma.shareReportContent.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        interviewId: true,
        userId: true,
        token: true,
        content: true,
        theme: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 验证报告存在
    if (!report) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '报告不存在',
          error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' },
        },
        { status: 404 }
      );
    }

    // 权限检查：用户只能查看自己创建的报告
    if (report.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此报告',
          error: { code: 'FORBIDDEN', message: '无权访问此报告' },
        },
        { status: 403 }
      );
    }

    // 解析content字段为结构化数据
    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(report.content);
    } catch (parseError) {
      console.error('[Share Report Detail API] JSON解析失败:', parseError);
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '报告数据格式不正确',
          error: {
            code: 'PARSE_ERROR',
            message: '报告数据解析失败',
          },
        },
        { status: 500 }
      );
    }

    // 构建响应
    const reportDetail: ShareReportDetail = {
      id: report.id,
      interviewId: report.interviewId,
      token: report.token,
      shareUrl: `/share/${report.token}/report`,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      theme: report.theme,
      expiresAt: report.expiresAt?.toISOString(),
      content: parsedContent,
    };

    return NextResponse.json<ApiResponse<ShareReportDetail>>(
      {
        success: true,
        data: reportDetail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Share Report Detail API] Error:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - 删除报告
// ============================================

/**
 * @swagger
 * /api/share/reports/{reportId}:
 *   delete:
 *     summary: 删除分享报告
 *     description: 删除指定版本的分享报告。只能删除自己创建的报告。
 *     tags: [ShareReports]
 *     parameters:
 *       - name: reportId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 报告ID
 *     responses:
 *       200:
 *         description: 报告删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 报告已删除
 *       400:
 *         description: 无效的报告ID格式
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权删除此报告
 *       404:
 *         description: 报告不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    // 基本ID验证
    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的报告ID格式',
          error: { code: 'INVALID_REPORT_ID', message: '报告ID不能为空' },
        },
        { status: 400 }
      );
    }

    // 获取用户ID
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
          error: { code: 'UNAUTHORIZED', message: '请先登录' },
        },
        { status: 401 }
      );
    }

    // 查询报告
    const report = await prisma.shareReportContent.findUnique({
      where: { id: reportId },
      select: { id: true, userId: true, token: true },
    });

    // 验证报告存在
    if (!report) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '报告不存在',
          error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' },
        },
        { status: 404 }
      );
    }

    // 权限检查：用户只能删除自己创建的报告
    if (report.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此报告',
          error: { code: 'FORBIDDEN', message: '无权删除此报告' },
        },
        { status: 403 }
      );
    }

    // 内容版本与公开分享记录保持一致，避免删除最后一个版本后残留死链接。
    await prisma.$transaction(async (tx) => {
      await tx.shareReportContent.delete({ where: { id: reportId } });
      const remainingVersions = await tx.shareReportContent.count({
        where: { token: report.token },
      });
      if (remainingVersions === 0) {
        await tx.shareRecord.deleteMany({
          where: { token: report.token, userId },
        });
      }
    });

    return NextResponse.json<ApiResponse<never>>(
      {
        success: true,
        message: '报告已删除',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Share Report Delete API] Error:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}
