'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquareQuote,
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  GripVertical,
  Sparkles,
  FileText,
  CheckCircle,
  Circle,
  Star,
  Play,
  Mic,
  Lightbulb,
  AlertTriangle,
  MoreHorizontal,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useInterviewStore } from '@/stores/features/interview-assistant-store';
import { useUserStore } from '@/stores/core/useUserStore';
import { getUserJourneyConfig } from '@/lib/constants/user-journey-config';
import { cn } from '@/lib/utils';
import type {
  InterviewStatus,
  Outline,
  Record as InterviewRecordType,
  OutlineStatus,
  RecordType,
  InsightReportContent,
  InsightReportVersion,
  CoreQuestion,
  SupplementaryQuestion,
  MissingQuestion,
  InsightReportItem,
  PreparationStatus,
} from '@/lib/api/interview-assistant/types';
import { aiApi, insightReportApi, interviewApi } from '@/lib/api/interview-assistant/api';
import { InsightReportCard } from '@/components/features/interview/insight-report-card';
import { CoreQuestionsDialog } from '@/components/features/interview/core-questions-dialog';
import { OutlineSection } from '@/components/features/interview/outline-section';
import { OutlineGapAlert } from '@/components/features/interview/outline-gap-alert';
import { InsightReportHistoryDialog } from '@/components/features/interview/insight-report-history-dialog';
import { useCustomerStore } from '@/stores/features/interview-assistant-store';
import { extractInsightReportSummary, isInsightReportV1, parseStoredInsightReport } from '@/lib/utils/insight-report';

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

// 状态流转
const STATUS_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
  draft: ['prepared'],
  prepared: ['in_progress', 'draft'],
  in_progress: ['completed', 'prepared'],
  completed: ['archived'],
  archived: [],
};

// 提纲状态颜色
const OUTLINE_STATUS_COLORS: Record<OutlineStatus, string> = {
  pending: 'text-gray-500',
  asked: 'text-green-500',
  skipped: 'text-yellow-500',
};

// 记录类型
const RECORD_TYPE_OPTIONS: { value: RecordType; label: string }[] = [
  { value: 'answer', label: '客户回答' },
  { value: 'note', label: '访谈记录' },
  { value: 'pain_point', label: '痛点' },
  { value: 'requirement', label: '需求' },
  { value: 'other', label: '其他' },
];

export default function InterviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const interviewId = params.id as string;

  const {
    currentInterview,
    outlines,
    records,
    loading,
    fetchInterview,
    updateInterview,
    updateInterviewStatus,
    deleteInterview,
    createOutline,
    updateOutline,
    deleteOutline,
    clearAllOutlines,
    createRecord,
    updateRecord,
    deleteRecord,
    setCurrentInterview,
  } = useInterviewStore();
  const { customers, fetchCustomers } = useCustomerStore();

  const [activeTab, setActiveTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 自动生成状态追踪
  const [preparationStatus, setPreparationStatus] = useState<PreparationStatus>('pending');
  const [preparationError, setPreparationError] = useState<string | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    objective: '',
    background: '',
    interviewDate: '',
  });

  // 提纲对话框
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [outlineFormData, setOutlineFormData] = useState({
    question: '',
    priority: 3,
    notes: '',
  });
  const [editingOutline, setEditingOutline] = useState<Outline | null>(null);

  // 记录对话框
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [recordFormData, setRecordFormData] = useState({
    content: '',
    type: 'note' as RecordType,
    isHighlight: false,
  });
  const [editingRecord, setEditingRecord] =
    useState<InterviewRecordType | null>(null);

  // AI 生成提纲
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiOutlineDialogOpen, setAiOutlineDialogOpen] = useState(false);

  // 提纲生成优化 - 新增状态
  const [insightReport, setInsightReport] = useState<InsightReportContent | null>(null);
  const [insightReportVersion, setInsightReportVersion] = useState<InsightReportVersion>('v1');
  const [insightLoading, setInsightLoading] = useState(false);
  const [coreQuestions, setCoreQuestions] = useState<CoreQuestion[]>([]);
  const [supplementaryQuestions, setSupplementaryQuestions] = useState<SupplementaryQuestion[]>([]);
  const [coreQuestionsDialogOpen, setCoreQuestionsDialogOpen] = useState(false);
  const [coreQuestionsLoading, setCoreQuestionsLoading] = useState(false);
  const [missingQuestions, setMissingQuestions] = useState<MissingQuestion[]>([]);
  const [overallCoverage, setOverallCoverage] = useState(100);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [gapLoading, setGapLoading] = useState(false);

  // 报告版本管理 - 新增状态
  const [reportList, setReportList] = useState<InsightReportItem[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | undefined>();
  const [reportHistoryOpen, setReportHistoryOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateOption, setRegenerateOption] = useState<'overwrite' | 'new'>('overwrite');
  const [reportGenerationVersion, setReportGenerationVersion] = useState<InsightReportVersion>('v1');

  // 加载数据
  useEffect(() => {
    if (interviewId) {
      // 重置状态，避免显示上一个访谈的数据
      setCurrentInterview(null);
      setInsightReport(null);
      setReportList([]);
      setCurrentReportId(undefined);
      setPreparationStatus('pending');
      setPreparationError(null);
      // 然后获取新访谈数据
      fetchInterview(interviewId);
    }
  }, [interviewId, fetchInterview, setCurrentInterview]);

  useEffect(() => {
    fetchCustomers({ pageSize: 100 });
  }, [fetchCustomers]);

  // 轮询准备状态
  useEffect(() => {
    // 只有当 currentInterview 存在且 ID 匹配时才进行轮询
    if (!interviewId || !currentInterview || currentInterview.id !== interviewId) return;

    const status = (currentInterview as any).preparationStatus as PreparationStatus | undefined;

    // 如果有状态，更新本地状态
    if (status) {
      setPreparationStatus(status);
      setPreparationError((currentInterview as any).preparationError || null);
    }

    // 判断是否需要轮询：
    // 1. 状态为 pending 或 generating 时轮询
    // 2. 如果没有状态字段，但有访谈数据且没有分析报告，也启动轮询（兼容旧数据）
    const hasInsightReports = (currentInterview as any).insightReports?.length > 0;
    const hasOutlines = outlines.length > 0;
    const shouldPoll =
      status === 'generating' ||
      status === 'pending' ||
      (!status && !hasInsightReports && !hasOutlines);

    if (shouldPoll) {
      console.log('[Interview Detail] 启动轮询，当前状态:', status || '无状态');

      const pollInterval = setInterval(async () => {
        try {
          const result = await interviewApi.getPreparationStatus(interviewId);

          if (result.success && result.data) {
            const newStatus = (result.data.preparationStatus || 'pending') as PreparationStatus;
            console.log('[Interview Detail] 轮询结果:', newStatus);

            setPreparationStatus(newStatus);
            setPreparationError(result.data.preparationError);

            // 完成或失败时停止轮询
            if (newStatus === 'completed' || newStatus === 'failed') {
              clearInterval(pollInterval);
              // 刷新访谈数据
              fetchInterview(interviewId);
            }
          }
        } catch (error) {
          console.error('Failed to poll preparation status:', error);
        }
      }, 3000); // 每3秒轮询

      return () => clearInterval(pollInterval);
    }
  }, [interviewId, currentInterview, outlines.length, fetchInterview]);

  // 填充表单数据
  useEffect(() => {
    // 只有当 currentInterview 存在且 ID 匹配时才处理数据
    // 防止显示上一个访谈的数据
    if (currentInterview && currentInterview.id === interviewId) {
      setFormData({
        customerId: currentInterview.customerId,
        title: currentInterview.title,
        objective: currentInterview.objective,
        background: currentInterview.background || '',
        interviewDate: currentInterview.interviewDate
          ? new Date(currentInterview.interviewDate).toISOString().slice(0, 16)
          : '',
      });

      // 加载持久化的分析报告
      if (currentInterview.insightReports && currentInterview.insightReports.length > 0) {
        // 按创建时间排序，最新的在最前面
        const sortedReports = [...currentInterview.insightReports].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // 构建报告列表
        const items: InsightReportItem[] = sortedReports.map((r, index) => ({
          id: r.id,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          versionNumber: sortedReports.length - index, // 版本号：最新的版本号最大
          summary: extractSummaryFromReport(r.content),
          reportType: extractReportVersion(r.content),
        }));

        setReportList(items);
        setCurrentReportId(sortedReports[0].id);

        try {
          const parsedReport = parseStoredInsightReport(sortedReports[0].content);
          setInsightReport(parsedReport.data);
          setInsightReportVersion(parsedReport.version);
        } catch (e) {
          console.error('Failed to parse insight report:', e);
        }
      }
    }
  }, [currentInterview, interviewId]);

  /**
   * 从报告内容提取摘要
   */
  const extractSummaryFromReport = (content: string): string | undefined => {
    const summary = extractInsightReportSummary(content);
    return summary ? summary.slice(0, 100) : undefined;
  };

  const extractReportVersion = (content: string): InsightReportVersion => {
    try {
      return parseStoredInsightReport(content).version;
    } catch {
      return 'v1';
    }
  };

  const buildGenerationPayload = (reportVersion: InsightReportVersion = 'v1') => {
    if (!currentInterview?.customer) {
      throw new Error('访谈缺少客户信息');
    }

    const { rolePersona } = useUserStore.getState();
    const focusAreas = rolePersona
      ? getUserJourneyConfig(rolePersona).outlineFocus
      : undefined;

    return {
      endpoint:
        reportVersion === 'v2'
          ? '/api/ai/generate/interview-insights-v2'
          : '/api/ai/generate/interview-insights',
      body: {
        interviewId,
        customerInfo: {
          name: currentInterview.customer.name,
          industry: currentInterview.customer.industry || undefined,
          description: currentInterview.customer.description || undefined,
          background: currentInterview.customer.background || undefined,
          contactBackground: currentInterview.customer.contactBackground || undefined,
          website: currentInterview.customer.website || undefined,
          notes: currentInterview.customer.notes || undefined,
        },
        objective: currentInterview.objective,
        background: currentInterview.background,
        focusAreas,
      },
    };
  };

  const requestInsightReport = async (
    options?: {
      version?: InsightReportVersion;
      overwrite?: boolean;
    }
  ) => {
    const version = options?.version ?? reportGenerationVersion;
    const { endpoint, body } = buildGenerationPayload(version);

    const result = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        overwrite: options?.overwrite,
      }),
    }).then(res => res.json());

    return {
      success: Boolean(result.success),
      data: result.data as InsightReportContent | undefined,
      message: result.message as string | undefined,
      version,
    };
  };

  const requestCoreQuestions = async (report: InsightReportContent | null) => {
    if (!currentInterview?.customer) {
      throw new Error('访谈缺少客户信息');
    }

    if (report && !isInsightReportV1(report)) {
      throw new Error('当前查看的是 V2 访谈准备卡，请切换到经典版 V1 报告后再生成核心问题');
    }

    const { rolePersona } = useUserStore.getState();
    const focusAreas = rolePersona
      ? getUserJourneyConfig(rolePersona).outlineFocus
      : undefined;

    const result = await fetch('/api/ai/generate/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerInfo: {
          name: currentInterview.customer.name,
          industry: currentInterview.customer.industry || undefined,
          description: currentInterview.customer.description || undefined,
        },
        objective: currentInterview.objective,
        background: currentInterview.background,
        focusAreas,
        insightReport: report || undefined,
      }),
    }).then(res => res.json());

    return {
      success: Boolean(result.success),
      data: result.data as {
        coreQuestions?: CoreQuestion[];
        supplementaryQuestions?: SupplementaryQuestion[];
      } | undefined,
      message: result.message as string | undefined,
    };
  };

  const persistQuestionsToOutlines = async (selectedQuestions: Array<{
    question: string;
    priority?: number;
    isCore?: boolean;
    reasoning?: string;
    relatedInsight?: string;
    relatedPainPointIndex?: number;
    relatedPriorityAreaIndex?: number;
    relatedBusinessScenarioKey?: string;
    insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed';
  }>) => {
    for (let i = 0; i < selectedQuestions.length; i++) {
      const q = selectedQuestions[i];

      const cleanData: any = {
        question: q.question,
        priority: q.priority ?? 3,
        order: outlines.length + i,
        isCore: q.isCore ?? true,
        source: 'ai',
      };

      if (q.reasoning !== undefined && q.reasoning !== null) {
        cleanData.reasoning = q.reasoning;
      }
      if (q.relatedInsight !== undefined && q.relatedInsight !== null) {
        cleanData.relatedInsight = q.relatedInsight;
      }
      if (q.relatedPainPointIndex !== undefined && q.relatedPainPointIndex !== null) {
        cleanData.relatedPainPointIndex = q.relatedPainPointIndex;
      }
      if (q.relatedPriorityAreaIndex !== undefined && q.relatedPriorityAreaIndex !== null) {
        cleanData.relatedPriorityAreaIndex = q.relatedPriorityAreaIndex;
      }
      if (q.relatedBusinessScenarioKey !== undefined && q.relatedBusinessScenarioKey !== null) {
        cleanData.relatedBusinessScenarioKey = q.relatedBusinessScenarioKey;
      }
      if (q.insightReferenceType !== undefined && q.insightReferenceType !== null) {
        cleanData.insightReferenceType = q.insightReferenceType;
      }

      await createOutline(interviewId, cleanData);
    }
  };

  const runAutoGeneratePreparation = async () => {
    setActiveTab('outline');
    setInsightLoading(true);
    setCoreQuestionsLoading(true);

    try {
      const insightResult = await requestInsightReport({ version: 'v1' });
      if (!insightResult.success || !insightResult.data) {
        throw new Error(insightResult.message || '分析报告生成失败');
      }

      setInsightReport(insightResult.data);
      setInsightReportVersion('v1');

      const questionResult = await requestCoreQuestions(insightResult.data);
      if (!questionResult.success || !questionResult.data) {
        throw new Error(questionResult.message || '访谈提纲生成失败');
      }

      const questions = questionResult.data.coreQuestions || [];
      if (questions.length > 0) {
        await persistQuestionsToOutlines(questions);
      }

      setCoreQuestions(questionResult.data.coreQuestions || []);
      setSupplementaryQuestions(questionResult.data.supplementaryQuestions || []);
      await fetchInterview(interviewId);
    } finally {
      setInsightLoading(false);
      setCoreQuestionsLoading(false);
    }
  };

  /**
   * 切换报告版本
   */
  const handleReportChange = async (reportId: string) => {
    if (!currentInterview) return;

    setCurrentReportId(reportId);
    setInsightLoading(true);

    try {
      const result = await insightReportApi.getDetail(interviewId, reportId);
      if (result.success) {
        setInsightReport(result.data.content);
        setInsightReportVersion(result.data.reportType || 'v1');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setInsightLoading(false);
    }
  };

  /**
   * 删除报告版本
   */
  const handleDeleteReport = async (reportId: string) => {
    try {
      await insightReportApi.delete(interviewId, reportId);
      // 更新报告列表
      const newList = reportList.filter((r) => r.id !== reportId);
      setReportList(newList);

      // 如果删除的是当前报告，切换到最新的
      if (reportId === currentReportId && newList.length > 0) {
        await handleReportChange(newList[0].id);
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  /**
   * 打开重新生成对话框
   */
  const handleOpenRegenerateDialog = () => {
    setReportGenerationVersion(insightReportVersion);
    setRegenerateDialogOpen(true);
  };

  /**
   * 确认重新生成报告
   */
  const handleConfirmRegenerate = async () => {
    setRegenerateDialogOpen(false);
    setInsightLoading(true);

    try {
      const result = await requestInsightReport({
        version: reportGenerationVersion,
        overwrite: regenerateOption === 'overwrite',
      });

      if (result.success) {
        setInsightReport(result.data || null);
        setInsightReportVersion(result.version);
        // 重新获取报告列表
        await fetchInterview(interviewId);
      } else {
        alert('生成分析报告失败：' + (result.message || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to regenerate insights:', error);
      alert('生成分析报告失败');
    } finally {
      setInsightLoading(false);
    }
  };

  // 处理输入变化
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 保存更新
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.objective.trim() || !formData.customerId) {
      alert('请填写必填字段');
      return;
    }

    setSaving(true);
    try {
      // 转换日期格式：datetime-local -> ISO 8601
      const interviewDateISO = formData.interviewDate
        ? new Date(formData.interviewDate).toISOString()
        : undefined;

      await updateInterview(interviewId, {
        customerId: formData.customerId,
        title: formData.title,
        objective: formData.objective,
        background: formData.background,
        interviewDate: interviewDateISO,
      });
      setEditing(false);
    } catch (error) {
      console.error('Failed to update interview:', error);
    } finally {
      setSaving(false);
    }
  };

  // 状态变更
  const handleStatusChange = async (newStatus: InterviewStatus) => {
    try {
      await updateInterviewStatus(interviewId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // 删除访谈
  const handleDelete = async () => {
    try {
      await deleteInterview(interviewId);
      router.push('/dashboard/interviews');
    } catch (error) {
      console.error('Failed to delete interview:', error);
    }
  };

  // 提纲操作
  const handleAddOutline = async () => {
    if (!outlineFormData.question.trim()) return;
    await createOutline(interviewId, outlineFormData);
    setOutlineDialogOpen(false);
    setOutlineFormData({ question: '', priority: 3, notes: '' });
  };

  const handleUpdateOutline = async () => {
    if (!editingOutline || !outlineFormData.question.trim()) return;
    await updateOutline(interviewId, editingOutline.id, {
      question: outlineFormData.question,
      priority: outlineFormData.priority,
      notes: outlineFormData.notes,
    });
    setOutlineDialogOpen(false);
    setEditingOutline(null);
    setOutlineFormData({ question: '', priority: 3, notes: '' });
  };

  const handleDeleteOutline = async (outlineId: string) => {
    if (confirm('确定要删除此提纲项吗？')) {
      await deleteOutline(interviewId, outlineId);
    }
  };

  const handleClearAllOutlines = async () => {
    if (outlines.length === 0) return;
    if (confirm(`确定要清空全部 ${outlines.length} 条提纲吗？此操作无法撤销。`)) {
      await clearAllOutlines(interviewId);
    }
  };

  const handleOutlineStatusChange = async (
    outlineId: string,
    status: OutlineStatus
  ) => {
    await updateOutline(interviewId, outlineId, { status });
  };

  // 记录操作
  const handleAddRecord = async () => {
    if (!recordFormData.content.trim()) return;
    await createRecord(interviewId, recordFormData);
    setRecordDialogOpen(false);
    setRecordFormData({ content: '', type: 'note', isHighlight: false });
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord || !recordFormData.content.trim()) return;
    await updateRecord(interviewId, editingRecord.id, recordFormData);
    setRecordDialogOpen(false);
    setEditingRecord(null);
    setRecordFormData({ content: '', type: 'note', isHighlight: false });
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm('确定要删除此记录吗？')) {
      await deleteRecord(interviewId, recordId);
    }
  };

  const handleToggleHighlight = async (record: InterviewRecordType) => {
    await updateRecord(interviewId, record.id, {
      isHighlight: !record.isHighlight,
    });
  };

  // AI 生成提纲
  const handleGenerateOutline = async () => {
    if (!currentInterview?.customer) return;
    setAiGenerating(true);
    try {
      // 获取用户角色画像的关注领域
      const { rolePersona } = useUserStore.getState();
      const focusAreas = rolePersona
        ? getUserJourneyConfig(rolePersona).outlineFocus
        : undefined;

      const result = await aiApi.generateOutline({
        customerInfo: {
          name: currentInterview.customer.name,
          industry: currentInterview.customer.industry || undefined,
          description: currentInterview.customer.description || undefined,
        },
        objective: currentInterview.objective,
        background: currentInterview.background,
        focusAreas, // 根据用户画像自动填充关注领域
      });
      // 将结构化提纲转换为扁平数组
      const allQuestions = result.data.outline.sections.flatMap(
        section => section.questions
      );
      setAiQuestions(allQuestions);
      setAiOutlineDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate outline:', error);
      alert('AI 生成提纲失败，请检查 AI 服务配置');
    } finally {
      setAiGenerating(false);
    }
  };

  // 提纲生成优化 - 阶段1：生成分析报告
  const handleGenerateInsights = async () => {
    if (!currentInterview?.customer) return;
    setInsightLoading(true);
    try {
      const result = await requestInsightReport();

      if (result.success) {
        setInsightReport(result.data || null);
        setInsightReportVersion(result.version);
        await fetchInterview(interviewId);
      } else {
        alert('生成分析报告失败：' + (result.message || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
      alert('生成分析报告失败');
    } finally {
      setInsightLoading(false);
    }
  };

  // 提纲生成优化 - 阶段2：生成核心问题
  const handleGenerateCoreQuestions = async () => {
    if (!currentInterview) {
      alert('访谈数据未加载，请刷新页面重试');
      return;
    }
    if (!currentInterview.customer) {
      alert('访谈缺少客户信息，请检查访谈设置');
      return;
    }
    if (insightReport && !isInsightReportV1(insightReport)) {
      alert('当前查看的是 V2 访谈准备卡，请切换到经典版 V1 报告后再生成核心问题');
      return;
    }
    setCoreQuestionsLoading(true);
    try {
      const result = await requestCoreQuestions(insightReport);

      if (result.success) {
        setCoreQuestions(result.data?.coreQuestions || []);
        setSupplementaryQuestions(result.data?.supplementaryQuestions || []);
        setCoreQuestionsDialogOpen(true);
      } else {
        alert('生成核心问题失败：' + (result.message || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to generate core questions:', error);
      alert('生成核心问题失败');
    } finally {
      setCoreQuestionsLoading(false);
    }
  };

  // 提纲生成优化 - 确认添加问题
  const handleConfirmQuestions = async (selectedQuestions: Array<{
    question: string;
    priority?: number;
    isCore?: boolean;
    reasoning?: string;
    relatedInsight?: string;
    relatedPainPointIndex?: number;
    relatedPriorityAreaIndex?: number;
    relatedBusinessScenarioKey?: string;
    insightReferenceType?: 'pain_point' | 'priority_area' | 'business_scenario' | 'mixed';
  }>) => {
    await persistQuestionsToOutlines(selectedQuestions);
    setCoreQuestionsDialogOpen(false);
    // 生成后检测遗漏
    handleCheckGaps();
  };

  // 提纲生成优化 - 阶段4：检测遗漏
  const handleCheckGaps = async () => {
    if (!currentInterview?.customer || outlines.length === 0) return;
    setGapLoading(true);
    try {
      const result = await fetch('/api/ai/analyze/outline-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          currentOutline: outlines.map(o => ({
            id: o.id,
            question: o.question,
            isCore: o.isCore !== false,
          })),
          objective: currentInterview.objective,
          customerInfo: {
            name: currentInterview.customer.name,
            industry: currentInterview.customer.industry || undefined,
            description: currentInterview.customer.description || undefined,
          },
          insightReport: insightReport || undefined,
        }),
      }).then(res => res.json());

      if (result.success) {
        setMissingQuestions(result.data.missingCriticalQuestions || []);
        setOverallCoverage(result.data.overallCoverage || 100);
        setRecommendations(result.data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to check gaps:', error);
    } finally {
      setGapLoading(false);
    }
  };

  // 提纲生成优化 - 添加缺失问题
  const handleAddMissingQuestion = async (q: MissingQuestion) => {
    await createOutline(interviewId, {
      question: q.suggestedQuestion,
      priority: q.severity === 'high' ? 2 : 3,
      isCore: true,
      reasoning: q.reason,
      source: 'ai',
    });
    setMissingQuestions(prev => prev.filter(item => item.suggestedQuestion !== q.suggestedQuestion));
  };

  // 提纲生成优化 - 添加所有缺失问题
  const handleAddAllMissing = async (questions: MissingQuestion[]) => {
    for (const q of questions) {
      await createOutline(interviewId, {
        question: q.suggestedQuestion,
        priority: q.severity === 'high' ? 2 : 3,
        isCore: true,
        reasoning: q.reason,
        source: 'ai',
      });
    }
    setMissingQuestions([]);
    setOverallCoverage(100);
  };

  // 添加选中的 AI 问题
  const handleAddAiQuestions = async (selectedQuestions: string[]) => {
    for (let i = 0; i < selectedQuestions.length; i++) {
      await createOutline(interviewId, {
        question: selectedQuestions[i],
        priority: 3,
        order: outlines.length + i,
      });
    }
    setAiOutlineDialogOpen(false);
    setAiQuestions([]);
  };

  if (loading || (currentInterview && currentInterview.id !== interviewId)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentInterview) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">访谈不存在</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/interviews')}
          >
            返回列表
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentStatus = currentInterview.status as InterviewStatus;
  const availableStatuses = STATUS_TRANSITIONS[currentStatus] || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title={editing ? '编辑访谈' : currentInterview.title}
          description={
            editing ? '修改访谈信息' : `状态：${STATUS_LABELS[currentStatus]}`
          }
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
          actions={
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* 状态徽章 - 始终显示 */}
              <Badge className={cn(STATUS_COLORS[currentStatus], 'text-xs md:text-sm')}>
                {STATUS_LABELS[currentStatus]}
              </Badge>

              {/* 主要操作按钮 - 始终显示 */}
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/interviews/${interviewId}/conduct`)
                }
                className="gap-1.5 md:gap-2"
              >
                <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">开始访谈</span>
                <span className="sm:hidden">开始</span>
              </Button>

              {/* 桌面端显示的按钮 */}
              <div className="hidden lg:flex items-center gap-2">
                {availableStatuses.length > 0 && (
                  <Select
                    value={currentStatus}
                    onValueChange={(value) =>
                      handleStatusChange(value as InterviewStatus)
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/interviews/${interviewId}/result`)
                  }
                >
                  <FileText className="w-4 h-4 mr-2" />
                  查看结果
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

              {/* 移动端显示更多菜单 */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {availableStatuses.length > 0 && (
                      <>
                        <DropdownMenuItem asChild>
                          <Select
                            value={currentStatus}
                            onValueChange={(value) =>
                              handleStatusChange(value as InterviewStatus)
                            }
                          >
                            <SelectTrigger className="w-full border-0 shadow-none">
                              <Settings className="w-4 h-4 mr-2" />
                              修改状态
                            </SelectTrigger>
                          </Select>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/dashboard/interviews/${interviewId}/result`)
                      }
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      查看结果
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除访谈
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="outline">
              访谈提纲
              <Badge variant="secondary" className="ml-2">
                {outlines.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="records">
              访谈记录
              <Badge variant="secondary" className="ml-2">
                {records.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>访谈信息</CardTitle>
                  {!editing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      编辑
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>客户对象</Label>
                      <Select
                        value={formData.customerId}
                        onValueChange={(value) =>
                          handleChange('customerId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择客户" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                              {customer.industry ? ` (${customer.industry})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>访谈标题</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>访谈日期</Label>
                      <Input
                        type="datetime-local"
                        value={formData.interviewDate}
                        onChange={(e) =>
                          handleChange('interviewDate', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>访谈目标</Label>
                      <Textarea
                        value={formData.objective}
                        onChange={(e) =>
                          handleChange('objective', e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>背景信息</Label>
                      <Textarea
                        value={formData.background}
                        onChange={(e) =>
                          handleChange('background', e.target.value)
                        }
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditing(false)}
                      >
                        取消
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">客户</p>
                        <p className="font-medium">
                          {currentInterview.customer?.name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          访谈日期
                        </p>
                        <p className="font-medium">
                          {currentInterview.interviewDate
                            ? new Date(
                                currentInterview.interviewDate
                              ).toLocaleString('zh-CN')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">访谈目标</p>
                      <p className="whitespace-pre-wrap">
                        {currentInterview.objective}
                      </p>
                    </div>
                    {currentInterview.background && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          背景信息
                        </p>
                        <p className="whitespace-pre-wrap">
                          {currentInterview.background}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 访谈提纲 */}
          <TabsContent value="outline" className="mt-4">
            <div className="space-y-4">
              {/* 自动生成进度状态 */}
              {(preparationStatus === 'pending' || preparationStatus === 'generating') && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-800">
                          {preparationStatus === 'pending' ? '准备开始生成分析报告...' : '正在生成分析报告和问题提纲...'}
                        </p>
                        <p className="text-sm text-blue-600">
                          AI正在分析客户信息，预计需要1-2分钟
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 生成失败提示 */}
              {preparationStatus === 'failed' && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <p className="font-medium text-red-800">自动生成失败</p>
                        <p className="text-sm text-red-600">{preparationError || '请使用下方按钮手动生成'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 分析报告卡片 */}
              <InsightReportCard
                report={insightReport}
                reportVersion={insightReportVersion}
                isLoading={insightLoading}
                isLoadingQuestions={coreQuestionsLoading}
                onRegenerate={handleOpenRegenerateDialog}
                onGenerateQuestions={handleGenerateCoreQuestions}
                reports={reportList}
                currentReportId={currentReportId}
                onReportChange={handleReportChange}
                onOpenHistory={() => setReportHistoryOpen(true)}
              />

              {/* 遗漏提醒 */}
              {missingQuestions.length > 0 && (
                <OutlineGapAlert
                  missingQuestions={missingQuestions}
                  overallCoverage={overallCoverage}
                  recommendations={recommendations}
                  onAddQuestion={handleAddMissingQuestion}
                  onAddAll={handleAddAllMissing}
                  isLoading={gapLoading}
                  onDismiss={() => setMissingQuestions([])}
                />
              )}

              {/* 提纲列表 - 使用滚轮模式组件 */}
              <OutlineSection
                outlines={outlines}
                onEdit={(outline) => {
                  setEditingOutline(outline);
                  setOutlineFormData({
                    question: outline.question,
                    priority: outline.priority,
                    notes: outline.notes || '',
                  });
                  setOutlineDialogOpen(true);
                }}
                onDelete={handleDeleteOutline}
                onClearAll={handleClearAllOutlines}
                onStatusChange={handleOutlineStatusChange}
                onAddQuestion={() => {
                  setEditingOutline(null);
                  setOutlineFormData({
                    question: '',
                    priority: 3,
                    notes: '',
                  });
                  setOutlineDialogOpen(true);
                }}
              />
            </div>
          </TabsContent>

          {/* 访谈记录 */}
          <TabsContent value="records" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>访谈记录</CardTitle>
                    <CardDescription>记录访谈过程中的关键信息</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingRecord(null);
                      setRecordFormData({
                        content: '',
                        type: 'note',
                        isHighlight: false,
                      });
                      setRecordDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加记录
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      暂无访谈记录
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {records.map((record) => (
                      <div
                        key={record.id}
                        className={`p-4 rounded-lg border ${
                          record.isHighlight
                            ? 'bg-yellow-50 border-yellow-200'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {
                                  RECORD_TYPE_OPTIONS.find(
                                    (t) => t.value === record.type
                                  )?.label
                                }
                              </Badge>
                              {record.isHighlight && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {record.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(record.createdAt).toLocaleString(
                                'zh-CN'
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleHighlight(record)}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  record.isHighlight
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : ''
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRecord(record);
                                setRecordFormData({
                                  content: record.content,
                                  type: record.type,
                                  isHighlight: record.isHighlight,
                                });
                                setRecordDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 提纲对话框 */}
        <Dialog open={outlineDialogOpen} onOpenChange={setOutlineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOutline ? '编辑问题' : '添加问题'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>问题内容</Label>
                <Textarea
                  value={outlineFormData.question}
                  onChange={(e) =>
                    setOutlineFormData((prev) => ({
                      ...prev,
                      question: e.target.value,
                    }))
                  }
                  placeholder="请输入问题内容..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>优先级 (1-5，1最高)</Label>
                <Select
                  value={String(outlineFormData.priority)}
                  onValueChange={(value) =>
                    setOutlineFormData((prev) => ({
                      ...prev,
                      priority: Number(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        P{p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Input
                  value={outlineFormData.notes}
                  onChange={(e) =>
                    setOutlineFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="可选备注"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOutlineDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={
                  editingOutline ? handleUpdateOutline : handleAddOutline
                }
              >
                {editingOutline ? '更新' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 记录对话框 */}
        <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? '编辑记录' : '添加记录'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>记录类型</Label>
                <Select
                  value={recordFormData.type}
                  onValueChange={(value) =>
                    setRecordFormData((prev) => ({
                      ...prev,
                      type: value as RecordType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>记录内容</Label>
                <Textarea
                  value={recordFormData.content}
                  onChange={(e) =>
                    setRecordFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="请输入记录内容..."
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="highlight"
                  checked={recordFormData.isHighlight}
                  onChange={(e) =>
                    setRecordFormData((prev) => ({
                      ...prev,
                      isHighlight: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <Label htmlFor="highlight">标记为重点</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRecordDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={editingRecord ? handleUpdateRecord : handleAddRecord}
              >
                {editingRecord ? '更新' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI 提纲选择对话框 */}
        <Dialog
          open={aiOutlineDialogOpen}
          onOpenChange={setAiOutlineDialogOpen}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>AI 生成的访谈提纲</DialogTitle>
              <DialogDescription>选择要添加到访谈中的问题</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
              {aiQuestions.map((question, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`ai-q-${index}`}
                    defaultChecked
                    className="mt-1 rounded"
                  />
                  <label htmlFor={`ai-q-${index}`} className="text-sm">
                    {question}
                  </label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAiOutlineDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  const selected = aiQuestions.filter((_, index) => {
                    const checkbox = document.getElementById(
                      `ai-q-${index}`
                    ) as HTMLInputElement;
                    return checkbox?.checked;
                  });
                  handleAddAiQuestions(selected);
                }}
              >
                添加选中
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 核心问题选择对话框 - 提纲生成优化 */}
        <CoreQuestionsDialog
          open={coreQuestionsDialogOpen}
          onOpenChange={setCoreQuestionsDialogOpen}
          coreQuestions={coreQuestions}
          supplementaryQuestions={supplementaryQuestions}
          isLoading={coreQuestionsLoading}
          onConfirm={handleConfirmQuestions}
        />

        {/* 删除确认对话框 */}
        {deleteDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[400px]">
              <CardContent className="pt-6">
                <p className="text-center mb-4">
                  确定要删除此访谈项目吗？此操作无法撤销，关联的提纲和记录也将被删除。
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
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

        {/* 报告历史弹窗 */}
        <InsightReportHistoryDialog
          open={reportHistoryOpen}
          onOpenChange={setReportHistoryOpen}
          reports={reportList}
          isLoading={false}
          currentReportId={currentReportId}
          onViewReport={handleReportChange}
          onDeleteReport={handleDeleteReport}
        />

        {/* 重新生成报告对话框 */}
        <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>重新生成报告</DialogTitle>
              <DialogDescription>
                请选择生成方式：
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">报告版本</p>
                <div className="grid grid-cols-1 gap-3">
                  <div
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      reportGenerationVersion === 'v1'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    )}
                    onClick={() => setReportGenerationVersion('v1')}
                  >
                    <input
                      type="radio"
                      name="reportGenerationVersion"
                      value="v1"
                      checked={reportGenerationVersion === 'v1'}
                      onChange={() => setReportGenerationVersion('v1')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">经典版 V1</p>
                      <p className="text-sm text-muted-foreground">
                        输出业务场景分析、痛点假设、访谈策略
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      reportGenerationVersion === 'v2'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    )}
                    onClick={() => setReportGenerationVersion('v2')}
                  >
                    <input
                      type="radio"
                      name="reportGenerationVersion"
                      value="v2"
                      checked={reportGenerationVersion === 'v2'}
                      onChange={() => setReportGenerationVersion('v2')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">准备卡 V2</p>
                      <p className="text-sm text-muted-foreground">
                        输出访谈目标、澄清重点、风险和切入方式
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    regenerateOption === 'overwrite'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  )}
                  onClick={() => setRegenerateOption('overwrite')}
                >
                  <input
                    type="radio"
                    name="regenerateOption"
                    value="overwrite"
                    checked={regenerateOption === 'overwrite'}
                    onChange={() => setRegenerateOption('overwrite')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">覆盖最新报告</p>
                    <p className="text-sm text-muted-foreground">
                      替换当前版本，保留历史版本
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    regenerateOption === 'new'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  )}
                  onClick={() => setRegenerateOption('new')}
                >
                  <input
                    type="radio"
                    name="regenerateOption"
                    value="new"
                    checked={regenerateOption === 'new'}
                    onChange={() => setRegenerateOption('new')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">创建新版本</p>
                    <p className="text-sm text-muted-foreground">
                      保留所有现有版本，生成新报告
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRegenerateDialogOpen(false)}
              >
                取消
              </Button>
              <Button onClick={handleConfirmRegenerate} disabled={insightLoading}>
                {insightLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '确认生成'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
