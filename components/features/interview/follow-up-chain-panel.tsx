'use client';

import * as React from 'react';
import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  Target,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFollowUpChain,
  FIVE_WHY_TEMPLATES,
  type FollowUpChainState,
  type FollowUpChainNode,
  type FollowUpWarning,
} from '@/hooks/use-follow-up-chain';
import { calculateChainCompleteness, checkIfRootCause } from '@/lib/constants/follow-up-chain';

/**
 * 追问链面板 Props
 */
export interface FollowUpChainPanelProps {
  /** 初始追问链列表 */
  initialChains?: FollowUpChainState[];
  /** 最小深度要求 */
  minimumDepth?: number;
  /** 追问链变更回调 */
  onChainsChange?: (chains: FollowUpChainState[]) => void;
  /** 追问建议采纳回调 */
  onAdoptSuggestion?: (suggestion: string) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 追问链节点组件
 */
const ChainNode = memo(function ChainNode({
  node,
  isLast,
  onAddAnswer,
}: {
  node: FollowUpChainNode;
  isLast: boolean;
  onAddAnswer?: (answer: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [answer, setAnswer] = useState(node.answer || '');

  const handleSaveAnswer = () => {
    if (answer.trim() && onAddAnswer) {
      onAddAnswer(answer.trim());
      setShowInput(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* 连接线 */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            node.isRootCause
              ? 'bg-green-100 text-green-700 border-2 border-green-500'
              : 'bg-primary/10 text-primary'
          )}
        >
          {node.level}
        </div>
        {!isLast && <div className="w-0.5 h-8 bg-border" />}
      </div>

      {/* 内容 */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            Why{node.level}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {FIVE_WHY_TEMPLATES[node.level - 1]?.purpose}
          </span>
        </div>
        <p className="text-sm font-medium mb-2">{node.question}</p>

        {node.answer ? (
          <div
            className={cn(
              'text-sm p-2 rounded-lg border',
              node.isRootCause
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-muted/50 border-border'
            )}
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p>{node.answer}</p>
                {node.isRootCause && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    已识别为根本原因
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : showInput ? (
          <div className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="输入客户回答..."
              className="text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveAnswer}>
              保存
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowInput(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowInput(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            添加回答
          </Button>
        )}
      </div>
    </div>
  );
});

/**
 * 追问链警告组件
 */
const ChainWarning = memo(function ChainWarning({
  warning,
  onAdoptSuggestion,
}: {
  warning: FollowUpWarning;
  onAdoptSuggestion?: (suggestion: string) => void;
}) {
  const getIcon = () => {
    switch (warning.type) {
      case 'insufficient_depth':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'no_root_cause':
        return <Target className="w-4 h-4 text-orange-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning.message}</p>
          {warning.suggestedQuestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {warning.suggestedQuestions.slice(0, 2).map((q, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto py-1 px-2 justify-start"
                  onClick={() => onAdoptSuggestion?.(q)}
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  {q}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * 单条追问链卡片
 */
const FollowUpChainCard = memo(function FollowUpChainCard({
  chain,
  isActive,
  onSelect,
  onAddFollowUp,
  onDelete,
  onAdoptSuggestion,
}: {
  chain: FollowUpChainState;
  isActive: boolean;
  onSelect: () => void;
  onAddFollowUp: (question: string, answer?: string) => void;
  onDelete: () => void;
  onAdoptSuggestion?: (suggestion: string) => void;
}) {
  const [newQuestion, setNewQuestion] = useState('');
  const completeness = calculateChainCompleteness(chain);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      onAddFollowUp(newQuestion.trim());
      setNewQuestion('');
    }
  };

  const warnings = chain.currentDepth > 0 && chain.currentDepth < 3
    ? [{
        id: 'warning-depth',
        chainId: chain.chainId,
        type: 'insufficient_depth' as const,
        message: `当前深度 ${chain.currentDepth} 层，需要至少 3 层`,
        currentDepth: chain.currentDepth,
        suggestedQuestions: [],
        createdAt: new Date(),
      }]
    : [];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isActive && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardHeader className="py-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">{chain.rootIssue}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={chain.hasMinimumDepth ? 'default' : 'secondary'}
                className="text-xs"
              >
                {chain.currentDepth} 层
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  completeness >= 70 ? 'text-green-600' : completeness >= 40 ? 'text-yellow-600' : 'text-red-600'
                )}
              >
                {completeness}%
              </Badge>
              {chain.status === 'completed' && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {chain.status === 'insufficient' && (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {isActive && (
        <CardContent className="pt-0 px-3 pb-3">
          {/* 警告 */}
          {warnings.length > 0 && (
            <div className="mb-3">
              {warnings.map((w) => (
                <ChainWarning key={w.id} warning={w} onAdoptSuggestion={onAdoptSuggestion} />
              ))}
            </div>
          )}

          {/* 追问节点 */}
          {chain.nodes.length > 0 && (
            <div className="mb-3">
              {chain.nodes.map((node, idx) => (
                <ChainNode
                  key={node.id}
                  node={node}
                  isLast={idx === chain.nodes.length - 1}
                />
              ))}
            </div>
          )}

          {/* 添加新追问 */}
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={`Why${chain.nodes.length + 1}: 继续追问...`}
              className="text-sm"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuestion();
                }
              }}
            />
            <Button size="sm" onClick={handleAddQuestion} disabled={!newQuestion.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
});

/**
 * 追问链面板组件
 */
export const FollowUpChainPanel = memo(function FollowUpChainPanel({
  initialChains = [],
  minimumDepth = 3,
  onChainsChange,
  onAdoptSuggestion,
  className,
  compact = false,
}: FollowUpChainPanelProps) {
  const {
    chains,
    activeChain,
    warnings,
    unresolvedWarningsCount,
    averageCompleteness,
    createChain,
    setActiveChain,
    addFollowUp,
    deleteChain,
    getSuggestion,
  } = useFollowUpChain({ initialChains, minimumDepth });

  const [newIssue, setNewIssue] = useState('');

  // 通知外部变更
  React.useEffect(() => {
    onChainsChange?.(chains);
  }, [chains, onChainsChange]);

  const handleCreateChain = () => {
    if (newIssue.trim()) {
      createChain(newIssue.trim());
      setNewIssue('');
    }
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-2 rounded-lg bg-muted/50', className)}>
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm">{chains.length} 条追问链</span>
        {unresolvedWarningsCount > 0 && (
          <Badge variant="outline" className="text-xs text-yellow-600">
            {unresolvedWarningsCount} 条待深入
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          平均完整度: {averageCompleteness}%
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
            追问链追踪
          </CardTitle>
          <div className="flex items-center gap-2">
            {unresolvedWarningsCount > 0 && (
              <Badge variant="outline" className="text-xs text-yellow-600">
                {unresolvedWarningsCount} 条待深入
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              平均: {averageCompleteness}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* 创建新追问链 */}
        <div className="flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              placeholder="输入问题或痛点开始追踪..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateChain();
                }
              }}
            />
            <Button size="sm" onClick={handleCreateChain} disabled={!newIssue.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 追问链列表 */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {chains.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>输入问题开始 5Why 追问链</p>
                <p className="text-xs mt-1">至少追问 3 层才能追溯根因</p>
              </div>
            ) : (
              chains.map((chain) => (
                <FollowUpChainCard
                  key={chain.chainId}
                  chain={chain}
                  isActive={activeChain?.chainId === chain.chainId}
                  onSelect={() => setActiveChain(chain.chainId)}
                  onAddFollowUp={(q, a) => addFollowUp(chain.chainId, q, a)}
                  onDelete={() => deleteChain(chain.chainId)}
                  onAdoptSuggestion={onAdoptSuggestion}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* 深度要求提示 */}
        <div className="flex-shrink-0 p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span>
              <strong>最低要求：</strong>每个问题需追问至少 {minimumDepth} 层
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default FollowUpChainPanel;