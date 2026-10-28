/**
 * PPT大纲API路由
 *
 * GET: 获取PPT大纲内容
 * POST: 生成PPT大纲
 *
 * @module app/api/share/report/[reportId]/ppt-outline/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePPTOutline } from '@/lib/services/ppt-outline-generator';
import { aggregateShareReportData } from '@/lib/services/share-report-aggregator';
import type { GeneratePPTOutlineResponse, PPTOutlineContent, PPTOutlineMode } from '@/lib/types/ppt-outline';
import { extractUserId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

interface ReportContentWithPPTOutline {
  pptOutline?: PPTOutlineContent;
  [key: string]: unknown;
}

/**
 * GET /api/share/report/[reportId]/ppt-outline
 * 获取PPT大纲内容
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const userId = await extractUserId(request);

    // 获取分享报告内容
    const reportContent = await prisma.shareReportContent.findFirst({
      where: { id: reportId, userId },
    });

    if (!reportContent) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    // 从content字段解析PPT大纲
    const content = reportContent.content ? JSON.parse(reportContent.content) as ReportContentWithPPTOutline : null;
    const pptOutline = content?.pptOutline;

    if (!pptOutline) {
      return NextResponse.json({ error: 'PPT大纲尚未生成' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      outline: pptOutline,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    console.error('[PPT Outline API] GET Error:', error);
    return NextResponse.json(
      { error: '获取PPT大纲失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/share/report/[reportId]/ppt-outline
 * 生成PPT大纲
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const userId = await extractUserId(request);
    const body = await request.json().catch(() => ({}));
    const { theme = 'modern', outlineMode = 'classic' } = body as {
      theme?: 'modern' | 'classic' | 'minimal';
      outlineMode?: PPTOutlineMode;
    };

    if (outlineMode !== 'classic' && outlineMode !== 'customer_next_meeting') {
      return NextResponse.json(
        { success: false, error: '无效的大纲模式，可选值：classic, customer_next_meeting' },
        { status: 400 }
      );
    }

    // 获取分享报告内容
    const reportContent = await prisma.shareReportContent.findFirst({
      where: { id: reportId, userId },
    });

    if (!reportContent) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    // 聚合数据
    const aggregatedData = await aggregateShareReportData(reportContent.interviewId);

    // 生成PPT大纲
    const outline = await generatePPTOutline(aggregatedData, outlineMode);

    // 更新报告内容 - 将pptOutline存储在content字段中
    const existingContent = reportContent.content
      ? JSON.parse(reportContent.content) as ReportContentWithPPTOutline
      : {};

    const updatedContent = {
      ...existingContent,
      pptOutline: outline,
    };

    await prisma.shareReportContent.update({
      where: { id: reportContent.id },
      data: {
        content: JSON.stringify(updatedContent),
        updatedAt: new Date(),
      },
    });

    const response: GeneratePPTOutlineResponse = {
      success: true,
      outline,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    console.error('[PPT Outline API] POST Error:', error);
    return NextResponse.json(
      { success: false, error: '生成PPT大纲失败' },
      { status: 500 }
    );
  }
}
