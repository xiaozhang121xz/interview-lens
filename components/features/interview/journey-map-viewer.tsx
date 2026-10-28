'use client';

import * as React from 'react';
import { useRef, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  Download,
  AlertTriangle,
  Lightbulb,
  Smile,
  Meh,
  Frown,
  Activity,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 用户旅程阶段接口
 */
export interface JourneyStage {
  name: string;
  description: string;
}

/**
 * 用户行为接口
 */
export interface JourneyAction {
  stage: string;
  action: string;
  detail: string;
}

/**
 * 情绪数据接口
 */
export interface JourneyEmotion {
  stage: string;
  emotion: string;
  intensity: number; // 1-5
  reason: string;
}

/**
 * 痛点接口
 */
export interface JourneyPainPoint {
  stage: string;
  painPoint: string;
  severity: 'high' | 'medium' | 'low';
  frequency: 'often' | 'sometimes' | 'rarely';
}

/**
 * 机会点接口
 */
export interface JourneyOpportunity {
  stage: string;
  opportunity: string;
  potential: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

/**
 * 用户旅程图数据接口
 */
export interface JourneyMapData {
  id: string;
  title: string;
  stages: JourneyStage[];
  actions?: JourneyAction[];
  emotions?: JourneyEmotion[];
  painPoints?: JourneyPainPoint[];
  opportunities?: JourneyOpportunity[];
}

/**
 * JourneyMapViewer Props 接口
 */
export interface JourneyMapViewerProps {
  /** 用户旅程图数据 */
  journeyMap: JourneyMapData;
  /** 导出回调 */
  onExport?: () => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 情绪图标映射
 */
const EmotionIcon = memo(function EmotionIcon({
  emotion,
  intensity,
}: {
  emotion: string;
  intensity: number;
}) {
  const getColor = () => {
    if (intensity >= 4) return 'text-green-500';
    if (intensity >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const iconClass = cn('w-5 h-5', getColor());

  switch (emotion.toLowerCase()) {
    case 'happy':
    case '满意':
    case '开心':
      return <Smile className={iconClass} />;
    case 'neutral':
    case '一般':
    case '中性':
      return <Meh className={iconClass} />;
    case 'sad':
    case '不满':
    case '沮丧':
      return <Frown className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
});

/**
 * 严重程度颜色映射
 */
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

/**
 * 潜力颜色映射
 */
const getPotentialColor = (potential: string) => {
  switch (potential) {
    case 'high':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'medium':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'low':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

/**
 * 情绪曲线组件
 */
const EmotionCurve = memo(function EmotionCurve({
  emotions,
  stages,
}: {
  emotions: JourneyEmotion[];
  stages: JourneyStage[];
}) {
  if (!emotions || emotions.length === 0) return null;

  // 生成SVG路径
  const width = stages.length * 200;
  const height = 80;
  const padding = 20;

  const points = stages.map((stage, index) => {
    const emotion = emotions.find((e) => e.stage === stage.name);
    const intensity = emotion?.intensity || 3;
    const x =
      padding + (index * (width - 2 * padding)) / (stages.length - 1 || 1);
    const y = height - padding - ((intensity - 1) / 4) * (height - 2 * padding);
    return { x, y, intensity, emotion };
  });

  const pathD =
    points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ') + '';

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="emotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.8" />
          <stop offset="50%" stopColor="rgb(234, 179, 8)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {/* 曲线背景区域 */}
      <path
        d={`${pathD} L ${points[points.length - 1]?.x || 0} ${height - padding} L ${padding} ${height - padding} Z`}
        fill="url(#emotionGradient)"
        fillOpacity="0.1"
      />
      {/* 曲线 */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#emotionGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 数据点 */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={6}
            className={cn(
              'fill-white stroke-2',
              p.intensity >= 4
                ? 'stroke-green-500'
                : p.intensity >= 3
                  ? 'stroke-yellow-500'
                  : 'stroke-red-500'
            )}
          />
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            className="text-xs fill-current text-muted-foreground"
          >
            {p.intensity}
          </text>
        </g>
      ))}
    </svg>
  );
});

/**
 * 用户旅程图展示组件
 * 横向展示用户旅程阶段，支持情绪曲线、痛点标记和机会点展示
 */
export const JourneyMapViewer = memo(function JourneyMapViewer({
  journeyMap,
  onExport,
  className,
}: JourneyMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // 切换阶段展开状态
  const toggleStage = useCallback((stageName: string) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stageName)) {
        newSet.delete(stageName);
      } else {
        newSet.add(stageName);
      }
      return newSet;
    });
  }, []);

  // 获取阶段的行为数据
  const getStageActions = useCallback(
    (stageName: string) => {
      return journeyMap.actions?.filter((a) => a.stage === stageName) || [];
    },
    [journeyMap.actions]
  );

  // 获取阶段的情绪数据
  const getStageEmotion = useCallback(
    (stageName: string) => {
      return journeyMap.emotions?.find((e) => e.stage === stageName);
    },
    [journeyMap.emotions]
  );

  // 获取阶段的痛点
  const getStagePainPoints = useCallback(
    (stageName: string) => {
      return journeyMap.painPoints?.filter((p) => p.stage === stageName) || [];
    },
    [journeyMap.painPoints]
  );

  // 获取阶段的机会点
  const getStageOpportunities = useCallback(
    (stageName: string) => {
      return (
        journeyMap.opportunities?.filter((o) => o.stage === stageName) || []
      );
    },
    [journeyMap.opportunities]
  );

  // 导出为图片
  const handleExport = useCallback(async () => {
    if (onExport) {
      onExport();
      return;
    }

    // 默认导出逻辑可以在这里实现
    // 需要引入 html2canvas 等库
    console.log('Export journey map as image');
  }, [onExport]);

  if (!journeyMap.stages || journeyMap.stages.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ExternalLink className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">暂无用户旅程数据</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {journeyMap.title}
          </CardTitle>
          {onExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出图片
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto" ref={containerRef}>
          {/* 情绪曲线 */}
          {journeyMap.emotions && journeyMap.emotions.length > 0 && (
            <div className="border-b border-border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  情绪曲线
                </span>
              </div>
              <EmotionCurve
                emotions={journeyMap.emotions}
                stages={journeyMap.stages}
              />
            </div>
          )}

          {/* 时间线 */}
          <div className="flex items-stretch min-w-max">
            {journeyMap.stages.map((stage, index) => {
              const isExpanded = expandedStages.has(stage.name);
              const painPoints = getStagePainPoints(stage.name);
              const opportunities = getStageOpportunities(stage.name);
              const emotion = getStageEmotion(stage.name);
              const actions = getStageActions(stage.name);

              return (
                <div
                  key={stage.name}
                  className={cn(
                    'flex-1 min-w-[200px] border-r border-border last:border-r-0',
                    'flex flex-col'
                  )}
                >
                  {/* 阶段头部 */}
                  <div
                    className={cn(
                      'p-4 bg-gradient-to-br from-primary/5 to-primary/10',
                      'border-b border-border',
                      'cursor-pointer hover:bg-primary/10 transition-colors'
                    )}
                    onClick={() => toggleStage(stage.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">
                            {stage.name}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>

                  {/* 用户行为 */}
                  {actions.length > 0 && (
                    <div className="p-3 border-b border-border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          用户行为
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {actions.map((action, i) => (
                          <div
                            key={i}
                            className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800"
                          >
                            {action.action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 情绪状态 */}
                  {emotion && (
                    <div className="p-3 border-b border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <EmotionIcon
                          emotion={emotion.emotion}
                          intensity={emotion.intensity}
                        />
                        <span className="text-xs font-medium">
                          {emotion.emotion}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {emotion.intensity}/5
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {emotion.reason}
                      </p>
                    </div>
                  )}

                  {/* 痛点 */}
                  {painPoints.length > 0 && (
                    <div className="p-3 border-b border-border bg-red-50/50 dark:bg-red-900/10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">
                          痛点 ({painPoints.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {painPoints.map((pp, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'text-xs p-2 rounded border',
                                    getSeverityColor(pp.severity)
                                  )}
                                >
                                  <p className="line-clamp-1">{pp.painPoint}</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-xs"
                              >
                                <p className="text-xs">{pp.painPoint}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  严重程度: {pp.severity} | 频率: {pp.frequency}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 机会点 */}
                  {opportunities.length > 0 && (
                    <div className="p-3 bg-green-50/50 dark:bg-green-900/10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          机会点 ({opportunities.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {opportunities.map((opp, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'text-xs p-2 rounded border',
                                    getPotentialColor(opp.potential)
                                  )}
                                >
                                  <p className="line-clamp-1">
                                    {opp.opportunity}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-xs"
                              >
                                <p className="text-xs">{opp.opportunity}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  潜力: {opp.potential} | 投入: {opp.effort}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 展开的详情 */}
                  {isExpanded && (
                    <div className="p-3 bg-muted/30 text-xs text-muted-foreground">
                      {stage.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default JourneyMapViewer;
