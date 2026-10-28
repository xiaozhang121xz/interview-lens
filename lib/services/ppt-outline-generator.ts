/**
 * PPT大纲生成服务
 *
 * 基于访谈数据生成向客户汇报的PPT大纲（14页混合模式）
 * - 核心痛点/方案单独展示
 * - 次要痛点/方案汇总展示
 * - 每页配图表/可视化内容
 *
 * @module lib/services/ppt-outline-generator
 */

import type { AggregatedShareReportData } from './share-report-aggregator';
import { buildBaseNarrative } from './ppt-narrative-generator';
import {
  type PPTOutlineContent,
  type PPTSlide,
  type PPTMetadata,
  type PPTOutlineMode,
  type PainPointRanking,
  type PainPointDetail,
  type PainPointSummary,
  type SolutionMapping,
  type SolutionDetail,
  type SolutionSummary,
  type SeverityLevel,
  type FrequencyLevel,
  type SlidePresentation,
  type VisualConfig,
  getPriorityScore,
} from '@/lib/types/ppt-outline';
import { getAIClient } from '@/lib/ai/client';

type ClassicSlideEnhancementTier = 'template' | 'light' | 'deep';
type SlideEnhancementTier = 'template' | 'light' | 'deep';

interface ClassicSlideEnhancement {
  slideNumber: number;
  content?: {
    mainPoints?: string[];
    supportingData?: string[];
    quoteEvidence?: string[];
  };
  speakerNotes?: string;
  presentation?: {
    headline?: string;
    subheadline?: string;
    keyMessage?: string;
  };
}

// ============================================
// 主入口函数
// ============================================

/**
 * 生成PPT大纲
 */
export async function generatePPTOutline(
  data: AggregatedShareReportData,
  outlineMode: PPTOutlineMode = 'classic'
): Promise<PPTOutlineContent> {
  // 1. 痛点排序与分类
  const painPointRanking = await rankAndClassifyPainPoints(data);

  // 2. 方案映射与分类
  const solutionMapping = await mapAndClassifySolutions(data, painPointRanking);

  // 3. 构建汇报叙事
  const narrative = buildBaseNarrative(data, painPointRanking, solutionMapping, outlineMode);

  // 4. 生成各页内容
  let slides = applyNarrativeToSlides(
    generateSlidesByMode(data, painPointRanking, solutionMapping, outlineMode),
    narrative
  );

  const llmEnhanced = await shouldEnhanceTemplateSlides(slides, outlineMode);

  if (llmEnhanced) {
    slides = await enhanceTemplateSlides(
      slides,
      data,
      painPointRanking,
      solutionMapping,
      outlineMode
    );
  }

  // 5. 构建元数据
  const metadata = buildMetadata(data, narrative, slides.length, outlineMode, llmEnhanced);

  return {
    slides,
    metadata,
    narrative,
    painPointRanking,
    solutionMapping,
  };
}

// ============================================
// 痛点处理
// ============================================

/**
 * 痛点排序与分类
 */
async function rankAndClassifyPainPoints(
  data: AggregatedShareReportData
): Promise<PainPointRanking> {
  // 从各数据源提取痛点
  const allPainPoints = extractAllPainPoints(data);

  // 按优先级排序
  const ranked = sortPainPointsByPriority(allPainPoints);

  // 分类：TOP1 vs TOP2-3 vs others
  return {
    top1: buildPainPointDetail(ranked[0], data, 1),
    top2And3: ranked.slice(1, 3).map((p, i) => buildPainPointSummary(p, i + 2)),
    others: ranked.slice(3).map((p, i) => buildPainPointSummary(p, i + 4)),
  };
}

/**
 * 从各数据源提取痛点
 */
interface RawPainPoint {
  source: 'journey' | 'insight' | 'record' | 'ai';
  description: string;
  severity: SeverityLevel;
  frequency: FrequencyLevel;
  quote?: string;
  stage?: string;
}

function extractAllPainPoints(data: AggregatedShareReportData): RawPainPoint[] {
  const painPoints: RawPainPoint[] = [];

  // 从用户旅程痛点提取
  if (data.journeyMap?.painPoints) {
    data.journeyMap.painPoints.forEach((p) => {
      painPoints.push({
        source: 'journey',
        description: p.painPoint,
        severity: mapSeverity(p.severity),
        frequency: mapFrequency(p.frequency),
        stage: p.stage,
        quote: findRelatedQuote(p.painPoint, data.interviewQuotes),
      });
    });
  }

  // 从洞察假设提取
  if (data.insightReport?.painPointHypotheses) {
    data.insightReport.painPointHypotheses.forEach((p) => {
      painPoints.push({
        source: 'insight',
        description: p.hypothesis,
        severity: mapConfidenceToSeverity(p.confidence),
        frequency: 'medium',
        quote: findRelatedQuote(p.hypothesis, data.interviewQuotes),
      });
    });
  }

  // 从访谈记录提取
  data.records.painPoints.forEach((r) => {
    painPoints.push({
      source: 'record',
      description: r.content,
      severity: r.isHighlight ? 'high' : 'medium',
      frequency: 'medium',
      quote: r.content,
    });
  });

  // 从AI洞察提取
  data.aiInsights.painPoints.forEach((i) => {
    painPoints.push({
      source: 'ai',
      description: i.content,
      severity: 'medium',
      frequency: 'medium',
      quote: findRelatedQuote(i.content, data.interviewQuotes),
    });
  });

  return painPoints;
}

/**
 * 按优先级排序痛点
 */
function sortPainPointsByPriority(painPoints: RawPainPoint[]): RawPainPoint[] {
  return [...painPoints].sort((a, b) => {
    const scoreA = getPriorityScore(a.severity, a.frequency);
    const scoreB = getPriorityScore(b.severity, b.frequency);
    return scoreB - scoreA;
  });
}

/**
 * 构建痛点详情（TOP1）
 */
function buildPainPointDetail(
  pp: RawPainPoint,
  data: AggregatedShareReportData,
  rank: number
): PainPointDetail {
  return {
    rank,
    description: pp.description,
    quoteEvidence: pp.quote || data.interviewQuotes[0] || '',
    impact: {
      severity: pp.severity,
      frequency: pp.frequency,
      scope: inferImpactScope(pp.description, pp.stage),
      metrics: inferImpactMetrics(pp.description),
    },
    rootCause: {
      surface: inferSurfaceReasons(pp.description),
      deep: inferDeepReasons(pp.description),
      attemptedSolutions: inferAttemptedSolutions(pp.description),
    },
    relatedStage: pp.stage,
    occurrenceCount: pp.frequency === 'high' ? 5 : pp.frequency === 'medium' ? 3 : 1,
  };
}

/**
 * 构建痛点汇总（TOP2-3）
 */
function buildPainPointSummary(pp: RawPainPoint, rank: number): PainPointSummary {
  return {
    rank,
    description: pp.description,
    quoteEvidence: pp.quote || '',
    impactBrief: inferImpactBrief(pp.description),
    severity: pp.severity,
    frequency: pp.frequency,
  };
}

// ============================================
// 方案处理
// ============================================

/**
 * 方案映射与分类
 */
async function mapAndClassifySolutions(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking
): Promise<SolutionMapping> {
  // 从PRD和旅程机会点提取方案
  const allSolutions = extractAllSolutions(data);

  // 与痛点建立映射
  const mappedSolutions = mapSolutionsToPainPoints(allSolutions, painPointRanking);

  // 分类：TOP1 vs TOP2-3
  return {
    top1: mappedSolutions[0] || createDefaultSolution(painPointRanking.top1, 1),
    top2And3: mappedSolutions.slice(1, 3).map((s, i) => ({
      targetPainPoint: s.targetPainPoint,
      targetPainPointRank: i + 2,
      name: s.name,
      description: s.description,
      keyFeatures: s.keyFeatures,
      priority: s.priority,
    })),
  };
}

/**
 * 提取所有方案
 */
interface RawSolution {
  name: string;
  description: string;
  keyFeatures: string[];
  source: 'prd' | 'opportunity' | 'requirement';
}

function extractAllSolutions(data: AggregatedShareReportData): RawSolution[] {
  const solutions: RawSolution[] = [];

  // 从旅程机会点提取
  if (data.journeyMap?.opportunities) {
    data.journeyMap.opportunities.forEach((o) => {
      solutions.push({
        name: o.opportunity,
        description: `${o.stage}阶段的改进机会，潜力${o.potential}，实施难度${o.effort}`,
        keyFeatures: inferSolutionFeatures(o.opportunity),
        source: 'opportunity',
      });
    });
  }

  // 从需求提取
  data.requirements.slice(0, 5).forEach((r) => {
    solutions.push({
      name: r.title,
      description: r.description || `${r.category || '功能'}需求，优先级${r.priority}`,
      keyFeatures: [r.title],
      source: 'requirement',
    });
  });

  return solutions;
}

/**
 * 将方案映射到痛点
 */
function mapSolutionsToPainPoints(
  solutions: RawSolution[],
  painPointRanking: PainPointRanking
): SolutionDetail[] {
  const allPainPoints = [
    painPointRanking.top1,
    ...painPointRanking.top2And3,
    ...painPointRanking.others,
  ];

  return allPainPoints.slice(0, solutions.length).map((pp, i) => {
    const sol = solutions[i] || createDefaultRawSolution(pp.description);
    return {
      targetPainPoint: pp.description,
      targetPainPointRank: pp.rank,
      name: sol.name,
      description: sol.description,
      howItWorks: inferHowItWorks(sol.name, pp.description),
      implementationSteps: generateImplementationSteps(sol),
      keyFeatures: sol.keyFeatures,
      expectedValue: {
        efficiency: inferEfficiencyGain(sol.name),
        cost: inferCostReduction(sol.name),
        business: inferBusinessValue(sol.name),
      },
      priority: (pp.rank <= 2 ? 'P0' : pp.rank <= 4 ? 'P1' : 'P2') as 'P0' | 'P1' | 'P2',
    };
  });
}

// ============================================
// 幻灯片生成
// ============================================

/**
 * 生成所有幻灯片（14页）
 */
function generateSlidesByMode(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode
): PPTSlide[] {
  if (outlineMode === 'customer_next_meeting') {
    return generateCustomerMeetingSlides(data, painPointRanking, solutionMapping);
  }

  return generateClassicSlides(data, painPointRanking, solutionMapping);
}

function generateClassicSlides(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): PPTSlide[] {
  return [
    generateCoverSlide(data),
    generateBackgroundSlide(data),
    generatePersonaSlide(data),
    generateJourneySlide(data),
    generateTop1PainPointSlide(painPointRanking.top1),
    generateTop23PainPointsSlide(painPointRanking),
    generateRootCauseSlide(painPointRanking),
    generateRequirementSlide(data),
    generateTop1SolutionSlide(solutionMapping.top1),
    generateTop23SolutionsSlide(solutionMapping),
    generateValueSlide(solutionMapping),
    generateActionSlide(),
    generateRiskSlide(data),
    generateClosingSlide(data),
  ];
}

function generateCustomerMeetingSlides(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): PPTSlide[] {
  return [
    generateMeetingObjectiveSlide(data, solutionMapping),
    generateMeetingConclusionSlide(data, painPointRanking, solutionMapping),
    generateEvidenceSlide(data, painPointRanking),
    generatePersonaSlide(data),
    generateJourneyFrictionSlide(data, painPointRanking),
    generateMeetingRequirementSlide(data, solutionMapping),
    generateMeetingSolutionSlide(solutionMapping, painPointRanking),
    generateMVPScopeSlide(data, solutionMapping),
    generateRiskSlide(data),
    generateMeetingActionSlide(data, painPointRanking, solutionMapping),
  ];
}

/**
 * 第1页：封面
 */
function generateCoverSlide(data: AggregatedShareReportData): PPTSlide {
  return withPresentation({
    slideNumber: 1,
    slideTitle: '执行摘要',
    slideType: 'cover',
    content: {
      mainPoints: [
        `客户：${data.customer.name}`,
        `研究主题：${data.interview.title}`,
        `访谈日期：${formatDate(data.interview.interviewDate)}`,
        '建议动作：先批准小范围试点，再决定是否扩展投入',
      ],
    },
    visual: {
      type: 'logo-placeholder',
      config: { companyName: data.customer.name },
    },
    speakerNotes: '开场先交付结论，帮助客户快速理解当前最重要的判断和建议动作。',
  }, {
    layout: 'cover-hero',
    sectionLabel: 'Executive Summary',
    headline: `${data.customer.name} 决策摘要`,
    subheadline: data.interview.title,
    keyMessage: `基于${data.interview.objective || data.interview.title}访谈，我们建议先围绕关键场景做小范围验证，再决定是否扩大资源投入。`,
    narrativeRole: 'opening',
    themeVariant: 'executive',
    imageAsset: {
      prompt: `${data.customer.name} 企业访谈汇报封面，行业${data.customer.industry || '企业服务'}，现代商务风，留白充足`,
      alt: `${data.customer.name} 分享报告封面视觉`,
      style: 'abstract',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: [data.customer.name, data.customer.industry || '客户洞察', '访谈报告'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 4,
      maxSpeakerNotesCharsPerPage: 140,
    },
  });
}

/**
 * 第2页：项目背景
 */
function generateBackgroundSlide(data: AggregatedShareReportData): PPTSlide {
  const keyCharacteristics = data.insightReport?.businessScenario?.keyCharacteristics || [];
  const challenges = data.insightReport?.businessScenario?.potentialChallenges || [];
  const scenarioSummary = data.insightReport?.businessScenario?.summary || data.customer.background || '本次研究聚焦关键业务流程中的效率与体验问题。';
  const interviewRecordCount = Object.values(data.records).flat().length;

  return withPresentation({
    slideNumber: 2,
    slideTitle: '研究范围与样本',
    slideType: 'background',
    content: {
      mainPoints: [
        `本次研究旨在回答：${data.interview.objective || '哪些用户问题最值得优先处理'}。`,
        `当前业务场景可概括为：${scenarioSummary}`,
      ],
      supportingData: [
        `关键特征：${keyCharacteristics.slice(0, 2).join('、') || '待补充'}`,
        `主要挑战：${challenges.slice(0, 2).join('、') || '待补充'}`,
        `样本覆盖：${interviewRecordCount}条记录 / ${data.transcripts.keyPoints.length}个关键要点`,
      ],
    },
    visual: {
      type: 'scene-illustration',
      config: {
        description: data.insightReport?.businessScenario?.summary || data.customer.background || '',
      },
    },
    speakerNotes: '这一页重点说明研究边界、样本基础和结论适用范围，避免客户把后续结论理解为泛化判断。',
  }, {
    layout: 'context-split',
    sectionLabel: 'Research Scope',
    headline: '本次研究覆盖什么、没有覆盖什么',
    subheadline: data.interview.objective || data.customer.background || '明确样本基础、研究边界与适用范围',
    keyMessage: data.insightReport?.businessScenario?.summary || '结论建立在真实样本和明确边界之上，因此适合作为当前阶段的决策参考。',
    narrativeRole: 'context',
    themeVariant: 'consulting',
    imageAsset: {
      prompt: `${data.customer.name} 所处业务场景示意，${data.customer.industry || '企业服务'}，现代咨询汇报插画`,
      alt: '项目背景场景图',
      style: 'illustration',
      aspectRatio: '16:9',
      placement: 'background',
      emphasisKeywords: keyCharacteristics.slice(0, 3),
    },
    overflowPolicy: {
      maxMainPointsPerPage: 4,
      maxSupportingItemsPerPage: 3,
    },
  });
}

/**
 * 第3页：用户画像
 */
function generatePersonaSlide(data: AggregatedShareReportData): PPTSlide {
  const persona = data.persona;
  const topGoals = persona?.goals?.slice(0, 2) || [];
  const topPainPoints = persona?.painPoints?.slice(0, 2) || [];
  const topBehaviors = persona?.behaviors?.slice(0, 2) || [];

  return withPresentation({
    slideNumber: 3,
    slideTitle: '核心用户与关键场景',
    slideType: 'persona',
    content: {
      mainPoints: persona
        ? [
            `角色定位：${persona.role}`,
            `核心目标：${topGoals.join('、') || '待补充'}`,
            `主要阻碍：${topPainPoints.join('、') || '待补充'}`,
            `行为特征：${topBehaviors.join('、') || '待补充'}`,
          ]
        : ['用户画像待生成'],
      supportingData: persona
        ? [
            `关键目标聚焦在${topGoals[0] || '核心业务结果'}`,
            `当前最大阻碍来自${topPainPoints[0] || '流程摩擦'}`,
          ]
        : [],
      quoteEvidence: persona?.quotes?.slice(0, 1) || data.interviewQuotes.slice(0, 1),
    },
    visual: {
      type: 'character-card',
      config: {
        name: persona?.name || '目标用户',
        role: persona?.role || '用户角色',
        department: '',
        keyGoals: persona?.goals?.slice(0, 3) || [],
        keyPainPoints: persona?.painPoints?.slice(0, 3) || [],
        quoteSnippet: data.interviewQuotes[0] || '',
      },
    },
    speakerNotes: persona
      ? `这一页只回答一个问题：我们到底在为谁解决问题。先看角色，再看目标和阻碍。`
      : '用户画像待生成，请先生成用户画像。',
  }, {
    layout: 'persona-spotlight',
    sectionLabel: 'Core User',
    headline: persona ? `${persona.name}，${persona.role}` : '核心用户与关键场景',
    subheadline: persona?.goals?.[0] || '聚焦真实目标、阻碍与场景',
    keyMessage: persona
      ? `${persona.role}最在意的是${persona.goals.slice(0, 2).join('、')}，关键阻碍集中在${persona.painPoints.slice(0, 2).join('、')}。`
      : '当前用户画像信息不足，建议先补齐角色、目标和痛点。',
    narrativeRole: 'persona',
    themeVariant: 'research',
    imageAsset: {
      prompt: `${persona?.role || '企业用户'}工作场景人物卡，突出目标与阻碍，现代商务插画`,
      alt: '目标用户画像主视觉',
      style: 'illustration',
      aspectRatio: '4:3',
      placement: 'hero',
      emphasisKeywords: [persona?.role || '目标用户', ...(persona?.painPoints?.slice(0, 2) || [])],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 4,
      maxQuotesPerPage: 2,
    },
  });
}

/**
 * 第4页：工作流程
 */
function generateJourneySlide(data: AggregatedShareReportData): PPTSlide {
  const stages = data.journeyMap?.stages || [];
  const highlightStage = findMostPainfulStage(data.journeyMap);

  return withPresentation({
    slideNumber: 4,
    slideTitle: '关键发现总览',
    slideType: 'journey',
    content: {
      mainPoints: stages.length > 0
        ? stages.slice(0, 4).map((s) => `${s.name}：${s.description || '该阶段是核心流程节点'}`)
        : ['用户旅程待生成'],
      supportingData: data.journeyMap?.actions?.slice(0, 4).map((a) => `${a.stage}：${a.action}`) || [],
    },
    visual: {
      type: 'flow-chart',
      config: {
        stages: stages.map((s) => ({
          name: s.name,
          tasks: data.journeyMap?.actions?.filter((a) => a.stage === s.name).map((a) => a.action) || [],
          isHighlight: s.name === highlightStage,
        })),
        highlightStage,
      },
    },
    speakerNotes: '这一页先把高摩擦流程讲清楚，后面的问题优先级判断都会回到这些关键节点。',
  }, {
    layout: 'journey-flow',
    sectionLabel: 'Key Findings',
    headline: '关键发现集中在这些流程节点',
    subheadline: highlightStage ? `当前最值得关注的是 ${highlightStage} 阶段` : '从流程中定位高摩擦节点',
    keyMessage: highlightStage
      ? `${highlightStage}是当前体验摩擦最集中的环节，后续痛点与方案都将围绕这一阶段展开。`
      : '先梳理流程全貌，再识别高频高影响的阻塞点。',
    narrativeRole: 'context',
    themeVariant: 'consulting',
    imageAsset: {
      prompt: `${data.customer.name} 用户工作流程图，突出${highlightStage || '关键阶段'}，清晰流程设计`,
      alt: '用户工作流程可视化',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: stages.slice(0, 4).map((stage) => stage.name),
    },
    overflowPolicy: {
      maxMainPointsPerPage: 5,
      maxSupportingItemsPerPage: 4,
    },
  });
}

/**
 * 第5页：TOP1痛点详解
 */
function generateTop1PainPointSlide(top1: PainPointDetail): PPTSlide {
  return withPresentation({
    slideNumber: 5,
    slideTitle: '首要问题证据',
    slideType: 'painpoint',
    content: {
      mainPoints: [
        `该问题属于${getSeverityLabel(top1.impact.severity)}严重度、${getFrequencyLabel(top1.impact.frequency)}频次。`,
        `它直接影响${top1.impact.scope}。`,
        `最明显的影响指标是${top1.impact.metrics.slice(0, 2).join('、') || '效率与体验'}。`,
      ],
      quoteEvidence: [top1.quoteEvidence],
      supportingData: [
        `表层原因：${top1.rootCause.surface.slice(0, 2).join('、') || '待补充'}`,
        `深层原因：${top1.rootCause.deep.slice(0, 2).join('、') || '待补充'}`,
        `已有应对：${top1.rootCause.attemptedSolutions.slice(0, 2).join('、') || '尚无系统化解决动作'}`,
      ],
    },
    visual: {
      type: 'painpoint-detail',
      config: {
        title: top1.description,
        severity: top1.impact.severity,
        frequency: top1.impact.frequency,
        scope: top1.impact.scope,
        metrics: top1.impact.metrics,
        quote: top1.quoteEvidence,
        rootCause: {
          surface: top1.rootCause.surface,
          deep: top1.rootCause.deep,
          attempted: top1.rootCause.attemptedSolutions,
        },
      },
    },
    speakerNotes: `这一页重点证明两件事：问题真实存在，而且影响已经足够大，值得优先处理。`,
  }, {
    layout: 'evidence-focus',
    sectionLabel: 'Primary Issue',
    headline: `首要问题：${top1.description}`,
    subheadline: `${getSeverityLabel(top1.impact.severity)}严重度 · ${getFrequencyLabel(top1.impact.frequency)}`,
    keyMessage: `${top1.description}已直接影响${top1.impact.scope}，需要优先投入资源解决。`,
    narrativeRole: 'evidence',
    themeVariant: 'research',
    imageAsset: {
      prompt: `企业用户痛点情境图，主题为${top1.description}，突出工作阻塞与紧迫性`,
      alt: '首要痛点证据页视觉',
      style: 'illustration',
      aspectRatio: '4:3',
      placement: 'supporting',
      emphasisKeywords: [top1.description, ...top1.impact.metrics.slice(0, 2)],
    },
    overflowPolicy: {
      splitBy: 'supportingData',
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxQuotesPerPage: 1,
    },
  });
}

/**
 * 第6页：TOP2-3痛点汇总
 */
function generateTop23PainPointsSlide(ranking: PainPointRanking): PPTSlide {
  return withPresentation({
    slideNumber: 6,
    slideTitle: '问题优先级排序',
    slideType: 'painpoint',
    content: {
      mainPoints: ranking.top2And3.map((pp) => `TOP${pp.rank}：${pp.description}`),
      quoteEvidence: ranking.top2And3.map((pp) => pp.quoteEvidence).filter(Boolean).slice(0, 1),
      supportingData: ranking.top2And3.map((pp) => `TOP${pp.rank}影响：${pp.impactBrief}`),
    },
    visual: {
      type: 'priority-matrix',
      config: {
        items: [...ranking.top2And3, ...ranking.others.slice(0, 3)].map((pp) => ({
          id: `pp-${pp.rank}`,
          label: `TOP${pp.rank}`,
          description: pp.description,
          impact: pp.severity,
          frequency: pp.frequency,
          quote: pp.quoteEvidence,
        })),
        xAxisLabel: '出现频率',
        yAxisLabel: '影响程度',
        highlightIds: ranking.top2And3.map((pp) => `pp-${pp.rank}`),
      },
    },
    speakerNotes: '除了首要痛点，这一页帮助客户理解第二梯队问题，避免方案只盯一个点。',
  }, {
    layout: 'matrix-compare',
    sectionLabel: 'Issue Prioritization',
    headline: '问题优先级排序与处理节奏',
    subheadline: '区分首要议题与第二梯队议题',
    keyMessage: ranking.top2And3.length
      ? `TOP${ranking.top2And3[0].rank}与TOP${ranking.top2And3[1]?.rank || ranking.top2And3[0].rank}是第二梯队优先解决的问题。`
      : '当前可比痛点数量有限，建议补充更多访谈证据。',
    narrativeRole: 'evidence',
    themeVariant: 'consulting',
    imageAsset: {
      prompt: '优先级矩阵商务信息图，展示多项痛点对比与排序',
      alt: '痛点优先级矩阵',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ranking.top2And3.map((pp) => `TOP${pp.rank}`),
    },
    overflowPolicy: {
      maxMainPointsPerPage: 2,
      maxSupportingItemsPerPage: 2,
      maxQuotesPerPage: 1,
    },
  });
}

/**
 * 第7页：根因分析
 */
function generateRootCauseSlide(ranking: PainPointRanking): PPTSlide {
  // 只有TOP1痛点有详细的rootCause
  const top1WithRootCause = ranking.top1;

  return withPresentation({
    slideNumber: 7,
    slideTitle: '根因拆解',
    slideType: 'analysis',
    content: {
      mainPoints: [
        `表层原因：${top1WithRootCause.rootCause?.surface?.slice(0, 2).join('、') || '待分析'}`,
        `深层原因：${top1WithRootCause.rootCause?.deep?.slice(0, 2).join('、') || '待分析'}`,
        `现有应对：${top1WithRootCause.rootCause?.attemptedSolutions?.slice(0, 2).join('、') || '暂无有效应对'}`,
      ],
    },
    visual: {
      type: 'cause-effect',
      config: {
        rootCauses: [{
          cause: top1WithRootCause.rootCause?.deep?.[0] || '待分析',
          effects: [top1WithRootCause.description],
        }],
        correlations: [],
      },
    },
    speakerNotes: '这一页从现象往下走一层，帮助客户理解为什么不能只做表面修补。',
  }, {
    layout: 'analysis-board',
    sectionLabel: 'Cause Analysis',
    headline: '首要问题为什么会反复出现',
    subheadline: top1WithRootCause.description,
    keyMessage: `问题表象背后，更深层的原因在于${top1WithRootCause.rootCause?.deep?.[0] || '系统支撑不足'}。`,
    narrativeRole: 'analysis',
    themeVariant: 'consulting',
    imageAsset: {
      prompt: `问题根因分析图，主题为${top1WithRootCause.description}，展示表层与深层原因`,
      alt: '根因分析图',
      style: 'diagram',
      aspectRatio: '4:3',
      placement: 'supporting',
      emphasisKeywords: [
        ...(top1WithRootCause.rootCause?.surface?.slice(0, 2) || []),
        ...(top1WithRootCause.rootCause?.deep?.slice(0, 1) || []),
      ],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 4,
      maxSupportingItemsPerPage: 2,
    },
  });
}

/**
 * 第8页：需求提炼
 */
function generateRequirementSlide(data: AggregatedShareReportData): PPTSlide {
  const requirements = data.requirements.slice(0, 6);

  return withPresentation({
    slideNumber: 8,
    slideTitle: '需求归纳',
    slideType: 'requirement',
    content: {
      mainPoints: requirements.length > 0
        ? requirements.slice(0, 4).map((r) => `[${r.priority}] ${r.title}`)
        : ['需求待识别'],
      supportingData: requirements.slice(0, 3).map((r) => `${r.title}：${r.description || r.category || '待补充说明'}`),
      quoteEvidence: data.records.requirements.filter((r) => r.isHighlight).slice(0, 1).map((r) => r.content),
    },
    visual: {
      type: 'tree-diagram',
      config: {
        root: '用户需求',
        branches: groupRequirementsByCategory(requirements),
      },
    },
    speakerNotes: '需求页的目标不是罗列需求，而是把问题翻译成后续可以设计和排序的动作。',
  }, {
    layout: 'requirement-tree',
    sectionLabel: 'Need Definition',
    headline: '从问题到需求的归纳',
    subheadline: '从访谈原话和痛点映射到可执行需求',
    keyMessage: requirements.length
      ? `当前优先级最高的需求集中在${requirements[0]?.category || '核心功能'}方向。`
      : '需求信息不足，建议先补齐需求归类与优先级。',
    narrativeRole: 'requirement',
    themeVariant: 'product',
    imageAsset: {
      prompt: '需求树状图，展示需求分类、优先级与层级关系',
      alt: '需求提炼树图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: requirements.slice(0, 4).map((requirement) => requirement.title),
    },
    overflowPolicy: {
      splitBy: 'mainPoints',
      maxMainPointsPerPage: 4,
      maxQuotesPerPage: 2,
    },
  });
}

/**
 * 第9页：TOP1方案详解
 */
function generateTop1SolutionSlide(top1: SolutionDetail): PPTSlide {
  return withPresentation({
    slideNumber: 9,
    slideTitle: '建议方案总览',
    slideType: 'solution',
    content: {
      mainPoints: [
        `优先方案：${top1.name}`,
        `对应问题：${top1.targetPainPoint}`,
        `核心机制：${top1.howItWorks}`,
      ],
      supportingData: [
        `效率提升：${top1.expectedValue.efficiency}`,
        `成本降低：${top1.expectedValue.cost}`,
        `业务收益：${top1.expectedValue.business.slice(0, 2).join('、') || '待验证'}`,
      ],
    },
    visual: {
      type: 'solution-detail',
      config: {
        title: top1.name,
        targetPainPoint: top1.targetPainPoint,
        howItWorks: top1.howItWorks,
        steps: top1.implementationSteps,
        expectedValue: top1.expectedValue,
      },
    },
    speakerNotes: `先给出整体建议方向，再把优先方案单独提出，便于客户理解取舍。`,
  }, {
    layout: 'solution-spotlight',
    sectionLabel: 'Solution Overview',
    headline: `建议方向：优先考虑 ${top1.name}`,
    subheadline: `优先响应的问题是：${top1.targetPainPoint}`,
    keyMessage: `${top1.name}通过${top1.howItWorks}，优先解决当前最关键的业务阻塞。`,
    narrativeRole: 'solution',
    themeVariant: 'product',
    imageAsset: {
      prompt: `解决方案概念图，展示${top1.name}如何响应${top1.targetPainPoint}`,
      alt: '首要方案视觉',
      style: 'ui-mockup',
      aspectRatio: '4:3',
      placement: 'hero',
      emphasisKeywords: [top1.name, ...top1.keyFeatures.slice(0, 2)],
    },
    overflowPolicy: {
      splitBy: 'mainPoints',
      maxMainPointsPerPage: 4,
      maxSupportingItemsPerPage: 3,
    },
  });
}

/**
 * 第10页：TOP2-3方案汇总
 */
function generateTop23SolutionsSlide(mapping: SolutionMapping): PPTSlide {
  return withPresentation({
    slideNumber: 10,
    slideTitle: '优先方案详解',
    slideType: 'solution',
    content: {
      mainPoints: [mapping.top1, ...mapping.top2And3].slice(0, 3).map((s) => `${s.name}对应${s.targetPainPoint}`),
      supportingData: [mapping.top1, ...mapping.top2And3].slice(0, 3).map((s) => `${s.name}优先级：${s.priority}`),
    },
    visual: {
      type: 'mapping-diagram',
      config: {
        mappings: [mapping.top1, ...mapping.top2And3].map((s) => ({
          painPointId: `pp-${s.targetPainPointRank}`,
          painPointLabel: s.targetPainPoint.substring(0, 15) + '...',
          painPointRank: s.targetPainPointRank,
          solutionId: `sol-${s.targetPainPointRank}`,
          solutionLabel: s.name,
        })),
        title: '方案-痛点映射',
      },
    },
    speakerNotes: '这一页把方案和问题一一对应，重点说明为什么优先方案最适合作为当前试点。 ',
  }, {
    layout: 'mapping-board',
    sectionLabel: 'Priority Solution',
    headline: '优先方案为什么值得先做',
    subheadline: '围绕问题与方案映射，解释当前取舍逻辑',
    keyMessage: '当前优先方案最适合作为试点，因为它最直接对应首要问题且验证成本更可控。',
    narrativeRole: 'solution',
    themeVariant: 'consulting',
    imageAsset: {
      prompt: '方案映射板，展示痛点到方案的对应关系，咨询汇报风格',
      alt: '方案映射关系图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: [mapping.top1.name, ...mapping.top2And3.slice(0, 2).map((item) => item.name)],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
    },
  });
}

/**
 * 第11页：预期价值
 */
function generateValueSlide(mapping: SolutionMapping): PPTSlide {
  // 只有TOP1方案有详细的expectedValue
  const top1Solution = mapping.top1;
  const top23Solutions = mapping.top2And3;

  return withPresentation({
    slideNumber: 11,
    slideTitle: '价值评估',
    slideType: 'value',
    content: {
      mainPoints: [
        `效率提升：${top1Solution.expectedValue.efficiency}`,
        `成本优化：${top1Solution.expectedValue.cost}`,
        `业务收益：${top1Solution.expectedValue.business.slice(0, 2).join('、') || '待验证'}`,
      ],
      supportingData: top23Solutions.slice(0, 2).map((s) => `${s.name}作为补充方案，可增强整体收益`),
    },
    visual: {
      type: 'roi-chart',
      config: {
        directValue: [{
          metric: top1Solution.name,
          before: '现状',
          after: top1Solution.expectedValue.efficiency,
          improvement: top1Solution.expectedValue.cost,
        }],
        longTermValue: top1Solution.expectedValue.business,
        estimatedROI: '预计ROI: 3-5倍',
      },
    },
    speakerNotes: '价值页只需要讲清楚三件事：效率、成本、业务收益，不要再展开实现细节。',
  }, {
    layout: 'value-dashboard',
    sectionLabel: 'Business Value',
    headline: '为什么值得现在投入推进',
    subheadline: top1Solution.name,
    keyMessage: `${top1Solution.name}有望同时带来${top1Solution.expectedValue.efficiency}与${top1Solution.expectedValue.cost}。`,
    narrativeRole: 'value',
    themeVariant: 'executive',
    imageAsset: {
      prompt: `ROI价值仪表盘，突出${top1Solution.name}带来的效率、成本与业务收益`,
      alt: '预期价值看板',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: [
        top1Solution.name,
        top1Solution.expectedValue.efficiency,
        top1Solution.expectedValue.cost,
      ],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 4,
      maxSupportingItemsPerPage: 2,
    },
  });
}

/**
 * 第12页：实施路径
 */
function generateActionSlide(): PPTSlide {
  return withPresentation({
    slideNumber: 12,
    slideTitle: '试点路径',
    slideType: 'action',
    content: {
      mainPoints: [
        '短期：启动试点并收集真实反馈',
        '中期：围绕关键阻塞点迭代方案',
        '长期：沉淀机制并扩大应用范围',
      ],
      supportingData: [
        '短期目标：验证方案是否能解决首要痛点',
        '中期目标：优化流程并稳定产出',
      ],
    },
    visual: {
      type: 'timeline',
      config: {
        phases: [
          { name: '短期', duration: '1-2周', actions: ['试点验证', '用户反馈收集'], status: 'planned' },
          { name: '中期', duration: '1个月', actions: ['功能迭代', '流程优化'], status: 'planned' },
          { name: '长期', duration: '持续', actions: ['持续优化', '规模化推广'], status: 'planned' },
        ],
      },
    },
    speakerNotes: '路径页要降低决策压力，强调可以先试点、再扩展，而不是一开始就做大而全投入。',
  }, {
    layout: 'timeline-roadmap',
    sectionLabel: 'Pilot Roadmap',
    headline: '试点路径与验证节奏',
    subheadline: '短期验证，中期迭代，长期规模化落地',
    keyMessage: '建议先验证、再扩展，把资源投入建立在真实效果而不是预期之上。',
    narrativeRole: 'action',
    themeVariant: 'product',
    imageAsset: {
      prompt: '实施路线图时间轴，分阶段展示目标、动作和节奏',
      alt: '实施时间轴',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['短期', '中期', '长期'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSpeakerNotesCharsPerPage: 100,
    },
  });
}

/**
 * 第13页：风险提示
 */
function generateRiskSlide(data: AggregatedShareReportData): PPTSlide {
  const risks = data.aiInsights.risks.slice(0, 4);

  return withPresentation({
    slideNumber: 13,
    slideTitle: '风险与前提',
    slideType: 'risk',
    content: {
      mainPoints: risks.length > 0 ? risks.slice(0, 3).map((r) => r.content) : ['暂无特别风险提示'],
      supportingData: risks.length > 0
        ? risks.slice(0, 2).map((r) => `应对建议：围绕“${r.content}”提前设置监控与负责人`)
        : ['建议持续监控实施节奏、资源投入和用户反馈'],
    },
    visual: {
      type: 'risk-matrix',
      config: {
        risks: risks.map((r) => ({
          risk: r.content,
          probability: 'medium' as const,
          impact: 'medium' as const,
          mitigation: '需进一步评估',
        })),
      },
    },
    speakerNotes: '风险页不是为了制造顾虑，而是提前展示我们已经考虑过实施阻力和缓解动作。',
  }, {
    layout: 'risk-board',
    sectionLabel: 'Execution Risks',
    headline: '风险与前提需要先说清楚',
    subheadline: '识别试点推进中的主要阻力与前提条件',
    keyMessage: risks.length
      ? `当前最需要关注的是“${risks[0].content}”这类实施风险。`
      : '暂未识别出高优先级风险，但仍建议持续监控。',    
    narrativeRole: 'risk',
    themeVariant: 'executive',
    imageAsset: {
      prompt: '项目风险矩阵，展示概率、影响与缓解策略',
      alt: '风险矩阵看板',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: risks.slice(0, 3).map((risk) => risk.content),
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
    },
  });
}

/**
 * 第14页：结束页
 */
function generateClosingSlide(data: AggregatedShareReportData): PPTSlide {
  return withPresentation({
    slideNumber: 14,
    slideTitle: '决策建议',
    slideType: 'closing',
    content: {
      mainPoints: [
        '围绕首要痛点启动小范围试点',
        '建立反馈机制，验证方案效果',
        '根据试点结果决定下一步资源投入',
      ],
      supportingData: [
        '核心发现已经形成：问题、需求、方案、价值链路清晰',
        `建议优先在${data.customer.name}当前高摩擦场景中验证`,
      ],
    },
    visual: {
      type: 'infographic',
      config: {
        summary: '访谈分析完成',
        nextSteps: ['启动试点', '收集反馈', '迭代优化'],
      },
    },
    speakerNotes: '最后一页要把讨论从“理解问题”收束到“是否愿意启动试点”，推动客户做出下一步判断。',
  }, {
    layout: 'closing-summary',
    sectionLabel: 'Decision Request',
    headline: '建议当前就做出的决策',
    subheadline: `${data.customer.name} 下一步建议`,
    keyMessage: '建议当前就批准小范围试点，把分析结论尽快转成可验证的业务结果。',
    narrativeRole: 'closing',
    themeVariant: 'executive',
    imageAsset: {
      prompt: '总结页信息图，收束核心发现并强调下一步行动',
      alt: '总结页主视觉',
      style: 'abstract',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['总结', '下一步', '行动'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 5,
      maxSpeakerNotesCharsPerPage: 120,
    },
  });
}

function generateMeetingObjectiveSlide(
  data: AggregatedShareReportData,
  solutionMapping: SolutionMapping
): PPTSlide {
  return withPresentation({
    slideNumber: 1,
    slideTitle: '本次沟通目的与待确认事项',
    slideType: 'cover',
    content: {
      mainPoints: [
        `本次会议目标是对齐${data.customer.name}当前最优先的问题判断。`,
        `希望确认的重点是${solutionMapping.top1.name}是否作为下一阶段试点方向。`,
        '会后希望明确MVP范围、参与角色与推进节奏。',
      ],
      supportingData: [
        `研究主题：${data.interview.title}`,
        `访谈目标：${data.interview.objective || '厘清核心问题与下一步动作'}`,
      ],
    },
    visual: {
      type: 'scene-illustration',
      config: {
        description: `${data.customer.name}下一次沟通的会议目标与确认事项`,
      },
    },
    speakerNotes: '开场先说明这次会议要确认什么，避免讨论重新回到研究过程本身。',
  }, {
    layout: 'cover-hero',
    sectionLabel: 'Meeting Goal',
    headline: '本次沟通目的与希望确认的事项',
    subheadline: `${data.customer.name} 下一次客户沟通 / 领导同步`,
    keyMessage: '本次会议重点是确认优先问题、MVP方向与试点前提，而不是重复回顾研究背景。',
    narrativeRole: 'opening',
    themeVariant: 'executive',
    imageAsset: {
      prompt: `${data.customer.name} 业务沟通会议封面主视觉，16:9，现代商务汇报风，突出对齐目标、确认事项、下一步推进`,
      alt: '本次沟通目标页主视觉',
      style: 'illustration',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: [data.customer.name, '沟通目标', '确认事项'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxSpeakerNotesCharsPerPage: 80,
    },
  });
}

function generateMeetingConclusionSlide(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): PPTSlide {
  const secondProblem = painPointRanking.top2And3[0]?.description;
  return withPresentation({
    slideNumber: 2,
    slideTitle: '一页结论',
    slideType: 'background',
    content: {
      mainPoints: [
        `当前最值得优先解决的问题是：${painPointRanking.top1.description}。`,
        secondProblem
          ? `第二优先问题是：${secondProblem}，建议作为后续跟进议题。`
          : '当前建议先聚焦一个核心问题，避免同时推进过多战线。',
        `建议围绕${solutionMapping.top1.name}先做小范围验证。`,
      ],
      supportingData: [
        `优先依据：${getSeverityLabel(painPointRanking.top1.impact.severity)}严重度、${getFrequencyLabel(painPointRanking.top1.impact.frequency)}`,
        `预期收益：${solutionMapping.top1.expectedValue.efficiency}`,
      ],
    },
    visual: {
      type: 'infographic',
      config: {
        primaryProblem: painPointRanking.top1.description,
        secondaryProblem: secondProblem || null,
        recommendation: solutionMapping.top1.name,
      },
    },
    speakerNotes: '这一页只传达结论和取舍，不展开过程细节。',
  }, {
    layout: 'context-split',
    sectionLabel: 'One Page Conclusion',
    headline: '一页结论：先解决什么，再考虑什么',
    subheadline: '把最重要的判断先说清楚',
    keyMessage: `${painPointRanking.top1.description}应先处理，建议以${solutionMapping.top1.name}作为验证抓手。`,
    narrativeRole: 'context',
    themeVariant: 'executive',
    imageAsset: {
      prompt: `${data.customer.name} 一页结论信息图，16:9，商务咨询汇报风，突出优先问题、次优先问题、建议动作`,
      alt: '一页结论信息图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['一页结论', solutionMapping.top1.name, painPointRanking.top1.description],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

function generateEvidenceSlide(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking
): PPTSlide {
  const requirementSignals = data.requirements.slice(0, 2).map((item) => item.title);
  const supportingData = [
    `反复提及的痛点：${painPointRanking.top1.description}`,
    requirementSignals.length > 0
      ? `相关需求信号：${requirementSignals.join('、')}`
      : '相关需求信号待补充',
  ];

  return withPresentation({
    slideNumber: 3,
    slideTitle: '关键证据',
    slideType: 'painpoint',
    content: {
      mainPoints: [
        '访谈原话、痛点记录和需求信号相互印证，说明问题并非个别反馈。',
        `该问题主要影响${painPointRanking.top1.impact.scope}。`,
      ],
      supportingData,
      quoteEvidence: [painPointRanking.top1.quoteEvidence || data.interviewQuotes[0] || ''],
    },
    visual: {
      type: 'painpoint-detail',
      config: {
        title: painPointRanking.top1.description,
        severity: painPointRanking.top1.impact.severity,
        frequency: painPointRanking.top1.impact.frequency,
        scope: painPointRanking.top1.impact.scope,
        metrics: painPointRanking.top1.impact.metrics.slice(0, 2),
        quote: painPointRanking.top1.quoteEvidence || data.interviewQuotes[0] || '',
        rootCause: {
          surface: painPointRanking.top1.rootCause.surface.slice(0, 2),
          deep: painPointRanking.top1.rootCause.deep.slice(0, 1),
          attempted: painPointRanking.top1.rootCause.attemptedSolutions.slice(0, 1),
        },
      },
    },
    speakerNotes: '先用一句原话把问题钉住，再用痛点和需求信号补强可信度。',
  }, {
    layout: 'evidence-focus',
    sectionLabel: 'Evidence',
    headline: '关键证据：原话、痛点、需求信号',
    subheadline: '让优先判断有证据支撑',
    keyMessage: '多个证据源指向同一问题，说明其优先级足够高。',
    narrativeRole: 'evidence',
    themeVariant: 'research',
    imageAsset: {
      prompt: `企业访谈证据板，16:9，浅色商务图解风，包含原话摘录、痛点标签、需求信号卡片`,
      alt: '关键证据页视觉',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['原话', '痛点', '需求'],
    },
    overflowPolicy: {
      splitBy: 'supportingData',
      maxMainPointsPerPage: 2,
      maxSupportingItemsPerPage: 2,
      maxQuotesPerPage: 1,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

function generateJourneyFrictionSlide(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking
): PPTSlide {
  const stages = data.journeyMap?.stages || [];
  const highlightStage = findMostPainfulStage(data.journeyMap) || painPointRanking.top1.relatedStage;
  const stageSummaries = stages.slice(0, 3).map((stage) => `${stage.name}：${stage.description || '关键流程节点'}`);

  return withPresentation({
    slideNumber: 5,
    slideTitle: '高摩擦节点',
    slideType: 'journey',
    content: {
      mainPoints: stageSummaries.length > 0 ? stageSummaries : ['用户旅程信息待补充'],
      supportingData: highlightStage ? [`重点关注阶段：${highlightStage}`] : [],
    },
    visual: {
      type: 'flow-chart',
      config: {
        stages: stages.slice(0, 4).map((stage) => ({
          name: stage.name,
          tasks: data.journeyMap?.actions
            ?.filter((action) => action.stage === stage.name)
            .slice(0, 2)
            .map((action) => action.action) || [],
          isHighlight: stage.name === highlightStage,
        })),
        highlightStage,
      },
    },
    speakerNotes: '这一页帮助客户把问题放回真实流程，看清最该切入的节点。',
  }, {
    layout: 'journey-flow',
    sectionLabel: 'Journey Friction',
    headline: '用户旅程中的高摩擦节点',
    subheadline: highlightStage ? `当前最卡的是 ${highlightStage}` : '从流程定位关键阻塞点',
    keyMessage: highlightStage
      ? `${highlightStage}是最值得优先优化的流程入口。`
      : '先围绕高频环节判断优先优化入口。',
    narrativeRole: 'context',
    themeVariant: 'consulting',
    imageAsset: {
      prompt: `${data.customer.name} 用户旅程高摩擦节点流程图，16:9，现代咨询图解风，突出关键阶段与阻塞点`,
      alt: '高摩擦节点流程图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: [highlightStage || '关键阶段', '流程阻塞', '旅程图'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 1,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

function generateMeetingRequirementSlide(
  data: AggregatedShareReportData,
  solutionMapping: SolutionMapping
): PPTSlide {
  const requirements = data.requirements.slice(0, 3);
  const mainPoints = requirements.length > 0
    ? requirements.map((item) => `${item.title}：${item.description || `${item.category || '功能'}需求`}`)
    : [
        `围绕${solutionMapping.top1.targetPainPoint}先定义最关键的MVP需求。`,
        '优先满足效率与可执行性，避免第一版目标过大。',
      ];

  return withPresentation({
    slideNumber: 6,
    slideTitle: '需求归纳',
    slideType: 'requirement',
    content: {
      mainPoints,
      supportingData: requirements.slice(0, 2).map((item) => `优先级${item.priority} · ${item.category || '未分类'}`),
    },
    visual: {
      type: 'tree-diagram',
      config: {
        root: '核心需求',
        branches: requirements.slice(0, 3).map((item) => ({
          category: item.category || '功能需求',
          items: [item.title],
        })),
      },
    },
    speakerNotes: '这一页把问题翻译成需求语言，为后面的方案和PRD范围做衔接。',
  }, {
    layout: 'requirement-tree',
    sectionLabel: 'Requirements',
    headline: '需求归纳：我们真正要满足什么',
    subheadline: '从抱怨翻译成可执行需求',
    keyMessage: '先定义清楚核心需求，再谈方案和功能边界。',
    narrativeRole: 'requirement',
    themeVariant: 'product',
    imageAsset: {
      prompt: `核心需求树状图，16:9，B端产品规划风，突出核心诉求、优先级、需求分层`,
      alt: '需求归纳树状图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['需求归纳', '优先级', 'MVP'],
    },
    overflowPolicy: {
      splitBy: 'mainPoints',
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

function generateMeetingSolutionSlide(
  solutionMapping: SolutionMapping,
  painPointRanking: PainPointRanking
): PPTSlide {
  const nonPriority = solutionMapping.top2And3[0]?.name || '非核心扩展动作';

  return withPresentation({
    slideNumber: 7,
    slideTitle: '方案建议',
    slideType: 'solution',
    content: {
      mainPoints: [
        `优先建议：先推进${solutionMapping.top1.name}，直接回应${solutionMapping.top1.targetPainPoint}。`,
        `本阶段暂不优先：${nonPriority}，避免试点范围过大。`,
        `优先方案价值：${solutionMapping.top1.expectedValue.business.slice(0, 1)[0] || solutionMapping.top1.expectedValue.efficiency}`,
      ],
      supportingData: solutionMapping.top1.keyFeatures.slice(0, 2).map((feature) => `关键动作：${feature}`),
    },
    visual: {
      type: 'solution-detail',
      config: {
        title: solutionMapping.top1.name,
        targetPainPoint: painPointRanking.top1.description,
        howItWorks: solutionMapping.top1.howItWorks,
        steps: solutionMapping.top1.implementationSteps.slice(0, 3),
        expectedValue: {
          efficiency: solutionMapping.top1.expectedValue.efficiency,
          cost: solutionMapping.top1.expectedValue.cost,
          business: solutionMapping.top1.expectedValue.business.slice(0, 2),
        },
      },
    },
    speakerNotes: '重点讲清楚为什么先做这个，而不是把所有想法一次性都推进。',
  }, {
    layout: 'solution-spotlight',
    sectionLabel: 'Recommendation',
    headline: '方案建议：优先做什么，不优先做什么',
    subheadline: '用取舍建立方案可信度',
    keyMessage: `${solutionMapping.top1.name}更适合作为当前阶段试点，不建议一开始就扩大范围。`,
    narrativeRole: 'solution',
    themeVariant: 'product',
    imageAsset: {
      prompt: `${solutionMapping.top1.name} 方案概念图，16:9，B端解决方案可视化，突出优先动作、非优先动作、验证路径`,
      alt: '方案建议页主视觉',
      style: 'ui-mockup',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: [solutionMapping.top1.name, '优先方案', '试点'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

function generateMVPScopeSlide(
  data: AggregatedShareReportData,
  solutionMapping: SolutionMapping
): PPTSlide {
  const mvpFeatures = solutionMapping.top1.keyFeatures.slice(0, 3);
  const futureFeatures = data.requirements.slice(3, 5).map((item) => item.title);

  return withPresentation({
    slideNumber: 8,
    slideTitle: 'PRD方向与MVP范围',
    slideType: 'solution',
    content: {
      mainPoints: [
        `MVP建议聚焦：${mvpFeatures.join('、') || solutionMapping.top1.name}。`,
        '第一版以打通关键场景为目标，不追求覆盖所有边界情况。',
        futureFeatures.length > 0
          ? `后续可迭代项：${futureFeatures.join('、')}`
          : '其余扩展能力建议放入第二阶段迭代。',
      ],
      supportingData: [
        `对应问题：${solutionMapping.top1.targetPainPoint}`,
        `范围原则：先小范围验证，再决定扩展`,
      ],
    },
    visual: {
      type: 'mapping-diagram',
      config: {
        title: 'MVP范围映射',
        mappings: (mvpFeatures.length > 0 ? mvpFeatures : [solutionMapping.top1.name]).map((feature, index) => ({
          painPointId: 'painpoint-top1',
          painPointLabel: solutionMapping.top1.targetPainPoint,
          painPointRank: 1,
          solutionId: `mvp-${index + 1}`,
          solutionLabel: feature,
        })),
      },
    },
    speakerNotes: '这一页把建议方案进一步收束成可进入PRD的最小范围。',
  }, {
    layout: 'mapping-board',
    sectionLabel: 'MVP Scope',
    headline: '对应 PRD 方向 / MVP 范围',
    subheadline: '把建议动作落成最小可执行版本',
    keyMessage: '先定义最小范围，避免会后直接进入大而全的功能讨论。',
    narrativeRole: 'solution',
    themeVariant: 'product',
    imageAsset: {
      prompt: `MVP范围图与PRD方向图，16:9，产品规划信息图风格，突出核心功能、排除项、迭代项`,
      alt: 'MVP范围图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['MVP', 'PRD方向', '范围边界'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

function generateMeetingActionSlide(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): PPTSlide {
  return withPresentation({
    slideNumber: 10,
    slideTitle: '下一步行动与待确认事项',
    slideType: 'action',
    content: {
      mainPoints: [
        `客户需确认：${solutionMapping.top1.name}是否进入试点。`,
        '双方需对齐：试点范围、参与角色、时间节奏。',
        `内部建议：围绕${painPointRanking.top1.description}设定试点验收指标。`,
      ],
      supportingData: [
        '建议会后一周内完成试点范围确认',
        `建议指定一位业务负责人作为${data.customer.name}侧接口人`,
      ],
    },
    visual: {
      type: 'timeline',
      config: {
        phases: [
          { name: '确认范围', duration: '1周', actions: ['确认MVP边界', '确认参与角色'], status: 'planned' },
          { name: '启动试点', duration: '2-4周', actions: ['上线验证', '收集反馈'], status: 'planned' },
          { name: '评估扩展', duration: '1周', actions: ['复盘结果', '决定扩展节奏'], status: 'planned' },
        ],
      },
    },
    speakerNotes: '最后收束成可执行的会后动作，让客户知道下一步怎么配合。',
  }, {
    layout: 'timeline-roadmap',
    sectionLabel: 'Next Step',
    headline: '下一步行动与需要客户确认的事项',
    subheadline: `${data.customer.name} 会后配合建议`,
    keyMessage: '建议会后立即确认试点范围与责任人，把本次判断转成下一阶段动作。',
    narrativeRole: 'action',
    themeVariant: 'executive',
    imageAsset: {
      prompt: `客户沟通后续行动路线图，16:9，商务时间轴信息图，突出确认事项、责任分工、试点节奏`,
      alt: '下一步行动路线图',
      style: 'diagram',
      aspectRatio: '16:9',
      placement: 'hero',
      emphasisKeywords: ['下一步', '确认事项', '试点路线'],
    },
    overflowPolicy: {
      maxMainPointsPerPage: 3,
      maxSupportingItemsPerPage: 2,
      maxSpeakerNotesCharsPerPage: 72,
    },
  });
}

// ============================================
// 辅助函数
// ============================================

function buildMetadata(
  data: AggregatedShareReportData,
  narrative: ReturnType<typeof buildBaseNarrative>,
  totalSlides: number,
  outlineMode: PPTOutlineMode,
  llmEnhanced: boolean
): PPTMetadata {
  return {
    projectTitle: data.interview.title,
    customerName: data.customer.name,
    interviewDate: formatDate(data.interview.interviewDate),
    totalSlides,
    createdAt: new Date().toISOString(),
    version: outlineMode === 'customer_next_meeting'
      ? '1.3-template-customer-meeting'
      : (llmEnhanced ? '1.4-template-hybrid' : '1.2-template-reframe'),
    protocolVersion: 'presentation-v2',
    paletteName: 'tech-dark-consulting',
    coreThesis: narrative.coreThesis,
    audience: narrative.audience,
    decisionGoal: narrative.decisionGoal,
    outlineMode,
    pageAspectRatio: '16:9',
  };
}

function withPresentation(slide: PPTSlide, presentation: SlidePresentation): PPTSlide {
  return {
    ...slide,
    presentation,
  };
}

function applyNarrativeToSlides(
  slides: PPTSlide[],
  narrative: ReturnType<typeof buildBaseNarrative>
): PPTSlide[] {
  return slides.map((slide, index) => {
    const brief = narrative.pageBriefs[index];
    if (!brief || !slide.presentation) return slide;

    return {
      ...slide,
      content: {
        mainPoints: slide.content.mainPoints.slice(0, brief.contentBudget.maxMainPoints),
        supportingData: slide.content.supportingData?.slice(0, brief.contentBudget.maxSupportingItems),
        quoteEvidence: slide.content.quoteEvidence?.slice(0, brief.contentBudget.maxQuotes),
      },
      speakerNotes: truncateText(slide.speakerNotes, brief.contentBudget.maxSpeakerNotesChars),
      presentation: {
        ...slide.presentation,
        purpose: brief.purpose,
        questionToAnswer: brief.questionToAnswer,
        transitionFromPrev: brief.transitionFromPrev,
        transitionToNext: brief.transitionToNext,
        overflowPolicy: {
          ...slide.presentation.overflowPolicy,
          splitBy: slide.presentation.overflowPolicy?.splitBy || 'mainPoints',
          maxMainPointsPerPage: brief.contentBudget.maxMainPoints,
          maxSupportingItemsPerPage: brief.contentBudget.maxSupportingItems,
          maxQuotesPerPage: brief.contentBudget.maxQuotes,
          maxSpeakerNotesCharsPerPage: brief.contentBudget.maxSpeakerNotesChars,
        },
      },
    };
  });
}

function truncateText(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function formatDate(date: Date | null | string): string {
  if (!date) return '未设定';
  try {
    return new Date(date).toLocaleDateString('zh-CN');
  } catch {
    return '未设定';
  }
}

async function shouldEnhanceTemplateSlides(
  slides: PPTSlide[],
  outlineMode: PPTOutlineMode
): Promise<boolean> {
  const aiClient = getAIClient();
  if (!aiClient.isConfigured()) {
    return false;
  }

  return outlineMode === 'classic' ? slides.length >= 10 : slides.length >= 8;
}

async function enhanceTemplateSlides(
  slides: PPTSlide[],
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode
): Promise<PPTSlide[]> {
  const aiClient = getAIClient();
  if (!aiClient.isConfigured()) {
    return slides;
  }

  const targetSlides = slides.filter((slide) => {
    const tier = getSlideEnhancementTier(slide.slideNumber, outlineMode);
    return tier === 'light' || tier === 'deep';
  });

  if (targetSlides.length === 0) {
    return slides;
  }

  const response = await aiClient.generateCompletion(
    buildEnhancementSystemPrompt(outlineMode),
    [
      {
        role: 'user',
        content: buildEnhancementUserPrompt(
          targetSlides,
          data,
          painPointRanking,
          solutionMapping,
          outlineMode
        ),
      },
    ],
    {
      maxTokens: 3200,
      temperature: 0.3,
    }
  );

  if (!response.success) {
    console.warn('[PPT Template] Classic slide enhancement skipped:', response.error);
    return slides;
  }

  try {
      const enhancements = parseEnhancements(response.content);
      return slides.map((slide) => {
        const enhancement = enhancements.find((item) => item.slideNumber === slide.slideNumber);
        return enhancement ? mergeSlideEnhancement(slide, enhancement) : slide;
      });
    } catch (error) {
      console.warn('[PPT Template] Failed to parse slide enhancement:', error);
      return slides;
    }
}

function getClassicSlideEnhancementTier(slideNumber: number): ClassicSlideEnhancementTier {
  if ([3, 4, 8, 11, 13].includes(slideNumber)) return 'light';
  if ([5, 6, 7, 9, 10].includes(slideNumber)) return 'deep';
  return 'template';
}

function getCustomerMeetingSlideEnhancementTier(slideNumber: number): SlideEnhancementTier {
  if ([3, 5, 6, 8].includes(slideNumber)) return 'light';
  if ([2, 7, 10].includes(slideNumber)) return 'deep';
  return 'template';
}

function getSlideEnhancementTier(
  slideNumber: number,
  outlineMode: PPTOutlineMode
): SlideEnhancementTier {
  if (outlineMode === 'customer_next_meeting') {
    return getCustomerMeetingSlideEnhancementTier(slideNumber);
  }

  return getClassicSlideEnhancementTier(slideNumber);
}

function buildEnhancementSystemPrompt(outlineMode: PPTOutlineMode): string {
  if (outlineMode === 'customer_next_meeting') {
    return [
      '你是企业访谈分享报告的 PPT 文案增强器。',
      '请优化 customer_next_meeting 10页模板中的部分页面文案，不改变页面顺序、布局和字段结构。',
      '第3、5、6、8页属于轻量润色页：保留模板骨架，只优化表达、标题、副标题、keyMessage。',
      '第2、7、10页属于高价值决策页：强化一页结论、方案取舍、下一步待确认事项的表达力度。',
      '整体语气应更偏“客户下一次沟通 / 领导同步”，强调结论、取舍、待确认事项。',
      '严格输出 JSON，不要输出 Markdown。',
      '返回格式：',
      '{"slides":[{"slideNumber":2,"content":{"mainPoints":[],"supportingData":[],"quoteEvidence":[]},"speakerNotes":"","presentation":{"headline":"","subheadline":"","keyMessage":""}}]}',
      '约束：',
      '1. 不要新增或删除页面。',
      '2. 每个数组长度不要超过输入页对应数组长度。',
      '3. 保持中文、简洁、强决策导向。',
      '4. 不要编造新事实，只能重写、压缩、重组已有信息。',
    ].join('\n');
  }

  return [
    '你是企业访谈分享报告的 PPT 文案增强器。',
    '请只优化 classic 14页模板中的部分页面文案，不改变页面顺序、布局和字段结构。',
    '第3、4、8、11、13页属于轻量润色页：保留模板骨架，只优化表达、标题、副标题、keyMessage。',
    '第5、6、7、9、10页属于高价值洞察页：允许更明显地增强问题定义、证据归纳、优先级解释、根因总结、方案取舍逻辑。',
    '严格输出 JSON，不要输出 Markdown。',
    '返回格式：',
    '{"slides":[{"slideNumber":3,"content":{"mainPoints":[],"supportingData":[],"quoteEvidence":[]},"speakerNotes":"","presentation":{"headline":"","subheadline":"","keyMessage":""}}]}',
    '约束：',
    '1. 不要新增或删除页面。',
    '2. 每个数组长度不要超过输入页对应数组长度。',
    '3. 保持中文、专业、简洁、偏咨询汇报风格。',
    '4. 不要编造新事实，只能重写、压缩、重组已有信息。',
  ].join('\n');
}

function buildEnhancementUserPrompt(
  slides: PPTSlide[],
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode
): string {
  const payload = {
    outlineMode,
    customer: data.customer.name,
    interviewTitle: data.interview.title,
    corePainPoint: painPointRanking.top1.description,
    topSolution: solutionMapping.top1.name,
    slides: slides.map((slide) => ({
      slideNumber: slide.slideNumber,
      slideTitle: slide.slideTitle,
      tier: getSlideEnhancementTier(slide.slideNumber, outlineMode),
      contentLimits: {
        mainPoints: slide.content.mainPoints.length,
        supportingData: slide.content.supportingData?.length || 0,
        quoteEvidence: slide.content.quoteEvidence?.length || 0,
      },
      content: slide.content,
      speakerNotes: slide.speakerNotes,
      presentation: slide.presentation
        ? {
            headline: slide.presentation.headline,
            subheadline: slide.presentation.subheadline,
            keyMessage: slide.presentation.keyMessage,
          }
        : undefined,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

function parseEnhancements(content: string): ClassicSlideEnhancement[] {
  const match = content.trim().match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON found in enhancement response');
  }

  const parsed = JSON.parse(match[0]) as { slides?: ClassicSlideEnhancement[] };
  return Array.isArray(parsed.slides) ? parsed.slides : [];
}

function mergeSlideEnhancement(
  slide: PPTSlide,
  enhancement: ClassicSlideEnhancement
): PPTSlide {
  const maxMainPoints = slide.content.mainPoints.length;
  const maxSupportingItems = slide.content.supportingData?.length || 0;
  const maxQuotes = slide.content.quoteEvidence?.length || 0;
  const maxSpeakerNotesChars =
    slide.presentation?.overflowPolicy?.maxSpeakerNotesCharsPerPage || slide.speakerNotes.length;

  return {
    ...slide,
    content: {
      mainPoints: clampTextArray(
        enhancement.content?.mainPoints,
        slide.content.mainPoints,
        maxMainPoints
      ),
      supportingData: slide.content.supportingData
        ? clampTextArray(
            enhancement.content?.supportingData,
            slide.content.supportingData,
            maxSupportingItems
          )
        : undefined,
      quoteEvidence: slide.content.quoteEvidence
        ? clampTextArray(
            enhancement.content?.quoteEvidence,
            slide.content.quoteEvidence,
            maxQuotes
          )
        : undefined,
    },
    speakerNotes: truncateText(
      enhancement.speakerNotes || slide.speakerNotes,
      maxSpeakerNotesChars
    ),
    presentation: slide.presentation
      ? {
          ...slide.presentation,
          headline: enhancement.presentation?.headline || slide.presentation.headline,
          subheadline: enhancement.presentation?.subheadline || slide.presentation.subheadline,
          keyMessage: enhancement.presentation?.keyMessage || slide.presentation.keyMessage,
        }
      : slide.presentation,
  };
}

function clampTextArray(
  candidate: string[] | undefined,
  fallback: string[],
  maxItems: number
): string[] {
  if (!candidate || candidate.length === 0) {
    return fallback;
  }

  return candidate
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function mapSeverity(severity: string): SeverityLevel {
  const map: Record<string, SeverityLevel> = {
    high: 'high',
    medium: 'medium',
    low: 'low',
    critical: 'high',
    major: 'high',
    minor: 'low',
  };
  return map[severity?.toLowerCase()] || 'medium';
}

function mapFrequency(frequency: string): FrequencyLevel {
  const map: Record<string, FrequencyLevel> = {
    frequent: 'high',
    often: 'high',
    high: 'high',
    medium: 'medium',
    occasional: 'medium',
    rare: 'low',
    low: 'low',
  };
  return map[frequency?.toLowerCase()] || 'medium';
}

function mapConfidenceToSeverity(confidence: string): SeverityLevel {
  const map: Record<string, SeverityLevel> = {
    high: 'high',
    medium: 'medium',
    low: 'low',
  };
  return map[confidence?.toLowerCase()] || 'medium';
}

function findRelatedQuote(text: string, quotes: string[]): string | undefined {
  if (!quotes.length) return undefined;
  // 简单匹配：找包含关键词的原话
  const keywords = text.split(/[，、。]/).filter((k) => k.length >= 2);
  for (const keyword of keywords) {
    const match = quotes.find((q) => q.includes(keyword));
    if (match) return match;
  }
  return quotes[0];
}

function findMostPainfulStage(journeyMap: AggregatedShareReportData['journeyMap']): string | undefined {
  if (!journeyMap?.painPoints?.length) return undefined;
  // 找痛点最多的阶段
  const stagePainCount = new Map<string, number>();
  journeyMap.painPoints.forEach((p) => {
    stagePainCount.set(p.stage, (stagePainCount.get(p.stage) || 0) + 1);
  });
  let maxStage = '';
  let maxCount = 0;
  stagePainCount.forEach((count, stage) => {
    if (count > maxCount) {
      maxCount = count;
      maxStage = stage;
    }
  });
  return maxStage;
}

function getSeverityLabel(severity: SeverityLevel): string {
  const labels = { high: '高', medium: '中', low: '低' };
  return labels[severity];
}

function getFrequencyLabel(frequency: FrequencyLevel): string {
  const labels = { high: '高频', medium: '中频', low: '低频' };
  return labels[frequency];
}

// 推断函数（简化实现，实际应由LLM生成）
function inferImpactScope(description: string, stage?: string): string {
  if (stage) return `${stage}阶段，影响整体流程`;
  return '影响用户日常工作流程';
}

function inferImpactMetrics(description: string): string[] {
  return ['效率降低', '用户满意度下降', '潜在业务损失'];
}

function inferSurfaceReasons(description: string): string[] {
  return ['流程设计不合理', '工具支持不足'];
}

function inferDeepReasons(description: string): string[] {
  return ['缺乏系统化支撑', '资源配置不足'];
}

function inferAttemptedSolutions(description: string): string[] {
  return ['手动处理', '临时变通方案'];
}

function inferImpactBrief(description: string): string {
  return '影响工作效率和用户体验';
}

function inferSolutionFeatures(name: string): string[] {
  return ['自动化处理', '智能推荐', '实时反馈'];
}

function createDefaultRawSolution(painPoint: string): RawSolution {
  return {
    name: `${painPoint.substring(0, 10)}解决方案`,
    description: `针对${painPoint.substring(0, 20)}的优化方案`,
    keyFeatures: ['待细化'],
    source: 'requirement',
  };
}

function createDefaultSolution(pp: PainPointDetail, rank: number): SolutionDetail {
  return {
    targetPainPoint: pp.description,
    targetPainPointRank: rank,
    name: '解决方案待设计',
    description: '需要进一步细化',
    howItWorks: '待分析',
    implementationSteps: [
      { step: 1, action: '需求确认', details: '与用户确认具体需求' },
      { step: 2, action: '方案设计', details: '设计解决方案' },
      { step: 3, action: '开发实施', details: '开发并部署' },
    ],
    keyFeatures: ['待细化'],
    expectedValue: {
      efficiency: '待评估',
      cost: '待评估',
      business: ['待评估'],
    },
    priority: 'P1',
  };
}

function inferHowItWorks(solution: string, painPoint: string): string {
  return `通过${solution}直接解决${painPoint.substring(0, 15)}问题`;
}

function generateImplementationSteps(sol: RawSolution): Array<{ step: number; action: string; details: string }> {
  return [
    { step: 1, action: '需求确认', details: '与用户确认具体需求' },
    { step: 2, action: '方案设计', details: '设计解决方案架构' },
    { step: 3, action: '开发实施', details: '开发并部署功能' },
    { step: 4, action: '用户培训', details: '编写操作手册并培训' },
  ];
}

function inferEfficiencyGain(solution: string): string {
  return '预计提升30-50%';
}

function inferCostReduction(solution: string): string {
  return '预计降低20-30%';
}

function inferBusinessValue(solution: string): string[] {
  return ['提升用户满意度', '优化业务流程', '降低运营成本'];
}

function groupRequirementsByCategory(requirements: Array<{ title: string; category?: string | null }>): Array<{ category: string; items: string[] }> {
  const groups = new Map<string, string[]>();
  requirements.forEach((r) => {
    const cat = r.category || '其他';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(r.title);
  });
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}
