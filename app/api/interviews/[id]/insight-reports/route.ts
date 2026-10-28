/**
 * 访谈分析报告历史列表 API
 *
 * @module app/api/interviews/[id]/insight-reports/route
 * @description 获取访谈项目的所有分析报告历史列表（版本管理功能）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import { extractInsightReportSummary, parseStoredInsightReport } from '@/lib/utils/insight-report';

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

interface ReportListItem {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  summary?: string; // 报告摘要
  versionNumber: number; // 版本号（倒序）
  reportType?: 'v1' | 'v2';
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
// GET - 获取报告历史列表
// ============================================

/**
 * @swagger
 * /api/interviews/{id}/insight-reports:
 *   get:
 *     summary: 获取访谈分析报告历史列表
 *     description: 获取指定访谈项目的所有分析报告历史列表，按创建时间降序排序，支持版本号计算。
 *     tags: [InsightReports]
 *     parameters:
 *       - name: id
 *         in: path
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
 *                         description: 报告摘要（业务场景概述）
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 基本ID验证
    if (!id || typeof id !== 'string') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的访谈ID格式',
          error: { code: 'INVALID_ID', message: '访谈ID不能为空' },
        },
        { status: 400 }
      );
    }

    // 获取用户ID（可选验证）
    const userId = await extractUserId(request);

    // 验证访谈项目存在及所有权
    const interview = await prisma.interviewProject.findUnique({
      where: { id },
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
    if (userId && interview.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此访谈项目的报告',
          error: { code: 'FORBIDDEN', message: '无权访问此访谈项目' },
        },
        { status: 403 }
      );
    }

    // 查询所有报告（按createdAt降序）
    const reports = await prisma.interviewInsightReport.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 构建响应列表（带版本号）
    const reportList: ReportListItem[] = reports.map((report, index) => {
      let reportType: 'v1' | 'v2' = 'v1';
      try {
        reportType = parseStoredInsightReport(report.content).version;
      } catch {
        reportType = 'v1';
      }

      return {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
        summary: extractInsightReportSummary(report.content),
        versionNumber: index + 1, // 倒序版本号，最新为1
        reportType,
      };
    });

    return NextResponse.json<ApiResponse<ReportListItem[]>>(
      {
        success: true,
        data: reportList,
        total: reports.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Insight Reports List API] Error:', error);

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
