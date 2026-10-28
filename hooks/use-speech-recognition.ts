import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Speech API 类型声明
 * TypeScript 本身不包含这些类型，需要手动声明
 */

/** 语音识别结果项 */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

/** 语音识别结果列表 */
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

/** 语音识别备选项 */
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

/** 语音识别事件 */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

/** 语音识别错误事件 */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

/** 语音识别实例接口 */
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;

  onaudioend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror:
    | ((
        this: SpeechRecognitionInstance,
        ev: SpeechRecognitionErrorEvent
      ) => void)
    | null;
  onnomatch:
    | ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void)
    | null;
  onresult:
    | ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void)
    | null;
  onsoundend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;

  abort(): void;
  start(): void;
  stop(): void;
}

/** 语音识别构造函数接口 */
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
  prototype: SpeechRecognitionInstance;
}

/** 扩展 Window 接口 */
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

/**
 * 语音识别返回接口
 */
export interface UseSpeechRecognitionReturn {
  /** 实时转写文本 */
  transcript: string;
  /** 是否正在监听 */
  isListening: boolean;
  /** 浏览器是否支持语音识别 */
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

/**
 * 语音识别配置选项
 */
export interface UseSpeechRecognitionOptions {
  /** 识别语言，默认为中文（zh-CN） */
  language?: string;
  /** 是否连续识别，默认为 true */
  continuous?: boolean;
  /** 是否返回临时结果，默认为 true */
  interimResults?: boolean;
  /** 是否在静音时自动停止，默认为 false */
  stopOnSilence?: boolean;
  /** 静音检测超时时间（毫秒），默认为 3000ms */
  silenceTimeout?: number;
  /** 识别结果回调 */
  onResult?: (transcript: string, isFinal: boolean) => void;
  /** 错误回调 */
  onError?: (error: string) => void;
  /** 开始回调 */
  onStart?: () => void;
  /** 结束回调 */
  onEnd?: () => void;
}

/**
 * 语音识别 Hook
 *
 * 封装 Web Speech API (SpeechRecognition)，支持实时语音转文字
 *
 * @param options 配置选项
 * @returns 语音识别状态和控制方法
 *
 * @example
 * ```tsx
 * function VoiceInput() {
 *   const {
 *     transcript,
 *     isListening,
 *     isSupported,
 *     error,
 *     start,
 *     stop,
 *     reset,
 *   } = useSpeechRecognition({
 *     language: 'zh-CN',
 *     onResult: (text, isFinal) => {
 *       if (isFinal) {
 *         console.log('Final result:', text);
 *       }
 *     },
 *   });
 *
 *   if (!isSupported) {
 *     return <p>您的浏览器不支持语音识别</p>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>转写结果: {transcript}</p>
 *       <button onClick={isListening ? stop : start}>
 *         {isListening ? '停止' : '开始'}录音
 *       </button>
 *       {error && <p className="text-red-500">{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    language = 'zh-CN',
    continuous = true,
    interimResults = true,
    stopOnSilence = false,
    silenceTimeout = 3000,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  // 状态
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef<boolean>(false);

  // 检测浏览器是否支持语音识别
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // 清除静音计时器
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // 重置静音计时器
  const resetSilenceTimer = useCallback(() => {
    if (!stopOnSilence) return;

    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    }, silenceTimeout);
  }, [stopOnSilence, silenceTimeout, clearSilenceTimer, isListening]);

  // 初始化语音识别实例
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    // 配置
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    // 识别结果处理
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // 遍历所有识别结果
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      // 更新状态
      const currentTranscript = finalTranscript || interimTranscript;

      // 先更新本地状态
      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        // 在状态更新后调用回调（使用 queueMicrotask 避免在渲染期间调用）
        queueMicrotask(() => {
          onResult?.(currentTranscript, true);
        });
      } else {
        setTranscript(currentTranscript);
        // 在状态更新后调用回调
        queueMicrotask(() => {
          onResult?.(currentTranscript, false);
        });
      }

      // 重置静音计时器
      resetSilenceTimer();
    };

    // 开始识别
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      isManualStopRef.current = false;
      onStart?.();
    };

    // 结束识别
    recognition.onend = () => {
      setIsListening(false);
      clearSilenceTimer();

      // 如果不是手动停止且需要连续识别，则重新开始
      if (!isManualStopRef.current && continuous) {
        try {
          recognition.start();
        } catch {
          // 忽略重复启动错误
        }
      }

      onEnd?.();
    };

    // 错误处理
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      onError?.(errorMessage);

      // 某些错误需要停止识别
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        setIsListening(false);
      }
    };

    return recognition;
  }, [
    isSupported,
    language,
    continuous,
    interimResults,
    onResult,
    onStart,
    onEnd,
    onError,
    resetSilenceTimer,
    clearSilenceTimer,
  ]);

  // 开始录音
  const start = useCallback(() => {
    if (!isSupported) {
      setError('您的浏览器不支持语音识别');
      return;
    }

    // 清除之前的错误
    setError(null);
    isManualStopRef.current = false;

    // 初始化或重用识别实例
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // 如果已经在运行，忽略错误
        if (err instanceof Error && !err.message.includes('already started')) {
          setError('启动语音识别失败');
          console.error('Speech recognition start error:', err);
        }
      }
    }
  }, [isSupported, initRecognition]);

  // 停止录音
  const stop = useCallback(() => {
    isManualStopRef.current = true;
    clearSilenceTimer();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearSilenceTimer]);

  // 暂停录音（实际上是停止，但标记为暂停状态）
  const pause = useCallback(() => {
    if (recognitionRef.current && isListening) {
      isManualStopRef.current = true;
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // 恢复录音
  const resume = useCallback(() => {
    if (!isListening) {
      start();
    }
  }, [isListening, start]);

  // 重置
  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setError(null);
    recognitionRef.current = null;
  }, [stop]);

  // 清理函数
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        isManualStopRef.current = true;
        recognitionRef.current.stop();
      }
    };
  }, [clearSilenceTimer]);

  // 语言变化时重新初始化
  useEffect(() => {
    if (recognitionRef.current) {
      const wasListening = isListening;
      stop();

      recognitionRef.current = null;

      if (wasListening) {
        start();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}

/**
 * 获取错误信息
 */
function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'not-allowed': '请允许麦克风权限',
    'no-speech': '未检测到语音输入',
    'audio-capture': '无法访问麦克风',
    network: '网络错误，请检查网络连接',
    aborted: '语音识别已取消',
    'service-not-allowed': '语音识别服务不可用',
    'bad-grammar': '语法错误',
    'language-not-supported': '不支持的语言',
  };

  return errorMessages[error] || `语音识别错误: ${error}`;
}
