/**
 * 追问链追踪 React Hook
 *
 * 用于管理和追踪 5Why 追问链状态
 */

import { useState, useCallback, useMemo } from 'react';
import {
  createFollowUpChain,
  addFollowUpNode,
  checkFollowUpChainWarnings,
  generateFollowUpSuggestion,
  calculateChainCompleteness,
  type FollowUpChainState,
  type FollowUpChainNode,
  type FollowUpWarning,
  FIVE_WHY_TEMPLATES,
} from '@/lib/constants/follow-up-chain';

// ============== Hook 接口 ==============

interface UseFollowUpChainOptions {
  /** 初始追问链列表 */
  initialChains?: FollowUpChainState[];
  /** 最小深度要求 */
  minimumDepth?: number;
}

interface UseFollowUpChainReturn {
  /** 所有追问链 */
  chains: FollowUpChainState[];
  /** 当前活跃的追问链 */
  activeChain: FollowUpChainState | null;
  /** 所有警告 */
  warnings: FollowUpWarning[];
  /** 未解决的警告数量 */
  unresolvedWarningsCount: number;
  /** 平均完整度 */
  averageCompleteness: number;

  // 操作方法
  /** 创建新追问链 */
  createChain: (rootIssue: string) => FollowUpChainState;
  /** 设置活跃追问链 */
  setActiveChain: (chainId: string) => void;
  /** 添加追问 */
  addFollowUp: (chainId: string, question: string, answer?: string) => void;
  /** 获取追问建议 */
  getSuggestion: (chainId: string) => string;
  /** 获取警告 */
  getWarnings: (chainId: string) => FollowUpWarning[];
  /** 删除追问链 */
  deleteChain: (chainId: string) => void;
  /** 清空所有追问链 */
  clearAllChains: () => void;
}

// ============== Hook 实现 ==============

export function useFollowUpChain(
  options: UseFollowUpChainOptions = {}
): UseFollowUpChainReturn {
  const { initialChains = [], minimumDepth = 3 } = options;

  const [chains, setChains] = useState<FollowUpChainState[]>(initialChains);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);

  // 获取活跃追问链
  const activeChain = useMemo(() => {
    return chains.find((c) => c.chainId === activeChainId) || null;
  }, [chains, activeChainId]);

  // 计算所有警告
  const warnings = useMemo(() => {
    return chains.flatMap((chain) => checkFollowUpChainWarnings(chain));
  }, [chains]);

  // 未解决的警告数量
  const unresolvedWarningsCount = useMemo(() => {
    return warnings.filter((w) => w.type === 'insufficient_depth' || w.type === 'no_root_cause').length;
  }, [warnings]);

  // 平均完整度
  const averageCompleteness = useMemo(() => {
    if (chains.length === 0) return 0;
    const total = chains.reduce((sum, chain) => sum + calculateChainCompleteness(chain), 0);
    return Math.round(total / chains.length);
  }, [chains]);

  // 创建新追问链
  const createChain = useCallback((rootIssue: string) => {
    const newChain = createFollowUpChain(rootIssue);
    setChains((prev) => [...prev, newChain]);
    setActiveChainId(newChain.chainId);
    return newChain;
  }, []);

  // 设置活跃追问链
  const setActiveChain = useCallback((chainId: string) => {
    setActiveChainId(chainId);
  }, []);

  // 添加追问
  const addFollowUp = useCallback(
    (chainId: string, question: string, answer?: string) => {
      setChains((prev) =>
        prev.map((chain) => {
          if (chain.chainId !== chainId) return chain;
          return addFollowUpNode(chain, question, answer);
        })
      );
    },
    []
  );

  // 获取追问建议
  const getSuggestion = useCallback(
    (chainId: string) => {
      const chain = chains.find((c) => c.chainId === chainId);
      if (!chain) return '';
      return generateFollowUpSuggestion(chain);
    },
    [chains]
  );

  // 获取警告
  const getWarnings = useCallback(
    (chainId: string) => {
      const chain = chains.find((c) => c.chainId === chainId);
      if (!chain) return [];
      return checkFollowUpChainWarnings(chain);
    },
    [chains]
  );

  // 删除追问链
  const deleteChain = useCallback((chainId: string) => {
    setChains((prev) => prev.filter((c) => c.chainId !== chainId));
    if (activeChainId === chainId) {
      setActiveChainId(null);
    }
  }, [activeChainId]);

  // 清空所有追问链
  const clearAllChains = useCallback(() => {
    setChains([]);
    setActiveChainId(null);
  }, []);

  return {
    chains,
    activeChain,
    warnings,
    unresolvedWarningsCount,
    averageCompleteness,
    createChain,
    setActiveChain,
    addFollowUp,
    getSuggestion,
    getWarnings,
    deleteChain,
    clearAllChains,
  };
}

// ============== 辅助导出 ==============

export { FIVE_WHY_TEMPLATES };
export type { FollowUpChainState, FollowUpChainNode, FollowUpWarning };