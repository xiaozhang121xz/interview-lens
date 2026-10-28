'use client';

import { useEffect, useState } from 'react';
import {
  Edit,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Users,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatsCard } from '@/components/ui/stats-card';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
  ConfigurableTable,
  createDefaultTableConfig,
} from '@/components/ui/configurable-table';
import { ExtendedUser, UpdateUserBody, UserStatus } from '@/types/user';
import useUserManagementStore from '@/stores/features/userManagementStore';
import UserEditDialog from '@/components/user-management/UserEditDialog';
import UserCreateDialog from '@/components/user-management/UserCreateDialog';
import { PageHeader } from '@/components/layout/page-header';

// 状态映射
const statusVariantMap: Record<
  string,
  'default' | 'secondary' | 'destructive'
> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
};

const statusDisplayMap: Record<string, string> = {
  active: '正常',
  inactive: '未激活',
  suspended: '已暂停',
};

// 格式化日期
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
}

export default function UserManagementPage() {
  const {
    users,
    currentUser,
    loading,
    error,
    pagination,
    searchFilters,
    editingUser,
    editDialogOpen,
    fetchUsers,
    fetchCurrentUser,
    updateUser,
    deleteUser,
    setPage,
    setSearchFilters,
    openEditDialog,
    closeEditDialog,
    clearError,
  } = useUserManagementStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 初始化
  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  // 处理搜索
  const handleSearch = (value: string) => {
    const newFilters = { ...searchFilters, search: value };
    setSearchFilters(newFilters);
    fetchUsers(newFilters);
  };

  // 处理筛选变化
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...searchFilters, [key]: value };
    setSearchFilters(newFilters);
    fetchUsers(newFilters);
  };

  // 处理页面变化
  const handlePageChange = (page: number) => {
    setPage(page);
    fetchUsers(searchFilters);
  };

  // 处理编辑用户
  const handleEditUser = (user: ExtendedUser) => {
    openEditDialog(user);
  };

  // 处理保存用户
  const handleSaveUser = async (user: ExtendedUser, data: UpdateUserBody) => {
    await updateUser(user.id, data);
  };

  // 处理用户创建成功
  const handleUserCreated = (newUser: ExtendedUser) => {
    fetchUsers(searchFilters);
  };

  // 处理删除用户
  const handleDeleteUser = async (user: ExtendedUser) => {
    if (window.confirm(`确定要删除用户 "${user.displayName}" 吗？`)) {
      await deleteUser(user.id);
      await fetchUsers(searchFilters);
    }
  };

  // 处理用户状态切换
  const handleToggleUserStatus = async (user: ExtendedUser) => {
    const newStatus =
      user.status === 'active' ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    await updateUser(user.id, { status: newStatus });
  };

  // 统计数据
  const userStats = {
    total: pagination.total,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  };

  // 创建表格配置
  const tableConfig = createDefaultTableConfig({
    title: '用户列表', // 表格内部标题
    dataSource: users,
    search: {
      placeholder: '搜索用户名、邮箱、部门...',
      fields: ['username', 'displayName', 'email', 'department'],
      showAdvancedToggle: false,
      defaultAdvanced: true,
      filters: [
        {
          key: 'status',
          label: '状态',
          type: 'select',
          options: [
            { label: '全部', value: 'all' },
            { label: '正常', value: 'active' },
            { label: '未激活', value: 'inactive' },
            { label: '已暂停', value: 'suspended' },
          ],
        },
        {
          key: 'department',
          label: '部门',
          type: 'select',
          options: [
            { label: '全部', value: 'all' },
            { label: '技术部', value: 'tech' },
            { label: '产品部', value: 'product' },
            { label: '设计部', value: 'design' },
            { label: '运营部', value: 'operations' },
          ],
        },
      ],
    },
    columns: [
      {
        key: 'username',
        title: '用户名',
        sortable: true,
        className: 'font-medium',
      },
      {
        key: 'displayName',
        title: '显示名称',
        sortable: true,
      },
      {
        key: 'email',
        title: '邮箱',
        sortable: true,
      },
      {
        key: 'phone',
        title: '手机',
        render: (value) => value || '-',
      },
      {
        key: 'department',
        title: '部门',
        render: (value) => value || '-',
      },
      {
        key: 'status',
        title: '状态',
        render: (value: string) => (
          <Badge variant={statusVariantMap[value]}>
            {statusDisplayMap[value]}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        title: '创建时间',
        sortable: true,
        render: (value) => formatDate(value),
      },
    ],
    actions: [
      {
        key: 'add',
        label: '新增用户',
        icon: Plus,
        onClick: () => setCreateDialogOpen(true),
        variant: 'default',
      },
      {
        key: 'edit',
        label: '编辑',
        icon: Edit,
        onClick: (user: ExtendedUser) => handleEditUser(user),
        variant: 'ghost',
      },
      {
        key: 'toggleStatus',
        label: '切换状态',
        icon: UserX,
        onClick: (user: ExtendedUser) => handleToggleUserStatus(user),
        variant: 'ghost',
      },
      {
        key: 'delete',
        label: '删除',
        icon: Trash2,
        onClick: (user: ExtendedUser) => handleDeleteUser(user),
        variant: 'ghost',
        confirm: {
          title: '确认删除',
          description: '此操作不可撤销，请确认是否继续？',
        },
        disabled: (user: ExtendedUser) => user.id === currentUser?.id,
      },
    ],
    pagination: {
      enabled: false, // 禁用内部分页，使用 store 的分页
    },
    size: 'middle',
    hover: true,
    striped: true,
  });

  if (!currentUser) {
    return (
      <DashboardLayout title="用户管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse">加载中...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="用户管理">
      <div className="space-y-4">
        {/* 页面标题 */}
        <PageHeader
          variant="card"
          size="sm"
          title="用户管理中心"
          description="管理系统用户账户、权限和状态"
          icon={Users}
        />

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                关闭
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            title="总用户数"
            value={userStats.total}
            icon={Users}
            description="所有注册用户"
            variant="compact"
          />
          <StatsCard
            title="活跃用户"
            value={userStats.active}
            icon={UserCheck}
            description="正常状态用户"
            variant="compact"
          />
          <StatsCard
            title="未激活"
            value={userStats.inactive}
            description="待激活用户"
            variant="compact"
          />
          <StatsCard
            title="已暂停"
            value={userStats.suspended}
            icon={UserX}
            description="暂停使用用户"
            variant="compact"
          />
        </div>

        <ConfigurableTable
          config={tableConfig}
          externalPagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
            onPageChange: handlePageChange,
          }}
          onDataUpdate={() => fetchUsers(searchFilters)}
        />
      </div>

      {/* 编辑对话框 */}
      <UserEditDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={closeEditDialog}
        onSave={handleSaveUser}
        currentUser={currentUser}
      />

      {/* 新增用户对话框 */}
      <UserCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={handleUserCreated}
      />
    </DashboardLayout>
  );
}
