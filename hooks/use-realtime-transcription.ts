/**
 * 实时转写 React Hook
 *
 * 使用 Web Speech API（浏览器原生语音识别）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeTranscriptionStore } from '@/stores/features/realtime-transcription-store';
import type { TranscriptionResult } from '@/lib/realtime/types';

// ============== Hook 接口 ==============

interface UseRealtimeTranscriptionOptions {
  /** 语言 */
  language?: string;
  /** 转写结果回调 */
  onTranscript?: (result: TranscriptionResult) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

interface UseRealtimeTranscriptionReturn {
  // 状态
  isRecording: boolean;
  currentText: string;
  transcripts: TranscriptionResult[];
  error: string | null;

  // 录音控制
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => Promise<void>;

  // 其他控制
  clearTranscripts: () => void;
}

// ============== Web Speech API 实现 ==============

export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions = {}
): UseRealtimeTranscriptionReturn {
  const {
    language = 'zh-CN',
    onTranscript,
    onError,
  } = options;

  const store = useRealtimeTranscriptionStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState('');

  // 回调包装
  const handleTranscript = useCallback(
    (result: TranscriptionResult) => {
      store.addTranscript(result);
      onTranscript?.(result);
    },
    [store, onTranscript]
  );

  const handleError = useCallback(
    (error: Error) => {
      store.setError(error.message);
      onError?.(error);
    },
    [store, onError]
  );

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      // 检查浏览器支持
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        throw new Error('浏览器不支持语音识别，请使用 Chrome 或 Edge');
      }

      // 创建识别实例
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition: any = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      let transcriptId = `web-${Date.now()}`;
      let accumulatedText = '';

      recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; [key: number]: { transcript: string } } } }) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          handleTranscript({
            id: transcriptId,
            text: finalTranscript.trim(),
            isFinal: true,
            timestamp: new Date(),
            language,
          });
          transcriptId = `web-${Date.now()}`;
          accumulatedText = '';
        }

        if (interimTranscript) {
          accumulatedText += interimTranscript;
          setCurrentText(accumulatedText);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        console.error('Web Speech error:', event.error);
        const errorMessages: Record<string, string> = {
          'not-allowed': '请允许麦克风权限',
          'no-speech': '未检测到语音输入',
          'audio-capture': '无法访问麦克风',
          network: '网络错误，请检查网络连接',
          'service-not-allowed': '语音识别服务不可用',
        };
        handleError(new Error(errorMessages[event.error] || `语音识别错误: ${event.error}`));
      };

      recognition.onend = () => {
        if (isRecording) {
          // 如果还在录音状态，尝试重新开始
          try {
            recognition.start();
          } catch {
            setIsRecording(false);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      store.setIsRecording(true);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [isRecording, language, handleTranscript, handleError, store]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setCurrentText('');
    store.setIsRecording(false);
  }, [store]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // 清空转写
  const clearTranscripts = useCallback(() => {
    store.clearTranscripts();
  }, [store]);

  // 清理
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    currentText,
    transcripts: store.transcripts,
    error: store.error,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscripts,
  };
}

// ============== 类型导出 ==============

export type { TranscriptionResult };