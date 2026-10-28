'use client';

/**
 * 核心问题选择对话框组件（滚轮模式）
 *
 * @module components/features/interview/CoreQuestionsDialog
 * @description 用户选择核心问题和补充问题的对话框，采用滚轮滚动模式
 * @feature 滚轮选择器效果：scroll-snap吸附、选中项高亮、层叠视觉效果
 * @feature 核心问题与补充问题整合在同一滚轮中，通过分组标识区分
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Plus, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Target, Lightbulb, Building2 } from 'lucide-react';
import type {
  CoreQuestion,
  SupplementaryQuestion,
} from '@/lib/api/interview-assistant/types';
import { cn } from '@/lib/utils';

// 新增：引用类型Badge组件
function InsightReferenceBadge({ question }: { question: CoreQuestion | SupplementaryQuestion }) {
  if (!question.insightReferenceType) {
    return null;
  }

  const config = {
    pain_point: {
      label: question.relatedPainPointIndex !== undefined ? `验证痛点 #${question.relatedPainPointIndex + 1}` : '验证痛点',
      color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      icon: Target,
    },
    priority_area: {
      label: question.relatedPriorityAreaIndex !== undefined ? `探索领域 #${question.relatedPriorityAreaIndex + 1}` : '探索领域',
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      icon: Lightbulb,
    },
    business_scenario: {
      label: '场景特征',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      icon: Building2,
    },
    mixed: {
      label: '综合关联',
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      icon: Star,
    },
  };

  const refConfig = config[question.insightReferenceType as keyof typeof config];
  if (!refConfig) return null;

  const Icon = refConfig.icon;

  return (
    <Badge className={`text-[10px] gap-0.5 ${refConfig.color}`}>
      <Icon className="h-2.5 w-2.5" />
      {refConfig.label}
    </Badge>
  );
}

interface CoreQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coreQuestions: CoreQuestion[];
  supplementaryQuestions: SupplementaryQuestion[];
  isLoading?: boolean;
  onConfirm: (
    selectedQuestions: Array<{
      question: string;
      priority: number;
      isCore: boolean;
      reasoning?: string;
      relatedInsight?: string;
      relatedPainPointIndex?: number;
      relatedPriorityAreaIndex?: number;
      relatedBusinessScenarioKey?: string;
      insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed';
    }>
  ) => void;
}

export function CoreQuestionsDialog({
  open,
  onOpenChange,
  coreQuestions,
  supplementaryQuestions,
  isLoading = false,
  onConfirm,
}: CoreQuestionsDialogProps) {
  // 核心问题默认全选
  const [selectedCore, setSelectedCore] = useState<Set<number>>(new Set());
  // 补充问题默认不选
  const [selectedSupplementary, setSelectedSupplementary] = useState<
    Set<number>
  >(new Set());
  // 补充问题区域是否展开
  const [isSupplementaryExpanded, setIsSupplementaryExpanded] = useState(true);
  // 滚动区域引用
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 当对话框打开时，初始化选择状态
  useEffect(() => {
    if (open) {
      setSelectedCore(new Set(coreQuestions.map((_, i) => i)));
      setSelectedSupplementary(new Set());
      setIsSupplementaryExpanded(true);
    }
  }, [open]);

  // 重置选择
  const resetSelection = () => {
    setSelectedSupplementary(new Set());
  };

  // 处理确认
  const handleConfirm = () => {
    const selectedQuestions = [
      ...Array.from(selectedCore).map((i) => ({
        question: coreQuestions[i].question,
        priority: coreQuestions[i].priority,
        isCore: true,
        reasoning: coreQuestions[i].reasoning,
        relatedInsight: coreQuestions[i].relatedInsight,
        // 新增：结构化引用字段
        relatedPainPointIndex: coreQuestions[i].relatedPainPointIndex,
        relatedPriorityAreaIndex: coreQuestions[i].relatedPriorityAreaIndex,
        relatedBusinessScenarioKey: coreQuestions[i].relatedBusinessScenarioKey,
        insightReferenceType: coreQuestions[i].insightReferenceType,
      })),
      ...Array.from(selectedSupplementary).map((i) => ({
        question: supplementaryQuestions[i].question,
        priority: supplementaryQuestions[i].priority,
        isCore: false,
        reasoning: supplementaryQuestions[i].reasoning,
        relatedInsight: supplementaryQuestions[i].relatedInsight,
        // 新增：结构化引用字段
        relatedPainPointIndex: supplementaryQuestions[i].relatedPainPointIndex,
        relatedPriorityAreaIndex: supplementaryQuestions[i].relatedPriorityAreaIndex,
        relatedBusinessScenarioKey: supplementaryQuestions[i].relatedBusinessScenarioKey,
        insightReferenceType: supplementaryQuestions[i].insightReferenceType,
      })),
    ];

    onConfirm(selectedQuestions);
    resetSelection();
    onOpenChange(false);
  };

  // 切换核心问题选择
  const toggleCoreQuestion = (index: number) => {
    const newSelected = new Set(selectedCore);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCore(newSelected);
  };

  // 切换补充问题选择
  const toggleSupplementaryQuestion = (index: number) => {
    const newSelected = new Set(selectedSupplementary);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSupplementary(newSelected);
  };

  // 全选/取消全选核心问题
  const toggleAllCore = () => {
    if (selectedCore.size === coreQuestions.length) {
      setSelectedCore(new Set());
    } else {
      setSelectedCore(new Set(coreQuestions.map((_, i) => i)));
    }
  };

  // 全选/取消全选补充问题
  const toggleAllSupplementary = () => {
    if (selectedSupplementary.size === supplementaryQuestions.length) {
      setSelectedSupplementary(new Set());
    } else {
      setSelectedSupplementary(
        new Set(supplementaryQuestions.map((_, i) => i))
      );
    }
  };

  const totalSelected = selectedCore.size + selectedSupplementary.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>选择访谈问题</DialogTitle>
          <DialogDescription>
            核心问题是必问问题，补充问题用于深入了解。请勾选要添加到提纲的问题，然后点击底部的"添加"按钮。
          </DialogDescription>
        </DialogHeader>

        {/* 统一滚轮容器 */}
        <div className="relative flex-1">
          {/* 顶部渐变遮罩 */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none rounded-t-lg" />
          {/* 底部渐变遮罩 */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none rounded-b-lg" />

          <ScrollArea className="h-[400px] overflow-y-auto" ref={scrollAreaRef}>
            <div
              className="space-y-2 py-4 px-1"
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
                      {selectedCore.size}/{coreQuestions.length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleAllCore} className="h-7 text-xs">
                    {selectedCore.size === coreQuestions.length ? '取消全选' : '全选'}
                  </Button>
                </div>
              )}

              {/* 核心问题列表 */}
              {coreQuestions.map((q, i) => (
                <div
                  key={`core-${i}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer',
                    'transition-all duration-300 ease-out',
                    selectedCore.has(i)
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800 shadow-sm'
                      : 'bg-muted/30 hover:bg-muted/50 border-border/50 opacity-70 hover:opacity-100'
                  )}
                  style={{ scrollSnapAlign: 'start' }}
                  onClick={() => toggleCoreQuestion(i)}
                >
                  <Checkbox
                    checked={selectedCore.has(i)}
                    onCheckedChange={() => toggleCoreQuestion(i)}
                    className="mt-0.5 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                  />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        'text-sm font-medium leading-snug',
                        selectedCore.has(i) ? 'text-yellow-800 dark:text-yellow-200' : 'text-foreground'
                      )}>
                        {q.question}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                        P{q.priority}
                      </Badge>
                    </div>
                    {/* 新增：显示引用关系 */}
                    {q.insightReferenceType && (
                      <div className="flex items-center gap-1">
                        <InsightReferenceBadge question={q} />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <CheckCircle2 className="h-3 w-3 inline mr-1 text-yellow-500" />
                      {q.reasoning}
                    </p>
                    <p className="text-xs text-muted-foreground/70 line-clamp-1">
                      关联: {q.relatedInsight}
                    </p>
                  </div>
                </div>
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
                        {selectedSupplementary.size}/{supplementaryQuestions.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllSupplementary();
                        }}
                        className="h-7 text-xs"
                      >
                        {selectedSupplementary.size === supplementaryQuestions.length ? '取消全选' : '全选'}
                      </Button>
                      {isSupplementaryExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* 补充问题列表（可折叠） */}
                  {isSupplementaryExpanded && supplementaryQuestions.map((q, i) => (
                    <div
                      key={`supp-${i}`}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-xl border cursor-pointer',
                        'transition-all duration-300 ease-out',
                        selectedSupplementary.has(i)
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 shadow-sm'
                          : 'bg-muted/30 hover:bg-muted/50 border-border/50 opacity-60 hover:opacity-100'
                      )}
                      style={{ scrollSnapAlign: 'start' }}
                      onClick={() => toggleSupplementaryQuestion(i)}
                    >
                      <Checkbox
                        checked={selectedSupplementary.has(i)}
                        onCheckedChange={() => toggleSupplementaryQuestion(i)}
                        className="mt-0.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className={cn(
                            'text-sm leading-snug',
                            selectedSupplementary.has(i) ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-foreground'
                          )}>
                            {q.question}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                            P{q.priority}
                          </Badge>
                        </div>
                        {/* 新增：显示引用关系 */}
                        {q.insightReferenceType && (
                          <div className="flex items-center gap-1">
                            <InsightReferenceBadge question={q} />
                          </div>
                        )}
                        {q.reasoning && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            <CheckCircle2 className="h-3 w-3 inline mr-1 text-blue-500" />
                            {q.reasoning}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 line-clamp-1">
                          关联: {q.relatedInsight}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 无问题提示 */}
              {coreQuestions.length === 0 && supplementaryQuestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">没有可用的问题</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 底部操作栏 */}
        <DialogFooter className="border-t pt-4 mt-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                已选择 <span className="font-bold text-primary text-lg">{totalSelected}</span> 个问题
              </span>
              {selectedCore.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  {selectedCore.size} 核心
                </Badge>
              )}
              {selectedSupplementary.size > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Plus className="h-3 w-3 mr-1 text-blue-500" />
                  {selectedSupplementary.size} 补充
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={totalSelected === 0 || isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  <>添加 {totalSelected} 个问题</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
