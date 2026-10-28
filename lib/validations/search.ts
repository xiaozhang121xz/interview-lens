/**
 * 搜索服务 - Zod 验证 Schema
 *
 * @module lib/validations/search
 * @description 用于客户信息智能搜索的请求和响应验证
 */

import { z } from 'zod';

/**
 * 模糊搜索请求验证 Schema
 */
export const fuzzySearchSchema = z.object({
  // 搜索关键词（必填）
  searchKey: z
    .string()
    .min(1, '搜索关键词不能为空')
    .max(100, '搜索关键词不能超过100个字符'),
  // 页码（可选）
  pageIndex: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1),
  // 每页数量（可选）
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5),
});

/**
 * 模糊搜索结果项 Schema
 */
export const fuzzySearchResultItemSchema = z.object({
  keyNo: z.string(),
  name: z.string(),
  creditCode: z.string(),
  establishDate: z.string(),
  legalPerson: z.string(),
  status: z.string(),
  address: z.string(),
  province: z.string(),
  city: z.string(),
});

/**
 * 模糊搜索响应验证 Schema
 */
export const fuzzySearchResponseSchema = z.object({
  items: z.array(fuzzySearchResultItemSchema),
  totalRecords: z.number(),
  pageIndex: z.number(),
  pageSize: z.number(),
});

/**
 * 客户信息搜索请求验证 Schema
 */
export const customerInfoSearchSchema = z.object({
  // 客户/公司名称（必填）
  companyName: z
    .string()
    .min(1, '客户名称不能为空')
    .max(100, '客户名称不能超过100个字符'),

  // 业务领域/行业（可选）
  industry: z
    .string()
    .max(50, '行业名称不能超过50个字符')
    .optional(),

  // 联系人姓名（可选，用于搜索指定联系人的背景信息）
  contactName: z
    .string()
    .max(50, '联系人姓名不能超过50个字符')
    .optional(),

  // 是否包含新闻舆情搜索（可选）
  includeNews: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * 新闻摘要验证 Schema
 */
export const newsHighlightSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  date: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  url: z.string().optional(),
});

/**
 * 客户信息搜索响应验证 Schema
 */
export const customerInfoSearchResponseSchema = z.object({
  // 公司全称（工商注册名称）
  fullName: z.string().optional(),

  // 公司简介
  description: z.string().optional(),

  // 行业信息
  industry: z.string().optional(),

  // 公司网站
  website: z.string().optional(),

  // 联系人姓名（关键联系人，如法定代表人、总经理、销售负责人）
  contactName: z.string().optional(),

  // 联系电话
  phone: z.string().optional(),

  // 联系邮箱
  email: z.string().optional(),

  // 公司地址
  address: z.string().optional(),

  // 客户背景（公司成立时间、规模、资质等硬性信息）
  background: z.string().optional(),

  // 联系人背景（联系人职位、从业经历、专业背景等）
  contactBackground: z.string().optional(),

  // 备注/辅助信息
  notes: z.string().optional(),

  // 搜索来源URL列表
  sources: z.array(z.string()).optional(),

  // 搜索置信度
  confidence: z.enum(['high', 'medium', 'low']).optional(),

  // 新闻舆情相关字段（新增）
  businessSummary: z.string().optional(),      // 基于新闻舆情归纳的主营业务
  keyEvents: z.string().optional(),           // 近期重要事件摘要
  riskAlerts: z.string().optional(),          // 风险提示
  sentimentOverview: z.enum(['positive', 'neutral', 'negative']).optional(), // 舆情整体评价
  newsHighlights: z.array(newsHighlightSchema).optional(), // 新闻摘要列表
  recommendation: z.string().optional(),      // 客户评估建议
});

// 类型导出
export type FuzzySearchInput = z.infer<typeof fuzzySearchSchema>;
export type FuzzySearchResultItem = z.infer<typeof fuzzySearchResultItemSchema>;
export type FuzzySearchResponse = z.infer<typeof fuzzySearchResponseSchema>;
export type CustomerInfoSearchInput = z.infer<typeof customerInfoSearchSchema>;
export type CustomerInfoSearchResponse = z.infer<typeof customerInfoSearchResponseSchema>;
export type NewsHighlight = z.infer<typeof newsHighlightSchema>;
