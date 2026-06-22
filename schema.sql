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
  mock_mode_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add mock_mode_enabled column for existing databases
ALTER TABLE payment_gateway_settings ADD COLUMN IF NOT EXISTS mock_mode_enabled BOOLEAN DEFAULT FALSE;

-- Disable RLS for payment gateway settings (or configure policy as preferred)
ALTER TABLE payment_gateway_settings DISABLE ROW LEVEL SECURITY;

-- Insert default placeholder for Razorpay
INSERT INTO payment_gateway_settings (id, enabled, key_id, key_secret, webhook_secret, mock_mode_enabled)
VALUES ('razorpay', false, '', '', '', false)
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

-- 13. Create the custom 3D studio pricing settings table
CREATE TABLE IF NOT EXISTS studio_pricing_settings (
  id TEXT PRIMARY KEY,
  cotton_upcharge NUMERIC DEFAULT 0,
  polyester_upcharge NUMERIC DEFAULT 999,
  fleece_upcharge NUMERIC DEFAULT 1299,
  customization_base_fee NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for studio_pricing_settings to allow public fetching of active upcharges
ALTER TABLE studio_pricing_settings DISABLE ROW LEVEL SECURITY;

-- Insert default starter settings
INSERT INTO studio_pricing_settings (id, cotton_upcharge, polyester_upcharge, fleece_upcharge, customization_base_fee)
VALUES ('default', 0, 999, 1299, 0)
ON CONFLICT (id) DO NOTHING;

-- 14. Add material customization columns (roughness, metalness, bump scale)
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS cotton_roughness NUMERIC DEFAULT 0.85;
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS cotton_metalness NUMERIC DEFAULT 0.1;
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS cotton_bump_scale NUMERIC DEFAULT 0.04;

ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS polyester_roughness NUMERIC DEFAULT 0.25;
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS polyester_metalness NUMERIC DEFAULT 0.45;
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS polyester_bump_scale NUMERIC DEFAULT 0.02;

ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS fleece_roughness NUMERIC DEFAULT 1.0;
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS fleece_metalness NUMERIC DEFAULT 0.05;
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS fleece_bump_scale NUMERIC DEFAULT 0.06;

-- 15. Add material name (label) and description columns
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS cotton_label TEXT DEFAULT 'Matte Organic Cotton';
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS cotton_desc TEXT DEFAULT 'Flat, organic 100% cotton threads';

ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS polyester_label TEXT DEFAULT 'Shiny Athletic Polyester';
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS polyester_desc TEXT DEFAULT 'Reflective, sleek high-performance finish';

ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS fleece_label TEXT DEFAULT 'Heavy Luxury Fleece';
ALTER TABLE studio_pricing_settings ADD COLUMN IF NOT EXISTS fleece_desc TEXT DEFAULT 'Extra thick, warm luxury heavy fleece feel';

-- 16. Create the homepage banners table for dynamic carousel sliders
CREATE TABLE IF NOT EXISTS homepage_banners (
  id INT PRIMARY KEY,
  badge TEXT DEFAULT '',
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  cta_text TEXT DEFAULT 'Learn More',
  cta_href TEXT DEFAULT '/',
  accent TEXT DEFAULT 'from-indigo-500 via-purple-500 to-pink-500',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) to ensure public fetching
ALTER TABLE homepage_banners DISABLE ROW LEVEL SECURITY;

-- Insert the 3 default slides
INSERT INTO homepage_banners (id, badge, title, subtitle, image_url, cta_text, cta_href, accent, display_order)
VALUES 
  (1, '3D STUDIO CONFIGURATOR', 'Design in Real-Time 3D', 'Relocate standard e-commerce limits. Experience a premium workspace featuring real-time Three.js model viewport loading, Fabric.js decals, and studio lighting presets.', '/banner_studio.png', 'Enter 3D Studio', '/studio', 'from-indigo-400 via-purple-500 to-pink-500', 0),
  (2, 'NEW SEASON COLLECTIONS', 'Licensed Pop-Culture Drops', 'Pre-designed premium streetwear drops inspired by anime, gaming, and urban subcultures. Tailored with heavyweight 380 GSM fleece and ready to ship.', '/banner_anime.png', 'Shop Ready-to-Wear', '/dashboard', 'from-orange-400 via-red-500 to-yellow-500', 1),
  (3, 'LIMITED VIP ENROLLMENT', 'Thread3D Membership Club', 'Join the VIP Club to get exclusive early access to drop collabs, free scaling customization, and 20% off your first 3D print order. Use code THREAD3D at checkout.', '/banner_membership.png', 'Use Code: THREAD3D', '/dashboard', 'from-purple-600 via-pink-600 to-blue-500', 2)
ON CONFLICT (id) DO NOTHING;

-- 17. Create the storefront settings table for the announcement bar
CREATE TABLE IF NOT EXISTS storefront_settings (
  id TEXT PRIMARY KEY,
  announcement_text TEXT DEFAULT '⚡ NEXT-GEN 3D STUDIO COUTURE DROP LIVE · USE CODE THREAD3D FOR 20% OFF ⚡',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) to ensure public fetching
ALTER TABLE storefront_settings DISABLE ROW LEVEL SECURITY;

-- Insert default storefront settings
INSERT INTO storefront_settings (id, announcement_text)
VALUES ('default', '⚡ NEXT-GEN 3D STUDIO COUTURE DROP LIVE · USE CODE THREAD3D FOR 20% OFF ⚡')
ON CONFLICT (id) DO NOTHING;

-- 18. Create the homepage promo cards table for the 2x2 grid
CREATE TABLE IF NOT EXISTS homepage_promo_cards (
  id INT PRIMARY KEY,
  badge TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  cta_text TEXT DEFAULT 'Explore Drop',
  cta_href TEXT DEFAULT '/',
  accent_color TEXT DEFAULT 'indigo',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) to ensure public fetching
ALTER TABLE homepage_promo_cards DISABLE ROW LEVEL SECURITY;

-- Insert the 4 default cards
INSERT INTO homepage_promo_cards (id, badge, title, description, image_url, cta_text, cta_href, accent_color, display_order)
VALUES 
  (1, 'Thread3D Originals', 'Classic Boxy Tees', 'Perfect drop-shoulder silhouettes tailored from 380 GSM certified organic cotton.', '/boxy_tee_promo.png', 'Explore Drop', '/dashboard?category=t-shirt', 'indigo', 0),
  (2, 'Anime Special Edition', 'The Anime Zone', 'Officially licensed subculture prints and glowing reflective patterns.', '/anime_streetwear_promo.png', 'Explore Drop', '/dashboard?q=anime', 'purple', 1),
  (3, 'Interactive Studio', 'Create in 3D Customizer', 'Upload your graphics, change base colors, adjust lighting and roughness properties live.', '/threejs_customizer_promo.png', 'Design Now', '/studio', 'pink', 2),
  (4, 'Premium Jackets', 'Cozy Winterwear', 'Heavy luxury fleece garments, utility jacket shells, and oversized joggers.', '/winter_jacket_promo.png', 'Explore Drop', '/dashboard?category=jacket', 'emerald', 3)
ON CONFLICT (id) DO NOTHING;

-- 19. Add gender classification column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'unisex';

-- 20. Add image_url column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

UPDATE categories SET image_url = '/cat_tees.png' WHERE id = 't-shirt';
UPDATE categories SET image_url = '/cat_hoodies.png' WHERE id = 'hoodie';
UPDATE categories SET image_url = '/cat_jackets.png' WHERE id = 'jacket';
UPDATE categories SET image_url = '/cat_activewear.png' WHERE id = 'activewear';

-- 21. Add columns for dynamic Flash Offers to storefront_settings
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS offer_product_id TEXT;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS offer_discount_percent INT DEFAULT 0;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS offer_ends_at TIMESTAMPTZ;

-- 22. Add columns for Designer consultation settings to storefront_settings
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS designer_fee INT DEFAULT 500;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS designer_enabled BOOLEAN DEFAULT TRUE;

-- 23. Note: Designer consultation orders paid successfully will have status initialized to 'confirming_design'.
-- Fulfillment transition order flow: confirming_design -> processing -> shipped -> delivered.

-- 24. Add multi-product flash offers list (JSONB array) to storefront_settings
-- Each entry: { product_id, discount_percent, ends_at }
-- First entry is the featured "hero" offer; remaining are secondary offers shown below.
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS flash_offers_list JSONB DEFAULT '[]';







