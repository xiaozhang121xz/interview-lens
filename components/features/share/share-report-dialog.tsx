'use client';

/**
 * 分享报告配置对话框
 *
 * 用于配置和生成分享报告，支持版本管理功能
 *
 * @module components/features/share/share-report-dialog
 */

import axios from 'axios';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Copy, Check, ExternalLink, History, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShareReportHistoryDialog } from './share-report-history-dialog';
import { apiInstance } from '@/lib/apiCreator';
import { VALIDATED_AI_API_TIMEOUT } from '@/lib/config/timeout';
import type { PPTOutlineMode } from '@/lib/types/ppt-outline';
import { RightWheelPicker } from '@/components/ui/right-wheel-picker';

// ============================================
// 类型定义
// ============================================

interface ShareReportDialogProps {
  interviewId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: 'generate' | 'history';
}

interface ShareResult {
  token: string;
  shareUrl: string;
  reportId: string;
  expiresAt: string | null;
  generationType: 'template' | 'llm';
  outlineMode: PPTOutlineMode;
  mode: 'new' | 'overwrite';
  hasHistory: boolean;
  historyCount: number;
  pptGeneration?: {
    requested?: boolean;
    requestedEngine?: 'native' | 'slides' | 'auto';
  };
  warnings?: string[];
}

interface ShareReportItem {
  id: string;
  token: string;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  theme: string;
  expiresAt?: string;
  versionNumber: number;
}

function isRequestCanceled(error: unknown): boolean {
  if (axios.isCancel(error)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.message.toLowerCase().includes('abort') ||
    error.message.toLowerCase().includes('canceled')
  );
}

// ============================================
// 主组件
// ============================================

export function ShareReportDialog({
  interviewId,
  isOpen,
  onOpenChange,
  initialView = 'generate',
}: ShareReportDialogProps) {
  // 状态
  const [generationType, setGenerationType] = useState<'template' | 'llm'>('template');
  const [pptEngine, setPptEngine] = useState<'native' | 'slides' | 'auto'>('auto');
  const [outlineMode, setOutlineMode] = useState<PPTOutlineMode>('classic');
  const [expiresIn, setExpiresIn] = useState('never');
  const [mode, setMode] = useState<'new' | 'overwrite'>('new');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [result, setResult] = useState<ShareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [historyReports, setHistoryReports] = useState<ShareReportItem[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showModeDialog, setShowModeDialog] = useState(false);

  // 🔧 取消请求的 AbortController
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const historyOnlyMode = initialView === 'history' && !result;

  // 加载历史报告
  useEffect(() => {
    if (isOpen && interviewId) {
      void loadHistoryReports();
    }
  }, [isOpen, interviewId]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialView === 'history' && historyReports.length > 0) {
      setShowHistoryDialog(true);
    }
  }, [isOpen, initialView, historyReports.length]);

  const loadHistoryReports = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await apiInstance.get(`/share/reports?interviewId=${interviewId}`);
      const reports = Array.isArray(response.data) ? response.data : [];
      setHistoryReports(reports);
    } catch (err) {
      console.error('Failed to load history reports:', err);
      setHistoryReports([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 生成报告
  const handleGenerate = async () => {
    // 如果有历史报告，先询问模式
    if (historyReports.length > 0 && !result) {
      setShowModeDialog(true);
      return;
    }

    await executeGenerate(mode);
  };

  // 执行生成
  const executeGenerate = async (selectedMode: 'new' | 'overwrite') => {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setShowModeDialog(false);

    // 🔧 创建新的 AbortController 用于取消请求
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 使用 AI API 超时配置（5分钟），因为 LLM 调用需要较长时间
      const response = await apiInstance.post('/share/report/create', {
        interviewId,
        expiresIn: expiresIn === 'never' ? undefined : parseInt(expiresIn),
        generationType,
        outlineMode,
        generatePpt: true,
        pptEngine,
        mode: selectedMode,
      }, {
        timeout: VALIDATED_AI_API_TIMEOUT,
        signal: controller.signal, // 🔧 传入 AbortSignal
      });

      // axios拦截器已经处理了response.data的提取
      // 响应格式: { success: true, data: { token, shareUrl, reportId, ... } }
      if (response.data) {
        setResult(response.data);
        // 重新加载历史报告
        await loadHistoryReports();
      } else {
        throw new Error('生成失败');
      }
    } catch (err) {
      if (isRequestCanceled(err)) {
        console.log('[ShareReport] 用户取消生成');
        setError(null); // 取消不显示错误
      } else {
        // axios错误对象有errMsg属性（由拦截器设置）
        const errorMessage = (err as { errMsg?: string; message?: string }).errMsg
          || (err instanceof Error ? err.message : '生成失败');
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  // 🔧 取消生成请求
  const handleCancelGenerate = () => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      setError(null);
      setAbortController(null);
      console.log('[ShareReport] 已取消生成请求');
    }
  };

  // 复制链接
  const handleCopy = async () => {
    if (!result) return;

    const fullUrl = `${window.location.origin}${result.shareUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 打开链接
  const handleOpen = () => {
    if (!result) return;
    const fullUrl = `${window.location.origin}${result.shareUrl}`;
    window.open(fullUrl, '_blank');
  };

  // 重置对话框
  const handleReset = () => {
    setResult(null);
    setError(null);
    setMode('new');
  };

  const getPptEngineLabel = (engine: 'native' | 'slides' | 'auto') => {
    switch (engine) {
      case 'native':
        return '原生引擎';
      case 'slides':
        return 'Slides 引擎';
      default:
        return '自动选择';
    }
  };

  // 关闭对话框
  const handleClose = () => {
    // 🔧 关闭时如果有正在进行的请求，先取消
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setShowHistoryDialog(false);
    onOpenChange(false);
    // 延迟重置，等动画完成
    setTimeout(handleReset, 200);
  };

  // 删除报告
  const handleDeleteReport = async (reportId: string) => {
    try {
      await apiInstance.delete(`/share/reports/${reportId}`);
      await loadHistoryReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  // 查看历史报告
  const handleViewReport = (reportId: string) => {
    const report = historyReports.find((item) => item.id === reportId);
    if (!report) return;
    window.open(`${window.location.origin}${report.shareUrl}`, '_blank');
  };

  return (
    <>
      <Dialog open={isOpen && !historyOnlyMode} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result ? '分享报告已生成' : '生成分享报告'}
              {historyReports.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistoryDialog(true)}
                  className="ml-auto"
                >
                  <History className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">历史 ({historyReports.length})</span>
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {result
                ? '分享报告已生成，可以通过以下链接访问'
                : '生成一份包含用户画像、痛点分析和解决方案的洞察报告'}
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            // 配置表单 - 右侧滚轮模式
            <div className="py-4">
              <RightWheelPicker
                height={260}
                rowHeight={80}
                wheelHeight={50}
                sections={[
                  {
                    id: 'generation-type',
                    title: '内容生成方案',
                    options: [
                      { value: 'template', label: '模板方案' },
                      { value: 'llm', label: 'AI智能方案' },
                    ],
                    value: generationType,
                    onChange: (v) => setGenerationType(v as 'template' | 'llm'),
                    warning: generationType === 'llm' ? '💡 约30秒生成' : undefined,
                  },
                  {
                    id: 'ppt-engine',
                    title: 'PPT生成引擎',
                    options: [
                      { value: 'native', label: '原生引擎' },
                      { value: 'slides', label: 'Slides引擎' },
                      { value: 'auto', label: '自动选择' },
                    ],
                    value: pptEngine,
                    onChange: (v) => setPptEngine(v as 'native' | 'slides' | 'auto'),
                    warning: pptEngine === 'slides'
                      ? '💡 优先走 slides 工作流并执行版式校验'
                      : pptEngine === 'auto'
                        ? '💡 系统会根据内容完整度自动判断'
                        : undefined,
                  },
                  {
                    id: 'outline-mode',
                    title: 'PPT结构',
                    options: [
                      { value: 'classic', label: '经典14页' },
                    ],
                    value: outlineMode,
                    onChange: (v) => setOutlineMode(v as PPTOutlineMode),
                  },
                  {
                    id: 'expires-in',
                    title: '有效期',
                    options: [
                      { value: 'never', label: '永不过期' },
                      { value: '24', label: '24小时' },
                      { value: '168', label: '7天' },
                      { value: '720', label: '30天' },
                    ],
                    value: expiresIn,
                    onChange: setExpiresIn,
                  },
                ]}
              />

              {/* 错误提示 */}
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded mt-4">
                  {error}
                </div>
              )}
            </div>
          ) : (
            // 生成结果
            <div className="space-y-4 py-4">
              {/* 生成方案信息 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {result.generationType === 'llm' ? 'AI智能方案' : '模板方案'}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {getPptEngineLabel(result.pptGeneration?.requestedEngine || pptEngine)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  经典14页
                </span>
                {result.mode === 'overwrite' && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">已覆盖上次报告</span>
                )}
              </div>

              {/* 警告提示 */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                  <p className="font-medium mb-1">注意：</p>
                  <ul className="list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 分享链接 */}
              <div className="space-y-2">
                <Label>分享链接</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-muted rounded text-sm truncate">
                    {`${window.location.origin}${result.shareUrl}`}
                  </div>
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 过期时间 */}
              {result.expiresAt && (
                <p className="text-sm text-muted-foreground">
                  链接有效期至：
                  {new Date(result.expiresAt).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <Button
                  variant="outline"
                  onClick={isGenerating ? handleCancelGenerate : handleClose}
                >
                  {isGenerating ? '取消生成' : '取消'}
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating || isLoadingHistory}>
                  {isGenerating && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isGenerating ? '生成中...' : '生成报告'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </Button>
                <Button variant="outline" onClick={handleOpen}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  打开预览
                </Button>
                <Button onClick={handleClose}>完成</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模式选择对话框 */}
      <AlertDialog open={showModeDialog} onOpenChange={setShowModeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              选择生成模式
            </AlertDialogTitle>
            <AlertDialogDescription>
              已有 {historyReports.length} 个历史报告版本，请选择：
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => executeGenerate('overwrite')}
            >
              <div className="text-left">
                <p className="font-medium">覆盖上次报告</p>
                <p className="text-xs text-muted-foreground">使用原有分享链接，更新报告内容</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => executeGenerate('new')}
            >
              <div className="text-left">
                <p className="font-medium">新建报告版本</p>
                <p className="text-xs text-muted-foreground">创建新的分享链接和报告版本</p>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowModeDialog(false)}>
              取消
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 历史报告弹窗 */}
      <ShareReportHistoryDialog
        open={showHistoryDialog || (isOpen && historyOnlyMode)}
        onOpenChange={(open) => {
          setShowHistoryDialog(open);
          if (!open && historyOnlyMode) {
            handleClose();
          }
        }}
        reports={historyReports}
        isLoading={isLoadingHistory}
        currentReportId={result?.reportId}
        onViewReport={handleViewReport}
        onDeleteReport={handleDeleteReport}
      />
    </>
  );
}

export default ShareReportDialog;
