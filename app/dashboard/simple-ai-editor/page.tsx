'use client';

/**
 * 简洁版AI编辑器演示页面
 */

import { SimpleAIEditor } from '@/components/tiptap-editor/SimpleAIEditor';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Code, Zap } from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';

export default function SimpleAIEditorPage() {
  return (
    <DashboardLayout title="AI编辑器">
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-8 w-8" />
              简洁版AI编辑器
            </CardTitle>
            <CardDescription>
              精简实现的AI编辑器，代码更少，更易理解
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 编辑器演示 */}
        <Card>
          <CardHeader>
            <CardTitle>编辑器演示</CardTitle>
            <CardDescription>选中任意文本，然后点击AI操作按钮</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAIEditor />
          </CardContent>
        </Card>

        {/* 代码示例 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              核心代码
            </CardTitle>
            <CardDescription>简洁版实现的核心代码片段</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. 编辑器初始化</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  {`const editor = useEditor({
  extensions: [StarterKit],
  content: '<p>开始写作...</p>',
  editorProps: {
    attributes: { class: 'prose focus:outline-none' }
  }
})`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">2. BubbleMenu集成</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  {`<BubbleMenu editor={editor} className="flex gap-1">
  <Button onClick={() => handleAI('polish')}>润色</Button>
  <Button onClick={() => handleAI('expand')}>扩写</Button>
</BubbleMenu>`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">3. AI操作处理</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  {`const handleAI = async (operation) => {
  const selectedText = editor.state.doc.textBetween(from, to);
  const result = await mockAI(operation, selectedText);
  editor.chain().focus().deleteSelection()
    .insertContent(result).run();
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 特点对比 */}
        <Card>
          <CardHeader>
            <CardTitle>实现方案对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ 简洁版优势</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 代码量少，易于理解</li>
                  <li>• 快速集成，5分钟上手</li>
                  <li>• 适合快速原型开发</li>
                  <li>• 依赖少，维护简单</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">📦 完整版优势</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 功能完整，生产就绪</li>
                  <li>• 状态管理，可追溯</li>
                  <li>• 错误处理，体验优化</li>
                  <li>• 可扩展性强</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
