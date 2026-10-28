'use client';

/**
 * 访谈分析点验证进度追踪面板
 *
 * @module components/features/interview/InsightTrackingPanel
 * @description 展示痛点假设验证进度和优先领域探索进度
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Target, Lightbulb, Building2 } from 'lucide-react';
import type { InsightReport, Outline } from '@/lib/api/interview-assistant/types';
import { cn } from '@/lib/utils';

interface InsightTrackingPanelProps {
  insightReport: InsightReport;
  outlines: Outline[];
}

/**
 * 计算痛点假设验证状态
 */
function calculatePainPointStatus(outlines: Outline[], painPointIndex: number) {
  const relatedQuestions = outlines.filter(
    o => o.relatedPainPointIndex === painPointIndex
  );
  const askedQuestions = relatedQuestions.filter(o => o.status === 'asked');
  const skippedQuestions = relatedQuestions.filter(o => o.status === 'skipped');

  return {
    totalQuestions: relatedQuestions.length,
    askedCount: askedQuestions.length,
    skippedCount: skippedQuestions.length,
    verified: askedQuestions.length > 0,
    partiallyVerified: askedQuestions.length > 0 && askedQuestions.length < relatedQuestions.length,
  };
}

/**
 * 计算优先领域探索状态
 */
function calculatePriorityAreaStatus(outlines: Outline[], areaIndex: number) {
  const relatedQuestions = outlines.filter(
    o => o.relatedPriorityAreaIndex === areaIndex
  );
  const askedQuestions = relatedQuestions.filter(o => o.status === 'asked');

  return {
    totalQuestions: relatedQuestions.length,
    askedCount: askedQuestions.length,
    explored: askedQuestions.length > 0,
  };
}

export function InsightTrackingPanel({ insightReport, outlines }: InsightTrackingPanelProps) {
  // 计算痛点假设验证进度
  const painPointProgress = insightReport.painPointHypotheses.map((pain, index) => {
    const status = calculatePainPointStatus(outlines, index);
    return {
      index,
      hypothesis: pain.hypothesis,
      confidence: pain.confidence,
      ...status,
    };
  });

  // 计算优先领域探索进度
  const priorityAreaProgress = insightReport.interviewStrategy.priorityAreas.map((area, index) => {
    const status = calculatePriorityAreaStatus(outlines, index);
    return {
      index,
      area,
      ...status,
    };
  });

  // 计算整体进度
  const totalOutlines = outlines.length;
  const askedOutlines = outlines.filter(o => o.status === 'asked').length;
  const overallProgress = totalOutlines > 0 ? (askedOutlines / totalOutlines) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" />
          分析点验证进度
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 痛点假设验证进度 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            痛点假设验证
          </h4>
          <div className="space-y-1.5">
            {painPointProgress.map((item) => (
              <div key={item.index} className="flex items-center gap-2 py-1">
                {item.verified ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Badge variant="outline" className="text-xs shrink-0 font-mono">
                  #{item.index + 1}
                </Badge>
                <span className="text-sm truncate flex-1" title={item.hypothesis}>
                  {item.hypothesis}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {item.askedCount}/{item.totalQuestions} 问题已问
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 优先领域探索进度 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            优先领域探索
          </h4>
          <div className="space-y-1.5">
            {priorityAreaProgress.map((item) => (
              <div key={item.index} className="flex items-center gap-2 py-1">
                {item.explored ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                  #{item.index + 1}
                </Badge>
                <span className="text-sm truncate flex-1" title={item.area}>
                  {item.area}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {item.askedCount}/{item.totalQuestions} 问题已问
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 整体进度 */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">整体验证进度</span>
            <span className="text-sm text-muted-foreground">
              {askedOutlines}/{totalOutlines} 问题已问
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}