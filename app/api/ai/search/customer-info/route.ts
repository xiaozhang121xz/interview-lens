/**
 * AI客户信息搜索 API
 *
 * @module app/api/ai/search/customer-info/route
 * @description 使用AI搜索客户/公司信息，返回结构化数据用于表单填充
 *
 * 数据源优先级：
 * - 企查查API（优先）：官方API，数据准确可靠
 * - AI联网搜索（补充）：Kimi/Claude联网搜索，补充网站等字段
 * - 天眼查爬虫（备用）：默认禁用，可通过环境变量启用
 *
 * 通过环境变量控制：
 * - ENABLE_QICHACHA_API: 是否启用企查查API（默认true）
 * - ENABLE_TIANYANCHA_CRAWLER: 是否启用天眼查爬虫（默认false）
 * - AZSHENTONG_MODEL: AI模型选择（kimi-k2.5/claude）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { getShentongClient } from '@/lib/ai/shentong-client';
import { verifyToken } from '@/lib/auth';
import {
  customerInfoSearchSchema,
  customerInfoSearchResponseSchema,
  type CustomerInfoSearchInput,
  type CustomerInfoSearchResponse,
} from '@/lib/validations/search';
import {
  queryCompany as queryQichachaCompany,
  queryNews as queryQichachaNews,
  queryDetail as queryQichachaDetail,
  type QichachaCompanyInfo,
  type QichachaNewsInfo,
  type QichachaCompanyDetail,
} from '@/lib/services/qichacha-service';
import {
  queryCompany as queryTianyanchaCompany,
  queryContactInfo,
  type TianyanchaCompanyInfo,
  type TianyanchaContactInfo,
} from '@/lib/services/tianyancha-service';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从请求中获取当前用户ID
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    return payload?.id || null;
  } catch {
    return null;
  }
}

/**
 * 从请求头或请求体获取用户ID
 */
async function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string | null> {
  // 优先从Authorization header获取
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  // 从请求体获取
  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  return null;
}

// ============================================
// AI 搜索客户信息 - 支持Kimi/Claude切换
// ============================================

// Kimi搜索公司全称系统提示词（第一步：获取准确全称）
const KIMI_SEARCH_FULLNAME_PROMPT = `你是一个企业信息查询助手。用户输入的可能是公司简称或不完整的名称。

请联网搜索，找到该公司的**准确全称**（工商注册名称）。

输出要求：
- 必须联网搜索获取实时数据
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 如果找到多个匹配的公司，选择知名度最高或最可能的那家

输出JSON结构：
{
  "fullName": "公司全称（工商注册名称）",
  "confidence": "high/medium/low"
}

注意事项：
- 优先搜索工商注册信息
- 知名公司confidence设为high
- 不太知名或可能有歧义的confidence设为medium
- 如果完全找不到，confidence设为low，fullName可以为空`;

// Kimi联网搜索系统提示词（第二步：获取详细信息）
const KIMI_SEARCH_SYSTEM_PROMPT = `你是一个企业信息搜索专家。请联网搜索提供的公司名称，获取最新的实时信息。

输出要求：
- 必须联网搜索获取实时数据
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 只提取明确的信息，不确定的字段留空或不包含

输出JSON结构：
{
  "description": "公司简介（公司业务介绍，做什么的、产品/服务，不超过200字）",
  "industry": "所属行业",
  "website": "官网地址（完整URL，https://开头，如果不确定可以留空）",
  "address": "公司地址（如果不确定可以留空）",
  "background": "客户背景（公司成立时间、规模、资质、上市情况等硬性信息，不超过150字）",
  "confidence": "high/medium/low（信息可靠程度评估）
}

注意事项：
- 优先使用官网和权威来源的信息
- 多个来源时选择最新、最权威的信息
- description专注于业务介绍，background专注于公司硬性信息
- 知名公司信息confidence设为high
- 不太知名的公司confidence设为medium或low
- 网站URL必须是完整的https://开头的地址
- 不确定的信息宁可不填，也不要编造`;

// Claude知识库系统提示词（原有）
const CLAUDE_SEARCH_SYSTEM_PROMPT = `你是一个企业信息搜索专家。请根据提供的公司名称，尽可能提供详细的公司信息。

输出要求：
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 只提取明确的信息，不确定的字段留空或不包含
- 如果不了解该公司，可以基于公司名称推断可能的行业和业务

输出JSON结构：
{
  "description": "公司简介（公司业务介绍，做什么的、产品/服务，不超过200字）",
  "industry": "所属行业",
  "website": "官网地址（完整URL，https://开头，如果不确定可以留空）",
  "address": "公司地址（如果不确定可以留空）",
  "background": "客户背景（公司成立时间、规模、资质、上市情况等硬性信息，不超过150字）",
  "confidence": "high/medium/low（信息可靠程度评估）
}

注意事项：
- 如果是知名公司，提供准确信息，confidence设为high
- 如果是不太知名的公司，基于行业和名称推断，confidence设为medium或low
- description专注于业务介绍，background专注于公司硬性信息
- 网站URL必须是完整的https://开头的地址
- 不确定的信息宁可不填，也不要编造`;

// Kimi新闻舆情整合系统提示词
const NEWS_INTEGRATION_PROMPT = `你是一个企业信息分析专家。请分析以下企业的新闻舆情信息，提炼出对客户评估有价值的关键信息。

企业名称：{companyName}
新闻数据：{newsData}

请输出以下JSON格式：
{
  "businessSummary": "仅基于输入的新闻字段和链接正文归纳出的主营业务描述，不超过120字；如果信息不足，明确写信息不足，禁止补充未提供内容",
  "keyEvents": "近期重要事件摘要（不超过200字，包括重大合作、融资、产品发布、获奖等正面事件，以及风险事件）",
  "riskAlerts": "潜在风险提示（不超过150字，如法律诉讼、经营异常、负面舆情等，如果没有明显风险可留空）",
  "sentimentOverview": "舆情整体评价（positive/neutral/negative）",
  "newsHighlights": [
    {
      "title": "新闻标题",
      "summary": "新闻摘要（不超过50字）",
      "date": "发布日期",
      "sentiment": "情感倾向（positive/neutral/negative）",
      "url": "新闻链接（如有）"
    }
  ],
  "recommendation": "基于新闻信息的客户评估建议（不超过100字）"
}

要求：
- 只能基于输入中提供的字段和链接正文内容分析，严禁补充未输入的事实
- 如果某条新闻只有标题、链接、发布时间、情感、分类而没有正文，就只能根据这些信息谨慎归纳
- 若提供了链接正文内容，优先结合正文内容判断主营业务
- 重点关注近1年内的新闻
- 正面新闻和负面新闻都要客观呈现
- 突出与业务合作相关的事件
- 对于负面信息要给出具体的风险提示
- 不确定的信息标注"待核实"
- newsHighlights最多返回5条最重要的新闻`;

const ARTICLE_FETCH_TIMEOUT_MS = 10000;
const MAX_ARTICLE_TEXT_LENGTH = 4000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArticleText(html: string): string {
  const preferredBlocks = [
    /<article[\s\S]*?>([\s\S]*?)<\/article>/i,
    /<main[\s\S]*?>([\s\S]*?)<\/main>/i,
    /<body[\s\S]*?>([\s\S]*?)<\/body>/i,
  ];

  for (const pattern of preferredBlocks) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const text = stripHtml(match[1]);
      if (text.length > 200) {
        return text.slice(0, MAX_ARTICLE_TEXT_LENGTH);
      }
    }
  }

  return stripHtml(html).slice(0, MAX_ARTICLE_TEXT_LENGTH);
}

async function fetchLinkedArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CustomerSearchBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    const text = extractArticleText(html);
    return text.length > 0 ? text : null;
  } catch (error) {
    console.warn('[Customer Search] 获取新闻链接内容失败:', url, error);
    return null;
  }
}

async function enrichNewsWithLinkedContent(newsData: QichachaNewsInfo): Promise<Array<{
  title: string;
  url?: string | null;
  publishTime?: string | null;
  emotionType?: 'positive' | 'neutral' | 'negative' | null;
  category?: string | null;
  content?: string | null;
  linkedContent?: string | null;
}>> {
  return Promise.all(
    newsData.news.slice(0, 10).map(async (item) => ({
      title: item.title,
      url: item.url,
      publishTime: item.publishTime,
      emotionType: item.emotionType,
      category: item.categoryDesc || item.category,
      content: item.content || item.summary,
      linkedContent: item.url ? await fetchLinkedArticleContent(item.url) : null,
    }))
  );
}

// ============================================
// 行业映射工具
// ============================================

/**
 * 从经营范围或企业类型中提取行业
 *
 * @param businessScope 经营范围
 * @param companyType 企业类型
 * @returns 行业名称
 */
function extractIndustry(businessScope: string | null | undefined, companyType: string | null | undefined): string | undefined {
  // 行业关键词映射表
  const industryKeywords: Record<string, string[]> = {
    '互联网': ['互联网', '网络科技', '信息技术', '软件开发', '计算机', '数据', '云计算', '人工智能', 'AI'],
    '金融': ['金融', '投资', '基金', '资产管理', '证券', '保险', '银行', '支付'],
    '教育': ['教育', '培训', '学校', '学院', '在线教育'],
    '医疗': ['医疗', '医药', '生物', '健康', '医院', '制药', '医疗器械'],
    '制造业': ['制造', '生产', '加工', '工厂', '机械', '设备', '材料'],
    '零售': ['零售', '电商', '贸易', '商贸', '销售', '超市'],
    '房地产': ['房地产', '置业', '物业', '建筑', '装饰', '装修'],
    '能源': ['能源', '电力', '新能源', '石油', '天然气', '环保'],
    '交通': ['交通', '物流', '运输', '快递', '航空', '铁路'],
    '传媒': ['传媒', '广告', '文化', '影视', '媒体', '娱乐'],
  };

  const searchText = `${businessScope || ''} ${companyType || ''}`;

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return industry;
      }
    }
  }

  // 如果没有匹配，返回企业类型（比没有好）
  return companyType || undefined;
}

function cleanScopeItem(item: string): string {
  return item
    .replace(/^一般项目[:：]/, '')
    .replace(/^许可项目[:：]/, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[.;。]+$/g, '')
    .trim();
}

function buildBusinessDescription(
  qichachaData: QichachaCompanyInfo | null,
  fallbackDescription?: string
): string | undefined {
  const scope = qichachaData?.businessScope;
  if (!scope) {
    return fallbackDescription || undefined;
  }

  const scopeItems = scope
    .split(/[；;]/)
    .map(cleanScopeItem)
    .filter(Boolean);

  const auxiliaryKeywords = [
    '广告设计',
    '代理',
    '会议及展览服务',
    '企业管理咨询',
    '社会经济咨询服务',
    '计算机及通讯设备租赁',
    '计算机软硬件及辅助设备零售',
    '计算机软硬件及辅助设备批发',
  ];

  const primaryItems = scopeItems.filter(
    (item) => !auxiliaryKeywords.some((keyword) => item.includes(keyword))
  );

  const uniquePrimaryItems = Array.from(new Set(primaryItems)).slice(0, 10);
  const uniqueAuxiliaryItems = Array.from(
    new Set(scopeItems.filter((item) => auxiliaryKeywords.some((keyword) => item.includes(keyword))))
  ).slice(0, 4);

  if (uniquePrimaryItems.length === 0) {
    return fallbackDescription || scope;
  }

  const primaryText = uniquePrimaryItems.join('、');
  const auxiliaryText = uniqueAuxiliaryItems.length > 0
    ? `。同时提供${uniqueAuxiliaryItems.join('、')}等配套服务`
    : '';

  return `公司主要从事${primaryText}等业务${auxiliaryText}`;
}

function buildCustomerBackground(
  qichachaData: QichachaCompanyInfo | null,
  aiBackground?: string
): string | undefined {
  if (!qichachaData) {
    return aiBackground || undefined;
  }

  const parts = [
    qichachaData.companyName ? `企业：${qichachaData.companyName}` : null,
    qichachaData.establishDate ? `成立于${qichachaData.establishDate}` : null,
    qichachaData.companyType ? `企业类型：${qichachaData.companyType}` : null,
    qichachaData.registCapi ? `注册资本：${qichachaData.registCapi}` : null,
    qichachaData.companyStatus ? `状态：${qichachaData.companyStatus}` : null,
    qichachaData.industry ? `所属行业：${qichachaData.industry}` : null,
    qichachaData.personScope ? `人员规模：${qichachaData.personScope}` : null,
    qichachaData.insuredCount ? `参保人数：${qichachaData.insuredCount}` : null,
    qichachaData.tags?.length ? `企业标签：${qichachaData.tags.join('、')}` : null,
    qichachaData.branchCount ? `分支机构：${qichachaData.branchCount}家` : null,
    qichachaData.province && qichachaData.city ? `所在地：${qichachaData.province}${qichachaData.city}` : null,
  ].filter(Boolean);

  return parts.join('；') || aiBackground || undefined;
}

function buildCustomerNotes(qichachaData: QichachaCompanyInfo | null): string | undefined {
  if (!qichachaData) {
    return undefined;
  }

  const sections: string[] = [];

  if (qichachaData.investors?.length) {
    sections.push(`投资方/股东摘要：${qichachaData.investors.slice(0, 8).join('、')}`);
  }

  if (qichachaData.recentChanges?.length) {
    const changes = qichachaData.recentChanges
      .slice(0, 3)
      .map((item) => `${item.changeDate || '未知日期'} ${item.projectName}${item.afterContent ? `：${item.afterContent}` : ''}`)
      .join('；');
    sections.push(`近期变更：${changes}`);
  }

  if (qichachaData.contactPhone || qichachaData.contactEmail) {
    sections.push(
      `工商联系方式：${[
        qichachaData.contactPhone ? `电话 ${qichachaData.contactPhone}` : null,
        qichachaData.contactEmail ? `邮箱 ${qichachaData.contactEmail}` : null,
      ].filter(Boolean).join('，')}`
    );
  }

  return sections.length > 0 ? sections.join('\n') : undefined;
}

async function summarizeNotesToLimit(
  notes: string | undefined,
  maxLength: number,
  modelType: string
): Promise<string | undefined> {
  if (!notes) {
    return undefined;
  }

  const trimmed = notes.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const summaryPrompt = `请将以下企业备注总结压缩到${maxLength}字以内。

要求：
- 只保留最重要的工商与经营信息
- 优先保留经营范围、股东/投资方摘要、近期变更、工商联系方式等关键信息
- 使用简洁、自然的中文表达
- 不要分点，不要加标题，不要补充原文没有的信息
- 输出纯文本
- 最终结果必须严格控制在${maxLength}字以内

原始备注：
${trimmed}`;

  const strictPrompt = `请把下面这段企业备注进一步压缩到${maxLength}字以内，保留最关键事实，输出纯文本且不要补充新信息：

${trimmed}`;

  try {
    if (modelType === 'claude') {
      const aiClient = getAIClient();
      if (!aiClient.isConfigured()) {
        return trimmed;
      }

      const response = await aiClient.generateCompletion('', [
        { role: 'user', content: summaryPrompt },
      ], {
        maxTokens: 800,
        temperature: 0.2,
      });

      let summarized = response.success ? response.content.trim() : trimmed;

      if (summarized.length > maxLength) {
        const secondPass = await aiClient.generateCompletion('', [
          { role: 'user', content: `${strictPrompt}\n\n待压缩文本：\n${summarized}` },
        ], {
          maxTokens: 600,
          temperature: 0.1,
        });

        if (secondPass.success && secondPass.content.trim()) {
          summarized = secondPass.content.trim();
        }
      }

      return summarized;
    }

    const shentongClient = getShentongClient();
    if (!shentongClient.isConfigured()) {
      return trimmed;
    }

    const response = await shentongClient.generateCompletion('', [
      { role: 'user', content: summaryPrompt },
    ], {
      maxTokens: 800,
      temperature: 0.2,
    });

    let summarized = response.success ? response.content.trim() : trimmed;

    if (summarized.length > maxLength) {
      const secondPass = await shentongClient.generateCompletion('', [
        { role: 'user', content: `${strictPrompt}\n\n待压缩文本：\n${summarized}` },
      ], {
        maxTokens: 600,
        temperature: 0.1,
      });

      if (secondPass.success && secondPass.content.trim()) {
        summarized = secondPass.content.trim();
      }
    }

    return summarized;
  } catch (error) {
    console.error('[Customer Search] 备注压缩总结失败:', error);
    return trimmed;
  }
}

// ============================================
// 数据合并函数
// ============================================

/**
 * 合并企业数据
 *
 * 优先级规则：企查查优先 + AI补充 + 天眼查备用
 *
 * @param qichachaData 企查查企业信息
 * @param tianyanchaData 天眼查企业信息（备用）
 * @param aiData AI搜索数据
 * @param options 配置选项
 */
function mergeCustomerData(
  qichachaData: QichachaCompanyInfo | null,
  tianyanchaData: TianyanchaCompanyInfo | null,
  aiData: CustomerInfoSearchResponse | null,
  options: {
    enableTianyancha?: boolean;
  } = {}
): CustomerInfoSearchResponse {
  const result: CustomerInfoSearchResponse = {};
  const { enableTianyancha = false } = options;

  // 1. 公司简介：优先将工商经营范围整理成覆盖主要主营业务的业务描述
  result.description = buildBusinessDescription(
    qichachaData,
    (enableTianyancha ? tianyanchaData?.businessScope : null) || aiData?.description || undefined
  );

  // 2. 行业：从经营范围/企业类型提取 > 天眼查行业 > AI
  const qichachaIndustry = extractIndustry(
    qichachaData?.businessScope,
    qichachaData?.companyType
  );
  result.industry =
    qichachaIndustry ||
    (enableTianyancha ? tianyanchaData?.industry : null) ||
    aiData?.industry ||
    undefined;

  // 3. 公司网站：仅AI提供（企查查/天眼查均无此字段）
  result.website = aiData?.website || undefined;

  // 4-6. 联系人和联系方式：用户要求不再自动提取
  // result.contactName = undefined;
  // result.phone = undefined;
  // result.email = undefined;

  // 7. 公司地址：企查查地址 > AI地址
  result.address =
    qichachaData?.address ||
    aiData?.address ||
    undefined;

  // 8. 客户背景：企查查数据组合 > 天眼查组合 > AI
  const qichachaBackground = buildCustomerBackground(qichachaData, '');

  const tianyanchaBackground = enableTianyancha && tianyanchaData
    ? [
        tianyanchaData.companyName ? `企业：${tianyanchaData.companyName}` : null,
        tianyanchaData.establishDate ? `成立于${tianyanchaData.establishDate}` : null,
        tianyanchaData.companyType ? `企业类型：${tianyanchaData.companyType}` : null,
        tianyanchaData.socialCreditCode
          ? `统一社会信用代码：${tianyanchaData.socialCreditCode}`
          : null,
        tianyanchaData.insuranceCount ? `参保人数：${tianyanchaData.insuranceCount}` : null,
        tianyanchaData.hasBranch ? '有分支机构' : null,
      ]
        .filter(Boolean)
        .join('；')
    : '';

  result.background =
    qichachaBackground ||
    tianyanchaBackground ||
    aiData?.background ||
    undefined;

  // 8.1 备注：保留投资方、近期变更和工商联系方式等辅助线索
  result.notes = buildCustomerNotes(qichachaData) || aiData?.notes || undefined;

  // 10. 来源标识
  const sources: string[] = [];
  if (qichachaData?.detailUrl) {
    sources.push(qichachaData.detailUrl);
  }
  if (enableTianyancha && tianyanchaData?.detailUrl) {
    sources.push(tianyanchaData.detailUrl);
  }
  if (aiData?.sources?.length) {
    sources.push(...aiData.sources);
  }
  result.sources = sources.length > 0 ? sources : undefined;

  // 11. 置信度：有企查查数据为高置信度
  if (qichachaData?.companyName) {
    result.confidence = 'high';
  } else if (enableTianyancha && tianyanchaData?.companyName) {
    result.confidence = 'high';
  } else if (aiData?.confidence) {
    result.confidence = aiData.confidence;
  } else {
    result.confidence = 'low';
  }

  return result;
}

/**
 * 使用Kimi联网搜索获取公司全称（第一步）
 *
 * @param inputName 用户输入的公司名称（可能是简称）
 * @returns 公司全称和置信度
 */
async function searchCompanyFullName(
  inputName: string
): Promise<{ fullName: string; confidence: 'high' | 'medium' | 'low' }> {
  const shentongClient = getShentongClient();

  // 检查神通客户端是否配置
  if (!shentongClient.isConfigured()) {
    console.log('[Customer Search] Kimi未配置，使用原始名称');
    return { fullName: inputName, confidence: 'low' };
  }

  console.log(`[Customer Search] 第一步：AI搜索公司全称 "${inputName}"`);

  try {
    const response = await shentongClient.generateCompletion(KIMI_SEARCH_FULLNAME_PROMPT, [
      { role: 'user', content: `请搜索 "${inputName}" 的公司全称。` },
    ]);

    if (!response.success) {
      console.log('[Customer Search] AI搜索全称失败，使用原始名称');
      return { fullName: inputName, confidence: 'low' };
    }

    // 解析JSON响应
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[Customer Search] AI响应格式无效，使用原始名称');
      return { fullName: inputName, confidence: 'low' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 如果找到全称且置信度不为low
    if (parsed.fullName && parsed.fullName.trim().length > 0 && parsed.confidence !== 'low') {
      console.log(`[Customer Search] 找到公司全称: "${parsed.fullName}" (置信度: ${parsed.confidence})`);
      return {
        fullName: parsed.fullName.trim(),
        confidence: parsed.confidence || 'medium',
      };
    }

    // 未找到或置信度低，使用原始名称
    console.log('[Customer Search] 未找到有效全称，使用原始名称');
    return { fullName: inputName, confidence: 'low' };
  } catch (error) {
    console.error('[Customer Search] 搜索全称异常:', error);
    return { fullName: inputName, confidence: 'low' };
  }
}

/**
 * 使用Kimi联网搜索客户信息（第二步）
 */
async function searchWithKimi(
  companyName: string,
  industry?: string
): Promise<CustomerInfoSearchResponse> {
  const shentongClient = getShentongClient();

  // 检查神通客户端是否配置
  if (!shentongClient.isConfigured()) {
    throw new Error('API_NOT_CONFIGURED');
  }

  // 构建用户提示词
  const userPrompt = industry
    ? `请搜索 "${companyName}"（${industry}行业）的公司信息。`
    : `请搜索 "${companyName}" 的公司信息。`;

  // 调用神通API（Kimi模型）
  const response = await shentongClient.generateCompletion(KIMI_SEARCH_SYSTEM_PROMPT, [
    { role: 'user', content: userPrompt },
  ]);

  // 处理AI响应
  if (!response.success) {
    if (response.errorType === 'rate_limit') {
      throw new Error('RATE_LIMIT');
    }
    if (response.errorType === 'service_unavailable') {
      throw new Error('SERVICE_UNAVAILABLE');
    }
    throw new Error(response.error || 'AI服务错误');
  }

  // 解析JSON响应
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('INVALID_RESPONSE');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = customerInfoSearchResponseSchema.parse(parsed);

  return validated;
}

/**
 * 使用Claude AI知识库搜索客户信息（原有逻辑）
 */
async function searchWithClaude(
  companyName: string,
  industry?: string
): Promise<CustomerInfoSearchResponse> {
  const aiClient = getAIClient();

  // 检查AI客户端是否配置
  if (!aiClient.isConfigured()) {
    throw new Error('API_NOT_CONFIGURED');
  }

  // 构建用户提示词
  const userPrompt = industry
    ? `请提供 "${companyName}"（${industry}行业）的公司信息。`
    : `请提供 "${companyName}" 的公司信息。`;

  // 调用Claude AI服务
  const response = await aiClient.generateCompletion(CLAUDE_SEARCH_SYSTEM_PROMPT, [
    { role: 'user', content: userPrompt },
  ]);

  // 处理AI响应
  if (!response.success) {
    if (response.errorType === 'rate_limit') {
      throw new Error('RATE_LIMIT');
    }
    if (response.errorType === 'service_unavailable') {
      throw new Error('SERVICE_UNAVAILABLE');
    }
    throw new Error(response.error || 'AI服务错误');
  }

  // 解析JSON响应
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('INVALID_RESPONSE');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = customerInfoSearchResponseSchema.parse(parsed);

  return validated;
}

/**
 * 使用Kimi调整联系人背景信息
 * 将天眼查提取的原始文字调整为更易读的格式
 */
async function refineContactBackgroundWithKimi(
  contactName: string,
  companyName: string,
  rawBackground: string
): Promise<string> {
  const shentongClient = getShentongClient();

  if (!shentongClient.isConfigured()) {
    return rawBackground; // 如果Kimi不可用，返回原始文字
  }

  const prompt = `请将以下联系人信息整理为简洁、专业的背景描述（不超过150字）：

联系人：${contactName}
企业：${companyName}
原始信息：${rawBackground}

要求：
- 提取关键职位、从业经历、专业背景
- 使用简洁的商务语言
- 不要添加原文中没有的信息`;

  try {
    const response = await shentongClient.generateCompletion('', [
      { role: 'user', content: prompt },
    ]);

    if (response.success && response.content) {
      return response.content.trim().slice(0, 150);
    }
  } catch (error) {
    console.error('[Customer Search] Kimi调整联系人背景失败:', error);
  }

  return rawBackground;
}

/**
 * 使用Kimi整合新闻舆情信息
 *
 * @param companyName 企业名称
 * @param newsData 新闻数据
 * @returns 整合后的新闻信息
 */
async function integrateNewsWithKimi(
  companyName: string,
  newsData: QichachaNewsInfo
): Promise<{
  businessSummary?: string;
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
}> {
  const shentongClient = getShentongClient();

  if (!shentongClient.isConfigured()) {
    // 如果Kimi不可用，返回简单的新闻摘要
    return {
      businessSummary: undefined,
      keyEvents: '暂无新闻整合分析',
      newsHighlights: newsData.news.slice(0, 5).map((item) => ({
        title: item.title,
        summary: item.summary?.slice(0, 50) || undefined,
        date: item.publishTime || undefined,
        url: item.url || undefined,
      })),
      sentimentOverview: 'neutral',
    };
  }

  const enrichedNews = await enrichNewsWithLinkedContent(newsData);

  const newsSummary = enrichedNews
    .map((item, idx) => [
      `新闻${idx + 1}:`,
      `Title: ${item.title || '无'}`,
      `Url: ${item.url || '无'}`,
      `PublishTime: ${item.publishTime || '无'}`,
      `EmotionType: ${item.emotionType || '无'}`,
      `Category: ${item.category || '无'}`,
      `Content: ${item.content || '无'}`,
      `LinkedContent: ${item.linkedContent || '无'}`,
    ].join('\n'))
    .join('\n\n');

  const prompt = NEWS_INTEGRATION_PROMPT
    .replace('{companyName}', companyName)
    .replace('{newsData}', newsSummary);

  try {
    const response = await shentongClient.generateCompletion('', [
      { role: 'user', content: prompt },
    ]);

    if (response.success && response.content) {
      // 解析JSON响应
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    }
  } catch (error) {
    console.error('[Customer Search] Kimi新闻整合失败:', error);
  }

  // 返回默认值
  return {
    businessSummary: undefined,
    keyEvents: '新闻整合分析失败',
    newsHighlights: newsData.news.slice(0, 5).map((item) => ({
      title: item.title,
      summary: item.summary?.slice(0, 50) || undefined,
      date: item.publishTime || undefined,
      url: item.url || undefined,
    })),
    sentimentOverview: 'neutral',
  };
}

/**
 * 搜索客户信息
 *
 * 新流程：AI先获取公司全称 → 用全称查企查查 → AI补充其他信息
 *
 * @param companyName 企业名称（可能是简称）
 * @param industry 行业
 * @param contactName 联系人姓名
 * @param includeNews 是否包含新闻舆情
 */
async function searchCustomerInfo(
  companyName: string,
  industry?: string,
  contactName?: string,
  includeNews: boolean = false
): Promise<CustomerInfoSearchResponse> {
  const modelType = process.env.AZSHENTONG_MODEL || 'kimi-k2.5';
  const enableQichacha = process.env.ENABLE_QICHACHA_API !== 'false';
  const enableTianyancha = process.env.ENABLE_TIANYANCHA_CRAWLER === 'true';

  console.log(`[Customer Search] 开始搜索: ${companyName}`);
  if (contactName) {
    console.log(`[Customer Search] 联系人: ${contactName}`);
  }
  console.log(`[Customer Search] 数据源: 企查查=${enableQichacha}, 天眼查=${enableTianyancha}, AI=${modelType}, 新闻=${includeNews}`);

  // ========================================
  // 第一步：AI联网搜索获取公司全称
  // ========================================
  let actualCompanyName = companyName;
  let fullNameConfidence: 'high' | 'medium' | 'low' = 'low';

  if (modelType === 'kimi-k2.5') {
    const fullNameResult = await searchCompanyFullName(companyName);
    actualCompanyName = fullNameResult.fullName;
    fullNameConfidence = fullNameResult.confidence;
  }

  console.log(`[Customer Search] 使用公司名称查询: "${actualCompanyName}"`);

  // ========================================
  // 第二步：用全称并行查询企查查、天眼查、AI补充信息、新闻
  // ========================================
  const promises: Promise<any>[] = [];

  // 企查查API（用全称查询）
  if (enableQichacha) {
    promises.push(queryQichachaCompany(actualCompanyName));
  } else {
    promises.push(Promise.resolve({ success: false, source: 'none' }));
  }

  // 天眼查爬虫（备用，默认禁用）
  if (enableTianyancha) {
    promises.push(queryTianyanchaCompany(actualCompanyName));
  } else {
    promises.push(Promise.resolve({ success: false, source: 'none' }));
  }

  // AI联网搜索（补充网站等信息）
  promises.push(
    modelType === 'claude'
      ? searchWithClaude(actualCompanyName, industry)
      : searchWithKimi(actualCompanyName, industry)
  );

  // 新闻舆情查询（可选）
  if (includeNews && enableQichacha) {
    promises.push(queryQichachaNews(actualCompanyName, 1, 10));
  } else {
    promises.push(Promise.resolve({ success: false, source: 'none' }));
  }

  const [qichachaResult, tianyanchaResult, aiResult, newsResult] = await Promise.allSettled(promises);

  // 提取成功的结果
  const qichachaData =
    qichachaResult.status === 'fulfilled' && qichachaResult.value.success
      ? qichachaResult.value.data ?? null
      : null;

  const tianyanchaData =
    tianyanchaResult.status === 'fulfilled' && tianyanchaResult.value.success
      ? tianyanchaResult.value.data ?? null
      : null;

  const aiData = aiResult.status === 'fulfilled' ? aiResult.value : null;

  // 新闻数据
  const newsData =
    newsResult.status === 'fulfilled' && newsResult.value.success
      ? newsResult.value.data ?? null
      : null;

  // 日志记录
  if (qichachaData) {
    console.log('[Customer Search] 企查查数据获取成功');
  } else {
    console.log('[Customer Search] 企查查数据获取失败');
  }

  if (enableTianyancha && tianyanchaData) {
    console.log('[Customer Search] 天眼查数据获取成功');
  }

  if (aiData) {
    console.log('[Customer Search] AI补充数据获取成功');
  } else {
    console.log('[Customer Search] AI补充数据获取失败');
  }

  if (newsData) {
    console.log(`[Customer Search] 新闻数据获取成功，共${newsData.totalCount}条`);
  }

  // ========================================
  // 第三步：合并数据（企查查优先 + AI补充 + 天眼查备用）
  // ========================================
  const mergedData = mergeCustomerData(qichachaData, tianyanchaData, aiData, {
    enableTianyancha,
  });

  // 如果全称置信度低，整体置信度也降低
  if (fullNameConfidence === 'low' && mergedData.confidence !== 'low') {
    mergedData.confidence = 'medium';
  }

  // ========================================
  // 第四步：如果包含新闻，整合新闻数据
  // ========================================
  if (includeNews && newsData && newsData.news.length > 0) {
    console.log('[Customer Search] 使用Kimi整合新闻数据');

    const newsIntegrated = await integrateNewsWithKimi(actualCompanyName, newsData);

    // 添加新闻字段到响应中
    mergedData.businessSummary = newsIntegrated.businessSummary?.trim() || undefined;
    if (mergedData.businessSummary) {
      mergedData.description = mergedData.description
        ? `${mergedData.description}；新闻舆情分析主营业务：${mergedData.businessSummary}`
        : `新闻舆情分析主营业务：${mergedData.businessSummary}`;
    }
    mergedData.keyEvents = newsIntegrated.keyEvents;
    mergedData.riskAlerts = newsIntegrated.riskAlerts;
    mergedData.sentimentOverview = newsIntegrated.sentimentOverview;
    mergedData.newsHighlights = newsIntegrated.newsHighlights;
    mergedData.recommendation = newsIntegrated.recommendation;
  }

  if (mergedData.notes && mergedData.notes.trim().length > 1000) {
    console.log('[Customer Search] 备注超过1000字，开始使用AI压缩总结');
    mergedData.notes = await summarizeNotesToLimit(mergedData.notes, 1000, modelType);
    console.log(`[Customer Search] 备注压缩完成，当前长度: ${mergedData.notes?.length || 0}`);
  }

  mergedData.fullName = actualCompanyName;

  console.log(`[Customer Search] 数据合并完成，置信度: ${mergedData.confidence}`);

  return mergedData;
}

// ============================================
// POST - 搜索客户信息
// ============================================

/**
 * @swagger
 * /api/ai/search/customer-info:
 *   post:
 *     summary: AI搜索客户信息
 *     description: 根据客户名称/公司名称搜索网络，自动提取公司简介、联系方式等信息，用于表单智能填充。
 *     tags: [AI, Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *             properties:
 *               companyName:
 *                 type: string
 *                 maxLength: 100
 *                 description: 客户/公司名称
 *               industry:
 *                 type: string
 *                 maxLength: 50
 *                 description: 业务领域/行业
 *     responses:
 *       200:
 *         description: 搜索成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     industry:
 *                       type: string
 *                     website:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     email:
 *                       type: string
 *                     address:
 *                       type: string
 *                     background:
 *                       type: string
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: string
 *                     confidence:
 *                       type: string
 *                       enum: [high, medium, low]
 *       400:
 *         description: 请求参数验证失败
 *       429:
 *         description: 搜索服务限流
 *       500:
 *         description: API配置错误
 *       503:
 *         description: 搜索服务不可用
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: CustomerInfoSearchInput = await request.json();

    // 获取用户ID（可选验证）
    const userId = await extractUserId(request, body);

    // 验证请求体
    const validationResult = customerInfoSearchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '请求参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { companyName, industry, contactName, includeNews } = validationResult.data;

    // 调用搜索服务（包含新闻查询）
    const customerInfo = await searchCustomerInfo(companyName, industry, contactName, includeNews);

    return NextResponse.json<ApiResponse<CustomerInfoSearchResponse>>(
      {
        success: true,
        data: customerInfo,
        message: '客户信息搜索成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Customer Search API] Error:', error);

    // 错误类型处理
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'API_NOT_CONFIGURED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '搜索服务未配置，请联系管理员',
          error: { code: 'CONFIG_ERROR', message: 'API密钥未配置' },
        },
        { status: 500 }
      );
    }

    if (errorMessage === 'INVALID_RESPONSE') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '搜索结果解析失败，请重试',
          error: { code: 'PARSE_ERROR', message: 'AI返回的数据格式不正确' },
        },
        { status: 500 }
      );
    }

    if (errorMessage === 'RATE_LIMIT') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '搜索服务请求过于频繁，请稍后重试',
          error: { code: 'RATE_LIMIT', message: '搜索服务限流' },
        },
        { status: 429 }
      );
    }

    if (errorMessage === 'SERVICE_UNAVAILABLE') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '搜索服务暂时不可用，请稍后重试',
          error: { code: 'SERVICE_UNAVAILABLE', message: '搜索服务不可用' },
        },
        { status: 503 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '搜索结果验证失败',
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR', message: errorMessage },
      },
      { status: 500 }
    );
  }
}
