/**
 * 客户需求洞察助手 - API 服务层
 */

import axios from 'axios';
import {
  Customer,
  CustomerListResponse,
  CustomerCreateInput,
  Interview,
  InterviewListResponse,
  InterviewCreateInput,
  InterviewUpdateInput,
  Outline,
  OutlineCreateInput,
  OutlineUpdateInput,
  Record,
  RecordCreateInput,
  RecordUpdateInput,
  AIGenerateOutlineInput,
  AIGenerateOutlineResponse,
  AIGenerateFollowUpInput,
  AIGenerateFollowUpResponse,
  AIGenerateSummaryInput,
  AIGenerateSummaryResponse,
  AIGeneratePRDInput,
  AIGeneratePRDResponse,
  AIGeneratePersonaInput,
  AIGeneratePersonaResponse,
  AIGenerateJourneyInput,
  AIGenerateJourneyResponse,
  GetJourneyMapResponse,
  UpdateJourneyMapInput,
  UpdateJourneyMapResponse,
  JourneyMapData,
  DashboardStatsResponse,
  InterviewTemplate,
  TemplateListResponse,
  TemplateCreateInput,
  TemplateUpdateInput,
  StartSessionResponse,
  GetCurrentSessionResponse,
  // 报告版本管理相关类型
  InsightReportItem,
  InsightReportDetail,
  InsightReportsListResponse,
  InsightReportDetailResponse,
} from './types';
import { VALIDATED_AI_API_TIMEOUT } from '@/lib/config/timeout';
import { setupInterceptors } from '@/lib/apiCreator';

const api = axios.create({
  baseURL: '/api',
  timeout: VALIDATED_AI_API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

setupInterceptors(api, { unwrapResponseData: false });

// ==========================================
// 客户管理 API
// ==========================================

export const customerApi = {
  /**
   * 获取客户列表
   */
  list: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    industry?: string;
  }): Promise<CustomerListResponse> => {
    const response = await api.get<CustomerListResponse>('/customers', {
      params,
    });
    return response.data;
  },

  /**
   * 获取客户详情
   */
  get: async (id: string): Promise<{ success: boolean; data: Customer }> => {
    const response = await api.get<{ success: boolean; data: Customer }>(
      `/customers/${id}`
    );
    return response.data;
  },

  /**
   * 创建客户
   */
  create: async (
    data: CustomerCreateInput
  ): Promise<{ success: boolean; data: Customer }> => {
    const response = await api.post<{ success: boolean; data: Customer }>(
      '/customers',
      data
    );
    return response.data;
  },

  /**
   * 更新客户
   */
  update: async (
    id: string,
    data: Partial<CustomerCreateInput>
  ): Promise<{ success: boolean; data: Customer }> => {
    const response = await api.put<{ success: boolean; data: Customer }>(
      `/customers/${id}`,
      data
    );
    return response.data;
  },

  /**
   * 删除客户
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};

// ==========================================
// 访谈项目 API
// ==========================================

export const interviewApi = {
  /**
   * 获取访谈列表
   */
  list: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    customerId?: string;
    search?: string;
  }): Promise<InterviewListResponse> => {
    const response = await api.get<InterviewListResponse>('/interviews', {
      params,
    });
    return response.data;
  },

  /**
   * 获取访谈详情
   */
  get: async (id: string): Promise<{ success: boolean; data: Interview }> => {
    const response = await api.get<{ success: boolean; data: Interview }>(
      `/interviews/${id}`
    );
    return response.data;
  },

  /**
   * 获取访谈准备状态
   */
  getPreparationStatus: async (
    id: string
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      preparationStatus: string | null;
      preparationError: string | null;
      preparationStartedAt: string | null;
      preparationCompletedAt: string | null;
      status: string;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: {
        id: string;
        preparationStatus: string | null;
        preparationError: string | null;
        preparationStartedAt: string | null;
        preparationCompletedAt: string | null;
        status: string;
      };
    }>('/interviews', {
      params: {
        preparationStatusOnly: true,
        id,
      },
    });
    return response.data;
  },

  /**
   * 创建访谈
   */
  create: async (
    data: InterviewCreateInput
  ): Promise<{ success: boolean; data: Interview }> => {
    const response = await api.post<{ success: boolean; data: Interview }>(
      '/interviews',
      data
    );
    return response.data;
  },

  /**
   * 更新访谈
   */
  update: async (
    id: string,
    data: InterviewUpdateInput
  ): Promise<{ success: boolean; data: Interview }> => {
    const response = await api.put<{ success: boolean; data: Interview }>(
      `/interviews/${id}`,
      data
    );
    return response.data;
  },

  /**
   * 更新访谈状态
   */
  updateStatus: async (
    id: string,
    status: string
  ): Promise<{ success: boolean; data: Interview }> => {
    const response = await api.put<{ success: boolean; data: Interview }>(
      `/interviews/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * 删除访谈
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/interviews/${id}`);
  },
};

// ==========================================
// 访谈提纲 API
// ==========================================

export const outlineApi = {
  /**
   * 获取访谈提纲列表
   */
  list: async (
    interviewId: string
  ): Promise<{ success: boolean; data: Outline[] }> => {
    const response = await api.get<{ success: boolean; data: Outline[] }>(
      `/interviews/${interviewId}/outlines`
    );
    return response.data;
  },

  /**
   * 创建提纲项
   */
  create: async (
    interviewId: string,
    data: OutlineCreateInput
  ): Promise<{ success: boolean; data: Outline }> => {
    const response = await api.post<{ success: boolean; data: Outline }>(
      `/interviews/${interviewId}/outlines`,
      data
    );
    return response.data;
  },

  /**
   * 更新提纲项
   */
  update: async (
    interviewId: string,
    outlineId: string,
    data: OutlineUpdateInput
  ): Promise<{ success: boolean; data: Outline }> => {
    const response = await api.put<{ success: boolean; data: Outline }>(
      `/interviews/${interviewId}/outlines/${outlineId}`,
      data
    );
    return response.data;
  },

  /**
   * 删除提纲项
   */
  delete: async (interviewId: string, outlineId: string): Promise<void> => {
    await api.delete(`/interviews/${interviewId}/outlines/${outlineId}`);
  },

  /**
   * 清空访谈提纲
   */
  clearAll: async (
    interviewId: string
  ): Promise<{ success: boolean; deletedCount: number; message?: string }> => {
    const response = await api.delete<{ success: boolean; deletedCount: number; message?: string }>(
      `/interviews/${interviewId}/outlines`
    );
    return response.data;
  },

  /**
   * 批量更新提纲顺序
   */
  updateOrder: async (
    interviewId: string,
    items: Array<{ id: string; order: number }>
  ): Promise<{ success: boolean }> => {
    const response = await api.put<{ success: boolean }>(
      `/interviews/${interviewId}/outlines/order`,
      { items }
    );
    return response.data;
  },
};

// ==========================================
// 访谈记录 API
// ==========================================

export const recordApi = {
  /**
   * 获取访谈记录列表
   */
  list: async (
    interviewId: string,
    params?: { type?: string; isHighlight?: boolean }
  ): Promise<{ success: boolean; data: Record[] }> => {
    const response = await api.get<{ success: boolean; data: Record[] }>(
      `/interviews/${interviewId}/records`,
      { params }
    );
    return response.data;
  },

  /**
   * 创建记录
   */
  create: async (
    interviewId: string,
    data: RecordCreateInput
  ): Promise<{ success: boolean; data: Record }> => {
    const response = await api.post<{ success: boolean; data: Record }>(
      `/interviews/${interviewId}/records`,
      data
    );
    return response.data;
  },

  /**
   * 更新记录
   */
  update: async (
    interviewId: string,
    recordId: string,
    data: RecordUpdateInput
  ): Promise<{ success: boolean; data: Record }> => {
    const response = await api.put<{ success: boolean; data: Record }>(
      `/interviews/${interviewId}/records/${recordId}`,
      data
    );
    return response.data;
  },

  /**
   * 删除记录
   */
  delete: async (interviewId: string, recordId: string): Promise<void> => {
    await api.delete(`/interviews/${interviewId}/records/${recordId}`);
  },
};

// ==========================================
// AI 辅助 API
// ==========================================

export const aiApi = {
  /**
   * AI 生成访谈提纲
   */
  generateOutline: async (
    data: AIGenerateOutlineInput
  ): Promise<AIGenerateOutlineResponse> => {
    const response = await api.post<AIGenerateOutlineResponse>(
      '/ai/generate/outline',
      data
    );
    return response.data;
  },

  /**
   * AI 生成追问问题
   */
  generateFollowUp: async (
    data: AIGenerateFollowUpInput
  ): Promise<AIGenerateFollowUpResponse> => {
    const response = await api.post<AIGenerateFollowUpResponse>(
      '/ai/generate/follow-up',
      data
    );
    return response.data;
  },

  /**
   * AI 生成访谈纪要
   */
  generateSummary: async (
    data: AIGenerateSummaryInput
  ): Promise<AIGenerateSummaryResponse> => {
    const response = await api.post<AIGenerateSummaryResponse>(
      '/ai/generate/summary',
      data
    );
    return response.data;
  },

  /**
   * AI 生成 PRD 文档
   */
  generatePRD: async (
    data: AIGeneratePRDInput
  ): Promise<AIGeneratePRDResponse> => {
    const response = await api.post<AIGeneratePRDResponse>(
      '/ai/generate/prd',
      data
    );
    return response.data;
  },

  /**
   * AI 生成用户画像
   */
  generatePersona: async (
    data: AIGeneratePersonaInput
  ): Promise<AIGeneratePersonaResponse> => {
    const response = await api.post<AIGeneratePersonaResponse>(
      '/ai/generate/persona',
      data
    );
    return response.data;
  },

  /**
   * AI 生成用户旅程图
   */
  generateJourney: async (
    data: AIGenerateJourneyInput
  ): Promise<AIGenerateJourneyResponse> => {
    const response = await api.post<AIGenerateJourneyResponse>(
      '/ai/generate/journey',
      data
    );
    return response.data;
  },

  /**
   * AI 生成阶段总结
   */
  generateStageSummary: async (data: {
    interviewId: string;
    currentTranscripts?: Array<{ text: string; timestamp?: string }>;
  }): Promise<{ success: boolean; data: unknown }> => {
    const response = await api.post<{ success: boolean; data: unknown }>(
      '/ai/analyze/stage-summary',
      data
    );
    return response.data;
  },

  /**
   * AI 核心问题识别
   * 分析转写内容，识别痛点、需求和关键洞察，并自动创建记录
   */
  analyzeKeyPoints: async (data: {
    interviewId: string;
    sessionId?: string;
    transcripts: Array<{ id: string; content: string; timestamp?: string }>;
    customerContext?: {
      industry?: string;
      background?: string;
    };
  }): Promise<{
    success: boolean;
    data?: {
      keyPoints: Array<{
        content: string;
        type: 'pain_point' | 'requirement' | 'insight';
        confidence: number;
        transcriptIds: string[];
      }>;
      createdRecords: Array<{
        id: string;
        content: string;
        type: string;
        source: string;
      }>;
    };
    message?: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      data?: {
        keyPoints: Array<{
          content: string;
          type: 'pain_point' | 'requirement' | 'insight';
          confidence: number;
          transcriptIds: string[];
        }>;
        createdRecords: Array<{
          id: string;
          content: string;
          type: string;
          source: string;
        }>;
      };
      message?: string;
    }>('/ai/analyze/key-points', data);
    return response.data;
  },

  /**
   * 企查查模糊搜索
   * 根据公司名称关键词搜索匹配的公司列表
   */
  fuzzySearchCompany: async (data: {
    searchKey: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{
    success: boolean;
    data?: {
      items: Array<{
        keyNo: string;
        name: string;
        creditCode: string;
        establishDate: string;
        legalPerson: string;
        status: string;
        address: string;
        province: string;
        city: string;
      }>;
      totalRecords: number;
      pageIndex: number;
      pageSize: number;
    };
    message?: string;
    error?: { code: string; message: string };
  }> => {
    const response = await api.post<{
      success: boolean;
      data?: {
        items: Array<{
          keyNo: string;
          name: string;
          creditCode: string;
          establishDate: string;
          legalPerson: string;
          status: string;
          address: string;
          province: string;
          city: string;
        }>;
        totalRecords: number;
        pageIndex: number;
        pageSize: number;
      };
      message?: string;
      error?: { code: string; message: string };
    }>('/ai/search/fuzzy', data);
    return response.data;
  },

  /**
   * AI 搜索客户信息
   * 根据客户名称搜索网络，提取公司简介、联系方式等信息
   */
  searchCustomerInfo: async (data: {
    companyName: string;
    industry?: string;
    contactName?: string;
    includeNews?: boolean;
  }): Promise<{
    success: boolean;
    data?: {
      fullName?: string;
      description?: string;
      industry?: string;
      website?: string;
      contactName?: string;
      phone?: string;
      email?: string;
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
    };
    message?: string;
    error?: { code: string; message: string };
  }> => {
    const response = await api.post<{
      success: boolean;
      data?: {
        fullName?: string;
        description?: string;
        industry?: string;
        website?: string;
        contactName?: string;
        phone?: string;
        email?: string;
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
      };
      message?: string;
      error?: { code: string; message: string };
    }>('/ai/search/customer-info', data);
    return response.data;
  },
};

// ==========================================
// Dashboard 统计 API
// ==========================================

export const dashboardApi = {
  /**
   * 获取首页统计数据
   */
  getStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<DashboardStatsResponse>('/dashboard/stats');
    return response.data;
  },
};

// ==========================================
// 访谈模板 API
// ==========================================

export const templateApi = {
  /**
   * 获取模板列表
   */
  list: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    isPublic?: boolean;
  }): Promise<TemplateListResponse> => {
    const response = await api.get<TemplateListResponse>('/templates', {
      params,
    });
    return response.data;
  },

  /**
   * 获取模板详情
   */
  get: async (id: string): Promise<{ success: boolean; data: InterviewTemplate }> => {
    const response = await api.get<{ success: boolean; data: InterviewTemplate }>(
      `/templates/${id}`
    );
    return response.data;
  },

  /**
   * 创建模板
   */
  create: async (
    data: TemplateCreateInput
  ): Promise<{ success: boolean; data: InterviewTemplate }> => {
    const response = await api.post<{ success: boolean; data: InterviewTemplate }>(
      '/templates',
      data
    );
    return response.data;
  },

  /**
   * 更新模板
   */
  update: async (
    id: string,
    data: TemplateUpdateInput
  ): Promise<{ success: boolean; data: InterviewTemplate }> => {
    const response = await api.put<{ success: boolean; data: InterviewTemplate }>(
      `/templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * 删除模板
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },
};

// ==========================================
// 会话管理 API（阶段三新增）
// ==========================================

export const sessionApi = {
  /**
   * 开始新会话
   * @param interviewId 访谈项目ID
   * @returns 会话ID和开始时间
   */
  start: async (interviewId: string): Promise<StartSessionResponse> => {
    const response = await api.post<StartSessionResponse>(
      `/interviews/${interviewId}/session`,
      { action: 'start' }
    );
    return response.data;
  },

  /**
   * 结束会话
   * @param interviewId 访谈项目ID
   * @param sessionId 会话ID
   */
  end: async (interviewId: string, sessionId: string): Promise<void> => {
    await api.post(`/interviews/${interviewId}/session`, {
      action: 'end',
      sessionId,
    });
  },

  /**
   * 获取当前进行中的会话
   * @param interviewId 访谈项目ID
   * @returns 当前会话信息，如果没有则返回 null
   */
  getCurrent: async (interviewId: string): Promise<GetCurrentSessionResponse> => {
    const response = await api.get<GetCurrentSessionResponse>(
      `/interviews/${interviewId}/session`
    );
    return response.data;
  },
};

// ==========================================
// 阶段总结 API
// ==========================================

export const stageSummaryApi = {
  /**
   * 获取最新的阶段总结
   * @param interviewId 访谈项目ID
   * @param sessionId 可选，按会话ID筛选
   * @returns 最新的阶段总结数据
   */
  getLatest: async (
    interviewId: string,
    sessionId?: string
  ): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      projectId: string;
      sessionId: string | null;
      keyFindings: string[];
      painPoints: string[];
      requirements: string[];
      suggestions: string[];
      createdAt: string;
      updatedAt: string;
    }>;
    message?: string;
  }> => {
    const params = new URLSearchParams();
    if (sessionId) {
      params.append('sessionId', sessionId);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/interviews/${interviewId}/stage-summary${query}`);
    return response.data;
  },

  /**
   * 保存阶段总结
   * @param interviewId 访谈项目ID
   * @param data 阶段总结数据
   * @returns 保存后的阶段总结
   */
  save: async (
    interviewId: string,
    data: {
      sessionId?: string;
      keyFindings?: string[];
      painPoints?: string[];
      requirements?: string[];
      suggestions?: string[];
    }
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      projectId: string;
      sessionId: string | null;
      keyFindings: string[];
      painPoints: string[];
      requirements: string[];
      suggestions: string[];
      createdAt: string;
      updatedAt: string;
    };
    message?: string;
  }> => {
    const response = await api.post(`/interviews/${interviewId}/stage-summary`, data);
    return response.data;
  },
};

// ==========================================
// 用户旅程图 API
// ==========================================

export const journeyMapApi = {
  /**
   * 获取用户旅程图
   * @param interviewId 访谈项目ID
   * @returns 用户旅程图数据，如果没有则返回 null
   */
  get: async (interviewId: string): Promise<GetJourneyMapResponse> => {
    const response = await api.get<GetJourneyMapResponse>(
      `/interviews/${interviewId}/journey-map`
    );
    return response.data;
  },

  /**
   * 更新用户旅程图
   * @param journeyMapId 旅程图ID
   * @param data 更新数据
   * @returns 更新后的旅程图数据
   */
  update: async (
    journeyMapId: string,
    data: UpdateJourneyMapInput
  ): Promise<UpdateJourneyMapResponse> => {
    const response = await api.put<UpdateJourneyMapResponse>(
      `/journey-maps/${journeyMapId}`,
      data
    );
    return response.data;
  },

  /**
   * 删除用户旅程图
   * @param journeyMapId 旅程图ID
   */
  delete: async (journeyMapId: string): Promise<void> => {
    await api.delete(`/journey-maps/${journeyMapId}`);
  },
};

export default api;

// ==========================================
// 报告版本管理 API（新增）
// ==========================================

export const insightReportApi = {
  /**
   * 获取报告历史列表
   * @param interviewId 访谈项目ID
   * @returns 报告历史列表
   */
  list: async (interviewId: string): Promise<InsightReportsListResponse> => {
    const response = await api.get<InsightReportsListResponse>(
      `/interviews/${interviewId}/insight-reports`
    );
    return response.data;
  },

  /**
   * 获取报告详情
   * @param interviewId 访谈项目ID
   * @param reportId 报告ID
   * @returns 报告详情
   */
  getDetail: async (
    interviewId: string,
    reportId: string
  ): Promise<InsightReportDetailResponse> => {
    const response = await api.get<InsightReportDetailResponse>(
      `/interviews/${interviewId}/insight-reports/${reportId}`
    );
    return response.data;
  },

  /**
   * 删除报告
   * @param interviewId 访谈项目ID
   * @param reportId 报告ID
   * @returns 删除结果
   */
  delete: async (
    interviewId: string,
    reportId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete<{ success: boolean; message?: string }>(
      `/interviews/${interviewId}/insight-reports/${reportId}`
    );
    return response.data;
  },

  /**
   * 生成报告（支持覆盖或新建版本）
   * @param interviewId 访谈项目ID
   * @param data 生成报告请求参数
   * @returns 生成的报告详情
   */
  generate: async (
    interviewId: string,
    data: {
      customerInfo: {
        name: string;
        industry?: string;
        description?: string;
      };
      objective: string;
      background?: string;
      focusAreas?: string[];
      overwrite?: boolean;
    }
  ): Promise<InsightReportDetailResponse> => {
    const response = await api.post<InsightReportDetailResponse>(
      '/api/ai/generate/interview-insights',
      {
        interviewId,
        ...data,
      }
    );
    return response.data;
  },
};
