/**
 * KANO 需求分类配置
 *
 * 根据 PRD 文档，使用 KANO 模型对需求进行分类：
 * - 基本型需求（Must-be）：必须满足的，不满足会导致不满
 * - 期望型需求（Performance）：满足越多越好，与满意度成正比
 * - 兴奋型需求（Attractive）：超出预期的，满足会带来惊喜
 * - 无差异需求（Indifferent）：有或无都不会影响满意度
 */

// ============== 类型定义 ==============

/**
 * KANO 需求类型
 */
export type KANOType = 'must-be' | 'performance' | 'attractive' | 'indifferent';

/**
 * KANO 需求分类结果
 */
export interface KANOCategorizedRequirement {
  /** 需求 ID */
  id: string;
  /** 需求描述 */
  description: string;
  /** KANO 类型 */
  kanoType: KANOType;
  /** 优先级（基于 KANO 类型） */
  priority: 'P0' | 'P1' | 'P2';
  /** 置信度（0-100） */
  confidence: number;
  /** 分类依据 */
  reasoning: string;
  /** 验证问题 */
  verificationQuestions: string[];
  /** 客户原话 */
  customerQuotes?: string[];
}

/**
 * KANO 分类问题（用于客户访谈）
 */
export interface KANOQuestion {
  /** 问题 ID */
  id: string;
  /** 问题类型：正向/反向 */
  direction: 'positive' | 'negative';
  /** 问题内容 */
  question: string;
  /** 功能描述 */
  featureDescription: string;
  /** 答案选项 */
  options: KANOAnswerOption[];
}

/**
 * KANO 答案选项
 */
export interface KANOAnswerOption {
  /** 选项值 */
  value: 1 | 2 | 3 | 4 | 5;
  /** 选项文本 */
  label: string;
  /** 情感倾向 */
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * KANO 分类评估结果
 */
export interface KANOEvaluation {
  /** 功能描述 */
  feature: string;
  /** 正向问题回答 */
  positiveAnswer?: 1 | 2 | 3 | 4 | 5;
  /** 反向问题回答 */
  negativeAnswer?: 1 | 2 | 3 | 4 | 5;
  /** 分类结果 */
  classification: KANOType;
  /** 分类置信度 */
  confidence: number;
}

// ============== KANO 分类配置 ==============

/**
 * KANO 类型显示配置
 */
export const KANO_TYPE_CONFIG: Record<
  KANOType,
  {
    label: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
    color: { bg: string; text: string; border: string };
    icon: string;
  }
> = {
  'must-be': {
    label: '基本型',
    description: '必须满足的需求，缺失会导致客户极度不满',
    priority: 'P0',
    color: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
    },
    icon: '🔴',
  },
  performance: {
    label: '期望型',
    description: '满足程度越高，客户满意度越高',
    priority: 'P1',
    color: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    icon: '🟡',
  },
  attractive: {
    label: '兴奋型',
    description: '超出预期的需求，满足会带来惊喜',
    priority: 'P2',
    color: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    },
    icon: '🟢',
  },
  indifferent: {
    label: '无差异',
    description: '有无此功能对客户满意度影响不大',
    priority: 'P2',
    color: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
    },
    icon: '⚪',
  },
};

/**
 * KANO 标准问卷选项
 */
export const KANO_ANSWER_OPTIONS: KANOAnswerOption[] = [
  { value: 1, label: '我喜欢这样', sentiment: 'positive' },
  { value: 2, label: '我期望这样', sentiment: 'positive' },
  { value: 3, label: '无所谓', sentiment: 'neutral' },
  { value: 4, label: '我可以忍受', sentiment: 'negative' },
  { value: 5, label: '我讨厌这样', sentiment: 'negative' },
];

/**
 * KANO 分类评估表
 *
 * 根据正向问题和反向问题的回答组合确定需求类型
 * 行：正向问题回答（1-5）
 * 列：反向问题回答（1-5）
 */
const KANO_CLASSIFICATION_TABLE: Record<string, KANOType> = {
  // 正向=1 (喜欢)
  '1-1': 'attractive', // Q (魅力品质)
  '1-2': 'attractive', // Q
  '1-3': 'attractive', // A (魅力品质)
  '1-4': 'attractive', // A
  '1-5': 'attractive', // A

  // 正向=2 (期望)
  '2-1': 'attractive', // Q
  '2-2': 'indifferent', // I (无差异品质)
  '2-3': 'indifferent', // I
  '2-4': 'indifferent', // I
  '2-5': 'attractive', // A

  // 正向=3 (无所谓)
  '3-1': 'must-be', // R (反向品质)
  '3-2': 'indifferent', // I
  '3-3': 'indifferent', // I
  '3-4': 'indifferent', // I
  '3-5': 'performance', // O (一维品质)

  // 正向=4 (可以忍受)
  '4-1': 'must-be', // R
  '4-2': 'indifferent', // I
  '4-3': 'indifferent', // I
  '4-4': 'indifferent', // I
  '4-5': 'performance', // O

  // 正向=5 (讨厌)
  '5-1': 'must-be', // R
  '5-2': 'must-be', // R
  '5-3': 'must-be', // M (必备品质)
  '5-4': 'must-be', // M
  '5-5': 'must-be', // M
};

/**
 * 基本型需求关键词
 */
const MUST_BE_INDICATORS = [
  '必须',
  '必要',
  '基础',
  '核心',
  '关键',
  '不能没有',
  '基本',
  '必备',
  '刚需',
  '不可或缺',
];

/**
 * 期望型需求关键词
 */
const PERFORMANCE_INDICATORS = [
  '更好',
  '更快',
  '更方便',
  '效率',
  '提升',
  '优化',
  '改进',
  '增强',
  '提高',
  '改善',
];

/**
 * 兴奋型需求关键词
 */
const ATTRACTIVE_INDICATORS = [
  '惊喜',
  '意外',
  '超出预期',
  '创新',
  '独特',
  '差异化',
  '亮点',
  '特色',
  '智能',
  '自动化',
];

/**
 * 无差异需求关键词
 */
const INDIFFERENT_INDICATORS = [
  '可有可无',
  '无所谓',
  '不重要',
  '没影响',
  '没关系',
  '都行',
  '随便',
];

// ============== 分类函数 ==============

/**
 * 根据 KANO 问卷回答分类需求
 */
export function classifyByKANOQuestionnaire(
  positiveAnswer: 1 | 2 | 3 | 4 | 5,
  negativeAnswer: 1 | 2 | 3 | 4 | 5
): { type: KANOType; confidence: number } {
  const key = `${positiveAnswer}-${negativeAnswer}`;
  const type = KANO_CLASSIFICATION_TABLE[key] || 'indifferent';

  // 计算置信度
  // 回答越极端（喜欢/讨厌），置信度越高
  const positiveConfidence = Math.abs(positiveAnswer - 3) / 2;
  const negativeConfidence = Math.abs(negativeAnswer - 3) / 2;
  const confidence = Math.round((positiveConfidence + negativeConfidence) * 50);

  return { type, confidence: Math.max(confidence, 50) };
}

/**
 * 基于文本分析分类需求
 */
export function classifyRequirementByText(
  requirementText: string,
  customerQuotes?: string[]
): { type: KANOType; confidence: number; reasoning: string } {
  const text = requirementText.toLowerCase();
  const quotes = customerQuotes?.join(' ').toLowerCase() || '';

  // 计算各类别的匹配分数
  const scores: Record<KANOType, number> = {
    'must-be': 0,
    performance: 0,
    attractive: 0,
    indifferent: 0,
  };

  // 检查关键词
  MUST_BE_INDICATORS.forEach((keyword) => {
    if (text.includes(keyword) || quotes.includes(keyword)) {
      scores['must-be'] += 1;
    }
  });

  PERFORMANCE_INDICATORS.forEach((keyword) => {
    if (text.includes(keyword) || quotes.includes(keyword)) {
      scores.performance += 1;
    }
  });

  ATTRACTIVE_INDICATORS.forEach((keyword) => {
    if (text.includes(keyword) || quotes.includes(keyword)) {
      scores.attractive += 1;
    }
  });

  INDIFFERENT_INDICATORS.forEach((keyword) => {
    if (text.includes(keyword) || quotes.includes(keyword)) {
      scores.indifferent += 1;
    }
  });

  // 找出最高分类
  let maxType: KANOType = 'indifferent';
  let maxScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as KANOType;
    }
  }

  // 计算置信度
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.round((maxScore / totalScore) * 100) : 50;

  // 生成推理说明
  const reasoning = generateReasoning(maxType, scores, maxScore);

  return { type: maxType, confidence, reasoning };
}

/**
 * 生成分类推理说明
 */
function generateReasoning(
  type: KANOType,
  scores: Record<KANOType, number>,
  matchCount: number
): string {
  const config = KANO_TYPE_CONFIG[type];

  if (matchCount === 0) {
    return '未检测到明确的需求类型指示词，默认分类为无差异需求';
  }

  const reasons: string[] = [];

  if (scores['must-be'] > 0) {
    reasons.push(`检测到 ${scores['must-be']} 个基本型需求关键词`);
  }
  if (scores.performance > 0) {
    reasons.push(`检测到 ${scores.performance} 个期望型需求关键词`);
  }
  if (scores.attractive > 0) {
    reasons.push(`检测到 ${scores.attractive} 个兴奋型需求关键词`);
  }
  if (scores.indifferent > 0) {
    reasons.push(`检测到 ${scores.indifferent} 个无差异需求关键词`);
  }

  return `分类为${config.label}需求。${reasons.join('；')}。${config.description}`;
}

/**
 * 生成 KANO 验证问题
 */
export function generateKANOVerificationQuestions(feature: string): KANOQuestion[] {
  return [
    {
      id: `kano-${Date.now()}-positive`,
      direction: 'positive',
      featureDescription: feature,
      question: `如果系统有"${feature}"功能，您会感觉如何？`,
      options: KANO_ANSWER_OPTIONS,
    },
    {
      id: `kano-${Date.now()}-negative`,
      direction: 'negative',
      featureDescription: feature,
      question: `如果系统没有"${feature}"功能，您会感觉如何？`,
      options: KANO_ANSWER_OPTIONS,
    },
  ];
}

/**
 * 生成验证问题列表（用于二次确认）
 */
export function generateVerificationQuestionList(
  requirement: KANOCategorizedRequirement
): string[] {
  const questions: string[] = [];

  // 基于分类类型生成验证问题
  switch (requirement.kanoType) {
    case 'must-be':
      questions.push('如果没有这个功能，您还会使用我们的产品吗？');
      questions.push('这个功能对您的工作有多重要？缺少它会造成什么影响？');
      break;
    case 'performance':
      questions.push('这个功能的效果越好，您的满意度会越高吗？');
      questions.push('您期望这个功能达到什么程度？');
      break;
    case 'attractive':
      questions.push('这个功能会让您感到惊喜吗？');
      questions.push('您之前有期望过这个功能吗？');
      break;
    case 'indifferent':
      questions.push('这个功能对您来说重要吗？');
      questions.push('有或没有这个功能，会影响您的选择吗？');
      break;
  }

  // 添加通用验证问题
  questions.push('您能举个例子说明这个需求的具体场景吗？');

  return questions;
}

/**
 * 对需求列表进行 KANO 分类
 */
export function categorizeRequirementsByKANO(
  requirements: Array<{ id: string; description: string; customerQuotes?: string[] }>
): KANOCategorizedRequirement[] {
  return requirements.map((req) => {
    const { type, confidence, reasoning } = classifyRequirementByText(
      req.description,
      req.customerQuotes
    );

    const config = KANO_TYPE_CONFIG[type];
    const verificationQuestions = generateVerificationQuestionList({
      id: req.id,
      description: req.description,
      kanoType: type,
      priority: config.priority,
      confidence,
      reasoning,
      verificationQuestions: [],
    });

    return {
      id: req.id,
      description: req.description,
      kanoType: type,
      priority: config.priority,
      confidence,
      reasoning,
      verificationQuestions,
      customerQuotes: req.customerQuotes,
    };
  });
}

/**
 * 按优先级排序需求
 */
export function sortRequirementsByPriority(
  requirements: KANOCategorizedRequirement[]
): KANOCategorizedRequirement[] {
  const priorityOrder: Record<string, number> = {
    P0: 0,
    P1: 1,
    P2: 2,
  };

  return [...requirements].sort((a, b) => {
    // 先按优先级排序
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // 同优先级按置信度排序
    return b.confidence - a.confidence;
  });
}

/**
 * 统计 KANO 分类结果
 */
export function getKANOStatistics(requirements: KANOCategorizedRequirement[]): {
  total: number;
  byType: Record<KANOType, number>;
  byPriority: Record<'P0' | 'P1' | 'P2', number>;
} {
  const byType: Record<KANOType, number> = {
    'must-be': 0,
    performance: 0,
    attractive: 0,
    indifferent: 0,
  };

  const byPriority: Record<'P0' | 'P1' | 'P2', number> = {
    P0: 0,
    P1: 0,
    P2: 0,
  };

  for (const req of requirements) {
    byType[req.kanoType]++;
    byPriority[req.priority]++;
  }

  return {
    total: requirements.length,
    byType,
    byPriority,
  };
}