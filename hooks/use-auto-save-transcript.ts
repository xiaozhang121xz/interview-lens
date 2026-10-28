/**
 * 自动保存转写内容 Hook
 *
 * @module hooks/use-auto-save-transcript
 * @description 监听转写内容变化，自动保存到数据库，支持断点续传
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiInstance } from '@/lib/apiCreator';

// ============================================
// 类型定义
// ============================================

export interface TranscriptItem {
  id: string;
  content: string;
  speaker?: string | null;
  confidence?: number | null;
  sessionId?: string | null;
  isKeyPoint: boolean;
  outlineId?: string | null;
  createdAt: string;
}

export interface UseAutoSaveTranscriptOptions {
  /** 访谈项目ID */
  interviewId: string;
  /** 当前会话ID（阶段三新增） */
  sessionId?: string | null;
  /** 防抖延迟（毫秒），默认 500ms */
  debounceMs?: number;
  /** 是否启用自动保存，默认 true */
  enabled?: boolean;
  /** 保存成功回调 */
  onSaveSuccess?: (transcript: TranscriptItem) => void;
  /** 保存失败回调 */
  onSaveError?: (error: Error) => void;
}

export interface UseAutoSaveTranscriptReturn {
  /** 是否正在保存 */
  isSaving: boolean;
  /** 最后保存时间 */
  lastSavedAt: Date | null;
  /** 保存错误 */
  saveError: Error | null;
  /** 历史转写记录（断点续传） */
  history: TranscriptItem[];
  /** 是否正在加载历史记录 */
  isLoadingHistory: boolean;
  /** 手动保存当前转写 */
  saveTranscript: (content: string, options?: {
    speaker?: string;
    confidence?: number;
    /** 关联的提纲问题ID（双向联动） */
    outlineId?: string;
    /** 关联的会话ID（阶段三新增） */
    sessionId?: string;
  }) => Promise<void>;
  /** 加载历史记录 */
  loadHistory: (options?: { sessionId?: string }) => Promise<void>;
  /** 清空历史记录 */
  clearHistory: () => Promise<void>;
}

// ============================================
// Hook 实现
// ============================================

export function useAutoSaveTranscript(
  options: UseAutoSaveTranscriptOptions
): UseAutoSaveTranscriptReturn {
  const {
    interviewId,
    sessionId: currentSessionId,
    debounceMs = 500,
    enabled = true,
    onSaveSuccess,
    onSaveError,
  } = options;

  // 状态
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [history, setHistory] = useState<TranscriptItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // 保存转写内容
  // ============================================

  const saveTranscript = useCallback(async (
    content: string,
    saveOptions?: {
      speaker?: string;
      confidence?: number;
      outlineId?: string;
      sessionId?: string;
    }
  ) => {
    if (!content.trim() || !interviewId) {
      return;
    }

    // 取消之前的请求（静默取消，不触发控制台警告）
    if (abortControllerRef.current) {
      // 先标记为已取消，避免 AbortController.abort() 产生未捕获的 rejection
      const prevController = abortControllerRef.current;
      abortControllerRef.current = null;
      prevController.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSaving(true);
    setSaveError(null);

    // 优先使用传入的 sessionId，否则使用当前会话ID
    const effectiveSessionId = saveOptions?.sessionId ?? currentSessionId;

    try {
      const response = await apiInstance.post(
        `/interviews/${interviewId}/transcripts`,
        {
          content,
          speaker: saveOptions?.speaker,
          confidence: saveOptions?.confidence,
          outlineId: saveOptions?.outlineId,
          sessionId: effectiveSessionId,
        },
        { signal: abortControllerRef.current.signal }
      );

      if (response.data?.success) {
        const savedItem = response.data.data;
        setLastSavedAt(new Date());
        setHistory(prev => [...prev, savedItem]);
        onSaveSuccess?.(savedItem);
      }
    } catch (error) {
      // 静默处理取消错误（正常行为，避免控制台警告）
      if (error instanceof Error) {
        const errorName = error.name;
        // Axios 可能使用 CanceledError 或 AbortError
        if (errorName === 'CanceledError' || errorName === 'AbortError') {
          return;
        }
      }

      const err = error instanceof Error ? error : new Error('保存失败');
      setSaveError(err);
      onSaveError?.(err);
      console.error('[AutoSave] 保存转写失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [interviewId, currentSessionId, onSaveSuccess, onSaveError]);

  // ============================================
  // 防抖保存
  // ============================================

  const debouncedSave = useCallback((content: string) => {
    pendingContentRef.current = content;

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      if (pendingContentRef.current.trim() && enabled) {
        saveTranscript(pendingContentRef.current);
        pendingContentRef.current = '';
      }
    }, debounceMs);
  }, [debounceMs, enabled, saveTranscript]);

  // ============================================
  // 加载历史记录（断点续传）
  // ============================================

  const loadHistory = useCallback(async (options?: { sessionId?: string }) => {
    if (!interviewId) {
      return;
    }

    setIsLoadingHistory(true);

    try {
      // 构建 URL 参数
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (options?.sessionId) {
        params.append('sessionId', options.sessionId);
      }

      const response = await apiInstance.get(
        `/interviews/${interviewId}/transcripts?${params.toString()}`
      );

      if (response.data?.success) {
        setHistory(response.data.data.transcripts);
      }
    } catch (error) {
      console.error('[AutoSave] 加载历史转写失败:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [interviewId]);

  // ============================================
  // 清空历史记录
  // ============================================

  const clearHistory = useCallback(async () => {
    if (!interviewId) {
      return;
    }

    try {
      await apiInstance.delete(`/interviews/${interviewId}/transcripts`);
      setHistory([]);
    } catch (error) {
      console.error('[AutoSave] 清空历史转写失败:', error);
      throw error;
    }
  }, [interviewId]);

  // ============================================
  // 清理定时器
  // ============================================

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // 初始化加载历史记录
  // ============================================

  useEffect(() => {
    if (interviewId && enabled) {
      loadHistory();
    }
  }, [interviewId, enabled, loadHistory]);

  return {
    isSaving,
    lastSavedAt,
    saveError,
    history,
    isLoadingHistory,
    saveTranscript,
    loadHistory,
    clearHistory,
  };
}

// ============================================
// 辅助 Hook: 监听转写变化并自动保存
// ============================================

export interface UseTranscriptAutoSaveOptions extends UseAutoSaveTranscriptOptions {
  /** 当前转写内容（来自语音识别） */
  transcript: string;
  /** 是否为最终结果 */
  isFinal?: boolean;
}

/**
 * 监听转写内容变化并自动保存的 Hook
 * 当 isFinal 为 true 时立即保存，否则防抖保存
 */
export function useTranscriptAutoSave(
  options: UseTranscriptAutoSaveOptions
): UseAutoSaveTranscriptReturn {
  const { transcript, isFinal, ...baseOptions } = options;
  const autoSave = useAutoSaveTranscript(baseOptions);

  // 获取当前的 sessionId 用于保存
  const currentSessionId = baseOptions.sessionId;

  // 监听 transcript 变化
  useEffect(() => {
    if (!transcript.trim() || !baseOptions.enabled) {
      return;
    }

    // 最终结果立即保存
    if (isFinal) {
      autoSave.saveTranscript(transcript, { sessionId: currentSessionId ?? undefined });
    }
    // 非最终结果防抖保存（用于持久化中间状态）
    // 注意：实际使用中可能不需要保存非最终结果，根据需求调整
  }, [transcript, isFinal, baseOptions.enabled, currentSessionId, autoSave]);

  return autoSave;
}

export default useAutoSaveTranscript;