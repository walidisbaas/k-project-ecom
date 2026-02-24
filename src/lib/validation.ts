import { z } from "zod";

// ============================================================
// Lead capture (no auth required)
// ============================================================
export const leadCaptureSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  website_url: z.string().url("Please enter a valid URL").optional(),
  source: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
});

// ============================================================
// Store management
// ============================================================
export const createStoreSchema = z.object({
  store_name: z.string().min(1, "Store name is required").max(100),
  website_url: z.string().url("Please enter a valid URL").optional().nullable(),
});

export const updateStoreSchema = z.object({
  store_name: z.string().min(1).max(100).optional(),
  website_url: z.string().url().optional().nullable(),
  brand_voice: z.string().max(2000).optional().nullable(),
  company_summary: z.string().max(1000).optional().nullable(),
  shipping_policy: z.string().max(3000).optional().nullable(),
  return_policy: z.string().max(3000).optional().nullable(),
  primary_language: z.string().min(2).max(10).optional(),
  sign_off: z.string().max(200).optional(),
  auto_send: z.boolean().optional(),
});

// ============================================================
// Store policies
// ============================================================
export const storePoliciesSchema = z.object({
  shipping_days: z.number().refine((v) => [1, 2, 7, 14].includes(v)),
  response_interval_hours: z.number().refine((v) => [1, 2, 4, 8].includes(v)),
  trade_ins_enabled: z.boolean(),
  receive_old_items: z.boolean(),
  average_cogs: z.number().min(0).max(100000),
  prevent_refunds: z.boolean(),
  offer_vouchers: z.boolean(),
  offer_partial_refunds: z.boolean(),
  partial_refund_percentage: z.number().refine((v) => [10, 20, 30].includes(v)),
});

// ============================================================
// FAQs
// ============================================================
export const createFaqSchema = z.object({
  question: z
    .string()
    .min(5, "Question must be at least 5 characters")
    .max(500),
  answer: z.string().min(10, "Answer must be at least 10 characters").max(5000),
});

export const updateFaqSchema = z.object({
  question: z.string().min(5).max(500).optional(),
  answer: z.string().min(10).max(5000).optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

// ============================================================
// Rules
// ============================================================
export const createRuleSchema = z.object({
  type: z.enum(["do", "dont"]),
  rule: z
    .string()
    .min(5, "Rule must be at least 5 characters")
    .max(500),
});

// ============================================================
// Billing
// ============================================================
export const billingCheckoutSchema = z.object({
  price_id: z.string().min(1, "Price ID is required"),
  store_id: z.string().uuid().optional(),
});

// ============================================================
// Review queue actions
// ============================================================
export const reviewQueueEditSchema = z.object({
  edited_reply: z
    .string()
    .min(10, "Reply must be at least 10 characters")
    .max(5000),
});

// ============================================================
// Preview
// ============================================================
export const previewRequestSchema = z.object({
  sample_email_body: z
    .string()
    .min(10, "Email body must be at least 10 characters")
    .max(5000),
  sample_subject: z.string().max(200).optional(),
});

// ============================================================
// Magic link request
// ============================================================
export const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ============================================================
// Shopify connection
// ============================================================
export const connectShopifySchema = z.object({
  shop_domain: z
    .string()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
      "Must be a valid myshopify.com domain (e.g. your-store.myshopify.com)"
    ),
});
