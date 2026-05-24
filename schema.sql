-- SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- Run this script inside your Supabase project's SQL Editor (https://supabase.com) to add all required tracking and pricing columns!

-- 1. Add pricing column to the products table (Inventory CRUD)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 49.99;

-- 2. Add shipping carrier & tracking details to the orders table (Fulfillment & Stepper)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

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

