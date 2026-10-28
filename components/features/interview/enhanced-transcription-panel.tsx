/**
 * 增强版转写面板组件
 *
 * 使用 Web Speech API（浏览器原生语音识别）
 * 提供实时转写功能
 */

'use client';

import * as React from 'react';
import { useRef, useEffect, useCallback, memo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TranscriptionModeSelector } from './transcription-mode-selector';

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
 * EnhancedTranscriptionPanel Props 接口
 */
export interface EnhancedTranscriptionPanelProps {
  /** 实时转写文本 */
  transcript?: string;
  /** 是否正在监听/录音 */
  isListening?: boolean;
  /** 是否支持语音识别 */
  isSupported?: boolean;
  /** 错误信息 */
  error?: string | null;
  /** 开始录音回调 */
  onStart?: () => void;
  /** 停止录音回调 */
  onStop?: () => void;
  /** 暂停录音回调 */
  onPause?: () => void;
  /** 恢复录音回调 */
  onResume?: () => void;
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
 * 增强版转写面板组件
 */
export const EnhancedTranscriptionPanel = memo(function EnhancedTranscriptionPanel({
  transcript: currentTranscript = '',
  isListening = false,
  isSupported = true,
  error = null,
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
}: EnhancedTranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && currentTranscript) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentTranscript]);

  // 高亮文本处理
  const handleHighlight = useCallback(() => {
    if (onHighlight && currentTranscript) {
      onHighlight(currentTranscript, new Date());
    }
  }, [onHighlight, currentTranscript]);

  // 清空转写内容
  const handleClear = useCallback(() => {
    onClear?.();
  }, [onClear]);

  // 检查文本是否被高亮
  const isTextHighlighted = useCallback(
    (text: string) => {
      return highlights.some((h) => h.text === text);
    },
    [highlights]
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
            <RecordingIndicator
              isRecording={isListening}
              isPaused={isPaused}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* 高亮按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleHighlight}
              disabled={!currentTranscript || !isListening}
              title="标记高亮"
            >
              <Highlighter className="w-4 h-4" />
            </Button>
            {/* 清空按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!currentTranscript && history.length === 0}
              title="清空转写"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 当前模式指示 */}
        <div className="flex items-center justify-between pt-2">
          <TranscriptionModeSelector compact />
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
                        <p className="flex-1 break-words">{item.text}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 当前转写 */}
              {currentTranscript && (
                <div
                  className={cn(
                    'text-sm p-3 rounded-lg border-2 border-primary/30 bg-primary/5',
                    isTextHighlighted(currentTranscript) &&
                      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse mt-1.5 flex-shrink-0" />
                    <p className="flex-1 break-words">{currentTranscript}</p>
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {!currentTranscript && history.length === 0 && (
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
                      {new Date(highlight.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
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
            <Button onClick={onStart} className="gap-2" size="lg">
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

export default EnhancedTranscriptionPanel;