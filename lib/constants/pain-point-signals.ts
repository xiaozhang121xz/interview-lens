/**
 * 痛点信号词配置
 *
 * 根据 PRD 文档，痛点信号词分为 4 类：
 * - 转折词：表示前后内容对比，可能是痛点线索
 * - 程度词：表示重要性程度，可能是关键痛点
 * - 频率词：表示发生频率，高频问题通常是痛点
 * - 情绪词：表示用户情绪状态，负面情绪通常指向痛点
 */

// ============== 类型定义 ==============

/**
 * 信号词类型
 */
export type SignalWordType = 'transition' | 'degree' | 'frequency' | 'emotion';

/**
 * 信号词配置
 */
export interface SignalWordConfig {
  /** 信号词 */
  word: string;
  /** 类型 */
  type: SignalWordType;
  /** 权重（用于计算痛点强度） */
  weight: number;
  /** 描述 */
  description: string;
  /** 建议追问（可选） */
  suggestedFollowUp?: string;
}

/**
 * 检测到的痛点信号
 */
export interface DetectedPainPointSignal {
  /** 信号词 */
  word: string;
  /** 类型 */
  type: SignalWordType;
  /** 在文本中的位置 */
  position: {
    start: number;
    end: number;
  };
  /** 权重 */
  weight: number;
  /** 上下文（信号词周围的文本） */
  context: string;
  /** 建议追问 */
  suggestedFollowUp?: string;
}

// ============== 信号词库 ==============

/**
 * 转折词信号库
 * 表示前后内容对比，后文可能是痛点线索
 */
const TRANSITION_SIGNALS: SignalWordConfig[] = [
  {
    word: '但是',
    type: 'transition',
    weight: 0.9,
    description: '转折词，后文通常是真实痛点',
    suggestedFollowUp: '您说的"但是"后面的问题，具体表现是什么？',
  },
  {
    word: '其实',
    type: 'transition',
    weight: 0.7,
    description: '转折词，揭示真实情况',
    suggestedFollowUp: '您说的"其实"是什么情况？能具体说说吗？',
  },
  {
    word: '然而',
    type: 'transition',
    weight: 0.8,
    description: '转折词，对比说明',
    suggestedFollowUp: '您提到的对比情况，具体差异有多大？',
  },
  {
    word: '不过',
    type: 'transition',
    weight: 0.7,
    description: '转折词，补充说明问题',
    suggestedFollowUp: '您说的"不过"是什么问题？',
  },
  {
    word: '只是',
    type: 'transition',
    weight: 0.6,
    description: '转折词，限制条件说明',
    suggestedFollowUp: '您说的"只是"是什么限制？',
  },
  {
    word: '可惜',
    type: 'transition',
    weight: 0.8,
    description: '遗憾表达，通常指向痛点',
    suggestedFollowUp: '您说的"可惜"是什么情况？能具体说说吗？',
  },
];

/**
 * 程度词信号库
 * 表示重要性程度，高程度词通常是关键痛点
 */
const DEGREE_SIGNALS: SignalWordConfig[] = [
  {
    word: '最',
    type: 'degree',
    weight: 1.0,
    description: '最高程度词，通常是核心痛点',
    suggestedFollowUp: '您说的"最"麻烦的是什么？具体表现是什么？',
  },
  {
    word: '非常',
    type: 'degree',
    weight: 0.8,
    description: '高程度词，表示强烈感受',
    suggestedFollowUp: '您说的"非常"具体是指什么程度？',
  },
  {
    word: '特别',
    type: 'degree',
    weight: 0.8,
    description: '强调词，表示重要性',
    suggestedFollowUp: '您说的"特别"是指什么方面？',
  },
  {
    word: '相当',
    type: 'degree',
    weight: 0.7,
    description: '程度词，表示显著程度',
    suggestedFollowUp: '您说的"相当"具体是什么程度？',
  },
  {
    word: '极其',
    type: 'degree',
    weight: 0.9,
    description: '最高程度词，强烈痛点',
    suggestedFollowUp: '您说的"极其"是什么情况？',
  },
  {
    word: '严重',
    type: 'degree',
    weight: 0.9,
    description: '严重程度词，关键痛点',
    suggestedFollowUp: '您说的"严重"具体表现在哪里？',
  },
  {
    word: '关键',
    type: 'degree',
    weight: 0.85,
    description: '关键性强调，核心问题',
    suggestedFollowUp: '您说的"关键"是什么？',
  },
];

/**
 * 频率词信号库
 * 表示发生频率，高频问题通常是痛点
 */
const FREQUENCY_SIGNALS: SignalWordConfig[] = [
  {
    word: '经常',
    type: 'frequency',
    weight: 0.7,
    description: '频率词，表示频繁发生',
    suggestedFollowUp: '您说的"经常"具体频率是多少？一周几次？',
  },
  {
    word: '总是',
    type: 'frequency',
    weight: 0.9,
    description: '频率词，表示持续发生',
    suggestedFollowUp: '您说的"总是"发生，每次的具体表现是什么？',
  },
  {
    word: '每次',
    type: 'frequency',
    weight: 0.85,
    description: '频率词，表示必然发生',
    suggestedFollowUp: '您说的"每次"都发生，具体过程是怎样的？',
  },
  {
    word: '一直',
    type: 'frequency',
    weight: 0.8,
    description: '频率词，表示持续状态',
    suggestedFollowUp: '您说的"一直"是什么状态？持续多久了？',
  },
  {
    word: '反复',
    type: 'frequency',
    weight: 0.75,
    description: '频率词，表示重复发生',
    suggestedFollowUp: '您说的"反复"发生，具体频率是多少？',
  },
  {
    word: '常常',
    type: 'frequency',
    weight: 0.7,
    description: '频率词，表示经常发生',
    suggestedFollowUp: '您说的"常常"具体是多频繁？',
  },
  {
    word: '天天',
    type: 'frequency',
    weight: 0.85,
    description: '频率词，每日发生',
    suggestedFollowUp: '您说的"天天"发生，每天大概多少次？',
  },
];

/**
 * 情绪词信号库
 * 表示用户情绪状态，负面情绪通常指向痛点
 */
const EMOTION_SIGNALS: SignalWordConfig[] = [
  {
    word: '头疼',
    type: 'emotion',
    weight: 0.9,
    description: '负面情绪词，强烈痛点',
    suggestedFollowUp: '您说的"头疼"是什么问题？能具体说说吗？',
  },
  {
    word: '困扰',
    type: 'emotion',
    weight: 0.85,
    description: '负面情绪词，持续痛点',
    suggestedFollowUp: '您说的"困扰"具体是什么？困扰多久了？',
  },
  {
    word: '担心',
    type: 'emotion',
    weight: 0.75,
    description: '情绪词，潜在风险点',
    suggestedFollowUp: '您"担心"的是什么？',
  },
  {
    word: '焦虑',
    type: 'emotion',
    weight: 0.8,
    description: '负面情绪词，压力点',
    suggestedFollowUp: '您说的"焦虑"是什么情况？',
  },
  {
    word: '无奈',
    type: 'emotion',
    weight: 0.85,
    description: '负面情绪词，无解痛点',
    suggestedFollowUp: '您说的"无奈"是什么情况？目前有什么解决办法吗？',
  },
  {
    word: '烦',
    type: 'emotion',
    weight: 0.8,
    description: '负面情绪词，日常痛点',
    suggestedFollowUp: '您说的"烦"是什么事情？',
  },
  {
    word: '麻烦',
    type: 'emotion',
    weight: 0.85,
    description: '负面情绪词，操作痛点',
    suggestedFollowUp: '您说的"麻烦"具体是什么流程？',
  },
  {
    word: '难受',
    type: 'emotion',
    weight: 0.8,
    description: '负面情绪词，体验痛点',
    suggestedFollowUp: '您说的"难受"是什么体验？',
  },
  {
    word: '压力',
    type: 'emotion',
    weight: 0.7,
    description: '情绪词，工作压力点',
    suggestedFollowUp: '您说的"压力"来自哪里？具体表现是什么？',
  },
];

// ============== 合并信号词库 ==============

/**
 * 全部痛点信号词库
 */
export const PAIN_POINT_SIGNALS: SignalWordConfig[] = [
  ...TRANSITION_SIGNALS,
  ...DEGREE_SIGNALS,
  ...FREQUENCY_SIGNALS,
  ...EMOTION_SIGNALS,
];

/**
 * 按类型分组的信号词库
 */
export const SIGNALS_BY_TYPE: Record<SignalWordType, SignalWordConfig[]> = {
  transition: TRANSITION_SIGNALS,
  degree: DEGREE_SIGNALS,
  frequency: FREQUENCY_SIGNALS,
  emotion: EMOTION_SIGNALS,
};

/**
 * 信号词类型显示名称
 */
export const SIGNAL_TYPE_LABELS: Record<SignalWordType, string> = {
  transition: '转折信号',
  degree: '程度信号',
  frequency: '频率信号',
  emotion: '情绪信号',
};

/**
 * 信号词类型颜色配置
 */
export const SIGNAL_TYPE_COLORS: Record<SignalWordType, { bg: string; text: string; border: string }> = {
  transition: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  degree: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  frequency: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  emotion: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
};

// ============== 检测函数 ==============

/**
 * 在文本中检测痛点信号词
 * @param text 要检测的文本
 * @param contextLength 上下文长度（默认 20 字符）
 * @returns 检测到的痛点信号列表
 */
export function detectPainPointSignals(
  text: string,
  contextLength: number = 20
): DetectedPainPointSignal[] {
  const signals: DetectedPainPointSignal[] = [];

  for (const config of PAIN_POINT_SIGNALS) {
    const regex = new RegExp(config.word, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + config.word.length;

      // 获取上下文
      const contextStart = Math.max(0, start - contextLength);
      const contextEnd = Math.min(text.length, end + contextLength);
      const context = text.slice(contextStart, contextEnd);

      signals.push({
        word: config.word,
        type: config.type,
        position: { start, end },
        weight: config.weight,
        context,
        suggestedFollowUp: config.suggestedFollowUp,
      });
    }
  }

  // 按位置排序
  return signals.sort((a, b) => a.position.start - b.position.start);
}

/**
 * 计算文本的痛点强度评分
 * @param signals 检测到的信号列表
 * @returns 评分（0-100）
 */
export function calculatePainPointIntensity(
  signals: DetectedPainPointSignal[]
): number {
  if (signals.length === 0) return 0;

  // 加权平均
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const avgWeight = totalWeight / signals.length;

  // 考虑信号数量（更多信号 = 更高强度）
  const quantityFactor = Math.min(signals.length / 5, 1); // 5个信号为上限

  // 综合评分
  const score = avgWeight * 70 + quantityFactor * 30;

  return Math.round(score * 100);
}

/**
 * 获取最高优先级的痛点信号
 * @param signals 检测到的信号列表
 * @param limit 返回数量限制
 * @returns 高优先级信号列表
 */
export function getHighPrioritySignals(
  signals: DetectedPainPointSignal[],
  limit: number = 3
): DetectedPainPointSignal[] {
  return signals
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/**
 * 高亮文本中的信号词
 * @param text 原始文本
 * @param signals 检测到的信号列表
 * @returns 高亮后的 HTML 文本
 */
export function highlightSignalsInText(
  text: string,
  signals: DetectedPainPointSignal[]
): string {
  if (signals.length === 0) return text;

  let result = text;
  let offset = 0;

  for (const signal of signals) {
    const colors = SIGNAL_TYPE_COLORS[signal.type];
    const adjustedStart = signal.position.start + offset;
    const adjustedEnd = signal.position.end + offset;

    const highlighted = `<span class="${colors.bg} ${colors.text} ${colors.border} border rounded px-1 font-medium">${signal.word}</span>`;
    result = result.slice(0, adjustedStart) + highlighted + result.slice(adjustedEnd);
    offset += highlighted.length - signal.word.length;
  }

  return result;
}