'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Briefcase,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Building2,
  RefreshCw,
  Phone,
  User,
  Calendar,
  MessageSquareQuote,
} from 'lucide-react';
import { useCustomerStore } from '@/stores/features/interview-assistant-store';
import { Customer } from '@/lib/api/interview-assistant/types';

// 行业选项
const INDUSTRY_OPTIONS = [
  { value: 'all', label: '全部行业' },
  { value: '互联网', label: '互联网' },
  { value: '金融', label: '金融' },
  { value: '教育', label: '教育' },
  { value: '医疗', label: '医疗' },
  { value: '制造业', label: '制造业' },
  { value: '零售', label: '零售' },
  { value: '其他', label: '其他' },
];

export default function CustomersPage() {
  const router = useRouter();
  const { customers, loading, pagination, fetchCustomers, deleteCustomer } =
    useCustomerStore();

  const [searchValue, setSearchValue] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );

  // 加载数据
  useEffect(() => {
    fetchCustomers({
      page: currentPage,
      pageSize: 10,
      search: searchValue || undefined,
      industry: industryFilter !== 'all' ? industryFilter : undefined,
    });
  }, [currentPage, industryFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchCustomers({
        page: 1,
        pageSize: 10,
        search: searchValue || undefined,
        industry: industryFilter !== 'all' ? industryFilter : undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // 处理删除
  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete.id);
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      // 静默处理错误
    }
  };

  // 跳转到详情
  const handleView = (id: string) => {
    router.push(`/dashboard/customers/${id}`);
  };

  // 跳转到编辑
  const handleEdit = (id: string) => {
    router.push(`/dashboard/customers/${id}?edit=true`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title="客户管理"
          description="管理客户信息和联系人，支持创建、编辑和删除客户"
          icon={Briefcase}
          actions={
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/customers/new')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              新建客户
            </Button>
          }
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base">客户列表</CardTitle>
              <div className="flex items-center gap-2">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索客户名称..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                {/* 行业筛选 */}
                <Select
                  value={industryFilter}
                  onValueChange={setIndustryFilter}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="选择行业" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 刷新按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    fetchCustomers({ page: currentPage, pageSize: 10 })
                  }
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无客户数据</p>
                <Button
                  onClick={() => router.push('/dashboard/customers/new')}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新建客户
                </Button>
              </div>
            ) : (
              <>
                {/* 卡片滚轮列表 */}
                <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  {customers.map((customer) => (
                    <Card
                      key={customer.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleView(customer.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {/* 客户名称和行业 */}
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="font-medium truncate">
                                {customer.name}
                              </span>
                              <Badge variant="outline" className="flex-shrink-0">
                                {customer.industry}
                              </Badge>
                            </div>

                            {/* 联系信息 */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              {customer.contact && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  <span>{customer.contact}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <MessageSquareQuote className="w-3.5 h-3.5" />
                                <span>
                                  {customer._count?.interviews || 0} 个访谈
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(
                                    customer.createdAt
                                  ).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮 */}
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
                                  handleView(customer.id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(customer.id);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomerToDelete(customer);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
              <CardHeader>
                <CardTitle>确认删除</CardTitle>
                <CardDescription>
                  确定要删除客户 &quot;{customerToDelete?.name}&quot; 吗？此操作无法撤销。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setCustomerToDelete(null);
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