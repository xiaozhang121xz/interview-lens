'use client';

/**
 * 分享报告历史弹窗组件
 *
 * 显示分享报告历史列表，支持查看和删除功能
 *
 * @module components/features/share/share-report-history-dialog
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  History,
  Eye,
  Trash2,
  AlertTriangle,
  FileText,
  Loader2,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { formatISOToDisplay } from '@/lib/datetimeUtils';

// ============================================
// 类型定义
// ============================================

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

interface ShareReportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: ShareReportItem[];
  isLoading?: boolean;
  currentReportId?: string;
  onViewReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => Promise<void>;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 截取摘要文本
 */
function truncateSummary(summary: string | undefined, maxLength: number = 50): string {
  if (!summary) return '-';
  if (summary.length <= maxLength) return summary;
  return summary.slice(0, maxLength) + '...';
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function ShareReportHistoryDialog({
  open,
  onOpenChange,
  reports,
  isLoading = false,
  currentReportId,
  onViewReport,
  onDeleteReport,
}: ShareReportHistoryDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);

  /**
   * 处理删除确认
   */
  const handleDeleteConfirm = async () => {
    if (!selectedReportId) return;

    setIsDeleting(true);
    try {
      await onDeleteReport(selectedReportId);
      setDeleteDialogOpen(false);
      setSelectedReportId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 处理删除点击
   */
  const handleDeleteClick = (reportId: string) => {
    setSelectedReportId(reportId);
    setDeleteDialogOpen(true);
  };

  /**
   * 处理查看报告
   */
  const handleViewClick = (reportId: string) => {
    onViewReport(reportId);
    onOpenChange(false);
  };

  const handleCopyLink = async (report: ShareReportItem) => {
    const fullUrl = `${window.location.origin}${report.shareUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedReportId(report.id);
    setTimeout(() => setCopiedReportId(null), 2000);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              已生成报告
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <LoadingSkeleton />
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>暂无已生成报告</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[65vh] pr-3">
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={
                      report.id === currentReportId
                        ? 'rounded-lg border border-primary/40 bg-primary/5 p-4'
                        : 'rounded-lg border bg-background p-4'
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        v{report.versionNumber}
                      </Badge>
                      {report.id === currentReportId && (
                        <Badge variant="default" className="text-xs">
                          当前
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatISOToDisplay(report.createdAt, 'datetime')}
                      </span>
                    </div>

                    <div className="mt-3 text-sm">
                      {truncateSummary(report.summary, 120)}
                    </div>

                    <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground mb-1">当次分享链接</div>
                      <div className="text-xs break-all text-foreground">
                        {`${typeof window !== 'undefined' ? window.location.origin : ''}${report.shareUrl}`}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClick(report.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        查看报告
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`${window.location.origin}${report.shareUrl}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        打开链接
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopyLink(report)}
                      >
                        {copiedReportId === report.id ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        复制链接
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(report.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认删除报告
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该报告版本，删除后无法恢复。
              {selectedReportId === currentReportId && (
                <span className="block mt-2 text-warning">
                  当前正在查看此报告，删除后将自动切换到最新版本。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ShareReportHistoryDialog;
