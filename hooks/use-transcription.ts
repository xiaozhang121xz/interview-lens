/**
 * 统一转写 Hook
 *
 * 使用 Web Speech API（浏览器原生语音识别）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from './use-speech-recognition';

// ============== 类型定义 ==============

export interface UseTranscriptionOptions {
  /** 识别语言 */
  language?: string;
  /** 是否连续识别 */
  continuous?: boolean;
  /** 是否返回临时结果 */
  interimResults?: boolean;
  /** 转写结果回调 */
  onResult?: (transcript: string, isFinal: boolean) => void;
  /** 错误回调 */
  onError?: (error: string) => void;
  /** 开始回调 */
  onStart?: () => void;
  /** 结束回调 */
  onEnd?: () => void;
}

export interface UseTranscriptionReturn {
  /** 实时转写文本 */
  transcript: string;
  /** 是否正在监听 */
  isListening: boolean;
  /** 是否支持语音识别 */
  isSupported: boolean;
  /** 错误信息 */
  error: string | null;
  /** 开始录音 */
  start: () => void;
  /** 停止录音 */
  stop: () => void;
  /** 暂停录音 */
  pause: () => void;
  /** 恢复录音 */
  resume: () => void;
  /** 重置 */
  reset: () => void;
}

// ============== Hook 实现 ==============

export function useTranscription(
  options: UseTranscriptionOptions = {}
): UseTranscriptionReturn {
  const {
    language = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  // 本地状态
  const [transcript, setTranscript] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // 使用 ref 存储回调，避免作为 useEffect 依赖（解决无限更新循环）
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);

  // 同步更新 ref
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  });

  // ============== Web Speech 模式 ==============

  const webSpeech = useSpeechRecognition({
    language,
    continuous,
    interimResults,
    onResult: (text, isFinal) => {
      setTranscript(text);
      onResultRef.current?.(text, isFinal);
    },
    onError: (error) => {
      setLocalError(error);
      onErrorRef.current?.(error);
    },
    onStart: () => {
      onStartRef.current?.();
    },
    onEnd: () => {
      onEndRef.current?.();
    },
  });

  // ============== 统一接口 ==============

  // 开始录音
  const start = useCallback(() => {
    setLocalError(null);
    webSpeech.start();
  }, [webSpeech]);

  // 停止录音
  const stop = useCallback(() => {
    webSpeech.stop();
  }, [webSpeech]);

  // 暂停录音
  const pause = useCallback(() => {
    webSpeech.pause();
  }, [webSpeech]);

  // 恢复录音
  const resume = useCallback(() => {
    webSpeech.resume();
  }, [webSpeech]);

  // 重置
  const reset = useCallback(() => {
    setTranscript('');
    setLocalError(null);
    webSpeech.reset();
  }, [webSpeech]);

  return {
    transcript,
    isListening: webSpeech.isListening,
    isSupported: webSpeech.isSupported,
    error: localError || webSpeech.error,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}

export default useTranscription;