const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://odzjjrictpiictymwwho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kempqcmljdHBpaWN0eW13d2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODAyOTMsImV4cCI6MjA5NDY1NjI5M30.ny_hflLBaJhhQuoRbX11FKjQf28GrfbdEpoP6CTFDJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying all orders...');
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(o => {
      console.log(`ID: ${o.id}, Email: ${o.customer_email}, Status: ${o.status}, Total: ${o.total_amount}`);
    });
  }
}

run();
