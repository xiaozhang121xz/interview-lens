/**
 * 发送验证码API
 *
 * POST /api/auth/send-code
 *
 * 发送短信验证码（Mock实现，控制台输出）
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendCodeSchema } from '@/lib/schemas/auth';
import {
  createVerificationCode,
  invalidateVerificationCode,
} from '@/lib/services/verification-code';
import { getSmsService } from '@/lib/services/sms';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求数据
    const validatedData = sendCodeSchema.parse(body);

    const code = await createVerificationCode(validatedData.phone);
    try {
      await getSmsService().sendCode(validatedData.phone, code);
    } catch (error) {
      await invalidateVerificationCode(validatedData.phone, code);
      throw error;
    }

    // 返回成功响应
    return NextResponse.json(
      {
        success: true,
        message: '验证码已发送',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'TOO_MANY_REQUESTS') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'TOO_MANY_REQUESTS', message: '请稍后再试' },
        },
        { status: 429 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === 'SMS_PROVIDER_NOT_CONFIGURED' ||
        error.message === 'VERIFICATION_CODE_SECRET_NOT_CONFIGURED')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SMS_UNAVAILABLE',
            message: '短信服务暂未配置',
          },
        },
        { status: 503 }
      );
    }

    // Zod验证错误
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // 其他错误
    console.error('Send code error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '发送验证码失败',
        },
      },
      { status: 500 }
    );
  }
}
