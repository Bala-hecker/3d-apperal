const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://odzjjrictpiictymwwho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kempqcmljdHBpaWN0eW13d2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODAyOTMsImV4cCI6MjA5NDY1NjI5M30.ny_hflLBaJhhQuoRbX11FKjQf28GrfbdEpoP6CTFDJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_template, glb_file_url, category, description, texture_url, gallery_urls');
  
  if (error) {
    console.error('Error fetching:', error);
    process.exit(1);
  }

  console.log(`Total products in database: ${data.length}\n`);

  data.forEach((p, idx) => {
    const isTemplate = p.is_template === true || !!p.glb_file_url;
    const cat = (p.category || "").toLowerCase().trim();
    const isCatMatch = cat === "custom-template" || cat === "template" || cat.startsWith("custom-");
    const isNameMatch = (p.name || "").toLowerCase().includes("template") || (p.name || "").toLowerCase().includes("blank");
    const isAllowName = p.allow_name === true || p.allow_number === true;
    const desc = p.description || "";
    const isDescMatch = desc.includes("<!--PERS:NAME=true") || desc.includes("<!--PERS:NUMBER=true");

    const customizable = isTemplate || isCatMatch || isNameMatch || isAllowName || isDescMatch;

    console.log(`[Product ${idx + 1}]`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Name: ${p.name.substring(0, 50)}...`);
    console.log(`  glb_file_url: "${p.glb_file_url}"`);
    console.log(`  texture_url: "${p.texture_url}"`);
    console.log(`  gallery_urls: "${p.gallery_urls}"`);
    console.log(`  is_template: ${p.is_template}`);
    console.log(`  category: "${p.category}"`);
    console.log(`  allow_name: ${p.allow_name}, allow_number: ${p.allow_number}`);
    console.log(`  Customizable: ${customizable}`);
    console.log(`  Reason details: isTemplate=${isTemplate}, isCatMatch=${isCatMatch}, isNameMatch=${isNameMatch}, isAllowName=${isAllowName}, isDescMatch=${isDescMatch}`);
    console.log('');
  });

  process.exit(0);
}

run();
