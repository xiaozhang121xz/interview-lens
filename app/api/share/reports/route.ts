/**
 * 分享报告历史列表 API
 *
 * @module app/api/share/reports/route
 * @description 获取指定访谈项目的所有分享报告历史列表（版本管理功能）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { extractUserId } from '@/lib/auth';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  total?: number;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
}

interface ShareReportListItem {
  id: string;
  token: string;
  shareUrl: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  summary?: string; // 报告摘要
  theme: string; // 主题风格
  expiresAt?: string; // 过期时间
  versionNumber: number; // 版本号（倒序）
}

// ============================================
// 查询参数验证
// ============================================

const querySchema = z.object({
  interviewId: z.string().min(1, '访谈项目ID不能为空'),
});

// ============================================
// 辅助函数
// ============================================

/**
 * 从报告内容中提取摘要
 */
function extractSummaryFromContent(content: string): string | undefined {
  try {
    const parsed = JSON.parse(content);
    // 提取 generated.summary 或 interview.title 作为摘要
    if (parsed?.generated?.summary) {
      const summary = parsed.generated.summary;
      return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
    }
    if (parsed?.interview?.title) {
      return parsed.interview.title;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ============================================
// GET - 获取分享报告历史列表
// ============================================

/**
 * @swagger
 * /api/share/reports:
 *   get:
 *     summary: 获取分享报告历史列表
 *     description: 获取指定访谈项目的所有分享报告历史列表，按创建时间降序排序，支持版本号计算。
 *     tags: [ShareReports]
 *     parameters:
 *       - name: interviewId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 成功获取报告列表
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
 *                         description: 报告ID
 *                       token:
 *                         type: string
 *                         description: 分享链接token
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 更新时间
 *                       summary:
 *                         type: string
 *                         nullable: true
 *                         description: 报告摘要
 *                       theme:
 *                         type: string
 *                         description: 主题风格
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: 过期时间
 *                       versionNumber:
 *                         type: integer
 *                         description: 版本号（倒序，最新为1）
 *                 total:
 *                   type: integer
 *                   description: 报告总数
 *       400:
 *         description: 无效的访谈ID格式
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权访问此访谈项目
 *       404:
 *         description: 访谈项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    // 验证查询参数
    const validationResult = querySchema.safeParse({ interviewId });
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的访谈ID格式',
          error: { code: 'INVALID_ID', message: validationResult.error.issues[0].message },
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validatedInterviewId = validationResult.data.interviewId;

    // 获取用户ID（使用统一认证函数）
    let userId: string;
    try {
      userId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
          error: { code: 'UNAUTHORIZED', message: '请先登录' },
        },
        { status: 401 }
      );
    }

    // 验证访谈项目存在及所有权
    const interview = await prisma.interviewProject.findUnique({
      where: { id: validatedInterviewId },
      select: { userId: true },
    });

    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在',
          error: { code: 'NOT_FOUND', message: '访谈项目不存在' },
        },
        { status: 404 }
      );
    }

    // 权限检查：用户只能查看自己的访谈报告
    if (interview.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此访谈项目的报告',
          error: { code: 'FORBIDDEN', message: '无权访问此访谈项目' },
        },
        { status: 403 }
      );
    }

    // 查询所有分享报告（按createdAt降序）
    const reports = await prisma.shareReportContent.findMany({
      where: { interviewId: validatedInterviewId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        content: true,
        summary: true,
        theme: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 构建响应列表（带版本号）
    const reportList: ShareReportListItem[] = reports.map((report, index) => ({
      id: report.id,
      token: report.token,
      shareUrl: `/share/${report.token}/report`,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      summary: report.summary || extractSummaryFromContent(report.content),
      theme: report.theme,
      expiresAt: report.expiresAt?.toISOString(),
      versionNumber: index + 1, // 倒序版本号，最新为1
    }));

    return NextResponse.json<ApiResponse<ShareReportListItem[]>>(
      {
        success: true,
        data: reportList,
        total: reports.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Share Reports List API] Error:', error);

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
