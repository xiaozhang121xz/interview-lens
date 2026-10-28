/**
 * 输出质量检查 React Hook
 *
 * 用于检查访谈输出是否符合 PRD 要求的质量标准
 */

import { useMemo, useCallback } from 'react';
import {
  runQualityCheck,
  getQualityGrade,
  type QualityCheckContext,
  type QualityCheckReport,
  type QualityCheckCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/lib/constants/quality-check';

// ============== Hook 接口 ==============

interface UseQualityCheckOptions {
  /** 是否启用检查 */
  enabled?: boolean;
}

interface UseQualityCheckReturn {
  /** 检查报告 */
  report: QualityCheckReport | null;
  /** 质量等级 */
  grade: { grade: string; label: string; color: string } | null;
  /** 是否通过 */
  passed: boolean;
  /** 总分 */
  score: number;
  /** 各类别得分 */
  categoryScores: Record<QualityCheckCategory, number>;
  /** 缺失项数量 */
  missingCount: number;
  /** 手动检查函数 */
  check: (context: QualityCheckContext) => QualityCheckReport;
}

// ============== Hook 实现 ==============

export function useQualityCheck(
  context: QualityCheckContext | null,
  options: UseQualityCheckOptions = {}
): UseQualityCheckReturn {
  const { enabled = true } = options;

  // 执行检查
  const report = useMemo(() => {
    if (!enabled || !context) return null;
    return runQualityCheck(context);
  }, [enabled, context]);

  // 质量等级
  const grade = useMemo(() => {
    if (!report) return null;
    return getQualityGrade(report.totalScore);
  }, [report]);

  // 是否通过
  const passed = useMemo(() => {
    return report?.overallPassed ?? false;
  }, [report]);

  // 总分
  const score = useMemo(() => {
    return report?.totalScore ?? 0;
  }, [report]);

  // 各类别得分
  const categoryScores = useMemo(() => {
    return report?.categoryScores ?? {
      completeness: 0,
      depth: 0,
      evidence: 0,
      actionability: 0,
    };
  }, [report]);

  // 缺失项数量
  const missingCount = useMemo(() => {
    return report?.missingItems.length ?? 0;
  }, [report]);

  // 手动检查
  const check = useCallback((newContext: QualityCheckContext) => {
    return runQualityCheck(newContext);
  }, []);

  return {
    report,
    grade,
    passed,
    score,
    categoryScores,
    missingCount,
    check,
  };
}

// ============== 辅助导出 ==============

export { CATEGORY_LABELS, CATEGORY_COLORS };
export type { QualityCheckContext, QualityCheckReport, QualityCheckCategory };