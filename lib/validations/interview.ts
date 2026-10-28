/**
 * 访谈项目 - Zod 验证 Schema
 *
 * @module lib/validations/interview
 * @description 访谈项目相关的请求体验证规则
 */

import { z } from 'zod';

/**
 * 访谈项目状态枚举
 */
export const InterviewStatus = {
  DRAFT: 'draft',
  PREPARED: 'prepared',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

/**
 * 访谈状态流转规则
 * 定义每个状态可以转换到哪些状态
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['prepared'],
  prepared: ['in_progress', 'draft'],
  in_progress: ['completed', 'prepared'],
  completed: ['archived'],
  archived: [],
};

/**
 * 创建访谈项目请求验证 Schema
 */
export const interviewCreateSchema = z.object({
  title: z
    .string()
    .min(1, '访谈标题不能为空')
    .max(200, '访谈标题不能超过200个字符'),
  objective: z
    .string()
    .min(1, '访谈目标不能为空')
    .max(1000, '访谈目标不能超过1000个字符'),
  background: z
    .string()
    .max(2000, '背景信息不能超过2000个字符')
    .optional(),
  customerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的客户ID格式'),
  interviewDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: '无效的日期格式' }
    )
    .transform((val) => (val ? new Date(val) : undefined)),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 更新访谈项目请求验证 Schema
 */
export const interviewUpdateSchema = z.object({
  title: z
    .string()
    .min(1, '访谈标题不能为空')
    .max(200, '访谈标题不能超过200个字符')
    .optional(),
  objective: z
    .string()
    .min(1, '访谈目标不能为空')
    .max(1000, '访谈目标不能超过1000个字符')
    .optional(),
  background: z
    .string()
    .max(2000, '背景信息不能超过2000个字符')
    .optional(),
  customerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的客户ID格式')
    .optional(),
  interviewDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: '无效的日期格式' }
    )
    .transform((val) => (val ? new Date(val) : undefined)),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 更新访谈状态请求验证 Schema
 */
export const interviewStatusUpdateSchema = z.object({
  status: z.enum(
    [
      InterviewStatus.DRAFT,
      InterviewStatus.PREPARED,
      InterviewStatus.IN_PROGRESS,
      InterviewStatus.COMPLETED,
      InterviewStatus.ARCHIVED,
    ],
    {
      message: '无效的访谈状态',
    }
  ),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 获取访谈列表查询参数验证 Schema
 */
export const interviewQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z
    .enum([
      InterviewStatus.DRAFT,
      InterviewStatus.PREPARED,
      InterviewStatus.IN_PROGRESS,
      InterviewStatus.COMPLETED,
      InterviewStatus.ARCHIVED,
    ])
    .optional(),
  customerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的客户ID格式')
    .optional()
    .or(z.literal('')),
});

/**
 * 访谈项目 ID 参数验证 Schema
 */
export const interviewIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
});

/**
 * 类型推断
 */
export type InterviewCreateInput = z.infer<typeof interviewCreateSchema>;
export type InterviewUpdateInput = z.infer<typeof interviewUpdateSchema>;
export type InterviewStatusUpdateInput = z.infer<typeof interviewStatusUpdateSchema>;
export type InterviewQueryInput = z.infer<typeof interviewQuerySchema>;
export type InterviewStatusType = (typeof InterviewStatus)[keyof typeof InterviewStatus];
