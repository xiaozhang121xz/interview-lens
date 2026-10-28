/**
 * 企查查API服务
 *
 * @module lib/services/qichacha-service
 * @description 封装企查查开放平台API调用，提供企业信息查询服务
 *
 * 功能：
 * - 企业工商详情查询（接口735: ECIInfoVerify/GetInfo）
 * - 企业新闻舆情查询（CompanyNews/SearchNews）
 * - MD5 Token认证
 * - 频率控制和错误处理
 * - 缓存集成
 *
 * 认证方式（Token + Timespan 头认证）：
 * 1. 生成时间戳 timespan = 当前秒级时间戳
 * 2. Token = MD5(APP_KEY + timespan + SECRET_KEY).toUpperCase()
 * 3. 请求头: { Token: token, Timespan: timespan }
 *
 * 环境变量配置：
 * - QICHACHA_APP_KEY: AppKey（必填）
 * - QICHACHA_SECRET_KEY: SecretKey（必填，用于签名）
 * - QICHACHA_BASE_URL: API地址（可选，默认官方地址）
 * - ENABLE_QICHACHA_API: 是否启用（默认true）
 */

import * as crypto from 'crypto';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  getCachedCompany,
  setCachedCompany,
  getCachedNews,
  setCachedNews,
  type QichachaCompanyInfo,
  type QichachaNewsInfo,
} from './qichacha-cache';

// 重新导出类型，供其他模块使用
export type { QichachaCompanyInfo, QichachaNewsInfo } from './qichacha-cache';

// ============================================
// 配置常量
// ============================================

// 是否启用企查查API（从环境变量读取）
const ENABLE_API = process.env.ENABLE_QICHACHA_API !== 'false';

// 企查查API基础URL
const BASE_URL = process.env.QICHACHA_BASE_URL || 'https://api.qichacha.com';

// 接口端点（参考企查查开放平台：https://openapi.qcc.com）
const API_ENDPOINTS = {
  // 接口735: 企业工商详情核验（精确查询）
  // 文档: https://openapi.qcc.com/dataApi/735
  COMPANY_SEARCH: '/ECIInfoVerify/GetInfo',
  // 接口735: 企业工商详情核验（同上）
  COMPANY_DETAIL: '/ECIInfoVerify/GetInfo',
  // 企业新闻舆情查询
  COMPANY_NEWS: '/CompanyNews/SearchNews',
  // 模糊搜索接口（根据关键词搜索公司列表）
  COMPANY_FUZZY_SEARCH: '/FuzzySearch/GetList',
};

// ============================================
// 类型定义
// ============================================

export interface QichachaQueryResult {
  success: boolean;
  data?: QichachaCompanyInfo;
  error?: string;
  source: 'cache' | 'api' | 'none';
}

export interface QichachaNewsQueryResult {
  success: boolean;
  data?: QichachaNewsInfo;
  error?: string;
  source: 'cache' | 'api' | 'none';
}

export interface QichachaDetailQueryResult {
  success: boolean;
  data?: QichachaCompanyDetail;
  error?: string;
  source: 'cache' | 'api' | 'none';
}

// 企查查API响应格式
interface QichachaApiResponse<T> {
  Status: string;
  Message: string;
  Result: T;
}

// 企查查企业搜索结果
interface QichachaSearchResult {
  KeyNo: string;
  Name: string;
  No: string;
  CreditCode: string;
  OperName: string;
 StartDate: string;
  Status: string;
  Province: string;
  City: string;
  Address: string;
  Scope: string;
  EconKind: string;
  RegistCapi: string;
  RecCap: string;
  OrgCode: string;
  BelongOrg: string;
  CheckDate: string;
  TermStart: string;
  TermEnd: string;
  UpdatedDate: string;
  PersonScope?: string;
  InsuredCount?: string;
  TagList?: Array<{ Name?: string }>;
  Industry?: {
    Industry?: string;
    SubIndustry?: string;
    MiddleCategory?: string;
    SmallCategory?: string;
  };
  Branches?: Array<{ Name?: string }>;
  ContactInfo?: {
    PhoneNumber?: string;
    Email?: string;
  };
  ARContactList?: Array<{
    ContactNo?: string;
    EmailAddress?: string;
  }>;
  Partners?: Array<{
    StockName?: string;
    RelatedOrg?: {
      Name?: string;
    } | null;
  }>;
  ChangeRecords?: Array<{
    ProjectName?: string;
    BeforeContent?: string;
    AfterContent?: string;
    ChangeDate?: string;
  }>;
}

// 企查查新闻API结果
interface QichachaNewsResultItem {
  NewsTitle?: string;
  NewsSource?: string;
  NewsDate?: string;
  NewsContent?: string;
  NewsUrl?: string;
  Title?: string;
  Source?: string;
  PublishTime?: string;
  EmotionType?: 'positive' | 'neutral' | 'negative' | string;
  Category?: string;
  CategoryDesc?: string;
  Content?: string;
  Url?: string;
}

interface QichachaNewsResult {
  NewsList?: QichachaNewsResultItem[];
  TotalCount?: number;
}

// 企查查模糊搜索结果项
interface QichachaFuzzySearchItem {
  KeyNo: string;         // 内部ID
  Name: string;          // 公司全称
  No: string;            // 注册号
  CreditCode: string;    // 统一社会信用代码
  StartDate: string;     // 成立日期
  OperName: string;      // 法人
  Status: string;        // 经营状态
  Address: string;       // 地址
  Province: string;      // 省份
  City: string;          // 城市
}

// 企查查模糊搜索API响应
interface QichachaFuzzySearchResponse {
  Status: string;
  Message: string;
  OrderNumber: string;
  Paging: {
    PageSize: number;
    PageIndex: number;
    TotalRecords: number;
  };
  Result: QichachaFuzzySearchItem[];
}

// 模糊搜索结果项（导出给前端使用）
export interface FuzzySearchResultItem {
  keyNo: string;         // 内部ID
  name: string;          // 公司全称
  creditCode: string;    // 统一社会信用代码
  establishDate: string; // 成立日期
  legalPerson: string;   // 法人
  status: string;        // 经营状态
  address: string;       // 地址
  province: string;      // 省份
  city: string;          // 城市
}

// 模糊搜索查询结果
export interface FuzzySearchQueryResult {
  success: boolean;
  data?: {
    items: FuzzySearchResultItem[];
    totalRecords: number;
    pageIndex: number;
    pageSize: number;
  };
  error?: string;
  source: 'cache' | 'api' | 'none';
}

// 企查查详情API结果
interface QichachaDetailResult {
  KeyNo: string;
  Name: string;
  No: string;
  CreditCode: string;
  OperName: string;
  StartDate: string;
  Status: string;
  Province: string;
  City: string;
  Address: string;
  Scope: string;
  EconKind: string;
  RegistCapi: string;
  RecCap: string;
  OrgCode: string;
  BelongOrg: string;
  CheckDate: string;
  TermStart: string;
  TermEnd: string;
  UpdatedDate: string;
  // 详情额外字段
  ShareHolderList?: Array<{
    ShareHolderName: string;
    ShareHolderProportion: string;
    ShareHolderType: string;
  }>;
  KeyPersonList?: Array<{
    KeyPersonName: string;
    KeyPersonPosition: string;
  }>;
  ChangeInfoList?: Array<{
    ChangeItem: string;
    BeforeContent: string;
    AfterContent: string;
    ChangeDate: string;
  }>;
}

// 企业详情数据结构（继承基础信息）
export interface QichachaCompanyDetail extends QichachaCompanyInfo {
  shareholders?: Array<{
    name: string;
    proportion: string;
    type: string;
  }>;
  keyPersonnel?: Array<{
    name: string;
    position: string;
  }>;
  changes?: Array<{
    changeItem: string;
    beforeContent: string;
    afterContent: string;
    changeDate: string;
  }>;
}

// ============================================
// 企查查API客户端类
// ============================================

/**
 * 企查查API客户端
 *
 * 认证方式：Token + Timespan 头认证
 *
 * 签名规则：
 * 1. 生成时间戳 timespan = 当前秒级时间戳
 * 2. 拼接签名字符串：APP_KEY + timespan + SECRET_KEY
 * 3. MD5加密并转大写：Token = MD5(signStr).toUpperCase()
 * 4. 请求头携带：{ Token: token, Timespan: timespan }
 *
 * 参考文档：
 * - 企业工商详情接口735: https://openapi.qcc.com/dataApi/735
 */
export class QichachaClient {
  private appKey: string;
  private secretKey: string;
  private baseUrl: string;
  private httpClient: AxiosInstance;

  constructor() {
    this.appKey = process.env.QICHACHA_APP_KEY || '';
    this.secretKey = process.env.QICHACHA_SECRET_KEY || '';
    this.baseUrl = BASE_URL;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!this.isConfigured()) {
      console.warn('[QichachaClient] QICHACHA_APP_KEY 或 QICHACHA_SECRET_KEY 未配置，企查查功能将不可用');
    }
  }

  /**
   * 检查API是否已配置
   */
  isConfigured(): boolean {
    return !!this.appKey && !!this.secretKey;
  }

  /**
   * 生成API签名（企查查MD5认证方式）
   *
   * 签名规则：
   * 1. 拼接 APP_KEY + timespan + SECRET_KEY
   * 2. 使用 MD5 算法签名
   * 3. 转换为大写
   */
  private buildAuthHeaders(): Record<string, string> {
    // 时间戳（秒）
    const timespan = Math.floor(Date.now() / 1000).toString();

    // Token = MD5(APP_KEY + timespan + SECRET_KEY).toUpperCase()
    const tokenStr = `${this.appKey}${timespan}${this.secretKey}`;
    const token = crypto.createHash('md5').update(tokenStr).digest('hex').toUpperCase();

    return {
      Token: token,
      Timespan: timespan,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 模糊搜索企业列表（用于获取公司全称）
   *
   * @param searchKey 搜索关键词（企业名称简称或关键词）
   * @param pageIndex 页码（默认1）
   * @param pageSize 每页数量（默认5）
   * @returns 模糊搜索结果列表
   */
  async fuzzySearchCompany(
    searchKey: string,
    pageIndex: number = 1,
    pageSize: number = 5
  ): Promise<FuzzySearchQueryResult> {
    // 检查是否启用
    if (!ENABLE_API) {
      return {
        success: false,
        error: '企查查API已禁用',
        source: 'none',
      };
    }

    // 检查配置
    if (!this.isConfigured()) {
      return {
        success: false,
        error: '企查查API未配置',
        source: 'none',
      };
    }

    try {
      console.log(`[QichachaService] 模糊搜索: ${searchKey}`);

      // 使用认证头
      const headers = this.buildAuthHeaders();

      // 企查查模糊搜索API参数
      const params = {
        key: this.appKey,
        searchKey: searchKey,
        pageIndex,
        pageSize,
      };

      const response = await this.httpClient.get<QichachaFuzzySearchResponse>(
        API_ENDPOINTS.COMPANY_FUZZY_SEARCH,
        {
          params,
          headers,
        }
      );

      console.log(`[QichachaService] 模糊搜索API响应: Status=${response.data.Status}`);

      if (response.data.Status === '200' && response.data.Result) {
        // 转换结果格式
        const items: FuzzySearchResultItem[] = response.data.Result.map((item) => ({
          keyNo: item.KeyNo || '',
          name: item.Name || '',
          creditCode: item.CreditCode || '',
          establishDate: item.StartDate || '',
          legalPerson: item.OperName || '',
          status: item.Status || '',
          address: item.Address || '',
          province: item.Province || '',
          city: item.City || '',
        }));

        console.log(`[QichachaService] 模糊搜索成功: 找到${response.data.Paging.TotalRecords}条记录`);

        return {
          success: true,
          data: {
            items,
            totalRecords: response.data.Paging.TotalRecords,
            pageIndex: response.data.Paging.PageIndex,
            pageSize: response.data.Paging.PageSize,
          },
          source: 'api',
        };
      }

      // API返回错误
      console.warn(`[QichachaService] 模糊搜索API返回错误: ${response.data.Message}`);
      return {
        success: false,
        error: response.data.Message || '模糊搜索失败',
        source: 'none',
      };
    } catch (error) {
      const errorMessage = this.handleApiError(error);
      console.error(`[QichachaService] 模糊搜索失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        source: 'none',
      };
    }
  }

  /**
   * 查询企业基础工商信息（模糊搜索）
   *
   * @param searchKey 搜索关键词（企业名称）
   * @returns 查询结果
   */
  async queryCompanyByKeyword(searchKey: string): Promise<QichachaQueryResult> {
    // 检查是否启用
    if (!ENABLE_API) {
      return {
        success: false,
        error: '企查查API已禁用',
        source: 'none',
      };
    }

    // 检查配置
    if (!this.isConfigured()) {
      return {
        success: false,
        error: '企查查API未配置',
        source: 'none',
      };
    }

    // 1. 先检查缓存
    const cachedData = getCachedCompany(searchKey);
    if (cachedData) {
      console.log(`[QichachaService] 命中缓存: ${searchKey}`);
      return {
        success: true,
        data: cachedData,
        source: 'cache',
      };
    }

    // 2. 调用API
    try {
      console.log(`[QichachaService] 开始查询: ${searchKey}`);

      // 使用新的认证头（MD5签名）
      const headers = this.buildAuthHeaders();

      // 企查查API参数：key（AppKey）, searchKey（企业名称）
      const params = {
        key: this.appKey,
        searchKey: searchKey,
      };

      const response = await this.httpClient.get<QichachaApiResponse<QichachaSearchResult>>(
        API_ENDPOINTS.COMPANY_SEARCH,
        {
          params,
          headers,
        }
      );

      // 检查响应状态
      console.log(`[QichachaService] API响应:`, JSON.stringify(response.data, null, 2));

      if (response.data.Status === '200' && response.data.Result) {
        const result = this.transformSearchResponse(response.data.Result, searchKey);

        // 存入缓存
        setCachedCompany(searchKey, result);

        console.log(`[QichachaService] 查询成功: ${searchKey}`);

        return {
          success: true,
          data: result,
          source: 'api',
        };
      }

      // API返回错误
      console.warn(`[QichachaService] API返回错误: ${response.data.Message}`);
      return {
        success: false,
        error: response.data.Message || '查询失败',
        source: 'none',
      };
    } catch (error) {
      const errorMessage = this.handleApiError(error);
      console.error(`[QichachaService] 查询失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        source: 'none',
      };
    }
  }

  /**
   * 转换企查查搜索API响应为内部数据结构
   */
  private transformSearchResponse(
    apiResult: QichachaSearchResult,
    queryName: string
  ): QichachaCompanyInfo {
    const investorNames = (apiResult.Partners || [])
      .map((item) => item.RelatedOrg?.Name || item.StockName || '')
      .filter(Boolean);

    return {
      queryTime: new Date().toISOString(),
      queryName,
      keyNo: apiResult.KeyNo || null,
      companyName: apiResult.Name || null,
      legalPerson: apiResult.OperName || null,
      establishDate: apiResult.StartDate || null,
      registerNumber: apiResult.No || null,
      socialCreditCode: apiResult.CreditCode || null,
      orgCode: apiResult.OrgCode || null,
      registCapi: apiResult.RegistCapi || null,
      recCap: apiResult.RecCap || null,
      address: apiResult.Address || null,
      businessScope: apiResult.Scope || null,
      businessTermStart: apiResult.TermStart || null,
      businessTermEnd: apiResult.TermEnd || null,
      companyType: apiResult.EconKind || null,
      companyStatus: apiResult.Status || null,
      registerAuthority: apiResult.BelongOrg || null,
      province: apiResult.Province || null,
      city: apiResult.City || null,
      district: null, // 搜索结果不含区县
      checkDate: apiResult.CheckDate || null,
      updatedDate: apiResult.UpdatedDate || null,
      industry:
        apiResult.Industry?.SmallCategory ||
        apiResult.Industry?.MiddleCategory ||
        apiResult.Industry?.SubIndustry ||
        apiResult.Industry?.Industry ||
        null,
      subIndustry:
        apiResult.Industry?.SubIndustry ||
        apiResult.Industry?.MiddleCategory ||
        apiResult.Industry?.SmallCategory ||
        null,
      personScope: apiResult.PersonScope || null,
      insuredCount: apiResult.InsuredCount || null,
      tags: (apiResult.TagList || []).map((item) => item.Name || '').filter(Boolean),
      branchCount: apiResult.Branches?.length || 0,
      contactPhone:
        apiResult.ContactInfo?.PhoneNumber ||
        apiResult.ARContactList?.[0]?.ContactNo ||
        null,
      contactEmail:
        apiResult.ContactInfo?.Email ||
        apiResult.ARContactList?.[0]?.EmailAddress ||
        null,
      investors: investorNames.length > 0 ? investorNames : null,
      recentChanges: (apiResult.ChangeRecords || []).slice(0, 5).map((item) => ({
        projectName: item.ProjectName || '',
        beforeContent: item.BeforeContent || null,
        afterContent: item.AfterContent || null,
        changeDate: item.ChangeDate || null,
      })),
      detailUrl: apiResult.KeyNo
        ? `https://www.qcc.com/company/${apiResult.KeyNo}.html`
        : null,
    };
  }

  /**
   * 转换企查查新闻API响应为内部数据结构
   */
  private transformNewsResponse(
    apiResult: QichachaNewsResult | QichachaNewsResultItem[],
    searchKey: string,
    pageIndex: number,
    pageSize: number,
    totalCountOverride?: number
  ): QichachaNewsInfo {
    const newsList = Array.isArray(apiResult)
      ? apiResult
      : apiResult.NewsList || [];

    const totalCount = totalCountOverride
      || (Array.isArray(apiResult) ? apiResult.length : apiResult.TotalCount)
      || 0;

    return {
      queryTime: new Date().toISOString(),
      searchKey,
      pageIndex,
      pageSize,
      totalCount,
      news: newsList.map((item) => {
        const content = item.NewsContent || item.Content || null;
        return {
          title: item.NewsTitle || item.Title || '',
          source: item.NewsSource || item.Source || null,
          publishTime: item.NewsDate || item.PublishTime || null,
          emotionType:
            item.EmotionType === 'positive' || item.EmotionType === 'negative' || item.EmotionType === 'neutral'
              ? item.EmotionType
              : null,
          category: item.Category || null,
          categoryDesc: item.CategoryDesc || null,
          summary: content ? content.slice(0, 200) : null,
          content,
          url: item.NewsUrl || item.Url || null,
        };
      }),
    };
  }

  /**
   * 转换企查查详情API响应为内部数据结构
   */
  private transformDetailResponse(
    apiResult: QichachaDetailResult,
    searchKey: string
  ): QichachaCompanyDetail {
    const baseInfo: QichachaCompanyInfo = {
      queryTime: new Date().toISOString(),
      queryName: searchKey,
      keyNo: apiResult.KeyNo || null,
      companyName: apiResult.Name || null,
      legalPerson: apiResult.OperName || null,
      establishDate: apiResult.StartDate || null,
      registerNumber: apiResult.No || null,
      socialCreditCode: apiResult.CreditCode || null,
      orgCode: apiResult.OrgCode || null,
      registCapi: apiResult.RegistCapi || null,
      recCap: apiResult.RecCap || null,
      address: apiResult.Address || null,
      businessScope: apiResult.Scope || null,
      businessTermStart: apiResult.TermStart || null,
      businessTermEnd: apiResult.TermEnd || null,
      companyType: apiResult.EconKind || null,
      companyStatus: apiResult.Status || null,
      registerAuthority: apiResult.BelongOrg || null,
      province: apiResult.Province || null,
      city: apiResult.City || null,
      district: null,
      checkDate: apiResult.CheckDate || null,
      updatedDate: apiResult.UpdatedDate || null,
      industry: null,
      subIndustry: null,
      personScope: null,
      insuredCount: null,
      tags: null,
      branchCount: null,
      contactPhone: null,
      contactEmail: null,
      investors: null,
      recentChanges: null,
      detailUrl: apiResult.KeyNo
        ? `https://www.qcc.com/company/${apiResult.KeyNo}.html`
        : null,
    };

    return {
      ...baseInfo,
      shareholders: (apiResult.ShareHolderList || []).map((item) => ({
        name: item.ShareHolderName,
        proportion: item.ShareHolderProportion,
        type: item.ShareHolderType,
      })),
      keyPersonnel: (apiResult.KeyPersonList || []).map((item) => ({
        name: item.KeyPersonName,
        position: item.KeyPersonPosition,
      })),
      changes: (apiResult.ChangeInfoList || []).map((item) => ({
        changeItem: item.ChangeItem,
        beforeContent: item.BeforeContent,
        afterContent: item.AfterContent,
        changeDate: item.ChangeDate,
      })),
    };
  }

  /**
   * 查询企业新闻舆情信息
   *
   * @param searchKey 企业名称或关键词
   * @param pageIndex 页码（默认1）
   * @param pageSize 每页数量（默认10）
   * @returns 查询结果
   */
  async queryCompanyNews(
    searchKey: string,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<QichachaNewsQueryResult> {
    // 检查是否启用
    if (!ENABLE_API) {
      return {
        success: false,
        error: '企查查API已禁用',
        source: 'none',
      };
    }

    // 检查配置
    if (!this.isConfigured()) {
      return {
        success: false,
        error: '企查查API未配置',
        source: 'none',
      };
    }

    // 1. 先检查缓存
    const cacheKey = `${searchKey}_${pageIndex}`;
    const cachedData = getCachedNews(cacheKey);
    if (cachedData) {
      console.log(`[QichachaService] 新闻命中缓存: ${searchKey}`);
      return {
        success: true,
        data: cachedData,
        source: 'cache',
      };
    }

    // 2. 调用API
    try {
      console.log(`[QichachaService] 开始查询新闻: ${searchKey}`);

      // 使用新的认证头（MD5签名）
      const headers = this.buildAuthHeaders();

      // 企查查新闻API参数
      const params = {
        key: this.appKey,
        searchKey: searchKey,
        pageIndex,
        pageSize,
      };

      const response = await this.httpClient.get<
        QichachaApiResponse<QichachaNewsResult | QichachaNewsResultItem[]> & {
          Paging?: { TotalRecords?: number };
        }
      >(
        API_ENDPOINTS.COMPANY_NEWS,
        {
          params,
          headers,
        }
      );

      // 检查响应状态
      console.log(`[QichachaService] 新闻API响应:`, JSON.stringify(response.data, null, 2));

      if (response.data.Status === '200' && response.data.Result) {
        const result = this.transformNewsResponse(
          response.data.Result,
          searchKey,
          pageIndex,
          pageSize,
          response.data.Paging?.TotalRecords
        );

        // 存入缓存
        setCachedNews(cacheKey, result);

        console.log(`[QichachaService] 新闻查询成功: ${searchKey}, 共${result.totalCount}条`);

        return {
          success: true,
          data: result,
          source: 'api',
        };
      }

      // API返回错误
      console.warn(`[QichachaService] 新闻API返回错误: ${response.data.Message}`);
      return {
        success: false,
        error: response.data.Message || '新闻查询失败',
        source: 'none',
      };
    } catch (error) {
      const errorMessage = this.handleApiError(error);
      console.error(`[QichachaService] 新闻查询失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        source: 'none',
      };
    }
  }

  /**
   * 查询企业工商详情（精确查询）
   *
   * @param searchKey 企业名称或统一社会信用代码
   * @returns 查询结果
   */
  async queryCompanyDetail(searchKey: string): Promise<QichachaDetailQueryResult> {
    // 检查是否启用
    if (!ENABLE_API) {
      return {
        success: false,
        error: '企查查API已禁用',
        source: 'none',
      };
    }

    // 检查配置
    if (!this.isConfigured()) {
      return {
        success: false,
        error: '企查查API未配置',
        source: 'none',
      };
    }

    // 1. 先检查缓存（使用detail前缀）
    const cacheKey = `detail_${searchKey}`;
    const cachedData = getCachedCompany(cacheKey);
    if (cachedData) {
      console.log(`[QichachaService] 详情命中缓存: ${searchKey}`);
      return {
        success: true,
        data: cachedData as QichachaCompanyDetail,
        source: 'cache',
      };
    }

    // 2. 调用API
    try {
      console.log(`[QichachaService] 开始查询详情: ${searchKey}`);

      // 使用新的认证头（MD5签名）
      const headers = this.buildAuthHeaders();

      // 企查查详情API参数
      const params = {
        key: this.appKey,
        searchKey: searchKey,
      };

      const response = await this.httpClient.get<QichachaApiResponse<QichachaDetailResult>>(
        API_ENDPOINTS.COMPANY_DETAIL,
        {
          params,
          headers,
        }
      );

      // 检查响应状态
      console.log(`[QichachaService] 详情API响应:`, JSON.stringify(response.data, null, 2));

      if (response.data.Status === '200' && response.data.Result) {
        const result = this.transformDetailResponse(response.data.Result, searchKey);

        // 存入缓存
        setCachedCompany(cacheKey, result);

        console.log(`[QichachaService] 详情查询成功: ${searchKey}`);

        return {
          success: true,
          data: result,
          source: 'api',
        };
      }

      // API返回错误
      console.warn(`[QichachaService] 详情API返回错误: ${response.data.Message}`);
      return {
        success: false,
        error: response.data.Message || '详情查询失败',
        source: 'none',
      };
    } catch (error) {
      const errorMessage = this.handleApiError(error);
      console.error(`[QichachaService] 详情查询失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        source: 'none',
      };
    }
  }

  /**
   * 处理API错误
   */
  private handleApiError(error: unknown): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data as any;

      if (status === 401) {
        return 'API密钥无效或已过期';
      }
      if (status === 403) {
        return 'API访问权限不足';
      }
      if (status === 429) {
        return 'API请求过于频繁，请稍后重试';
      }
      if (status === 500 || status === 502 || status === 503) {
        return '企查查服务暂时不可用';
      }
      if (errorData?.Message) {
        return errorData.Message;
      }
    }

    return error instanceof Error ? error.message : '未知错误';
  }
}

// ============================================
// 单例实例
// ============================================

let qichachaClientInstance: QichachaClient | null = null;

/**
 * 获取企查查API客户端实例（单例）
 */
export function getQichachaClient(): QichachaClient {
  if (!qichachaClientInstance) {
    qichachaClientInstance = new QichachaClient();
  }
  return qichachaClientInstance;
}

/**
 * 重置企查查API客户端实例（用于测试）
 */
export function resetQichachaClient(): void {
  qichachaClientInstance = null;
}

// ============================================
// 便捷函数
// ============================================

/**
 * 查询企业信息（便捷函数）
 *
 * @param companyName 企业名称
 * @returns 查询结果
 */
export async function queryCompany(companyName: string): Promise<QichachaQueryResult> {
  const client = getQichachaClient();
  return client.queryCompanyByKeyword(companyName);
}

/**
 * 模糊搜索企业列表（便捷函数）
 *
 * @param searchKey 搜索关键词（企业名称简称或关键词）
 * @param pageIndex 页码（默认1）
 * @param pageSize 每页数量（默认5）
 * @returns 模糊搜索结果列表
 */
export async function fuzzySearchCompany(
  searchKey: string,
  pageIndex: number = 1,
  pageSize: number = 5
): Promise<FuzzySearchQueryResult> {
  const client = getQichachaClient();
  return client.fuzzySearchCompany(searchKey, pageIndex, pageSize);
}

/**
 * 查询企业新闻信息（便捷函数）
 *
 * @param searchKey 企业名称或关键词
 * @param pageIndex 页码（默认1）
 * @param pageSize 每页数量（默认10）
 * @returns 查询结果
 */
export async function queryNews(
  searchKey: string,
  pageIndex: number = 1,
  pageSize: number = 10
): Promise<QichachaNewsQueryResult> {
  const client = getQichachaClient();
  return client.queryCompanyNews(searchKey, pageIndex, pageSize);
}

/**
 * 查询企业工商详情（便捷函数）
 *
 * @param searchKey 企业名称或统一社会信用代码
 * @returns 查询结果
 */
export async function queryDetail(searchKey: string): Promise<QichachaDetailQueryResult> {
  const client = getQichachaClient();
  return client.queryCompanyDetail(searchKey);
}

/**
 * 检查服务是否可用
 */
export function isServiceAvailable(): boolean {
  return ENABLE_API && getQichachaClient().isConfigured();
}
