/**
 * 分享功能验证Schema
 * 用于验证分享链接创建和访问请求
 */

import { z } from 'zod';

/**
 * 创建分享链接请求验证
 */
export const createShareSchema = z.object({
  interviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的访谈ID格式'),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的用户ID格式'),
  config: z
    .object({
      includePRD: z.boolean().default(true),
      includePersona: z.boolean().default(true),
      includeJourneyMap: z.boolean().default(true),
      includeInsights: z.boolean().default(true),
      includeRecords: z.boolean().default(false),
    })
    .optional(),
  expiresIn: z.number().int().positive().optional(), // 过期时间（小时）
});

/**
 * 分享Token验证
 */
export const shareTokenSchema = z.string().min(8).max(32);

/**
 * 分享链接响应类型
 */
export const shareResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      token: z.string(),
      shareUrl: z.string(),
      expiresAt: z.string().nullable(),
      config: z.object({
        includePRD: z.boolean(),
        includePersona: z.boolean(),
        includeJourneyMap: z.boolean(),
        includeInsights: z.boolean(),
        includeRecords: z.boolean(),
      }),
    })
    .optional(),
  error: z.string().optional(),
});

/**
 * Token验证响应类型
 */
export const validateTokenResponseSchema = z.object({
  valid: z.boolean(),
  interviewId: z.string().optional(),
  config: z
    .object({
      includePRD: z.boolean(),
      includePersona: z.boolean(),
      includeJourneyMap: z.boolean(),
      includeInsights: z.boolean(),
      includeRecords: z.boolean(),
    })
    .optional(),
  reason: z.string().optional(),
});

/**
 * 分享状态枚举
 */
export const ShareStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type ShareStatusType = (typeof ShareStatus)[keyof typeof ShareStatus];

/**
 * 创建分享请求类型
 */
export type CreateShareRequest = z.infer<typeof createShareSchema>;

/**
 * 分享响应类型
 */
export type ShareResponse = z.infer<typeof shareResponseSchema>;

/**
 * Token验证响应类型
 */
export type ValidateTokenResponse = z.infer<typeof validateTokenResponseSchema>;