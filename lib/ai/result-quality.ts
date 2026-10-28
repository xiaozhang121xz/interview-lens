const EVIDENCE_MARKER = /\[(?:R|T)\d+\]|\[待确认\]/;

function evidenceCoverage(values: string[]): number {
  if (values.length === 0) return 1;
  return values.filter((value) => EVIDENCE_MARKER.test(value)).length / values.length;
}

export function validateSummaryQuality(value: unknown): string[] {
  const data = value as {
    summary?: string;
    keyPoints?: string[];
    painPoints?: string[];
    requirements?: string[];
    risks?: string[];
    nextSteps?: string[];
  };
  const issues: string[] = [];
  const evidenceItems = [
    ...(data.keyPoints || []),
    ...(data.painPoints || []),
    ...(data.requirements || []),
    ...(data.risks || []),
  ];
  if (!data.summary || data.summary.trim().length < 40) {
    issues.push('summary 过短，无法形成可用纪要');
  }
  if (evidenceCoverage(evidenceItems) < 0.8) {
    issues.push('至少 80% 的事实、痛点、需求和风险必须带 [R#]/[T#] 证据或 [待确认]');
  }
  if ((data.nextSteps || []).length === 0) {
    issues.push('至少给出一个明确的下一步行动');
  }
  return issues;
}

export function validatePRDQuality(value: unknown): string[] {
  const content = String((value as { content?: unknown })?.content || '');
  const issues: string[] = [];
  if (content.length < 800) issues.push('PRD 内容过短，至少应形成可评审的完整初稿');
  if (!EVIDENCE_MARKER.test(content)) issues.push('PRD 未引用任何访谈证据编号');
  if (!/验收标准/.test(content)) issues.push('PRD 缺少可验证的验收标准');
  if (!/(非目标|范围外)/.test(content)) issues.push('PRD 缺少非目标或范围外说明');
  if (!/(待确认|假设|信息缺口)/.test(content)) issues.push('PRD 未区分待确认项或假设');
  return issues;
}

export function validatePersonaQuality(value: unknown): string[] {
  const data = value as {
    goals?: string[];
    painPoints?: string[];
    behaviors?: string[];
    quotes?: string[];
  };
  const issues: string[] = [];
  const claims = [
    ...(data.goals || []),
    ...(data.painPoints || []),
    ...(data.behaviors || []),
  ];
  if (claims.length === 0) issues.push('画像缺少目标、痛点或行为证据');
  if (evidenceCoverage(claims) < 0.8) {
    issues.push('至少 80% 的画像结论必须带证据编号或 [待确认]');
  }
  if ((data.quotes || []).length === 0) issues.push('画像至少应保留一条访谈原话');
  return issues;
}

export function validateJourneyQuality(value: unknown): string[] {
  const data = value as {
    stages?: Array<{ description?: string }>;
    actions?: Array<{ detail?: string }>;
    painPoints?: Array<{ painPoint?: string }>;
  };
  const issues: string[] = [];
  if ((data.stages || []).length < 3) issues.push('旅程阶段少于 3 个');
  const claims = [
    ...(data.stages || []).map((item) => item.description || ''),
    ...(data.actions || []).map((item) => item.detail || ''),
    ...(data.painPoints || []).map((item) => item.painPoint || ''),
  ].filter(Boolean);
  if (evidenceCoverage(claims) < 0.7) {
    issues.push('至少 70% 的旅程阶段、行为和痛点必须带证据编号或 [待确认]');
  }
  return issues;
}

