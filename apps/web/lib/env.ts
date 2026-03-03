import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 chars"),
  NEXTAUTH_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_INDIE: z.string().startsWith("price_"),
  STRIPE_PRICE_PRO: z.string().startsWith("price_"),
  RESEND_API_KEY: z.string().startsWith("re_"),
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 chars"),
  ALLOWED_ORIGINS: z.string().default("*"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
