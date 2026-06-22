const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://odzjjrictpiictymwwho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kempqcmljdHBpaWN0eW13d2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODAyOTMsImV4cCI6MjA5NDY1NjI5M30.ny_hflLBaJhhQuoRbX11FKjQf28GrfbdEpoP6CTFDJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing RPC exec_sql to add shipping_details column...');
  const { data, error } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_details JSONB;'
  });

  if (error) {
    console.error('RPC exec_sql failed:', error);
  } else {
    console.log('RPC exec_sql succeeded:', data);
  }
}

run();
