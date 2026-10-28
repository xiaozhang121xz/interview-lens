/**
 * Tiptap AI编辑器 - Zustand Store
 */

import { create } from 'zustand';
import { Editor } from '@tiptap/react';

interface AIEditorState {
  // 编辑器实例
  editor: Editor | null;

  // AI操作状态
  isAILoading: boolean;
  currentAIOperation: string | null;

  // 选中的文本
  selectedText: string;
  selectedRange: { from: number; to: number } | null;

  // AI操作历史
  operationHistory: Array<{
    id: string;
    operation: string;
    originalText: string;
    resultText: string;
    timestamp: Date;
  }>;

  // Actions
  setEditor: (editor: Editor | null) => void;
  setAILoading: (loading: boolean) => void;
  setCurrentAIOperation: (operation: string | null) => void;
  setSelectedText: (text: string, range?: { from: number; to: number }) => void;
  addOperationToHistory: (
    operation: string,
    originalText: string,
    resultText: string
  ) => void;
  clearHistory: () => void;
}

export const useAIEditorStore = create<AIEditorState>((set) => ({
  // 初始状态
  editor: null,
  isAILoading: false,
  currentAIOperation: null,
  selectedText: '',
  selectedRange: null,
  operationHistory: [],

  // Actions
  setEditor: (editor) => set({ editor }),

  setAILoading: (loading) => set({ isAILoading: loading }),

  setCurrentAIOperation: (operation) => set({ currentAIOperation: operation }),

  setSelectedText: (text, range) =>
    set({
      selectedText: text,
      selectedRange: range || null,
    }),

  addOperationToHistory: (operation, originalText, resultText) =>
    set((state) => ({
      operationHistory: [
        ...state.operationHistory,
        {
          id: Date.now().toString(),
          operation,
          originalText,
          resultText,
          timestamp: new Date(),
        },
      ].slice(-10), // 只保留最近10条记录
    })),

  clearHistory: () => set({ operationHistory: [] }),
}));
