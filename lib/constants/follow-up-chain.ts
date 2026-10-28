/**
 * 追问链追踪配置
 *
 * 根据 PRD 文档，任何问题必须追问至少 3 层，否则标记为"待深入"
 * 使用 5Why 分析法追溯根本原因
 */

// ============== 类型定义 ==============

/**
 * 追问链节点
 */
export interface FollowUpChainNode {
  /** 节点 ID */
  id: string;
  /** 原始问题/痛点 */
  originalIssue: string;
  /** 当前层级 (1-5) */
  level: number;
  /** 追问内容 */
  question: string;
  /** 客户回答 */
  answer?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 是否达到根因 */
  isRootCause?: boolean;
  /** 子追问 */
  children?: FollowUpChainNode[];
}

/**
 * 追问链状态
 */
export interface FollowUpChainState {
  /** 链 ID */
  chainId: string;
  /** 根节点（原始问题） */
  rootIssue: string;
  /** 所有追问节点 */
  nodes: FollowUpChainNode[];
  /** 当前深度 */
  currentDepth: number;
  /** 是否达到最小深度（3层） */
  hasMinimumDepth: boolean;
  /** 根因 */
  rootCause?: string;
  /** 状态 */
  status: 'pending' | 'in_progress' | 'completed' | 'insufficient';
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 追问链警告
 */
export interface FollowUpWarning {
  /** 警告 ID */
  id: string;
  /** 关联的链 ID */
  chainId: string;
  /** 警告类型 */
  type: 'insufficient_depth' | 'no_root_cause' | 'vague_answer' | 'missing_quantification';
  /** 警告消息 */
  message: string;
  /** 当前深度 */
  currentDepth: number;
  /** 建议追问 */
  suggestedQuestions: string[];
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 5Why 追问模板
 */
export interface FiveWhyTemplate {
  level: number;
  prefix: string;
  questionTemplate: string;
  purpose: string;
}

// ============== 5Why 追问模板配置 ==============

/**
 * 标准的 5 层追问模板
 */
export const FIVE_WHY_TEMPLATES: FiveWhyTemplate[] = [
  {
    level: 1,
    prefix: 'Why1',
    questionTemplate: '为什么{issue}？具体表现是什么？',
    purpose: '了解现状，明确问题',
  },
  {
    level: 2,
    prefix: 'Why2',
    questionTemplate: '为什么会出现{answer1}的情况？是什么原因导致的？',
    purpose: '追溯直接原因',
  },
  {
    level: 3,
    prefix: 'Why3',
    questionTemplate: '为什么{answer2}？有没有更深层的原因？',
    purpose: '挖掘根本原因（最小深度要求）',
  },
  {
    level: 4,
    prefix: 'Why4',
    questionTemplate: '为什么{answer3}？是否存在系统性问题？',
    purpose: '深入系统性根因',
  },
  {
    level: 5,
    prefix: 'Why5',
    questionTemplate: '为什么{answer4}？这是最终的根本原因吗？',
    purpose: '验证根本原因',
  },
];

/**
 * 追问建议模板
 */
export const FOLLOW_UP_SUGGESTIONS = {
  insufficient_depth: [
    '这个问题还需要进一步追问，建议继续问"为什么"',
    '当前追问深度不足，可能遗漏根本原因',
    '请继续追问至少 {remaining} 层以达到最小深度',
  ],
  no_root_cause: [
    '尚未找到可行动的根本原因',
    '建议追问：这个问题背后是否有更深层的系统性原因？',
    '请确认：这个原因是否可以通过具体行动解决？',
  ],
  vague_answer: [
    '回答比较模糊，建议追问具体细节',
    '建议追问：能具体说说是什么情况吗？',
    '建议追问：有没有具体的数字或案例？',
  ],
  missing_quantification: [
    '缺少量化数据，建议追问具体数字',
    '建议追问：具体是多少？每天/每周发生几次？',
    '建议追问：这个问题影响了多少人？造成多少损失？',
  ],
};

/**
 * 根因判断关键词
 */
export const ROOT_CAUSE_INDICATORS = [
  '根本原因',
  '核心问题',
  '本质是',
  '根源在于',
  '关键因素',
  '系统性问题',
  '流程缺陷',
  '制度缺失',
  '资源配置不足',
  '能力不足',
  '工具缺失',
];

/**
 * 可行动根因关键词
 */
export const ACTIONABLE_ROOT_CAUSE_INDICATORS = [
  '缺乏',
  '缺失',
  '不足',
  '没有',
  '不够',
  '未建立',
  '未配置',
  '未实现',
  '需要',
  '应该',
];

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
export function generateChainId(): string {
  return `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建新的追问链
 */
export function createFollowUpChain(rootIssue: string): FollowUpChainState {
  const now = new Date();
  return {
    chainId: generateChainId(),
    rootIssue,
    nodes: [],
    currentDepth: 0,
    hasMinimumDepth: false,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 添加追问节点
 */
export function addFollowUpNode(
  chain: FollowUpChainState,
  question: string,
  answer?: string
): FollowUpChainState {
  const newNode: FollowUpChainNode = {
    id: generateNodeId(),
    originalIssue: chain.rootIssue,
    level: chain.nodes.length + 1,
    question,
    answer,
    createdAt: new Date(),
    isRootCause: answer ? checkIfRootCause(answer) : false,
  };

  const updatedNodes = [...chain.nodes, newNode];
  const currentDepth = updatedNodes.length;
  const hasMinimumDepth = currentDepth >= 3;

  // 查找根因
  const rootCauseNode = updatedNodes.find((n) => n.isRootCause);

  // 更新状态
  let status: FollowUpChainState['status'] = 'in_progress';
  if (hasMinimumDepth && rootCauseNode) {
    status = 'completed';
  } else if (currentDepth > 0 && !hasMinimumDepth) {
    status = 'insufficient';
  }

  return {
    ...chain,
    nodes: updatedNodes,
    currentDepth,
    hasMinimumDepth,
    rootCause: rootCauseNode?.answer,
    status,
    updatedAt: new Date(),
  };
}

/**
 * 检查回答是否包含根因指示词
 */
export function checkIfRootCause(answer: string): boolean {
  const lowerAnswer = answer.toLowerCase();

  // 检查是否包含根因指示词
  const hasRootCauseIndicator = ROOT_CAUSE_INDICATORS.some((indicator) =>
    lowerAnswer.includes(indicator.toLowerCase())
  );

  // 检查是否包含可行动指示词
  const hasActionableIndicator = ACTIONABLE_ROOT_CAUSE_INDICATORS.some((indicator) =>
    lowerAnswer.includes(indicator.toLowerCase())
  );

  return hasRootCauseIndicator && hasActionableIndicator;
}

/**
 * 生成追问建议
 */
export function generateFollowUpSuggestion(
  chain: FollowUpChainState,
  lastAnswer?: string
): string {
  const { currentDepth, nodes } = chain;

  // 获取上一个回答
  const previousAnswer = lastAnswer || (nodes.length > 0 ? nodes[nodes.length - 1].answer : undefined);

  // 根据深度生成建议
  if (currentDepth < 3) {
    const template = FIVE_WHY_TEMPLATES[currentDepth];
    if (template && previousAnswer) {
      // 替换模板中的占位符
      return template.questionTemplate
        .replace('{issue}', chain.rootIssue)
        .replace('{answer1}', previousAnswer)
        .replace('{answer2}', previousAnswer)
        .replace('{answer3}', previousAnswer)
        .replace('{answer4}', previousAnswer);
    }
    return `为什么${previousAnswer || chain.rootIssue}？请继续追问。`;
  }

  // 已达到最小深度，建议确认根因
  if (currentDepth >= 3 && !chain.rootCause) {
    return '这个问题是否已经追溯到根本原因？能否通过具体行动解决？';
  }

  return '追问链已完成，可以开始分析解决方案。';
}

/**
 * 检查追问链状态并生成警告
 */
export function checkFollowUpChainWarnings(chain: FollowUpChainState): FollowUpWarning[] {
  const warnings: FollowUpWarning[] = [];
  const now = new Date();

  // 检查深度不足
  if (chain.currentDepth > 0 && chain.currentDepth < 3) {
    warnings.push({
      id: `warning-${Date.now()}-depth`,
      chainId: chain.chainId,
      type: 'insufficient_depth',
      message: `当前追问深度为 ${chain.currentDepth} 层，需要至少 3 层才能确保追溯根因`,
      currentDepth: chain.currentDepth,
      suggestedQuestions: [
        generateFollowUpSuggestion(chain),
        ...FOLLOW_UP_SUGGESTIONS.insufficient_depth
          .slice(0, 2)
          .map((s) => s.replace('{remaining}', String(3 - chain.currentDepth))),
      ],
      createdAt: now,
    });
  }

  // 检查是否缺少根因
  if (chain.currentDepth >= 3 && !chain.rootCause) {
    warnings.push({
      id: `warning-${Date.now()}-root`,
      chainId: chain.chainId,
      type: 'no_root_cause',
      message: '已追问 3 层以上，但尚未找到可行动的根本原因',
      currentDepth: chain.currentDepth,
      suggestedQuestions: FOLLOW_UP_SUGGESTIONS.no_root_cause,
      createdAt: now,
    });
  }

  // 检查回答是否模糊
  const lastNode = chain.nodes[chain.nodes.length - 1];
  if (lastNode?.answer) {
    const isVague = checkIfAnswerVague(lastNode.answer);
    if (isVague) {
      warnings.push({
        id: `warning-${Date.now()}-vague`,
        chainId: chain.chainId,
        type: 'vague_answer',
        message: '最近一次回答比较模糊，建议追问具体细节',
        currentDepth: chain.currentDepth,
        suggestedQuestions: FOLLOW_UP_SUGGESTIONS.vague_answer,
        createdAt: now,
      });
    }
  }

  return warnings;
}

/**
 * 检查回答是否模糊
 */
export function checkIfAnswerVague(answer: string): boolean {
  const vagueIndicators = [
    '大概',
    '可能',
    '也许',
    '差不多',
    '好像',
    '应该',
    '不确定',
    '不清楚',
    '不太了解',
  ];

  const lowerAnswer = answer.toLowerCase();
  return vagueIndicators.some((indicator) => lowerAnswer.includes(indicator));
}

/**
 * 计算追问链完整度得分
 */
export function calculateChainCompleteness(chain: FollowUpChainState): number {
  let score = 0;

  // 深度得分（最高 40 分）
  const depthScore = Math.min(chain.currentDepth * 10, 40);
  score += depthScore;

  // 根因得分（最高 30 分）
  if (chain.rootCause) {
    score += 30;
  } else if (chain.currentDepth >= 3) {
    score += 15; // 有深度但未找到根因
  }

  // 回答质量得分（最高 30 分）
  const answeredNodes = chain.nodes.filter((n) => n.answer);
  const answerRatio = answeredNodes.length / Math.max(chain.nodes.length, 1);
  score += answerRatio * 20;

  // 非模糊回答加分
  const nonVagueAnswers = answeredNodes.filter((n) => n.answer && !checkIfAnswerVague(n.answer));
  score += (nonVagueAnswers.length / Math.max(answeredNodes.length, 1)) * 10;

  return Math.round(score);
}

/**
 * 格式化追问链为文本
 */
export function formatChainAsText(chain: FollowUpChainState): string {
  const lines: string[] = [];

  lines.push(`## 追问链分析：${chain.rootIssue}`);
  lines.push('');
  lines.push(`**状态**: ${chain.status === 'completed' ? '✅ 已完成' : chain.status === 'insufficient' ? '⚠️ 深度不足' : '🔄 进行中'}`);
  lines.push(`**深度**: ${chain.currentDepth} 层 (最低要求 3 层)`);
  lines.push(`**完整度**: ${calculateChainCompleteness(chain)}%`);
  lines.push('');

  if (chain.nodes.length > 0) {
    lines.push('### 追问过程');
    chain.nodes.forEach((node, index) => {
      lines.push('');
      lines.push(`**Why${node.level}**: ${node.question}`);
      if (node.answer) {
        lines.push(`> ${node.answer}`);
        if (node.isRootCause) {
          lines.push(`> 🎯 *已识别为根本原因*`);
        }
      }
    });
  }

  if (chain.rootCause) {
    lines.push('');
    lines.push('### 根本原因');
    lines.push(chain.rootCause);
  }

  return lines.join('\n');
}