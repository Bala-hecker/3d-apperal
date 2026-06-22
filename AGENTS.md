# 3D Apparel Studio Project Guidelines

This file provides crucial information for any future developer or AI agent working on this codebase.

## 🚀 Tech Stack & Setup
* **Framework**: Next.js (using App Router).
* **Database**: Supabase (PostgreSQL) with local offline redundancy fallback handling.
* **3D Engine**: Three.js (WebGL renderer) for the 3D Customizer Studio.
* **Styling**: Vanilla CSS with Tailwind-like Utility layout elements (dark theme design system).

---

## 🛠️ Build & Run Commands
* **Start local development server**:
  ```bash
  npm run dev
  ```
* **Build production package**:
  ```bash
  npm run build
  ```
* **Linting / Code check**:
  ```bash
  npm run lint
  ```

---

## 💾 Database Schema & Migrations
* **Schema definitions**: All custom database structures (tables like `studio_pricing_settings`, `product_reviews`, `payment_gateway_settings`, `coupons`, `categories`, and `system_logs`) are located in [schema.sql](file:///e:/APP%203D/3d-apparel-studio/schema.sql) at the root of the project.
* **How to update database**: 
  1. Append any new migrations/tables/columns to `schema.sql`.
  2. Paste and run the statements in the **Supabase SQL Editor** dashboard.
  3. Ensure you add corresponding validations to `checkDatabaseSchema()` in [src/app/admin/page.js](file:///e:/APP%203D/3d-apparel-studio/src/app/admin/page.js) to keep the diagnostics alerts healthy.

---

## ☁️ Hosting & Deployment
Currently configured for **Vercel** but built to be portable.

### Required Environment Variables:
Ensure these are set in your hosting platform (Vercel, Netlify, VPS, etc.):
* `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous client API key.
* `NEXT_PUBLIC_ADMIN_EMAIL`: Comma-separated list of emails authorized to access the Admin Panel (`/admin`).

### Moving Away From Vercel in the Future:
If migrating to a different hosting platform (e.g. AWS, Netlify, VPS/Docker):
1. **Next.js Portability**: Next.js is fully portable. You can host it on any Node.js environment by running `npm run build` followed by `npm start`, or by using the `@standalone` output configuration in `next.config.mjs` for Docker.
2. **Environment Variables**: Re-configure the required environment variables in the settings of your new host.
3. **Database Independence**: The database runs on Supabase (independent of Vercel), meaning moving your front-end host will *not* affect database records.
