'use client';

import * as React from 'react';
import { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Trash2,
  Highlighter,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TranscriptionModeSelector } from './transcription-mode-selector';
import { usePainPointDetection, SIGNAL_TYPE_COLORS } from '@/hooks/use-pain-point-detection';
import type { DetectedPainPointSignal } from '@/lib/constants/pain-point-signals';

/**
 * 高亮记录接口
 */
export interface HighlightItem {
  id: string;
  text: string;
  timestamp: Date;
}

/**
 * 转写历史记录接口
 */
export interface TranscriptHistoryItem {
  id: string;
  text: string;
  timestamp: Date;
  isHighlighted?: boolean;
}

/**
 * TranscriptionPanel Props 接口
 */
export interface TranscriptionPanelProps {
  /** 实时转写文本 */
  transcript: string;
  /** 是否正在监听/录音 */
  isListening: boolean;
  /** 是否支持语音识别 */
  isSupported: boolean;
  /** 错误信息 */
  error: string | null;
  /** 开始录音回调 */
  onStart: () => void;
  /** 停止录音回调 */
  onStop: () => void;
  /** 暂停录音回调 */
  onPause: () => void;
  /** 恢复录音回调 */
  onResume: () => void;
  /** 高亮标记回调 */
  onHighlight?: (text: string, timestamp: Date) => void;
  /** 清空转写回调 */
  onClear?: () => void;
  /** 转写历史记录 */
  history?: TranscriptHistoryItem[];
  /** 高亮记录 */
  highlights?: HighlightItem[];
  /** 是否暂停状态 */
  isPaused?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 是否启用痛点信号词检测 */
  enablePainPointDetection?: boolean;
  /** 痛点信号词点击回调 */
  onPainPointClick?: (signal: DetectedPainPointSignal) => void;
}

/**
 * 录音状态指示器组件
 */
const RecordingIndicator = memo(function RecordingIndicator({
  isRecording,
  isPaused,
}: {
  isRecording: boolean;
  isPaused: boolean;
}) {
  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-3 h-3 rounded-full',
          isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
        )}
      />
      <span className="text-sm text-muted-foreground">
        {isPaused ? '已暂停' : '录音中...'}
      </span>
    </div>
  );
});

/**
 * 转写面板组件
 * 用于显示实时语音转写内容、历史记录和高亮标记
 * 使用 Web Speech API（浏览器原生语音识别）
 *
 * 支持痛点信号词自动检测和高亮显示
 */
export const TranscriptionPanel = memo(function TranscriptionPanel({
  transcript,
  isListening,
  isSupported,
  error,
  onStart,
  onStop,
  onPause,
  onResume,
  onHighlight,
  onClear,
  history = [],
  highlights = [],
  isPaused = false,
  className,
  enablePainPointDetection = true,
  onPainPointClick,
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 合并所有转写文本用于痛点信号词检测
  const allText = useMemo(() => {
    const historyText = history.map((h) => h.text).join(' ');
    return `${historyText} ${transcript}`.trim();
  }, [history, transcript]);

  // 痛点信号词检测
  const {
    signals: painPointSignals,
    highPrioritySignals,
    intensity: painPointIntensity,
    typeStats,
  } = usePainPointDetection(allText, { enabled: enablePainPointDetection });

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && transcript) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // 高亮文本处理
  const handleHighlight = useCallback(() => {
    if (onHighlight && transcript) {
      onHighlight(transcript, new Date());
    }
  }, [onHighlight, transcript]);

  // 清空转写内容
  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  // 检查文本是否被高亮
  const isTextHighlighted = useCallback(
    (text: string) => {
      return highlights.some((h) => h.text === text);
    },
    [highlights]
  );

  /**
   * 渲染带痛点信号词高亮的文本
   */
  const renderTextWithSignals = useCallback(
    (text: string) => {
      if (!enablePainPointDetection) {
        return text;
      }

      // 检测当前文本中的信号词
      const signals: Array<{ word: string; type: string; start: number; end: number }> = [];
      for (const signal of painPointSignals) {
        const regex = new RegExp(signal.word, 'g');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          signals.push({
            word: signal.word,
            type: signal.type,
            start: match.index,
            end: match.index + signal.word.length,
          });
        }
      }

      // 按位置排序并去重
      signals.sort((a, b) => a.start - b.start);

      if (signals.length === 0) {
        return text;
      }

      // 构建高亮文本
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      signals.forEach((signal, idx) => {
        // 添加前面的普通文本
        if (signal.start > lastIndex) {
          parts.push(text.slice(lastIndex, signal.start));
        }
        // 添加高亮信号词
        const colors = SIGNAL_TYPE_COLORS[signal.type as keyof typeof SIGNAL_TYPE_COLORS];
        parts.push(
          <span
            key={`signal-${idx}`}
            className={cn(
              'px-1 rounded font-medium cursor-pointer hover:opacity-80',
              colors.bg,
              colors.text,
              colors.border,
              'border'
            )}
            title={`痛点信号词: ${signal.word}`}
            onClick={() => onPainPointClick?.(painPointSignals.find(s => s.word === signal.word)!)}
          >
            {signal.word}
          </span>
        );
        lastIndex = signal.end;
      });

      // 添加剩余文本
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }

      return parts;
    },
    [enablePainPointDetection, painPointSignals, onPainPointClick]
  );

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              实时转写
            </CardTitle>
            <RecordingIndicator isRecording={isListening} isPaused={isPaused} />
          </div>
          <div className="flex items-center gap-2">
            {/* 高亮按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleHighlight}
              disabled={!transcript || !isListening}
              title="标记高亮"
            >
              <Highlighter className="w-4 h-4" />
            </Button>
            {/* 清空按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!transcript && history.length === 0}
              title="清空转写"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 当前模式指示 */}
        <div className="flex items-center justify-between pt-2 border-t mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">转写模式:</span>
            <TranscriptionModeSelector compact />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
        {/* 不支持语音识别提示 */}
        {!isSupported && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 模式说明 */}
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">免费</Badge>
          <span>浏览器原生语音识别，无需配置</span>
        </div>

        {/* 痛点信号词统计 */}
        {enablePainPointDetection && painPointSignals.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
              检测到 {painPointSignals.length} 个痛点信号词
            </span>
            <Badge variant="outline" className="text-xs ml-auto">
              强度: {painPointIntensity}
            </Badge>
          </div>
        )}

        {/* 实时转写区域 */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="space-y-3 pr-4">
              {/* 历史记录 */}
              {history.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-border">
                  <div className="text-xs text-muted-foreground font-medium">
                    历史记录 ({history.length})
                  </div>
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'text-sm p-2 rounded-lg transition-colors',
                        item.isHighlighted || isTextHighlighted(item.text)
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-muted/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1 break-words">{renderTextWithSignals(item.text)}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString(
                            'zh-CN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 当前转写 */}
              {transcript && (
                <div
                  className={cn(
                    'text-sm p-3 rounded-lg border-2 border-primary/30 bg-primary/5',
                    isTextHighlighted(transcript) &&
                      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse mt-1.5 flex-shrink-0" />
                    <p className="flex-1 break-words">{transcript}</p>
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {!transcript && history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MicOff className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">
                    {isSupported
                      ? '点击下方按钮开始录音转写'
                      : '语音识别不可用'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 高亮标记列表 */}
        {highlights.length > 0 && (
          <div className="flex-shrink-0 border-t border-border pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Highlighter className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">高亮标记</span>
              <Badge variant="secondary" className="text-xs">
                {highlights.length}
              </Badge>
            </div>
            <ScrollArea className="max-h-24">
              <div className="space-y-1.5">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800"
                  >
                    <p className="line-clamp-2">{highlight.text}</p>
                    <span className="text-muted-foreground">
                      {new Date(highlight.timestamp).toLocaleTimeString(
                        'zh-CN',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex-shrink-0 flex items-center justify-center gap-3 pt-3 border-t border-border">
          {!isListening ? (
            <Button
              onClick={onStart}
              disabled={!isSupported}
              className="gap-2"
              size="lg"
            >
              <Mic className="w-5 h-5" />
              开始录音
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={onResume} variant="default" className="gap-2">
                  <Play className="w-4 h-4" />
                  继续录音
                </Button>
              ) : (
                <Button onClick={onPause} variant="outline" className="gap-2">
                  <Pause className="w-4 h-4" />
                  暂停
                </Button>
              )}
              <Button onClick={onStop} variant="destructive" className="gap-2">
                <MicOff className="w-4 h-4" />
                停止录音
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default TranscriptionPanel;