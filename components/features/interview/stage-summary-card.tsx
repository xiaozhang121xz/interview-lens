/**
 * 阶段总结卡片组件
 *
 * @module components/features/interview/stage-summary-card
 * @description 展示 AI 生成的阶段性访谈总结
 */

'use client';

import * as React from 'react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export interface StageSummaryData {
  summary: string;
  keyFindings: string[];
  painPoints: string[];
  requirements: string[];
  suggestions: string[];
}

export interface StageSummaryCardProps {
  /** 阶段总结数据 */
  data: StageSummaryData | null;
  /** 是否正在生成 */
  isLoading: boolean;
  /** 生成阶段总结回调 */
  onGenerate: () => void;
  /** 最后更新时间 */
  lastUpdatedAt?: Date | null;
  /** 自定义样式类名 */
  className?: string;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

// ============================================
// 子组件
// ============================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  variant?: 'default' | 'warning' | 'info' | 'success';
  defaultExpanded?: boolean;
}

const Section = memo(function Section({
  title,
  icon,
  items,
  variant = 'default',
  defaultExpanded = true,
}: SectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  if (items.length === 0) return null;

  const variantStyles = {
    default: 'bg-muted/30',
    warning: 'bg-red-50 dark:bg-red-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20',
    success: 'bg-green-50 dark:bg-green-900/20',
  };

  const badgeVariant = {
    default: 'secondary' as const,
    warning: 'destructive' as const,
    info: 'default' as const,
    success: 'default' as const,
  };

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left py-1"
      >
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-medium">{title}</span>
          <Badge variant={badgeVariant[variant]} className="text-[10px] h-4 px-1">
            {items.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <ul className={cn('space-y-1 p-2 rounded-lg text-xs', variantStyles[variant])}>
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-1.5">
              <span className="text-muted-foreground">•</span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

// ============================================
// 主组件
// ============================================

export const StageSummaryCard = memo(function StageSummaryCard({
  data,
  isLoading,
  onGenerate,
  lastUpdatedAt,
  className,
  defaultExpanded = true,
}: StageSummaryCardProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevDataRef = useRef<StageSummaryData | null>(null);

  // 当数据更新时自动展开并滚动到视图
  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      // 数据有更新，自动展开
      setExpanded(true);
      prevDataRef.current = data;

      // 延迟滚动，等待展开动画完成
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [data]);

  // 格式化时间
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <Card ref={cardRef} className={cn('flex flex-col', className)}>
      <CardHeader className="py-3 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            阶段总结
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdatedAt && (
              <span className="text-[10px] text-muted-foreground">
                {formatTime(lastUpdatedAt)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-3 pb-3 flex-1 min-h-0">
          {isLoading && !data ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">正在分析...</p>
            </div>
          ) : data ? (
              <div className="space-y-3">
                {/* 总结概述 */}
                <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs leading-relaxed">{data.summary}</p>
                </div>

                {/* 关键发现 */}
                <Section
                  title="关键发现"
                  icon={<Lightbulb className="w-3 h-3 text-yellow-500" />}
                  items={data.keyFindings}
                  variant="success"
                  defaultExpanded={false}
                />

                {/* 痛点 */}
                <Section
                  title="痛点识别"
                  icon={<AlertTriangle className="w-3 h-3 text-red-500" />}
                  items={data.painPoints}
                  variant="warning"
                />

                {/* 需求 */}
                <Section
                  title="需求分析"
                  icon={<Target className="w-3 h-3 text-blue-500" />}
                  items={data.requirements}
                  variant="info"
                />

                {/* 建议 */}
                <Section
                  title="建议方向"
                  icon={<Sparkles className="w-3 h-3 text-purple-500" />}
                  items={data.suggestions}
                  defaultExpanded={false}
                />
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                点击刷新按钮生成阶段总结
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

export default StageSummaryCard;