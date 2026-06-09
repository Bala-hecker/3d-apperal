-- SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- Run this script inside your Supabase project's SQL Editor (https://supabase.com) to add all required tracking and pricing columns!

-- 1. Add pricing column to the products table (Inventory CRUD)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 49.99;

-- 2. Add shipping carrier & tracking details to the orders table (Fulfillment & Stepper)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'razorpay';

-- 3. Create the system security logs table (System Logs Ledger)
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  operator TEXT,
  action TEXT
);

-- 4. Disable RLS for system logs to ensure clean admin updates (or configure policy as preferred)
ALTER TABLE system_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 't-shirt';

-- 6. Add template indicator, description, and gallery columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_urls TEXT DEFAULT '';

-- 7. Create the product reviews table (Amazon reviews tracker)
CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  product_id TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  author TEXT
);

-- 8. Disable RLS for product reviews to ensure clean guest submissions (or configure policy as preferred)
ALTER TABLE product_reviews DISABLE ROW LEVEL SECURITY;

-- 9. Create the payment gateway settings table
CREATE TABLE IF NOT EXISTS payment_gateway_settings (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  key_id TEXT,
  key_secret TEXT,
  webhook_secret TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for payment gateway settings (or configure policy as preferred)
ALTER TABLE payment_gateway_settings DISABLE ROW LEVEL SECURITY;

-- Insert default placeholder for Razorpay
INSERT INTO payment_gateway_settings (id, enabled, key_id, key_secret, webhook_secret)
VALUES ('razorpay', false, '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 10. Create the coupons table for discount management
CREATE TABLE IF NOT EXISTS coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  usage_limit INT DEFAULT NULL, -- NULL means unlimited
  used_count INT DEFAULT 0,
  is_first_time_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for coupons to ensure guest checkout verification
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;

-- Insert default "THREAD3D" coupon
INSERT INTO coupons (code, discount_percent, usage_limit, used_count, is_first_time_only, is_active)
VALUES ('THREAD3D', 20, 1000, 0, false, true)
ON CONFLICT (code) DO NOTHING;

-- 11. Create the product categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for categories (or configure policy as preferred)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Insert default built-in categories
INSERT INTO categories (id, label) VALUES
  ('t-shirt', 'T-Shirts'),
  ('hoodie', 'Hoodies'),
  ('jacket', 'Jackets'),
  ('activewear', 'Activewears')
ON CONFLICT (id) DO NOTHING;

-- 12. Add dedicated columns for jersey personalization and stock status to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_name BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_number BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock';

