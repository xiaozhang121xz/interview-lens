/**
 * 日期时间工具库 - 统一处理前后端日期时间格式转换
 *
 * 格式规范：
 * - 前端输入（datetime-local）：YYYY-MM-DDTHH:mm（例如：2025-12-23T11:38）
 * - 后端存储（ISO 8601）：YYYY-MM-DDTHH:mm:ss.sssZ（例如：2025-12-23T11:38:00.000Z）
 * - 前端显示（中文）：YYYY年MM月DD日 HH:mm（例如：2025年12月23日 11:38）
 * - 仅日期显示（中文）：YYYY年MM月DD日（例如：2025年12月23日）
 */

import { z } from 'zod';

/**
 * 格式常量定义
 */
export const DATETIME_FORMATS = {
  // 前端输入格式（datetime-local）
  FRONTEND_INPUT: 'YYYY-MM-DDTHH:mm',

  // 后端存储格式（ISO 8601）
  BACKEND_STORAGE: 'YYYY-MM-DDTHH:mm:ss.sssZ',

  // 前端显示格式（中文）
  FRONTEND_DISPLAY_DATETIME: 'YYYY年MM月DD日 HH:mm',
  FRONTEND_DISPLAY_DATE: 'YYYY年MM月DD日',
  FRONTEND_DISPLAY_TIME: 'HH:mm:ss',
} as const;

/**
 * 将datetime-local输入值转换为ISO 8601格式
 * @param datetimeLocalValue - datetime-local输入值（例如：2025-12-23T11:38）
 * @returns ISO 8601格式字符串（例如：2025-12-23T11:38:00.000Z）
 *
 * @example
 * formatDatetimeLocalToISO('2025-12-23T11:38') // '2025-12-23T11:38:00.000Z'
 */
export function formatDatetimeLocalToISO(datetimeLocalValue: string): string {
  if (!datetimeLocalValue) {
    throw new Error('datetime-local值不能为空');
  }

  // datetime-local格式：YYYY-MM-DDTHH:mm 或 YYYY-MM-DDTHH:mm:ss
  const date = new Date(datetimeLocalValue);

  if (isNaN(date.getTime())) {
    throw new Error(`无效的datetime-local值: ${datetimeLocalValue}`);
  }

  return date.toISOString();
}

/**
 * 将ISO 8601格式转换为datetime-local输入值
 * @param isoString - ISO 8601格式字符串
 * @returns datetime-local格式字符串
 *
 * @example
 * formatISOToDatetimeLocal('2025-12-23T11:38:00.000Z') // '2025-12-23T11:38'
 */
export function formatISOToDatetimeLocal(isoString: string): string {
  if (!isoString) {
    throw new Error('ISO字符串不能为空');
  }

  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    throw new Error(`无效的ISO字符串: ${isoString}`);
  }

  // 获取本地时间的年月日时分
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 将ISO 8601格式转换为中文显示格式
 * @param isoString - ISO 8601格式字符串
 * @param format - 显示格式类型：'datetime' | 'date' | 'time'
 * @returns 中文格式化字符串
 *
 * @example
 * formatISOToDisplay('2025-12-23T11:38:00.000Z', 'datetime') // '2025年12月23日 11:38'
 * formatISOToDisplay('2025-12-23T11:38:00.000Z', 'date') // '2025年12月23日'
 * formatISOToDisplay('2025-12-23T11:38:00.000Z', 'time') // '11:38:00'
 */
export function formatISOToDisplay(
  isoString: string,
  format: 'datetime' | 'date' | 'time' = 'datetime'
): string {
  if (!isoString) {
    throw new Error('ISO字符串不能为空');
  }

  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    throw new Error(`无效的ISO字符串: ${isoString}`);
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'datetime':
      return `${year}年${month}月${day}日 ${hours}:${minutes}`;
    case 'date':
      return `${year}年${month}月${day}日`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    default:
      return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  }
}

/**
 * 验证日期时间字符串是否为有效格式
 * @param dateString - 日期时间字符串
 * @returns 是否为有效格式
 */
export function isValidDatetime(dateString: string): boolean {
  if (!dateString) return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 获取当前时间的ISO 8601格式字符串
 * @returns ISO 8601格式字符串
 */
export function getCurrentISOTime(): string {
  return new Date().toISOString();
}

/**
 * 获取当前时间的datetime-local格式字符串
 * @returns datetime-local格式字符串
 */
export function getCurrentDatetimeLocal(): string {
  return formatISOToDatetimeLocal(new Date().toISOString());
}

/**
 * 柔性日期时间验证Schema
 * 接受多种格式并转换为ISO 8601
 */
export const flexibleDateTimeSchema = z
  .string()
  .min(1, '日期时间不能为空')
  .refine(
    (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    {
      message: '请输入有效的日期时间',
    }
  )
  .transform((value) => {
    // 统一转换为ISO 8601格式
    return new Date(value).toISOString();
  });

/**
 * 可选的柔性日期时间验证Schema
 */
export const optionalFlexibleDateTimeSchema = flexibleDateTimeSchema.optional();

/**
 * Zod验证Schema预设 - 直接用于API路由
 */
export const DateTimeSchemas = {
  /**
   * 必填日期时间字段
   * 接受：datetime-local、ISO 8601、时间戳等格式
   * 输出：统一转换为ISO 8601格式
   */
  required: z
    .string()
    .min(1, '日期时间不能为空')
    .refine(isValidDatetime, '请输入有效的日期时间')
    .transform((value) => new Date(value).toISOString()),

  /**
   * 可选日期时间字段
   * 接受：datetime-local、ISO 8601、时间戳等格式
   * 输出：统一转换为ISO 8601格式或undefined
   */
  optional: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      return isValidDatetime(value);
    }, '请输入有效的日期时间')
    .transform((value) => (value ? new Date(value).toISOString() : undefined)),

  /**
   * 日期范围验证（用于查询参数）
   */
  dateRange: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
      },
      {
        message: '开始日期不能大于结束日期',
      }
    ),
} as const;

/**
 * 类型导出
 */
export type DateTimeFormat = keyof typeof DATETIME_FORMATS;

/**
 * 格式化相对时间（距离现在多久）
 * @param date - 日期对象或ISO字符串
 * @returns 相对时间字符串（例如："3天后"、"2小时前"）
 */
export function formatDistanceToNow(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const absMinutes = Math.abs(diffMinutes);
  const absHours = Math.abs(diffHours);
  const absDays = Math.abs(diffDays);

  if (absDays >= 1) {
    const suffix = diffDays > 0 ? '后' : '前';
    return `${absDays}天${suffix}`;
  } else if (absHours >= 1) {
    const suffix = diffHours > 0 ? '后' : '前';
    return `${absHours}小时${suffix}`;
  } else if (absMinutes >= 1) {
    const suffix = diffMinutes > 0 ? '后' : '前';
    return `${absMinutes}分钟${suffix}`;
  } else {
    return '刚刚';
  }
}

/**
 * 格式化日期时间为中文显示格式
 * @param date - 日期对象或ISO字符串
 * @returns 格式化后的字符串（例如："2025年12月23日 11:38"）
 */
export function formatDateTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');

  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}
