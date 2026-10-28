'use client';

/**
 * 遗漏问题提醒组件
 *
 * @module components/features/interview/OutlineGapAlert
 * @description 展示缺失的重要问题，支持一键添加（提纲生成优化 - 阶段4）
 */

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  ChevronDown,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { MissingQuestion } from '@/lib/api/interview-assistant/types';

interface OutlineGapAlertProps {
  missingQuestions: MissingQuestion[];
  overallCoverage: number;
  recommendations: string[];
  onAddQuestion?: (question: MissingQuestion) => void;
  onAddAll?: (questions: MissingQuestion[]) => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

/**
 * 严重程度徽章
 */
function SeverityBadge({ severity }: { severity: 'high' | 'medium' }) {
  return severity === 'high' ? (
    <Badge variant="destructive" className="text-xs">
      <AlertTriangle className="h-3 w-3 mr-1" />
      高优先级
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">
      <AlertCircle className="h-3 w-3 mr-1" />
      中优先级
    </Badge>
  );
}

export function OutlineGapAlert({
  missingQuestions,
  overallCoverage,
  recommendations,
  onAddQuestion,
  onAddAll,
  onDismiss,
  isLoading = false,
}: OutlineGapAlertProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 按严重程度分组
  const highPriority = missingQuestions.filter((q) => q.severity === 'high');
  const mediumPriority = missingQuestions.filter((q) => q.severity === 'medium');

  // 如果没有缺失问题，不显示
  if (missingQuestions.length === 0) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="flex items-center justify-between">
        <span className="text-amber-800 dark:text-amber-200">
          重要问题遗漏提醒
        </span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        {/* 覆盖度评分 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">当前提纲覆盖度</span>
            <span className="font-medium">{overallCoverage}%</span>
          </div>
          <Progress value={overallCoverage} className="h-2" />
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between p-0 h-auto py-1"
            >
              <span className="text-sm font-medium">
                发现 {missingQuestions.length} 个缺失问题
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 mt-2">
            {/* 高优先级缺失问题 */}
            {highPriority.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-destructive">
                  高优先级缺失问题
                </div>
                <div className="space-y-1">
                  {highPriority.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 p-2 bg-background/50 rounded border"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{q.suggestedQuestion}</p>
                        <p className="text-xs text-muted-foreground">
                          原因: {q.reason}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {q.category}
                        </Badge>
                      </div>
                      {onAddQuestion && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAddQuestion(q)}
                          disabled={isLoading}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          添加
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 中优先级缺失问题 */}
            {mediumPriority.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  中优先级缺失问题
                </div>
                <div className="space-y-1">
                  {mediumPriority.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 p-2 bg-background/50 rounded border"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{q.suggestedQuestion}</p>
                        <p className="text-xs text-muted-foreground">
                          原因: {q.reason}
                        </p>
                      </div>
                      {onAddQuestion && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAddQuestion(q)}
                          disabled={isLoading}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          添加
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 改进建议 */}
            {recommendations.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">建议:</span>{' '}
                {recommendations.join('；')}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-2">
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  忽略提醒
                </Button>
              )}
              {onAddAll && (
                <Button
                  size="sm"
                  onClick={() => onAddAll(missingQuestions)}
                  disabled={isLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  一键添加全部缺失问题
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
}