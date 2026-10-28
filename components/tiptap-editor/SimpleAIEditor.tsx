'use client';

/**
 * 简洁版AI编辑器 - 适合快速集成
 * 特点：代码精简，易于理解和定制
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// 简化的AI操作类型
type SimpleAIOperation = 'polish' | 'expand' | 'shorten';

// 简化的AI响应模拟
const mockAIResponse = (operation: SimpleAIOperation, text: string): string => {
  const responses = {
    polish: `✨ 润色后：${text}`,
    expand: `${text}\n\n📝 扩展内容：这里添加了更多详细信息，使文章内容更加丰富和完整。`,
    shorten: text.split('，')[0] + '...',
  };
  return responses[operation];
};

export function SimpleAIEditor() {
  const [isAILoading, setIsAILoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: `
      <h1>简洁版AI编辑器</h1>
      <p>这是一个精简版的AI编辑器实现，代码更简单，易于理解。</p>
      <p>选中这段文字，然后点击上方的AI按钮试试！</p>
    `,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  // 处理AI操作
  const handleAI = async (operation: SimpleAIOperation) => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText) {
      toast.error('请先选择文本');
      return;
    }

    setIsAILoading(true);

    // 模拟AI处理
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = mockAIResponse(operation, selectedText);

    // 更新编辑器内容
    editor.chain().focus().deleteSelection().insertContent(result).run();

    setIsAILoading(false);
    toast.success('AI处理完成');
  };

  if (!editor) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">简洁版AI编辑器</h2>
        </div>
        {isAILoading && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI处理中...
          </Badge>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <EditorContent editor={editor} />

        {/* AI Bubble Menu - 暂时禁用 */}
        {/* <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex gap-1 bg-background border rounded-lg shadow-lg p-2"
          shouldShow={({ editor }) => {
            const { from, to } = editor.state.selection;
            return from !== to;
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAI('polish')}
            disabled={isAILoading}
          >
            ✨ 润色
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAI('expand')}
            disabled={isAILoading}
          >
            📝 扩写
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAI('shorten')}
            disabled={isAILoading}
          >
            ✂️ 缩写
          </Button>
        </BubbleMenu> */}
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>💡 提示：选中任意文本，AI菜单会自动出现</p>
        <p>🎯 特点：代码精简、易于定制、快速集成</p>
      </div>
    </div>
  );
}
