'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquareQuote,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  useInterviewStore,
  useCustomerStore,
} from '@/stores/features/interview-assistant-store';
import { InterviewStatus } from '@/lib/api/interview-assistant/types';

// 状态颜色映射
const STATUS_COLORS: Record<InterviewStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  prepared: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

// 状态文本映射
const STATUS_LABELS: Record<InterviewStatus, string> = {
  draft: '草稿',
  prepared: '已准备',
  in_progress: '进行中',
  completed: '已完成',
  archived: '已归档',
};

// 状态筛选选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'prepared', label: '已准备' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
];

export default function InterviewsPage() {
  const router = useRouter();
  const { interviews, loading, pagination, fetchInterviews, deleteInterview } =
    useInterviewStore();
  const { customers, fetchCustomers } = useCustomerStore();

  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(
    null
  );

  // 加载数据
  useEffect(() => {
    fetchCustomers({ pageSize: 100 });
  }, []);

  useEffect(() => {
    fetchInterviews({
      page: currentPage,
      pageSize: 10,
      search: searchValue || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      customerId: customerFilter !== 'all' ? customerFilter : undefined,
    });
  }, [currentPage, statusFilter, customerFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInterviews({
        page: 1,
        pageSize: 10,
        search: searchValue || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        customerId: customerFilter !== 'all' ? customerFilter : undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // 处理删除
  const handleDelete = async () => {
    if (!interviewToDelete) return;
    try {
      await deleteInterview(interviewToDelete);
      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
    } catch (error) {
      console.error('Failed to delete interview:', error);
    }
  };

  // 跳转到详情
  const handleView = (id: string) => {
    router.push(`/dashboard/interviews/${id}`);
  };

  // 获取客户名称
  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || '-';
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title="访谈管理"
          description="管理访谈项目，包括创建、准备、执行和归档访谈"
          icon={MessageSquareQuote}
          actions={
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/interviews/new')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              新建访谈
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索访谈标题..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                {/* 状态筛选 */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 客户筛选 */}
                <Select
                  value={customerFilter}
                  onValueChange={setCustomerFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="客户" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部客户</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 刷新按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  fetchInterviews({
                    page: currentPage,
                    pageSize: 10,
                    search: searchValue || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    customerId:
                      customerFilter !== 'all' ? customerFilter : undefined,
                  })
                }
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无访谈项目</p>
                <Button
                  onClick={() => router.push('/dashboard/interviews/new')}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新建访谈
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>访谈标题</TableHead>
                        <TableHead>客户</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>访谈日期</TableHead>
                        <TableHead>提纲数</TableHead>
                        <TableHead>记录数</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead className="w-[80px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interviews.map((interview) => (
                        <TableRow
                          key={interview.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleView(interview.id)}
                        >
                          <TableCell className="font-medium">
                            {interview.title}
                          </TableCell>
                          <TableCell>
                            {interview.customer?.name ||
                              getCustomerName(interview.customerId)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[interview.status]}>
                              {STATUS_LABELS[interview.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {interview.interviewDate
                              ? new Date(
                                  interview.interviewDate
                                ).toLocaleDateString('zh-CN')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {interview._count?.outlines || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {interview._count?.records || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(interview.createdAt).toLocaleDateString(
                              'zh-CN'
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleView(interview.id);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInterviewToDelete(interview.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      显示第 {(pagination.page - 1) * pagination.pageSize + 1}{' '}
                      到{' '}
                      {Math.min(
                        pagination.page * pagination.pageSize,
                        pagination.total
                      )}{' '}
                      条， 共 {pagination.total} 条记录
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <span className="text-sm">
                        第 {currentPage} / {pagination.totalPages} 页
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === pagination.totalPages}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 删除确认对话框 */}
        {deleteDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[400px]">
              <CardContent className="pt-6">
                <p className="text-center mb-4">
                  确定要删除此访谈项目吗？此操作无法撤销。
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setInterviewToDelete(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    确认删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
