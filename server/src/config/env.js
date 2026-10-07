import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(7),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
CLOUDINARY_API_KEY: z.string().optional(),
CLOUDINARY_API_SECRET: z.string().optional(),
CASHFREE_APP_ID: z.string().optional(),
CASHFREE_SECRET_KEY: z.string().optional(),
CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
CASHFREE_API_VERSION: z.string().default('2025-01-01'),
API_PUBLIC_URL: z.url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;