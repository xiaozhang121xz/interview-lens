'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Briefcase,
  ArrowLeft,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  MessageSquareQuote,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  useCustomerStore,
  useInterviewStore,
} from '@/stores/features/interview-assistant-store';
import { InterviewStatus } from '@/lib/api/interview-assistant/types';
import { SmartFillDialog } from '@/components/customers/SmartFillDialog';
import { CompanySelectDialog, type CompanyItem } from '@/components/customers/CompanySelectDialog';
import { aiApi } from '@/lib/api/interview-assistant/api';
import { toast } from 'sonner';

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

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const customerId = params.id as string;
  const isEditMode = searchParams.get('edit') === 'true';

  const {
    currentCustomer,
    loading,
    fetchCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomerStore();
  const { interviews, fetchInterviews } = useInterviewStore();

  const [editing, setEditing] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  // 加载客户数据
  useEffect(() => {
    if (customerId) {
      fetchCustomer(customerId);
      // 加载该客户的访谈
      fetchInterviews({ customerId, pageSize: 100 });
    }
  }, [customerId]);

  // 填充表单数据
  useEffect(() => {
    if (currentCustomer) {
      setFormData({
        name: currentCustomer.name,
        companyFullName: currentCustomer.companyFullName || '',
        industry: currentCustomer.industry || '',
        description: currentCustomer.description || '',
        contactName: currentCustomer.contact || '',
        contactInfo: currentCustomer.phone || '',
        address: currentCustomer.address || '',
        background: currentCustomer.background || '',
        contactBackground: currentCustomer.contactBackground || '',
        notes: currentCustomer.notes || '',
      });
    }
  }, [currentCustomer]);

  // 处理输入变化
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'name' && selectedCompany && value.trim() !== selectedCompany.name) {
      setSelectedCompany(null);
    }
  };

  // 保存更新
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.industry) {
      toast.error('请填写必填字段');
      return;
    }

    setSaving(true);
    try {
      await updateCustomer(customerId, {
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
      setEditing(false);
      toast.success('客户信息更新成功');
    } catch (error: unknown) {
      // 提取错误消息
      let errorMessage = '更新客户失败，请稍后重试';
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
      });
    } finally {
      setSaving(false);
    }
  };

  // 删除客户
  const handleDelete = async () => {
    try {
      await deleteCustomer(customerId);
      router.push('/dashboard/customers');
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  // 跳转到访谈详情
  const handleViewInterview = (interviewId: string) => {
    router.push(`/dashboard/interviews/${interviewId}`);
  };

  // 第一阶段：模糊搜索公司列表
  const handleSmartSearch = async () => {
    if (!formData.name.trim()) {
      toast.error('请先输入客户名称');
      return;
    }

    setIsFuzzySearching(true);
    setFuzzySearchResults([]);
    setSelectedCompany(null);
    setSearchResult(null);

    try {
      const response = await aiApi.fuzzySearchCompany({
        searchKey: formData.name,
        pageSize: 10,
      });

      if (response.success && response.data && response.data.items.length > 0) {
        setFuzzySearchResults(response.data.items);

        if (response.data.items.length === 1) {
          toast.info('只找到一家公司，自动选择');
          await handleCompanySelect(response.data.items[0]);
        } else {
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

  // 第二阶段：用户选择公司后，查询详细信息
  const handleCompanySelect = async (company: CompanyItem) => {
    setSelectedCompany(company);
    setIsSearching(true);
    setSearchResult(null);
    setFormData((prev) => ({
      ...prev,
      companyFullName: company.name,
    }));

    try {
      const response = await aiApi.searchCustomerInfo({
        companyName: company.name,
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
          toast.warning('未找到相关信息，请手动填写');
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

  if (loading && !currentCustomer) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentCustomer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">客户不存在</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/customers')}
          >
            返回列表
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title={editing ? '编辑客户' : currentCustomer.name}
          description={
            editing ? '修改客户信息' : `查看 ${currentCustomer.name} 的详细信息`
          }
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
          actions={
            editing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  保存
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  编辑
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </Button>
              </div>
            )
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 基本信息 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>基本信息</CardTitle>
                {editing && (
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
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>客户名称 *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>公司全称</Label>
                    <Input
                      value={formData.companyFullName}
                      onChange={(e) => handleChange('companyFullName', e.target.value)}
                      placeholder="公司工商全称"
                    />
                    {selectedCompany && (
                      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium">已选择企业全称</p>
                          <p className="break-all">{selectedCompany.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>所属行业 *</Label>
                    <Input
                      list="industry-options"
                      value={formData.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                      placeholder="请输入或选择行业"
                    />
                    <datalist id="industry-options">
                      {INDUSTRY_OPTIONS.map((industry) => (
                        <option key={industry} value={industry} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>公司描述</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleChange('description', e.target.value)
                      }
                      rows={2}
                      className="resize-y min-h-[84px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentCustomer.companyFullName && (
                    <div>
                      <p className="text-sm text-muted-foreground">公司全称</p>
                      <p className="text-sm font-medium">{currentCustomer.companyFullName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">所属行业</p>
                    <Badge variant="outline" className="mt-1">
                      {currentCustomer.industry}
                    </Badge>
                  </div>
                  {currentCustomer.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        公司描述
                      </p>
                      <p className="text-sm">{currentCustomer.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 联系信息 */}
          <Card>
            <CardHeader>
              <CardTitle>联系信息</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>联系人</Label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) =>
                        handleChange('contactName', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>联系方式</Label>
                    <Input
                      value={formData.contactInfo}
                      onChange={(e) =>
                        handleChange('contactInfo', e.target.value)
                      }
                      placeholder="请输入联系电话或其他联系方式"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>公司地址</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCustomer.contact && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span>{currentCustomer.contact}</span>
                    </div>
                  )}
                  {currentCustomer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{currentCustomer.phone}</span>
                    </div>
                  )}
                  {currentCustomer.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{currentCustomer.address}</span>
                    </div>
                  )}
                  {!currentCustomer.contact &&
                    !currentCustomer.phone &&
                    !currentCustomer.address && (
                      <p className="text-sm text-muted-foreground">
                        暂无联系信息
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 背景信息和备注 */}
        <Card>
          <CardHeader>
            <CardTitle>背景信息</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>客户背景</Label>
                  <Textarea
                    value={formData.background}
                    onChange={(e) => handleChange('background', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系人背景</Label>
                  <Textarea
                    value={formData.contactBackground}
                    onChange={(e) => handleChange('contactBackground', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentCustomer.background && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      客户背景
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {currentCustomer.background}
                    </p>
                  </div>
                )}
                {currentCustomer.contactBackground && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      联系人背景
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {currentCustomer.contactBackground}
                    </p>
                  </div>
                )}
                {currentCustomer.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">备注</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {currentCustomer.notes}
                    </p>
                  </div>
                )}
                {!currentCustomer.background && !currentCustomer.contactBackground && !currentCustomer.notes && (
                  <p className="text-sm text-muted-foreground">暂无背景信息</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 关联访谈 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>关联访谈</CardTitle>
                <CardDescription>该客户的访谈项目列表</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/dashboard/interviews/new?customerId=${customerId}`
                  )
                }
              >
                新建访谈
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <MessageSquareQuote className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">暂无访谈项目</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>访谈标题</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>访谈日期</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((interview) => (
                      <TableRow
                        key={interview.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewInterview(interview.id)}
                      >
                        <TableCell className="font-medium">
                          {interview.title}
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
                          {new Date(interview.createdAt).toLocaleDateString(
                            'zh-CN'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInterview(interview.id);
                            }}
                          >
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除客户 &quot;{currentCustomer?.name}&quot; 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={handleDelete}
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CompanySelectDialog
          open={showCompanySelect}
          onOpenChange={setShowCompanySelect}
          companies={fuzzySearchResults}
          isLoading={isFuzzySearching}
          searchKey={formData.name}
          onSelect={handleCompanySelect}
        />

        {/* 智能填充对话框 */}
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
