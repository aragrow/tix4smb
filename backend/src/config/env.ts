import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.local' });

const schema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }),
  GOOGLE_CLIENT_ID: z.string({ required_error: 'GOOGLE_CLIENT_ID is required' }),
  GOOGLE_CLIENT_SECRET: z.string({ required_error: 'GOOGLE_CLIENT_SECRET is required' }),
  JOBBER_CLIENT_ID: z.string({ required_error: 'JOBBER_CLIENT_ID is required' }),
  JOBBER_CLIENT_SECRET: z.string({ required_error: 'JOBBER_CLIENT_SECRET is required' }),
  JOBBER_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  JWT_ACCESS_SECRET: z.string({ required_error: 'JWT_ACCESS_SECRET is required' }),
  JWT_REFRESH_SECRET: z.string({ required_error: 'JWT_REFRESH_SECRET is required' }),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:3001'),
  GHL_CONTACT_CLASSIFICATION: z.string().default('PROSPECT CONTACT'),
  GHL_TEST_CONTACT_ID: z.string().optional(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:');
  result.error.issues.forEach(i => console.error(' -', i.path.join('.'), ':', i.message));
  process.exit(1);
}

export const env = result.data;
