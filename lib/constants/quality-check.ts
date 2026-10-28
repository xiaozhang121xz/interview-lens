/**
 * 输出质量检查配置
 *
 * 根据 PRD 文档，输出质量检查清单包含 12 项强制检查
 * 检查不通过时禁止生成正式报告，必须标记为"初稿，需补充"
 */

// ============== 类型定义 ==============

/**
 * 检查项类别
 */
export type QualityCheckCategory =
  | 'completeness'    // 完整性
  | 'depth'           // 深度
  | 'evidence'        // 依据性
  | 'actionability';  // 可操作性

/**
 * 检查项严重级别
 */
export type QualityCheckSeverity = 'critical' | 'warning' | 'info';

/**
 * 单个检查项配置
 */
export interface QualityCheckItem {
  /** 检查项ID */
  id: string;
  /** 检查项名称 */
  name: string;
  /** 检查项描述 */
  description: string;
  /** 所属类别 */
  category: QualityCheckCategory;
  /** 严重级别 */
  severity: QualityCheckSeverity;
  /** 权重（用于计算总分） */
  weight: number;
  /** 检查函数 */
  check: (context: QualityCheckContext) => QualityCheckResult;
  /** 修复建议 */
  fixSuggestion: string;
}

/**
 * 检查上下文
 */
export interface QualityCheckContext {
  /** 访谈记录文本 */
  transcriptText: string;
  /** 提纲列表 */
  outlines: Array<{ question: string; status: string }>;
  /** 追问历史 */
  followUpHistory: Array<{ question: string; answer?: string }>;
  /** 生成的报告内容 */
  reportContent?: {
    prd?: string;
    persona?: string;
    journey?: string;
    summary?: string;
  };
  /** 提取的痛点列表 */
  painPoints: string[];
  /** 提取的需求列表 */
  requirements: string[];
  /** 量化数据列表 */
  quantitativeData: Array<{ value: string; context: string }>;
}

/**
 * 检查结果
 */
export interface QualityCheckResult {
  /** 是否通过 */
  passed: boolean;
  /** 得分（0-100） */
  score: number;
  /** 详细信息 */
  details: string;
  /** 缺失项（如果未通过） */
  missingItems?: string[];
}

/**
 * 整体检查报告
 */
export interface QualityCheckReport {
  /** 总体是否通过 */
  overallPassed: boolean;
  /** 总分（0-100） */
  totalScore: number;
  /** 各检查项结果 */
  items: Array<{
    item: QualityCheckItem;
    result: QualityCheckResult;
  }>;
  /** 各类别得分 */
  categoryScores: Record<QualityCheckCategory, number>;
  /** 缺失项汇总 */
  missingItems: string[];
  /** 修复建议 */
  fixSuggestions: string[];
  /** 检查时间 */
  checkedAt: Date;
}

// ============== 检查函数实现 ==============

/**
 * 检查1：是否包含客户原话
 */
const checkCustomerQuotes: QualityCheckItem['check'] = (context) => {
  const { transcriptText } = context;

  // 检查是否有引号包裹的内容（客户原话）
  const quotePatterns = [
    /["「"]([^"」]+)["」"]/g,  // 中文引号
    /"([^"]+)"/g,              // 英文引号
    /「([^」]+)」/g,           // 日文引号
  ];

  let quoteCount = 0;
  for (const pattern of quotePatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      quoteCount += matches.length;
    }
  }

  // 也检查是否有"客户说"、"用户表示"等表述
  const customerStatementPatterns = [
    /客户[说提到表示]/g,
    /用户[说提到表示]/g,
    /对方[说提到表示]/g,
  ];

  let statementCount = 0;
  for (const pattern of customerStatementPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      statementCount += matches.length;
    }
  }

  const hasQuotes = quoteCount >= 3 || statementCount >= 3;
  const score = hasQuotes ? 100 : Math.min(quoteCount * 20 + statementCount * 20, 80);

  return {
    passed: score >= 60,
    score,
    details: quoteCount >= 3
      ? `检测到 ${quoteCount} 处客户原话引用`
      : statementCount >= 3
        ? `检测到 ${statementCount} 处客户表述记录`
        : '缺少客户原话引用，建议记录更多客户原话',
    missingItems: score < 60 ? ['客户原话引用不足（至少需要3处）'] : undefined,
  };
};

/**
 * 检查2：是否区分表面需求和真实需求
 */
const checkDemandLayers: QualityCheckItem['check'] = (context) => {
  const { transcriptText, requirements } = context;

  // 检查是否有分层表述
  const layerPatterns = [
    /表面需求|真实需求|根本需求|深层需求/g,
    /L1|L2|L3|L4/g,
    /第一层|第二层|第三层|第四层/g,
    /实际上是|本质是|根本是/g,
  ];

  let layerCount = 0;
  for (const pattern of layerPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      layerCount += matches.length;
    }
  }

  // 检查需求描述是否包含追问痕迹
  const followUpPatterns = [
    /为什么|原因是什么|怎么导致的/g,
    /具体是指|具体表现/g,
  ];

  let followUpCount = 0;
  for (const pattern of followUpPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      followUpCount += matches.length;
    }
  }

  const hasLayers = layerCount >= 2;
  const score = hasLayers ? 100 : Math.min(layerCount * 30 + followUpCount * 10, 70);

  return {
    passed: hasLayers,
    score,
    details: hasLayers
      ? `检测到需求分层表述 ${layerCount} 处`
      : '缺少需求分层表述，建议区分表面需求和真实需求',
    missingItems: !hasLayers ? ['缺少需求分层分析（表面需求→真实需求→根本需求）'] : undefined,
  };
};

/**
 * 检查3：是否包含至少3个量化数据
 */
const checkQuantitativeData: QualityCheckItem['check'] = (context) => {
  const { quantitativeData, transcriptText } = context;

  // 从文本中提取数字
  const numberPatterns = [
    /\d+(\.\d+)?%/g,           // 百分比
    /\d+(\.\d+)?[万千百十]/g,   // 中文数量单位
    /\d+(\.\d+)?\s*(分钟|小时|天|周|月|年)/g,  // 时间
    /\d+(\.\d+)?\s*(元|万|亿)/g, // 金额
    /\d+\s*(人|个|次|件)/g,     // 数量
  ];

  const extractedNumbers = [...quantitativeData];

  for (const pattern of numberPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      matches.forEach((m) => {
        if (!extractedNumbers.some((n) => n.value === m)) {
          extractedNumbers.push({ value: m, context: '' });
        }
      });
    }
  }

  const dataCount = extractedNumbers.length;
  const hasEnoughData = dataCount >= 3;
  const score = Math.min(dataCount * 25, 100);

  return {
    passed: hasEnoughData,
    score,
    details: `检测到 ${dataCount} 个量化数据`,
    missingItems: !hasEnoughData ? [`量化数据不足（当前${dataCount}个，需要至少3个）`] : undefined,
  };
};

/**
 * 检查4：是否追溯到L3层级（根本需求）
 */
const checkRootCause: QualityCheckItem['check'] = (context) => {
  const { transcriptText, painPoints } = context;

  // 检查是否有根因分析表述
  const rootCausePatterns = [
    /根本原因|根本问题|核心原因|本质问题/g,
    /导致.*的原因|问题的根源/g,
    /为什么.*因为/g,
    /追溯|深挖|挖掘/g,
  ];

  let rootCauseCount = 0;
  for (const pattern of rootCausePatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      rootCauseCount += matches.length;
    }
  }

  // 检查追问链深度
  const whyCount = (transcriptText.match(/为什么/g) || []).length;

  const hasRootCause = rootCauseCount >= 2 || whyCount >= 5;
  const score = hasRootCause ? 100 : Math.min(rootCauseCount * 30 + whyCount * 10, 70);

  return {
    passed: hasRootCause,
    score,
    details: hasRootCause
      ? `检测到根因分析表述 ${rootCauseCount} 处，追问 ${whyCount} 次`
      : '缺少根因分析，建议追溯至少3层"为什么"',
    missingItems: !hasRootCause ? ['缺少根本原因追溯（建议至少3层追问）'] : undefined,
  };
};

/**
 * 检查5：是否包含根因分析
 */
const checkRootCauseAnalysis: QualityCheckItem['check'] = (context) => {
  const { transcriptText, reportContent } = context;

  // 检查报告内容
  const reportText = [
    reportContent?.prd,
    reportContent?.summary,
  ].filter(Boolean).join('\n');

  // 检查是否有结构化分析
  const analysisPatterns = [
    /鱼骨图|因果分析|5Why|五问法/g,
    /原因是|导致|造成|影响/g,
    /人机料法环|5M1E/g,
  ];

  let analysisCount = 0;

  for (const pattern of analysisPatterns) {
    const textToCheck = reportText || transcriptText;
    const matches = textToCheck.match(pattern);
    if (matches) {
      analysisCount += matches.length;
    }
  }

  const hasAnalysis = analysisCount >= 3;
  const score = Math.min(analysisCount * 25, 100);

  return {
    passed: hasAnalysis,
    score,
    details: hasAnalysis
      ? `检测到根因分析方法应用 ${analysisCount} 处`
      : '缺少结构化根因分析方法',
    missingItems: !hasAnalysis ? ['建议使用鱼骨图或5Why进行根因分析'] : undefined,
  };
};

/**
 * 检查6：是否标注信息来源
 */
const checkSourceAttribution: QualityCheckItem['check'] = (context) => {
  const { transcriptText } = context;

  // 检查是否有信息来源标注
  const sourcePatterns = [
    /来源[：:]/g,
    /根据|基于|参考/g,
    /访谈记录|客户说|用户提供/g,
    /信息源|数据来源/g,
  ];

  let sourceCount = 0;
  for (const pattern of sourcePatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      sourceCount += matches.length;
    }
  }

  const hasSources = sourceCount >= 2;
  const score = Math.min(sourceCount * 40, 100);

  return {
    passed: hasSources,
    score,
    details: hasSources
      ? `检测到 ${sourceCount} 处信息来源标注`
      : '缺少信息来源标注',
    missingItems: !hasSources ? ['建议标注信息来源（访谈记录、客户说等）'] : undefined,
  };
};

/**
 * 检查7：是否包含影响范围评估
 */
const checkImpactAssessment: QualityCheckItem['check'] = (context) => {
  const { transcriptText } = context;

  // 检查是否有影响范围描述
  const impactPatterns = [
    /影响.*人|涉及.*团队/g,
    /影响范围|波及/g,
    /造成.*损失|导致.*成本/g,
    /每(周|月|年).*/g,
  ];

  let impactCount = 0;
  for (const pattern of impactPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      impactCount += matches.length;
    }
  }

  const hasImpact = impactCount >= 2;
  const score = Math.min(impactCount * 40, 100);

  return {
    passed: hasImpact,
    score,
    details: hasImpact
      ? `检测到 ${impactCount} 处影响范围描述`
      : '缺少影响范围评估',
    missingItems: !hasImpact ? ['建议量化问题影响范围（影响多少人、多少时间、多少成本）'] : undefined,
  };
};

/**
 * 检查8：是否包含优先级排序
 */
const checkPriorityRanking: QualityCheckItem['check'] = (context) => {
  const { transcriptText, requirements, painPoints } = context;

  // 检查是否有优先级表述
  const priorityPatterns = [
    /P0|P1|P2|P3/g,
    /高优先级|中优先级|低优先级/g,
    /最重要|最紧急|最关键/g,
    /优先解决|首先处理/g,
  ];

  let priorityCount = 0;
  for (const pattern of priorityPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      priorityCount += matches.length;
    }
  }

  const hasPriority = priorityCount >= 2;
  const score = Math.min(priorityCount * 40, 100);

  return {
    passed: hasPriority,
    score,
    details: hasPriority
      ? `检测到 ${priorityCount} 处优先级表述`
      : '缺少优先级排序',
    missingItems: !hasPriority ? ['建议对需求和痛点进行优先级排序'] : undefined,
  };
};

/**
 * 检查9：是否包含建议追问
 */
const checkSuggestedFollowUps: QualityCheckItem['check'] = (context) => {
  const { followUpHistory, transcriptText } = context;

  // 检查追问数量
  const followUpCount = followUpHistory.length;

  // 检查文本中是否有追问表述
  const followUpPatterns = [
    /追问|继续问|进一步了解/g,
    /还需要确认|待确认/g,
    /建议追问|推荐追问/g,
  ];

  let textFollowUpCount = 0;
  for (const pattern of followUpPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      textFollowUpCount += matches.length;
    }
  }

  const totalFollowUps = followUpCount + textFollowUpCount;
  const hasFollowUps = totalFollowUps >= 2;
  const score = Math.min(totalFollowUps * 30, 100);

  return {
    passed: hasFollowUps,
    score,
    details: hasFollowUps
      ? `检测到 ${totalFollowUps} 处追问建议`
      : '缺少建议追问',
    missingItems: !hasFollowUps ? ['建议生成追问清单以便深入挖掘'] : undefined,
  };
};

/**
 * 检查10：是否区分事实和推测
 */
const checkFactOpinionSeparation: QualityCheckItem['check'] = (context) => {
  const { transcriptText } = context;

  // 检查是否有区分表述
  const factPatterns = [
    /事实是|实际情况|确认为/g,
    /数据显示|记录显示/g,
    /推测|估计|可能|大概/g,
  ];

  const opinionPatterns = [
    /我认为|我估计|我觉得|可能/g,
  ];

  let factCount = 0;
  let opinionCount = 0;

  for (const pattern of factPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      factCount += matches.length;
    }
  }

  for (const pattern of opinionPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      opinionCount += matches.length;
    }
  }

  // 既有事实又有推测时，说明有区分
  const hasSeparation = factCount >= 1 && opinionCount >= 1;
  const score = hasSeparation ? 100 : Math.min(factCount * 30 + opinionCount * 20, 70);

  return {
    passed: hasSeparation || factCount >= 2,
    score,
    details: hasSeparation
      ? '已区分事实和推测'
      : factCount >= 2
        ? '有事实记录，建议明确标注推测内容'
        : '缺少事实和推测的明确区分',
    missingItems: !hasSeparation && factCount < 2 ? ['建议区分事实（已确认）和推测（待验证）'] : undefined,
  };
};

/**
 * 检查11：是否包含验证问题
 */
const checkValidationQuestions: QualityCheckItem['check'] = (context) => {
  const { transcriptText } = context;

  // 检查是否有验证问题
  const validationPatterns = [
    /验证|确认|核实/g,
    /是否.*？|能不能.*？/g,
    /需要回访|待确认/g,
  ];

  let validationCount = 0;
  for (const pattern of validationPatterns) {
    const matches = transcriptText.match(pattern);
    if (matches) {
      validationCount += matches.length;
    }
  }

  const hasValidation = validationCount >= 2;
  const score = Math.min(validationCount * 40, 100);

  return {
    passed: hasValidation,
    score,
    details: hasValidation
      ? `检测到 ${validationCount} 处验证问题`
      : '缺少验证问题',
    missingItems: !hasValidation ? ['建议生成验证问题清单以便二次确认'] : undefined,
  };
};

/**
 * 检查12：是否包含下一步行动
 */
const checkNextSteps: QualityCheckItem['check'] = (context) => {
  const { transcriptText, reportContent } = context;

  const textToCheck = [
    transcriptText,
    reportContent?.prd,
    reportContent?.summary,
  ].filter(Boolean).join('\n');

  // 检查是否有下一步行动
  const nextStepPatterns = [
    /下一步|后续|接下来/g,
    /建议|推荐|方案/g,
    /行动计划|待办|TODO/g,
  ];

  let stepCount = 0;
  for (const pattern of nextStepPatterns) {
    const matches = textToCheck.match(pattern);
    if (matches) {
      stepCount += matches.length;
    }
  }

  const hasSteps = stepCount >= 3;
  const score = Math.min(stepCount * 25, 100);

  return {
    passed: hasSteps,
    score,
    details: hasSteps
      ? `检测到 ${stepCount} 处下一步行动表述`
      : '缺少明确的下一步行动',
    missingItems: !hasSteps ? ['建议添加具体的下一步行动计划'] : undefined,
  };
};

// ============== 检查项配置 ==============

/**
 * 12项质量检查清单
 */
export const QUALITY_CHECK_ITEMS: QualityCheckItem[] = [
  {
    id: 'customer_quotes',
    name: '客户原话引用',
    description: '是否包含客户原话引用（至少3处）',
    category: 'evidence',
    severity: 'critical',
    weight: 10,
    check: checkCustomerQuotes,
    fixSuggestion: '记录更多客户原话，使用引号标注',
  },
  {
    id: 'demand_layers',
    name: '需求分层',
    description: '是否区分表面需求和真实需求',
    category: 'depth',
    severity: 'critical',
    weight: 10,
    check: checkDemandLayers,
    fixSuggestion: '使用L1-L3分层框架，区分表面需求、真实需求、根本需求',
  },
  {
    id: 'quantitative_data',
    name: '量化数据',
    description: '是否包含至少3个量化数据',
    category: 'evidence',
    severity: 'critical',
    weight: 15,
    check: checkQuantitativeData,
    fixSuggestion: '添加具体数字（如"效率提升30%"、"节省2小时/天"）',
  },
  {
    id: 'root_cause_level',
    name: '根本需求追溯',
    description: '是否追溯到L3层级（根本需求）',
    category: 'depth',
    severity: 'critical',
    weight: 15,
    check: checkRootCause,
    fixSuggestion: '使用5Why方法，追溯至少3层"为什么"',
  },
  {
    id: 'root_cause_analysis',
    name: '根因分析',
    description: '是否包含结构化根因分析',
    category: 'depth',
    severity: 'warning',
    weight: 8,
    check: checkRootCauseAnalysis,
    fixSuggestion: '使用鱼骨图或5Why方法进行根因分析',
  },
  {
    id: 'source_attribution',
    name: '信息来源标注',
    description: '是否标注信息来源',
    category: 'evidence',
    severity: 'warning',
    weight: 6,
    check: checkSourceAttribution,
    fixSuggestion: '标注信息来源（如"客户说"、"访谈记录"）',
  },
  {
    id: 'impact_assessment',
    name: '影响范围评估',
    description: '是否包含量化的影响范围评估',
    category: 'completeness',
    severity: 'warning',
    weight: 8,
    check: checkImpactAssessment,
    fixSuggestion: '量化问题影响范围（影响多少人、多少时间、多少成本）',
  },
  {
    id: 'priority_ranking',
    name: '优先级排序',
    description: '是否对需求和痛点进行优先级排序',
    category: 'actionability',
    severity: 'warning',
    weight: 6,
    check: checkPriorityRanking,
    fixSuggestion: '使用P0/P1/P2标注优先级',
  },
  {
    id: 'suggested_follow_ups',
    name: '建议追问',
    description: '是否包含建议追问清单',
    category: 'completeness',
    severity: 'warning',
    weight: 5,
    check: checkSuggestedFollowUps,
    fixSuggestion: '生成追问清单以便深入挖掘',
  },
  {
    id: 'fact_opinion_separation',
    name: '事实与推测区分',
    description: '是否区分事实和推测',
    category: 'evidence',
    severity: 'warning',
    weight: 5,
    check: checkFactOpinionSeparation,
    fixSuggestion: '明确标注哪些是已确认的事实，哪些是待验证的推测',
  },
  {
    id: 'validation_questions',
    name: '验证问题',
    description: '是否包含验证问题清单',
    category: 'completeness',
    severity: 'info',
    weight: 4,
    check: checkValidationQuestions,
    fixSuggestion: '生成验证问题清单以便二次确认',
  },
  {
    id: 'next_steps',
    name: '下一步行动',
    description: '是否包含明确的下一步行动计划',
    category: 'actionability',
    severity: 'info',
    weight: 8,
    check: checkNextSteps,
    fixSuggestion: '添加具体的下一步行动和责任人',
  },
];

// ============== 检查执行函数 ==============

/**
 * 执行质量检查
 */
export function runQualityCheck(context: QualityCheckContext): QualityCheckReport {
  const items: Array<{ item: QualityCheckItem; result: QualityCheckResult }> = [];
  const missingItems: string[] = [];
  const fixSuggestions: string[] = [];

  let totalWeightedScore = 0;
  let totalWeight = 0;

  // 初始化类别得分
  const categoryScores: Record<QualityCheckCategory, number> = {
    completeness: 0,
    depth: 0,
    evidence: 0,
    actionability: 0,
  };

  const categoryWeights: Record<QualityCheckCategory, number> = {
    completeness: 0,
    depth: 0,
    evidence: 0,
    actionability: 0,
  };

  // 执行每项检查
  for (const item of QUALITY_CHECK_ITEMS) {
    const result = item.check(context);
    items.push({ item, result });

    totalWeightedScore += result.score * item.weight;
    totalWeight += item.weight;

    // 累计类别得分
    categoryScores[item.category] += result.score * item.weight;
    categoryWeights[item.category] += item.weight;

    // 收集缺失项和修复建议
    if (!result.passed) {
      if (result.missingItems) {
        missingItems.push(...result.missingItems);
      }
      fixSuggestions.push(item.fixSuggestion);
    }
  }

  // 计算各类别平均分
  for (const category of Object.keys(categoryScores) as QualityCheckCategory[]) {
    if (categoryWeights[category] > 0) {
      categoryScores[category] = Math.round(categoryScores[category] / categoryWeights[category]);
    }
  }

  // 计算总分
  const totalScore = Math.round(totalWeightedScore / totalWeight);

  // 判断是否整体通过（critical级别的必须全部通过）
  const criticalItems = items.filter(({ item }) => item.severity === 'critical');
  const criticalPassed = criticalItems.every(({ result }) => result.passed);

  // 或者总分 >= 70 且 critical 全部通过
  const overallPassed = criticalPassed && totalScore >= 70;

  return {
    overallPassed,
    totalScore,
    items,
    categoryScores,
    missingItems,
    fixSuggestions,
    checkedAt: new Date(),
  };
}

/**
 * 获取质量等级
 */
export function getQualityGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 90) return { grade: 'A', label: '优秀', color: 'text-green-600' };
  if (score >= 80) return { grade: 'B', label: '良好', color: 'text-blue-600' };
  if (score >= 70) return { grade: 'C', label: '合格', color: 'text-yellow-600' };
  if (score >= 60) return { grade: 'D', label: '待改进', color: 'text-orange-600' };
  return { grade: 'F', label: '不合格', color: 'text-red-600' };
}

/**
 * 类别显示名称
 */
export const CATEGORY_LABELS: Record<QualityCheckCategory, string> = {
  completeness: '完整性',
  depth: '深度',
  evidence: '依据性',
  actionability: '可操作性',
};

/**
 * 类别颜色
 */
export const CATEGORY_COLORS: Record<QualityCheckCategory, { bg: string; text: string }> = {
  completeness: { bg: 'bg-blue-50', text: 'text-blue-700' },
  depth: { bg: 'bg-purple-50', text: 'text-purple-700' },
  evidence: { bg: 'bg-green-50', text: 'text-green-700' },
  actionability: { bg: 'bg-orange-50', text: 'text-orange-700' },
};
