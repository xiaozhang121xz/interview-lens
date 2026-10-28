import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * API错误响应接口
 */
export interface ApiErrorData {
  code: string;
  message: string;
  details?: any;
}

/**
 * API错误响应格式
 */
export interface ErrorResponse {
  success: false;
  error: ApiErrorData;
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ACTIVITY_NOT_FOUND = 'ACTIVITY_NOT_FOUND',
  ACTIVITY_FULL = 'ACTIVITY_FULL',
  ALREADY_JOINED = 'ALREADY_JOINED',
  DEADLINE_PASSED = 'DEADLINE_PASSED',
  CANCELLATION_DEADLINE_PASSED = 'CANCELLATION_DEADLINE_PASSED',
  NOT_JOINED = 'NOT_JOINED',
  ACTIVITY_CANCELLED = 'ACTIVITY_CANCELLED',
  NOT_CREATOR = 'NOT_CREATOR',
  ALREADY_CANCELLED = 'ALREADY_CANCELLED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * 统一API错误处理函数
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  // Zod验证错误
  if (error instanceof ZodError) {
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: '请求参数验证失败',
        details: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    }, { status: 400 });
  }

  // 自定义API错误
  if (error instanceof ApiErrorException) {
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }, { status: getStatusCode(error.code) });
  }

  // 其他错误
  return NextResponse.json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: '服务器内部错误，请稍后重试',
    },
  }, { status: 500 });
}

/**
 * 根据错误码获取HTTP状态码
 */
function getStatusCode(errorCode: ErrorCode): number {
  switch (errorCode) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.ACTIVITY_FULL:
    case ErrorCode.ALREADY_JOINED:
    case ErrorCode.DEADLINE_PASSED:
    case ErrorCode.CANCELLATION_DEADLINE_PASSED:
    case ErrorCode.NOT_JOINED:
    case ErrorCode.ACTIVITY_CANCELLED:
    case ErrorCode.NOT_CREATOR:
    case ErrorCode.ALREADY_CANCELLED:
      return 400;
    case ErrorCode.ACTIVITY_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

/**
 * 创建API错误实例
 */
export class ApiErrorException extends Error {
  code: ErrorCode;
  details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 快捷方法：创建验证错误
 */
export function createValidationError(message: string, details?: any): ApiErrorException {
  return new ApiErrorException(ErrorCode.VALIDATION_ERROR, message, details);
}

/**
 * 快捷方法：创建活动不存在错误
 */
export function createActivityNotFoundError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.ACTIVITY_NOT_FOUND, '活动不存在或已被删除');
}

/**
 * 快捷方法：创建活动已满错误
 */
export function createActivityFullError(details: { current: number; max: number }): ApiErrorException {
  return new ApiErrorException(
    ErrorCode.ACTIVITY_FULL,
    '活动已满，无法报名',
    details
  );
}

/**
 * 快捷方法：创建已报名错误
 */
export function createAlreadyJoinedError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.ALREADY_JOINED, '您已经报名过该活动');
}

/**
 * 快捷方法：创建报名截止错误
 */
export function createDeadlinePassedError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.DEADLINE_PASSED, '报名已截止');
}

/**
 * 快捷方法：创建取消时限错误
 */
export function createCancellationDeadlinePassedError(details: { deadline: string; currentTime: string; cancelDeadline: string }): ApiErrorException {
  return new ApiErrorException(
    ErrorCode.CANCELLATION_DEADLINE_PASSED,
    '活动已临近开始，无法取消',
    details
  );
}

/**
 * 快捷方法：创建未报名错误
 */
export function createNotJoinedError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.NOT_JOINED, '您未报名该活动');
}

/**
 * 快捷方法：创建活动已取消错误
 */
export function createActivityCancelledError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.ACTIVITY_CANCELLED, '活动已取消');
}

/**
 * 快捷方法：创建不是发起者错误
 */
export function createNotCreatorError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.NOT_CREATOR, '只有发起者才能取消活动');
}

/**
 * 快捷方法：创建活动已取消错误（用于重复取消）
 */
export function createAlreadyCancelledError(): ApiErrorException {
  return new ApiErrorException(ErrorCode.ALREADY_CANCELLED, '活动已取消，无需重复取消');
}
