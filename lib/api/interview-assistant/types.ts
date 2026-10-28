/**
 * 客户需求洞察助手 - API 类型定义
 */

// ==========================================
// 客户相关类型
// ==========================================

/**
 * 客户信息接口
 * 注意：字段名与数据库 schema 保持一致
 */
export interface Customer {
  id: string;
  name: string;
  /** 公司全称（工商注册名称，来自AI搜索） */
  companyFullName: string | null;
  industry: string | null;
  /** 客户描述 */
  description: string | null;
  /** 客户网站 */
  website: string | null;
  /** 联系人姓名 */
  contact: string | null;
  /** 联系电话 */
  phone: string | null;
  /** 邮箱 */
  email: string | null;
  address: string | null;
  background: string | null;
  contactBackground: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    interviews: number;
  };
}

export interface CustomerListResponse {
  success: boolean;
  data: {
    customers: Customer[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * 创建客户输入参数
 * 注意：使用前端友好的字段名，后端会做转换
 */
export interface CustomerCreateInput {
  name: string;
  companyFullName?: string;
  industry: string;
  description?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  background?: string;
  contactBackground?: string;
  notes?: string;
}

// ==========================================
// 访谈项目相关类型
// ==========================================

export type InterviewStatus =
  | 'draft'
  | 'prepared'
  | 'in_progress'
  | 'completed'
  | 'archived';

export type PreparationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface InterviewInsight {
  id: string;
  type: 'summary' | 'pain_point' | 'requirement' | 'risk';
  content: string;
  interviewId: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  title: string;
  objective: string;
  background?: string;
  status: InterviewStatus;
  interviewDate?: string;
  customerId: string;
  userId: string;
  currentSessionId?: string | null;
  sessionStartTime?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  // 自动生成状态追踪
  preparationStatus?: PreparationStatus;
  preparationError?: string | null;
  preparationStartedAt?: string | null;
  preparationCompletedAt?: string | null;
  _count?: {
    outlines: number;
    records: number;
  };
  outlines?: Outline[];
  records?: Record[];
  insights?: InterviewInsight[];
  persona?: any;
  prd?: any;
  insightReports?: InsightReportRecord[]; // 访谈分析报告
}

/**
 * 访谈分析报告记录（来自数据库）
 */
export interface InsightReportRecord {
  id: string;
  projectId: string;
  content: string; // JSON 格式的 InsightReport
  createdAt: string;
  updatedAt: string;
}

export interface InterviewListResponse {
  success: boolean;
  data: {
    interviews: Interview[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface InterviewCreateInput {
  title: string;
  objective: string;
  background?: string;
  customerId: string;
  interviewDate?: string;
}

export interface InterviewUpdateInput {
  title?: string;
  objective?: string;
  background?: string;
  customerId?: string;
  interviewDate?: string;
}

// ==========================================
// 访谈提纲相关类型
// ==========================================

export type OutlineStatus = 'pending' | 'asked' | 'skipped';

export interface Outline {
  id: string;
  question: string;
  priority: number;
  status: OutlineStatus;
  order: number;
  notes?: string;
  interviewId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // 新增字段 - 提纲生成优化
  isCore: boolean; // 是否核心问题
  reasoning?: string; // 问题重要性说明
  source: 'ai' | 'manual' | 'template'; // 来源
  relatedInsight?: string; // 关联的分析内容（显示文本）
  // 新增字段 - 结构化引用
  relatedPainPointIndex?: number; // 关联痛点假设索引
  relatedPriorityAreaIndex?: number; // 关联优先领域索引
  relatedBusinessScenarioKey?: string; // 关联业务场景特征
  insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed'; // 引用类型
}

export interface OutlineCreateInput {
  question: string;
  priority?: number;
  order?: number;
  notes?: string;
  // 新增字段 - 提纲生成优化
  isCore?: boolean;
  reasoning?: string;
  source?: 'ai' | 'manual' | 'template';
  relatedInsight?: string;
  // 新增字段 - 结构化引用
  relatedPainPointIndex?: number;
  relatedPriorityAreaIndex?: number;
  relatedBusinessScenarioKey?: string;
  insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed';
}

export interface OutlineUpdateInput {
  question?: string;
  priority?: number;
  status?: OutlineStatus;
  order?: number;
  notes?: string;
}

// ==========================================
// 访谈记录相关类型
// ==========================================

export type RecordType =
  | 'answer'
  | 'note'
  | 'pain_point'
  | 'requirement'
  | 'other';

export type RecordSource = 'manual' | 'ai' | 'follow_up';

export interface Record {
  id: string;
  content: string;
  type: RecordType;
  isHighlight: boolean;
  outlineId?: string;
  interviewId: string;
  userId: string;
  sessionId?: string | null;
  source: RecordSource;
  createdAt: string;
  updatedAt: string;
}

export interface RecordCreateInput {
  content: string;
  type?: RecordType;
  isHighlight?: boolean;
  outlineId?: string;
  sessionId?: string;
  source?: RecordSource;
}

export interface RecordUpdateInput {
  content?: string;
  type?: RecordType;
  isHighlight?: boolean;
  outlineId?: string;
}

// ==========================================
// AI 相关类型
// ==========================================

export interface AIGenerateOutlineInput {
  customerInfo: {
    name: string;
    industry?: string;
    description?: string;
  };
  objective: string;
  background?: string;
  /** 重点关注领域 - 根据用户画像自动填充 */
  focusAreas?: string[];
}

export interface AIGenerateOutlineResponse {
  success: boolean;
  data: {
    businessScenario: string;
    businessFlow: string;
    outline: {
      sections: Array<{
        name: string;
        questions: string[];
      }>;
    };
  };
}

export interface AIGenerateFollowUpInput {
  interviewId: string;
  currentQuestion?: string; // 改为可选，支持基于转写内容生成追问
  customerResponse?: string;
  context?: string;
  transcriptHistory?: Array<{
    id?: string;
    text: string;
    timestamp?: string | Date;
  }>;
  outlineProgress?: {
    total: number;
    asked: number;
    pending: number;
    currentOutlineId?: string;
  };
}

export interface AIGenerateFollowUpResponse {
  success: boolean;
  data: {
    questions: string[];
  };
}

export interface AIGenerateSummaryInput {
  interviewId: string;
}

export interface AIGenerateSummaryResponse {
  success: boolean;
  data: {
    summary: string;
    keyPoints: string[];
    painPoints: string[];
    requirements: string[];
    risks: string[];
    nextSteps: string[];
  };
}

export interface AIGeneratePRDInput {
  interviewId: string;
}

export interface AIGeneratePRDResponse {
  success: boolean;
  data: {
    prd: string;
  };
}

export interface AIGeneratePersonaInput {
  interviewId: string;
}

export interface AIGeneratePersonaResponse {
  success: boolean;
  data: {
    persona: string;
  };
}

// ==========================================
// Dashboard 统计类型
// ==========================================

export interface DashboardStats {
  customerCount: number;
  interviewStats: {
    total: number;
    completed: number;
    inProgress: number;
    draft: number;
  };
  recentInterviews: Array<{
    id: string;
    title: string;
    status: InterviewStatus;
    createdAt: string;
    customer: {
      id: string;
      name: string;
      industry: string;
    };
  }>;
  interviewsByStatus: Array<{
    status: InterviewStatus;
    count: number;
  }>;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

// ==========================================
// 访谈模板相关类型
// ==========================================

/**
 * 提纲章节 Schema（用于解析 outline JSON）
 */
export interface OutlineSection {
  name: string;
  questions: string[];
}

/**
 * 提纲内容 Schema（用于解析 outline JSON）
 */
export interface OutlineContent {
  sections: OutlineSection[];
}

/**
 * 访谈模板 - 匹配后端 Prisma 模型
 */
export interface InterviewTemplate {
  id: string;
  name: string;
  description?: string | null;
  outline: string; // JSON 格式的提纲内容
  category?: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResponse {
  success: boolean;
  data: {
    templates: InterviewTemplate[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

/**
 * 模板创建输入 - 匹配后端 Zod Schema
 */
export interface TemplateCreateInput {
  name: string;
  description?: string;
  outline: string; // JSON 格式的提纲内容
  category?: string;
  isPublic?: boolean;
}

/**
 * 模板更新输入 - 匹配后端 Zod Schema
 */
export interface TemplateUpdateInput {
  name?: string;
  description?: string;
  outline?: string;
  category?: string;
  isPublic?: boolean;
}

// ==========================================
// 辅助函数
// ==========================================

/**
 * 将问题数组转换为 outline JSON 字符串
 */
export function questionsToOutline(questions: string[]): string {
  return JSON.stringify({
    sections: [
      {
        name: '访谈问题',
        questions: questions,
      },
    ],
  });
}

/**
 * 从 outline JSON 字符串解析问题数组
 */
export function outlineToQuestions(outline: string): string[] {
  try {
    const content: OutlineContent = JSON.parse(outline);
    const allQuestions: string[] = [];
    for (const section of content.sections) {
      allQuestions.push(...section.questions);
    }
    return allQuestions;
  } catch {
    return [];
  }
}

// ==========================================
// 会话管理类型（阶段三新增）
// ==========================================

/**
 * 会话信息
 */
export interface SessionInfo {
  sessionId: string;
  interviewId: string;
  startTime: string;
  endTime?: string | null;
  status: 'active' | 'ended';
}

/**
 * 开始会话响应
 */
export interface StartSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    startTime: string;
  };
}

/**
 * 获取当前会话响应
 */
export interface GetCurrentSessionResponse {
  success: boolean;
  data: SessionInfo | null;
}

// ==========================================
// 用户旅程图相关类型
// ==========================================

/**
 * 用户旅程阶段
 */
export interface JourneyStage {
  name: string;
  description: string;
}

/**
 * 用户行为
 */
export interface JourneyAction {
  stage: string;
  action: string;
  detail?: string;
}

/**
 * 情绪类型
 */
export type EmotionType = 'happy' | 'neutral' | 'sad' | 'frustrated' | 'excited';

/**
 * 用户情绪
 */
export interface JourneyEmotion {
  stage: string;
  emotion: EmotionType;
  intensity: 1 | 2 | 3 | 4 | 5;
  reason?: string;
}

/**
 * 严重程度
 */
export type SeverityLevel = 'low' | 'medium' | 'high';

/**
 * 频率
 */
export type FrequencyLevel = 'rare' | 'occasional' | 'frequent';

/**
 * 痛点
 */
export interface JourneyPainPoint {
  stage: string;
  painPoint: string;
  severity: SeverityLevel;
  frequency: FrequencyLevel;
}

/**
 * 潜力/努力程度
 */
export type EffortLevel = 'low' | 'medium' | 'high';

/**
 * 机会点
 */
export interface JourneyOpportunity {
  stage: string;
  opportunity: string;
  potential: SeverityLevel;
  effort: EffortLevel;
}

/**
 * 用户旅程图数据
 */
export interface JourneyMapData {
  id: string;
  title: string;
  stages: JourneyStage[];
  actions?: JourneyAction[];
  emotions?: JourneyEmotion[];
  painPoints?: JourneyPainPoint[];
  opportunities?: JourneyOpportunity[];
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * AI 生成用户旅程图输入
 */
export interface AIGenerateJourneyInput {
  interviewId: string;
}

/**
 * AI 生成用户旅程图响应
 */
export interface AIGenerateJourneyResponse {
  success: boolean;
  data: JourneyMapData;
  message?: string;
}

/**
 * 获取用户旅程图响应
 */
export interface GetJourneyMapResponse {
  success: boolean;
  data: JourneyMapData | null;
}

/**
 * 更新用户旅程图输入
 */
export interface UpdateJourneyMapInput {
  title?: string;
  stages?: JourneyStage[];
  actions?: JourneyAction[];
  emotions?: JourneyEmotion[];
  painPoints?: JourneyPainPoint[];
  opportunities?: JourneyOpportunity[];
}

/**
 * 更新用户旅程图响应
 */
export interface UpdateJourneyMapResponse {
  success: boolean;
  data: JourneyMapData;
  message?: string;
}

// ==========================================
// 访谈分析报告相关类型（提纲生成优化 - 阶段1）
// ==========================================

/**
 * 痛点假设
 */
export interface PainPointHypothesis {
  hypothesis: string; // 痛点假设描述
  reasoning: string; // 推断依据
  confidence: 'high' | 'medium' | 'low'; // 置信度
  relatedArea: string; // 相关领域
}

/**
 * 访谈策略
 */
export interface InterviewStrategy {
  approach: string; // 访谈方法建议
  priorityAreas: string[]; // 优先关注领域
  timeAllocation: string; // 时间分配建议
  riskAlerts: string[]; // 风险提示
}

/**
 * 业务场景分析
 */
export interface BusinessScenario {
  summary: string; // 业务场景概述
  keyCharacteristics: string[]; // 关键特征
  potentialChallenges: string[]; // 可能的挑战
}

/**
 * V1 访谈分析报告
 */
export interface InsightReportV1 {
  businessScenario: BusinessScenario;
  painPointHypotheses: PainPointHypothesis[];
  interviewStrategy: InterviewStrategy;
  hypothesesAndRisks: Array<{
    assumption: string;
    basis: string;
    confidence: 'high' | 'medium' | 'low';
    riskOrGap: string;
  }>;
}

export interface InterviewGoal {
  summary: string;
  keyObjectives: string[];
  conversationDirection: string;
  firstPriorityChecks: string[];
}

export interface KnownContext {
  knownFacts: string[];
  businessScene: string;
  keyCharacteristics: string[];
  openQuestions: string[];
}

export interface PriorityClarificationItem {
  question: string;
  whyItMatters: string;
  suggestedFollowUp?: string;
}

export interface HypothesisAndRiskItem {
  assumption: string;
  basis: string;
  confidence: 'high' | 'medium' | 'low';
  riskOrGap: string;
}

export interface InterviewApproachV2 {
  recommendedOpening: string;
  suggestedSequence: string[];
  communicationTips: string[];
  sensitiveTopics: string[];
}

/**
 * V2 访谈分析报告
 */
export interface InsightReportV2 {
  interviewGoal: InterviewGoal;
  knownContext: KnownContext;
  priorityClarifications: PriorityClarificationItem[];
  hypothesesAndRisks: HypothesisAndRiskItem[];
  interviewApproach: InterviewApproachV2;
}

export type InsightReportContent = InsightReportV1 | InsightReportV2;

/**
 * 兼容旧代码：InsightReport 默认仍指向 V1
 */
export type InsightReport = InsightReportV1;

export type InsightReportVersion = 'v1' | 'v2';

/**
 * AI生成访谈分析报告输入
 */
export interface AIGenerateInsightReportInput {
  customerInfo: {
    name: string;
    industry?: string;
    description?: string;
  };
  objective: string;
  background?: string;
  focusAreas?: string[];
}

/**
 * AI生成访谈分析报告响应
 */
export interface AIGenerateInsightReportResponse {
  success: boolean;
  data: InsightReportV1;
  message?: string;
}

// ==========================================
// 核心问题相关类型（提纲生成优化 - 阶段2）
// ==========================================

/**
 * 问题阶段类型
 */
export type QuestionStage = 'opening' | 'exploration' | 'confirmation' | 'closing';

/**
 * 问题设计信息
 */
export interface QuestionDesignInfo {
  stage: QuestionStage;
  painPointFocus?: string;
  expectedInsight: string;
  followUpHint?: string;
}

/**
 * 补充问题设计信息
 */
export interface SupplementaryDesignInfo {
  stage: QuestionStage;
  expectedInsight?: string;
}

/**
 * 核心问题
 */
export interface CoreQuestion {
  question: string;
  priority: number;
  reasoning: string; // 为什么重要
  relatedInsight: string; // 关联分析（显示文本）
  isCore?: boolean; // 是否核心问题（新增字段）
  designInfo?: QuestionDesignInfo; // 问题设计信息
  // 新增：结构化引用字段
  relatedPainPointIndex?: number; // 关联痛点假设索引
  relatedPriorityAreaIndex?: number; // 关联优先领域索引
  relatedBusinessScenarioKey?: string; // 关联业务场景特征
  insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed'; // 引用类型
}

/**
 * 补充问题
 */
export interface SupplementaryQuestion {
  question: string;
  priority: number;
  reasoning?: string; // 为什么重要
  relatedInsight: string; // 关联分析（显示文本）
  isCore?: boolean; // 是否核心问题（新增字段，补充问题默认为false）
  designInfo?: SupplementaryDesignInfo; // 问题设计信息
  // 新增：结构化引用字段
  relatedPainPointIndex?: number;
  relatedPriorityAreaIndex?: number;
  relatedBusinessScenarioKey?: string;
  insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed';
}

/**
 * AI生成核心问题响应
 */
export interface AICoreQuestionsResponse {
  success: boolean;
  data: {
    coreQuestions: CoreQuestion[];
    supplementaryQuestions: SupplementaryQuestion[];
  };
  message?: string;
}

// ==========================================
// 遗漏检测相关类型（提纲生成优化 - 阶段4）
// ==========================================

/**
 * 缺失问题
 */
export interface MissingQuestion {
  suggestedQuestion: string; // 建议问题
  reason: string; // 为什么重要
  category: string; // 问题分类
  severity: 'high' | 'medium'; // 严重程度
}

/**
 * AI遗漏检测输入
 */
export interface AIAnalyzeOutlineGapsInput {
  interviewId: string;
  currentOutline: Array<{
    id: string;
    question: string;
    isCore?: boolean;
  }>;
  objective: string;
  customerInfo: {
    name: string;
    industry?: string;
    description?: string;
  };
  insightReport?: InsightReport;
}

/**
 * AI遗漏检测响应
 */
export interface AIOutlineGapsResponse {
  success: boolean;
  data: {
    missingCriticalQuestions: MissingQuestion[];
    overallCoverage: number; // 覆盖度评分 0-100
    recommendations: string[];
  };
  message?: string;
}

// ==========================================
// 报告版本管理相关类型（新增）
// ==========================================

/**
 * 报告历史列表项
 */
export interface InsightReportItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  versionNumber: number;
  reportType?: InsightReportVersion;
}

/**
 * 报告详情响应
 */
export interface InsightReportDetail {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  reportType?: InsightReportVersion;
  content: InsightReportContent;
}

/**
 * 报告历史列表响应
 */
export interface InsightReportsListResponse {
  success: boolean;
  data: InsightReportItem[];
  total: number;
}

/**
 * 报告详情响应
 */
export interface InsightReportDetailResponse {
  success: boolean;
  data: InsightReportDetail;
}

/**
 * 生成报告请求（扩展）
 */
export interface GenerateInsightReportRequest extends AIGenerateInsightReportInput {
  interviewId: string;
  overwrite?: boolean; // 是否覆盖最新报告
}
