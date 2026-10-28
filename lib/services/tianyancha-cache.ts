/**
 * 天眼查数据缓存服务
 *
 * @module lib/services/tianyancha-cache
 * @description 临时缓存天眼查查询结果，减少重复查询，提高响应速度
 *
 * 缓存策略：
 * - 存储方式：内存存储（node-cache）
 * - 过期时间：24 小时
 * - 目的：减少重复查询，降低反爬风险
 */

import NodeCache from 'node-cache';

// 缓存实例：24小时过期
const cache = new NodeCache({
  stdTTL: 86400, // 24小时 = 86400秒
  checkperiod: 3600, // 每小时检查一次过期键
  maxKeys: 1000, // 最多缓存1000家企业
});

// 缓存键前缀
const CACHE_PREFIX = 'tianyancha:';

// ============================================
// 类型定义
// ============================================

export interface TianyanchaCompanyInfo {
  queryTime: string;
  queryName: string;
  companyName: string | null;
  legalPerson: string | null;
  establishDate: string | null;
  registerNumber: string | null;
  businessTerm: string | null;
  companyType: string | null;
  socialCreditCode: string | null;
  registerAuthority: string | null;
  businessScope: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  insuranceCount: string | null;
  hasBranch: boolean;
  branchCount: number | null;
  hasRecruitment: boolean;
  detailUrl: string | null;
}

export interface TianyanchaContactInfo {
  queryTime: string;
  queryName: string;
  companyName: string;
  contactName: string;
  position: string | null;
  background: string | null;
  otherCompanies: string[] | null;
  detailUrl: string | null;
}

// ============================================
// 缓存操作函数
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
export function getCachedCompany(companyName: string): TianyanchaCompanyInfo | null {
  const key = getCacheKey(companyName);
  const data = cache.get<TianyanchaCompanyInfo>(key);
  return data || null;
}

/**
 * 设置缓存的企业信息
 */
export function setCachedCompany(companyName: string, data: TianyanchaCompanyInfo): void {
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
 * 检查缓存是否存在
 */
export function hasCache(companyName: string): boolean {
  const key = getCacheKey(companyName);
  return cache.has(key);
}

// ============================================
// 联系人缓存操作
// ============================================

const CONTACT_CACHE_PREFIX = 'tianyancha_contact:';

/**
 * 生成联系人缓存键
 */
function getContactCacheKey(contactName: string, companyName: string): string {
  return `${CONTACT_CACHE_PREFIX}${contactName.trim().toLowerCase()}_${companyName.trim().toLowerCase()}`;
}

/**
 * 获取缓存的联系人信息
 */
export function getCachedContact(contactName: string, companyName: string): TianyanchaContactInfo | null {
  const key = getContactCacheKey(contactName, companyName);
  const data = cache.get<TianyanchaContactInfo>(key);
  return data || null;
}

/**
 * 设置缓存的联系人信息
 */
export function setCachedContact(contactName: string, companyName: string, data: TianyanchaContactInfo): void {
  const key = getContactCacheKey(contactName, companyName);
  cache.set(key, data);
}