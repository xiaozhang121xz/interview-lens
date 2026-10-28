/**
 * KANO 需求分类 React Hook
 *
 * 用于对需求进行 KANO 模型分类
 */

import { useMemo, useCallback } from 'react';
import {
  classifyRequirementByText,
  categorizeRequirementsByKANO,
  sortRequirementsByPriority,
  getKANOStatistics,
  generateKANOVerificationQuestions,
  type KANOCategorizedRequirement,
  type KANOType,
  type KANOQuestion,
  KANO_TYPE_CONFIG,
} from '@/lib/constants/kano-classification';

// ============== Hook 接口 ==============

interface UseKANOCategorizationOptions {
  /** 需求列表 */
  requirements: Array<{
    id: string;
    description: string;
    customerQuotes?: string[];
  }>;
  /** 是否自动排序 */
  autoSort?: boolean;
}

interface UseKANOCategorizationReturn {
  /** 分类后的需求列表 */
  categorizedRequirements: KANOCategorizedRequirement[];
  /** 统计数据 */
  statistics: {
    total: number;
    byType: Record<KANOType, number>;
    byPriority: Record<'P0' | 'P1' | 'P2', number>;
  };
  /** 各类型配置 */
  typeConfig: typeof KANO_TYPE_CONFIG;
  /** 手动分类单个需求 */
  classifyOne: (description: string, customerQuotes?: string[]) => {
    type: KANOType;
    confidence: number;
    reasoning: string;
  };
  /** 生成验证问题 */
  generateQuestions: (feature: string) => KANOQuestion[];
  /** 按类型筛选 */
  filterByType: (type: KANOType) => KANOCategorizedRequirement[];
  /** 按优先级筛选 */
  filterByPriority: (priority: 'P0' | 'P1' | 'P2') => KANOCategorizedRequirement[];
}

// ============== Hook 实现 ==============

export function useKANOCategorization(
  options: UseKANOCategorizationOptions
): UseKANOCategorizationReturn {
  const { requirements, autoSort = true } = options;

  // 分类需求
  const categorizedRequirements = useMemo(() => {
    const categorized = categorizeRequirementsByKANO(requirements);
    return autoSort ? sortRequirementsByPriority(categorized) : categorized;
  }, [requirements, autoSort]);

  // 统计数据
  const statistics = useMemo(() => {
    return getKANOStatistics(categorizedRequirements);
  }, [categorizedRequirements]);

  // 手动分类单个需求
  const classifyOne = useCallback(
    (description: string, customerQuotes?: string[]) => {
      return classifyRequirementByText(description, customerQuotes);
    },
    []
  );

  // 生成验证问题
  const generateQuestions = useCallback((feature: string) => {
    return generateKANOVerificationQuestions(feature);
  }, []);

  // 按类型筛选
  const filterByType = useCallback(
    (type: KANOType) => {
      return categorizedRequirements.filter((r) => r.kanoType === type);
    },
    [categorizedRequirements]
  );

  // 按优先级筛选
  const filterByPriority = useCallback(
    (priority: 'P0' | 'P1' | 'P2') => {
      return categorizedRequirements.filter((r) => r.priority === priority);
    },
    [categorizedRequirements]
  );

  return {
    categorizedRequirements,
    statistics,
    typeConfig: KANO_TYPE_CONFIG,
    classifyOne,
    generateQuestions,
    filterByType,
    filterByPriority,
  };
}

// ============== 辅助导出 ==============

export { KANO_TYPE_CONFIG };
export type { KANOCategorizedRequirement, KANOType, KANOQuestion };