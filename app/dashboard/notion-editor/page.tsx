'use client';

/**
 * Notion-like 编辑器页面
 * 展示 Notion 风格的协作编辑器
 */

import { useState } from 'react';
import { NotionLikeEditor } from '@/components/tiptap-editor/NotionLikeEditor';
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
import {
  Sparkles,
  Info,
  Users,
  GitBranch,
  Zap,
  Settings,
  AlertCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';

export default function NotionEditorPage() {
  const [enableCollaboration, setEnableCollaboration] = useState(false);

  return (
    <DashboardLayout title="Notion编辑器">
      <div className="container mx-auto py-8 space-y-6">
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Notion-like 协作编辑器
            </CardTitle>
            <CardDescription>
              基于 Tiptap v3 和 Yjs 的实时协作编辑器，体验 Notion 风格的写作
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 配置说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              功能特性
            </CardTitle>
            <CardDescription>了解 Notion-like 编辑器的强大功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">实时协作</h4>
                    <p className="text-sm text-muted-foreground">
                      多用户同时编辑，实时看到其他人的光标和修改
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Slash 命令</h4>
                    <p className="text-sm text-muted-foreground">
                      输入 "/" 快速插入标题、列表、代码块等
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">浮动工具栏</h4>
                    <p className="text-sm text-muted-foreground">
                      选中文本时自动弹出格式化菜单
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">拖放排序</h4>
                    <p className="text-sm text-muted-foreground">
                      拖动文本块重新组织内容结构
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">AI 辅助</h4>
                    <p className="text-sm text-muted-foreground">
                      集成 AI 写作助手，智能优化内容（需要配置）
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">版本历史</h4>
                    <p className="text-sm text-muted-foreground">
                      完整的撤销/重做功能，支持操作历史
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配置面板 */}
        <Card>
          <CardHeader>
            <CardTitle>编辑器配置</CardTitle>
            <CardDescription>自定义编辑器行为</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">启用协作功能</div>
                  <div className="text-sm text-muted-foreground">
                    需要配置 Tiptap Cloud 服务
                  </div>
                </div>
                <Button
                  variant={enableCollaboration ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEnableCollaboration(!enableCollaboration)}
                >
                  {enableCollaboration ? '已启用' : '已禁用'}
                </Button>
              </div>

              {enableCollaboration && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 mb-1">
                        需要配置 Tiptap Cloud
                      </h4>
                      <p className="text-sm text-yellow-800 mb-2">
                        协作功能需要配置以下环境变量：
                      </p>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID</li>
                        <li>• TIPTAP_ENVIRONMENT_ID</li>
                        <li>• TIPTAP_PRIVATE_KEY（仅服务端）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">当前房间</div>
                  <div className="text-muted-foreground">
                    协作文档的唯一标识符
                  </div>
                </div>
                <Badge variant="outline">notion-demo-room</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 编辑器 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>编辑器</CardTitle>
                <CardDescription>
                  开始写作，体验 Notion 风格的编辑器
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {enableCollaboration && (
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    协作模式
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  重置编辑器
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <NotionLikeEditor
              enableCollaboration={enableCollaboration}
              placeholder="输入 '/' 查看 Slash 命令，或直接开始写作..."
            />
          </CardContent>
        </Card>

        {/* 技术说明 */}
        <Card>
          <CardHeader>
            <CardTitle>技术栈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">核心技术</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Tiptap v3 - 编辑器框架</li>
                  <li>• Yjs - 协作引擎</li>
                  <li>• ProseMirror - 底层编辑</li>
                  <li>• React 19 - UI 框架</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">扩展能力</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• StarterKit - 基础功能</li>
                  <li>• Collaboration - 协作支持</li>
                  <li>• BubbleMenu - 浮动菜单</li>
                  <li>• Placeholder - 占位符</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">集成服务</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Tiptap Cloud - 协作服务</li>
                  <li>• Hocuspocus - 自托管选项</li>
                  <li>• WebSocket - 实时通信</li>
                  <li>• JWT 认证 - 安全验证</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配置指南 */}
        <Card>
          <CardHeader>
            <CardTitle>配置指南</CardTitle>
            <CardDescription>如何启用完整功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 注册 Tiptap Cloud</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  访问{' '}
                  <a
                    href="https://cloud.tiptap.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    cloud.tiptap.dev
                  </a>{' '}
                  注册账号（当前试用账号：913769712@qq.com）
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">2. 创建应用</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  在 Tiptap Cloud 控制台创建以下应用：
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Collaboration 应用 → 获取 App ID 和 Token</li>
                  <li>• AI 应用 → 获取 App ID 和 Token（可选）</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">3. 配置环境变量</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  将获取的凭据添加到项目根目录的 <code>.env.local</code> 文件：
                </p>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div>NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID=your_app_id</div>
                  <div>NEXT_PUBLIC_TIPTAP_COLLAB_TOKEN=your_jwt_token</div>
                  <div>NEXT_PUBLIC_TIPTAP_COLLAB_DOC_PREFIX=az-ai-pc-</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">4. 重启服务器</h4>
                <p className="text-sm text-muted-foreground">
                  保存环境变量后，重启开发服务器使配置生效：
                </p>
                <div className="bg-muted p-3 rounded text-xs font-mono mt-2">
                  npm run dev
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
