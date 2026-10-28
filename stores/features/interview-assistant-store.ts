/**
 * 客户需求洞察助手 - Zustand Store
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  Customer,
  Interview,
  Outline,
  Record,
  DashboardStats,
  InterviewStatus,
  InterviewTemplate,
} from '@/lib/api/interview-assistant/types';
import {
  customerApi,
  interviewApi,
  outlineApi,
  recordApi,
  dashboardApi,
  templateApi,
  sessionApi,
} from '@/lib/api/interview-assistant/api';

/**
 * 访谈控制状态
 */
export type InterviewControlStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'completed';

/**
 * AI追问信息
 */
export interface FollowUpQuestion {
  id: string;
  question: string;
  priority: 'high' | 'medium' | 'low';
  asked: boolean;
  timestamp: Date;
}

/**
 * 访谈实时状态接口
 */
export interface InterviewRealtimeState {
  /** 当前持久化状态所属的访谈，防止跨项目复用 */
  activeInterviewId: string | null;
  /** 实时转写文本 */
  currentTranscript: string;
  /** 访谈控制状态 */
  interviewStatus: InterviewControlStatus;
  /** AI追问队列 */
  followUpQuestions: FollowUpQuestion[];
  /** 当前追问索引 */
  currentFollowUpIndex: number;
  /** 录音开始时间 */
  recordingStartTime: Date | null;
  /** 累计录音时长（秒） */
  totalRecordingTime: number;
  /** 当前讨论中的提纲问题ID（双向联动核心） */
  currentOutlineId: string | null;

  // ==========================================
  // 会话管理字段（阶段三新增）
  // ==========================================
  /** 当前会话ID */
  sessionId: string | null;
  /** 会话开始时间 */
  sessionStartTime: Date | null;
}

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  fetchCustomers: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    industry?: string;
  }) => Promise<void>;
  fetchCustomer: (id: string) => Promise<void>;
  createCustomer: (data: any) => Promise<Customer>;
  updateCustomer: (id: string, data: any) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  setCurrentCustomer: (customer: Customer | null) => void;
  reset: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  currentCustomer: null,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },

  fetchCustomers: async (params) => {
    set({ loading: true });
    try {
      const response = await customerApi.list(params);
      set({
        customers: response.data.customers,
        pagination: response.data.pagination,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      set({ loading: false });
    }
  },

  fetchCustomer: async (id) => {
    set({ loading: true });
    try {
      const response = await customerApi.get(id);
      set({
        currentCustomer: response.data,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      set({ loading: false });
    }
  },

  createCustomer: async (data) => {
    const response = await customerApi.create(data);
    // Refresh the list
    const { pagination } = get();
    await get().fetchCustomers({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return response.data;
  },

  updateCustomer: async (id, data) => {
    const response = await customerApi.update(id, data);
    // Update current customer if it's the same
    const { currentCustomer } = get();
    if (currentCustomer?.id === id) {
      set({ currentCustomer: response.data });
    }
    return response.data;
  },

  deleteCustomer: async (id) => {
    await customerApi.delete(id);
    // Refresh the list
    const { pagination } = get();
    await get().fetchCustomers({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  },

  setCurrentCustomer: (customer) => set({ currentCustomer: customer }),

  reset: () =>
    set({
      customers: [],
      currentCustomer: null,
      loading: false,
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    }),
}));

interface InterviewState {
  interviews: Interview[];
  currentInterview: Interview | null;
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  outlines: Outline[];
  records: Record[];
  fetchInterviews: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    customerId?: string;
    search?: string;
  }) => Promise<void>;
  fetchInterview: (id: string) => Promise<void>;
  createInterview: (data: any) => Promise<Interview>;
  updateInterview: (id: string, data: any) => Promise<Interview>;
  updateInterviewStatus: (
    id: string,
    status: InterviewStatus
  ) => Promise<Interview>;
  deleteInterview: (id: string) => Promise<void>;
  fetchOutlines: (interviewId: string) => Promise<void>;
  createOutline: (interviewId: string, data: any) => Promise<Outline>;
  updateOutline: (
    interviewId: string,
    outlineId: string,
    data: any
  ) => Promise<Outline>;
  deleteOutline: (interviewId: string, outlineId: string) => Promise<void>;
  clearAllOutlines: (interviewId: string) => Promise<void>;
  fetchRecords: (interviewId: string, params?: any) => Promise<void>;
  createRecord: (interviewId: string, data: any) => Promise<Record>;
  updateRecord: (
    interviewId: string,
    recordId: string,
    data: any
  ) => Promise<Record>;
  deleteRecord: (interviewId: string, recordId: string) => Promise<void>;
  setCurrentInterview: (interview: Interview | null) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  interviews: [],
  currentInterview: null,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  outlines: [],
  records: [],

  fetchInterviews: async (params) => {
    set({ loading: true });
    try {
      const response = await interviewApi.list(params);
      set({
        interviews: response.data.interviews,
        pagination: response.data.pagination,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
      set({ loading: false });
    }
  },

  fetchInterview: async (id) => {
    set({ loading: true });
    try {
      const response = await interviewApi.get(id);
      set({
        currentInterview: response.data,
        outlines: response.data.outlines || [],
        records: response.data.records || [],
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch interview:', error);
      set({ loading: false });
    }
  },

  createInterview: async (data) => {
    const response = await interviewApi.create(data);
    // Refresh the list
    const { pagination } = get();
    await get().fetchInterviews({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return response.data;
  },

  updateInterview: async (id, data) => {
    const response = await interviewApi.update(id, data);
    // Update current interview if it's the same
    const { currentInterview } = get();
    if (currentInterview?.id === id) {
      set({ currentInterview: response.data });
    }
    return response.data;
  },

  updateInterviewStatus: async (id, status) => {
    const response = await interviewApi.updateStatus(id, status);
    // Update current interview if it's the same
    const { currentInterview } = get();
    if (currentInterview?.id === id) {
      set({ currentInterview: response.data });
    }
    // Refresh the list
    const { pagination } = get();
    await get().fetchInterviews({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return response.data;
  },

  deleteInterview: async (id) => {
    await interviewApi.delete(id);
    // Refresh the list
    const { pagination } = get();
    await get().fetchInterviews({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  },

  fetchOutlines: async (interviewId) => {
    try {
      const response = await outlineApi.list(interviewId);
      set({ outlines: response.data });
    } catch (error) {
      console.error('Failed to fetch outlines:', error);
    }
  },

  createOutline: async (interviewId, data) => {
    const response = await outlineApi.create(interviewId, data);
    // Refresh outlines
    await get().fetchOutlines(interviewId);
    return response.data;
  },

  updateOutline: async (interviewId, outlineId, data) => {
    const response = await outlineApi.update(interviewId, outlineId, data);
    // Refresh outlines
    await get().fetchOutlines(interviewId);
    return response.data;
  },

  deleteOutline: async (interviewId, outlineId) => {
    await outlineApi.delete(interviewId, outlineId);
    // Refresh outlines
    await get().fetchOutlines(interviewId);
  },

  clearAllOutlines: async (interviewId) => {
    await outlineApi.clearAll(interviewId);
    await get().fetchOutlines(interviewId);
  },

  fetchRecords: async (interviewId, params) => {
    try {
      const response = await recordApi.list(interviewId, params);
      set({ records: response.data });
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  },

  createRecord: async (interviewId, data) => {
    const response = await recordApi.create(interviewId, data);
    // Refresh records
    await get().fetchRecords(interviewId);
    return response.data;
  },

  updateRecord: async (interviewId, recordId, data) => {
    const response = await recordApi.update(interviewId, recordId, data);
    // Refresh records
    await get().fetchRecords(interviewId);
    return response.data;
  },

  deleteRecord: async (interviewId, recordId) => {
    await recordApi.delete(interviewId, recordId);
    // Refresh records
    await get().fetchRecords(interviewId);
  },

  setCurrentInterview: (interview) => set({ currentInterview: interview }),

  reset: () =>
    set({
      interviews: [],
      currentInterview: null,
      loading: false,
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      outlines: [],
      records: [],
    }),
}));

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  loading: false,

  fetchStats: async () => {
    set({ loading: true });
    try {
      const response = await dashboardApi.getStats();
      set({
        stats: response.data,
        loading: false,
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status !== 401) console.error('Failed to fetch dashboard stats:', error);
      set({ loading: false });
    }
  },
}));

/**
 * 访谈实时状态 Store 接口
 */
interface InterviewRealtimeStore extends InterviewRealtimeState {
  /** 切换访谈时隔离并重置实时状态 */
  initializeInterviewState: (interviewId: string) => void;
  // 转写相关
  /** 设置转写文本 */
  setTranscript: (text: string) => void;
  /** 追加转写文本 */
  appendTranscript: (text: string) => void;
  /** 清空转写文本 */
  clearTranscript: () => void;

  // 访谈控制
  /** 开始访谈 */
  startInterview: () => void;
  /** 暂停访谈 */
  pauseInterview: () => void;
  /** 恢复访谈 */
  resumeInterview: () => void;
  /** 结束访谈 */
  endInterview: () => void;
  /** 重置访谈状态 */
  resetInterview: () => void;

  // AI追问管理
  /** 设置追问队列 */
  setFollowUpQuestions: (questions: FollowUpQuestion[]) => void;
  /** 添加追问 */
  addFollowUpQuestion: (question: FollowUpQuestion) => void;
  /** 移动到下一个追问 */
  nextFollowUp: () => void;
  /** 标记当前追问为已问 */
  markCurrentFollowUpAsAsked: () => void;
  /** 清空追问队列 */
  clearFollowUpQuestions: () => void;

  // 录音时长
  /** 更新录音时长 */
  updateRecordingTime: (seconds: number) => void;

  // 提纲联动（双向联动核心）
  /** 设置当前讨论的提纲问题ID */
  setCurrentOutlineId: (id: string | null) => void;

  // ==========================================
  // 会话管理方法（阶段三新增）
  // ==========================================
  /** 设置当前会话ID */
  setSessionId: (id: string | null) => void;
  /** 设置会话开始时间 */
  setSessionStartTime: (time: Date | null) => void;
  /** 开始新会话 */
  startSession: (interviewId: string) => Promise<string>;
  /** 结束当前会话 */
  endSession: (interviewId: string) => Promise<void>;
  /** 加载当前进行中的会话 */
  loadCurrentSession: (interviewId: string) => Promise<void>;
  /** 清除会话状态 */
  clearSession: () => void;
}

/**
 * 访谈实时状态 Store
 * 使用 persist 中间件持久化关键状态
 */
export const useInterviewRealtimeStore = create<InterviewRealtimeStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      activeInterviewId: null,
      currentTranscript: '',
      interviewStatus: 'idle',
      followUpQuestions: [],
      currentFollowUpIndex: 0,
      recordingStartTime: null,
      totalRecordingTime: 0,
      currentOutlineId: null,
      // 会话管理初始状态
      sessionId: null,
      sessionStartTime: null,

      initializeInterviewState: (interviewId: string) => {
        if (get().activeInterviewId === interviewId) return;
        set({
          activeInterviewId: interviewId,
          currentTranscript: '',
          interviewStatus: 'idle',
          followUpQuestions: [],
          currentFollowUpIndex: 0,
          recordingStartTime: null,
          totalRecordingTime: 0,
          currentOutlineId: null,
          sessionId: null,
          sessionStartTime: null,
        });
      },

      // 转写相关
      setTranscript: (text: string) => {
        set({ currentTranscript: text });
      },

      appendTranscript: (text: string) => {
        set((state) => ({
          currentTranscript: state.currentTranscript + text,
        }));
      },

      clearTranscript: () => {
        set({ currentTranscript: '' });
      },

      // 访谈控制
      startInterview: () => {
        console.log('[Store] startInterview 被调用，设置状态为 recording');
        set({
          interviewStatus: 'recording',
          recordingStartTime: new Date(),
          currentTranscript: '',
          currentFollowUpIndex: 0,
        });
        console.log('[Store] 状态已更新:', get().interviewStatus);
      },

      pauseInterview: () => {
        const state = get();
        let additionalTime = 0;

        if (state.recordingStartTime) {
          additionalTime = Math.floor(
            (Date.now() - new Date(state.recordingStartTime).getTime()) / 1000
          );
        }

        set({
          interviewStatus: 'paused',
          totalRecordingTime: state.totalRecordingTime + additionalTime,
          recordingStartTime: null,
        });
      },

      resumeInterview: () => {
        set({
          interviewStatus: 'recording',
          recordingStartTime: new Date(),
        });
      },

      endInterview: () => {
        const state = get();
        let totalTime = state.totalRecordingTime;

        if (state.recordingStartTime) {
          totalTime += Math.floor(
            (Date.now() - new Date(state.recordingStartTime).getTime()) / 1000
          );
        }

        set({
          interviewStatus: 'completed',
          totalRecordingTime: totalTime,
          recordingStartTime: null,
        });
      },

      resetInterview: () => {
        set({
          currentTranscript: '',
          interviewStatus: 'idle',
          followUpQuestions: [],
          currentFollowUpIndex: 0,
          recordingStartTime: null,
          totalRecordingTime: 0,
          currentOutlineId: null,
          // 清除会话状态
          sessionId: null,
          sessionStartTime: null,
        });
      },

      // AI追问管理
      setFollowUpQuestions: (questions: FollowUpQuestion[]) => {
        set({
          followUpQuestions: questions,
          currentFollowUpIndex: 0,
        });
      },

      addFollowUpQuestion: (question: FollowUpQuestion) => {
        set((state) => ({
          followUpQuestions: [...state.followUpQuestions, question],
        }));
      },

      nextFollowUp: () => {
        set((state) => {
          const nextIndex = state.currentFollowUpIndex + 1;
          if (nextIndex < state.followUpQuestions.length) {
            return { currentFollowUpIndex: nextIndex };
          }
          return state;
        });
      },

      markCurrentFollowUpAsAsked: () => {
        set((state) => {
          const questions = [...state.followUpQuestions];
          if (state.currentFollowUpIndex < questions.length) {
            questions[state.currentFollowUpIndex] = {
              ...questions[state.currentFollowUpIndex],
              asked: true,
            };
          }
          return { followUpQuestions: questions };
        });
      },

      clearFollowUpQuestions: () => {
        set({
          followUpQuestions: [],
          currentFollowUpIndex: 0,
        });
      },

      // 录音时长
      updateRecordingTime: (seconds: number) => {
        set({ totalRecordingTime: seconds });
      },

      // 提纲联动
      setCurrentOutlineId: (id: string | null) => {
        set({ currentOutlineId: id });
      },

      // ==========================================
      // 会话管理方法（阶段三新增）
      // ==========================================

      setSessionId: (id: string | null) => {
        set({ sessionId: id });
      },

      setSessionStartTime: (time: Date | null) => {
        set({ sessionStartTime: time });
      },

      startSession: async (interviewId: string) => {
        try {
          const response = await sessionApi.start(interviewId);
          const { sessionId, startTime } = response.data;
          set({
            sessionId,
            sessionStartTime: new Date(startTime),
          });
          return sessionId;
        } catch (error) {
          console.error('[Session] Failed to start session:', error);
          throw error;
        }
      },

      endSession: async (interviewId: string) => {
        const { sessionId } = get();
        if (!sessionId) {
          console.warn('[Session] No active session to end');
          return;
        }

        try {
          await sessionApi.end(interviewId, sessionId);
          set({
            sessionId: null,
            sessionStartTime: null,
          });
        } catch (error) {
          console.error('[Session] Failed to end session:', error);
          throw error;
        }
      },

      loadCurrentSession: async (interviewId: string) => {
        try {
          const response = await sessionApi.getCurrent(interviewId);
          const sessionInfo = response.data;

          if (sessionInfo && sessionInfo.sessionId) {
            set({
              sessionId: sessionInfo.sessionId,
              sessionStartTime: new Date(sessionInfo.startTime),
            });
          } else {
            // 没有进行中的会话
            set({
              sessionId: null,
              sessionStartTime: null,
            });
          }
        } catch (error) {
          console.error('[Session] Failed to load current session:', error);
          // 不抛出错误，允许继续操作
          set({
            sessionId: null,
            sessionStartTime: null,
          });
        }
      },

      clearSession: () => {
        set({
          sessionId: null,
          sessionStartTime: null,
        });
      },
    }),
    {
      name: 'interview-realtime-state',
      storage: createJSONStorage(() => localStorage),
      // 只持久化必要的字段
      partialize: (state) => ({
        activeInterviewId: state.activeInterviewId,
        currentTranscript: state.currentTranscript,
        interviewStatus: state.interviewStatus,
        followUpQuestions: state.followUpQuestions,
        currentFollowUpIndex: state.currentFollowUpIndex,
        totalRecordingTime: state.totalRecordingTime,
        currentOutlineId: state.currentOutlineId,
        // 会话状态持久化
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime,
      }),
    }
  )
);

// ==========================================
// 访谈模板状态管理
// ==========================================

interface TemplateState {
  templates: InterviewTemplate[];
  currentTemplate: InterviewTemplate | null;
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  fetchTemplates: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    isPublic?: boolean;
  }) => Promise<void>;
  fetchTemplate: (id: string) => Promise<void>;
  createTemplate: (data: any) => Promise<InterviewTemplate>;
  updateTemplate: (id: string, data: any) => Promise<InterviewTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  setCurrentTemplate: (template: InterviewTemplate | null) => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },

  fetchTemplates: async (params) => {
    set({ loading: true });
    try {
      const response = await templateApi.list(params);
      set({
        templates: response.data.templates,
        pagination: response.data.pagination,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({ loading: false });
    }
  },

  fetchTemplate: async (id) => {
    set({ loading: true });
    try {
      const response = await templateApi.get(id);
      set({
        currentTemplate: response.data,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch template:', error);
      set({ loading: false });
    }
  },

  createTemplate: async (data) => {
    const response = await templateApi.create(data);
    // Refresh the list
    const { pagination } = get();
    await get().fetchTemplates({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await templateApi.update(id, data);
    // Update current template if it's the same
    const { currentTemplate } = get();
    if (currentTemplate?.id === id) {
      set({ currentTemplate: response.data });
    }
    // Refresh the list
    const { pagination } = get();
    await get().fetchTemplates({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return response.data;
  },

  deleteTemplate: async (id) => {
    await templateApi.delete(id);
    // Refresh the list
    const { pagination } = get();
    await get().fetchTemplates({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  },

  setCurrentTemplate: (template) => set({ currentTemplate: template }),

  reset: () =>
    set({
      templates: [],
      currentTemplate: null,
      loading: false,
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    }),
}));
