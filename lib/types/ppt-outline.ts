/**
 * PPT大纲类型定义（图文结合·混合模式版）
 *
 * 用于生成向客户汇报的PPT大纲，支持：
 * - 核心痛点/方案单独展示
 * - 次要痛点/方案汇总展示
 * - 每页PPT配图表/可视化内容
 *
 * @module lib/types/ppt-outline
 */

// ============================================
// 基础类型
// ============================================

/**
 * 幻灯片类型
 */
export type SlideType =
  | 'cover'       // 封面
  | 'background'  // 项目背景
  | 'persona'     // 用户画像
  | 'journey'     // 工作流程
  | 'painpoint'   // 痛点分析
  | 'analysis'    // 根因分析
  | 'requirement' // 需求提炼
  | 'solution'    // 解决方案
  | 'value'       // 预期价值
  | 'action'      // 实施路径
  | 'risk'        // 风险提示
  | 'closing';    // 结束页

/**
 * PPT大纲结构模式
 */
export type PPTOutlineMode =
  | 'classic' // 现有14页研究汇报结构
  | 'customer_next_meeting'; // 面向下次客户沟通/领导同步的10页决策结构

/**
 * 图表类型
 */
export type VisualType =
  | 'character-card'      // 人物卡片
  | 'flow-chart'          // 流程图
  | 'painpoint-detail'    // 痛点详情卡片
  | 'priority-matrix'     // 优先级矩阵
  | 'cause-effect'        // 因果关系图
  | 'tree-diagram'        // 树状图
  | 'solution-detail'     // 方案详情卡片
  | 'mapping-diagram'     // 方案-痛点映射图
  | 'roi-chart'           // ROI图表
  | 'timeline'            // 时间轴
  | 'risk-matrix'         // 风险矩阵
  | 'infographic'         // 信息图
  | 'scene-illustration'  // 场景示意图
  | 'logo-placeholder';   // Logo占位

/**
 * 严重程度/频率等级
 */
export type SeverityLevel = 'high' | 'medium' | 'low';
export type FrequencyLevel = 'high' | 'medium' | 'low';

/**
 * 页面布局类型（页面级展示协议）
 */
export type SlideLayout =
  | 'cover-hero'
  | 'context-split'
  | 'persona-spotlight'
  | 'journey-flow'
  | 'evidence-focus'
  | 'matrix-compare'
  | 'analysis-board'
  | 'requirement-tree'
  | 'solution-spotlight'
  | 'mapping-board'
  | 'value-dashboard'
  | 'timeline-roadmap'
  | 'risk-board'
  | 'closing-summary';

/**
 * 页面叙事角色
 */
export type SlideNarrativeRole =
  | 'opening'
  | 'context'
  | 'persona'
  | 'evidence'
  | 'analysis'
  | 'requirement'
  | 'solution'
  | 'value'
  | 'action'
  | 'risk'
  | 'closing';

/**
 * 图片资产风格类型
 */
export type ImageAssetStyle =
  | 'photo'
  | 'illustration'
  | 'diagram'
  | 'ui-mockup'
  | 'abstract';

/**
 * 图片资产比例
 */
export type ImageAspectRatio = '1:1' | '4:3' | '16:9' | '3:4';

/**
 * 图片摆放位置
 */
export type ImagePlacement = 'hero' | 'background' | 'supporting' | 'sidebar';

// ============================================
// 痛点相关类型
// ============================================

/**
 * 痛点详情（单独展示页，用于TOP1痛点）
 */
export interface PainPointDetail {
  rank: number;
  description: string;
  quoteEvidence: string;       // 原话佐证（必填）
  impact: {
    severity: SeverityLevel;   // 严重程度
    frequency: FrequencyLevel; // 出现频率
    scope: string;             // 影响范围描述
    metrics: string[];         // 量化影响指标
  };
  rootCause: {
    surface: string[];         // 表层原因
    deep: string[];            // 深层原因
    attemptedSolutions: string[]; // 已尝试方案
  };
  relatedStage?: string;       // 关联旅程阶段
  occurrenceCount?: number;    // 出现次数
}

/**
 * 痛点汇总（汇总展示页，用于TOP2-3痛点）
 */
export interface PainPointSummary {
  rank: number;
  description: string;
  quoteEvidence: string;       // 原话佐证（必填）
  impactBrief: string;         // 影响简述
  severity: SeverityLevel;
  frequency: FrequencyLevel;
}

/**
 * 痛点排序结果
 */
export interface PainPointRanking {
  top1: PainPointDetail;       // TOP1痛点（单独页）
  top2And3: PainPointSummary[]; // TOP2-3痛点（汇总页）
  others: PainPointSummary[];  // 其他痛点（可选展示）
}

// ============================================
// 方案相关类型
// ============================================

/**
 * 实施步骤
 */
export interface ImplementationStep {
  step: number;
  action: string;
  details: string;
}

/**
 * 方案详情（单独展示页，用于TOP1方案）
 */
export interface SolutionDetail {
  targetPainPoint: string;     // 对应痛点描述
  targetPainPointRank: number; // 对应痛点排名
  name: string;
  description: string;
  howItWorks: string;          // 解决原理
  implementationSteps: ImplementationStep[];
  keyFeatures: string[];       // 关键特性（新增）
  expectedValue: {
    efficiency: string;        // 效率提升
    cost: string;              // 成本降低
    business: string[];        // 业务收益
  };
  priority: 'P0' | 'P1' | 'P2';
}

/**
 * 方案汇总（汇总展示页，用于TOP2-3方案）
 */
export interface SolutionSummary {
  targetPainPoint: string;
  targetPainPointRank: number;
  name: string;
  description: string;
  keyFeatures: string[];
  priority: 'P0' | 'P1' | 'P2';
}

/**
 * 方案映射结果
 */
export interface SolutionMapping {
  top1: SolutionDetail;        // TOP1方案（单独页）
  top2And3: SolutionSummary[]; // TOP2-3方案（汇总页）
}

// ============================================
// 图表配置类型
// ============================================

/**
 * 人物卡片配置
 */
export interface CharacterCardConfig {
  name: string;
  role: string;
  department?: string;
  keyGoals: string[];
  keyPainPoints: string[];
  quoteSnippet: string;
}

/**
 * 流程图配置
 */
export interface FlowChartConfig {
  stages: Array<{
    name: string;
    tasks: string[];
    isHighlight?: boolean;
  }>;
  highlightStage?: string;
}

/**
 * 痛点详情卡片配置
 */
export interface PainPointDetailCardConfig {
  title: string;
  severity: SeverityLevel;
  frequency: FrequencyLevel;
  scope: string;
  metrics: string[];
  quote: string;
  quoteSource?: string;
  rootCause: {
    surface: string[];
    deep: string[];
    attempted: string[];  // 改名为attempted以匹配生成代码
  };
}

/**
 * 优先级矩阵配置
 */
export interface PriorityMatrixConfig {
  title?: string;  // 矩阵标题
  items: Array<{
    id: string;
    label: string;
    description: string;
    impact: SeverityLevel;
    frequency: FrequencyLevel;
    quote?: string;
  }>;
  xAxisLabel: string;
  yAxisLabel: string;
  highlightIds?: string[];  // 需要高亮的项
}

/**
 * 因果关系图配置
 */
export interface CauseEffectConfig {
  rootCauses: Array<{
    cause: string;
    effects: string[];
  }>;
  correlations: Array<{
    cause: string;
    effect: string;
    strength: 'strong' | 'medium' | 'weak';
  }>;
}

/**
 * 树状图配置
 */
export interface TreeDiagramConfig {
  root: string;
  branches: Array<{
    category: string;
    items: string[];
  }>;
}

/**
 * 方案详情卡片配置
 */
export interface SolutionDetailCardConfig {
  title: string;
  targetPainPoint: string;
  howItWorks: string;
  steps: ImplementationStep[];
  expectedValue: {
    efficiency: string;
    cost: string;
    business: string[];
  };
}

/**
 * 方案-痛点映射图配置
 */
export interface MappingDiagramConfig {
  mappings: Array<{
    painPointId: string;
    painPointLabel: string;
    painPointRank: number;
    solutionId: string;
    solutionLabel: string;
  }>;
  title: string;
}

/**
 * ROI图表配置
 */
export interface ROIChartConfig {
  directValue: Array<{
    metric: string;
    before: string;
    after: string;
    improvement: string;
  }>;
  longTermValue: string[];
  estimatedROI?: string;
}

/**
 * 时间轴配置
 */
export interface TimelineConfig {
  phases: Array<{
    name: string;
    duration: string;
    actions: string[];
    status: 'planned' | 'ongoing' | 'completed';
  }>;
}

/**
 * 风险矩阵配置
 */
export interface RiskMatrixConfig {
  risks: Array<{
    risk: string;
    probability: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
}

/**
 * 图表配置联合类型
 */
export type VisualConfig =
  | { type: 'character-card'; config: CharacterCardConfig }
  | { type: 'flow-chart'; config: FlowChartConfig }
  | { type: 'painpoint-detail'; config: PainPointDetailCardConfig }
  | { type: 'priority-matrix'; config: PriorityMatrixConfig }
  | { type: 'cause-effect'; config: CauseEffectConfig }
  | { type: 'tree-diagram'; config: TreeDiagramConfig }
  | { type: 'solution-detail'; config: SolutionDetailCardConfig }
  | { type: 'mapping-diagram'; config: MappingDiagramConfig }
  | { type: 'roi-chart'; config: ROIChartConfig }
  | { type: 'timeline'; config: TimelineConfig }
  | { type: 'risk-matrix'; config: RiskMatrixConfig }
  | { type: 'infographic'; config: Record<string, unknown> }
  | { type: 'scene-illustration'; config: { description: string } }
  | { type: 'logo-placeholder'; config: { companyName: string } };

// ============================================
// 幻灯片类型
// ============================================

/**
 * 幻灯片内容
 */
export interface SlideContent {
  mainPoints: string[];
  supportingData?: string[];
  quoteEvidence?: string[];
}

/**
 * 单页幻灯片
 */
export interface PPTSlide {
  slideNumber: number;
  slideTitle: string;
  slideType: SlideType;

  // 文字内容
  content: SlideContent;

  // 图表配置
  visual: VisualConfig;

  // 页面级展示协议
  presentation?: SlidePresentation;

  // 演讲者备注
  speakerNotes: string;
}

// ============================================
// PPT大纲完整结构
// ============================================

/**
 * PPT元数据
 */
export interface PPTMetadata {
  projectTitle: string;
  customerName: string;
  interviewDate: string;
  totalSlides: number;
  createdAt: string;
  version: string;
  protocolVersion?: string;
  paletteName?: PaletteName;
  coreThesis?: string;
  audience?: string;
  decisionGoal?: string;
  outlineMode?: PPTOutlineMode;
  pageAspectRatio?: '16:9';
}

/**
 * PPT大纲完整结构（14页混合模式）
 */
export interface PPTOutlineContent {
  slides: PPTSlide[];
  metadata: PPTMetadata;
  narrative: PPTNarrative;
  painPointRanking: PainPointRanking;
  solutionMapping: SolutionMapping;
}

// ============================================
// API请求/响应类型
// ============================================

/**
 * 生成PPT大纲请求
 */
export interface GeneratePPTOutlineRequest {
  interviewId: string;
  theme?: 'modern' | 'classic' | 'minimal';
  outlineMode?: PPTOutlineMode;
}

/**
 * 生成PPT大纲响应
 */
export interface GeneratePPTOutlineResponse {
  success: boolean;
  outline?: PPTOutlineContent;
  error?: string;
}

/**
 * 导出PPT请求
 */
export interface ExportPPTRequest {
  reportId: string;
  format: 'pptx' | 'pdf';
  includeCharts: boolean;
}

/**
 * 导出PPT响应
 */
export interface ExportPPTResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

// ============================================
// 工具函数类型
// ============================================

/**
 * 优先级评分
 */
export function getPriorityScore(severity: SeverityLevel, frequency: FrequencyLevel): number {
  const severityScore = { high: 3, medium: 2, low: 1 };
  const frequencyScore = { high: 3, medium: 2, low: 1 };
  return severityScore[severity] * frequencyScore[frequency];
}

/**
 * 严重程度显示文本
 */
export function getSeverityLabel(severity: SeverityLevel): string {
  const labels = { high: '高', medium: '中', low: '低' };
  return labels[severity];
}

/**
 * 频率显示文本
 */
export function getFrequencyLabel(frequency: FrequencyLevel): string {
  const labels = { high: '高频', medium: '中频', low: '低频' };
  return labels[frequency];
}

// ============================================
// 配色方案类型定义
// ============================================

/**
 * 科技感配色方案
 */
export interface TechLightPalette {
  /** 主色调 - 蓝色系（科技感） */
  primary: {
    main: string;      // #3B82F6
    light: string;     // #60A5FA
    dark: string;      // #2563EB
    gradient: {
      start: string;   // #3B82F6
      end: string;     // #60A5FA
    };
  };

  /** 辅助色 - 青色系（科技点缀） */
  secondary: {
    main: string;      // #06B6D4
    light: string;     // #22D3EE
  };

  /** 强调色 - 橙色系（CTA/高亮） */
  accent: {
    main: string;      // #F97316
    light: string;     // #FB923C
  };

  /** 状态色（严重程度） */
  status: {
    high: string;      // #EF4444 (Red)
    medium: string;    // #F59E0B (Amber)
    low: string;       // #10B981 (Green)
  };

  /** 中性色（背景/文字） */
  neutral: {
    background: string;    // #F8FAFC (浅灰背景)
    surface: string;       // #FFFFFF (白色卡片)
    textPrimary: string;   // #1E293B (深色文字)
    textSecondary: string; // #64748B (灰色文字)
    border: string;        // #E2E8F0 (边框)
  };
}

/**
 * 配色方案名称
 */
export type PaletteName = 'tech-light' | 'tech-dark-consulting';

/**
 * 预设配色方案
 */
export const PALETTE_PRESETS: Record<PaletteName, TechLightPalette> = {
  'tech-light': {
    primary: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      gradient: { start: '#3B82F6', end: '#60A5FA' },
    },
    secondary: {
      main: '#06B6D4',
      light: '#22D3EE',
    },
    accent: {
      main: '#F97316',
      light: '#FB923C',
    },
    status: {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981',
    },
    neutral: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      textPrimary: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
    },
  },
  'tech-dark-consulting': {
    primary: {
      main: '#2F80ED',
      light: '#00C2FF',
      dark: '#0B1F3A',
      gradient: { start: '#7B61FF', end: '#00C2FF' },
    },
    secondary: {
      main: '#00C2FF',
      light: '#56CCF2',
    },
    accent: {
      main: '#7B61FF',
      light: '#9B8CFF',
    },
    status: {
      high: '#EB5757',
      medium: '#F2994A',
      low: '#27AE60',
    },
    neutral: {
      background: '#0B1F3A',
      surface: '#0F172A',
      textPrimary: '#E6EEF8',
      textSecondary: '#9FB3C8',
      border: '#243247',
    },
  },
};

// ============================================
// LLM图表建议类型定义
// ============================================

/**
 * LLM生成的图表建议
 */
export interface VisualSuggestion {
  /** 主推荐图表类型 */
  primaryType: VisualType;

  /** 备选图表类型 */
  recommendedTypes?: VisualType[];

  /** 设计建议 */
  designHints?: {
    /** 需要高亮的元素 */
    highlightElements?: string[];
    /** 布局偏好 */
    layoutPreference?: 'horizontal' | 'vertical' | 'grid' | 'timeline';
    /** 数据密度建议 */
    dataDensity?: 'sparse' | 'medium' | 'dense';
    /** 视觉风格 */
    visualStyle?: 'minimal' | 'detailed' | 'card-based';
  };

  /** 配色建议 */
  colorHints?: {
    /** 使用预设配色方案 */
    presetPalette?: PaletteName;
    /** 自定义强调色 */
    customAccent?: string;
  };

  /** LLM对图表的描述性建议 */
  description?: string;
}

/**
 * 页面图片资产协议
 */
export interface SlideImageAsset {
  /** 用于生成或匹配图片素材的提示词 */
  prompt: string;
  /** 图片替代文本 */
  alt: string;
  /** 图片风格 */
  style?: ImageAssetStyle;
  /** 推荐比例 */
  aspectRatio?: ImageAspectRatio;
  /** 推荐摆放位置 */
  placement?: ImagePlacement;
  /** 需要强调的关键词 */
  emphasisKeywords?: string[];
}

/**
 * 页面溢出策略
 */
export interface SlideOverflowPolicy {
  /** 优先按哪一类内容分页 */
  splitBy?: 'mainPoints' | 'supportingData' | 'quoteEvidence' | 'speakerNotes';
  /** 每页主结论数量上限 */
  maxMainPointsPerPage?: number;
  /** 每页支撑信息数量上限 */
  maxSupportingItemsPerPage?: number;
  /** 每页原话数量上限 */
  maxQuotesPerPage?: number;
  /** 每页备注字符数上限 */
  maxSpeakerNotesCharsPerPage?: number;
}

/**
 * 页面内容预算
 */
export interface SlideContentBudget {
  layout: SlideLayout;
  maxMainPoints: number;
  maxSupportingItems: number;
  maxQuotes: number;
  maxSpeakerNotesChars: number;
}

/**
 * 页面简报（叙事层）
 */
export interface PPTPageBrief {
  pageNumber: number;
  slideType: SlideType;
  layout: SlideLayout;
  title: string;
  purpose: string;
  questionToAnswer: string;
  keyTakeaway: string;
  transitionFromPrev?: string;
  transitionToNext?: string;
  mustIncludeEvidence?: string[];
  recommendedVisual?: VisualType;
  contentBudget: SlideContentBudget;
}

/**
 * 整套汇报叙事
 */
export interface PPTNarrative {
  coreThesis: string;
  executiveSummary: string;
  audience: string;
  storyline: string[];
  decisionGoal: string;
  pageBriefs: PPTPageBrief[];
}

/**
 * 页面级展示协议
 */
export interface SlidePresentation {
  /** 页面布局模板 */
  layout: SlideLayout;
  /** 版面分区标签 */
  sectionLabel?: string;
  /** 页面标题口号 */
  headline?: string;
  /** 页面副标题 */
  subheadline?: string;
  /** 当前页最重要的一句话 */
  keyMessage?: string;
  /** 页面在整套汇报中的叙事角色 */
  narrativeRole?: SlideNarrativeRole;
  /** 当前页存在的目的 */
  purpose?: string;
  /** 当前页回答的问题 */
  questionToAnswer?: string;
  /** 与上一页的承接 */
  transitionFromPrev?: string;
  /** 与下一页的过渡 */
  transitionToNext?: string;
  /** 视觉语气 */
  themeVariant?: 'executive' | 'consulting' | 'product' | 'research';
  /** 视觉建议 */
  visualSuggestion?: VisualSuggestion;
  /** 图片资产建议 */
  imageAsset?: SlideImageAsset;
  /** 溢出分页建议 */
  overflowPolicy?: SlideOverflowPolicy;
}
