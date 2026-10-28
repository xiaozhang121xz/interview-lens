/**
 * 认证相关的Zod Schema定义
 *
 * 用于用户名登录、手机号验证码登录等功能
 */

import { z } from 'zod';

// 发送验证码请求Schema
export const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
});

// 验证码登录请求Schema
export const verifyCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  code: z.string().regex(/^\d{6}$/, '请输入6位数字验证码'),
});

// 用户名密码登录请求Schema
export const usernameLoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名过长'),
  password: z.string().min(1, '密码不能为空').max(100, '密码过长'),
});
