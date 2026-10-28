'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquareQuote,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';
import {
  useCustomerStore,
  useInterviewStore,
} from '@/stores/features/interview-assistant-store';

// 表单数据类型
interface FormData {
  title: string;
  objective: string;
  background: string;
  customerId: string;
  interviewDate: string;
}

// 错误类型
interface FormErrors {
  title?: string;
  objective?: string;
  customerId?: string;
  [key: string]: string | undefined;
}

// 内容组件
function NewInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const { customers, fetchCustomers } = useCustomerStore();
  const { createInterview } = useInterviewStore();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    objective: '',
    background: '',
    customerId: preselectedCustomerId || '',
    interviewDate: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // 加载客户列表
  useEffect(() => {
    fetchCustomers({ pageSize: 100 });
  }, [fetchCustomers]);

  // 处理输入变化
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: FormErrors) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入访谈标题';
    }
    if (!formData.objective.trim()) {
      newErrors.objective = '请输入访谈目标';
    }
    if (!formData.customerId) {
      newErrors.customerId = '请选择客户';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 转换日期格式：datetime-local -> ISO 8601
      const interviewDateISO = formData.interviewDate
        ? new Date(formData.interviewDate).toISOString()
        : undefined;

      const result = await createInterview({
        title: formData.title,
        objective: formData.objective,
        background: formData.background,
        customerId: formData.customerId,
        interviewDate: interviewDateISO,
      });

      // 直接跳转到访谈详情页（后端会自动异步生成分析报告和问题提纲）
      router.push(`/dashboard/interviews/${result.id}`);
    } catch (error) {
      console.error('Failed to create interview:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title="新建访谈"
          description="创建新的访谈项目，选择客户并填写访谈基本信息"
          icon={MessageSquareQuote}
          leftContent={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/interviews')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>访谈信息</CardTitle>
            <CardDescription>
              填写访谈基本信息，选择要访谈的客户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId">
                    选择客户 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => handleChange('customerId', value)}
                  >
                    <SelectTrigger
                      className={errors.customerId ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="请选择客户" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.industry})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customerId && (
                    <p className="text-sm text-red-500">{errors.customerId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewDate">访谈日期</Label>
                  <Input
                    id="interviewDate"
                    type="datetime-local"
                    value={formData.interviewDate}
                    onChange={(e) =>
                      handleChange('interviewDate', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  访谈标题 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="请输入访谈标题"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">
                  访谈目标 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => handleChange('objective', e.target.value)}
                  placeholder="请输入本次访谈的目标和期望..."
                  rows={3}
                  className={errors.objective ? 'border-red-500' : ''}
                />
                {errors.objective && (
                  <p className="text-sm text-red-500">{errors.objective}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">背景信息</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={(e) => handleChange('background', e.target.value)}
                  placeholder="请输入访谈背景信息，包括项目背景、客户现状等..."
                  rows={4}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/interviews')}
                >
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      创建访谈
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// 加载中组件
function Loading() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  );
}

// 默认导出包装在 Suspense 中的组件
export default function NewInterviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewInterviewContent />
    </Suspense>
  );
}
