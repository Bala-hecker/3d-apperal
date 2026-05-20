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

-- 5. Add category column to products table (Category Selector Integration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 't-shirt';
