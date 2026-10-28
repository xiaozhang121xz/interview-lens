/**
 * AI服务 - Zod 验证 Schema
 *
 * @module lib/validations/ai
 * @description AI API请求验证规则
 */

import { z } from 'zod';

// ============================================
// 生成访谈提纲
// ============================================

/**
 * AI生成访谈提纲请求验证 Schema
 */
export const generateOutlineSchema = z.object({
  customerInfo: z.object({
    name: z.string().min(1, '客户名称不能为空').max(100),
    industry: z.string().max(50).nullish(),
    description: z.string().max(2000).nullish(),
  }),
  objective: z.string().min(1, '访谈目标不能为空').max(500),
  background: z.string().max(2000).nullish(), // 允许 string | null | undefined
  focusAreas: z.array(z.string().max(100)).max(10, '关注领域最多10个').optional().default([]),
  userId: z.string().optional(), // 用于权限验证
  // 新增：访谈分析报告（用于生成更有针对性的问题）
  insightReport: z.lazy(() => insightReportResponseSchema).optional(),
});

/**
 * AI生成访谈提纲响应 Schema
 */
export const outlineResponseSchema = z.object({
  businessScenario: z.string(), // 业务场景分析
  businessFlow: z.string(), // 业务流程梳理
  outline: z.object({
    sections: z.array(
      z.object({
        name: z.string(),
        questions: z.array(z.string()),
      })
    ),
  }),
});

// ============================================
// AI追问推荐
// ============================================

/**
 * 对话历史项 Schema
 */
export const transcriptHistoryItemSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  timestamp: z.string().or(z.date()).optional(),
});

/**
 * AI追问推荐请求验证 Schema
 */
export const generateFollowUpSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  currentQuestion: z.string().max(1000).optional(), // 改为可选，支持基于转写内容生成追问
  customerResponse: z.string().max(5000).optional(),
  context: z.string().max(5000).optional(),
  // 新增：完整上下文
  transcriptHistory: z.array(transcriptHistoryItemSchema).max(50).optional(),
  outlineProgress: z.object({
    total: z.number(),
    asked: z.number(),
    pending: z.number(),
    currentOutlineId: z.string().optional(),
  }).optional(),
  userId: z.string().optional(), // 用于权限验证
});

/**
 * AI追问推荐响应 Schema
 */
export const followUpResponseSchema = z.object({
  questions: z.array(z.string()).min(1).max(5),
});

// ============================================
// AI生成访谈纪要
// ============================================

/**
 * AI生成访谈纪要请求验证 Schema
 */
export const generateSummarySchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  userId: z.string().optional(), // 用于权限验证
});

/**
 * AI生成访谈纪要响应 Schema
 */
export const summaryResponseSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  painPoints: z.array(z.string()),
  requirements: z.array(z.string()),
  risks: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
});

// ============================================
// AI生成PRD文档
// ============================================

/**
 * AI生成PRD请求验证 Schema
 */
export const generatePRDSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  userId: z.string().optional(), // 用于权限验证
});

/**
 * AI生成PRD响应 Schema
 */
export const prdResponseSchema = z.object({
  title: z.string(),
  content: z.string(), // Markdown格式
});

// ============================================
// AI生成用户画像
// ============================================

/**
 * AI生成用户画像请求验证 Schema
 */
export const generatePersonaSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  userId: z.string().optional(), // 用于权限验证
});

/**
 * AI生成用户画像响应 Schema
 */
export const personaResponseSchema = z.object({
  name: z.string(),
  role: z.string(),
  demographics: z.record(z.string(), z.any()),
  goals: z.array(z.string()),
  painPoints: z.array(z.string()),
  behaviors: z.array(z.string()),
  quotes: z.array(z.string()).default([]),
});

// ============================================
// AI生成用户旅程图
// ============================================

/**
 * AI生成用户旅程图请求验证 Schema
 */
export const generateJourneyMapSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  userId: z.string().optional(), // 用于权限验证
});

// ============================================
// AI阶段总结
// ============================================

/**
 * AI阶段总结请求验证 Schema
 */
export const generateStageSummarySchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  // 可选：传入当前的对话内容
  currentTranscripts: z.array(z.object({
    text: z.string(),
    timestamp: z.string().or(z.date()).optional(),
  })).max(50).optional(),
  userId: z.string().optional(), // 用于权限验证
});

/**
 * AI阶段总结响应 Schema
 */
export const stageSummaryResponseSchema = z.object({
  summary: z.string(), // 当前阶段总结
  keyFindings: z.array(z.string()), // 关键发现
  painPoints: z.array(z.string()), // 发现的痛点
  requirements: z.array(z.string()), // 发现的需求
  suggestions: z.array(z.string()), // 建议方向
});

/**
 * 旅程图阶段 Schema
 */
export const journeyStageSchema = z.object({
  name: z.string(), // 阶段名称
  description: z.string().optional(), // 阶段描述
});

/**
 * 旅程图行为项 Schema
 */
export const journeyActionSchema = z.object({
  stage: z.string(), // 所属阶段
  action: z.string(), // 行为描述
  detail: z.string().optional(), // 详细说明
});

/**
 * 旅程图情绪项 Schema
 */
export const journeyEmotionSchema = z.object({
  stage: z.string(), // 所属阶段
  emotion: z.string(), // 情绪类型：happy, neutral, sad, frustrated, excited
  intensity: z.number().min(1).max(5), // 情绪强度 1-5
  reason: z.string().optional(), // 原因
});

/**
 * 旅程图痛点 Schema
 */
export const journeyPainPointSchema = z.object({
  stage: z.string(), // 所属阶段
  painPoint: z.string(), // 痛点描述
  severity: z.enum(['low', 'medium', 'high']), // 严重程度
  frequency: z.enum(['rare', 'occasional', 'frequent']), // 发生频率
});

/**
 * 旅程图机会点 Schema
 */
export const journeyOpportunitySchema = z.object({
  stage: z.string(), // 所属阶段
  opportunity: z.string(), // 机会点描述
  potential: z.enum(['low', 'medium', 'high']), // 潜力
  effort: z.enum(['low', 'medium', 'high']), // 实施难度
});

/**
 * AI生成用户旅程图响应 Schema
 */
export const journeyMapResponseSchema = z.object({
  title: z.string(), // 旅程图标题
  stages: z.array(journeyStageSchema), // 阶段数组
  actions: z.array(journeyActionSchema).optional(), // 行为
  emotions: z.array(journeyEmotionSchema).optional(), // 情绪
  painPoints: z.array(journeyPainPointSchema).optional(), // 痛点
  opportunities: z.array(journeyOpportunitySchema).optional(), // 机会点
});

// ============================================
// 类型推断导出
// ============================================

export type GenerateOutlineInput = z.infer<typeof generateOutlineSchema>;
export type OutlineResponse = z.infer<typeof outlineResponseSchema>;

export type GenerateFollowUpInput = z.infer<typeof generateFollowUpSchema>;
export type FollowUpResponse = z.infer<typeof followUpResponseSchema>;

export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;

export type GeneratePRDInput = z.infer<typeof generatePRDSchema>;
export type PRDResponse = z.infer<typeof prdResponseSchema>;

export type GeneratePersonaInput = z.infer<typeof generatePersonaSchema>;
export type PersonaResponse = z.infer<typeof personaResponseSchema>;

export type GenerateJourneyMapInput = z.infer<typeof generateJourneyMapSchema>;
export type JourneyMapResponse = z.infer<typeof journeyMapResponseSchema>;
export type JourneyStage = z.infer<typeof journeyStageSchema>;
export type JourneyAction = z.infer<typeof journeyActionSchema>;
export type JourneyEmotion = z.infer<typeof journeyEmotionSchema>;
export type JourneyPainPoint = z.infer<typeof journeyPainPointSchema>;
export type JourneyOpportunity = z.infer<typeof journeyOpportunitySchema>;

export type GenerateStageSummaryInput = z.infer<typeof generateStageSummarySchema>;
export type StageSummaryResponse = z.infer<typeof stageSummaryResponseSchema>;
export type TranscriptHistoryItem = z.infer<typeof transcriptHistoryItemSchema>;

// ============================================
// AI核心问题识别
// ============================================

/**
 * 转写内容项 Schema
 */
export const transcriptItemSchema = z.object({
  // 放宽 ID 格式限制：支持 MongoDB ObjectId（24位十六进制）和临时ID（时间戳等）
  id: z.string().min(1, '转写ID不能为空'),
  content: z.string().min(1, '转写内容不能为空'),
  timestamp: z.string().or(z.date()).optional(),
});

/**
 * 客户上下文 Schema
 */
export const customerContextSchema = z.object({
  industry: z.string().max(100).optional(),
  background: z.string().max(2000).optional(),
});

/**
 * AI核心问题识别请求验证 Schema
 */
export const analyzeKeyPointsSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  sessionId: z.string().optional(),
  transcripts: z.array(transcriptItemSchema).min(1, '至少需要一条转写内容').max(100, '最多支持100条转写内容'),
  customerContext: customerContextSchema.optional(),
  userId: z.string().optional(), // 用于权限验证
});

/**
 * 核心问题项 Schema
 */
export const keyPointItemSchema = z.object({
  content: z.string(),
  type: z.enum(['pain_point', 'requirement', 'insight']),
  confidence: z.number().min(0).max(1),
  transcriptIds: z.array(z.string()),
});

/**
 * AI核心问题识别响应 Schema（仅包含AI返回的数据）
 */
export const keyPointsResponseSchema = z.object({
  keyPoints: z.array(keyPointItemSchema),
});

/**
 * 完整的核心问题识别响应 Schema（包含创建的记录）
 */
export const keyPointsFullResponseSchema = z.object({
  keyPoints: z.array(keyPointItemSchema),
  createdRecords: z.array(z.object({
    id: z.string(),
    content: z.string(),
    type: z.string(),
    source: z.string(),
  })),
});

export type TranscriptItem = z.infer<typeof transcriptItemSchema>;
export type CustomerContext = z.infer<typeof customerContextSchema>;
export type AnalyzeKeyPointsInput = z.infer<typeof analyzeKeyPointsSchema>;
export type KeyPointItem = z.infer<typeof keyPointItemSchema>;
export type KeyPointsResponse = z.infer<typeof keyPointsResponseSchema>;
export type KeyPointsFullResponse = z.infer<typeof keyPointsFullResponseSchema>;

// ============================================
// 访谈分析报告生成（提纲生成优化 - 阶段1）
// ============================================

/**
 * AI生成访谈分析报告请求验证 Schema
 */
export const generateInsightReportSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式').optional(), // 用于保存到数据库
  customerInfo: z.object({
    name: z.string().min(1, '客户名称不能为空').max(100),
    industry: z.string().max(50).nullish(),
    description: z.string().max(2000).nullish(),
    // 新增扩展字段
    background: z.string().max(2000).nullish(),        // 客户公司背景
    contactBackground: z.string().max(1000).nullish(), // 联系人背景
    website: z.string().max(200).nullish(),            // 官网
    notes: z.string().max(2000).nullish(),             // 历史备注
  }),
  objective: z.string().min(1, '访谈目标不能为空').max(500),
  background: z.string().max(2000).nullish(),
  focusAreas: z.array(z.string().max(100)).max(10, '关注领域最多10个').optional().default([]),
  userId: z.string().optional(), // 用于权限验证
  overwrite: z.boolean().optional().default(false), // 是否覆盖最新报告（版本管理）
});

/**
 * 痛点假设项 Schema
 */
export const painPointHypothesisSchema = z.object({
  hypothesis: z.string(), // 痛点假设描述
  reasoning: z.string(), // 推断依据
  confidence: z.enum(['high', 'medium', 'low']), // 置信度
  relatedArea: z.string(), // 相关领域
});

/**
 * 访谈策略 Schema
 */
export const interviewStrategySchema = z.object({
  approach: z.string(), // 访谈方法建议
  priorityAreas: z.array(z.string()), // 优先关注领域（3-5条）
  timeAllocation: z.string(), // 时间分配建议
  riskAlerts: z.array(z.string()), // 风险提示
});

/**
 * 业务场景分析 Schema
 */
export const businessScenarioSchema = z.object({
  summary: z.string(), // 业务场景概述
  keyCharacteristics: z.array(z.string()), // 关键特征
  potentialChallenges: z.array(z.string()), // 可能的挑战
});

/**
 * AI生成访谈分析报告响应 Schema
 */
export const insightReportResponseSchema = z.object({
  businessScenario: businessScenarioSchema,
  painPointHypotheses: z.array(painPointHypothesisSchema),
  interviewStrategy: interviewStrategySchema,
  hypothesesAndRisks: z.array(z.object({
    assumption: z.string(),
    basis: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    riskOrGap: z.string(),
  })).default([]),
});

/**
 * V2 - 访谈目标理解
 */
export const interviewGoalSchema = z.object({
  summary: z.string(),
  keyObjectives: z.array(z.string()),
  conversationDirection: z.string(),
  firstPriorityChecks: z.array(z.string()),
});

/**
 * V2 - 已知背景与业务场景
 */
export const knownContextSchema = z.object({
  knownFacts: z.array(z.string()),
  businessScene: z.string(),
  keyCharacteristics: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

/**
 * V2 - 优先澄清问题
 */
export const priorityClarificationItemSchema = z.object({
  question: z.string(),
  whyItMatters: z.string(),
  suggestedFollowUp: z.string().optional(),
});

/**
 * V2 - 待验证假设与风险
 */
export const hypothesisAndRiskItemSchema = z.object({
  assumption: z.string(),
  basis: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  riskOrGap: z.string(),
});

/**
 * V2 - 访谈切入方式
 */
export const interviewApproachSchema = z.object({
  recommendedOpening: z.string(),
  suggestedSequence: z.array(z.string()),
  communicationTips: z.array(z.string()),
  sensitiveTopics: z.array(z.string()),
});

/**
 * AI生成访谈分析报告响应 Schema（V2）
 */
export const insightReportV2ResponseSchema = z.object({
  interviewGoal: interviewGoalSchema,
  knownContext: knownContextSchema,
  priorityClarifications: z.array(priorityClarificationItemSchema),
  hypothesesAndRisks: z.array(hypothesisAndRiskItemSchema),
  interviewApproach: interviewApproachSchema,
});

export type GenerateInsightReportInput = z.infer<typeof generateInsightReportSchema>;
export type InsightReportResponse = z.infer<typeof insightReportResponseSchema>;
export type InsightReportV2Response = z.infer<typeof insightReportV2ResponseSchema>;
export type PainPointHypothesis = z.infer<typeof painPointHypothesisSchema>;
export type InterviewStrategy = z.infer<typeof interviewStrategySchema>;
export type BusinessScenario = z.infer<typeof businessScenarioSchema>;
export type InterviewGoal = z.infer<typeof interviewGoalSchema>;
export type KnownContext = z.infer<typeof knownContextSchema>;
export type PriorityClarificationItem = z.infer<typeof priorityClarificationItemSchema>;
export type HypothesisAndRiskItem = z.infer<typeof hypothesisAndRiskItemSchema>;
export type InterviewApproach = z.infer<typeof interviewApproachSchema>;

// ============================================
// 核心问题识别（提纲生成优化 - 阶段2）
// ============================================

/**
 * 问题设计信息 Schema
 */
export const questionDesignInfoSchema = z.object({
  stage: z.enum(['opening', 'exploration', 'confirmation', 'closing']),
  painPointFocus: z.string().optional(),
  expectedInsight: z.string(),
  followUpHint: z.string().optional(),
});

/**
 * 补充问题设计信息 Schema
 */
export const supplementaryDesignInfoSchema = z.object({
  stage: z.enum(['opening', 'exploration', 'confirmation', 'closing']),
  expectedInsight: z.string().optional(),
});

/**
 * 核心问题项 Schema
 */
export const coreQuestionSchema = z.object({
  question: z.string(),
  priority: z.number().int().min(1).max(5),
  reasoning: z.string(), // 为什么重要
  relatedInsight: z.string(), // 关联分析（显示文本）
  isCore: z.boolean().optional().default(true), // 是否核心问题（新增字段）
  designInfo: questionDesignInfoSchema.optional(), // 问题设计信息
  // 新增：结构化引用字段（使用nullish接受null和undefined）
  relatedPainPointIndex: z.number().int().min(0).nullish(), // 关联痛点假设索引
  relatedPriorityAreaIndex: z.number().int().min(0).nullish(), // 关联优先领域索引
  relatedBusinessScenarioKey: z.string().nullish(), // 关联业务场景特征
  insightReferenceType: z.enum(['pain_point', 'priority_area', 'business_scenario', 'mixed']).nullish(), // 引用类型
});

/**
 * 补充问题项 Schema
 */
export const supplementaryQuestionSchema = z.object({
  question: z.string(),
  priority: z.number().int().min(1).max(5),
  reasoning: z.string().optional(), // 为什么要问这个补充问题
  relatedInsight: z.string(), // 关联分析（显示文本）
  isCore: z.boolean().optional().default(false), // 是否核心问题（新增字段，补充问题默认为false）
  designInfo: supplementaryDesignInfoSchema.optional(), // 问题设计信息
  // 新增：结构化引用字段（使用nullish接受null和undefined）
  relatedPainPointIndex: z.number().int().min(0).nullish(),
  relatedPriorityAreaIndex: z.number().int().min(0).nullish(),
  insightReferenceType: z.enum(['pain_point', 'priority_area', 'business_scenario', 'mixed']).nullish(),
});

/**
 * AI生成核心问题响应 Schema
 */
export const coreQuestionsResponseSchema = z.object({
  coreQuestions: z.array(coreQuestionSchema),
  supplementaryQuestions: z.array(supplementaryQuestionSchema),
});

export type CoreQuestion = z.infer<typeof coreQuestionSchema>;
export type SupplementaryQuestion = z.infer<typeof supplementaryQuestionSchema>;
export type CoreQuestionsResponse = z.infer<typeof coreQuestionsResponseSchema>;

// ============================================
// 遗漏检测（提纲生成优化 - 阶段4）
// ============================================

/**
 * 缺失问题项 Schema
 */
export const missingQuestionSchema = z.object({
  suggestedQuestion: z.string(), // 建议问题
  reason: z.string(), // 为什么重要
  category: z.string(), // 问题分类
  severity: z.enum(['high', 'medium']), // 严重程度
});

/**
 * AI遗漏检测请求验证 Schema
 */
export const analyzeOutlineGapsSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  currentOutline: z.array(z.object({
    id: z.string(),
    question: z.string(),
    isCore: z.boolean().optional().default(true),
  })),
  objective: z.string().min(1, '访谈目标不能为空').max(500),
  customerInfo: z.object({
    name: z.string(),
    industry: z.string().optional(),
    description: z.string().optional(),
  }),
  insightReport: insightReportResponseSchema.optional(),
  userId: z.string().optional(),
});

/**
 * AI遗漏检测响应 Schema
 */
export const outlineGapsResponseSchema = z.object({
  missingCriticalQuestions: z.array(missingQuestionSchema),
  overallCoverage: z.number().min(0).max(100), // 覆盖度评分
  recommendations: z.array(z.string()), // 改进建议
});

export type MissingQuestion = z.infer<typeof missingQuestionSchema>;
export type AnalyzeOutlineGapsInput = z.infer<typeof analyzeOutlineGapsSchema>;
export type OutlineGapsResponse = z.infer<typeof outlineGapsResponseSchema>;
