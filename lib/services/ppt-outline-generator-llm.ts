/**
 * PPT大纲LLM生成服务
 *
 * 使用大模型生成更自然、更有洞察力的PPT大纲内容
 *
 * @module lib/services/ppt-outline-generator-llm
 */

import type { AggregatedShareReportData } from './share-report-aggregator';
import { generatePPTOutline } from './ppt-outline-generator';
import {
  type PPTOutlineContent,
  type PPTSlide,
  type PPTMetadata,
  type PPTNarrative,
  type PPTPageBrief,
  type PainPointRanking,
  type PainPointDetail,
  type PainPointSummary,
  type SolutionMapping,
  type SolutionDetail,
  type SolutionSummary,
  type SeverityLevel,
  type FrequencyLevel,
  type VisualConfig,
  type VisualSuggestion,
  type SlidePresentation,
  type SlideLayout,
  type SlideNarrativeRole,
  type SlideImageAsset,
  type SlideOverflowPolicy,
  type TechLightPalette,
  type PaletteName,
  PALETTE_PRESETS,
  getPriorityScore,
} from '@/lib/types/ppt-outline';
import { getAIClient } from '@/lib/ai/client';

// ============================================
// 类型定义
// ============================================

/**
 * 生成方案类型
 */
export type GenerationType = 'template' | 'llm';

/**
 * LLM生成的痛点分析结果
 */
interface LLMPainPointAnalysis {
  top1: {
    description: string;
    quoteEvidence: string;
    impact: {
      severity: SeverityLevel;
      frequency: FrequencyLevel;
      scope: string;
      metrics: string[];
    };
    rootCause: {
      surface: string[];
      deep: string[];
      attemptedSolutions: string[];
    };
    relatedStage?: string;
  };
  top2And3: Array<{
    description: string;
    quoteEvidence: string;
    impactBrief: string;
    severity: SeverityLevel;
    frequency: FrequencyLevel;
  }>;
}

/**
 * LLM生成的方案分析结果
 */
interface LLMSolutionAnalysis {
  top1: {
    targetPainPoint: string;
    name: string;
    description: string;
    howItWorks: string;
    implementationSteps: Array<{
      step: number;
      action: string;
      details: string;
    }>;
    keyFeatures: string[];
    expectedValue: {
      efficiency: string;
      cost: string;
      business: string[];
    };
  };
  top2And3: Array<{
    targetPainPoint: string;
    name: string;
    description: string;
    keyFeatures: string[];
  }>;
}

/**
 * LLM完整输出
 */
interface LLMNarrativeOutput {
  coreThesis: string;
  executiveSummary: string;
  audience: string;
  storyline: string[];
  decisionGoal: string;
  pageBriefs: Array<{
    pageNumber: number;
    purpose: string;
    questionToAnswer: string;
    keyTakeaway: string;
    transitionFromPrev?: string;
    transitionToNext?: string;
    mustIncludeEvidence?: string[];
  }>;
}

interface LLMSlideOutput {
  /** 全局配色方案建议 */
  themeSuggestion?: {
    paletteName: PaletteName;
    reason?: string;
  };
  slideContents: Array<{
    slideNumber: number;
    mainPoints: string[];
    supportingData?: string[];
    quoteEvidence?: string[];
    speakerNotes: string;
    /** 图表建议（新增） */
    visual?: VisualSuggestion;
    /** 页面级展示协议 */
    pageDesign?: {
      layout: SlideLayout;
      sectionLabel?: string;
      headline: string;
      subheadline?: string;
      keyMessage: string;
      narrativeRole?: SlideNarrativeRole;
      themeVariant?: 'executive' | 'consulting' | 'product' | 'research';
      imageAsset?: SlideImageAsset;
      overflowPolicy?: SlideOverflowPolicy;
    };
  }>;
}

type LLMPageContent = LLMSlideOutput['slideContents'][number];

// ============================================
// 主入口函数
// ============================================

/**
 * 使用LLM生成PPT大纲
 */
export async function generatePPTOutlineWithLLM(
  data: AggregatedShareReportData
): Promise<PPTOutlineContent> {
  const aiClient = getAIClient();

  const model =
    process.env.AZSHENTONG_MODEL ||
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    'glm-5';

  // 第一阶段：先用模板逻辑生成稳定的分析骨架，再交给LLM增强叙事
  const baselineOutline = await generatePPTOutline(data);
  const painPointRanking = baselineOutline.painPointRanking;
  const solutionMapping = baselineOutline.solutionMapping;

  console.log(`[PPT-LLM] Stage 1/2 generating narrative (model: ${model})...`);
  const narrativeResponse = await aiClient.generateCompletion(
    '',
    [
      {
        role: 'user',
        content: buildNarrativePrompt(data, baselineOutline.narrative),
      },
    ],
    {
      model,
      maxTokens: 2800,
    }
  );
  if (!narrativeResponse.success) {
    throw new Error(narrativeResponse.error || 'PPT narrative generation failed');
  }
  const narrativeText = narrativeResponse.content;
  const llmNarrative = parseJsonResponse<LLMNarrativeOutput>(narrativeText, ['coreThesis', 'pageBriefs']);
  const narrative = mergeNarrative(baselineOutline.narrative, llmNarrative);

  // 第二阶段：基于 narrative 生成每页内容
  console.log(`[PPT-LLM] Stage 2/2 generating slide content (model: ${model})...`);
  const slideResponse = await aiClient.generateCompletion(
    '',
    [
      {
        role: 'user',
        content: buildSlidesPrompt(data, narrative, painPointRanking, solutionMapping),
      },
    ],
    {
      model,
      maxTokens: 6500,
    }
  );
  if (!slideResponse.success) {
    throw new Error(slideResponse.error || 'PPT slide generation failed');
  }
  const slideText = slideResponse.content;
  const llmOutput = parseJsonResponse<LLMSlideOutput>(slideText, ['slideContents']);

  const slides = buildSlides(data, llmOutput, painPointRanking, solutionMapping, narrative);
  const metadata = buildMetadata(data, narrative);

  return {
    slides,
    metadata,
    narrative,
    painPointRanking,
    solutionMapping,
  };
}

// ============================================
// Prompt构建
// ============================================

function summarizeData(data: AggregatedShareReportData) {
  return {
    interview: {
      title: data.interview.title,
      objective: data.interview.objective,
      status: data.interview.status,
    },
    customer: {
      name: data.customer.name,
      industry: data.customer.industry,
      background: data.customer.background,
    },
    persona: data.persona ? {
      name: data.persona.name,
      role: data.persona.role,
      goals: data.persona.goals.slice(0, 5),
      painPoints: data.persona.painPoints.slice(0, 5),
      behaviors: data.persona.behaviors.slice(0, 3),
    } : null,
    journeyStages: data.journeyMap?.stages || [],
    journeyPainPoints: data.journeyMap?.painPoints?.slice(0, 5) || [],
    journeyOpportunities: data.journeyMap?.opportunities?.slice(0, 5) || [],
    insightPainPoints: data.insightReport?.painPointHypotheses?.slice(0, 3) || [],
    requirements: data.requirements.slice(0, 5).map((r) => ({
      title: r.title,
      priority: r.priority,
      category: r.category,
    })),
    interviewQuotes: data.interviewQuotes.slice(0, 10),
    progress: data.progress,
  };
}

function buildNarrativePrompt(
  data: AggregatedShareReportData,
  baselineNarrative: PPTNarrative
): string {
  const dataSummary = summarizeData(data);

  return `你是一位资深的咨询顾问和客户汇报架构师。请先不要写具体页面文案，而是先设计一套完整的汇报逻辑。

## 输入数据
\`\`\`json
${JSON.stringify(dataSummary, null, 2)}
\`\`\`

## 基础叙事草案
\`\`\`json
${JSON.stringify(baselineNarrative, null, 2)}
\`\`\`

## 你的任务
请在基础叙事草案上做增强，输出一套更像咨询汇报的叙事结构：
- coreThesis：整套PPT的核心命题
- executiveSummary：给高管的摘要
- audience：汇报对象
- storyline：3-6条叙事主线
- decisionGoal：希望客户最终做出的决策
- pageBriefs：14页，每页都要说明存在目的、回答的问题、关键结论、前后页衔接、必须出现的证据

## 要求
1. 汇报逻辑必须体现：背景 -> 问题 -> 证据 -> 根因 -> 需求 -> 方案 -> 价值 -> 落地
2. 每页都是为推进决策服务，不要做孤立页面
3. 证据必须来自输入数据，不可编造
4. keyTakeaway 必须像客户汇报中的结论句
5. pageBriefs 必须保持 14 页顺序，不要增删页
6. 输出纯JSON，不要有任何额外文字

## 输出格式
\`\`\`json
{
  "coreThesis": "一句话核心结论",
  "executiveSummary": "2-3句高管摘要",
  "audience": "汇报对象",
  "storyline": ["主线1", "主线2"],
  "decisionGoal": "希望推动的决定",
  "pageBriefs": [
    {
      "pageNumber": 1,
      "purpose": "本页目的",
      "questionToAnswer": "本页回答的问题",
      "keyTakeaway": "本页结论",
      "transitionFromPrev": "与上一页衔接",
      "transitionToNext": "为下一页做铺垫",
      "mustIncludeEvidence": ["证据1", "证据2"]
    }
  ]
}
\`\`\``;
}

function buildSlidesPrompt(
  data: AggregatedShareReportData,
  narrative: PPTNarrative,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): string {
  const dataSummary = summarizeData(data);

  return `你是一位资深的用户研究专家、咨询顾问和企业级PPT设计专家。请基于以下访谈数据、痛点/方案骨架以及既定汇报逻辑，生成每一页的具体内容。

## 输入数据
\`\`\`json
${JSON.stringify(dataSummary, null, 2)}
\`\`\`

## 痛点与方案骨架
\`\`\`json
${JSON.stringify({ painPointRanking, solutionMapping }, null, 2)}
\`\`\`

## 已确认的汇报逻辑
\`\`\`json
${JSON.stringify(narrative, null, 2)}
\`\`\`

## 风格约束
- 数据科技咨询风（Data-driven AI Consulting Style）
- 像 AI 数据平台界面 + 咨询公司战略汇报
- 科技感克制、数据驱动、结构清晰、模块化、UI化设计
- 一页只表达一个核心结论
- 宁可分页，也不要堆字

## 你的任务
只输出 slideContents，每页都要严格遵守对应 pageBrief 的 purpose / questionToAnswer / keyTakeaway / contentBudget。

## 页面级要求
1. headline 必须是结论性标题
2. keyMessage 必须与 pageBrief.keyTakeaway 对齐
3. mainPoints / supportingData / quoteEvidence / speakerNotes 必须控制在 contentBudget 内
4. quoteEvidence 必须来自输入中的原话或证据
5. speakerNotes 需要有“承接上一页、引到下一页”的讲稿感
6. visual 和 pageDesign 必须服务叙事，不只是装饰
7. imageAsset.prompt 要体现深色数据科技咨询风，优先 ui-mockup / diagram 语言

## 输出格式
\`\`\`json
{
  "themeSuggestion": {
    "paletteName": "tech-dark-consulting",
    "reason": "深色数据科技咨询风更适合当前汇报"
  },
  "slideContents": [
    {
      "slideNumber": 1,
      "mainPoints": ["要点1", "要点2"],
      "supportingData": ["支撑数据"],
      "quoteEvidence": ["原话"],
      "speakerNotes": "演讲者备注",
      "pageDesign": {
        "layout": "cover-hero",
        "sectionLabel": "封面",
        "headline": "页面标题",
        "subheadline": "页面副标题",
        "keyMessage": "本页一句话结论",
        "narrativeRole": "opening",
        "purpose": "本页目的",
        "questionToAnswer": "本页回答的问题",
        "transitionFromPrev": "与上一页衔接",
        "transitionToNext": "为下一页铺垫",
        "themeVariant": "executive",
        "imageAsset": {
          "prompt": "深色数据科技咨询风界面视觉",
          "alt": "页面视觉描述",
          "style": "ui-mockup",
          "aspectRatio": "16:9",
          "placement": "background"
        },
        "overflowPolicy": {
          "splitBy": "mainPoints",
          "maxMainPointsPerPage": 3,
          "maxSupportingItemsPerPage": 2,
          "maxQuotesPerPage": 1,
          "maxSpeakerNotesCharsPerPage": 90
        }
      },
      "visual": {
        "primaryType": "logo-placeholder",
        "description": "图表建议"
      }
    }
  ]
}
\`\`\`

输出纯JSON，不要有其他文字。`;
}

function parseJsonResponse<T>(text: string, requiredKeys: string[]): T {
  const codeBlockRegex = new RegExp('```json\\n([\\s\\S]*?)\\n```');
  let jsonMatch = text.match(codeBlockRegex);

  if (!jsonMatch) {
    const jsonWithKeysRegex = new RegExp(`\\{[\\s\\S]*${requiredKeys.map((key) => `"${key}"`).join('[\\s\\S]*')}[\\s\\S]*\\}`);
    jsonMatch = text.match(jsonWithKeysRegex);
  }

  if (!jsonMatch) {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonMatch = [text.substring(startIndex, endIndex + 1)];
    }
  }

  if (!jsonMatch) {
    throw new Error('LLM输出格式错误：未找到有效JSON');
  }

  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T;
  } catch {
    throw new Error('LLM输出JSON解析失败');
  }
}

function mergeNarrative(base: PPTNarrative, llmNarrative: LLMNarrativeOutput): PPTNarrative {
  const mergedBriefs = base.pageBriefs.map((brief, index) => {
    const llmBrief = llmNarrative.pageBriefs?.find((item) => item.pageNumber === brief.pageNumber);
    return {
      ...brief,
      purpose: llmBrief?.purpose || brief.purpose,
      questionToAnswer: llmBrief?.questionToAnswer || brief.questionToAnswer,
      keyTakeaway: llmBrief?.keyTakeaway || brief.keyTakeaway,
      transitionFromPrev: llmBrief?.transitionFromPrev || brief.transitionFromPrev,
      transitionToNext: llmBrief?.transitionToNext || brief.transitionToNext,
      mustIncludeEvidence: llmBrief?.mustIncludeEvidence?.length ? llmBrief.mustIncludeEvidence : brief.mustIncludeEvidence,
    };
  });

  return {
    ...base,
    coreThesis: llmNarrative.coreThesis || base.coreThesis,
    executiveSummary: llmNarrative.executiveSummary || base.executiveSummary,
    audience: llmNarrative.audience || base.audience,
    storyline: llmNarrative.storyline?.length ? llmNarrative.storyline : base.storyline,
    decisionGoal: llmNarrative.decisionGoal || base.decisionGoal,
    pageBriefs: mergedBriefs,
  };
}

// ============================================
// 结果构建
// ============================================

function buildPainPointRanking(analysis: LLMPainPointAnalysis): PainPointRanking {
  return {
    top1: {
      rank: 1,
      description: analysis.top1.description,
      quoteEvidence: analysis.top1.quoteEvidence,
      impact: analysis.top1.impact,
      rootCause: analysis.top1.rootCause,
      relatedStage: analysis.top1.relatedStage,
      occurrenceCount: analysis.top1.impact.frequency === 'high' ? 5 : 3,
    },
    top2And3: analysis.top2And3.map((pp, i) => ({
      rank: i + 2,
      description: pp.description,
      quoteEvidence: pp.quoteEvidence,
      impactBrief: pp.impactBrief,
      severity: pp.severity,
      frequency: pp.frequency,
    })),
    others: [],
  };
}

function buildSolutionMapping(analysis: LLMSolutionAnalysis): SolutionMapping {
  return {
    top1: {
      targetPainPoint: analysis.top1.targetPainPoint,
      targetPainPointRank: 1,
      name: analysis.top1.name,
      description: analysis.top1.description,
      howItWorks: analysis.top1.howItWorks,
      implementationSteps: analysis.top1.implementationSteps,
      keyFeatures: analysis.top1.keyFeatures,
      expectedValue: analysis.top1.expectedValue,
      priority: 'P0',
    },
    top2And3: analysis.top2And3.map((s, i) => ({
      targetPainPoint: s.targetPainPoint,
      targetPainPointRank: i + 2,
      name: s.name,
      description: s.description,
      keyFeatures: s.keyFeatures,
      priority: (i === 0 ? 'P1' : 'P2') as 'P1' | 'P2',
    })),
  };
}

function buildSlides(
  data: AggregatedShareReportData,
  llmOutput: LLMSlideOutput,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  narrative: PPTNarrative
): PPTSlide[] {
  const llmSlides = llmOutput.slideContents || [];
  const slides = [
    generateCoverSlideLLM(data, llmSlides[0]),
    generateBackgroundSlideLLM(data, llmSlides[1]),
    generatePersonaSlideLLM(data, llmSlides[2]),
    generateJourneySlideLLM(data, llmSlides[3]),
    generateTop1PainPointSlideLLM(painPointRanking.top1, llmSlides[4]),
    generateTop23PainPointsSlideLLM(painPointRanking, llmSlides[5]),
    generateRootCauseSlideLLM(painPointRanking, llmSlides[6]),
    generateRequirementSlideLLM(data, llmSlides[7]),
    generateTop1SolutionSlideLLM(solutionMapping.top1, llmSlides[8]),
    generateTop23SolutionsSlideLLM(solutionMapping, llmSlides[9]),
    generateValueSlideLLM(solutionMapping, llmSlides[10]),
    generateActionSlideLLM(llmSlides[11]),
    generateRiskSlideLLM(data, llmSlides[12]),
    generateClosingSlideLLM(data, llmSlides[13]),
  ];

  return slides.map((slide, index) => {
    const brief = narrative.pageBriefs[index];
    if (!brief || !slide.presentation) return slide;

    return {
      ...slide,
      presentation: {
        ...slide.presentation,
        purpose: slide.presentation.purpose || brief.purpose,
        questionToAnswer: slide.presentation.questionToAnswer || brief.questionToAnswer,
        transitionFromPrev: slide.presentation.transitionFromPrev || brief.transitionFromPrev,
        transitionToNext: slide.presentation.transitionToNext || brief.transitionToNext,
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

function buildPresentation(
  llmContent: LLMPageContent | undefined,
  defaults: {
    layout: SlideLayout;
    sectionLabel: string;
    headline: string;
    subheadline?: string;
    keyMessage: string;
    narrativeRole: SlideNarrativeRole;
    imageAsset: SlideImageAsset;
    overflowPolicy?: SlideOverflowPolicy;
  }
): SlidePresentation {
  return {
    layout: llmContent?.pageDesign?.layout || defaults.layout,
    sectionLabel: llmContent?.pageDesign?.sectionLabel || defaults.sectionLabel,
    headline: llmContent?.pageDesign?.headline || defaults.headline,
    subheadline: llmContent?.pageDesign?.subheadline || defaults.subheadline,
    keyMessage: llmContent?.pageDesign?.keyMessage || defaults.keyMessage,
    narrativeRole: llmContent?.pageDesign?.narrativeRole || defaults.narrativeRole,
    themeVariant: llmContent?.pageDesign?.themeVariant || 'consulting',
    imageAsset: llmContent?.pageDesign?.imageAsset || defaults.imageAsset,
    overflowPolicy: llmContent?.pageDesign?.overflowPolicy || defaults.overflowPolicy,
    visualSuggestion: llmContent?.visual,
  };
}

// ============================================
// 幻灯片生成函数（LLM版本）
// ============================================

function generateCoverSlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 1,
    slideTitle: `${data.customer.name} - ${data.interview.title}`,
    slideType: 'cover',
    content: {
      mainPoints: llmContent?.mainPoints || [
        `访谈主题：${data.interview.title}`,
        `客户：${data.customer.name}`,
        `行业：${data.customer.industry || '未指定'}`,
        `访谈日期：${formatDate(data.interview.interviewDate)}`,
      ],
    },
    visual: {
      type: 'scene-illustration',
      config: {
        description: `${data.customer.name} 访谈分析报告`,
      },
    },
    presentation: buildPresentation(llmContent, {
      layout: 'cover-hero',
      sectionLabel: '封面',
      headline: `${data.customer.name} 客户访谈洞察汇报`,
      subheadline: data.interview.title,
      keyMessage: '本次访谈已沉淀出清晰的痛点优先级、方案方向与下一步行动建议。',
      narrativeRole: 'opening',
      imageAsset: {
        prompt: `${data.customer.name} 客户访谈洞察汇报封面，商务汇报风格，浅色背景，数据卡片与会议场景结合`,
        alt: `${data.customer.name} 洞察汇报封面图`,
        style: 'illustration',
        aspectRatio: '16:9',
        placement: 'background',
        emphasisKeywords: [data.customer.name, '客户洞察', '解决方案'],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || `各位好，今天我将汇报针对${data.customer.name}的访谈分析结果。`,
  };
}

function generateBackgroundSlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 2,
    slideTitle: '项目背景',
    slideType: 'background',
    content: {
      mainPoints: llmContent?.mainPoints || [
        `访谈目标：${data.interview.objective || '了解用户需求和痛点'}`,
        `业务场景：${data.insightReport?.businessScenario?.summary || data.customer.background || '待分析'}`,
      ],
      supportingData: llmContent?.supportingData,
    },
    visual: {
      type: 'scene-illustration',
      config: {
        description: data.insightReport?.businessScenario?.summary || data.customer.background || '',
      },
    },
    presentation: buildPresentation(llmContent, {
      layout: 'context-split',
      sectionLabel: '项目背景',
      headline: '我们为什么做这次访谈',
      subheadline: '从业务场景、访谈目标与关键发现理解本次研究背景',
      keyMessage: data.insightReport?.businessScenario?.summary || data.customer.background || '本页用于建立业务背景和问题上下文。',
      narrativeRole: 'context',
      imageAsset: {
        prompt: `${data.customer.name} 所在业务场景示意图，浅色商务插画，体现访谈场景、客户流程、关键业务触点`,
        alt: '项目背景场景图',
        style: 'illustration',
        aspectRatio: '16:9',
        placement: 'hero',
        emphasisKeywords: [data.customer.name, data.customer.industry || '行业背景'],
      },
      overflowPolicy: {
        splitBy: 'supportingData',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 3,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 100,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '首先介绍本次访谈的背景和目标。',
  };
}

function generatePersonaSlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  const persona = data.persona;

  return {
    slideNumber: 3,
    slideTitle: '目标用户画像',
    slideType: 'persona',
    content: {
      mainPoints: llmContent?.mainPoints || (persona ? [
        `角色：${persona.role}`,
        `核心目标：${persona.goals.slice(0, 3).join('、')}`,
        `主要痛点：${persona.painPoints.slice(0, 3).join('、')}`,
      ] : ['用户画像待生成']),
      quoteEvidence: llmContent?.quoteEvidence || persona?.quotes?.slice(0, 2) || data.interviewQuotes.slice(0, 2),
    },
    visual: {
      type: 'character-card',
      config: {
        name: persona?.name || '目标用户',
        role: persona?.role || '用户角色',
        department: '',
        keyGoals: persona?.goals?.slice(0, 3) || [],
        keyPainPoints: persona?.painPoints?.slice(0, 3) || [],
        quoteSnippet: llmContent?.quoteEvidence?.[0] || data.interviewQuotes[0] || '',
      },
    },
    presentation: buildPresentation(llmContent, {
      layout: 'persona-spotlight',
      sectionLabel: '用户画像',
      headline: '目标用户是谁',
      subheadline: '从角色、目标、行为与痛点理解核心用户',
      keyMessage: persona
        ? `${persona.role}最关注${persona.goals.slice(0, 1).join('')}，主要痛点集中在${persona.painPoints.slice(0, 1).join('')}。`
        : '用户画像数据待进一步补充。',
      narrativeRole: 'persona',
      imageAsset: {
        prompt: `${persona?.role || '目标用户'}人物画像海报，B端商务插画风，浅色背景，突出目标和痛点`,
        alt: '目标用户画像插画',
        style: 'illustration',
        aspectRatio: '4:3',
        placement: 'hero',
        emphasisKeywords: [persona?.role || '用户角色', ...(persona?.painPoints?.slice(0, 2) || [])],
      },
      overflowPolicy: {
        splitBy: 'quoteEvidence',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 2,
        maxSpeakerNotesCharsPerPage: 100,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '让我们了解目标用户的核心诉求。',
  };
}

function generateJourneySlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  const stages = data.journeyMap?.stages || [];
  const highlightStage = findMostPainfulStage(data.journeyMap);

  return {
    slideNumber: 4,
    slideTitle: '用户工作流程',
    slideType: 'journey',
    content: {
      mainPoints: llmContent?.mainPoints || stages.map((s) => `${s.name}：${s.description || ''}`) || ['用户旅程待生成'],
      supportingData: llmContent?.supportingData,
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
    presentation: buildPresentation(llmContent, {
      layout: 'journey-flow',
      sectionLabel: '用户流程',
      headline: '用户当前是如何完成工作的',
      subheadline: '梳理关键阶段、动作与阻塞点，定位最值得优化的流程环节',
      keyMessage: highlightStage ? `当前流程中最值得关注的阶段是${highlightStage}。` : '当前流程用于识别高痛点与高机会环节。',
      narrativeRole: 'context',
      imageAsset: {
        prompt: `${data.customer.name} 用户工作流程示意图，现代流程插画风，突出关键阶段与阻塞节点`,
        alt: '用户工作流程图',
        style: 'diagram',
        aspectRatio: '16:9',
        placement: 'hero',
        emphasisKeywords: [highlightStage || '关键阶段', '流程', '阻塞'],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 4,
        maxSupportingItemsPerPage: 3,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 100,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '接下来看用户的工作流程。',
  };
}

function generateTop1PainPointSlideLLM(top1: PainPointDetail, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 5,
    slideTitle: `TOP1痛点：${top1.description}`,
    slideType: 'painpoint',
    content: {
      mainPoints: llmContent?.mainPoints || [
        `严重程度：${getSeverityLabel(top1.impact.severity)}`,
        `出现频率：${getFrequencyLabel(top1.impact.frequency)}`,
        `影响范围：${top1.impact.scope}`,
        `影响指标：${top1.impact.metrics.join('、')}`,
      ],
      quoteEvidence: llmContent?.quoteEvidence || [top1.quoteEvidence],
      supportingData: llmContent?.supportingData || [
        `表层原因：${top1.rootCause.surface.join('、')}`,
        `深层原因：${top1.rootCause.deep.join('、')}`,
        `已尝试方案：${top1.rootCause.attemptedSolutions.join('、') || '无'}`,
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
    presentation: buildPresentation(llmContent, {
      layout: 'evidence-focus',
      sectionLabel: '核心痛点',
      headline: '最优先解决的痛点是什么',
      subheadline: '用原话、影响与根因把最重要的问题讲透',
      keyMessage: `${top1.description}是当前最优先处理的问题，影响范围为${top1.impact.scope}。`,
      narrativeRole: 'evidence',
      imageAsset: {
        prompt: `企业客户痛点分析海报，突出用户受阻场景、影响指标和问题证据，浅色商务插画`,
        alt: 'TOP1痛点视觉图',
        style: 'illustration',
        aspectRatio: '4:3',
        placement: 'sidebar',
        emphasisKeywords: [top1.description, ...top1.impact.metrics.slice(0, 2)],
      },
      overflowPolicy: {
        splitBy: 'supportingData',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || `这是我们识别的首要痛点：${top1.description}。`,
  };
}

function generateTop23PainPointsSlideLLM(ranking: PainPointRanking, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 6,
    slideTitle: 'TOP2-3痛点汇总',
    slideType: 'painpoint',
    content: {
      mainPoints: llmContent?.mainPoints || ranking.top2And3.map((pp) => `TOP${pp.rank}：${pp.description}`),
      quoteEvidence: llmContent?.quoteEvidence || ranking.top2And3.map((pp) => pp.quoteEvidence),
      supportingData: ranking.top2And3.map((pp) => `影响：${pp.impactBrief}`),
    },
    visual: {
      type: 'priority-matrix',
      config: {
        items: ranking.top2And3.map((pp) => ({
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
    presentation: buildPresentation(llmContent, {
      layout: 'matrix-compare',
      sectionLabel: '痛点排序',
      headline: '哪些问题也值得优先关注',
      subheadline: '通过影响程度与出现频率比较次级痛点',
      keyMessage: '除首要痛点外，次级痛点同样会影响用户效率和方案接受度。',
      narrativeRole: 'evidence',
      imageAsset: {
        prompt: '痛点优先级矩阵信息图，浅色咨询汇报风格，突出影响程度与出现频率',
        alt: 'TOP2-TOP3痛点优先级矩阵图',
        style: 'diagram',
        aspectRatio: '4:3',
        placement: 'hero',
        emphasisKeywords: ranking.top2And3.map((item) => item.description).slice(0, 2),
      },
      overflowPolicy: {
        splitBy: 'quoteEvidence',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 3,
        maxQuotesPerPage: 2,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '除了首要痛点，我们还识别了其他关键痛点。',
  };
}

function generateRootCauseSlideLLM(ranking: PainPointRanking, llmContent?: LLMPageContent): PPTSlide {
  const top1WithRootCause = ranking.top1;

  return {
    slideNumber: 7,
    slideTitle: '痛点根因分析',
    slideType: 'analysis',
    content: {
      mainPoints: llmContent?.mainPoints || [
        `${top1WithRootCause.description}的根因：`,
        `  表层：${top1WithRootCause.rootCause?.surface?.join('、') || '待分析'}`,
        `  深层：${top1WithRootCause.rootCause?.deep?.join('、') || '待分析'}`,
        `  已尝试：${top1WithRootCause.rootCause?.attemptedSolutions?.join('、') || '无'}`,
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
    presentation: buildPresentation(llmContent, {
      layout: 'analysis-board',
      sectionLabel: '根因分析',
      headline: '问题为什么会发生',
      subheadline: '区分表层诱因与深层成因，避免只治标不治本',
      keyMessage: `${top1WithRootCause.description}背后的深层原因需要通过流程、机制或产品能力共同解决。`,
      narrativeRole: 'analysis',
      imageAsset: {
        prompt: '问题根因分析图，鱼骨图与因果链结合，浅色商务图解风格',
        alt: '痛点根因分析图',
        style: 'diagram',
        aspectRatio: '4:3',
        placement: 'hero',
        emphasisKeywords: top1WithRootCause.rootCause?.deep?.slice(0, 2) || ['深层原因'],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 4,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 100,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '深入分析痛点的根本原因。',
  };
}

function generateRequirementSlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  const requirements = data.requirements.slice(0, 6);

  return {
    slideNumber: 8,
    slideTitle: '需求提炼',
    slideType: 'requirement',
    content: {
      mainPoints: llmContent?.mainPoints || requirements.map((r) => `[${r.priority}] ${r.title}`) || ['需求待识别'],
      quoteEvidence: llmContent?.quoteEvidence,
    },
    visual: {
      type: 'tree-diagram',
      config: {
        root: '用户需求',
        branches: groupRequirementsByCategory(requirements),
      },
    },
    presentation: buildPresentation(llmContent, {
      layout: 'requirement-tree',
      sectionLabel: '需求提炼',
      headline: '我们应该优先满足哪些需求',
      subheadline: '将痛点转化为需求清单，并建立优先级与分类',
      keyMessage: requirements.length > 0 ? `当前优先级最高的需求集中在${requirements[0].category || '核心能力'}。` : '当前页用于承接痛点与方案之间的需求桥梁。',
      narrativeRole: 'requirement',
      imageAsset: {
        prompt: '用户需求树状图，浅色咨询图解风格，突出优先级和分类关系',
        alt: '需求提炼树状图',
        style: 'diagram',
        aspectRatio: '4:3',
        placement: 'hero',
        emphasisKeywords: requirements.map((item) => item.title).slice(0, 2),
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 4,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '基于痛点分析，我们提炼出以下需求。',
  };
}

function generateTop1SolutionSlideLLM(top1: SolutionDetail, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 9,
    slideTitle: `TOP1方案：${top1.name}`,
    slideType: 'solution',
    content: {
      mainPoints: llmContent?.mainPoints || [
        `针对痛点：${top1.targetPainPoint}`,
        `解决原理：${top1.howItWorks}`,
        `实施步骤：`,
        ...top1.implementationSteps.map((s) => `  ${s.step}. ${s.action}：${s.details}`),
      ],
      supportingData: llmContent?.supportingData || [
        `效率提升：${top1.expectedValue.efficiency}`,
        `成本降低：${top1.expectedValue.cost}`,
        `业务收益：${top1.expectedValue.business.join('、')}`,
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
    presentation: buildPresentation(llmContent, {
      layout: 'solution-spotlight',
      sectionLabel: '核心方案',
      headline: '最值得优先推进的方案',
      subheadline: '围绕首要痛点，明确解决原理、步骤与价值',
      keyMessage: `${top1.name}能够直接针对“${top1.targetPainPoint}”建立最强的改善路径。`,
      narrativeRole: 'solution',
      imageAsset: {
        prompt: `${top1.name} 方案概念图，B端产品解决方案示意图，突出实施路径与价值收益，浅色商务插画`,
        alt: 'TOP1解决方案概念图',
        style: 'ui-mockup',
        aspectRatio: '16:9',
        placement: 'hero',
        emphasisKeywords: [top1.name, ...top1.keyFeatures.slice(0, 2)],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 4,
        maxSupportingItemsPerPage: 3,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 100,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || `针对首要痛点，我们推荐方案：${top1.name}。`,
  };
}

function generateTop23SolutionsSlideLLM(mapping: SolutionMapping, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 10,
    slideTitle: 'TOP2-3方案汇总',
    slideType: 'solution',
    content: {
      mainPoints: llmContent?.mainPoints || mapping.top2And3.map((s) => `[${s.priority}] ${s.name}：${s.description}`),
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
    presentation: buildPresentation(llmContent, {
      layout: 'mapping-board',
      sectionLabel: '方案映射',
      headline: '方案如何对应不同痛点',
      subheadline: '确保每个方案都对应明确问题，而不是泛泛改进',
      keyMessage: '方案与痛点一一对应，便于客户理解优先级与资源投放方向。',
      narrativeRole: 'solution',
      imageAsset: {
        prompt: '方案与痛点映射关系图，浅色咨询汇报图解风格，体现一一对应逻辑',
        alt: '方案-痛点映射图',
        style: 'diagram',
        aspectRatio: '16:9',
        placement: 'hero',
        emphasisKeywords: mapping.top2And3.map((item) => item.name).slice(0, 2),
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '所有方案与痛点形成一一对应。',
  };
}

function generateValueSlideLLM(mapping: SolutionMapping, llmContent?: LLMPageContent): PPTSlide {
  const top1Solution = mapping.top1;

  return {
    slideNumber: 11,
    slideTitle: '预期价值评估',
    slideType: 'value',
    content: {
      mainPoints: llmContent?.mainPoints || [
        'TOP1方案价值：',
        `  效率提升：${top1Solution.expectedValue.efficiency}`,
        `  成本降低：${top1Solution.expectedValue.cost}`,
        `  业务收益：${top1Solution.expectedValue.business.join('、')}`,
      ],
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
    presentation: buildPresentation(llmContent, {
      layout: 'value-dashboard',
      sectionLabel: '价值评估',
      headline: '方案实施后将带来什么价值',
      subheadline: '从效率、成本和业务收益三方面建立价值闭环',
      keyMessage: `${top1Solution.name}的核心价值体现在效率提升、成本降低和长期业务收益。`,
      narrativeRole: 'value',
      imageAsset: {
        prompt: '业务价值仪表盘，ROI与收益对比图，浅色商务图表风格',
        alt: '方案价值评估图',
        style: 'diagram',
        aspectRatio: '16:9',
        placement: 'hero',
        emphasisKeywords: [top1Solution.name, 'ROI', '价值提升'],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 3,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '方案实施后，预计带来以下价值提升。',
  };
}

function generateActionSlideLLM(llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 12,
    slideTitle: '实施路径建议',
    slideType: 'action',
    content: {
      mainPoints: llmContent?.mainPoints || [
        '短期（1-2周）：试点验证、用户反馈收集',
        '中期（1个月）：功能迭代、流程优化',
        '长期（持续）：持续优化、规模化推广',
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
    presentation: buildPresentation(llmContent, {
      layout: 'timeline-roadmap',
      sectionLabel: '实施路径',
      headline: '方案应该如何落地推进',
      subheadline: '从试点、迭代到规模推广，分阶段推进实施',
      keyMessage: '建议以短期试点启动，通过中期优化和长期推广逐步放大价值。',
      narrativeRole: 'action',
      imageAsset: {
        prompt: '实施路线图，时间轴式商务信息图，突出短中长期阶段动作',
        alt: '实施路径时间轴图',
        style: 'diagram',
        aspectRatio: '16:9',
        placement: 'hero',
        emphasisKeywords: ['短期试点', '中期优化', '长期推广'],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 3,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '建议按以下路径逐步推进。',
  };
}

function generateRiskSlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  const risks = data.aiInsights.risks.slice(0, 4);

  return {
    slideNumber: 13,
    slideTitle: '风险提示与应对',
    slideType: 'risk',
    content: {
      mainPoints: llmContent?.mainPoints || risks.map((r) => `• ${r.content}`) || ['暂无特别风险提示'],
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
    presentation: buildPresentation(llmContent, {
      layout: 'risk-board',
      sectionLabel: '风险提示',
      headline: '落地过程中需要警惕什么',
      subheadline: '识别可能的执行、协同与业务风险，并提前设计应对方案',
      keyMessage: risks.length > 0 ? '推进方案时需同步关注潜在执行风险与业务不确定性。' : '当前未发现明显高风险，但仍需持续监控。 ',
      narrativeRole: 'risk',
      imageAsset: {
        prompt: '风险矩阵图与风险提示板，浅色商务图解风格，体现概率和影响程度',
        alt: '风险提示矩阵图',
        style: 'diagram',
        aspectRatio: '4:3',
        placement: 'hero',
        emphasisKeywords: risks.map((risk) => risk.content).slice(0, 2),
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 4,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '实施过程中需要注意以下风险。',
  };
}

function generateClosingSlideLLM(data: AggregatedShareReportData, llmContent?: LLMPageContent): PPTSlide {
  return {
    slideNumber: 14,
    slideTitle: '总结与下一步',
    slideType: 'closing',
    content: {
      mainPoints: llmContent?.mainPoints || [
        '核心发现：',
        '  • 首要痛点已识别，方案已设计',
        '  • 用户需求明确，优先级已排序',
        '下一步行动：',
        '  • 启动TOP1痛点解决方案试点',
      ],
    },
    visual: {
      type: 'infographic',
      config: {
        summary: '访谈分析完成',
        nextSteps: ['启动试点', '收集反馈', '迭代优化'],
      },
    },
    presentation: buildPresentation(llmContent, {
      layout: 'closing-summary',
      sectionLabel: '总结',
      headline: '结论与下一步',
      subheadline: '用一页收束核心发现、优先级和启动动作',
      keyMessage: '建议从优先级最高的痛点和方案开始试点，快速验证价值。',
      narrativeRole: 'closing',
      imageAsset: {
        prompt: `${data.customer.name} 汇报结束页信息图，浅色商务总结风格，体现成果与下一步行动`,
        alt: '总结与下一步信息图',
        style: 'illustration',
        aspectRatio: '16:9',
        placement: 'background',
        emphasisKeywords: [data.customer.name, '下一步行动', '试点推进'],
      },
      overflowPolicy: {
        splitBy: 'mainPoints',
        maxMainPointsPerPage: 4,
        maxSupportingItemsPerPage: 2,
        maxQuotesPerPage: 1,
        maxSpeakerNotesCharsPerPage: 90,
      },
    }),
    speakerNotes: llmContent?.speakerNotes || '以上是本次访谈分析的汇报。',
  };
}

// ============================================
// 辅助函数
// ============================================

function buildMetadata(data: AggregatedShareReportData, narrative: PPTNarrative): PPTMetadata {
  return {
    projectTitle: data.interview.title,
    customerName: data.customer.name,
    interviewDate: formatDate(data.interview.interviewDate),
    totalSlides: 14,
    createdAt: new Date().toISOString(),
    version: '2.0-llm',
    protocolVersion: 'presentation-v2',
    paletteName: 'tech-dark-consulting',
    coreThesis: narrative.coreThesis,
    audience: narrative.audience,
    decisionGoal: narrative.decisionGoal,
  };
}

function formatDate(date: Date | null | string): string {
  if (!date) return '未设定';
  try {
    return new Date(date).toLocaleDateString('zh-CN');
  } catch {
    return '未设定';
  }
}

function findMostPainfulStage(journeyMap: AggregatedShareReportData['journeyMap']): string | undefined {
  if (!journeyMap?.painPoints?.length) return undefined;
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

function groupRequirementsByCategory(requirements: Array<{ title: string; category?: string | null }>): Array<{ category: string; items: string[] }> {
  const groups = new Map<string, string[]>();
  requirements.forEach((r) => {
    const cat = r.category || '其他';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(r.title);
  });
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}

export default generatePPTOutlineWithLLM;
