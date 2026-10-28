'use client';

import * as React from 'react';
import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  MessageSquareQuote,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePainPointDetection,
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_COLORS,
  type SignalWordType,
  type DetectedPainPointSignal,
} from '@/hooks/use-pain-point-detection';

/**
 * 痛点信号词面板 Props
 */
export interface PainPointSignalPanelProps {
  /** 转写文本 */
  text: string;
  /** 是否启用检测 */
  enabled?: boolean;
  /** 是否显示建议追问 */
  showFollowUps?: boolean;
  /** 信号词点击回调 */
  onSignalClick?: (signal: DetectedPainPointSignal) => void;
  /** 追问点击回调 */
  onFollowUpClick?: (followUp: string) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 信号词标签组件
 */
const SignalBadge = memo(function SignalBadge({
  signal,
  onClick,
}: {
  signal: DetectedPainPointSignal;
  onClick?: () => void;
}) {
  const colors = SIGNAL_TYPE_COLORS[signal.type];
  const label = SIGNAL_TYPE_LABELS[signal.type];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer hover:opacity-80 transition-opacity',
        colors.bg,
        colors.text,
        colors.border
      )}
      onClick={onClick}
      title={`${label}: ${signal.context}`}
    >
      <span className="font-medium">{signal.word}</span>
      <Badge variant="outline" className="text-xs px-1 h-4">
        {label}
      </Badge>
    </div>
  );
});

/**
 * 痛点强度指示器
 */
const IntensityIndicator = memo(function IntensityIndicator({
  intensity,
}: {
  intensity: number;
}) {
  const getColorClass = () => {
    if (intensity >= 70) return 'text-red-600 bg-red-50';
    if (intensity >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getLabel = () => {
    if (intensity >= 70) return '高';
    if (intensity >= 40) return '中';
    return '低';
  };

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded-md', getColorClass())}>
      <TrendingUp className="w-4 h-4" />
      <span className="text-sm font-medium">痛点强度: {intensity}</span>
      <Badge variant="outline" className="text-xs">{getLabel()}</Badge>
    </div>
  );
});

/**
 * 痛点信号词面板组件
 * 用于显示转写文本中检测到的痛点信号词
 */
export const PainPointSignalPanel = memo(function PainPointSignalPanel({
  text,
  enabled = true,
  showFollowUps = true,
  onSignalClick,
  onFollowUpClick,
  className,
  compact = false,
}: PainPointSignalPanelProps) {
  const {
    signals,
    highPrioritySignals,
    intensity,
    typeStats,
    getSuggestedFollowUps,
  } = usePainPointDetection(text, { enabled });

  const followUps = useMemo(() => getSuggestedFollowUps(), [getSuggestedFollowUps]);

  // 无信号时显示空状态
  if (!enabled || signals.length === 0) {
    if (compact) return null;
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            痛点信号词
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
            {text ? '暂未检测到痛点信号词' : '等待转写内容...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 紧凑模式
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 p-2 rounded-lg bg-muted/50', className)}>
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <span className="text-sm">检测到 {signals.length} 个信号词</span>
        <IntensityIndicator intensity={intensity} />
      </div>
    );
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            痛点信号词
          </CardTitle>
          <IntensityIndicator intensity={intensity} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* 类型统计 */}
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(typeStats) as SignalWordType[]).map((type) => (
            typeStats[type] > 0 && (
              <Badge
                key={type}
                variant="outline"
                className={cn(
                  'text-xs',
                  SIGNAL_TYPE_COLORS[type].text,
                  SIGNAL_TYPE_COLORS[type].border
                )}
              >
                {SIGNAL_TYPE_LABELS[type]}: {typeStats[type]}
              </Badge>
            )
          ))}
        </div>

        {/* 高优先级信号词 */}
        <div className="flex-shrink-0">
          <div className="text-xs text-muted-foreground font-medium mb-1.5">
            关键信号词 ({highPrioritySignals.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {highPrioritySignals.map((signal, index) => (
              <SignalBadge
                key={`${signal.word}-${index}`}
                signal={signal}
                onClick={() => onSignalClick?.(signal)}
              />
            ))}
          </div>
        </div>

        {/* 全部信号词（可折叠） */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-1.5 pr-2">
              {signals.map((signal, index) => (
                <div
                  key={`${signal.word}-${signal.position.start}-${index}`}
                  className="text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => onSignalClick?.(signal)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <SignalBadge signal={signal} />
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">
                      权重: {signal.weight.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground line-clamp-2">
                    上下文: {signal.context}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* 建议追问 */}
        {showFollowUps && followUps.length > 0 && (
          <div className="flex-shrink-0 border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareQuote className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">建议追问</span>
              <Badge variant="secondary" className="text-xs">
                {followUps.length}
              </Badge>
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1.5">
                {followUps.map((followUp, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-2"
                    onClick={() => onFollowUpClick?.(followUp)}
                  >
                    <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>{followUp}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default PainPointSignalPanel;