/**
 * 分享对话框组件
 * 用于创建和管理访谈结果分享链接
 *
 * 支持两种分享模式：
 * 1. 标准模式：直接展示PRD、画像、旅程图等内容
 * 2. 报告模式：AI生成的洞察报告（翻页浏览，含访谈原话引用）
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Check,
  Loader2,
  Share2,
  FileText,
  User,
  Map,
  Lightbulb,
  MessageSquare,
  ExternalLink,
  Presentation,
} from 'lucide-react';
import { useUserStore } from '@/stores/core/useUserStore';
import { apiInstance } from '@/lib/apiCreator';
import type { PPTOutlineMode } from '@/lib/types/ppt-outline';

interface ShareConfig {
  includePRD: boolean;
  includePersona: boolean;
  includeJourneyMap: boolean;
  includeInsights: boolean;
  includeRecords: boolean;
}

interface ShareDialogProps {
  interviewId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareResult {
  token: string;
  shareUrl: string;
  expiresAt: string | null;
  config?: ShareConfig;
  theme?: string;
  outlineMode?: PPTOutlineMode;
  warnings?: string[];
}

// 报告主题选项
const REPORT_THEMES = [
  { value: 'ocean-depths', label: '深海蓝' },
  { value: 'modern-minimalist', label: '简约灰' },
  { value: 'tech-innovation', label: '科技蓝' },
  { value: 'forest-canopy', label: '森林绿' },
];

const REPORT_OUTLINE_OPTIONS: Array<{ value: PPTOutlineMode; label: string }> = [
  { value: 'classic', label: '经典14页' },
];

export function ShareDialog({ interviewId, isOpen, onOpenChange }: ShareDialogProps) {
  const { user } = useUserStore();

  // 分享模式
  const [shareMode, setShareMode] = useState<'standard' | 'report'>('report');

  // 标准模式配置
  const [config, setConfig] = useState<ShareConfig>({
    includePRD: true,
    includePersona: true,
    includeJourneyMap: true,
    includeInsights: true,
    includeRecords: false,
  });

  // 报告模式配置
  const [reportTheme, setReportTheme] = useState('ocean-depths');
  const [reportOutlineMode, setReportOutlineMode] = useState<PPTOutlineMode>('classic');

  // 过期时间（小时）
  const [expiresIn, setExpiresIn] = useState<string>('never');

  // 分享结果
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  // 状态
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 更新配置
  const updateConfig = useCallback((key: keyof ShareConfig, value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 创建标准分享链接
  const handleCreateStandardShare = useCallback(async () => {
    if (!user?.id) {
      setError('请先登录');
      return;
    }

    setIsCreating(true);
    setError(null);
    setShareResult(null);

    try {
      const response = await apiInstance.post('/share/create', {
        interviewId,
        userId: user.id,
        config,
        expiresIn: expiresIn === 'never' ? undefined : parseInt(expiresIn),
      });

      const data = response.data;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const fullShareUrl = data.shareUrl?.startsWith('http')
        ? data.shareUrl
        : `${baseUrl}${data.shareUrl}`;

      setShareResult({
        ...data,
        shareUrl: fullShareUrl,
      });
    } catch (err) {
      console.error('[ShareDialog] Error:', err);
      const errorMsg = (err as any).errMsg || '创建分享链接时发生错误';
      setError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  }, [interviewId, user?.id, config, expiresIn]);

  // 创建报告分享链接
  const handleCreateReportShare = useCallback(async () => {
    if (!user?.id) {
      setError('请先登录');
      return;
    }

    setIsCreating(true);
    setError(null);
    setShareResult(null);

    try {
      // 使用 apiInstance 替代 fetch，支持自动 Token 刷新
      const response = await apiInstance.post('/share/report/create', {
        interviewId,
        expiresIn: expiresIn === 'never' ? undefined : parseInt(expiresIn),
        theme: reportTheme,
        outlineMode: reportOutlineMode,
        generationType: 'template',
      });

      // axios拦截器已经处理了response.data的提取
      const data = response.data;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const fullShareUrl = data.shareUrl?.startsWith('http')
        ? data.shareUrl
        : `${baseUrl}${data.shareUrl}`;

      setShareResult({
        token: data.token,
        shareUrl: fullShareUrl,
        expiresAt: data.expiresAt,
        theme: data.theme,
        outlineMode: data.outlineMode,
        warnings: data.warnings,
      });
    } catch (err) {
      console.error('[ShareDialog] Report Error:', err);
      const errorMsg = (err as { errMsg?: string; message?: string }).errMsg
        || (err instanceof Error ? err.message : '生成报告失败');
      setError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  }, [interviewId, user?.id, expiresIn, reportTheme]);

  // 创建分享链接（根据模式）
  const handleCreateShare = useCallback(() => {
    if (shareMode === 'report') {
      handleCreateReportShare();
    } else {
      handleCreateStandardShare();
    }
  }, [shareMode, handleCreateReportShare, handleCreateStandardShare]);

  // 复制链接
  const handleCopyLink = useCallback(async () => {
    if (!shareResult?.shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[ShareDialog] Copy failed:', err);
    }
  }, [shareResult?.shareUrl]);

  // 打开分享链接
  const handleOpenLink = useCallback(() => {
    if (!shareResult?.shareUrl) return;
    window.open(shareResult.shareUrl, '_blank');
  }, [shareResult?.shareUrl]);

  // 重置状态
  const handleReset = useCallback(() => {
    setShareResult(null);
    setError(null);
    setCopied(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            分享访谈结果
          </DialogTitle>
          <DialogDescription>
            创建分享链接，让客户查看访谈洞察报告
          </DialogDescription>
        </DialogHeader>

        {/* 分享成功后的结果展示 */}
        {shareResult ? (
          <div className="space-y-4">
            {/* 警告提示 */}
            {shareResult.warnings && shareResult.warnings.length > 0 && (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                <p className="font-medium">注意：</p>
                <ul className="list-disc list-inside text-xs">
                  {shareResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 分享链接 */}
            <div className="space-y-2">
              <Label>分享链接</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={shareResult.shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleOpenLink}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-500">链接已复制到剪贴板</p>
              )}
            </div>

            {/* 过期信息 */}
            {shareResult.expiresAt ? (
              <p className="text-sm text-gray-500">
                链接将于 {new Date(shareResult.expiresAt).toLocaleString('zh-CN')} 过期
              </p>
            ) : (
              <p className="text-sm text-gray-500">链接永久有效，除非手动撤销</p>
            )}

            {/* 报告模式标识 */}
            {shareMode === 'report' && (
              <div className="flex items-center gap-2 text-sm text-[#2d8b8b]">
                <Presentation className="w-4 h-4" />
                <span>AI洞察报告（翻页浏览）</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                创建新链接
              </Button>
              <Button onClick={() => onOpenChange(false)}>完成</Button>
            </DialogFooter>
          </div>
        ) : (
          /* 创建分享链接的配置界面 */
          <div className="space-y-4">
            {/* 分享模式选择 */}
            <Tabs value={shareMode} onValueChange={(v) => setShareMode(v as 'standard' | 'report')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="report" className="gap-1">
                  <Presentation className="w-4 h-4" />
                  洞察报告（推荐）
                </TabsTrigger>
                <TabsTrigger value="standard" className="gap-1">
                  <FileText className="w-4 h-4" />
                  标准模式
                </TabsTrigger>
              </TabsList>

              {/* 报告模式配置 */}
              <TabsContent value="report" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">AI洞察报告模式</p>
                  <p>大模型自动整合访谈数据，生成翻页式洞察报告，包含：</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>项目背景总结</li>
                    <li>用户画像解读（含原话引用）</li>
                    <li>用户旅程洞察</li>
                    <li>痛点深度分析</li>
                    <li>解决方案建议</li>
                    <li>下一步行动计划</li>
                  </ul>
                </div>

                {/* 主题选择 */}
                <div className="space-y-2">
                  <Label>报告主题</Label>
                  <Select value={reportTheme} onValueChange={setReportTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_THEMES.map((theme) => (
                        <SelectItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>PPT结构</Label>
                  <Select value={reportOutlineMode} onValueChange={(value) => setReportOutlineMode(value as PPTOutlineMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_OUTLINE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* 标准模式配置 */}
              <TabsContent value="standard" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p>直接展示PRD、用户画像、旅程图等内容</p>
                </div>

                {/* 选择分享内容 */}
                <div className="space-y-3">
                  <Label>选择分享内容</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includePRD"
                        checked={config.includePRD}
                        onCheckedChange={(checked) =>
                          updateConfig('includePRD', checked as boolean)
                        }
                      />
                      <Label htmlFor="includePRD" className="flex items-center gap-1">
                        <FileText className="w-4 h-4 text-blue-500" />
                        PRD文档
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includePersona"
                        checked={config.includePersona}
                        onCheckedChange={(checked) =>
                          updateConfig('includePersona', checked as boolean)
                        }
                      />
                      <Label htmlFor="includePersona" className="flex items-center gap-1">
                        <User className="w-4 h-4 text-green-500" />
                        用户画像
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeJourneyMap"
                        checked={config.includeJourneyMap}
                        onCheckedChange={(checked) =>
                          updateConfig('includeJourneyMap', checked as boolean)
                        }
                      />
                      <Label htmlFor="includeJourneyMap" className="flex items-center gap-1">
                        <Map className="w-4 h-4 text-purple-500" />
                        用户旅程图
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeInsights"
                        checked={config.includeInsights}
                        onCheckedChange={(checked) =>
                          updateConfig('includeInsights', checked as boolean)
                        }
                      />
                      <Label htmlFor="includeInsights" className="flex items-center gap-1">
                        <Lightbulb className="w-4 h-4 text-orange-500" />
                        AI洞察
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <Checkbox
                        id="includeRecords"
                        checked={config.includeRecords}
                        onCheckedChange={(checked) =>
                          updateConfig('includeRecords', checked as boolean)
                        }
                      />
                      <Label htmlFor="includeRecords" className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        访谈记录（敏感，请谨慎分享）
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* 选择过期时间 */}
            <div className="space-y-2">
              <Label>链接有效期</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue placeholder="选择有效期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">永久有效</SelectItem>
                  <SelectItem value="24">24小时</SelectItem>
                  <SelectItem value="168">7天</SelectItem>
                  <SelectItem value="720">30天</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleCreateShare} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {shareMode === 'report' ? '生成报告中...' : '创建中...'}
                  </>
                ) : (
                  <>
                    {shareMode === 'report' ? (
                      <>
                        <Presentation className="w-4 h-4 mr-2" />
                        生成洞察报告
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        创建分享链接
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
