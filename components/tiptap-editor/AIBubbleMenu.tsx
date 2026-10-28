'use client';

/**
 * AI BubbleMenu组件 - 选中文本时显示的AI操作菜单
 */

import { useCallback } from 'react';
// import { BubbleMenu as ReactBubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Sparkles, Wand2 } from 'lucide-react';
import { useAIEditorStore } from '@/stores/features/aiEditorStore';
import { aiService, AIOperation } from '@/lib/services/aiService';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIBubbleMenuProps {
  editor: Editor | null;
}

const AI_OPERATIONS: Array<{
  id: AIOperation;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: 'polish',
    label: '润色',
    icon: <Sparkles className="h-4 w-4" />,
    description: '改善文本表达和流畅度',
  },
  {
    id: 'expand',
    label: '扩写',
    icon: <Wand2 className="h-4 w-4" />,
    description: '添加更多细节和内容',
  },
  {
    id: 'shorten',
    label: '缩写',
    icon: <Wand2 className="h-4 w-4" />,
    description: '精简文本，保留核心信息',
  },
  {
    id: 'summarize',
    label: '总结',
    icon: <Wand2 className="h-4 w-4" />,
    description: '提取文本要点',
  },
  {
    id: 'rewrite',
    label: '重写',
    icon: <Wand2 className="h-4 w-4" />,
    description: '使用不同表达方式重写',
  },
];

export function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const { isAILoading, setAILoading, addOperationToHistory } =
    useAIEditorStore();

  // 处理AI操作
  const handleAIOperation = useCallback(
    async (operation: AIOperation) => {
      if (!editor) return;

      // 获取选中的文本
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      if (!selectedText) {
        toast.error('请先选择要处理的文本');
        return;
      }

      setAILoading(true);

      try {
        // 调用AI服务（使用mock模式用于演示）
        const response = await aiService.mockAI({
          operation,
          content: selectedText,
        });

        if (response.success) {
          // 替换选中的文本
          editor
            .chain()
            .focus()
            .deleteSelection()
            .insertContent(response.content)
            .run();

          // 添加到历史记录
          addOperationToHistory(operation, selectedText, response.content);

          toast.success(`${getOperationLabel(operation)}完成`);
        } else {
          toast.error(`AI操作失败: ${response.error}`);
        }
      } catch (error) {
        console.error('AI operation error:', error);
        toast.error('AI操作失败，请重试');
      } finally {
        setAILoading(false);
      }
    },
    [editor, setAILoading, addOperationToHistory]
  );

  if (!editor) {
    return null;
  }

  // 暂时禁用 BubbleMenu，等待 Tiptap v3 的 BubbleMenu 组件可用
  return null;

  // 原始 BubbleMenu 代码（已注释）
  // return (
  //   <ReactBubbleMenu
  //     editor={editor}
  //     tippyOptions={{
  //       duration: 100,
  //       placement: 'top',
  //     }}
  //     className="bg-background border border-border rounded-lg shadow-lg p-2 flex gap-1"
  //     shouldShow={({ editor }) => {
  //       // 只在有选中文本时显示
  //       const { from, to } = editor.state.selection;
  //       return from !== to;
  //     }}
  //   >
  //     <TooltipProvider>
  //       <div className="flex items-center gap-1">
  //         <div className="flex items-center gap-1 px-2">
  //           <Sparkles className="h-4 w-4 text-primary" />
  //           <span className="text-xs font-medium text-foreground">AI助手</span>
  //         </div>

  //         <div className="w-px h-6 bg-border mx-1" />

  //         {AI_OPERATIONS.map((op) => (
  //           <Tooltip key={op.id}>
  //             <TooltipTrigger asChild>
  //               <Button
  //                 variant="ghost"
  //                 size="sm"
  //                 onClick={() => handleAIOperation(op.id)}
  //                 disabled={isAILoading}
  //                 className="h-8 px-2"
  //               >
  //                 {isAILoading ? (
  //                   <Loader2 className="h-4 w-4 animate-spin" />
  //                 ) : (
  //                   <>
  //                     {op.icon}
  //                     <span className="text-xs">{op.label}</span>
  //                   </>
  //                 )}
  //               </Button>
  //             </TooltipTrigger>
  //             <TooltipContent>
  //               <p>{op.description}</p>
  //             </TooltipContent>
  //           </Tooltip>
  //         ))}
  //       </div>
  //     </TooltipProvider>
  //   </ReactBubbleMenu>
  // );
}

function getOperationLabel(operation: AIOperation): string {
  const labels: Record<AIOperation, string> = {
    polish: '润色',
    expand: '扩写',
    shorten: '缩写',
    translate: '翻译',
    summarize: '总结',
    rewrite: '重写',
    continue: '续写',
  };
  return labels[operation];
}
