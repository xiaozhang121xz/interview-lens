'use client';

import * as React from 'react';
import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  AlertCircle,
  TrendingUp,
  Star,
  Circle,
  ChevronDown,
  ChevronRight,
  MessageSquareQuote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useKANOCategorization,
  KANO_TYPE_CONFIG,
  type KANOCategorizedRequirement,
  type KANOType,
} from '@/hooks/use-kano-categorization';

/**
 * KANO 分类面板 Props
 */
export interface KANOCategorizationPanelProps {
  /** 需求列表 */
  requirements: Array<{
    id: string;
    description: string;
    customerQuotes?: string[];
  }>;
  /** 分类变更回调 */
  onCategoryChange?: (requirementId: string, newType: KANOType) => void;
  /** 验证问题点击回调 */
  onQuestionClick?: (question: string) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 类型图标组件
 */
const TypeIcon = memo(function TypeIcon({ type }: { type: KANOType }) {
  const iconMap: Record<KANOType, React.ReactNode> = {
    'must-be': <AlertCircle className="w-4 h-4 text-red-500" />,
    performance: <TrendingUp className="w-4 h-4 text-yellow-500" />,
    attractive: <Star className="w-4 h-4 text-green-500" />,
    indifferent: <Circle className="w-4 h-4 text-gray-400" />,
  };

  return iconMap[type] || <Circle className="w-4 h-4" />;
});

/**
 * 需求卡片组件
 */
const RequirementCard = memo(function RequirementCard({
  requirement,
  onCategoryChange,
  onQuestionClick,
  expanded,
  onToggle,
}: {
  requirement: KANOCategorizedRequirement;
  onCategoryChange?: (id: string, type: KANOType) => void;
  onQuestionClick?: (question: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = KANO_TYPE_CONFIG[requirement.kanoType];

  const handleTypeChange = (newType: KANOType) => {
    onCategoryChange?.(requirement.id, newType);
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        config.color.border
      )}
    >
      <button
        className="w-full flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
        onClick={onToggle}
      >
        <TypeIcon type={requirement.kanoType} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn('text-xs', config.color.text, config.color.border)}
            >
              {config.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {requirement.priority}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {requirement.confidence}% 置信度
            </span>
          </div>
          <p className="text-sm line-clamp-2">{requirement.description}</p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-2 bg-muted/10">
          {/* 分类推理 */}
          <p className="text-xs text-muted-foreground">{requirement.reasoning}</p>

          {/* 客户原话 */}
          {requirement.customerQuotes && requirement.customerQuotes.length > 0 && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">客户原话：</span>
              <p className="italic text-muted-foreground mt-0.5">
                "{requirement.customerQuotes[0]}"
              </p>
            </div>
          )}

          {/* 验证问题 */}
          {requirement.verificationQuestions.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MessageSquareQuote className="w-3 h-3" />
                验证问题
              </span>
              {requirement.verificationQuestions.slice(0, 2).map((q, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto py-1 justify-start w-full"
                  onClick={() => onQuestionClick?.(q)}
                >
                  • {q}
                </Button>
              ))}
            </div>
          )}

          {/* 手动调整分类 */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">调整分类：</span>
            <Select value={requirement.kanoType} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-7 text-xs w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="must-be">🔴 基本型</SelectItem>
                <SelectItem value="performance">🟡 期望型</SelectItem>
                <SelectItem value="attractive">🟢 兴奋型</SelectItem>
                <SelectItem value="indifferent">⚪ 无差异</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * 统计概览组件
 */
const StatisticsOverview = memo(function StatisticsOverview({
  statistics,
  typeConfig,
}: {
  statistics: {
    total: number;
    byType: Record<KANOType, number>;
    byPriority: Record<'P0' | 'P1' | 'P2', number>;
  };
  typeConfig: typeof KANO_TYPE_CONFIG;
}) {
  const types: KANOType[] = ['must-be', 'performance', 'attractive', 'indifferent'];

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* 按类型统计 */}
      <div className="col-span-2 flex items-center gap-2">
        {types.map((type) => {
          const config = typeConfig[type];
          const count = statistics.byType[type];
          return (
            <div
              key={type}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                config.color.bg,
                config.color.text
              )}
            >
              <TypeIcon type={type} />
              <span>{config.label}: {count}</span>
            </div>
          );
        })}
      </div>

      {/* 按优先级统计 */}
      <div className="col-span-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">优先级：</span>
        <Badge variant="outline" className="text-xs text-red-600">
          P0: {statistics.byPriority.P0}
        </Badge>
        <Badge variant="outline" className="text-xs text-yellow-600">
          P1: {statistics.byPriority.P1}
        </Badge>
        <Badge variant="outline" className="text-xs text-green-600">
          P2: {statistics.byPriority.P2}
        </Badge>
      </div>
    </div>
  );
});

/**
 * KANO 分类面板组件
 */
export const KANOCategorizationPanel = memo(function KANOCategorizationPanel({
  requirements,
  onCategoryChange,
  onQuestionClick,
  className,
  compact = false,
}: KANOCategorizationPanelProps) {
  const {
    categorizedRequirements,
    statistics,
    typeConfig,
  } = useKANOCategorization({ requirements });

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<KANOType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<'P0' | 'P1' | 'P2' | 'all'>('all');

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 筛选需求
  const filteredRequirements = useMemo(() => {
    let filtered = categorizedRequirements;

    if (filterType !== 'all') {
      filtered = filtered.filter((r) => r.kanoType === filterType);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((r) => r.priority === filterPriority);
    }

    return filtered;
  }, [categorizedRequirements, filterType, filterPriority]);

  // 紧凑模式
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-2 rounded-lg bg-muted/50', className)}>
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm">{statistics.total} 个需求</span>
        <Badge variant="outline" className="text-xs text-red-600">
          P0: {statistics.byPriority.P0}
        </Badge>
        <Badge variant="outline" className="text-xs text-yellow-600">
          P1: {statistics.byPriority.P1}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            KANO 需求分类
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {statistics.total} 个需求
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* 统计概览 */}
        <StatisticsOverview statistics={statistics} typeConfig={typeConfig} />

        {/* 筛选器 */}
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as KANOType | 'all')}>
            <SelectTrigger className="h-8 text-xs w-auto">
              <SelectValue placeholder="类型筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="must-be">🔴 基本型</SelectItem>
              <SelectItem value="performance">🟡 期望型</SelectItem>
              <SelectItem value="attractive">🟢 兴奋型</SelectItem>
              <SelectItem value="indifferent">⚪ 无差异</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as 'P0' | 'P1' | 'P2' | 'all')}>
            <SelectTrigger className="h-8 text-xs w-auto">
              <SelectValue placeholder="优先级筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部优先级</SelectItem>
              <SelectItem value="P0">P0 (基本型)</SelectItem>
              <SelectItem value="P1">P1 (期望型)</SelectItem>
              <SelectItem value="P2">P2 (其他)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 需求列表 */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {filteredRequirements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无需求</p>
                <p className="text-xs mt-1">提取需求后将自动进行 KANO 分类</p>
              </div>
            ) : (
              filteredRequirements.map((req) => (
                <RequirementCard
                  key={req.id}
                  requirement={req}
                  onCategoryChange={onCategoryChange}
                  onQuestionClick={onQuestionClick}
                  expanded={expandedIds.has(req.id)}
                  onToggle={() => toggleExpanded(req.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* KANO 说明 */}
        <div className="flex-shrink-0 p-2 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>KANO 模型说明：</strong></p>
            <p>🔴 <strong>基本型</strong>：必须满足，缺失导致不满</p>
            <p>🟡 <strong>期望型</strong>：越多越好，满意度成正比</p>
            <p>🟢 <strong>兴奋型</strong>：超出预期，带来惊喜</p>
            <p>⚪ <strong>无差异</strong>：有无皆可，无影响</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default KANOCategorizationPanel;