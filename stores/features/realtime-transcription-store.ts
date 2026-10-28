/**
 * 实时转写状态管理 - Zustand Store
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  TranscriptionResult,
  TranscriptionModel,
} from '@/lib/realtime/types';
import { TRANSCRIPTION_MODELS, DEFAULT_MODEL } from '@/lib/realtime/config';

// ============== Store 接口 ==============

interface RealtimeTranscriptionState {
  // 连接状态
  error: string | null;

  // 模型选择
  selectedModel: string;
  availableModels: TranscriptionModel[];

  // 转写结果
  transcripts: TranscriptionResult[];
  currentText: string;

  // 音频状态
  isRecording: boolean;
  isMuted: boolean;

  // 统计信息
  totalDuration: number; // 总录音时长（秒）
  transcriptCount: number; // 转写条目数
}

interface RealtimeTranscriptionActions {
  // 状态管理
  setError: (error: string | null) => void;
  clearError: () => void;

  // 模型选择
  setSelectedModel: (modelId: string) => void;

  // 转写管理
  addTranscript: (result: TranscriptionResult) => void;
  updateCurrentText: (text: string) => void;
  clearCurrentText: () => void;
  clearTranscripts: () => void;

  // 音频控制
  setIsRecording: (recording: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;

  // 统计更新
  incrementDuration: (seconds: number) => void;
  resetStats: () => void;

  // 重置全部
  reset: () => void;
}

type RealtimeTranscriptionStore = RealtimeTranscriptionState & RealtimeTranscriptionActions;

// ============== 初始状态 ==============

const initialState: RealtimeTranscriptionState = {
  error: null,
  selectedModel: DEFAULT_MODEL,
  availableModels: TRANSCRIPTION_MODELS,
  transcripts: [],
  currentText: '',
  isRecording: false,
  isMuted: false,
  totalDuration: 0,
  transcriptCount: 0,
};

// ============== Store 创建 ==============

export const useRealtimeTranscriptionStore = create<RealtimeTranscriptionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 状态管理
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // 模型选择
      setSelectedModel: (modelId) => {
        const { availableModels } = get();
        if (availableModels.some((m) => m.id === modelId)) {
          set({ selectedModel: modelId });
        }
      },

      // 转写管理
      addTranscript: (result) => {
        set((state) => ({
          transcripts: [...state.transcripts, result],
          transcriptCount: state.transcriptCount + 1,
          // 如果是最终结果，清空当前文本
          currentText: result.isFinal ? '' : result.text,
        }));
      },

      updateCurrentText: (text) => {
        set({ currentText: text });
      },

      clearCurrentText: () => {
        set({ currentText: '' });
      },

      clearTranscripts: () => {
        set({
          transcripts: [],
          currentText: '',
          transcriptCount: 0,
        });
      },

      // 音频控制
      setIsRecording: (recording) => {
        set({ isRecording: recording });
      },

      setIsMuted: (muted) => {
        set({ isMuted: muted });
      },

      toggleMute: () => {
        set((state) => ({ isMuted: !state.isMuted }));
      },

      // 统计更新
      incrementDuration: (seconds) => {
        set((state) => ({
          totalDuration: state.totalDuration + seconds,
        }));
      },

      resetStats: () => {
        set({
          totalDuration: 0,
          transcriptCount: 0,
        });
      },

      // 重置全部
      reset: () => {
        set({
          ...initialState,
          // 保留用户偏好
          selectedModel: get().selectedModel,
        });
      },
    }),
    {
      name: 'realtime-transcription-state',
      storage: createJSONStorage(() => localStorage),
      // 只持久化用户偏好
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      }),
    }
  )
);

// ============== 选择器 ==============

/** 获取当前选中的模型配置 */
export const useSelectedModelConfig = () => {
  const { selectedModel, availableModels } = useRealtimeTranscriptionStore();
  return availableModels.find((m) => m.id === selectedModel);
};

/** 判断是否可以开始录音 */
export const useCanStartRecording = () => {
  const { isRecording } = useRealtimeTranscriptionStore();
  return !isRecording;
};