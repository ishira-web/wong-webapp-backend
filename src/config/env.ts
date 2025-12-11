import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Cookies
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().default('false').transform((v) => v === 'true'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  // ImageKit
  IMAGEKIT_PUBLIC_KEY: z.string().min(1, 'IMAGEKIT_PUBLIC_KEY is required'),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1, 'IMAGEKIT_PRIVATE_KEY is required'),
  IMAGEKIT_URL_ENDPOINT: z.string().url('IMAGEKIT_URL_ENDPOINT must be a valid URL'),

  // Brevo SMTP
  BREVO_SMTP_HOST: z.string().default('smtp-relay.brevo.com'),
  BREVO_SMTP_PORT: z.string().default('587').transform(Number),
  BREVO_SMTP_USER: z.string().min(1, 'BREVO_SMTP_USER is required'),
  BREVO_SMTP_PASS: z.string().min(1, 'BREVO_SMTP_PASS is required'),
  FROM_EMAIL: z.string().email('FROM_EMAIL must be a valid email'),
  FROM_NAME: z.string().default('HR System'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Notifications
  NOTIFICATION_MODE: z.enum(['websocket', 'sse']).default('websocket'),

  // Logging
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),

  // File Upload
  MAX_FILE_SIZE_MB: z.string().default('10').transform(Number),

  // Pagination
  DEFAULT_PAGE_SIZE: z.string().default('20').transform(Number),
  MAX_PAGE_SIZE: z.string().default('100').transform(Number),
});

type EnvSchema = z.infer<typeof envSchema>;

let env: EnvSchema;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;
