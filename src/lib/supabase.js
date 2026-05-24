import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
let supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const isPlaceholder = !supabaseUrl.startsWith('https://') || 
                      !supabaseAnonKey || 
                      supabaseAnonKey === 'undefined' || 
                      supabaseAnonKey === 'null' ||
                      supabaseAnonKey === 'placeholder-key';

if (isPlaceholder) {
  console.warn(
    "⚠️ Supabase Configuration Missing or Invalid!\n" +
    `URL: ${supabaseUrl || "Not set"}\n` +
    `Key: ${supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : "Not set"}\n\n` +
    "This usually happens after deployment if the environment variables are not configured in your hosting platform (Vercel, Netlify, etc.) or if they were added after the build without triggering a redeploy.\n" +
    "Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your deployment environment variables and trigger a new build."
  );

  if (!supabaseUrl.startsWith('https://')) {
    supabaseUrl = 'https://placeholder.supabase.co';
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined' || supabaseAnonKey === 'null') {
    supabaseAnonKey = 'placeholder-key';
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

