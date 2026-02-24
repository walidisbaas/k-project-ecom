// ============================================================
// Kenso AI — Shared TypeScript Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ============================================================
// Database Row Types
// ============================================================

export interface UserProfile {
  id: string; // uuid, FK → auth.users
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  created_at: string; // TIMESTAMPTZ ISO 8601
  updated_at: string;
}

export type OnboardingStep =
  | "email"
  | "shopify"
  | "scrape"
  | "preview"
  | "live"
  | "complete";

export interface BusinessHours {
  timezone: string; // IANA timezone e.g. "America/New_York"
  schedule: WeeklySchedule;
}

export interface WeeklySchedule {
  mon: DayWindow | null;
  tue: DayWindow | null;
  wed: DayWindow | null;
  thu: DayWindow | null;
  fri: DayWindow | null;
  sat: DayWindow | null;
  sun: DayWindow | null;
}

export interface DayWindow {
  open: string; // "09:00"
  close: string; // "17:00"
}

export interface AiConfig {
  tone: "professional" | "friendly" | "casual";
  language: string; // BCP-47 e.g. "en"
  auto_reply_enabled: boolean;
  review_queue_enabled: boolean;
  max_auto_reply_per_day: number;
  reply_to_unknown_intents: boolean;
  custom_signature: string | null;
  business_hours: BusinessHours | null;
}

export interface Store {
  id: string;
  merchant_id: string;
  store_name: string;
  website_url: string | null;
  brand_voice: string | null;
  company_summary: string | null;
  shipping_policy: string | null;
  return_policy: string | null;
  primary_language: string;
  sign_off: string;
  is_active: boolean;
  is_live: boolean;
  auto_send: boolean;
  has_broken_connection: boolean;
  onboarding_step: number;
  scrape_status: "pending" | "scraping" | "complete" | "failed";
  scrape_data: Json | null;
  website_pages: WebsitePage[] | null;
  created_at: string;
  updated_at: string;
}

export interface WebsitePage {
  url: string;
  title: string;
  markdown: string;
}

export interface PreviewThread {
  id: string;
  store_id: string;
  subject: string | null;
  messages: PreviewThreadMessage[];
  created_at: string;
  updated_at: string;
}

export interface PreviewThreadMessage {
  role: "customer" | "ai";
  text: string;
}

export interface EmailConnection {
  id: string;
  store_id: string;
  provider: string;
  email_address: string;
  nylas_grant_id: string;
  connection_status: "active" | "broken" | "disconnected";
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyConnection {
  id: string;
  store_id: string;
  shop_domain: string;
  access_token: string; // AES-256 encrypted
  scopes: string | null;
  created_at: string;
}

export interface StoreFaq {
  id: string;
  store_id: string;
  question: string;
  answer: string;
  enabled: boolean;
  source: "scraped" | "manual" | "learned";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreRule {
  id: string;
  store_id: string;
  type: "do" | "dont";
  rule: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  store_id: string;
  thread_id: string | null;
  nylas_message_id: string | null;
  intent: string;
  order_number: string | null;
  auto_sent: boolean;
  escalated: boolean;
  escalation_reason: string | null;
  response_time_ms: number | null;
  ai_model: string | null;
  ai_cost: number | null;
  quality_warning: string | null;
  merchant_rating: "good" | "bad" | null;
  created_at: string;
}

export interface ReviewQueueItem {
  id: string;
  store_id: string;
  nylas_message_id: string | null;
  thread_id: string | null;
  order_number: string | null;
  intent: string | null;
  escalation_reason: string;
  draft_reply: string | null;
  status: "pending" | "approved" | "replied" | "dismissed";
  reviewed_at: string | null;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  source: string;
  event_type: string;
  event_id: string;
  payload: Json | null;
  processed: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  email: string;
  website_url: string | null;
  source: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  scrape_status: string | null;
  scrape_data: Json | null;
  magic_link_token: string | null;
  magic_link_expires_at: string | null;
  magic_link_clicked: boolean;
  converted_to_merchant_id: string | null;
  created_at: string;
}

export interface Merchant {
  id: string;
  email: string;
  name: string | null;
  auth_provider: string;
  plan: "lead" | "active" | "starter" | "growth" | "cancelled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  emails_limit: number;
  emails_used_this_month: number;
  billing_cycle_start: string | null;
  magic_link_token: string | null;
  magic_link_expires_at: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// ============================================================
// Engine / Domain Types
// ============================================================

export type Intent =
  | "WISMO" // Where Is My Order
  | "RETURN"
  | "EXCHANGE"
  | "CANCEL"
  | "ORDER_PROBLEM"
  | "PRODUCT_QUESTION"
  | "GENERAL";

export interface EmailData {
  id: string; // Nylas message ID
  thread_id: string;
  from: string;
  subject: string;
  body: string;
  headers: Record<string, string>;
  cc?: string[];
  date: string;
}

export interface ClassifiedEmail {
  thread_id: string;
  message_id: string;
  grant_id: string;
  store_id: string;
  intent: Intent;
  extracted_order_number: string | null;
  extracted_customer_email: string | null; // NEVER logged or stored
}

export interface ProcessingResult {
  thread_id: string;
  action: "replied" | "queued" | "ignored" | "escalated" | "blocked";
  reason: string;
  reply_id: string | null;
}

export interface ShopifyOrder {
  id: string;
  order_number: string;
  name: string; // e.g. "#1234"
  email: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  line_items: OrderLineItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderLineItem {
  title: string;
  quantity: number;
  variant_title: string | null;
  fulfillment_status: string | null;
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  orders_count: number;
}

export interface ShopifyFulfillment {
  id: string;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_company: string | null;
}

// ============================================================
// Scraper Types
// ============================================================

export interface ScrapeExtractResult {
  brand_voice: string | null;
  company_summary: string | null;
  shipping_policy: string | null;
  return_policy: string | null;
  faqs: Array<{ question: string; answer: string }>;
  product_categories: string[];
  language: string;
  screenshot_url: string | null;
}

// ============================================================
// API Request / Response Types
// ============================================================

export interface CreateStoreRequest {
  store_name: string;
  website_url?: string;
}

export interface UpdateStoreRequest {
  store_name?: string;
  website_url?: string;
  brand_voice?: string;
  company_summary?: string;
  shipping_policy?: string;
  return_policy?: string;
  primary_language?: string;
  sign_off?: string;
  auto_send?: boolean;
}

export interface CreateFaqRequest {
  question: string;
  answer: string;
}

export interface UpdateFaqRequest {
  question?: string;
  answer?: string;
  enabled?: boolean;
  sort_order?: number;
}

export interface CreateRuleRequest {
  type: "do" | "dont";
  rule: string;
}

export interface LeadCaptureRequest {
  email: string;
  website_url?: string;
  source?: string;
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
}

export interface BillingCheckoutRequest {
  price_id: string;
  store_id?: string;
}

export interface ReviewQueueActionRequest {
  edited_reply?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  emails_today: number;
  emails_this_week: number;
  emails_this_month: number;
  auto_resolve_rate: number; // 0-1
  avg_response_time_ms: number;
  top_intents: IntentCount[];
  emails_limit: number;
  emails_used: number;
}

export interface IntentCount {
  intent: Intent | string;
  count: number;
}

export interface ActivityItem {
  id: string;
  store_id: string;
  thread_id: string | null;
  nylas_message_id: string | null;
  intent: string;
  order_number: string | null;
  auto_sent: boolean;
  escalated: boolean;
  escalation_reason: string | null;
  response_time_ms: number | null;
  merchant_rating: "good" | "bad" | null;
  created_at: string;
}

// ============================================================
// Inngest Event Schemas
// ============================================================

export interface InngestEmailReceivedEvent {
  name: "email/received";
  data: {
    grant_id: string;
    message_id: string;
    thread_id: string;
    store_id: string;
  };
}

export interface InngestScrapeWebsiteEvent {
  name: "store/scrape-website";
  data: {
    store_id: string;
    website_url: string;
    merchant_id: string;
  };
}

export interface InngestSendReplyEvent {
  name: "email/send-reply";
  data: {
    store_id: string;
    grant_id: string;
    thread_id: string;
    message_id: string;
    reply_text: string;
    review_queue_id: string | null;
  };
}

export interface InngestLeadScrapeEvent {
  name: "lead/scrape-website";
  data: {
    lead_id: string;
    email: string;
    website_url: string;
  };
}

export interface InngestLeadEmailEvent {
  name: "lead/send-magic-link";
  data: {
    lead_id: string;
    email: string;
    token: string;
    website_url: string | null;
  };
}

export interface InngestWeeklyReportEvent {
  name: "scheduled/weekly-report";
  data: Record<string, never>;
}

export type InngestEvents =
  | InngestEmailReceivedEvent
  | InngestScrapeWebsiteEvent
  | InngestSendReplyEvent
  | InngestLeadScrapeEvent
  | InngestLeadEmailEvent
  | InngestWeeklyReportEvent;

// ============================================================
// Preview Types
// ============================================================

export interface EmailPreview {
  original: {
    from: string;
    subject: string;
    snippet: string;
    date: string;
  };
  intent: Intent | null;
  ai_reply: string | null;
  order_found: boolean;
  error: string | null;
}

// ============================================================
// Stripe / Billing
// ============================================================

export type PlanName = "starter" | "growth" | "scale";

export interface PlanPricing {
  monthly: number;
  quarterly: number;
  yearly: number;
}

export interface PlanDetails {
  name: PlanName;
  price_eur: number; // monthly price (kept for backwards compat)
  pricing: PlanPricing;
  emails_limit: number;
  features: string[];
  price_id_env: string;
}

export const PLANS: Record<PlanName, PlanDetails> = {
  starter: {
    name: "starter",
    price_eur: 89,
    pricing: { monthly: 89, quarterly: 69, yearly: 59 },
    emails_limit: 100,
    features: [
      "100 email replies/month",
      "1 store",
      "Shopify order lookup",
      "Multi-language",
      "Review queue",
    ],
    price_id_env: "STRIPE_PRICE_ID_STARTER",
  },
  growth: {
    name: "growth",
    price_eur: 189,
    pricing: { monthly: 189, quarterly: 169, yearly: 159 },
    emails_limit: 500,
    features: [
      "500 email replies/month",
      "Up to 3 stores",
      "Shopify order lookup",
      "Multi-language",
      "Review queue",
      "Priority support",
    ],
    price_id_env: "STRIPE_PRICE_ID_GROWTH",
  },
  scale: {
    name: "scale",
    price_eur: 489,
    pricing: { monthly: 489, quarterly: 469, yearly: 459 },
    emails_limit: 2500,
    features: [
      "2500 email replies/month",
      "Unlimited stores",
      "Shopify order lookup",
      "Multi-language",
      "Review queue",
      "Priority support",
      "Weekly performance emails",
      "Dedicated account manager",
    ],
    price_id_env: "STRIPE_PRICE_ID_SCALE",
  },
};
