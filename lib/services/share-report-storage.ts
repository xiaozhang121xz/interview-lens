/**
 * 分享报告存储服务
 *
 * 负责存储和获取分享报告内容，支持版本管理功能
 *
 * @module lib/services/share-report-storage
 */

import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import type { AggregatedShareReportData } from './share-report-aggregator';
import type { PPTOutlineContent } from '@/lib/types/ppt-outline';
import type { ShareReportSlidesArtifactManifest } from './share-report-artifacts';

// ============================================
// 类型定义
// ============================================

/**
 * 完整的分享报告内容（PPT大纲格式）
 */
export interface ShareReportContent {
  // 元数据
  meta: {
    interviewId: string;
    token: string;
    shareUrl: string;
    generatedAt: string;
    expiresAt?: string;
  };

  // 客户信息
  customer: {
    id: string;
    name: string;
    industry: string | null;
  };

  // 访谈信息
  interview: {
    id: string;
    title: string;
    objective: string | null;
    interviewDate: string | null;
  };

  // 进度
  progress: {
    completionRate: number;
    askedQuestions: number;
    totalQuestions: number;
  };

  // 原始数据（用于展示）
  persona: AggregatedShareReportData['persona'];
  journeyMap: AggregatedShareReportData['journeyMap'];
  insightReport: AggregatedShareReportData['insightReport'];

  // 需求条目
  requirements: AggregatedShareReportData['requirements'];

  // AI洞察
  aiInsights: AggregatedShareReportData['aiInsights'];

  // 访谈原话（用于引用）
  interviewQuotes: string[];

  // PPT大纲内容（14页结构）
  pptOutline: PPTOutlineContent;

  // slides skill 真实产物摘要
  slidesArtifact?: ShareReportSlidesArtifactManifest;
}

/**
 * 创建分享报告的输入
 */
export interface CreateShareReportInput {
  interviewId: string;
  userId: string;
  aggregatedData: AggregatedShareReportData;
  pptOutline: PPTOutlineContent;
  expiresIn?: number; // 小时数
  /**
   * 创建模式：
   * - 'new': 创建新报告（新token）
   * - 'overwrite': 覆盖上次报告（使用旧token，更新内容）
   */
  mode?: 'new' | 'overwrite';
  /**
   * 生成方案：
   * - 'template': 模板+规则方案（快速、稳定）
   * - 'llm': 大模型方案（智能、有洞察力）
   */
  generationType?: 'template' | 'llm';
}

/**
 * 分享报告历史项（用于列表展示）
 */
export interface ShareReportHistoryItem {
  id: string;
  token: string;
  shareUrl: string;
  createdAt: Date;
  updatedAt: Date;
  summary: string | null;
  theme: string;
  expiresAt: Date | null;
}

function buildShareReportPath(token: string): string {
  return `/share/${token}/report`;
}

// ============================================
// 存储服务
// ============================================

/**
 * 获取访谈项目的分享报告历史
 */
export async function getShareReportHistory(
  interviewId: string,
  userId: string
): Promise<ShareReportHistoryItem[]> {
  const reports = await prisma.shareReportContent.findMany({
    where: { interviewId, userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      summary: true,
      theme: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return reports.map((report) => ({
    id: report.id,
    token: report.token,
    shareUrl: buildShareReportPath(report.token),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    summary: report.summary,
    theme: report.theme,
    expiresAt: report.expiresAt,
  }));
}

/**
 * 创建并存储分享报告（支持版本管理）
 */
export async function createShareReport(
  input: CreateShareReportInput
): Promise<{ token: string; shareUrl: string; reportId: string }> {
  const {
    interviewId,
    userId,
    aggregatedData,
    pptOutline,
    expiresIn,
    mode = 'new',
    generationType = 'template',
  } = input;

  let token: string;
  let expiresAt: Date | null = null;

  // 处理过期时间
  if (expiresIn) {
    expiresAt = new Date(Date.now() + expiresIn * 3600000);
  }

  // 根据模式决定token策略
  if (mode === 'overwrite') {
    // 获取最新的报告，复用其token
    const latestReport = await prisma.shareReportContent.findFirst({
      where: { interviewId, userId },
      orderBy: { createdAt: 'desc' },
      select: { token: true, id: true },
    });

    if (latestReport) {
      token = latestReport.token;
    } else {
      // 没有历史报告，创建新token
      token = nanoid(12);
    }
  } else {
    // 新建模式：创建新token
    token = nanoid(12);
  }

  const shareUrl = buildShareReportPath(token);
  console.log(`[ShareReport Storage] Step B: creating report content (token=${token})`);

  // 构建报告内容（PPT大纲格式）
  const reportContent: ShareReportContent = {
    meta: {
      interviewId,
      token,
      shareUrl,
      generatedAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString(),
    },
    customer: {
      id: aggregatedData.customer.id,
      name: aggregatedData.customer.name,
      industry: aggregatedData.customer.industry,
    },
    interview: {
      id: aggregatedData.interview.id,
      title: aggregatedData.interview.title,
      objective: aggregatedData.interview.objective,
      interviewDate: aggregatedData.interview.interviewDate?.toISOString() || null,
    },
    progress: aggregatedData.progress,
    persona: aggregatedData.persona,
    journeyMap: aggregatedData.journeyMap,
    insightReport: aggregatedData.insightReport,
    requirements: aggregatedData.requirements,
    aiInsights: aggregatedData.aiInsights,
    interviewQuotes: aggregatedData.interviewQuotes,
    pptOutline,
  };

  // 提取摘要（用于列表展示）
  const summary = extractSummary(reportContent);

  // 报告内容和可访问分享记录必须同时成功，避免孤儿报告或悬空分享链接
  const savedReport = await prisma.$transaction(async (tx) => {
    const report = await tx.shareReportContent.create({
      data: {
        interviewId,
        userId,
        token,
        content: JSON.stringify(reportContent),
        summary,
        theme: generationType,
        expiresIn,
        expiresAt,
      },
    });

    await tx.shareRecord.upsert({
      where: { token },
      create: {
        token,
        interviewId,
        userId,
        includePRD: true,
        includePersona: true,
        includeJourneyMap: true,
        includeInsights: true,
        includeRecords: false,
        status: 'active',
        expiresAt,
      },
      update: {
        interviewId,
        userId,
        expiresAt,
        status: 'active',
      },
    });

    return report;
  });
  console.log(`[ShareReport Storage] report and share record stored atomically (reportId=${savedReport.id})`);

  return {
    token,
    shareUrl,
    reportId: savedReport.id,
  };
}

/**
 * 提取报告摘要
 */
function extractSummary(content: ShareReportContent): string {
  // 从PPT大纲的元数据提取摘要
  if (content.pptOutline?.metadata?.projectTitle) {
    const title = content.pptOutline.metadata.projectTitle;
    const customer = content.pptOutline.metadata.customerName || '';
    const summary = `${title}${customer ? ` - ${customer}` : ''}`;
    return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
  }
  // 其次使用访谈标题
  if (content.interview?.title) {
    return content.interview.title;
  }
  // 最后使用客户名称
  return content.customer?.name || '分享报告';
}

/**
 * 获取分享报告内容（从数据库读取）
 */
export async function getShareReport(
  token: string
): Promise<ShareReportContent | null> {
  // 1. 验证分享记录
  const shareRecord = await prisma.shareRecord.findUnique({
    where: { token },
  });

  if (!shareRecord) {
    return null;
  }

  // 2. 检查是否过期
  if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
    return null;
  }

  // 3. 检查是否被撤销
  if (shareRecord.status !== 'active') {
    return null;
  }

  // 4. 从数据库获取最新的报告内容
  const reportContent = await prisma.shareReportContent.findFirst({
    where: { token },
    orderBy: { createdAt: 'desc' },
    select: { content: true },
  });

  if (!reportContent) {
    return null;
  }

  // 5. 解析报告内容
  try {
    const parsed = JSON.parse(reportContent.content) as ShareReportContent;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 获取指定ID的报告内容（版本管理）
 */
export async function getShareReportById(
  reportId: string,
  userId: string
): Promise<ShareReportContent | null> {
  const report = await prisma.shareReportContent.findUnique({
    where: { id: reportId },
    select: { content: true, userId: true },
  });

  if (!report || report.userId !== userId) {
    return null;
  }

  try {
    return JSON.parse(report.content) as ShareReportContent;
  } catch {
    return null;
  }
}

export async function updateShareReportSlidesArtifact(
  reportId: string,
  slidesArtifact: ShareReportSlidesArtifactManifest
): Promise<boolean> {
  try {
    const report = await prisma.shareReportContent.findUnique({
      where: { id: reportId },
      select: { content: true },
    });

    if (!report) {
      return false;
    }

    const parsed = JSON.parse(report.content) as ShareReportContent;
    parsed.slidesArtifact = slidesArtifact;

    await prisma.shareReportContent.update({
      where: { id: reportId },
      data: {
        content: JSON.stringify(parsed),
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to update share report slides artifact:', error);
    return false;
  }
}

/**
 * 验证分享token
 */
export async function validateShareToken(
  token: string
): Promise<{ valid: boolean; interviewId?: string; error?: string }> {
  const shareRecord = await prisma.shareRecord.findUnique({
    where: { token },
  });

  if (!shareRecord) {
    return { valid: false, error: '分享链接不存在' };
  }

  if (shareRecord.status !== 'active') {
    return { valid: false, error: '分享链接已被撤销' };
  }

  if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
    return { valid: false, error: '分享链接已过期' };
  }

  return { valid: true, interviewId: shareRecord.interviewId };
}

/**
 * 撤销分享链接
 */
export async function revokeShareReport(token: string): Promise<boolean> {
  try {
    await prisma.shareRecord.update({
      where: { token },
      data: { status: 'revoked' },
    });

    return true;
  } catch (error) {
    console.error('Failed to revoke share report:', error);
    return false;
  }
}

/**
 * 删除分享报告版本
 */
export async function deleteShareReport(
  reportId: string,
  userId: string
): Promise<boolean> {
  try {
    const report = await prisma.shareReportContent.findUnique({
      where: { id: reportId },
      select: { userId: true },
    });

    if (!report || report.userId !== userId) {
      return false;
    }

    await prisma.shareReportContent.delete({
      where: { id: reportId },
    });

    return true;
  } catch (error) {
    console.error('Failed to delete share report:', error);
    return false;
  }
}
