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
import {
  ExtendedUser,
  UserStatus,
  Department,
  CreateUserBody,
} from '@/types/user';
import { userService } from '@/services/userService';
import { useToast } from '@/components/ui/toast';
import {
  Loader2,
  Plus,
  Eye,
  EyeOff,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

// 表单验证Schema
const userCreateFormSchema = z
  .object({
    username: z
      .string()
      .min(3, '用户名至少需要3个字符')
      .max(20, '用户名不能超过20个字符')
      .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
    password: z
      .string()
      .min(6, '密码至少需要6个字符')
      .max(50, '密码不能超过50个字符'),
    confirmPassword: z.string().min(1, '请确认密码'),
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type UserCreateFormData = z.infer<typeof userCreateFormSchema>;

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: ExtendedUser) => void;
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

export function UserCreateDialog({
  open,
  onOpenChange,
  onUserCreated,
  trigger,
}: UserCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showToast } = useToast();

  const form = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      email: '',
      phone: '',
      department: 'none',
      status: UserStatus.ACTIVE,
    },
  });

  // 重置表单数据
  React.useEffect(() => {
    if (open) {
      form.reset();
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, form]);

  // 处理表单提交
  const onSubmit = async (data: UserCreateFormData) => {
    setIsSubmitting(true);
    try {
      const createData: CreateUserBody = {
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        email: data.email,
        phone: data.phone || undefined,
        department:
          data.department === 'none'
            ? undefined
            : (data.department as Department),
        status: data.status as UserStatus,
      };

      const newUser = await userService.createUser(createData);
      showToast('用户创建成功', 'success');
      onUserCreated(newUser);
      onOpenChange(false);
    } catch (error) {
      console.error('创建用户失败:', error);
      const errorMessage =
        error instanceof Error ? error.message : '创建用户失败，请稍后重试';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <span>新增用户</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            请填写用户基本信息，带 * 的字段为必填项
          </span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入用户名"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示名称 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入显示名称"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="请输入密码"
                          {...field}
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSubmitting}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认密码 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="请再次输入密码"
                          {...field}
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          disabled={isSubmitting}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
                    <FormLabel>邮箱地址 *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="请输入邮箱地址"
                        {...field}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    创建用户
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

export default UserCreateDialog;
