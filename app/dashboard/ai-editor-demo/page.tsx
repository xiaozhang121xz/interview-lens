'use client';

/**
 * AI编辑器示例页面 - 完整演示
 */

import { useState } from 'react';
import { TiptapEditor } from '@/components/tiptap-editor/TiptapEditor';
import { AIBubbleMenu } from '@/components/tiptap-editor/AIBubbleMenu';
import { useAIEditorStore } from '@/stores/features/aiEditorStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, History, Info, Zap } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/dashboard-layout';

const DEMO_CONTENT = `
<h1>欢迎使用AI编辑器</h1>
<p>这是一个基于Tiptap的智能编辑器演示。您可以选中任何文本，然后使用AI功能来处理内容。</p>

<h2>核心功能</h2>
<p>AI编辑器提供了多种智能操作：</p>
<ul>
  <li>润色 - 改善文本表达</li>
  <li>扩写 - 添加更多内容</li>
  <li>缩写 - 精简文本</li>
  <li>总结 - 提取要点</li>
  <li>重写 - 改变表达方式</li>
</ul>

<h2>使用方法</h2>
<p>1. 选中任意文本</p>
<p>2. 在弹出的AI菜单中选择操作</p>
<p>3. 等待AI处理完成</p>
<p>4. 查看处理结果</p>

<p>试试选中这段文字，然后点击"润色"按钮，看看AI如何优化内容！</p>
`;

export default function AIEditorDemoPage() {
  const { editor, isAILoading, operationHistory } = useAIEditorStore();
  const [content, setContent] = useState(DEMO_CONTENT);

  const handleClearHistory = () => {
    useAIEditorStore.getState().clearHistory();
    toast.success('历史记录已清空');
  };

  const handleResetContent = () => {
    setContent(DEMO_CONTENT);
    toast.success('内容已重置');
  };

  return (
    <DashboardLayout title="AI编辑器">
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              AI编辑器演示
            </CardTitle>
            <CardDescription>
              基于Tiptap的智能文本编辑器，支持多种AI操作
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 功能说明卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              功能说明
            </CardTitle>
            <CardDescription>体验AI驱动的智能文本编辑功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">1</Badge>
                  <h4 className="font-medium">选择文本</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  在编辑器中选中任意文本，AI菜单会自动出现
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">2</Badge>
                  <h4 className="font-medium">选择操作</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  点击AI菜单中的操作按钮（润色、扩写等）
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">3</Badge>
                  <h4 className="font-medium">查看结果</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI会自动处理并更新选中的文本内容
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 编辑器区域 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI编辑器</CardTitle>
                <CardDescription>选中任意文本开始使用AI功能</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isAILoading && (
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3 animate-pulse" />
                    AI处理中...
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetContent}
                >
                  重置内容
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder="开始输入内容，或者使用示例文本..."
              />
              {editor && <AIBubbleMenu editor={editor} />}
            </div>
          </CardContent>
        </Card>

        {/* AI操作历史 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  AI操作历史
                </CardTitle>
                <CardDescription>查看最近的AI操作记录</CardDescription>
              </div>
              {operationHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                  清空历史
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {operationHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无AI操作历史</p>
                <p className="text-sm">选中编辑器中的文本并使用AI功能</p>
              </div>
            ) : (
              <div className="space-y-4">
                {operationHistory.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{item.operation}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">
                          原文：
                        </span>
                        <p className="p-2 bg-muted rounded">
                          {item.originalText}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">
                          结果：
                        </span>
                        <p className="p-2 bg-accent rounded">
                          {item.resultText}
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 技术说明 */}
        <Card>
          <CardHeader>
            <CardTitle>技术栈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">核心技术</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Tiptap v2 - 无头编辑器框架</li>
                  <li>• ProseMirror - 底层编辑引擎</li>
                  <li>• React 19 - UI框架</li>
                  <li>• TypeScript - 类型安全</li>
                  <li>• Zustand - 状态管理</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">扩展能力</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• BubbleMenu - 选中菜单</li>
                  <li>• StarterKit - 基础编辑功能</li>
                  <li>• Placeholder - 占位符</li>
                  <li>• CharacterCount - 字符统计</li>
                  <li>• 自定义AI扩展（演示中为模拟）</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
