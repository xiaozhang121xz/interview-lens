/**
 * PPT叙事生成服务
 *
 * 将聚合后的访谈素材提炼成一套可汇报的叙事骨架，供模板生成器和LLM生成器复用。
 *
 * @module lib/services/ppt-narrative-generator
 */

import type { AggregatedShareReportData } from './share-report-aggregator';
import type {
  PPTNarrative,
  PPTPageBrief,
  PPTOutlineMode,
  SlideContentBudget,
  SlideLayout,
  SlideType,
  VisualType,
  PainPointRanking,
  SolutionMapping,
} from '@/lib/types/ppt-outline';

interface PageBlueprint {
  pageNumber: number;
  slideType: SlideType;
  layout: SlideLayout;
  title: string;
  purpose: string;
  questionToAnswer: string;
  keyTakeaway: string;
  recommendedVisual: VisualType;
  evidence: string[];
}

const AUDIENCE_DEFAULT = '客户业务负责人、产品负责人和项目决策者';

export function getDefaultContentBudget(layout: SlideLayout): SlideContentBudget {
  switch (layout) {
    case 'cover-hero':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 90 };
    case 'context-split':
      return { layout, maxMainPoints: 2, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'persona-spotlight':
      return { layout, maxMainPoints: 3, maxSupportingItems: 1, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'journey-flow':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 90 };
    case 'evidence-focus':
      return { layout, maxMainPoints: 2, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'matrix-compare':
      return { layout, maxMainPoints: 2, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'analysis-board':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'requirement-tree':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'solution-spotlight':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'mapping-board':
      return { layout, maxMainPoints: 2, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'value-dashboard':
      return { layout, maxMainPoints: 2, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'timeline-roadmap':
      return { layout, maxMainPoints: 2, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'risk-board':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    case 'closing-summary':
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
    default:
      return { layout, maxMainPoints: 3, maxSupportingItems: 2, maxQuotes: 1, maxSpeakerNotesChars: 80 };
  }
}

export function buildBaseNarrative(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode = 'classic'
): PPTNarrative {
  const coreThesis = buildCoreThesis(data, painPointRanking, solutionMapping, outlineMode);
  const storyline = buildStoryline(data, painPointRanking, solutionMapping, outlineMode);
  const decisionGoal = buildDecisionGoal(solutionMapping);
  const executiveSummary = outlineMode === 'customer_next_meeting'
    ? `${coreThesis}。本次沟通重点是确认优先问题、MVP范围与试点推进前提。`
    : `${coreThesis}。建议围绕“${solutionMapping.top1.name}”优先试点，快速验证价值并形成落地节奏。`;

  const blueprints = buildPageBlueprints(data, painPointRanking, solutionMapping, outlineMode);
  const pageBriefs = blueprints.map((blueprint, index) => toPageBrief(blueprint, blueprints[index - 1], blueprints[index + 1]));

  return {
    coreThesis,
    executiveSummary,
    audience: AUDIENCE_DEFAULT,
    storyline,
    decisionGoal,
    pageBriefs,
  };
}

function buildCoreThesis(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode
): string {
  const customerName = data.customer.name;
  const topPainPoint = painPointRanking.top1.description;
  const topSolution = solutionMapping.top1.name;
  if (outlineMode === 'customer_next_meeting') {
    return `${customerName} 下一次沟通最需要聚焦的是“${topPainPoint}”这一优先问题，并围绕“${topSolution}”确认可落地的MVP范围与试点方式`;
  }
  return `${customerName} 当前最值得优先处理的议题是“${topPainPoint}”，建议以“${topSolution}”作为试点抓手，先打通关键场景，再决定后续扩展节奏`;
}

function buildStoryline(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode
): string[] {
  if (outlineMode === 'customer_next_meeting') {
    return [
      `先用一页说明本次与${data.customer.name}沟通要确认的核心事项`,
      `再快速给出“${painPointRanking.top1.description}”的优先判断和关键证据`,
      '随后回到核心用户、关键场景与高摩擦节点，确保双方对问题定义一致',
      '然后把问题翻译成需求和MVP边界，避免方案讨论发散',
      `最后围绕“${solutionMapping.top1.name}”说明推进建议、风险前提与下一步配合动作`,
    ];
  }

  return [
    `先用执行摘要快速说明${data.customer.name}当前最重要的判断`,
    '再界定研究范围、样本和核心用户场景，说明结论从哪里来',
    `接着把“${painPointRanking.top1.description}”作为首要问题展开证据与优先级判断`,
    '然后向下拆到根因与需求，把问题翻译成可执行动作',
    `再把“${solutionMapping.top1.name}”放到整体方案组合中说明取舍与映射`,
    '最后回到价值、路径、风险和决策建议，推动客户进入试点判断',
  ];
}

function buildDecisionGoal(solutionMapping: SolutionMapping): string {
  return `推动客户优先启动“${solutionMapping.top1.name}”试点，并确认后续资源投入与实施节奏`;
}

function buildPageBlueprints(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping,
  outlineMode: PPTOutlineMode
): PageBlueprint[] {
  if (outlineMode === 'customer_next_meeting') {
    return buildCustomerMeetingPageBlueprints(data, painPointRanking, solutionMapping);
  }

  return buildClassicPageBlueprints(data, painPointRanking, solutionMapping);
}

function buildClassicPageBlueprints(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): PageBlueprint[] {
  const personaRole = data.persona?.role || '目标用户';
  const highlightStage = data.journeyMap?.stages?.[0]?.name || painPointRanking.top1.relatedStage || '关键流程阶段';
  const top2And3 = painPointRanking.top2And3.map((item) => item.description);
  const requirementTitles = data.requirements.slice(0, 3).map((item) => item.title);
  const riskEvidence = data.aiInsights.risks.slice(0, 2).map((item) => item.content);
  const researchCoverage = data.progress.totalQuestions
    ? `当前样本覆盖 ${data.progress.totalQuestions} 个问题维度`
    : '样本维度待补充';

  return [
    {
      pageNumber: 1,
      slideType: 'cover',
      layout: 'cover-hero',
      title: '执行摘要',
      purpose: '用一页先交付核心判断和建议方向。',
      questionToAnswer: '如果只看一页，客户应该带走什么判断？',
      keyTakeaway: buildCoreThesis(data, painPointRanking, solutionMapping, 'classic'),
      recommendedVisual: 'logo-placeholder',
      evidence: [data.interview.title, data.customer.name, solutionMapping.top1.name],
    },
    {
      pageNumber: 2,
      slideType: 'background',
      layout: 'context-split',
      title: '研究范围与样本',
      purpose: '说明此次结论适用的业务范围和证据基础。',
      questionToAnswer: '这些判断基于什么范围、什么样本得出？',
      keyTakeaway: data.insightReport?.businessScenario?.summary || data.customer.background || '本次研究聚焦关键业务流程中的效率与体验问题。',
      recommendedVisual: 'scene-illustration',
      evidence: [data.interview.objective || '访谈目标', data.customer.industry || '所属行业', researchCoverage],
    },
    {
      pageNumber: 3,
      slideType: 'persona',
      layout: 'persona-spotlight',
      title: '核心用户与关键场景',
      purpose: '把讨论对象从抽象项目收束到真实用户和场景。',
      questionToAnswer: '这套方案最终要服务谁、发生在哪个场景？',
      keyTakeaway: `${personaRole}是此次洞察的核心对象，其目标与痛点直接影响方案优先级。`,
      recommendedVisual: 'character-card',
      evidence: [personaRole, ...(data.persona?.goals.slice(0, 2) || []), ...(data.persona?.painPoints.slice(0, 2) || [])],
    },
    {
      pageNumber: 4,
      slideType: 'journey',
      layout: 'journey-flow',
      title: '关键发现总览',
      purpose: '在进入细节前，先把高摩擦流程和发现总览讲清楚。',
      questionToAnswer: '目前最值得关注的发现集中在哪些环节？',
      keyTakeaway: `${highlightStage}是当前流程中最值得关注的高阻塞节点。`,
      recommendedVisual: 'flow-chart',
      evidence: (data.journeyMap?.stages || []).slice(0, 4).map((stage) => stage.name),
    },
    {
      pageNumber: 5,
      slideType: 'painpoint',
      layout: 'evidence-focus',
      title: '首要问题证据',
      purpose: '把首要问题从观点变成有证据支持的结论。',
      questionToAnswer: '什么问题最值得优先处理，证据是什么？',
      keyTakeaway: `${painPointRanking.top1.description}是当前影响最大的痛点。`,
      recommendedVisual: 'painpoint-detail',
      evidence: [painPointRanking.top1.quoteEvidence, painPointRanking.top1.impact.scope, ...painPointRanking.top1.impact.metrics.slice(0, 2)],
    },
    {
      pageNumber: 6,
      slideType: 'painpoint',
      layout: 'matrix-compare',
      title: '问题优先级排序',
      purpose: '区分现在要解决的和后续跟进的议题，形成取舍依据。',
      questionToAnswer: '为什么这个问题排第一，其它问题处在什么梯队？',
      keyTakeaway: '首要问题之外，还存在第二梯队议题，但应避免同时推进过多战线。',
      recommendedVisual: 'priority-matrix',
      evidence: top2And3,
    },
    {
      pageNumber: 7,
      slideType: 'analysis',
      layout: 'analysis-board',
      title: '根因拆解',
      purpose: '将首要问题拆为表层原因和系统性原因。',
      questionToAnswer: '首要问题为什么会反复出现？',
      keyTakeaway: '当前问题并非单点失误，而是流程、机制与支撑能力共同作用的结果。',
      recommendedVisual: 'cause-effect',
      evidence: [...painPointRanking.top1.rootCause.surface.slice(0, 2), ...painPointRanking.top1.rootCause.deep.slice(0, 2)],
    },
    {
      pageNumber: 8,
      slideType: 'requirement',
      layout: 'requirement-tree',
      title: '需求归纳',
      purpose: '把根因翻译成可设计、可排序、可执行的需求集合。',
      questionToAnswer: '因此，我们真正要满足哪些需求？',
      keyTakeaway: '只有先定义清楚需求边界，后续方案选择才不会跑偏。',
      recommendedVisual: 'tree-diagram',
      evidence: requirementTitles,
    },
    {
      pageNumber: 9,
      slideType: 'solution',
      layout: 'solution-spotlight',
      title: '建议方案总览',
      purpose: '先说明整体建议方向，再引出最优先的试点方案。',
      questionToAnswer: '基于以上问题与需求，我们建议往哪几个方向推进？',
      keyTakeaway: `${solutionMapping.top1.name}是当前最值得优先验证的方案。`,
      recommendedVisual: 'solution-detail',
      evidence: [solutionMapping.top1.targetPainPoint, ...solutionMapping.top1.keyFeatures.slice(0, 2), solutionMapping.top1.expectedValue.efficiency],
    },
    {
      pageNumber: 10,
      slideType: 'solution',
      layout: 'mapping-board',
      title: '优先方案详解',
      purpose: '解释优先方案如何与问题逐一对应，并说明为何先做它。',
      questionToAnswer: '为什么优先方案比其它动作更适合作为试点？',
      keyTakeaway: '优先方案不是更大，而是更适合作为当前阶段的验证抓手。',
      recommendedVisual: 'mapping-diagram',
      evidence: solutionMapping.top2And3.map((item) => item.name),
    },
    {
      pageNumber: 11,
      slideType: 'value',
      layout: 'value-dashboard',
      title: '价值评估',
      purpose: '把建议方案转换成决策层能理解的收益语言。',
      questionToAnswer: '为什么这件事值得现在投入推进？',
      keyTakeaway: '当前建议方案同时具备效率价值、成本价值和业务协同价值。',
      recommendedVisual: 'roi-chart',
      evidence: [solutionMapping.top1.expectedValue.efficiency, solutionMapping.top1.expectedValue.cost, ...solutionMapping.top1.expectedValue.business.slice(0, 2)],
    },
    {
      pageNumber: 12,
      slideType: 'action',
      layout: 'timeline-roadmap',
      title: '试点路径',
      purpose: '把方案拆成试点、迭代和扩展三个节奏，降低投入门槛。',
      questionToAnswer: '如果现在决定启动，第一步应该怎么做？',
      keyTakeaway: '建议采用先试点、再迭代、后扩展的推进方式，降低一次性投入风险。',
      recommendedVisual: 'timeline',
      evidence: solutionMapping.top1.implementationSteps.slice(0, 3).map((step) => step.action),
    },
    {
      pageNumber: 13,
      slideType: 'risk',
      layout: 'risk-board',
      title: '风险与前提',
      purpose: '提前说明执行中的关键风险与必要前提，提升方案可信度。',
      questionToAnswer: '推进这件事之前，哪些风险和前提需要先说清楚？',
      keyTakeaway: '越早识别风险和前提，越能降低试点推进中的组织阻力。',
      recommendedVisual: 'risk-matrix',
      evidence: riskEvidence,
    },
    {
      pageNumber: 14,
      slideType: 'closing',
      layout: 'closing-summary',
      title: '决策建议',
      purpose: '把整套分析收束成明确的决策请求。',
      questionToAnswer: '基于以上判断，我们希望客户现在做什么决定？',
      keyTakeaway: buildDecisionGoal(solutionMapping),
      recommendedVisual: 'infographic',
      evidence: [buildDecisionGoal(solutionMapping), solutionMapping.top1.name, painPointRanking.top1.description],
    },
  ];
}

function buildCustomerMeetingPageBlueprints(
  data: AggregatedShareReportData,
  painPointRanking: PainPointRanking,
  solutionMapping: SolutionMapping
): PageBlueprint[] {
  const personaRole = data.persona?.role || '核心用户';
  const highlightStage = data.journeyMap?.stages?.[0]?.name || painPointRanking.top1.relatedStage || '关键流程阶段';
  const topNeed = data.requirements[0]?.title || solutionMapping.top1.name;
  const topRequirementTitles = data.requirements.slice(0, 3).map((item) => item.title);
  const riskEvidence = data.aiInsights.risks.slice(0, 2).map((item) => item.content);

  return [
    {
      pageNumber: 1,
      slideType: 'cover',
      layout: 'cover-hero',
      title: '本次沟通目的与待确认事项',
      purpose: '让客户在开场即知道本次会议要对齐什么、希望会后形成什么决定。',
      questionToAnswer: '这次沟通为什么开、希望确认哪些关键事项？',
      keyTakeaway: '本次沟通的目标不是回顾研究过程，而是确认优先问题、MVP方向和推进前提。',
      recommendedVisual: 'scene-illustration',
      evidence: [data.customer.name, data.interview.title, solutionMapping.top1.name],
    },
    {
      pageNumber: 2,
      slideType: 'background',
      layout: 'context-split',
      title: '一页结论',
      purpose: '用一页先给出最值得优先解决的问题与建议方向。',
      questionToAnswer: '如果客户只记住一页，应该带走什么判断？',
      keyTakeaway: `${painPointRanking.top1.description}是当前最值得优先解决的问题，建议围绕${solutionMapping.top1.name}先做验证。`,
      recommendedVisual: 'infographic',
      evidence: [painPointRanking.top1.description, ...painPointRanking.top2And3.slice(0, 1).map((item) => item.description), solutionMapping.top1.name],
    },
    {
      pageNumber: 3,
      slideType: 'painpoint',
      layout: 'evidence-focus',
      title: '关键证据',
      purpose: '用原话、痛点与需求片段证明结论不是主观判断。',
      questionToAnswer: '支持这个优先判断的关键证据是什么？',
      keyTakeaway: '访谈原话、反复出现的痛点和需求指向同一问题，说明其优先级足够高。',
      recommendedVisual: 'painpoint-detail',
      evidence: [painPointRanking.top1.quoteEvidence, ...topRequirementTitles.slice(0, 2)],
    },
    {
      pageNumber: 4,
      slideType: 'persona',
      layout: 'persona-spotlight',
      title: '核心用户与关键场景',
      purpose: '把问题放回真实角色和具体场景，避免方案脱离使用者。',
      questionToAnswer: '到底是谁在什么场景中最明显地感受到这个问题？',
      keyTakeaway: `${personaRole}是当前问题最集中的承受者，关键场景直接影响方案设计边界。`,
      recommendedVisual: 'character-card',
      evidence: [personaRole, ...(data.persona?.goals.slice(0, 2) || []), ...(data.persona?.painPoints.slice(0, 2) || [])],
    },
    {
      pageNumber: 5,
      slideType: 'journey',
      layout: 'journey-flow',
      title: '高摩擦节点',
      purpose: '指出问题具体发生在流程哪一段，帮助客户快速定位内部环节。',
      questionToAnswer: '问题主要卡在哪些流程节点？',
      keyTakeaway: `${highlightStage}是当前摩擦最集中的流程节点，应作为优先优化入口。`,
      recommendedVisual: 'flow-chart',
      evidence: (data.journeyMap?.stages || []).slice(0, 4).map((stage) => stage.name),
    },
    {
      pageNumber: 6,
      slideType: 'requirement',
      layout: 'requirement-tree',
      title: '需求归纳',
      purpose: '把问题从“抱怨”转成可以设计和排优先级的需求集合。',
      questionToAnswer: '为了解决这个问题，我们真正要满足哪些需求？',
      keyTakeaway: `当前最关键的需求不是做更多功能，而是先满足${topNeed}这一核心诉求。`,
      recommendedVisual: 'tree-diagram',
      evidence: topRequirementTitles,
    },
    {
      pageNumber: 7,
      slideType: 'solution',
      layout: 'solution-spotlight',
      title: '方案建议',
      purpose: '说明优先做什么、不优先做什么，帮助客户形成取舍。',
      questionToAnswer: '基于当前证据，我们建议先推进哪些动作？',
      keyTakeaway: `${solutionMapping.top1.name}是最适合作为当前阶段试点抓手的方案。`,
      recommendedVisual: 'solution-detail',
      evidence: [solutionMapping.top1.name, ...solutionMapping.top1.keyFeatures.slice(0, 2), solutionMapping.top1.expectedValue.efficiency],
    },
    {
      pageNumber: 8,
      slideType: 'solution',
      layout: 'mapping-board',
      title: 'PRD方向与MVP范围',
      purpose: '把建议方案转成可执行的最小版本范围，避免会后没有落地动作。',
      questionToAnswer: '如果进入产品设计，第一版应该做多大、做到哪里？',
      keyTakeaway: '建议先围绕最关键场景定义MVP范围，用最小可验证方案换取最快反馈。',
      recommendedVisual: 'mapping-diagram',
      evidence: [solutionMapping.top1.targetPainPoint, ...solutionMapping.top1.keyFeatures.slice(0, 3)],
    },
    {
      pageNumber: 9,
      slideType: 'risk',
      layout: 'risk-board',
      title: '风险与前提',
      purpose: '提前说明推进MVP前需要具备的前提与可能遇到的风险。',
      questionToAnswer: '要让这件事顺利推进，哪些前提和风险需要先明确？',
      keyTakeaway: '越早确认组织前提、资源边界和试点口径，后续推进越顺畅。',
      recommendedVisual: 'risk-matrix',
      evidence: riskEvidence,
    },
    {
      pageNumber: 10,
      slideType: 'action',
      layout: 'timeline-roadmap',
      title: '下一步行动与待确认事项',
      purpose: '把本次沟通收束成明确的会后动作和待客户确认事项。',
      questionToAnswer: '会后双方分别要做什么，还需要确认哪些事情？',
      keyTakeaway: '建议会后立即确认试点范围、参与角色和时间节奏，推动方案进入下一阶段。',
      recommendedVisual: 'timeline',
      evidence: [buildDecisionGoal(solutionMapping), solutionMapping.top1.name, painPointRanking.top1.description],
    },
  ];
}

function toPageBrief(
  blueprint: PageBlueprint,
  prevBlueprint: PageBlueprint | undefined,
  nextBlueprint: PageBlueprint | undefined
): PPTPageBrief {
  return {
    pageNumber: blueprint.pageNumber,
    slideType: blueprint.slideType,
    layout: blueprint.layout,
    title: blueprint.title,
    purpose: blueprint.purpose,
    questionToAnswer: blueprint.questionToAnswer,
    keyTakeaway: blueprint.keyTakeaway,
    transitionFromPrev: prevBlueprint ? `基于上一页“${prevBlueprint.title}”，本页继续回答：${blueprint.questionToAnswer}` : '本页作为整套汇报的起点，先建立总体命题。',
    transitionToNext: nextBlueprint ? `在明确本页结论后，下一页将进一步展开“${nextBlueprint.title}”。` : '本页作为收束页，用于形成最终决策与行动。 ',
    mustIncludeEvidence: blueprint.evidence.filter(Boolean),
    recommendedVisual: blueprint.recommendedVisual,
    contentBudget: getDefaultContentBudget(blueprint.layout),
  };
}
