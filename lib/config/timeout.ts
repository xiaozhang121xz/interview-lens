/**
 * API 超时配置模块
 *
 * @module lib/config/timeout
 * @description 统一管理 API 超时配置，支持环境变量覆盖
 *
 * 环境变量：
 * - NEXT_PUBLIC_API_TIMEOUT_MS: 普通 API 超时（客户端可访问）
 * - NEXT_PUBLIC_AI_API_TIMEOUT_MS: AI API 超时（客户端可访问）
 * - AI_API_TIMEOUT_MS: AI API 超时（服务端专用）
 */

/**
 * 普通 API 超时时间（毫秒）
 * 默认 20 秒，适合常规 CRUD 操作
 */
export const API_TIMEOUT_MS = parseInt(
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '20000',
  10
);

/**
 * AI API 超时时间（毫秒）
 * 默认 5 分钟，适合大模型生成任务
 *
 * 优先级：NEXT_PUBLIC_AI_API_TIMEOUT_MS > AI_API_TIMEOUT_MS > 默认值
 */
export const AI_API_TIMEOUT_MS = parseInt(
  process.env.NEXT_PUBLIC_AI_API_TIMEOUT_MS ||
    process.env.AI_API_TIMEOUT_MS ||
    '300000',
  10
);

/**
 * 验证超时值是否有效
 */
const validateTimeout = (value: number, name: string): number => {
  if (isNaN(value) || value <= 0) {
    console.warn(`[Config] ${name} 配置无效 (${value})，使用默认值`);
    return name.includes('AI') ? 300000 : 20000;
  }
  return value;
};

/**
 * 验证后的超时值
 */
export const VALIDATED_API_TIMEOUT = validateTimeout(API_TIMEOUT_MS, 'API_TIMEOUT_MS');
export const VALIDATED_AI_API_TIMEOUT = validateTimeout(AI_API_TIMEOUT_MS, 'AI_API_TIMEOUT_MS');