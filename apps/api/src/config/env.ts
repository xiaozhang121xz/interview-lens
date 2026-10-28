import { z } from 'zod';

const apiEnvSchema = z.object({
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const apiEnv = apiEnvSchema.parse(process.env);
