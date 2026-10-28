'use client';

/**
 * 提纲展示组件（滚轮模式）
 *
 * @module components/features/interview/OutlineSection
 * @description 展示访谈提纲，区分核心问题和补充问题，采用滚轮滚动模式
 */

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Star,
  Plus,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Lightbulb,
  Building2,
} from 'lucide-react';
import type { Outline } from '@/lib/api/interview-assistant/types';
import { cn } from '@/lib/utils';

interface OutlineSectionProps {
  outlines: Outline[];
  onEdit?: (outline: Outline) => void;
  onDelete?: (outlineId: string) => void;
  onClearAll?: () => void;
  onStatusChange?: (outlineId: string, status: 'pending' | 'asked' | 'skipped') => void;
  onAddQuestion?: () => void;
}

/**
 * 状态徽章
 */
function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: '待问', variant: 'secondary' as const, icon: Clock, color: 'text-gray-500' },
    asked: { label: '已问', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
    skipped: { label: '跳过', variant: 'outline' as const, icon: XCircle, color: 'text-gray-400' },
  };

  const { label, variant, icon: Icon, color } = config[status as keyof typeof config] || config.pending;

  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Icon className={cn('h-3 w-3', color)} />
      {label}
    </Badge>
  );
}

/**
 * 优先级徽章
 */
function PriorityBadge({ priority }: { priority: number }) {
  const colors = {
    1: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    2: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    4: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    5: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colors[priority as keyof typeof colors] || colors[3])}>
      P{priority}
    </span>
  );
}

/**
 * 引用关系徽章
 */
function InsightReferenceBadge({ outline }: { outline: Outline }) {
  if (!outline.insightReferenceType) {
    return null;
  }

  const config = {
    pain_point: {
      label: outline.relatedPainPointIndex !== undefined ? `验证痛点 #${outline.relatedPainPointIndex + 1}` : '验证痛点',
      color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800',
      icon: Target,
    },
    priority_area: {
      label: outline.relatedPriorityAreaIndex !== undefined ? `探索领域 #${outline.relatedPriorityAreaIndex + 1}` : '探索领域',
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800',
      icon: Lightbulb,
    },
    business_scenario: {
      label: '场景特征',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: Building2,
    },
    mixed: {
      label: '综合关联',
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      icon: Star,
    },
  };

  const refConfig = config[outline.insightReferenceType as keyof typeof config];
  if (!refConfig) return null;

  const Icon = refConfig.icon;

  return (
    <Badge variant="outline" className={cn('text-[10px] gap-0.5', refConfig.color)}>
      <Icon className="h-2.5 w-2.5" />
      {refConfig.label}
    </Badge>
  );
}

/**
 * 问题卡片组件
 */
function QuestionCard({
  outline,
  isCore,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  outline: Outline;
  isCore: boolean;
  onEdit?: (outline: Outline) => void;
  onDelete?: (outlineId: string) => void;
  onStatusChange?: (outlineId: string, status: 'pending' | 'asked' | 'skipped') => void;
}) {
  const statusColors = {
    pending: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    asked: 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800',
    skipped: 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 opacity-60',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border cursor-pointer',
        'transition-all duration-300 ease-out',
        statusColors[outline.status as keyof typeof statusColors] || statusColors.pending
      )}
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* 状态图标 */}
      <div className="mt-0.5 shrink-0">
        {outline.status === 'asked' ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : outline.status === 'skipped' ? (
          <XCircle className="h-5 w-5 text-gray-400" />
        ) : (
          <Clock className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* 问题内容 */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-start gap-2">
          <span className="text-sm font-medium leading-snug flex-1">
            {outline.question}
          </span>
          <PriorityBadge priority={outline.priority} />
        </div>

        {/* 引用标签和说明 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <InsightReferenceBadge outline={outline} />
          {outline.reasoning && (
            <span className="text-xs text-muted-foreground whitespace-normal break-words leading-relaxed">
              <CheckCircle className="h-3 w-3 inline mr-1 text-yellow-500" />
              {outline.reasoning}
            </span>
          )}
        </div>
      </div>

      {/* 状态徽章和操作 */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={outline.status} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onStatusChange && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange(outline.id, 'asked')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  标记为已问
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(outline.id, 'skipped')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  标记为跳过
                </DropdownMenuItem>
                {outline.status !== 'pending' && (
                  <DropdownMenuItem onClick={() => onStatusChange(outline.id, 'pending')}>
                    <Clock className="h-4 w-4 mr-2" />
                    重置为待问
                  </DropdownMenuItem>
                )}
              </>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(outline)}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(outline.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function OutlineSection({
  outlines,
  onEdit,
  onDelete,
  onClearAll,
  onStatusChange,
  onAddQuestion,
}: OutlineSectionProps) {
  const [isSupplementaryExpanded, setIsSupplementaryExpanded] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 分离核心问题和补充问题
  const coreQuestions = outlines.filter((o) => o.isCore !== false);
  const supplementaryQuestions = outlines.filter((o) => o.isCore === false);

  // 统计状态
  const askedCount = outlines.filter(o => o.status === 'asked').length;
  const pendingCount = outlines.filter(o => o.status === 'pending').length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          访谈提纲
          <Badge variant="secondary">{outlines.length}</Badge>
          {askedCount > 0 && (
            <Badge variant="default" className="text-xs">
              {askedCount}/{outlines.length} 已问
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {outlines.length > 0 && onClearAll && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              <Trash2 className="h-4 w-4 mr-1" />
              清空提纲
            </Button>
          )}
          {onAddQuestion && (
            <Button variant="outline" size="sm" onClick={onAddQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              添加问题
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {outlines.length > 0 ? (
          <div className="relative">
            {/* 顶部渐变遮罩 */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            {/* 底部渐变遮罩 */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

            <ScrollArea className="h-[400px] overflow-y-auto" ref={scrollAreaRef}>
              <div
                className="space-y-2 py-4 px-3"
                style={{
                  scrollSnapType: 'y proximity',
                  scrollBehavior: 'smooth',
                }}
              >
                {/* 核心问题分组标题 */}
                {coreQuestions.length > 0 && (
                  <div
                    className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-2 px-3 rounded-lg border-b"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-sm">核心问题（必问）</span>
                      <Badge variant="secondary" className="text-xs">
                        {coreQuestions.filter(o => o.status === 'asked').length}/{coreQuestions.length}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* 核心问题列表 */}
                {coreQuestions.map((outline) => (
                  <QuestionCard
                    key={outline.id}
                    outline={outline}
                    isCore={true}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                  />
                ))}

                {/* 补充问题分组标题（可折叠） */}
                {supplementaryQuestions.length > 0 && (
                  <>
                    <div
                      className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-2 px-3 rounded-lg border-b mt-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      style={{ scrollSnapAlign: 'start' }}
                      onClick={() => setIsSupplementaryExpanded(!isSupplementaryExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-sm">补充问题（可选）</span>
                        <Badge variant="outline" className="text-xs">
                          {supplementaryQuestions.filter(o => o.status === 'asked').length}/{supplementaryQuestions.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSupplementaryExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* 补充问题列表（可折叠） */}
                    {isSupplementaryExpanded && supplementaryQuestions.map((outline) => (
                      <QuestionCard
                        key={outline.id}
                        outline={outline}
                        isCore={false}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* 空状态 */
          <div className="text-center py-12 text-muted-foreground px-4">
            <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">暂无访谈提纲</p>
            {onAddQuestion && (
              <Button variant="outline" className="mt-3" onClick={onAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                生成提纲
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
