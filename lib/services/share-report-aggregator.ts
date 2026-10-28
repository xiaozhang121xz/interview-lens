/**
 * 分享报告数据聚合服务
 *
 * 负责从多个数据源聚合数据，为分享报告生成提供完整的输入
 *
 * @module lib/services/share-report-aggregator
 */

import { prisma } from '@/lib/db';

// ============================================
// 类型定义
// ============================================

/**
 * 访谈记录分组
 */
export interface GroupedRecords {
  answers: Array<{
    id: string;
    content: string;
    isHighlight: boolean;
    createdAt: Date;
  }>;
  painPoints: Array<{
    id: string;
    content: string;
    isHighlight: boolean;
    createdAt: Date;
  }>;
  requirements: Array<{
    id: string;
    content: string;
    isHighlight: boolean;
    createdAt: Date;
  }>;
  notes: Array<{
    id: string;
    content: string;
    isHighlight: boolean;
    createdAt: Date;
  }>;
}

/**
 * AI洞察分组
 */
export interface GroupedInsights {
  summary: Array<{ id: string; content: string; createdAt: Date }>;
  painPoints: Array<{ id: string; content: string; createdAt: Date }>;
  requirements: Array<{ id: string; content: string; createdAt: Date }>;
  risks: Array<{ id: string; content: string; createdAt: Date }>;
}

/**
 * 聚合的分享报告数据
 */
export interface AggregatedShareReportData {
  // 基础信息
  interview: {
    id: string;
    title: string;
    objective: string | null;
    background: string | null;
    status: string;
    interviewDate: Date | null;
    createdAt: Date;
  };
  customer: {
    id: string;
    name: string;
    industry: string | null;
    description: string | null;
    background: string | null;
  };

  // 用户画像
  persona: {
    id: string;
    name: string;
    role: string;
    demographics: Record<string, unknown> | null;
    goals: string[];
    painPoints: string[];
    behaviors: string[];
    quotes: string[];
  } | null;

  // 用户旅程图
  journeyMap: {
    id: string;
    title: string;
    stages: Array<{ name: string; description: string }>;
    actions: Array<{ stage: string; action: string; detail?: string }>;
    emotions: Array<{ stage: string; emotion: string; intensity: number; reason?: string }>;
    painPoints: Array<{ stage: string; painPoint: string; severity: string; frequency: string }>;
    opportunities: Array<{ stage: string; opportunity: string; potential: string; effort: string }>;
  } | null;

  // 访谈分析报告
  insightReport: {
    businessScenario: {
      summary: string;
      keyCharacteristics: string[];
      potentialChallenges: string[];
    };
    painPointHypotheses: Array<{
      hypothesis: string;
      reasoning: string;
      confidence: 'high' | 'medium' | 'low';
      relatedArea: string;
    }>;
    interviewStrategy: {
      approach: string;
      priorityAreas: string[];
      timeAllocation: string;
      riskAlerts: string[];
    };
  } | null;

  // PRD文档
  prd: {
    id: string;
    title: string;
    content: string;
  } | null;

  // 访谈记录
  records: GroupedRecords;

  // 实时转写
  transcripts: {
    all: Array<{
      id: string;
      content: string;
      speaker: string | null;
      isKeyPoint: boolean;
      createdAt: Date;
    }>;
    keyPoints: Array<{
      id: string;
      content: string;
      speaker: string | null;
      createdAt: Date;
    }>;
  };

  // AI洞察
  aiInsights: GroupedInsights;

  // 需求条目
  requirements: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    category: string | null;
  }>;

  // 访谈进度
  progress: {
    totalQuestions: number;
    askedQuestions: number;
    completionRate: number;
  };

  // 访谈原话（用于引用）
  interviewQuotes: string[];
}

// ============================================
// 数据聚合服务
// ============================================

/**
 * 聚合分享报告所需的所有数据
 */
export async function aggregateShareReportData(
  interviewId: string
): Promise<AggregatedShareReportData> {
  // 1. 获取访谈项目和客户信息
  const interview = await prisma.interviewProject.findUnique({
    where: { id: interviewId },
    include: { customer: true },
  });

  if (!interview) {
    throw new Error(`访谈项目不存在: ${interviewId}`);
  }

  // 2. 获取用户画像
  const personaData = await prisma.userPersona.findFirst({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'desc' },
  });

  // 3. 获取用户旅程图
  const journeyMapData = await prisma.userJourneyMap.findFirst({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'desc' },
  });

  // 4. 获取访谈分析报告
  const insightReportData = await prisma.interviewInsightReport.findFirst({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'desc' },
  });

  // 5. 获取PRD文档
  const prdData = await prisma.pRDDocument.findFirst({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'desc' },
  });

  // 6. 获取访谈记录
  const recordsData = await prisma.interviewRecord.findMany({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'asc' },
  });

  // 7. 获取实时转写
  const transcriptsData = await prisma.realtimeTranscript.findMany({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'asc' },
  });

  // 8. 获取AI洞察
  const aiInsightsData = await prisma.aIInsight.findMany({
    where: { projectId: interviewId },
    orderBy: { createdAt: 'desc' },
  });

  // 9. 获取需求条目
  const requirementsData = await prisma.requirementItem.findMany({
    where: { projectId: interviewId },
    orderBy: { priority: 'desc' },
  });

  // 10. 获取访谈提纲（用于计算进度）
  const outlinesData = await prisma.interviewOutline.findMany({
    where: { projectId: interviewId },
  });

  // ========== 数据转换 ==========

  // 安全的JSON解析函数
  function safeJsonParse<T>(json: string | null, defaultValue: T): T {
    if (!json) return defaultValue;
    try {
      return JSON.parse(json) as T;
    } catch (e) {
      console.warn('[ShareReport] JSON解析失败:', e);
      return defaultValue;
    }
  }

  // 转换用户画像
  const persona = personaData
    ? {
        id: personaData.id,
        name: personaData.name,
        role: personaData.role,
        demographics: safeJsonParse(personaData.demographics, null),
        goals: safeJsonParse(personaData.goals, [] as string[]),
        painPoints: safeJsonParse(personaData.painPoints, [] as string[]),
        behaviors: safeJsonParse(personaData.behaviors, [] as string[]),
        quotes: safeJsonParse(personaData.quotes, [] as string[]),
      }
    : null;

  // 转换用户旅程图
  const journeyMap = journeyMapData
    ? {
        id: journeyMapData.id,
        title: journeyMapData.title,
        stages: safeJsonParse(journeyMapData.stages, []),
        actions: safeJsonParse(journeyMapData.actions, []),
        emotions: safeJsonParse(journeyMapData.emotions, []),
        painPoints: safeJsonParse(journeyMapData.painPoints, []),
        opportunities: safeJsonParse(journeyMapData.opportunities, []),
      }
    : null;

  // 转换访谈分析报告
  const insightReport = insightReportData
    ? safeJsonParse(insightReportData.content, null)
    : null;

  // 分组访谈记录
  const records: GroupedRecords = {
    answers: recordsData
      .filter((r) => r.type === 'answer')
      .map((r) => ({
        id: r.id,
        content: r.content,
        isHighlight: r.isHighlight,
        createdAt: r.createdAt,
      })),
    painPoints: recordsData
      .filter((r) => r.type === 'pain_point')
      .map((r) => ({
        id: r.id,
        content: r.content,
        isHighlight: r.isHighlight,
        createdAt: r.createdAt,
      })),
    requirements: recordsData
      .filter((r) => r.type === 'requirement')
      .map((r) => ({
        id: r.id,
        content: r.content,
        isHighlight: r.isHighlight,
        createdAt: r.createdAt,
      })),
    notes: recordsData
      .filter((r) => r.type === 'note')
      .map((r) => ({
        id: r.id,
        content: r.content,
        isHighlight: r.isHighlight,
        createdAt: r.createdAt,
      })),
  };

  // 分组转写记录
  const transcripts = {
    all: transcriptsData.map((t) => ({
      id: t.id,
      content: t.content,
      speaker: t.speaker,
      isKeyPoint: t.isKeyPoint,
      createdAt: t.createdAt,
    })),
    keyPoints: transcriptsData
      .filter((t) => t.isKeyPoint)
      .map((t) => ({
        id: t.id,
        content: t.content,
        speaker: t.speaker,
        createdAt: t.createdAt,
      })),
  };

  // 分组AI洞察
  const aiInsights: GroupedInsights = {
    summary: aiInsightsData
      .filter((i) => i.type === 'summary')
      .map((i) => ({ id: i.id, content: i.content, createdAt: i.createdAt })),
    painPoints: aiInsightsData
      .filter((i) => i.type === 'pain_point')
      .map((i) => ({ id: i.id, content: i.content, createdAt: i.createdAt })),
    requirements: aiInsightsData
      .filter((i) => i.type === 'requirement')
      .map((i) => ({ id: i.id, content: i.content, createdAt: i.createdAt })),
    risks: aiInsightsData
      .filter((i) => i.type === 'risk')
      .map((i) => ({ id: i.id, content: i.content, createdAt: i.createdAt })),
  };

  // 计算访谈进度
  const totalQuestions = outlinesData.length;
  const askedQuestions = outlinesData.filter(
    (o) => o.status === 'asked'
  ).length;
  const completionRate =
    totalQuestions > 0
      ? Math.round((askedQuestions / totalQuestions) * 100)
      : 0;

  // 提取访谈原话（用于引用）
  const interviewQuotes = extractInterviewQuotes(
    records,
    transcripts.keyPoints
  );

  return {
    interview: {
      id: interview.id,
      title: interview.title,
      objective: interview.objective,
      background: interview.background,
      status: interview.status,
      interviewDate: interview.interviewDate,
      createdAt: interview.createdAt,
    },
    customer: {
      id: interview.customer.id,
      name: interview.customer.name,
      industry: interview.customer.industry,
      description: interview.customer.description,
      background: interview.customer.background,
    },
    persona,
    journeyMap,
    insightReport,
    prd: prdData
      ? {
          id: prdData.id,
          title: prdData.title,
          content: prdData.content,
        }
      : null,
    records,
    transcripts,
    aiInsights,
    requirements: requirementsData.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      category: r.category,
    })),
    progress: {
      totalQuestions,
      askedQuestions,
      completionRate,
    },
    interviewQuotes,
  };
}

/**
 * 提取访谈原话（用于报告中引用）
 */
function extractInterviewQuotes(
  records: GroupedRecords,
  keyPointTranscripts: Array<{ id: string; content: string; createdAt: Date }>
): string[] {
  const quotes: string[] = [];

  // 从高亮回答中提取
  records.answers
    .filter((r) => r.isHighlight)
    .forEach((r) => quotes.push(r.content));

  // 从关键转写中提取
  keyPointTranscripts.forEach((t) => quotes.push(t.content));

  // 从痛点记录中提取
  records.painPoints.forEach((r) => quotes.push(r.content));

  // 从需求记录中提取
  records.requirements
    .filter((r) => r.isHighlight)
    .forEach((r) => quotes.push(r.content));

  // 去重并限制数量
  const uniqueQuotes = [...new Set(quotes)];

  return uniqueQuotes.slice(0, 15); // 最多返回15条
}

/**
 * 验证数据完整性
 */
export function validateDataCompleteness(
  data: AggregatedShareReportData
): {
  isValid: boolean;
  missingData: string[];
  warnings: string[];
} {
  const missingData: string[] = [];
  const warnings: string[] = [];

  // 检查基础必要数据（访谈项目和客户必须存在）
  if (!data.interview || !data.customer) {
    missingData.push('基础访谈信息');
  }

  // 检查重要数据（改为警告而非错误）
  if (!data.persona) {
    warnings.push('用户画像尚未创建，报告中用户画像章节将显示"暂无数据"');
  }

  if (!data.journeyMap) {
    warnings.push('用户旅程图尚未创建，报告中旅程章节将显示"暂无数据"');
  }

  if (!data.insightReport) {
    warnings.push('访谈分析报告尚未生成（可选），可额外补充痛点假设数据');
  }

  // 检查数据质量
  if (data.persona && data.persona.goals.length === 0) {
    warnings.push('用户画像缺少目标信息');
  }

  if (data.persona && data.persona.painPoints.length === 0) {
    warnings.push('用户画像缺少痛点信息');
  }

  if (data.journeyMap && data.journeyMap.stages.length === 0) {
    warnings.push('用户旅程图缺少阶段信息');
  }

  if (data.interviewQuotes.length === 0) {
    warnings.push('缺少访谈原话，报告可能缺乏证据支撑');
  }

  // 检查访谈状态
  if (data.interview.status !== 'completed') {
    warnings.push('访谈尚未完成，报告可能不完整');
  }

  // 只要有基础数据就认为有效
  return {
    isValid: missingData.length === 0,
    missingData,
    warnings,
  };
}