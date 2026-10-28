'use client';

import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Loader2,
  Mic,
  Pause,
  Play,
  Square,
  Save,
  Circle,
  CheckCircle,
  SkipForward,
  GripVertical,
  Lightbulb,
  User,
  Target,
  AlertTriangle,
  ChevronRight,
  X,
  Plus,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  useInterviewStore,
  useInterviewRealtimeStore,
  FollowUpQuestion,
} from '@/stores/features/interview-assistant-store';
import { useTranscription } from '@/hooks/use-transcription';
import { useAutoSaveTranscript } from '@/hooks/use-auto-save-transcript';
import { TranscriptionPanel } from '@/components/features/interview/transcription-panel';
import { StageSummaryCard, StageSummaryData } from '@/components/features/interview/stage-summary-card';
import { PainPointSignalPanel } from '@/components/features/interview/pain-point-signal-panel';
import { QualityCheckPanel } from '@/components/features/interview/quality-check-panel';
import { FollowUpChainPanel } from '@/components/features/interview/follow-up-chain-panel';
import { KANOCategorizationPanel } from '@/components/features/interview/kano-categorization-panel';
import type { OutlineStatus } from '@/lib/api/interview-assistant/types';
import type { QualityCheckContext } from '@/lib/constants/quality-check';
import { aiApi, stageSummaryApi } from '@/lib/api/interview-assistant/api';
import { apiInstance } from '@/lib/apiCreator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 提纲状态背景色
const OUTLINE_STATUS_BG: Record<OutlineStatus, string> = {
  pending: 'bg-gray-50 hover:bg-gray-100',
  asked: 'bg-green-50 hover:bg-green-100',
  skipped: 'bg-yellow-50 hover:bg-yellow-100',
};

// AI追问优先级颜色
const PRIORITY_COLORS: Record<FollowUpQuestion['priority'], string> = {
  high: 'text-red-500 bg-red-50',
  medium: 'text-yellow-500 bg-yellow-50',
  low: 'text-blue-500 bg-blue-50',
};

// 内容组件
function InterviewConductContent() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  // Store
  const {
    currentInterview,
    outlines,
    loading,
    fetchInterview,
    updateOutline,
    createOutline,
    createRecord,
    updateInterviewStatus,
  } = useInterviewStore();

  const {
    currentTranscript,
    interviewStatus,
    followUpQuestions,
    totalRecordingTime,
    currentOutlineId,
    sessionId,
    setTranscript,
    startInterview,
    pauseInterview,
    resumeInterview,
    endInterview,
    setFollowUpQuestions,
    updateRecordingTime,
    setCurrentOutlineId,
    startSession,
    endSession,
    loadCurrentSession,
    resetInterview,
    initializeInterviewState,
  } = useInterviewRealtimeStore();

  // 状态
  const [saving, setSaving] = useState(false);
  const [draggedOutline, setDraggedOutline] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState({
    left: false,
    right: false,
  });

  // 转写历史
  const [transcriptHistory, setTranscriptHistory] = useState<
    Array<{
      id: string;
      text: string;
      timestamp: Date;
      isHighlighted?: boolean;
    }>
  >([]);

  // 高亮标记
  const [highlights, setHighlights] = useState<
    Array<{ id: string; text: string; timestamp: Date }>
  >([]);

  // 客户洞察
  const [customerInsights, setCustomerInsights] = useState<{
    painPoints: string[];
    requirements: string[];
  }>({ painPoints: [], requirements: [] });

  // AI生成追问loading
  const [generatingFollowUps, setGeneratingFollowUps] = useState(false);

  // 动态添加问题
  const [newQuestion, setNewQuestion] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);

  // 阶段总结
  const [stageSummary, setStageSummary] = useState<StageSummaryData | null>(null);
  const [generatingStageSummary, setGeneratingStageSummary] = useState(false);
  const [stageSummaryUpdatedAt, setStageSummaryUpdatedAt] = useState<Date | null>(null);

  // ==========================================
  // AI 追问自动触发（阶段三新增）
  // ==========================================
  // 追问自动触发阈值（比核心问题识别更宽松）
  const FOLLOW_UP_THRESHOLD = 3; // 新增转写条数阈值
  const FOLLOW_UP_INTERVAL = 60000; // 时间间隔（毫秒）- 60秒
  const FOLLOW_UP_MIN_TRANSCRIPT_LENGTH = 50; // 最小转写内容长度

  // 追问触发追踪
  const lastFollowUpCountRef = useRef(0); // 上次生成追问时的转写条数
  const lastFollowUpContentRef = useRef('');
  const lastFollowUpTimeRef = useRef<Date | null>(null); // 上次生成追问时间
  const followUpTimerRef = useRef<NodeJS.Timeout | null>(null); // 追问生成定时器

  // ==========================================
  // 阶段总结自动触发
  // ==========================================
  // 阶段总结自动触发阈值（比追问更宽松，确保有足够内容）
  const STAGE_SUMMARY_THRESHOLD = 5; // 转写条数阈值
  const STAGE_SUMMARY_INTERVAL = 60000; // 时间间隔（毫秒）- 60秒
  const STAGE_SUMMARY_MIN_TRANSCRIPT_LENGTH = 100; // 最小转写内容长度

  // 阶段总结触发追踪
  const lastStageSummaryCountRef = useRef(0); // 上次生成阶段总结时的转写条数
  const lastStageSummaryContentRef = useRef('');
  const lastStageSummaryTimeRef = useRef<Date | null>(null); // 上次生成阶段总结时间
  const stageSummaryTimerRef = useRef<NodeJS.Timeout | null>(null); // 阶段总结定时器

  // 质量检查上下文
  const qualityCheckContext: QualityCheckContext = useMemo(() => ({
    transcriptText: transcriptHistory.map((h) => h.text).join('\n') + '\n' + currentTranscript,
    outlines: outlines.map((o) => ({ question: o.question, status: o.status })),
    followUpHistory: followUpQuestions.map((q) => ({ question: q.question })),
    painPoints: customerInsights.painPoints,
    requirements: customerInsights.requirements,
    quantitativeData: [],
  }), [transcriptHistory, currentTranscript, outlines, followUpQuestions, customerInsights]);

  // 录音时长计时器
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 自动保存转写
  const {
    isSaving: isAutoSaving,
    history: savedTranscripts,
    isLoadingHistory,
    saveTranscript,
    loadHistory,
  } = useAutoSaveTranscript({
    interviewId,
    sessionId, // 传入当前会话ID
    enabled: interviewStatus !== 'idle',
    onSaveSuccess: (item) => {
      console.log('[AutoSave] 转写已保存:', item.id);
    },
    onSaveError: (error) => {
      console.error('[AutoSave] 保存失败:', error);
    },
  });

  // 统一转写 Hook（使用 Web Speech API）
  const {
    transcript,
    isListening,
    isSupported,
    error: speechError,
    start,
    stop,
    pause,
    resume,
    reset,
  } = useTranscription({
    language: 'zh-CN',
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      setTranscript(text);
      if (isFinal) {
        // 保存到历史记录
        setTranscriptHistory((prev) => [
          ...prev,
          { id: Date.now().toString(), text, timestamp: new Date() },
        ]);
        // 自动保存到数据库，关联当前提纲问题和会话ID
        if (interviewStatus === 'recording') {
          saveTranscript(text, {
            outlineId: currentOutlineId || undefined,
            sessionId: sessionId || undefined, // 修复：传入sessionId
          });
        }
      }
    },
  });

  // 加载数据
  useEffect(() => {
    if (interviewId) {
      initializeInterviewState(interviewId);
      fetchInterview(interviewId);
      // 加载当前进行中的会话（阶段三新增）
      loadCurrentSession(interviewId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  // 加载最新的阶段总结（页面刷新后恢复）
  useEffect(() => {
    const loadStageSummary = async () => {
      if (!interviewId) return;
      try {
        const result = await stageSummaryApi.getLatest(interviewId);
        if (result.success && result.data && result.data.length > 0) {
          const latest = result.data[0];
          setStageSummary({
            summary: '', // summary 字段不在数据库中存储，从其他字段推断
            keyFindings: latest.keyFindings || [],
            painPoints: latest.painPoints || [],
            requirements: latest.requirements || [],
            suggestions: latest.suggestions || [],
          });
          setStageSummaryUpdatedAt(new Date(latest.createdAt));
          console.log('[StageSummary] 已恢复最新阶段总结');
        }
      } catch (error) {
        console.error('[StageSummary] 加载阶段总结失败:', error);
      }
    };
    loadStageSummary();
  }, [interviewId]);

  // 移除严格的状态同步逻辑，改为宽松策略：
  // - 点击开始访谈后，本地状态立即变为 recording，按钮正常显示
  // - 只有访谈真正完成（数据库状态 completed）时才重置本地状态
  useEffect(() => {
    if (currentInterview && currentInterview.status === 'completed' && interviewStatus !== 'completed') {
      // 访谈已在数据库中标记完成，同步本地状态
      console.log('[FollowUp] 访谈已完成，同步本地状态');
      endInterview();
    }
  }, [currentInterview, interviewStatus, endInterview]);

  // 断点续传：从数据库恢复历史转写
  // 修复：始终同步数据库记录到本地状态，使用 ID 去重
  useEffect(() => {
    if (savedTranscripts.length > 0) {
      // 使用 Set 进行 ID 去重，避免重复记录
      const existingIds = new Set(transcriptHistory.map((h) => h.id));
      const newItems = savedTranscripts
        .filter((item) => !existingIds.has(item.id))
        .map((item) => ({
          id: item.id,
          text: item.content,
          timestamp: new Date(item.createdAt),
        }));

      if (newItems.length > 0) {
        setTranscriptHistory((prev) => [...prev, ...newItems]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTranscripts]);

  // 开始录音时启动计时器
  useEffect(() => {
    if (isListening && interviewStatus === 'recording') {
      recordingTimerRef.current = setInterval(() => {
        updateRecordingTime(totalRecordingTime + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, interviewStatus]);

  // 开始访谈
  // 简化逻辑：点击按钮 → 本地状态立即变为 recording → 按钮显示
  // 数据库状态更新在后台异步进行，不影响用户界面
  const handleStartInterview = useCallback(async () => {
    console.log('[Interview] handleStartInterview 被调用, 当前状态:', interviewStatus);

    // 1️⃣ 立即更新本地状态为 recording（按钮立即显示）
    startInterview();
    start();
    console.log('[Interview] 本地状态已变为 recording');

    // 2️⃣ 异步更新数据库状态（不阻塞用户界面）
    const currentStatus = currentInterview?.status;
    console.log('[Interview] 当前数据库状态:', currentStatus);

    try {
      // 启动新会话
      const newSessionId = await startSession(interviewId);
      console.log('[Interview] Session started:', newSessionId);

      // 更新数据库状态
      if (currentStatus === 'draft') {
        await updateInterviewStatus(interviewId, 'prepared');
        await updateInterviewStatus(interviewId, 'in_progress');
      } else if (currentStatus === 'prepared') {
        await updateInterviewStatus(interviewId, 'in_progress');
      }
    } catch (error) {
      console.error('[Interview] 后台更新失败:', error);
      // 数据库更新失败不影响用户界面，继续录音
    }
  }, [interviewId, startInterview, start, updateInterviewStatus, startSession, interviewStatus, currentInterview]);

  // 暂停访谈
  const handlePauseInterview = useCallback(() => {
    pauseInterview();
    pause();
  }, [pauseInterview, pause]);

  // 恢复访谈
  const handleResumeInterview = useCallback(() => {
    resumeInterview();
    resume();
  }, [resumeInterview, resume]);

  // 结束访谈
  const handleEndInterview = useCallback(async () => {
    stop();
    endInterview();

    // 结束当前会话（阶段三新增）
    try {
      await endSession(interviewId);
      console.log('[Interview] Session ended');
    } catch (error) {
      console.error('[Interview] Failed to end session:', error);
      // 继续完成访谈流程
    }

    await updateInterviewStatus(interviewId, 'completed');

    // 触发后台自动生成（PRD、画像、旅程图、纪要）
    // 不阻塞用户离开，在后台运行
    apiInstance
      .post(`/interviews/${interviewId}/auto-generate`)
      .then((response) => {
        const data = response.data;
        if (data.success) {
          console.log('[AutoGenerate] Started:', data.stats);
        } else {
          console.error('[AutoGenerate] Failed:', data.error);
        }
      })
      .catch((err) => {
        console.error('[AutoGenerate] Request failed:', err);
      });

    // 清理追问生成定时器
    if (followUpTimerRef.current) {
      clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }

    // 清理阶段总结定时器
    if (stageSummaryTimerRef.current) {
      clearTimeout(stageSummaryTimerRef.current);
      stageSummaryTimerRef.current = null;
    }
  }, [stop, endInterview, interviewId, updateInterviewStatus, endSession]);

  // 保存并退出
  const handleSaveAndExit = useCallback(async () => {
    setSaving(true);
    try {
      // 保存转写记录
      if (transcriptHistory.length > 0) {
        for (const item of transcriptHistory) {
          await createRecord(interviewId, {
            content: item.text,
            type: 'note',
            isHighlighted: item.isHighlighted || false,
          });
        }
      }

      // 保存高亮记录
      for (const highlight of highlights) {
        await createRecord(interviewId, {
          content: highlight.text,
          type: 'note',
          isHighlight: true,
        });
      }

      // 保存客户洞察
      for (const point of customerInsights.painPoints) {
        await createRecord(interviewId, {
          content: point,
          type: 'pain_point',
          isHighlight: true,
        });
      }
      for (const req of customerInsights.requirements) {
        await createRecord(interviewId, {
          content: req,
          type: 'requirement',
          isHighlight: true,
        });
      }

      router.push(`/dashboard/interviews/${interviewId}`);
    } catch (error) {
      console.error('Failed to save interview:', error);
    } finally {
      setSaving(false);
    }
  }, [
    interviewId,
    transcriptHistory,
    highlights,
    customerInsights,
    createRecord,
    router,
  ]);

  // 标记提纲状态
  const handleOutlineStatusChange = useCallback(
    async (outlineId: string, status: OutlineStatus) => {
      await updateOutline(interviewId, outlineId, { status });
    },
    [interviewId, updateOutline]
  );

  // 拖拽排序
  const handleDragStart = useCallback((outlineId: string) => {
    setDraggedOutline(outlineId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedOutline(null);
  }, []);

  // 高亮处理
  const handleHighlight = useCallback((text: string, timestamp: Date) => {
    setHighlights((prev) => [
      ...prev,
      { id: Date.now().toString(), text, timestamp },
    ]);
  }, []);

  // 清空转写
  const handleClearTranscript = useCallback(() => {
    reset();
    setTranscript('');
  }, [reset, setTranscript]);

  // 生成AI追问
  const handleGenerateFollowUps = useCallback(async (isAutoTrigger: boolean = false) => {
    // 检查访谈数据
    if (!currentInterview) {
      if (!isAutoTrigger) toast.error('访谈数据加载中，请稍候');
      return;
    }

    // 检查是否有足够的转写内容（核心条件）
    const hasTranscriptContent = transcriptHistory.length > 0 || transcript.length >= FOLLOW_UP_MIN_TRANSCRIPT_LENGTH;
    if (!hasTranscriptContent) {
      if (!isAutoTrigger) toast.error('请先进行对话，有了转写内容后再生成追问');
      return;
    }

    // 如果是自动触发，额外检查当前转写内容长度
    if (isAutoTrigger) {
      const recentTranscripts = transcriptHistory.slice(-3);
      const totalLength = recentTranscripts.reduce((sum, t) => sum + t.text.length, 0);
      if (totalLength < FOLLOW_UP_MIN_TRANSCRIPT_LENGTH && transcript.length < FOLLOW_UP_MIN_TRANSCRIPT_LENGTH) {
        console.log('[FollowUp] 转写内容不足，跳过自动生成');
        return;
      }
    }

    setGeneratingFollowUps(true);
    try {
      // 计算提纲进度（可选）
      const outlineProgress = outlines.length > 0 ? {
        total: outlines.length,
        asked: outlines.filter((o) => o.status === 'asked').length,
        pending: outlines.filter((o) => o.status === 'pending').length,
        currentOutlineId: outlines.find((o) => o.status === 'pending')?.id,
      } : undefined;

      // 获取当前问题（可选，优先使用 pending 状态的问题）
      const currentOutline = outlines.find((o) => o.status === 'pending');

      // 获取最近的转写内容作为客户回答
      const recentTranscriptText = transcriptHistory
        .slice(-5)
        .map(t => t.text)
        .join('\n');

      const result = await aiApi.generateFollowUp({
        interviewId,
        currentQuestion: currentOutline?.question, // 可选，可能为 undefined
        customerResponse: transcript || recentTranscriptText,
        // 传入完整上下文
        transcriptHistory: transcriptHistory.map((item) => ({
          id: item.id,
          text: item.text,
          timestamp: item.timestamp?.toISOString(),
        })),
        outlineProgress,
      });

      // 每次最多推荐2个问题
      const newFollowUps: FollowUpQuestion[] = result.data.questions.slice(0, 2).map(
        (q, index) => ({
          id: `followup-${Date.now()}-${index}`,
          question: q,
          priority: index === 0 ? 'high' : 'medium',
          asked: false,
          timestamp: new Date(),
        })
      );

      setFollowUpQuestions([...followUpQuestions, ...newFollowUps]);

      // 🔧 自动保存追问到数据库
      for (const followUp of newFollowUps) {
        try {
          await createRecord(interviewId, {
            content: `[AI追问][${followUp.priority === 'high' ? '高优先级' : followUp.priority === 'medium' ? '中优先级' : '低优先级'}] ${followUp.question}`,
            type: 'note',
            isHighlight: false,
          });
          console.log('[FollowUp] 已保存追问到数据库:', followUp.question);
        } catch (saveError) {
          console.error('[FollowUp] 保存追问失败:', saveError);
        }
      }

      // 更新追踪状态（用于自动触发）
      lastFollowUpCountRef.current = transcriptHistory.length;
      lastFollowUpContentRef.current = [
        ...transcriptHistory.slice(-5).map((item) => `${item.id}:${item.text}`),
        transcript,
      ].join('|');
      lastFollowUpTimeRef.current = new Date();

      console.log(`[FollowUp] ${isAutoTrigger ? '自动' : '手动'}生成了 ${newFollowUps.length} 个追问`);
    } catch (error) {
      console.error('Failed to generate follow-ups:', error);
    } finally {
      setGeneratingFollowUps(false);
    }
  }, [
    currentInterview,
    outlines,
    transcript,
    transcriptHistory,
    interviewId,
    followUpQuestions,
    setFollowUpQuestions,
    createRecord,
    FOLLOW_UP_MIN_TRANSCRIPT_LENGTH,
  ]);

  /**
   * 检查是否应该自动触发追问生成（混合触发条件）
   */
  const shouldTriggerFollowUp = useCallback(() => {
    // 条件1: 录音状态为 recording
    if (interviewStatus !== 'recording') {
      console.log('[FollowUp] 跳过: 访谈状态不是 recording, 当前状态:', interviewStatus);
      return false;
    }

    // 条件2: 有足够的转写内容（历史记录 或 当前实时转写）- 核心条件
    const hasEnoughContent = transcriptHistory.length >= FOLLOW_UP_THRESHOLD ||
      (transcript.length >= FOLLOW_UP_MIN_TRANSCRIPT_LENGTH && transcriptHistory.length >= 1);
    if (!hasEnoughContent) {
      console.log('[FollowUp] 跳过: 转写内容不足, history:', transcriptHistory.length, 'transcript:', transcript.length);
      return false;
    }

    const contentSignature = [
      ...transcriptHistory.slice(-5).map((item) => `${item.id}:${item.text}`),
      transcript,
    ].join('|');
    if (contentSignature === lastFollowUpContentRef.current) {
      return false;
    }

    // 条件3: 距上次生成 >= 时间间隔
    if (lastFollowUpTimeRef.current) {
      const timeSinceLastGenerate = Date.now() - lastFollowUpTimeRef.current.getTime();
      if (timeSinceLastGenerate < FOLLOW_UP_INTERVAL) {
        console.log('[FollowUp] 跳过: 时间间隔不足, 距上次:', Math.round(timeSinceLastGenerate / 1000), '秒');
        return false;
      }
    }

    // 条件4: 没有正在生成追问
    if (generatingFollowUps) {
      console.log('[FollowUp] 跳过: 正在生成追问中');
      return false;
    }

    console.log('[FollowUp] ✅ 满足自动触发条件');
    return true;
  }, [
    interviewStatus,
    transcriptHistory.length,
    transcript,
    generatingFollowUps,
    FOLLOW_UP_THRESHOLD,
    FOLLOW_UP_INTERVAL,
    FOLLOW_UP_MIN_TRANSCRIPT_LENGTH,
  ]);

  // ==========================================
  // 阶段总结自动触发
  // ==========================================

  /**
   * 检查是否应该自动触发阶段总结
   */
  const shouldTriggerStageSummary = useCallback(() => {
    // 条件1: 录音状态为 recording
    if (interviewStatus !== 'recording') {
      return false;
    }

    // 条件2: 有足够的转写内容
    const hasEnoughContent = transcriptHistory.length >= STAGE_SUMMARY_THRESHOLD ||
      (transcript.length >= STAGE_SUMMARY_MIN_TRANSCRIPT_LENGTH && transcriptHistory.length >= 3);
    if (!hasEnoughContent) {
      return false;
    }

    const contentSignature = transcriptHistory
      .map((item) => `${item.id}:${item.text}`)
      .join('|');
    if (contentSignature === lastStageSummaryContentRef.current) {
      return false;
    }

    // 条件3: 距上次生成 >= 时间间隔
    if (lastStageSummaryTimeRef.current) {
      const timeSinceLastGenerate = Date.now() - lastStageSummaryTimeRef.current.getTime();
      if (timeSinceLastGenerate < STAGE_SUMMARY_INTERVAL) {
        return false;
      }
    }

    // 条件4: 没有正在生成中
    if (generatingStageSummary) {
      return false;
    }

    return true;
  }, [
    interviewStatus,
    transcriptHistory.length,
    transcript,
    generatingStageSummary,
    STAGE_SUMMARY_THRESHOLD,
    STAGE_SUMMARY_INTERVAL,
    STAGE_SUMMARY_MIN_TRANSCRIPT_LENGTH,
  ]);

  // 生成阶段总结
  const handleGenerateStageSummary = useCallback(async (isAutoTrigger: boolean = false) => {
    // 检查转写内容
    if (transcriptHistory.length === 0) {
      if (!isAutoTrigger) toast.error('暂无访谈内容');
      return;
    }

    setGeneratingStageSummary(true);
    try {
      const result = await aiApi.generateStageSummary({
        interviewId,
        currentTranscripts: transcriptHistory.map((item) => ({
          text: item.text,
          timestamp: item.timestamp?.toISOString(),
        })),
      });

      const summaryData = result.data as StageSummaryData;
      setStageSummary(summaryData);
      setStageSummaryUpdatedAt(new Date());

      // 🔧 保存阶段总结到专用表（结构化存储）
      try {
        await stageSummaryApi.save(interviewId, {
          sessionId: sessionId || undefined,
          keyFindings: summaryData.keyFindings,
          painPoints: summaryData.painPoints,
          requirements: summaryData.requirements,
          suggestions: summaryData.suggestions,
        });
        console.log('[StageSummary] 已保存阶段总结到专用表');
      } catch (saveError) {
        console.error('[StageSummary] 保存阶段总结失败:', saveError);
      }

      // 自动同步痛点和需求到洞察提取部分（去重）
      if (summaryData.painPoints?.length > 0 || summaryData.requirements?.length > 0) {
        setCustomerInsights((prev) => {
          // 去重：过滤掉已有的痛点
          const newPainPoints = summaryData.painPoints?.filter(
            (point: string) => !prev.painPoints.includes(point)
          ) || [];

          // 去重：过滤掉已有的需求
          const newRequirements = summaryData.requirements?.filter(
            (req: string) => !prev.requirements.includes(req)
          ) || [];

          return {
            painPoints: [...prev.painPoints, ...newPainPoints],
            requirements: [...prev.requirements, ...newRequirements],
          };
        });

        const addedCount = (summaryData.painPoints?.length || 0) + (summaryData.requirements?.length || 0);
        console.log(`[StageSummary] 自动同步 ${addedCount} 条洞察到洞察提取部分`);
      }

      // 更新追踪状态
      lastStageSummaryCountRef.current = transcriptHistory.length;
      lastStageSummaryContentRef.current = transcriptHistory
        .map((item) => `${item.id}:${item.text}`)
        .join('|');
      lastStageSummaryTimeRef.current = new Date();

      console.log(`[StageSummary] ${isAutoTrigger ? '自动' : '手动'}生成完成`);
    } catch (error) {
      console.error('Failed to generate stage summary:', error);
    } finally {
      setGeneratingStageSummary(false);
    }
  }, [interviewId, transcriptHistory, sessionId]);

  // 自动触发 AI 追问生成（混合触发）
  useEffect(() => {
    console.log('[FollowUp] useEffect 触发, shouldTriggerFollowUp:', shouldTriggerFollowUp());

    if (!shouldTriggerFollowUp()) {
      return;
    }

    console.log('[FollowUp] 设置 2 秒延迟定时器...');

    // 清除之前的定时器
    if (followUpTimerRef.current) {
      clearTimeout(followUpTimerRef.current);
    }

    // 延迟 2 秒后触发，让AI识别优先执行
    followUpTimerRef.current = setTimeout(() => {
      console.log('[FollowUp] 定时器执行, shouldTriggerFollowUp:', shouldTriggerFollowUp());
      if (shouldTriggerFollowUp()) {
        console.log('[FollowUp] 开始自动生成追问...');
        handleGenerateFollowUps(true); // true 表示自动触发
      }
    }, 2000);

    return () => {
      if (followUpTimerRef.current) {
        clearTimeout(followUpTimerRef.current);
      }
    };
  }, [shouldTriggerFollowUp, handleGenerateFollowUps]);

  // 自动触发阶段总结
  useEffect(() => {
    if (!shouldTriggerStageSummary()) {
      return;
    }

    // 清除之前的定时器
    if (stageSummaryTimerRef.current) {
      clearTimeout(stageSummaryTimerRef.current);
    }

    // 延迟 3 秒后触发，让追问和AI识别优先执行
    stageSummaryTimerRef.current = setTimeout(() => {
      if (shouldTriggerStageSummary()) {
        handleGenerateStageSummary(true); // true 表示自动触发
      }
    }, 3000);

    return () => {
      if (stageSummaryTimerRef.current) {
        clearTimeout(stageSummaryTimerRef.current);
      }
    };
  }, [shouldTriggerStageSummary, handleGenerateStageSummary]);

  // 清理所有 AI 定时器
  useEffect(() => {
    return () => {
      if (followUpTimerRef.current) {
        clearTimeout(followUpTimerRef.current);
      }
      if (stageSummaryTimerRef.current) {
        clearTimeout(stageSummaryTimerRef.current);
      }
    };
  }, []);

  // 采纳追问
  const handleAdoptFollowUp = useCallback(
    (followUp: FollowUpQuestion) => {
      // 标记为已问
      const updatedQuestions = followUpQuestions.map((q) =>
        q.id === followUp.id ? { ...q, asked: true } : q
      );
      setFollowUpQuestions(updatedQuestions);

      // 添加到转写文本
      setTranscript(`${currentTranscript}\n\n[追问] ${followUp.question}`);
    },
    [followUpQuestions, currentTranscript, setFollowUpQuestions, setTranscript]
  );

  // 添加客户洞察
  const handleAddInsight = useCallback((type: 'painPoint' | 'requirement') => {
    const value = prompt(type === 'painPoint' ? '输入痛点：' : '输入需求：');
    if (value?.trim()) {
      if (type === 'painPoint') {
        setCustomerInsights((prev) => ({
          ...prev,
          painPoints: [...prev.painPoints, value.trim()],
        }));
      } else {
        setCustomerInsights((prev) => ({
          ...prev,
          requirements: [...prev.requirements, value.trim()],
        }));
      }
    }
  }, []);

  // 动态添加问题到提纲
  const handleAddDynamicQuestion = useCallback(async () => {
    if (!newQuestion.trim() || addingQuestion) return;

    setAddingQuestion(true);
    try {
      const outline = await createOutline(interviewId, {
        question: newQuestion.trim(),
        priority: 1,
        status: 'pending',
        order: outlines.length,
      });
      // 自动设置新问题为当前讨论的问题
      setCurrentOutlineId(outline.id);
      setNewQuestion('');
    } catch (error) {
      console.error('Failed to add question:', error);
    } finally {
      setAddingQuestion(false);
    }
  }, [
    newQuestion,
    addingQuestion,
    interviewId,
    outlines.length,
    createOutline,
    setCurrentOutlineId,
  ]);

  // 格式化录音时长
  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 计算统计数据
  const outlineStats = useMemo(
    () => ({
      total: outlines.length,
      asked: outlines.filter((o) => o.status === 'asked').length,
      skipped: outlines.filter((o) => o.status === 'skipped').length,
      pending: outlines.filter((o) => o.status === 'pending').length,
    }),
    [outlines]
  );

  if (loading && !currentInterview) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentInterview) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[80vh]">
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

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* 顶部操作栏 */}
        <div className="flex-shrink-0 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/interviews/${interviewId}`)
                }
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
              <div>
                <h1 className="text-lg font-semibold">
                  {currentInterview.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentInterview.customer?.name} -{' '}
                  {currentInterview.customer?.industry}
                </p>
              </div>
            </div>

            {/* 中间：录音状态 */}
            <div className="flex items-center gap-4">
              {interviewStatus === 'recording' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-500">
                    录音中
                  </span>
                  <Badge variant="outline" className="font-mono">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatRecordingTime(totalRecordingTime)}
                  </Badge>
                </div>
              )}
              {interviewStatus === 'paused' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">
                    已暂停
                  </span>
                </div>
              )}
              {interviewStatus === 'idle' && (
                <Badge variant="secondary">准备就绪</Badge>
              )}
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 手动保存按钮（任何状态都可用） */}
              {(interviewStatus === 'recording' || interviewStatus === 'paused') && (
                <Button
                  variant="outline"
                  onClick={handleSaveAndExit}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存记录
                </Button>
              )}
              {interviewStatus === 'idle' && (
                <Button onClick={handleStartInterview} className="gap-2">
                  <Mic className="w-4 h-4" />
                  开始访谈
                </Button>
              )}
              {interviewStatus === 'recording' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handlePauseInterview}
                    className="gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    暂停
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleEndInterview}
                    className="gap-2"
                  >
                    <Square className="w-4 h-4" />
                    结束访谈
                  </Button>
                </>
              )}
              {interviewStatus === 'paused' && (
                <>
                  <Button onClick={handleResumeInterview} className="gap-2">
                    <Play className="w-4 h-4" />
                    继续
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleEndInterview}
                    className="gap-2"
                  >
                    <Square className="w-4 h-4" />
                    结束访谈
                  </Button>
                </>
              )}
              {interviewStatus === 'completed' && (
                <Button
                  onClick={handleSaveAndExit}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存并退出
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 三栏布局 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左栏：访谈提纲 (25%) */}
          <div
            className={cn(
              'border-r transition-all duration-300 flex-shrink-0',
              sidebarCollapsed.left
                ? 'w-12'
                : 'w-1/4 min-w-[280px] max-w-[360px]'
            )}
          >
            {sidebarCollapsed.left ? (
              <div
                className="h-full flex flex-col items-center py-4 cursor-pointer hover:bg-muted/50"
                onClick={() =>
                  setSidebarCollapsed({ ...sidebarCollapsed, left: false })
                }
              >
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-2 writing-mode-vertical">
                  提纲
                </span>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
                  <h2 className="font-semibold">访谈提纲</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSidebarCollapsed({ ...sidebarCollapsed, left: true })
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* 提纲统计 */}
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-muted/30 text-xs">
                  <Badge variant="outline" className="text-xs">
                    {outlineStats.asked}/{outlineStats.total} 已问
                  </Badge>
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    {outlineStats.skipped} 跳过
                  </Badge>
                </div>

                {/* 提纲列表 - 滚轮滑动模式 */}
                <ScrollArea className="flex-1 h-0 scroll-smooth">
                  <div className="p-2 space-y-1">
                    {outlines.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        暂无访谈提纲
                      </div>
                    ) : (
                      outlines.map((outline, index) => (
                        <div
                          key={outline.id}
                          draggable
                          onDragStart={() => handleDragStart(outline.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'group p-3 rounded-lg cursor-pointer transition-colors border',
                            OUTLINE_STATUS_BG[outline.status],
                            draggedOutline === outline.id && 'opacity-50',
                            currentOutlineId === outline.id && 'ring-2 ring-primary ring-offset-1'
                          )}
                          onClick={() => {
                            // 设置当前讨论的提纲问题（双向联动核心）
                            setCurrentOutlineId(outline.id);
                            if (outline.status === 'pending') {
                              handleOutlineStatusChange(outline.id, 'asked');
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-move opacity-0 group-hover:opacity-100" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {index + 1}.
                                </span>
                                {outline.status === 'pending' && (
                                  <Circle className="w-4 h-4 text-gray-400" />
                                )}
                                {outline.status === 'asked' && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {outline.status === 'skipped' && (
                                  <SkipForward className="w-4 h-4 text-yellow-500" />
                                )}
                                <Badge variant="outline" className="text-xs">
                                  P{outline.priority}
                                </Badge>
                              </div>
                              <p className="text-sm line-clamp-2">
                                {outline.question}
                              </p>
                            </div>
                          </div>
                          {outline.status === 'pending' && (
                            <div className="flex gap-1 mt-2 ml-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOutlineStatusChange(
                                    outline.id,
                                    'asked'
                                  );
                                }}
                              >
                                标记已问
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-yellow-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOutlineStatusChange(
                                    outline.id,
                                    'skipped'
                                  );
                                }}
                              >
                                跳过
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {/* 动态添加问题 */}
                    <div className="p-2 border-t mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDynamicQuestion();
                            }
                          }}
                          placeholder="添加新问题..."
                          className="flex-1 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={addingQuestion}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddDynamicQuestion}
                          disabled={!newQuestion.trim() || addingQuestion}
                        >
                          {addingQuestion ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* 中栏：实时转写区 (50%) */}
          <div className="flex-1 min-w-0">
            <TranscriptionPanel
              transcript={currentTranscript}
              isListening={isListening}
              isSupported={isSupported}
              error={speechError}
              onStart={
                interviewStatus === 'idle' ? handleStartInterview : start
              }
              onStop={stop}
              onPause={pause}
              onResume={resume}
              onHighlight={handleHighlight}
              onClear={handleClearTranscript}
              history={transcriptHistory}
              highlights={highlights}
              isPaused={interviewStatus === 'paused'}
              className="h-full rounded-none border-0"
            />
          </div>

          {/* 右栏：AI洞察区 (25%) */}
          <div
            className={cn(
              'border-l transition-all duration-300 flex-shrink-0',
              sidebarCollapsed.right
                ? 'w-12'
                : 'w-1/4 min-w-[280px] max-w-[360px]'
            )}
          >
            {sidebarCollapsed.right ? (
              <div
                className="h-full flex flex-col items-center py-4 cursor-pointer hover:bg-muted/50"
                onClick={() =>
                  setSidebarCollapsed({ ...sidebarCollapsed, right: false })
                }
              >
                <Lightbulb className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-2 writing-mode-vertical">
                  AI洞察
                </span>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
                  <h2 className="font-semibold">AI洞察</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSidebarCollapsed({ ...sidebarCollapsed, right: true })
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* AI洞察内容 - 滚轮滑动模式 */}
                <ScrollArea className="flex-1 h-0 scroll-smooth">
                  <div className="p-3 space-y-3">
                    {/* 痛点信号词检测面板 */}
                    <PainPointSignalPanel
                      text={transcriptHistory.map((h) => h.text).join(' ') + ' ' + currentTranscript}
                      enabled={true}
                      showFollowUps={true}
                      onFollowUpClick={(followUp) => {
                        // 将建议追问添加到输入框或直接采纳
                        toast.success('已复制追问建议');
                      }}
                      compact={false}
                    />

                    {/* 输出质量检查面板 */}
                    <QualityCheckPanel
                      context={qualityCheckContext}
                      enabled={interviewStatus === 'recording' || transcriptHistory.length > 0}
                      compact={false}
                    />

                    {/* 追问链追踪面板 */}
                    <FollowUpChainPanel
                      minimumDepth={3}
                      onAdoptSuggestion={(suggestion) => {
                        // 将追问建议添加到追问列表
                        toast.success('追问建议：' + suggestion);
                      }}
                      compact={false}
                    />

                    {/* KANO 需求分类面板 */}
                    <KANOCategorizationPanel
                      requirements={customerInsights.requirements.map((r, idx) => ({
                        id: `req-${idx}`,
                        description: r,
                      }))}
                      onQuestionClick={(question) => {
                        toast.success('验证问题：' + question);
                      }}
                      compact={false}
                    />

                    {/* AI追问推荐 */}
                    <Card>
                      <CardHeader className="py-3 px-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            AI追问推荐
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleGenerateFollowUps(false)}
                            disabled={
                              generatingFollowUps ||
                              transcriptHistory.length === 0
                            }
                          >
                            {generatingFollowUps ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            生成
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 px-3 pb-3">
                        {followUpQuestions.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {transcriptHistory.length === 0
                              ? '开始对话后，AI将根据内容推荐追问'
                              : '点击生成按钮获取追问建议'}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {followUpQuestions
                              .filter((q) => !q.asked)
                              .slice(0, 5)
                              .map((followUp) => (
                                <div
                                  key={followUp.id}
                                  className="p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer group"
                                  onClick={() => handleAdoptFollowUp(followUp)}
                                >
                                  <div className="flex items-start gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-xs',
                                        PRIORITY_COLORS[followUp.priority]
                                      )}
                                    >
                                      {followUp.priority === 'high'
                                        ? '高'
                                        : followUp.priority === 'medium'
                                          ? '中'
                                          : '低'}
                                    </Badge>
                                    <p className="text-xs flex-1">
                                      {followUp.question}
                                    </p>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 阶段总结卡片 */}
                    <StageSummaryCard
                      data={stageSummary}
                      isLoading={generatingStageSummary}
                      onGenerate={handleGenerateStageSummary}
                      lastUpdatedAt={stageSummaryUpdatedAt}
                      defaultExpanded={false}
                    />

                    {/* 客户信息卡片 */}
                    <Card>
                      <CardHeader className="py-3 px-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          客户信息
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-3 pb-3">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              客户：
                            </span>
                            <span className="font-medium">
                              {currentInterview.customer?.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              行业：
                            </span>
                            <span>{currentInterview.customer?.industry}</span>
                          </div>
                          {currentInterview.customer?.description && (
                            <div>
                              <span className="text-muted-foreground">
                                简介：
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {currentInterview.customer.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 当前痛点/需求提取 */}
                    <Card>
                      <CardHeader className="py-3 px-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="w-4 h-4 text-green-500" />
                          洞察提取
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-3 pb-3 space-y-3">
                        {/* 痛点 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              痛点
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleAddInsight('painPoint')}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          {customerInsights.painPoints.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              点击添加痛点
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {customerInsights.painPoints.map(
                                (point, index) => (
                                  <div
                                    key={index}
                                    className="text-xs p-2 bg-red-50 rounded border border-red-100"
                                  >
                                    {point}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {/* 需求 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              需求
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleAddInsight('requirement')}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          {customerInsights.requirements.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              点击添加需求
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {customerInsights.requirements.map(
                                (req, index) => (
                                  <div
                                    key={index}
                                    className="text-xs p-2 bg-blue-50 rounded border border-blue-100"
                                  >
                                    {req}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 加载中组件
function Loading() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  );
}

// 默认导出包装在 Suspense 中的组件
export default function InterviewConductPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InterviewConductContent />
    </Suspense>
  );
}
