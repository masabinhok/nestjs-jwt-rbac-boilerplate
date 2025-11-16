import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(8080),

  // Database
  DATABASE_URL: z.string().min(1, 'Invalid DATABASE_URL'),

  // JWT Secrets
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_ACCESS_EXPIRY must be in format: 60m, 1h, etc.')
    .default('60m'),
  JWT_REFRESH_EXPIRY: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_REFRESH_EXPIRY must be in format: 7d, 30d, etc.')
    .default('30d'),

  // CORS
  CORS_ORIGIN: z
    .string()
    .refine((val) => {
      // Allow comma-separated origins
      const origins = val.split(',').map((o) => o.trim());
      const urlRegex = /^https?:\/\/.+/;
      return origins.every((origin) => urlRegex.test(origin) || origin === '*');
    }, 'CORS_ORIGIN must be valid URL(s) or "*". Multiple origins: "http://localhost:3000,https://example.com"')
    .default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;
