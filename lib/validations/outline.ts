/**
 * 访谈提纲 - Zod 验证 Schema
 *
 * @module lib/validations/outline
 * @description 访谈提纲相关的请求体验证规则
 */

import { z } from 'zod';

/**
 * 提纲问题状态枚举
 */
export const OutlineStatus = {
  PENDING: 'pending',
  ASKED: 'asked',
  SKIPPED: 'skipped',
} as const;

/**
 * 提纲优先级范围（1-5，1最高）
 */
export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 5;

/**
 * 访谈提纲 ID 参数验证 Schema
 */
export const outlineIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  outlineId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的提纲ID格式'),
});

/**
 * 创建提纲问题请求验证 Schema
 */
export const outlineCreateSchema = z.object({
  question: z
    .string()
    .min(1, '问题内容不能为空')
    .max(500, '问题内容不能超过500个字符'),
  priority: z
    .number()
    .int('优先级必须是整数')
    .min(PRIORITY_MIN, `优先级最小为${PRIORITY_MIN}`)
    .max(PRIORITY_MAX, `优先级最大为${PRIORITY_MAX}`)
    .optional()
    .default(3),
  order: z
    .number()
    .int('排序必须是整数')
    .min(0, '排序最小为0')
    .optional()
    .default(0),
  notes: z
    .string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
  // 新增字段 - 提纲生成优化
  isCore: z
    .boolean()
    .optional()
    .default(true), // 是否核心问题
  reasoning: z
    .string()
    .max(500, '重要性说明不能超过500个字符')
    .optional(), // 问题重要性说明
  source: z
    .enum(['ai', 'manual', 'template'], {
      message: '无效的问题来源',
    })
    .optional()
    .default('ai'), // 来源
  relatedInsight: z
    .string()
    .max(500, '关联分析不能超过500个字符')
    .optional(), // 关联的分析内容（显示文本）
  // 新增字段 - 结构化引用（对应访谈分析报告具体点）
  relatedPainPointIndex: z
    .number()
    .int('痛点索引必须是整数')
    .min(0, '痛点索引最小为0')
    .optional(), // 关联痛点假设索引
  relatedPriorityAreaIndex: z
    .number()
    .int('领域索引必须是整数')
    .min(0, '领域索引最小为0')
    .optional(), // 关联优先领域索引
  relatedBusinessScenarioKey: z
    .string()
    .max(200, '场景特征不能超过200个字符')
    .optional(), // 关联业务场景特征
  insightReferenceType: z
    .enum(['pain_point', 'priority_area', 'business_scenario', 'mixed'], {
      message: '无效的引用类型',
    })
    .optional(), // 引用类型
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 更新提纲问题请求验证 Schema
 */
export const outlineUpdateSchema = z.object({
  question: z
    .string()
    .min(1, '问题内容不能为空')
    .max(500, '问题内容不能超过500个字符')
    .optional(),
  priority: z
    .number()
    .int('优先级必须是整数')
    .min(PRIORITY_MIN, `优先级最小为${PRIORITY_MIN}`)
    .max(PRIORITY_MAX, `优先级最大为${PRIORITY_MAX}`)
    .optional(),
  status: z
    .enum([OutlineStatus.PENDING, OutlineStatus.ASKED, OutlineStatus.SKIPPED], {
      message: '无效的提纲状态',
    })
    .optional(),
  order: z
    .number()
    .int('排序必须是整数')
    .min(0, '排序最小为0')
    .optional(),
  notes: z
    .string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 批量更新提纲顺序请求验证 Schema
 */
export const outlineOrderUpdateSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的提纲ID格式'),
        order: z.number().int('排序必须是整数').min(0, '排序最小为0'),
      })
    )
    .min(1, '至少需要一个提纲项'),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 类型推断
 */
export type OutlineCreateInput = z.infer<typeof outlineCreateSchema>;
export type OutlineUpdateInput = z.infer<typeof outlineUpdateSchema>;
export type OutlineOrderUpdateInput = z.infer<typeof outlineOrderUpdateSchema>;
export type OutlineStatusType = (typeof OutlineStatus)[keyof typeof OutlineStatus];