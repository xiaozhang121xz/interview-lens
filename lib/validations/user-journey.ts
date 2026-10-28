/**
 * 用户旅程 - Zod 验证 Schema
 *
 * @module lib/validations/user-journey
 * @description 用户角色画像相关的请求体验证规则
 */

import { z } from 'zod';

/**
 * 用户角色画像枚举
 */
export const rolePersonaSchema = z.enum(['sales', 'product', 'developer', 'manager'], {
  message: '无效的角色类型',
});

/**
 * 更新用户角色画像请求验证 Schema
 */
export const updateRolePersonaSchema = z.object({
  rolePersona: rolePersonaSchema,
});

/**
 * 类型推断
 */
export type RolePersona = z.infer<typeof rolePersonaSchema>;
export type UpdateRolePersonaInput = z.infer<typeof updateRolePersonaSchema>;