/**
 * 分享报告大模型调用服务
 *
 * 负责调用大模型生成报告各章节的内容
 *
 * @module lib/services/share-report-llm
 */

import type { AggregatedShareReportData } from './share-report-aggregator';
import { getAIClient } from '@/lib/ai/client';

// ============================================
// 类型定义
// ============================================

/**
 * 生成的报告内容
 */
export interface GeneratedReportContent {
  // 第一章：项目背景
  chapter1: {
    backgroundSummary: string;
    keyCharacteristics: string[];
    interviewOverview: string;
  };

  // 第二章：用户画像
  chapter2: {
    roleOverview: string;
    goalAnalysis: string;
    painPointImpact: string;
    behaviorInsight: string;
    oneLineSummary: string;
    quotedFromInterview: string[];
  };

  // 第三章：用户旅程
  chapter3: {
    overview: string;
    keyFindings: string[];
    emotionAnalysis: string;
    opportunityHints: string[];
    quotedDialogues: string[];
  };

  // 第四章：痛点分析
  chapter4: {
    priorityOrder: string;
    coreAnalysis: string;
    correlationAnalysis: string;
    impactScope: string;
    quotedPainPoints: string[];
  };

  // 第五章：解决方案
  chapter5: {
    overview: string;
    specificSolutions: Array<{
      painPoint: string;
      solutions: string[];
    }>;
    prioritySuggestion: string;
    implementationTips: string;
    userValueExplanation: string;
  };

  // 第六章：下一步行动
  chapter6: {
    shortTerm: string[];
    midTerm: string[];
    longTerm: string[];
    riskMitigation: string;
    notes: string;
  };
}

// ============================================
// 大模型调用服务
// ============================================

/**
 * 调用大模型生成完整报告内容
 */
export async function generateReportContent(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent> {
  // 并行调用大模型生成各章节内容
  const [
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
  ] = await Promise.all([
    generateChapter1(data),
    generateChapter2(data),
    generateChapter3(data),
    generateChapter4(data),
    generateChapter5(data),
    generateChapter6(data),
  ]);

  return {
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
  };
}

/**
 * 第一章：项目背景总结
 */
async function generateChapter1(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent['chapter1']> {
  const prompt = buildChapter1Prompt(data);
  const response = await callLLM(prompt);

  return {
    backgroundSummary: String(response.backgroundSummary || ''),
    keyCharacteristics: Array.isArray(response.keyCharacteristics)
      ? response.keyCharacteristics.map(String)
      : [],
    interviewOverview: String(response.interviewOverview || ''),
  };
}

/**
 * 第二章：用户画像解读
 */
async function generateChapter2(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent['chapter2']> {
  const prompt = buildChapter2Prompt(data);
  const response = await callLLM(prompt);

  return {
    roleOverview: String(response.roleOverview || ''),
    goalAnalysis: String(response.goalAnalysis || ''),
    painPointImpact: String(response.painPointImpact || ''),
    behaviorInsight: String(response.behaviorInsight || ''),
    oneLineSummary: String(response.oneLineSummary || ''),
    quotedFromInterview: Array.isArray(response.quotedFromInterview)
      ? response.quotedFromInterview.map(String)
      : [],
  };
}

/**
 * 第三章：用户旅程洞察
 */
async function generateChapter3(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent['chapter3']> {
  const prompt = buildChapter3Prompt(data);
  const response = await callLLM(prompt);

  return {
    overview: String(response.overview || ''),
    keyFindings: Array.isArray(response.keyFindings)
      ? response.keyFindings.map(String)
      : [],
    emotionAnalysis: String(response.emotionAnalysis || ''),
    opportunityHints: Array.isArray(response.opportunityHints)
      ? response.opportunityHints.map(String)
      : [],
    quotedDialogues: Array.isArray(response.quotedDialogues)
      ? response.quotedDialogues.map(String)
      : [],
  };
}

/**
 * 第四章：痛点分析
 */
async function generateChapter4(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent['chapter4']> {
  const prompt = buildChapter4Prompt(data);
  const response = await callLLM(prompt);

  return {
    priorityOrder: String(response.priorityOrder || ''),
    coreAnalysis: String(response.coreAnalysis || ''),
    correlationAnalysis: String(response.correlationAnalysis || ''),
    impactScope: String(response.impactScope || ''),
    quotedPainPoints: Array.isArray(response.quotedPainPoints)
      ? response.quotedPainPoints.map(String)
      : [],
  };
}

/**
 * 第五章：解决方案生成
 */
async function generateChapter5(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent['chapter5']> {
  const prompt = buildChapter5Prompt(data);
  const response = await callLLM(prompt);

  return {
    overview: String(response.overview || ''),
    specificSolutions: Array.isArray(response.specificSolutions)
      ? response.specificSolutions.map((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            return {
              painPoint: String(obj.painPoint || ''),
              solutions: Array.isArray(obj.solutions)
                ? obj.solutions.map(String)
                : [],
            };
          }
          return { painPoint: '', solutions: [] };
        })
      : [],
    prioritySuggestion: String(response.prioritySuggestion || ''),
    implementationTips: String(response.implementationTips || ''),
    userValueExplanation: String(response.userValueExplanation || ''),
  };
}

/**
 * 第六章：下一步行动规划
 */
async function generateChapter6(
  data: AggregatedShareReportData
): Promise<GeneratedReportContent['chapter6']> {
  const prompt = buildChapter6Prompt(data);
  const response = await callLLM(prompt);

  return {
    shortTerm: Array.isArray(response.shortTerm)
      ? response.shortTerm.map(String)
      : [],
    midTerm: Array.isArray(response.midTerm)
      ? response.midTerm.map(String)
      : [],
    longTerm: Array.isArray(response.longTerm)
      ? response.longTerm.map(String)
      : [],
    riskMitigation: String(response.riskMitigation || ''),
    notes: String(response.notes || ''),
  };
}

// ============================================
// Prompt构建函数
// ============================================

function buildChapter1Prompt(data: AggregatedShareReportData): string {
  const interviewDate = data.interview.interviewDate
    ? new Date(data.interview.interviewDate).toLocaleDateString('zh-CN')
    : '未设定';

  return `你是一位专业的客户洞察分析师。请根据以下信息，生成一份简洁专业的项目背景介绍。

## 客户信息
- 名称：${data.customer.name}
- 行业：${data.customer.industry || '未指定'}
- 背景：${data.customer.background || '无'}

## 访谈项目
- 标题：${data.interview.title}
- 目标：${data.interview.objective || '未设定'}
- 背景：${data.interview.background || '无'}
- 访谈日期：${interviewDate}
- 访谈状态：${data.interview.status}

## 业务场景分析
${
  data.insightReport
    ? `
- 场景概述：${data.insightReport.businessScenario.summary}
- 关键特征：${data.insightReport.businessScenario.keyCharacteristics.join('、')}
- 潜在挑战：${data.insightReport.businessScenario.potentialChallenges.join('、')}
`
    : '暂无分析报告'
}

## 访谈概况
- 访谈记录数：${Object.values(data.records).flat().length}条
- 关键要点数：${data.transcripts.keyPoints.length}个
- 访谈进度：${data.progress.completionRate}%

请以JSON格式返回以下内容：
{
  "backgroundSummary": "项目背景概述（2-3句话）",
  "keyCharacteristics": ["关键特征1", "关键特征2", "关键特征3"],
  "interviewOverview": "访谈概况说明（1-2句话）"
}`;
}

function buildChapter2Prompt(data: AggregatedShareReportData): string {
  if (!data.persona) {
    return `由于缺少用户画像数据，请返回：
{
  "roleOverview": "暂无用户画像数据",
  "goalAnalysis": "",
  "painPointImpact": "",
  "behaviorInsight": "",
  "oneLineSummary": "",
  "quotedFromInterview": []
}`;
  }

  const quotesToUse = data.interviewQuotes.slice(0, 5);

  return `你是一位专业的用户研究专家。请基于以下用户画像数据和访谈原话，生成一份用户角色解读。

## 用户画像
- 姓名/角色：${data.persona.name} / ${data.persona.role}
- 目标：${data.persona.goals.join('、') || '无'}
- 痛点：${data.persona.painPoints.join('、') || '无'}
- 行为特征：${data.persona.behaviors.join('、') || '无'}
- 用户语录：${data.persona.quotes.join('；') || '无'}

## 访谈原话（用户亲口说的关键内容）
${quotesToUse.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

请以JSON格式返回以下内容：
{
  "roleOverview": "用户角色概述（他是谁？做什么的？2-3句话）",
  "goalAnalysis": "核心目标解读（他最想达成什么？为什么重要？引用原话佐证）",
  "painPointImpact": "痛点深度分析（这些痛点对他有什么影响？引用原话说明）",
  "behaviorInsight": "行为特征洞察（他倾向于怎么做？为什么？）",
  "oneLineSummary": "用户心声（用原话中的关键词，以第一人称总结，1-2句话）",
  "quotedFromInterview": ["引用的原话1", "引用的原话2"]
}`;
}

function buildChapter3Prompt(data: AggregatedShareReportData): string {
  if (!data.journeyMap) {
    return `由于缺少用户旅程图数据，请返回：
{
  "overview": "暂无用户旅程图数据",
  "keyFindings": [],
  "emotionAnalysis": "",
  "opportunityHints": [],
  "quotedDialogues": []
}`;
  }

  const stages = data.journeyMap.stages.map((s) => s.name).join(' → ');
  const emotions = data.journeyMap.emotions
    .map((e) => `${e.stage}: ${e.emotion}(${e.intensity}/5)`)
    .join('；');

  const keyDialogues = data.transcripts.keyPoints
    .slice(0, 3)
    .map((t) => t.content);

  return `你是一位用户体验专家。请分析以下用户旅程数据，提炼核心洞察。

## 旅程阶段
${stages}

## 情绪变化
${emotions}

## 各阶段痛点
${
  data.journeyMap.painPoints.length > 0
    ? data.journeyMap.painPoints
        .map((p) => `- ${p.stage}: ${p.painPoint}（严重度:${p.severity}）`)
        .join('\n')
    : '无'
}

## 改进机会点
${
  data.journeyMap.opportunities.length > 0
    ? data.journeyMap.opportunities
        .map((o) => `- ${o.stage}: ${o.opportunity}（潜力:${o.potential}）`)
        .join('\n')
    : '无'
}

## 关键对话片段
${keyDialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

请以JSON格式返回以下内容：
{
  "overview": "旅程整体概述（用户在做什么？2-3句话）",
  "keyFindings": ["关键发现1（哪个阶段最关键？为什么？）", "关键发现2", "关键发现3"],
  "emotionAnalysis": "情绪分析（用户在哪个环节最痛苦/最满意？原因是什么？引用原话）",
  "opportunityHints": ["改进机会1", "改进机会2"],
  "quotedDialogues": ["引用的对话1", "引用的对话2"]
}`;
}

function buildChapter4Prompt(data: AggregatedShareReportData): string {
  const journeyPainPoints = data.journeyMap?.painPoints || [];
  const hypothesisPainPoints = data.insightReport?.painPointHypotheses || [];
  const recordPainPoints = data.records.painPoints.map((r) => r.content);
  const insightPainPoints = data.aiInsights.painPoints.map((i) => i.content);

  const allPainPoints = [
    ...journeyPainPoints.map((p) => `[旅程] ${p.painPoint}`),
    ...hypothesisPainPoints.map(
      (p) => `[假设] ${p.hypothesis}（置信度:${p.confidence}）`
    ),
    ...recordPainPoints.map((p) => `[记录] ${p}`),
    ...insightPainPoints.map((p) => `[洞察] ${p}`),
  ];

  if (allPainPoints.length === 0) {
    return `由于缺少痛点数据，请返回：
{
  "priorityOrder": "暂无痛点数据",
  "coreAnalysis": "",
  "correlationAnalysis": "",
  "impactScope": "",
  "quotedPainPoints": []
}`;
  }

  return `你是一位产品策略专家。请分析以下痛点数据，进行优先级排序和深度分析。

## 收集到的痛点
${allPainPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 访谈中的痛点原话
${data.interviewQuotes.slice(0, 5).map((q, i) => `${i + 1}. "${q}"`).join('\n')}

请以JSON格式返回以下内容：
{
  "priorityOrder": "痛点优先级排序说明（按影响程度和频率，列出TOP3）",
  "coreAnalysis": "核心痛点深度分析（TOP3痛点的根本原因是什么？引用原话佐证）",
  "correlationAnalysis": "痛点关联分析（哪些痛点是相互关联的？）",
  "impactScope": "痛点影响范围（对用户业务/体验的影响，用访谈证据支撑）",
  "quotedPainPoints": ["引用的痛点原话1", "引用的痛点原话2"]
}`;
}

function buildChapter5Prompt(data: AggregatedShareReportData): string {
  const painPoints = data.insightReport?.painPointHypotheses
    .slice(0, 3)
    .map((p) => p.hypothesis) || [];
  const opportunities = data.journeyMap?.opportunities.map((o) => o.opportunity) || [];
  const requirements = data.requirements.slice(0, 5).map((r) => r.title);
  const requirementQuotes = data.records.requirements
    .filter((r) => r.isHighlight)
    .slice(0, 3)
    .map((r) => r.content);

  return `你是一位产品解决方案架构师。请根据以下信息，生成具体的解决方案建议。

## 核心痛点
${painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n') || '暂无'}

## 改进机会点
${opportunities.map((o, i) => `${i + 1}. ${o}`).join('\n') || '暂无'}

## 已识别的需求
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n') || '暂无'}

## 用户需求原话
${requirementQuotes.map((q, i) => `${i + 1}. "${q}"`).join('\n') || '暂无'}

## 现有PRD内容
${data.prd ? data.prd.content.substring(0, 500) + '...' : '暂无PRD'}

请以JSON格式返回以下内容：
{
  "overview": "解决方案整体思路（2-3句话）",
  "specificSolutions": [
    {
      "painPoint": "痛点1",
      "solutions": ["解决方案A", "解决方案B"]
    },
    {
      "painPoint": "痛点2",
      "solutions": ["解决方案"]
    }
  ],
  "prioritySuggestion": "方案优先级建议（按投入产出比排序）",
  "implementationTips": "实施建议（技术可行性、资源需求）",
  "userValueExplanation": "用户价值说明（每个方案如何解决用户的实际问题，引用原话）"
}`;
}

function buildChapter6Prompt(data: AggregatedShareReportData): string {
  const risks = data.aiInsights.risks.map((r) => r.content);

  return `你是一位项目管理专家。请根据以上分析，生成具体的行动计划。

## 风险提示
${risks.map((r, i) => `${i + 1}. ${r}`).join('\n') || '暂无特别风险'}

## 需求条目数
${data.requirements.length}个

## 访谈进度
${data.progress.completionRate}%

请以JSON格式返回以下内容：
{
  "shortTerm": ["短期行动1（1-2周内可完成）", "短期行动2"],
  "midTerm": ["中期行动1（1个月内）", "中期行动2"],
  "longTerm": ["长期规划1（持续优化）"],
  "riskMitigation": "风险应对建议（1-2句话）",
  "notes": "注意事项（1-2句话）"
}`;
}

// ============================================
// 底层LLM调用
// ============================================

/**
 * 调用大模型API
 *
 * 使用项目统一的AI客户端（lib/ai/client.ts）直接调用Anthropic API，
 * 避免服务端使用相对路径fetch导致的URL解析错误。
 */
async function callLLM(prompt: string): Promise<Record<string, unknown>> {
  try {
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(
      '你是一位专业的客户洞察分析师。请根据用户输入生成结构化的分析内容。输出必须是有效的JSON格式，不要包含任何其他解释或说明。',
      [{ role: 'user', content: prompt }]
    );

    if (!response.success) {
      throw new Error(`LLM API error: ${response.error}`);
    }

    // 尝试解析返回的JSON内容
    try {
      // 提取JSON内容（处理可能的额外文本）
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // 如果没有匹配到JSON对象，尝试直接解析
      return JSON.parse(response.content);
    } catch {
      // 如果解析失败，返回空对象
      console.warn('[Share Report LLM] Failed to parse LLM response as JSON');
      return {};
    }
  } catch (error) {
    console.error('[Share Report LLM] LLM call failed:', error);
    throw error;
  }
}