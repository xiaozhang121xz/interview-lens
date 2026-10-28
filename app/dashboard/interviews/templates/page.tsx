'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatsCard } from '@/components/ui/stats-card';
import { useTemplateStore } from '@/stores/features/interview-assistant-store';
import {
  InterviewTemplate,
  questionsToOutline,
  outlineToQuestions,
} from '@/lib/api/interview-assistant/types';
import {
  FileText,
  Plus,
  Search,
  Globe,
  Lock,
  Pencil,
  Trash2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 分类选项（对应后端 category 字段）
const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部分类' },
  { value: '互联网', label: '互联网' },
  { value: '金融', label: '金融' },
  { value: '教育', label: '教育' },
  { value: '医疗', label: '医疗' },
  { value: '制造业', label: '制造业' },
  { value: '零售', label: '零售' },
  { value: '其他', label: '其他' },
];

// 可见性选项（前端筛选用，后端使用 isPublic 布尔值）
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'public', label: '公开' },
  { value: 'private', label: '私有' },
];

// 模板表单接口
interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  questions: string[];
  isPublic: boolean;
}

// 初始表单数据
const initialFormData: TemplateFormData = {
  name: '',
  description: '',
  category: '其他',
  questions: [''],
  isPublic: false,
};

export default function TemplatesPage() {
  const router = useRouter();
  const {
    templates,
    loading,
    pagination,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplateStore();

  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<InterviewTemplate | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);

  // 加载数据
  useEffect(() => {
    fetchTemplates({
      page: currentPage,
      pageSize: 12,
      search: searchValue || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      isPublic: visibilityFilter === 'public' ? true : visibilityFilter === 'private' ? false : undefined,
    });
  }, [currentPage, categoryFilter, visibilityFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchTemplates({
        page: 1,
        pageSize: 12,
        search: searchValue || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        isPublic: visibilityFilter === 'public' ? true : visibilityFilter === 'private' ? false : undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // 计算统计数据
  const stats = {
    total: pagination.total,
    publicCount: templates.filter((t) => t.isPublic === true).length,
    privateCount: templates.filter((t) => t.isPublic === false).length,
  };

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  // 打开创建对话框
  const handleOpenCreate = useCallback(() => {
    resetForm();
    setCreateDialogOpen(true);
  }, [resetForm]);

  // 打开编辑对话框
  const handleOpenEdit = useCallback((template: InterviewTemplate) => {
    setSelectedTemplate(template);
    const questions = outlineToQuestions(template.outline);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '其他',
      questions: questions.length > 0 ? questions : [''],
      isPublic: template.isPublic,
    });
    setEditDialogOpen(true);
  }, []);

  // 打开删除对话框
  const handleOpenDelete = useCallback((template: InterviewTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  }, []);

  // 处理问题变更
  const handleQuestionChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      questions[index] = value;
      return { ...prev, questions };
    });
  }, []);

  // 添加问题
  const handleAddQuestion = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, ''],
    }));
  }, []);

  // 删除问题
  const handleRemoveQuestion = useCallback((index: number) => {
    setFormData((prev) => {
      const questions = prev.questions.filter((_, i) => i !== index);
      return { ...prev, questions: questions.length > 0 ? questions : [''] };
    });
  }, []);

  // 创建模板
  const handleCreate = useCallback(async () => {
    try {
      const questions = formData.questions.filter((q) => q.trim());
      if (!formData.name.trim() || questions.length === 0) {
        return;
      }
      await createTemplate({
        name: formData.name,
        description: formData.description,
        outline: questionsToOutline(questions),
        category: formData.category,
        isPublic: formData.isPublic,
      });
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  }, [formData, createTemplate, resetForm]);

  // 更新模板
  const handleUpdate = useCallback(async () => {
    if (!selectedTemplate) return;
    try {
      const questions = formData.questions.filter((q) => q.trim());
      if (!formData.name.trim() || questions.length === 0) {
        return;
      }
      await updateTemplate(selectedTemplate.id, {
        name: formData.name,
        description: formData.description,
        outline: questionsToOutline(questions),
        category: formData.category,
        isPublic: formData.isPublic,
      });
      setEditDialogOpen(false);
      resetForm();
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  }, [selectedTemplate, formData, updateTemplate, resetForm]);

  // 删除模板
  const handleDelete = useCallback(async () => {
    if (!selectedTemplate) return;
    try {
      await deleteTemplate(selectedTemplate.id);
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  }, [selectedTemplate, deleteTemplate]);

  // 切换可见性
  const handleToggleVisibility = useCallback(
    async (template: InterviewTemplate) => {
      try {
        await updateTemplate(template.id, { isPublic: !template.isPublic });
      } catch (error) {
        console.error('Failed to toggle visibility:', error);
      }
    },
    [updateTemplate]
  );

  // 使用模板创建访谈
  const handleUseTemplate = useCallback(
    (template: InterviewTemplate) => {
      router.push(`/dashboard/interviews/new?templateId=${template.id}`);
    },
    [router]
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title="访谈模板"
          description="管理和复用访谈提纲模板，提高访谈效率"
          icon={FileText}
          actions={
            <Button size="sm" onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              创建模板
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            title="全部模板"
            value={stats.total}
            className="bg-blue-50/50 border-blue-100"
          />
          <StatsCard
            title="公开模板"
            value={stats.publicCount}
            className="bg-green-50/50 border-green-100"
          />
          <StatsCard
            title="私有模板"
            value={stats.privateCount}
            className="bg-purple-50/50 border-purple-100"
          />
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base">模板列表</CardTitle>
              <div className="flex items-center gap-2">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索模板名称..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                {/* 分类筛选 */}
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 可见性筛选 */}
                <Select
                  value={visibilityFilter}
                  onValueChange={setVisibilityFilter}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="可见性" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((option) => (
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
                    fetchTemplates({ page: currentPage, pageSize: 12 })
                  }
                  disabled={loading}
                >
                  <RefreshCw
                    className={cn('w-4 h-4', loading && 'animate-spin')}
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
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无模板数据</p>
                <Button onClick={handleOpenCreate} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  创建模板
                </Button>
              </div>
            ) : (
              <>
                {/* 模板卡片网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => {
                    const questions = outlineToQuestions(template.outline);
                    return (
                    <Card
                      key={template.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">
                              {template.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 mt-1">
                              {template.description || '暂无描述'}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              template.isPublic
                                ? 'default'
                                : 'secondary'
                            }
                            className="ml-2 flex-shrink-0"
                          >
                            {template.isPublic ? (
                              <>
                                <Globe className="w-3 h-3 mr-1" />
                                公开
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 mr-1" />
                                私有
                              </>
                            )}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* 分类 */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                        </div>

                        {/* 问题数量 */}
                        <div className="text-sm text-muted-foreground">
                          包含 {questions.length} 个问题
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            使用
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVisibility(template)}
                            title={
                              template.isPublic
                                ? '设为私有'
                                : '设为公开'
                            }
                          >
                            {template.isPublic ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Globe className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(template)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleOpenDelete(template)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
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

        {/* 创建/编辑模板对话框 */}
        <Dialog
          open={createDialogOpen || editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              resetForm();
              setSelectedTemplate(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editDialogOpen ? '编辑模板' : '创建模板'}
              </DialogTitle>
              <DialogDescription>
                {editDialogOpen
                  ? '修改访谈模板信息'
                  : '创建一个新的访谈提纲模板'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 模板名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">模板名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="请输入模板名称"
                />
              </div>

              {/* 模板描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">模板描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="请输入模板描述"
                  rows={3}
                />
              </div>

              {/* 分类和可见性 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.filter((o) => o.value !== 'all').map(
                        (option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>可见性</Label>
                  <Select
                    value={formData.isPublic ? 'public' : 'private'}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, isPublic: value === 'public' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择可见性" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          私有
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          公开
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 访谈问题 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>访谈问题 *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuestion}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加问题
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.questions.map((question, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-sm text-muted-foreground pt-2 w-6">
                        {index + 1}.
                      </span>
                      <Textarea
                        value={question}
                        onChange={(e) =>
                          handleQuestionChange(index, e.target.value)
                        }
                        placeholder={`请输入问题 ${index + 1}`}
                        className="flex-1"
                        rows={2}
                      />
                      {formData.questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveQuestion(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditDialogOpen(false);
                  resetForm();
                  setSelectedTemplate(null);
                }}
              >
                取消
              </Button>
              <Button onClick={editDialogOpen ? handleUpdate : handleCreate}>
                {editDialogOpen ? '保存修改' : '创建模板'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteDialogOpen(false);
              setSelectedTemplate(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除模板 &quot;{selectedTemplate?.name}&quot;
                吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedTemplate(null);
                }}
              >
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
