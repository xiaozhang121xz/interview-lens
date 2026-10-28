'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Briefcase, ArrowLeft, Save, Loader2, Building2, Sparkles } from 'lucide-react';
import { useCustomerStore } from '@/stores/features/interview-assistant-store';
import { toast } from 'sonner';
import { SmartFillDialog } from '@/components/customers/SmartFillDialog';
import { CompanySelectDialog, type CompanyItem } from '@/components/customers/CompanySelectDialog';
import { aiApi } from '@/lib/api/interview-assistant/api';

// 行业选项
const INDUSTRY_OPTIONS = [
  '互联网',
  '金融',
  '教育',
  '医疗',
  '制造业',
  '零售',
  '房地产',
  '能源',
  '交通',
  '其他',
];

export default function NewCustomerPage() {
  const router = useRouter();
  const { createCustomer } = useCustomerStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyFullName: '',
    industry: '',
    description: '',
    contactName: '',
    contactInfo: '',
    address: '',
    background: '',
    contactBackground: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 智能填充相关状态
  const [isSearching, setIsSearching] = useState(false);
  const [isFuzzySearching, setIsFuzzySearching] = useState(false);
  const [showFillDialog, setShowFillDialog] = useState(false);
  const [showCompanySelect, setShowCompanySelect] = useState(false);
  const [includeNews, setIncludeNews] = useState(false);
  const [fuzzySearchResults, setFuzzySearchResults] = useState<CompanyItem[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [searchResult, setSearchResult] = useState<{
    fullName?: string;
    description?: string;
    industry?: string;
    contactName?: string;
    phone?: string;
    address?: string;
    background?: string;
    contactBackground?: string;
    notes?: string;
    sources?: string[];
    confidence?: 'high' | 'medium' | 'low';
    // 新闻舆情相关字段
    keyEvents?: string;
    riskAlerts?: string;
    sentimentOverview?: 'positive' | 'neutral' | 'negative';
    newsHighlights?: Array<{
      title: string;
      summary?: string;
      date?: string;
      sentiment?: 'positive' | 'neutral' | 'negative';
      url?: string;
    }>;
    recommendation?: string;
  } | null>(null);

  // 处理输入变化
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'name' && selectedCompany && value.trim() !== selectedCompany.name) {
      setSelectedCompany(null);
    }

    // 清除错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入客户名称';
    }
    if (!formData.industry) {
      newErrors.industry = '请选择所属行业';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // 第一阶段：模糊搜索公司列表
  // ==========================================
  const handleSmartSearch = async () => {
    if (!formData.name.trim()) {
      toast.error('请先输入客户名称');
      return;
    }

    setIsFuzzySearching(true);
    setFuzzySearchResults([]);
    setSelectedCompany(null);

    try {
      // 调用模糊搜索API
      const response = await aiApi.fuzzySearchCompany({
        searchKey: formData.name,
        pageSize: 10,
      });

      if (response.success && response.data && response.data.items.length > 0) {
        setFuzzySearchResults(response.data.items);

        // 如果只有一个结果，直接选择
        if (response.data.items.length === 1) {
          toast.info('只找到一家公司，自动选择');
          await handleCompanySelect(response.data.items[0]);
        } else {
          // 多个结果，展示选择对话框
          setShowCompanySelect(true);
        }
      } else {
        toast.warning('未找到匹配的公司，请尝试使用更精确的公司名称');
      }
    } catch (error) {
      console.error('模糊搜索失败:', error);
      toast.error('搜索服务异常，请稍后重试');
    } finally {
      setIsFuzzySearching(false);
    }
  };

  // ==========================================
  // 第二阶段：用户选择公司后，查询详细信息
  // ==========================================
  const handleCompanySelect = async (company: CompanyItem) => {
    setSelectedCompany(company);
    setIsSearching(true);
    setSearchResult(null);

    // 保存公司全称到表单数据
    setFormData((prev) => ({
      ...prev,
      companyFullName: company.name, // 保存AI搜索返回的公司全称
    }));

    try {
      // 使用公司全称查询详细信息
      const response = await aiApi.searchCustomerInfo({
        companyName: company.name, // 使用公司全称
        industry: formData.industry || undefined,
        contactName: formData.contactName || undefined,
        includeNews,
      });

      if (response.success && response.data) {
        const foundCount = Object.entries(response.data).filter(([key, value]) => {
          if (key === 'sources' || key === 'confidence') return false;
          return value && String(value).trim().length > 0;
        }).length;

        if (foundCount > 0) {
          setSearchResult(response.data);
          setShowFillDialog(true);
        } else {
          toast.warning('未找到详细信息，请手动填写');
        }
      } else {
        toast.error(response.message || '搜索失败，请稍后重试');
      }
    } catch (error) {
      console.error('详情搜索失败:', error);
      toast.error('搜索服务异常，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 确认填充处理
  const handleConfirmFill = (
    data: Partial<typeof formData>,
    strategy: 'empty' | 'all'
  ) => {
    const updatedFields = Object.keys(data).length;
    if (updatedFields > 0) {
      setFormData((prev) => ({ ...prev, ...data }));
      toast.success(`已填充 ${updatedFields} 个字段`);
    } else {
      toast.info('没有可填充的字段');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await createCustomer({
        name: formData.name,
        companyFullName: formData.companyFullName || undefined,
        industry: formData.industry,
        description: formData.description || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactInfo || undefined,
        address: formData.address || undefined,
        background: formData.background || undefined,
        contactBackground: formData.contactBackground || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('客户创建成功');
      router.push('/dashboard/customers');
    } catch (error: unknown) {
      // 提取错误消息
      let errorMessage = '创建客户失败，请稍后重试';
      if (error instanceof Error) {
        // Axios 错误格式
        const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.status === 409) {
          errorMessage = axiosError.response.data?.message || '客户名称或联系人已存在';
        }
      }
      // 使用更友好的提示方式
      toast.warning(errorMessage, {
        duration: 6000,
        action: {
          label: '查看客户列表',
          onClick: () => router.push('/dashboard/customers'),
        },
      });
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
          title="新建客户"
          description="创建新的客户信息，填写客户基本信息和联系方式"
          icon={Briefcase}
          leftContent={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/customers')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>客户信息</CardTitle>
            <CardDescription>填写客户的基本信息和联系方式</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">基本信息</h3>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNews}
                        onChange={(e) => setIncludeNews(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300"
                      />
                      包含新闻
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSmartSearch}
                      disabled={isFuzzySearching || isSearching || !formData.name.trim()}
                      className="gap-1.5 text-xs h-8"
                    >
                      {isFuzzySearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          搜索公司...
                        </>
                      ) : isSearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          获取详情...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          智能填充
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    客户名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="请输入客户名称"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {selectedCompany && (
                    <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium">已选择企业全称</p>
                        <p className="break-all">{selectedCompany.name}</p>
                      </div>
                    </div>
                  )}
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyFullName">客户公司全称</Label>
                  <Input
                    id="companyFullName"
                    value={formData.companyFullName}
                    onChange={(e) => handleChange('companyFullName', e.target.value)}
                    placeholder="公司工商全称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">
                    所属行业 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="industry"
                    list="industry-options"
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="请输入或选择行业"
                    className={errors.industry ? 'border-red-500' : ''}
                  />
                  <datalist id="industry-options">
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <option key={industry} value={industry} />
                    ))}
                  </datalist>
                  {errors.industry && (
                    <p className="text-sm text-red-500">{errors.industry}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">公司描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleChange('description', e.target.value)
                    }
                    placeholder="请输入公司描述..."
                    rows={2}
                    className="resize-y min-h-[84px]"
                  />
                </div>
              </div>

              {/* 联系信息 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">联系信息</h3>

                <div className="space-y-2">
                  <Label htmlFor="contactName">联系人</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) =>
                      handleChange('contactName', e.target.value)
                    }
                    placeholder="请输入联系人姓名"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactInfo">联系方式</Label>
                  <Input
                    id="contactInfo"
                    value={formData.contactInfo}
                    onChange={(e) =>
                      handleChange('contactInfo', e.target.value)
                    }
                    placeholder="请输入联系电话或其他联系方式"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">公司地址</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="请输入公司地址"
                  />
                </div>
              </div>
            </div>

            {/* 背景信息 */}
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">背景信息</h3>

              <div className="space-y-2">
                <Label htmlFor="background">客户背景</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={(e) => handleChange('background', e.target.value)}
                  placeholder="请输入客户背景信息..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactBackground">联系人背景</Label>
                <Textarea
                  id="contactBackground"
                  value={formData.contactBackground}
                  onChange={(e) => handleChange('contactBackground', e.target.value)}
                  placeholder="请输入联系人背景信息..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="请输入备注信息..."
                  rows={2}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/customers')}
              >
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存客户
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 公司选择对话框（第一阶段） */}
        <CompanySelectDialog
          open={showCompanySelect}
          onOpenChange={setShowCompanySelect}
          companies={fuzzySearchResults}
          isLoading={isFuzzySearching}
          searchKey={formData.name}
          onSelect={handleCompanySelect}
        />

        {/* 智能填充对话框（第二阶段） */}
        <SmartFillDialog
          open={showFillDialog}
          onOpenChange={setShowFillDialog}
          searchResult={searchResult}
          currentFormData={formData}
          onConfirm={handleConfirmFill}
        />
      </div>
    </DashboardLayout>
  );
}
