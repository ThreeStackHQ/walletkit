import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://placeholder"),
  NEXTAUTH_SECRET: z.string().default("placeholder_secret_32_chars_long___"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().default("sk_placeholder"),
  STRIPE_WEBHOOK_SECRET: z.string().default("whsec_placeholder"),
  STRIPE_PRICE_INDIE: z.string().default("price_indie"),
  STRIPE_PRICE_PRO: z.string().default("price_pro"),
  STRIPE_PRICE_PACK_500: z.string().default("price_pack500"),
  STRIPE_PRICE_PACK_1200: z.string().default("price_pack1200"),
  STRIPE_PRICE_PACK_6000: z.string().default("price_pack6000"),
  RESEND_API_KEY: z.string().default("re_placeholder"),
  FROM_EMAIL: z.string().default("noreply@walletkit.threestack.io"),
  BASE_URL: z.string().default("http://localhost:3000"),
  CRON_SECRET: z.string().default("placeholder_cron_secret_32_chars__"),
  ALLOWED_ORIGINS: z.string().default("*"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
