const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://odzjjrictpiictymwwho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kempqcmljdHBpaWN0eW13d2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODAyOTMsImV4cCI6MjA5NDY1NjI5M30.ny_hflLBaJhhQuoRbX11FKjQf28GrfbdEpoP6CTFDJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing insert of default razorpay row...');
  const { data, error } = await supabase
    .from('payment_gateway_settings')
    .insert([
      {
        id: 'razorpay',
        enabled: false,
        key_id: '',
        key_secret: '',
        webhook_secret: '',
        mock_mode_enabled: true
      }
    ])
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert successful:', data);
  }
}

run();
