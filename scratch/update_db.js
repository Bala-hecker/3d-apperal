const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://odzjjrictpiictymwwho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kempqcmljdHBpaWN0eW13d2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODAyOTMsImV4cCI6MjA5NDY1NjI5M30.ny_hflLBaJhhQuoRbX11FKjQf28GrfbdEpoP6CTFDJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_CARDS = [
  {
    id: 1,
    badge: 'Thread3D Originals',
    title: 'Classic Boxy Tees',
    description: 'Perfect drop-shoulder silhouettes tailored from 380 GSM certified organic cotton.',
    image_url: '/boxy_tee_promo.png',
    cta_text: 'Explore Drop',
    cta_href: '/dashboard?category=t-shirt',
    accent_color: 'indigo',
    display_order: 0
  },
  {
    id: 2,
    badge: 'Anime Special Edition',
    title: 'The Anime Zone',
    description: 'Officially licensed subculture prints and glowing reflective patterns.',
    image_url: '/anime_streetwear_promo.png',
    cta_text: 'Explore Drop',
    cta_href: '/dashboard?q=anime',
    accent_color: 'purple',
    display_order: 1
  },
  {
    id: 3,
    badge: 'Interactive Studio',
    title: 'Create in 3D Customizer',
    description: 'Upload your graphics, change base colors, adjust lighting and roughness properties live.',
    image_url: '/threejs_customizer_promo.png',
    cta_text: 'Design Now',
    cta_href: '/studio',
    accent_color: 'pink',
    display_order: 2
  },
  {
    id: 4,
    badge: 'Premium Jackets',
    title: 'Cozy Winterwear',
    description: 'Heavy luxury fleece garments, utility jacket shells, and oversized joggers.',
    image_url: '/winter_jacket_promo.png',
    cta_text: 'Explore Drop',
    cta_href: '/dashboard?category=jacket',
    accent_color: 'emerald',
    display_order: 3
  }
];

async function run() {
  console.log('Upserting 4 default promo cards into homepage_promo_cards...');
  const { data, error } = await supabase
    .from('homepage_promo_cards')
    .upsert(DEFAULT_CARDS, { onConflict: 'id' })
    .select();
  
  if (error) {
    console.error('Error upserting homepage_promo_cards:', error);
    process.exit(1);
  } else {
    console.log('Upsert successful! Rows upserted:', data);
    process.exit(0);
  }
}

run();
