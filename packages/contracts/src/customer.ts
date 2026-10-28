import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(1, '客户名称不能为空').max(100, '客户名称不能超过100个字符'),
  companyFullName: z.string().max(200, '公司全称不能超过200个字符').optional().or(z.literal('')),
  industry: z.string().min(1, '行业不能为空').max(50, '行业名称不能超过50个字符'),
  description: z.string().max(1000, '描述不能超过1000个字符').optional().or(z.literal('')),
  website: z
    .string()
    .max(200, '网站地址不能超过200个字符')
    .optional()
    .refine((value) => value === undefined || value === '' || /^https?:\/\/.+/.test(value), {
      message: '请输入有效的网站地址（以 http:// 或 https:// 开头）',
    }),
  contactName: z.string().max(50, '联系人姓名不能超过50个字符').optional().or(z.literal('')),
  contactPhone: z.string().max(20, '联系电话不能超过20个字符').optional().or(z.literal('')),
  contactEmail: z
    .string()
    .max(100, '邮箱地址不能超过100个字符')
    .optional()
    .refine((value) => value === undefined || value === '' || /^[^\s@]+@[^\s@]+\.[^\s]+$/.test(value), {
      message: '请输入有效的邮箱地址',
    }),
  address: z.string().max(200, '地址不能超过200个字符').optional().or(z.literal('')),
  background: z.string().max(2000, '背景信息不能超过2000个字符').optional().or(z.literal('')),
  contactBackground: z.string().max(1000, '联系人背景不能超过1000个字符').optional().or(z.literal('')),
  notes: z.string().max(2000, '备注不能超过2000个字符').optional().or(z.literal('')),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerQuerySchema = z.object({
  page: z.string().optional().transform((value) => (value ? Number.parseInt(value, 10) : 1)),
  pageSize: z.string().optional().transform((value) => (value ? Number.parseInt(value, 10) : 10)),
  search: z.string().optional(),
  industry: z.string().optional(),
});

export const customerIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, '无效的客户ID格式'),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
