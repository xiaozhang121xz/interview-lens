'use client';

/**
 * 报告历史弹窗组件
 *
 * @module components/features/interview/InsightReportHistoryDialog
 * @description 显示报告历史列表，支持查看和删除功能
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import type { InsightReportItem } from '@/lib/api/interview-assistant/types';
import { formatISOToDisplay } from '@/lib/datetimeUtils';

interface InsightReportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: InsightReportItem[];
  isLoading?: boolean;
  currentReportId?: string;
  onViewReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => Promise<void>;
}

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
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function InsightReportHistoryDialog({
  open,
  onOpenChange,
  reports,
  isLoading = false,
  currentReportId,
  onViewReport,
  onDeleteReport,
}: InsightReportHistoryDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              报告历史
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <LoadingSkeleton />
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>暂无历史报告</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">版本</TableHead>
                  <TableHead className="w-[180px]">生成时间</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow
                    key={report.id}
                    className={
                      report.id === currentReportId
                        ? 'bg-primary/5'
                        : ''
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          v{report.versionNumber}
                        </Badge>
                        {report.reportType && (
                          <Badge variant={report.reportType === 'v2' ? 'default' : 'secondary'} className="text-xs">
                            {report.reportType.toUpperCase()}
                          </Badge>
                        )}
                        {report.id === currentReportId && (
                          <Badge variant="default" className="text-xs">
                            当前
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatISOToDisplay(report.createdAt, 'datetime')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {truncateSummary(report.summary)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(report.id)}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">查看</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(report.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          disabled={report.id === currentReportId && reports.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
