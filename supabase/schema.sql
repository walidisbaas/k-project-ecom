-- ============================================================
-- Kenso AI — Supabase Database Schema
-- Run this in the Supabase SQL editor for your project.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Merchants (one per Supabase Auth user)
-- NOTE: The id must match auth.users.id for RLS to work
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  auth_provider TEXT DEFAULT 'email',
  plan TEXT NOT NULL DEFAULT 'lead'
    CHECK (plan IN ('lead', 'active', 'starter', 'growth', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  emails_limit INT NOT NULL DEFAULT 0,
  emails_used_this_month INT NOT NULL DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ,
  magic_link_token TEXT,
  magic_link_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Auto-create merchant row on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO merchants (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (email) DO UPDATE
    SET id = NEW.id; -- link existing lead merchant to auth user
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Stores
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  website_url TEXT,
  brand_voice TEXT,
  company_summary TEXT,
  shipping_policy TEXT,
  return_policy TEXT,
  primary_language TEXT DEFAULT 'en',
  sign_off TEXT DEFAULT 'Best regards',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  auto_send BOOLEAN NOT NULL DEFAULT TRUE,
  has_broken_connection BOOLEAN DEFAULT FALSE,
  onboarding_step INT DEFAULT 1,
  scrape_status TEXT DEFAULT 'pending'
    CHECK (scrape_status IN ('pending', 'scraping', 'complete', 'failed')),
  scrape_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email connections (Nylas grant)
CREATE TABLE IF NOT EXISTS email_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'nylas',
  email_address TEXT NOT NULL,
  nylas_grant_id TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'active'
    CHECK (connection_status IN ('active', 'broken', 'disconnected')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, email_address)
);

-- Shopify connections
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL, -- AES-256 encrypted, format: v1:iv_hex:ct_hex
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id)
);

-- Store FAQs
CREATE TABLE IF NOT EXISTS store_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'scraped'
    CHECK (source IN ('scraped', 'manual', 'learned')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Store rules (do's and don'ts)
CREATE TABLE IF NOT EXISTS store_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('do', 'dont')),
  rule TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email logs (metadata only — no email bodies ever stored, GDPR compliant)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  thread_id TEXT,
  nylas_message_id TEXT,
  intent TEXT NOT NULL DEFAULT 'GENERAL',
  order_number TEXT,
  auto_sent BOOLEAN NOT NULL DEFAULT FALSE,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_reason TEXT,
  response_time_ms INT,
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_cost DECIMAL(10,6),
  quality_warning TEXT,
  merchant_rating TEXT CHECK (merchant_rating IN ('good', 'bad')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review queue (for escalated or manual-review emails)
CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  nylas_message_id TEXT,
  thread_id TEXT,
  order_number TEXT,
  intent TEXT,
  escalation_reason TEXT NOT NULL,
  draft_reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'replied', 'dismissed')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook events (for idempotency checks)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads (from landing page — before signup)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  website_url TEXT,
  source TEXT,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  scrape_status TEXT DEFAULT 'pending',
  scrape_data JSONB,
  magic_link_token TEXT,
  magic_link_expires_at TIMESTAMPTZ,
  magic_link_clicked BOOLEAN DEFAULT FALSE,
  converted_to_merchant_id UUID REFERENCES merchants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stores_merchant ON stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_live ON stores(is_live) WHERE is_live = TRUE;
CREATE INDEX IF NOT EXISTS idx_email_connections_store ON email_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_email_connections_grant ON email_connections(nylas_grant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_store_created ON email_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_thread ON email_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_escalated ON email_logs(escalated) WHERE escalated = TRUE;
CREATE INDEX IF NOT EXISTS idx_review_queue_store_status ON review_queue(store_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_token ON leads(magic_link_token);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

-- Merchants can only access their own row
CREATE POLICY merchants_self ON merchants
  FOR ALL USING (id = auth.uid());

-- Merchants can only access their own stores
CREATE POLICY stores_owner ON stores
  FOR ALL USING (merchant_id = auth.uid());

-- Access through store ownership chain
CREATE POLICY email_connections_owner ON email_connections
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY shopify_connections_owner ON shopify_connections
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY store_faqs_owner ON store_faqs
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY store_rules_owner ON store_rules
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY email_logs_owner ON email_logs
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY review_queue_owner ON review_queue
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

-- webhook_events and leads: no RLS — accessed only by service role
-- (webhook handlers and admin operations only)

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Increment monthly email usage counter
CREATE OR REPLACE FUNCTION increment_emails_used(merchant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE merchants
  SET emails_used_this_month = emails_used_this_month + 1,
      updated_at = NOW()
  WHERE id = merchant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GDPR cleanup: purge old data
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Email logs: keep 30 days
  DELETE FROM email_logs WHERE created_at < NOW() - INTERVAL '30 days';
  -- Completed review queue: keep 7 days
  DELETE FROM review_queue
    WHERE status IN ('replied', 'dismissed')
    AND created_at < NOW() - INTERVAL '7 days';
  -- Webhook events: keep 90 days
  DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Reset monthly email usage (called by Stripe invoice.paid webhook)
CREATE OR REPLACE FUNCTION reset_monthly_email_usage() RETURNS void AS $$
BEGIN
  UPDATE merchants
  SET emails_used_this_month = 0,
      billing_cycle_start = NOW()
  WHERE billing_cycle_start < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
