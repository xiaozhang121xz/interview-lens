/**
 * 痛点信号词检测 React Hook
 *
 * 用于在转写文本中实时检测痛点信号词
 */

import { useMemo, useCallback } from 'react';
import {
  detectPainPointSignals,
  calculatePainPointIntensity,
  getHighPrioritySignals,
  highlightSignalsInText,
  type DetectedPainPointSignal,
  type SignalWordType,
  SIGNALS_BY_TYPE,
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_COLORS,
} from '@/lib/constants/pain-point-signals';

// ============== Hook 接口 ==============

interface UsePainPointDetectionOptions {
  /** 是否启用检测 */
  enabled?: boolean;
  /** 上下文长度 */
  contextLength?: number;
  /** 高优先级信号数量限制 */
  priorityLimit?: number;
}

interface UsePainPointDetectionReturn {
  /** 检测到的所有信号 */
  signals: DetectedPainPointSignal[];
  /** 高优先级信号 */
  highPrioritySignals: DetectedPainPointSignal[];
  /** 痛点强度评分（0-100） */
  intensity: number;
  /** 各类型信号数量统计 */
  typeStats: Record<SignalWordType, number>;
  /** 高亮后的文本 */
  highlightedText: string;
  /** 手动检测函数 */
  detect: (text: string) => DetectedPainPointSignal[];
  /** 获取建议追问列表 */
  getSuggestedFollowUps: () => string[];
}

// ============== Hook 实现 ==============

export function usePainPointDetection(
  text: string,
  options: UsePainPointDetectionOptions = {}
): UsePainPointDetectionReturn {
  const {
    enabled = true,
    contextLength = 20,
    priorityLimit = 3,
  } = options;

  // 检测信号词
  const signals = useMemo(() => {
    if (!enabled || !text) return [];
    return detectPainPointSignals(text, contextLength);
  }, [text, enabled, contextLength]);

  // 高优先级信号
  const highPrioritySignals = useMemo(() => {
    return getHighPrioritySignals(signals, priorityLimit);
  }, [signals, priorityLimit]);

  // 痛点强度评分
  const intensity = useMemo(() => {
    return calculatePainPointIntensity(signals);
  }, [signals]);

  // 各类型统计
  const typeStats = useMemo(() => {
    const stats: Record<SignalWordType, number> = {
      transition: 0,
      degree: 0,
      frequency: 0,
      emotion: 0,
    };

    for (const signal of signals) {
      stats[signal.type]++;
    }

    return stats;
  }, [signals]);

  // 高亮文本
  const highlightedText = useMemo(() => {
    if (!enabled || !text) return text;
    return highlightSignalsInText(text, signals);
  }, [text, enabled, signals]);

  // 手动检测
  const detect = useCallback((newText: string) => {
    return detectPainPointSignals(newText, contextLength);
  }, [contextLength]);

  // 获取建议追问
  const getSuggestedFollowUps = useCallback(() => {
    const followUps: string[] = [];
    const uniqueFollowUps = new Set<string>();

    for (const signal of highPrioritySignals) {
      if (signal.suggestedFollowUp && !uniqueFollowUps.has(signal.suggestedFollowUp)) {
        followUps.push(signal.suggestedFollowUp);
        uniqueFollowUps.add(signal.suggestedFollowUp);
      }
    }

    return followUps;
  }, [highPrioritySignals]);

  return {
    signals,
    highPrioritySignals,
    intensity,
    typeStats,
    highlightedText,
    detect,
    getSuggestedFollowUps,
  };
}

// ============== 辅助函数导出 ==============

export {
  SIGNALS_BY_TYPE,
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_COLORS,
};

export type { SignalWordType, DetectedPainPointSignal };