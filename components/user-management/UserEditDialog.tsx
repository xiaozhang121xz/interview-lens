'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ExtendedUser,
  UserStatus,
  Department,
  UpdateUserBody,
} from '@/types/user';
import { Loader2, Save, AlertCircle } from 'lucide-react';

// 表单验证Schema
const userEditFormSchema = z.object({
  displayName: z
    .string()
    .min(1, '显示名称不能为空')
    .max(50, '显示名称不能超过50个字符'),
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符'),
  phone: z
    .string()
    .max(20, '手机号码不能超过20个字符')
    .optional()
    .or(z.literal('')),
  department: z.string().max(50, '部门名称不能超过50个字符').optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
});

type UserEditFormData = z.infer<typeof userEditFormSchema>;

interface UserEditDialogProps {
  user: ExtendedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: ExtendedUser, data: UpdateUserBody) => Promise<void>;
  currentUser: ExtendedUser;
  trigger?: React.ReactNode;
}

// 状态选项
const statusOptions = [
  { value: UserStatus.ACTIVE, label: '激活', description: '用户可以正常登录' },
  {
    value: UserStatus.INACTIVE,
    label: '未激活',
    description: '用户需要激活后才能登录',
  },
  {
    value: UserStatus.SUSPENDED,
    label: '已暂停',
    description: '用户被暂停，无法登录',
  },
];

// 部门选项
const departmentOptions = [
  { value: Department.IT, label: Department.IT },
  { value: Department.HR, label: Department.HR },
  { value: Department.FINANCE, label: Department.FINANCE },
  { value: Department.MARKETING, label: Department.MARKETING },
  { value: Department.OPERATIONS, label: Department.OPERATIONS },
];

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSave,
  currentUser,
  trigger,
}: UserEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditFormSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || 'none',
      status:
        UserStatus[user?.status?.toUpperCase() as keyof typeof UserStatus] ||
        UserStatus.ACTIVE,
    },
  });

  // 重置表单数据
  React.useEffect(() => {
    if (user && open) {
      form.reset({
        displayName: user.displayName,
        email: user.email,
        phone: user.phone || '',
        department: user.department || 'none',
        status:
          UserStatus[user.status?.toUpperCase() as keyof typeof UserStatus],
      });
    }
  }, [user, open, form]);

  // 处理表单提交
  const onSubmit = async (data: UserEditFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateUserBody = {
        displayName: data.displayName,
        email: data.email,
        phone: data.phone || undefined,
        department:
          data.department === 'none'
            ? undefined
            : (data.department as Department),
        status: data.status as UserStatus,
      };

      await onSave(user, updateData);
      onOpenChange(false);
    } catch (error) {
      console.error('保存用户失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 检查是否可以编辑
  const canEditUser = user && user.id !== currentUser.id;

  // 获取状态徽章样式
  const getStatusBadgeVariant = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'default';
      case UserStatus.INACTIVE:
        return 'secondary';
      case UserStatus.SUSPENDED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>编辑用户</span>
            {user && (
              <div className="flex items-center space-x-2">
                <Badge
                  variant={getStatusBadgeVariant(user.status as UserStatus)}
                >
                  {user.status === 'active'
                    ? '激活'
                    : user.status === 'inactive'
                      ? '未激活'
                      : '已暂停'}
                </Badge>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {!canEditUser && user && (
          <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              您不能编辑自己的账户信息
            </span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入显示名称"
                        {...field}
                        disabled={!canEditUser || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱地址</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="请输入邮箱地址"
                        {...field}
                        disabled={!canEditUser || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手机号码</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入手机号码"
                        {...field}
                        disabled={!canEditUser || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>部门</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEditUser || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择部门" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">无部门</SelectItem>
                        {departmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEditUser || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={!canEditUser || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default UserEditDialog;
