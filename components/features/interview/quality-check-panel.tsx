'use client';

import * as React from 'react';
import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useQualityCheck,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/hooks/use-quality-check';
import type { QualityCheckContext } from '@/lib/constants/quality-check';

/**
 * 质量检查面板 Props
 */
export interface QualityCheckPanelProps {
  /** 检查上下文 */
  context: QualityCheckContext | null;
  /** 是否启用检查 */
  enabled?: boolean;
  /** 重新检查回调 */
  onRecheck?: () => void;
  /** 查看详情回调 */
  onViewDetails?: () => void;
  /** 自定义样式类名 */
  className?: string;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 检查项状态图标
 */
const CheckStatusIcon = memo(function CheckStatusIcon({
  passed,
  severity,
}: {
  passed: boolean;
  severity: 'critical' | 'warning' | 'info';
}) {
  if (passed) {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }

  if (severity === 'critical') {
    return <XCircle className="w-4 h-4 text-red-500" />;
  }

  if (severity === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  }

  return <AlertCircle className="w-4 h-4 text-blue-500" />;
});

/**
 * 进度条组件
 */
const ProgressBar = memo(function ProgressBar({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  return (
    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
});

/**
 * 质量检查面板组件
 */
export const QualityCheckPanel = memo(function QualityCheckPanel({
  context,
  enabled = true,
  onRecheck,
  onViewDetails,
  className,
  compact = false,
}: QualityCheckPanelProps) {
  const { report, grade, passed, score, categoryScores, missingCount } = useQualityCheck(context, { enabled });

  // 展开状态
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  // Hooks must run in the same order even when there is no report or compact mode is enabled.
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, NonNullable<typeof report>['items']> = {
      completeness: [],
      depth: [],
      evidence: [],
      actionability: [],
    };

    if (report) {
      for (const item of report.items) {
        grouped[item.item.category].push(item);
      }
    }

    return grouped;
  }, [report]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // 无报告时显示空状态
  if (!report) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-muted-foreground" />
            输出质量检查
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
            等待访谈数据...
          </div>
        </CardContent>
      </Card>
    );
  }

  // 紧凑模式
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg',
          passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
          className
        )}
      >
        {passed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">质量评分: {score}</span>
            <Badge variant={passed ? 'default' : 'destructive'} className="text-xs">
              {grade?.label}
            </Badge>
          </div>
          {!passed && missingCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {missingCount} 项待改进
            </p>
          )}
        </div>
        {onRecheck && (
          <Button variant="ghost" size="sm" onClick={onRecheck}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" />
            输出质量检查
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRecheck && (
              <Button variant="ghost" size="sm" onClick={onRecheck}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* 总体评分 */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">总体评分</span>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold', grade?.color)}>{score}</span>
              <Badge variant={passed ? 'default' : 'destructive'}>
                {grade?.label}
              </Badge>
            </div>
          </div>
          <ProgressBar
            score={score}
            color={passed ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
          />
          {!passed && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              检查未通过，需要补充 {missingCount} 项内容
            </p>
          )}
        </div>

        {/* 类别得分 */}
        <div className="flex-shrink-0 grid grid-cols-2 gap-2">
          {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((category) => (
            <div
              key={category}
              className={cn(
                'p-2 rounded-lg border',
                CATEGORY_COLORS[category].bg
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-xs font-medium', CATEGORY_COLORS[category].text)}>
                  {CATEGORY_LABELS[category]}
                </span>
                <span className="text-sm font-bold">{categoryScores[category]}</span>
              </div>
              <ProgressBar
                score={categoryScores[category]}
                color={
                  categoryScores[category] >= 80
                    ? 'bg-green-500'
                    : categoryScores[category] >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }
              />
            </div>
          ))}
        </div>

        {/* 详细检查项 */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((category) => {
                const items = itemsByCategory[category];
                const failedCount = items.filter((i) => !i.result.passed).length;
                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category} className="border rounded-lg">
                    <button
                      className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={cn('text-sm font-medium', CATEGORY_COLORS[category].text)}>
                          {CATEGORY_LABELS[category]}
                        </span>
                        {failedCount > 0 && (
                          <Badge variant="outline" className="text-xs text-red-600">
                            {failedCount} 项待改进
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold">{categoryScores[category]}</span>
                    </button>

                    {isExpanded && (
                      <div className="border-t px-2 py-1">
                        {items.map(({ item, result }) => (
                          <div
                            key={item.id}
                            className={cn(
                              'flex items-start gap-2 py-2 border-b last:border-b-0',
                              !result.passed && 'bg-red-50/50 dark:bg-red-900/10 -mx-2 px-2'
                            )}
                          >
                            <CheckStatusIcon passed={result.passed} severity={item.severity} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{item.name}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    item.severity === 'critical' && 'text-red-600',
                                    item.severity === 'warning' && 'text-yellow-600',
                                    item.severity === 'info' && 'text-blue-600'
                                  )}
                                >
                                  {result.score}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {result.details}
                              </p>
                              {!result.passed && result.missingItems && (
                                <p className="text-xs text-red-600 mt-1">
                                  缺失: {result.missingItems.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 缺失项汇总 */}
        {report.missingItems.length > 0 && (
          <div className="flex-shrink-0 border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">待改进项</span>
              <Badge variant="outline" className="text-xs">
                {report.missingItems.length}
              </Badge>
            </div>
            <ScrollArea className="max-h-24">
              <ul className="text-xs space-y-1">
                {report.missingItems.slice(0, 5).map((item, index) => (
                  <li key={index} className="text-muted-foreground flex items-start gap-1">
                    <span className="text-red-500">•</span>
                    {item}
                  </li>
                ))}
                {report.missingItems.length > 5 && (
                  <li className="text-muted-foreground">
                    还有 {report.missingItems.length - 5} 项...
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* 操作按钮 */}
        {onViewDetails && (
          <div className="flex-shrink-0 border-t pt-3">
            <Button variant="outline" size="sm" className="w-full" onClick={onViewDetails}>
              查看详细报告
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default QualityCheckPanel;
