/**
 * 企查查数据缓存服务
 *
 * @module lib/services/qichacha-cache
 * @description 临时缓存企查查API查询结果，减少重复查询，降低API调用成本
 *
 * 缓存策略：
 * - 存储方式：内存存储（node-cache）
 * - 过期时间：24 小时
 * - 目的：减少重复查询，降低API调用成本
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeCache = require('node-cache');

// 缓存实例：24小时过期
const cache = new NodeCache({
  stdTTL: parseInt(process.env.QICHACHA_CACHE_TTL || '86400', 10), // 默认24小时
  checkperiod: 3600, // 每小时检查一次过期键
  maxKeys: 1000, // 最多缓存1000家企业
});

// 缓存键前缀
const CACHE_PREFIX = 'qichacha:';
const NEWS_CACHE_PREFIX = 'qichacha_news:';

// ============================================
// 类型定义
// ============================================

/**
 * 企查查企业信息数据结构
 * 映射企查查API返回字段
 */
export interface QichachaCompanyInfo {
  queryTime: string;           // 查询时间（ISO格式）
  queryName: string;           // 查询关键词
  keyNo: string | null;        // 企业唯一标识（企查查内部ID）
  companyName: string | null;  // 企业名称
  legalPerson: string | null;  // 法定代表人
  establishDate: string | null; // 成立日期
  registerNumber: string | null; // 工商注册号
  socialCreditCode: string | null; // 统一社会信用代码
  orgCode: string | null;      // 组织机构代码
  registCapi: string | null;   // 注册资本
  recCap: string | null;       // 实缴资本
  address: string | null;      // 注册地址
  businessScope: string | null; // 经营范围
  businessTermStart: string | null; // 营业期限开始
  businessTermEnd: string | null;   // 营业期限结束
  companyType: string | null;  // 企业类型
  companyStatus: string | null; // 企业状态（在业/注销/吊销等）
  registerAuthority: string | null; // 登记机关
  province: string | null;     // 省份
  city: string | null;         // 城市
  district: string | null;     // 区县
  checkDate: string | null;    // 核准日期
  updatedDate: string | null;  // 更新时间
  industry: string | null;     // 行业大类/细分类
  subIndustry: string | null;  // 子行业
  personScope: string | null;  // 人员规模
  insuredCount: string | null; // 参保人数
  tags: string[] | null;       // 企业标签
  branchCount: number | null;  // 分支机构数量
  contactPhone: string | null; // 联系电话
  contactEmail: string | null; // 联系邮箱
  investors: string[] | null;  // 投资方/股东摘要
  recentChanges: Array<{
    projectName: string;
    beforeContent: string | null;
    afterContent: string | null;
    changeDate: string | null;
  }> | null;
  detailUrl: string | null;    // 详情页URL（企查查链接）
}

/**
 * 企查查新闻信息数据结构
 */
export interface QichachaNewsInfo {
  queryTime: string;           // 查询时间（ISO格式）
  searchKey: string;           // 搜索关键词
  pageIndex: number;           // 页码
  pageSize: number;            // 每页数量
  totalCount: number;          // 新闻总数
  news: Array<{
    title: string;             // 新闻标题
    source: string | null;     // 新闻来源
    publishTime: string | null; // 发布时间
    emotionType: 'positive' | 'neutral' | 'negative' | null; // 情感倾向
    category: string | null;   // 分类编码或名称
    categoryDesc: string | null; // 分类描述
    summary: string | null;    // 新闻摘要（前200字）
    content: string | null;    // 新闻全文
    url: string | null;        // 新闻链接
  }>;
}

// ============================================
// 缓存操作函数 - 企业信息
// ============================================

/**
 * 生成缓存键
 */
function getCacheKey(companyName: string): string {
  return `${CACHE_PREFIX}${companyName.trim().toLowerCase()}`;
}

/**
 * 获取缓存的企业信息
 */
export function getCachedCompany(companyName: string): QichachaCompanyInfo | null {
  const key = getCacheKey(companyName);
  const data = cache.get(key) as QichachaCompanyInfo | undefined;
  return data || null;
}

/**
 * 设置缓存的企业信息
 */
export function setCachedCompany(companyName: string, data: QichachaCompanyInfo): void {
  const key = getCacheKey(companyName);
  cache.set(key, data);
}

/**
 * 删除缓存的企业信息
 */
export function deleteCachedCompany(companyName: string): void {
  const key = getCacheKey(companyName);
  cache.del(key);
}

// ============================================
// 缓存操作函数 - 新闻信息
// ============================================

/**
 * 生成新闻缓存键
 */
function getNewsCacheKey(keyNo: string): string {
  return `${NEWS_CACHE_PREFIX}${keyNo}`;
}

/**
 * 获取缓存的企业新闻信息
 */
export function getCachedNews(keyNo: string): QichachaNewsInfo | null {
  const key = getNewsCacheKey(keyNo);
  const data = cache.get(key) as QichachaNewsInfo | undefined;
  return data || null;
}

/**
 * 设置缓存的企业新闻信息
 */
export function setCachedNews(keyNo: string, data: QichachaNewsInfo): void {
  const key = getNewsCacheKey(keyNo);
  cache.set(key, data);
}

// ============================================
// 通用缓存操作
// ============================================

/**
 * 清空所有缓存
 */
export function clearAllCache(): void {
  cache.flushAll();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
} {
  return cache.getStats();
}

/**
 * 检查企业缓存是否存在
 */
export function hasCompanyCache(companyName: string): boolean {
  const key = getCacheKey(companyName);
  return cache.has(key);
}

/**
 * 检查新闻缓存是否存在
 */
export function hasNewsCache(keyNo: string): boolean {
  const key = getNewsCacheKey(keyNo);
  return cache.has(key);
}
