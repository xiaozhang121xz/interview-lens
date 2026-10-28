/**
 * 访谈记录 - Zod 验证 Schema
 *
 * @module lib/validations/record
 * @description 访谈记录相关的请求体验证规则
 */

import { z } from 'zod';

/**
 * 记录类型枚举
 */
export const RecordType = {
  ANSWER: 'answer',           // 客户回答
  NOTE: 'note',               // 访谈记录
  PAIN_POINT: 'pain_point',   // 痛点
  REQUIREMENT: 'requirement', // 需求
  OTHER: 'other',             // 其他
} as const;

/**
 * 记录来源枚举
 */
export const RecordSource = {
  MANUAL: 'manual',       // 手动记录
  AI: 'ai',               // AI识别
  FOLLOW_UP: 'follow_up', // 追问采纳
} as const;

/**
 * 访谈记录 ID 参数验证 Schema
 */
export const recordIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  recordId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的记录ID格式'),
});

/**
 * 创建访谈记录请求验证 Schema
 */
export const recordCreateSchema = z.object({
  content: z
    .string()
    .min(1, '记录内容不能为空')
    .max(5000, '记录内容不能超过5000个字符'),
  type: z
    .enum(
      [
        RecordType.ANSWER,
        RecordType.NOTE,
        RecordType.PAIN_POINT,
        RecordType.REQUIREMENT,
        RecordType.OTHER,
      ],
      {
        message: '无效的记录类型',
      }
    )
    .optional()
    .default(RecordType.NOTE),
  isHighlight: z.boolean().optional().default(false),
  outlineId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的提纲ID格式')
    .optional()
    .or(z.literal('')),
  // 新增：会话ID，用于区分不同访谈进程
  sessionId: z.string().optional(),
  // 新增：来源（手动记录、AI识别、追问采纳）
  source: z
    .enum(
      [RecordSource.MANUAL, RecordSource.AI, RecordSource.FOLLOW_UP],
      {
        message: '无效的记录来源',
      }
    )
    .optional()
    .default(RecordSource.MANUAL),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 更新访谈记录请求验证 Schema
 */
export const recordUpdateSchema = z.object({
  content: z
    .string()
    .min(1, '记录内容不能为空')
    .max(5000, '记录内容不能超过5000个字符')
    .optional(),
  type: z
    .enum(
      [
        RecordType.ANSWER,
        RecordType.NOTE,
        RecordType.PAIN_POINT,
        RecordType.REQUIREMENT,
        RecordType.OTHER,
      ],
      {
        message: '无效的记录类型',
      }
    )
    .optional(),
  isHighlight: z.boolean().optional(),
  outlineId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的提纲ID格式')
    .optional()
    .or(z.literal(''))
    .nullable(),
  userId: z.string().optional(), // 可选，用于兼容模式
});

/**
 * 记录查询参数验证 Schema
 */
export const recordQuerySchema = z.object({
  type: z
    .enum(
      [
        RecordType.ANSWER,
        RecordType.NOTE,
        RecordType.PAIN_POINT,
        RecordType.REQUIREMENT,
        RecordType.OTHER,
      ]
    )
    .optional(),
  isHighlight: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  outlineId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, '无效的提纲ID格式')
    .optional()
    .or(z.literal('')),
  // 新增：按会话ID过滤
  sessionId: z.string().optional(),
});

/**
 * 类型推断
 */
export type RecordCreateInput = z.infer<typeof recordCreateSchema>;
export type RecordUpdateInput = z.infer<typeof recordUpdateSchema>;
export type RecordQueryInput = z.infer<typeof recordQuerySchema>;
export type RecordTypeType = (typeof RecordType)[keyof typeof RecordType];
export type RecordSourceType = (typeof RecordSource)[keyof typeof RecordSource];