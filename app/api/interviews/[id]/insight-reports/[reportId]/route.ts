/**
 * 访谈分析报告详情 API
 *
 * @module app/api/interviews/[id]/insight-reports/[reportId]/route
 * @description 获取指定报告的完整内容（版本管理功能）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import type { InsightReportResponse, InsightReportV2Response } from '@/lib/validations/ai';
import { parseStoredInsightReport } from '@/lib/utils/insight-report';

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

interface ReportDetail {
  id: string;
  projectId: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  reportType: 'v1' | 'v2';
  content: InsightReportResponse | InsightReportV2Response; // 解析后的结构化数据
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
 * /api/interviews/{id}/insight-reports/{reportId}:
 *   get:
 *     summary: 获取访谈分析报告详情
 *     description: 获取指定报告的完整内容，包含业务场景分析、痛点假设和访谈策略。
 *     tags: [InsightReports]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
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
 *                     projectId:
 *                       type: string
 *                       description: 所属访谈项目ID
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *                     content:
 *                       type: object
 *                       properties:
 *                         businessScenario:
 *                           type: object
 *                           properties:
 *                             summary:
 *                               type: string
 *                             keyCharacteristics:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             potentialChallenges:
 *                               type: array
 *                               items:
 *                                 type: string
 *                         painPointHypotheses:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               hypothesis:
 *                                 type: string
 *                               reasoning:
 *                                 type: string
 *                               confidence:
 *                                 type: string
 *                                 enum: [high, medium, low]
 *                               relatedArea:
 *                                 type: string
 *                         interviewStrategy:
 *                           type: object
 *                           properties:
 *                             approach:
 *                               type: string
 *                             priorityAreas:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             timeAllocation:
 *                               type: string
 *                             riskAlerts:
 *                               type: array
 *                               items:
 *                                 type: string
 *       400:
 *         description: 无效的ID格式
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
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id, reportId } = await params;

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

    // 获取用户ID（可选验证）
    const userId = await extractUserId(request);

    // 并行查询：验证访谈所有权 + 查询报告
    const [interview, report] = await Promise.all([
      prisma.interviewProject.findUnique({
        where: { id },
        select: { userId: true },
      }),
      prisma.interviewInsightReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          projectId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // 验证访谈项目存在
    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在',
          error: { code: 'INTERVIEW_NOT_FOUND', message: '访谈项目不存在' },
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

    // 验证报告属于该访谈项目
    if (report.projectId !== id) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '报告不属于此访谈项目',
          error: { code: 'REPORT_MISMATCH', message: '报告不属于此访谈项目' },
        },
        { status: 400 }
      );
    }

    // 解析content字段为结构化数据
    let parsedContent: InsightReportResponse | InsightReportV2Response;
    let reportType: 'v1' | 'v2';
    try {
      const parsedReport = parseStoredInsightReport(report.content);
      parsedContent = parsedReport.data;
      reportType = parsedReport.version;
    } catch (parseError) {
      console.error('[Report Detail API] JSON解析失败:', parseError);
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '报告数据格式不正确',
          error: {
            code: 'PARSE_ERROR',
            message: '报告数据解析失败，请重新生成报告',
          },
        },
        { status: 500 }
      );
    }

    // 构建响应
    const reportDetail: ReportDetail = {
      id: report.id,
      projectId: report.projectId,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      reportType,
      content: parsedContent,
    };

    return NextResponse.json<ApiResponse<ReportDetail>>(
      {
        success: true,
        data: reportDetail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Report Detail API] Error:', error);

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
 * /api/interviews/{id}/insight-reports/{reportId}:
 *   delete:
 *     summary: 删除访谈分析报告
 *     description: 删除指定版本的报告。只能删除自己的报告，且不能删除最后一份报告。
 *     tags: [InsightReports]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 访谈项目ID
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
 *         description: 不能删除最后一份报告
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
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id, reportId } = await params;

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

    // 并行查询：验证访谈所有权 + 查询报告 + 统计报告数量
    const [interview, report, reportCount] = await Promise.all([
      prisma.interviewProject.findUnique({
        where: { id },
        select: { userId: true },
      }),
      prisma.interviewInsightReport.findUnique({
        where: { id: reportId },
        select: { id: true, projectId: true },
      }),
      prisma.interviewInsightReport.count({
        where: { projectId: id },
      }),
    ]);

    // 验证访谈项目存在
    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在',
          error: { code: 'INTERVIEW_NOT_FOUND', message: '访谈项目不存在' },
        },
        { status: 404 }
      );
    }

    // 权限检查：用户只能删除自己的访谈报告
    if (interview.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此报告',
          error: { code: 'FORBIDDEN', message: '无权删除此报告' },
        },
        { status: 403 }
      );
    }

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

    // 验证报告属于该访谈项目
    if (report.projectId !== id) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '报告不属于此访谈项目',
          error: { code: 'REPORT_MISMATCH', message: '报告不属于此访谈项目' },
        },
        { status: 400 }
      );
    }

    // 检查是否是最后一份报告
    if (reportCount <= 1) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '不能删除最后一份报告',
          error: { code: 'CANNOT_DELETE_LAST', message: '至少需要保留一份报告' },
        },
        { status: 400 }
      );
    }

    // 执行删除
    await prisma.interviewInsightReport.delete({
      where: { id: reportId },
    });

    return NextResponse.json<ApiResponse<never>>(
      {
        success: true,
        message: '报告已删除',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Report Delete API] Error:', error);

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
