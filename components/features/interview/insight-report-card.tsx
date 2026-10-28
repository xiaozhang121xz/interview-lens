'use client';

/**
 * 访谈分析报告卡片组件
 *
 * @module components/features/interview/InsightReportCard
 * @description 展示AI生成的访谈分析报告（提纲生成优化 - 阶段1）
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Lightbulb,
  Target,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  Loader2,
  History,
  FileText,
} from 'lucide-react';
import type {
  InsightReportContent,
  InsightReportItem,
  InsightReportVersion,
} from '@/lib/api/interview-assistant/types';
import { cn } from '@/lib/utils';
import { formatISOToDisplay } from '@/lib/datetimeUtils';
import { isInsightReportV2 } from '@/lib/utils/insight-report';

interface InsightReportCardProps {
  report: InsightReportContent | null;
  reportVersion?: InsightReportVersion;
  isLoading?: boolean;
  isLoadingQuestions?: boolean;
  onRegenerate?: () => void;
  onGenerateQuestions?: () => void;
  // 报告版本管理相关 props
  reports?: InsightReportItem[];
  currentReportId?: string;
  onReportChange?: (reportId: string) => void;
  onOpenHistory?: () => void;
}

/**
 * 置信度徽章组件
 */
function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: '高', variant: 'destructive' as const, icon: CheckCircle2 },
    medium: { label: '中', variant: 'secondary' as const, icon: MinusCircle },
    low: { label: '低', variant: 'outline' as const, icon: AlertCircle },
  };

  const { label, variant, icon: Icon } = config[confidence];

  return (
    <Badge variant={variant} className="gap-1 text-xs shrink-0">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="p-3 md:p-6">
        <Skeleton className="h-5 md:h-6 w-32 md:w-48" />
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
        <Skeleton className="h-16 md:h-20 w-full" />
        <Skeleton className="h-12 md:h-16 w-full" />
        <Skeleton className="h-12 md:h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export function InsightReportCard({
  report,
  reportVersion = 'v1',
  isLoading = false,
  isLoadingQuestions = false,
  onRegenerate,
  onGenerateQuestions,
  reports,
  currentReportId,
  onReportChange,
  onOpenHistory,
}: InsightReportCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  /**
   * 获取当前报告版本号
   */
  const getCurrentVersionNumber = (): number | undefined => {
    if (!reports || !currentReportId) return undefined;
    const currentReport = reports.find((r) => r.id === currentReportId);
    return currentReport?.versionNumber;
  };

  /**
   * 版本选择器
   */
  const VersionSelector = () => {
    if (!reports || reports.length === 0) return null;

    const currentVersion = getCurrentVersionNumber();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              版本 {currentVersion || 1}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {reports.slice(0, 5).map((r) => (
            <DropdownMenuItem
              key={r.id}
              onClick={() => onReportChange?.(r.id)}
              className={cn(
                'flex items-center gap-2',
                r.id === currentReportId && 'bg-primary/10'
              )}
            >
              <Badge variant="outline" className="font-mono text-xs">
                v{r.versionNumber}
              </Badge>
              {r.reportType && (
                <Badge variant={r.reportType === 'v2' ? 'default' : 'secondary'} className="text-[10px]">
                  {r.reportType.toUpperCase()}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatISOToDisplay(r.createdAt, 'datetime')}
              </span>
            </DropdownMenuItem>
          ))}
          {reports.length > 5 || onOpenHistory && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenHistory} className="gap-2">
                <History className="h-4 w-4" />
                查看全部历史...
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!report) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-6 md:py-8 px-4">
          <Lightbulb className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
          <p className="text-muted-foreground text-center text-sm md:text-base mb-3 md:mb-4">
            点击下方按钮生成访谈分析报告
          </p>
          <Button onClick={onRegenerate} size="sm" className="md:size-default">
            <RefreshCw className="h-4 w-4 mr-2" />
            生成分析报告
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isV2Report = isInsightReportV2(report);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <span className="truncate">访谈分析报告</span>
          </CardTitle>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* 版本选择器 */}
            {reports && reports.length > 0 && <VersionSelector />}
            {onRegenerate && (
              <Button variant="ghost" size="sm" onClick={onRegenerate} className="text-xs md:text-sm">
                <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">重新生成</span>
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded ? 'rotate-180' : ''
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] md:h-[350px]">
              <div className="space-y-3 md:space-y-4 p-3 md:p-6 pt-2 md:pt-4">
                <div className="flex items-center justify-between">
                  <Badge variant={reportVersion === 'v2' ? 'default' : 'secondary'}>
                    {reportVersion.toUpperCase()}
                  </Badge>
                </div>

                {isV2Report ? (
                  <>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                        <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 shrink-0" />
                        访谈目标理解
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5 md:p-3 space-y-2">
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          {report.interviewGoal.summary}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {report.interviewGoal.keyObjectives.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] md:text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs md:text-sm">
                          <span className="font-medium">沟通方向:</span> {report.interviewGoal.conversationDirection}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500 shrink-0" />
                        已知背景与业务场景
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5 md:p-3 space-y-2">
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          {report.knownContext.businessScene}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {report.knownContext.keyCharacteristics.map((char, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] md:text-xs">
                              {char}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {report.knownContext.knownFacts.map((fact, i) => (
                            <p key={i} className="text-[10px] md:text-xs text-muted-foreground">
                              {i + 1}. {fact}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                        <Lightbulb className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-500 shrink-0" />
                        优先澄清的问题
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        {report.priorityClarifications.map((item, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg p-2.5 md:p-3">
                            <p className="text-xs md:text-sm font-medium">{item.question}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                              为什么重要: {item.whyItMatters}
                            </p>
                            {item.suggestedFollowUp && (
                              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                                建议追问: {item.suggestedFollowUp}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-500 shrink-0" />
                        假设与风险提示
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        {report.hypothesesAndRisks.map((item, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg p-2.5 md:p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] md:text-xs font-mono">
                                #{i + 1}
                              </Badge>
                              <ConfidenceBadge confidence={item.confidence} />
                            </div>
                            <p className="text-xs md:text-sm font-medium">{item.assumption}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                              依据: {item.basis}
                            </p>
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                              风险/缺口: {item.riskOrGap}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                        <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 shrink-0" />
                        建议访谈切入方式
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5 md:p-3 space-y-2">
                        <p className="text-xs md:text-sm">
                          <span className="font-medium">建议开场:</span> {report.interviewApproach.recommendedOpening}
                        </p>
                        <div>
                          <span className="text-xs md:text-sm font-medium">建议顺序:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {report.interviewApproach.suggestedSequence.map((item, i) => (
                              <Badge key={i} variant="default" className="text-[10px] md:text-xs">
                                <span className="font-mono mr-0.5">#{i + 1}</span>
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {report.interviewApproach.communicationTips.map((tip, i) => (
                            <p key={i} className="text-[10px] md:text-xs text-muted-foreground">
                              提醒: {tip}
                            </p>
                          ))}
                        </div>
                        {report.interviewApproach.sensitiveTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] md:text-xs text-muted-foreground">敏感点:</span>
                            {report.interviewApproach.sensitiveTopics.map((item, i) => (
                              <Badge key={i} variant="destructive" className="text-[10px] md:text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                {/* 业务场景分析 */}
                <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500 shrink-0" />
                业务场景分析
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 md:p-3 space-y-1.5 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {report.businessScenario.summary}
                </p>
                <div className="flex flex-wrap gap-1">
                  {report.businessScenario.keyCharacteristics.map((char, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] md:text-xs">
                      {char}
                    </Badge>
                  ))}
                </div>
                {report.businessScenario.potentialChallenges.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] md:text-xs text-muted-foreground">可能挑战:</span>
                    {report.businessScenario.potentialChallenges.map((challenge, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] md:text-xs">
                        <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                        {challenge}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 痛点假设 */}
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                <Lightbulb className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-500 shrink-0" />
                痛点假设
              </div>
              <div className="space-y-1.5 md:space-y-2">
                {report.painPointHypotheses.map((pain, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 rounded-lg p-2.5 md:p-3 flex flex-col sm:flex-row sm:items-start gap-1.5 md:gap-2"
                  >
                    <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
                      {/* 新增：索引标签 */}
                      <Badge variant="outline" className="text-[10px] md:text-xs font-mono">
                        #{i + 1}
                      </Badge>
                      <ConfidenceBadge confidence={pain.confidence} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium">{pain.hypothesis}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">
                        依据: {pain.reasoning}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 假设与风险提示 */}
            {report.hypothesesAndRisks.length > 0 && (
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-500 shrink-0" />
                  假设与风险提示
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  {report.hypothesesAndRisks.map((item, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-2.5 md:p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] md:text-xs font-mono">
                          #{i + 1}
                        </Badge>
                        <ConfidenceBadge confidence={item.confidence} />
                      </div>
                      <p className="text-xs md:text-sm font-medium">{item.assumption}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                        依据: {item.basis}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                        风险/缺口: {item.riskOrGap}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 访谈策略 */}
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 shrink-0" />
                访谈策略
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 md:p-3 space-y-1.5 md:space-y-2">
                <p className="text-xs md:text-sm">
                  <span className="font-medium">建议方法:</span>{' '}
                  {report.interviewStrategy.approach}
                </p>
                <div>
                  <span className="text-xs md:text-sm font-medium">优先关注:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {report.interviewStrategy.priorityAreas.map((area, i) => (
                      <Badge key={i} variant="default" className="text-[10px] md:text-xs">
                        {/* 新增：索引标签 */}
                        <span className="font-mono mr-0.5">#{i + 1}</span>
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs md:text-sm">
                  <span className="font-medium">时间分配:</span>{' '}
                  {report.interviewStrategy.timeAllocation}
                </p>
                {report.interviewStrategy.riskAlerts.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] md:text-xs text-muted-foreground">风险提示:</span>
                    {report.interviewStrategy.riskAlerts.map((alert, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px] md:text-xs">
                        <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                        {alert}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
                  </>
                )}

            {/* 生成问题按钮 */}
            {onGenerateQuestions && !isV2Report && (
              <div className="flex justify-center pt-1 md:pt-2">
                <Button
                  onClick={onGenerateQuestions}
                  disabled={isLoadingQuestions}
                  size="sm"
                  className="md:size-default"
                >
                  {isLoadingQuestions ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    '生成核心问题'
                  )}
                </Button>
              </div>
            )}
            {isV2Report && (
              <div className="flex justify-center pt-1 md:pt-2">
                <p className="text-xs text-muted-foreground">
                  当前为 V2 访谈准备卡，核心问题生成功能暂基于经典版 V1 报告。
                </p>
              </div>
            )}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
