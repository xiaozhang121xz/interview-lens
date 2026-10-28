'use client';

/**
 * 分享报告版本选择器组件
 *
 * 用于选择不同版本的分享报告
 *
 * @module components/features/share/share-report-version-selector
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, ChevronDown, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatISOToDisplay } from '@/lib/datetimeUtils';

// ============================================
// 类型定义
// ============================================

interface ShareReportItem {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  theme: string;
  expiresAt?: string;
  versionNumber: number;
}

interface ShareReportVersionSelectorProps {
  reports: ShareReportItem[];
  currentReportId?: string;
  onReportChange: (reportId: string) => void;
  onOpenHistory?: () => void;
  disabled?: boolean;
}

// ============================================
// 主组件
// ============================================

/**
 * 截取摘要文本
 */
function truncateSummary(summary: string | undefined, maxLength: number = 30): string {
  if (!summary) return '';
  if (summary.length <= maxLength) return summary;
  return summary.slice(0, maxLength) + '...';
}

export function ShareReportVersionSelector({
  reports,
  currentReportId,
  onReportChange,
  onOpenHistory,
  disabled = false,
}: ShareReportVersionSelectorProps) {
  if (!reports || reports.length === 0) return null;

  // 获取当前版本号
  const currentReport = reports.find((r) => r.id === currentReportId);
  const currentVersion = currentReport?.versionNumber || 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled}
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">版本 {currentVersion}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        {reports.slice(0, 5).map((report) => (
          <DropdownMenuItem
            key={report.id}
            onClick={() => onReportChange(report.id)}
            className={cn(
              'flex items-center gap-2 py-2',
              report.id === currentReportId && 'bg-primary/10'
            )}
          >
            <Badge variant="outline" className="font-mono text-xs">
              v{report.versionNumber}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">
                {truncateSummary(report.summary)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatISOToDisplay(report.createdAt, 'datetime')}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
        {reports.length > 5 && (
          <DropdownMenuSeparator />
        )}
        {onOpenHistory && (
          <DropdownMenuItem
            onClick={onOpenHistory}
            className="flex items-center gap-2"
          >
            <History className="h-3.5 w-3.5" />
            <span>查看全部历史 ({reports.length})</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareReportVersionSelector;