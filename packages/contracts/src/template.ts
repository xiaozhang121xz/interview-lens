import { z } from 'zod';

export const templateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  isPublic: z.coerce.boolean().optional(),
});

export const templateCreateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称最多100字符'),
  description: z.string().max(1000, '描述最多1000字符').optional().or(z.literal('')),
  outline: z.string().min(1, '提纲内容不能为空'),
  category: z.string().max(50, '分类最多50字符').optional().or(z.literal('')),
  isPublic: z.boolean().default(false),
  userId: z.string().optional(),
});

export const templateUpdateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称最多100字符').optional(),
  description: z.string().max(1000, '描述最多1000字符').optional().or(z.literal('')),
  outline: z.string().min(1, '提纲内容不能为空').optional(),
  category: z.string().max(50, '分类最多50字符').optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
});

export const outlineSectionSchema = z.object({
  name: z.string(),
  questions: z.array(z.string()),
});

export const outlineContentSchema = z.object({
  sections: z.array(outlineSectionSchema),
});

export type TemplateQueryInput = z.infer<typeof templateQuerySchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type OutlineSection = z.infer<typeof outlineSectionSchema>;
export type OutlineContent = z.infer<typeof outlineContentSchema>;
