"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { 
  Sparkles, 
  Paintbrush, 
  Sliders, 
  ArrowRight, 
  ShoppingBag, 
  MousePointerClick,
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  Flame,
  CheckCircle,
  Truck,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Gift,
  Calendar,
  Clock,
  Shirt,
  Baby,
  Gem,
  Home,
  X
} from "lucide-react";

const getDisplayImage = (p) => {
  if (!p) return "";
  const isTemplate = p.is_template === true || !!p.glb_file_url || (p.category && (p.category.toLowerCase().trim() === "template" || p.category.toLowerCase().trim() === "custom-template" || p.category.toLowerCase().trim().startsWith("custom-"))) || (p.name && (p.name.toLowerCase().includes("template") || p.name.toLowerCase().includes("blank")));
  if (isTemplate && p.gallery_urls) {
    const urls = p.gallery_urls.includes(",") 
      ? p.gallery_urls.split(",").map(u => u.trim()).filter(Boolean)
      : [p.gallery_urls.trim()];
    if (urls.length > 0) return urls[0];
  }
  return p.texture_url || "";
};

const parseDescriptionPersonalization = (descString) => {
  const result = {
    cleanDescription: descString || "",
    allowName: false,
    allowNumber: false,
    stockStatus: "in_stock"
  };
  if (!descString) return result;
  
  const match = descString.match(/<!--PERS:NAME=(true|false),NUMBER=(true|false)-->/);
  if (match) {
    result.allowName = match[1] === "true";
    result.allowNumber = match[2] === "true";
  }

  const stockMatch = descString.match(/<!--STOCK:STATUS=(in_stock|out_of_stock)-->/);
  if (stockMatch) {
    result.stockStatus = stockMatch[1];
  }

  result.cleanDescription = descString
    .replace(/<!--PERS:NAME=(true|false),NUMBER=(true|false)-->/g, "")
    .replace(/<!--STOCK:STATUS=(in_stock|out_of_stock)-->/g, "")
    .trim();

  return result;
};

// Countdown Timer Component for Limited Edition Drops
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let newTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return newTimeLeft;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (num) => String(num).padStart(2, "0");

  return (
    <div className="flex gap-1.5 text-[10px] font-mono font-black">
      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-indigo-400 min-w-[28px] text-center">
        <span>{pad(timeLeft.days)}</span>
        <span className="text-[6px] text-zinc-555 block font-sans uppercase font-bold tracking-tight">d</span>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-indigo-400 min-w-[28px] text-center">
        <span>{pad(timeLeft.hours)}</span>
        <span className="text-[6px] text-zinc-555 block font-sans uppercase font-bold tracking-tight">h</span>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-indigo-400 min-w-[28px] text-center">
        <span>{pad(timeLeft.minutes)}</span>
        <span className="text-[6px] text-zinc-555 block font-sans uppercase font-bold tracking-tight">m</span>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-indigo-400 min-w-[28px] text-center">
        <span>{pad(timeLeft.seconds)}</span>
        <span className="text-[6px] text-zinc-555 block font-sans uppercase font-bold tracking-tight">s</span>
      </div>
    </div>
  );
}

// Flash Offer countdown timer component (mm:ss or hh:mm:ss style)
function FlashOfferCountdown({ targetDate, onExpire }) {
  const [timeLeft, setTimeLeft] = useState("00:00");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        if (onExpire) onExpire();
        return "EXPIRED";
      }
      const totalSeconds = Math.floor(difference / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  return (
    <span className="font-mono text-3xl font-black tracking-widest text-rose-500 animate-pulse bg-zinc-950 px-4 py-2 border border-zinc-900 rounded-xl">
      {timeLeft}
    </span>
  );
}

// Individual Product Card Component for the Trending Shelf
function ProductCard({ product, index, setBgColor }) {
  const cardRef = useRef(null);
  const imageRef = useRef(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const [rating, setRating] = useState("0.0");
  const [reviewsCount, setReviewsCount] = useState(0);

  const fetchRealRating = async () => {
    try {
      const { data: dbReviews } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_id", product.id);
        
      let localReviews = [];
      try {
        localReviews = JSON.parse(localStorage.getItem("apparel_reviews_local") || "[]")
          .filter(r => r.product_id === product.id);
      } catch {}

      const combined = [...(dbReviews || [])];
      localReviews.forEach(lr => {
        const exists = combined.some(dr => dr.rating === lr.rating);
        if (!exists) combined.push(lr);
      });

      const total = combined.length;
      if (total > 0) {
        const avg = (combined.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1);
        setRating(avg);
        setReviewsCount(total);
      } else {
        setRating("0.0");
        setReviewsCount(0);
      }
    } catch (e) {
      setRating("0.0");
      setReviewsCount(0);
    }
  };

  useEffect(() => {
    const wl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
    setIsWishlisted(wl.includes(product.id));

    const handleUpdate = () => {
      const updatedWl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
      setIsWishlisted(updatedWl.includes(product.id));
    };
    window.addEventListener("wishlist-updated", handleUpdate);
    
    fetchRealRating();
    
    return () => window.removeEventListener("wishlist-updated", handleUpdate);
  }, [product.id]);

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/auth";
      return;
    }
    const wl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
    let updated;
    if (isWishlisted) {
      updated = wl.filter(id => id !== product.id);
    } else {
      updated = [...wl, product.id];
    }
    localStorage.setItem("apparel_wishlist", JSON.stringify(updated));
    setIsWishlisted(!isWishlisted);
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  useGSAP(() => {
    if (!cardRef.current || !imageRef.current) return;

    // Fade-in animation on scroll
    gsap.fromTo(cardRef.current, 
      { y: 40, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.8, 
        ease: "power3.out", 
        delay: index * 0.1, 
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 90%"
        }
      }
    );

    // Hover background color shifting trigger
    ScrollTrigger.create({
      trigger: cardRef.current,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        const colors = {
          "t-shirt": "rgba(79, 70, 229, 0.04)",
          "hoodie": "rgba(147, 51, 234, 0.04)",
          "jacket": "rgba(236, 72, 153, 0.04)",
          "activewear": "rgba(56, 189, 248, 0.04)"
        };
        const color = colors[product.category?.toLowerCase()] || "rgba(255, 255, 255, 0.01)";
        setBgColor(color);
      }
    });

  }, { scope: cardRef, dependencies: [product] });

  return (
    <div ref={cardRef} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all duration-300 group flex flex-col justify-between">
      <Link href={`/product/${product.id}`} className="block relative bg-zinc-900 overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <img 
          ref={imageRef}
          src={getDisplayImage(product)} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        
        {/* Category Tag */}
        {product.category && (
          <div className="absolute top-3 left-3 bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm z-10 shadow-md">
            {product.category}
          </div>
        )}
        
        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 p-2 rounded-full bg-zinc-950/70 border border-zinc-800/80 text-zinc-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-zinc-900 transition-all duration-200 z-10 shadow-md"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </Link>
      
      <div className="p-4 flex flex-col justify-between flex-grow">
        <div>
          {/* Rating */}
          {reviewsCount > 0 ? (
            <div className="flex items-center gap-1 mb-1.5 select-none">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-[11px] font-bold text-zinc-300">{rating}</span>
              <span className="text-[10px] text-zinc-550">({reviewsCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mb-1.5 text-zinc-600 select-none">
              <Star className="w-3.5 h-3.5 text-zinc-700" />
              <span className="text-[10px] font-bold text-zinc-500">No reviews yet</span>
            </div>
          )}
          
          <Link href={`/product/${product.id}`} className="block">
            <h3 className="font-bold text-sm text-zinc-200 group-hover:text-white line-clamp-1 transition-colors">{product.name}</h3>
          </Link>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-base font-black text-indigo-400">₹{(product.price || 3999).toLocaleString('en-IN')}</span>
          <Link 
            href={`/product/${product.id}`}
            className="text-xs font-bold text-zinc-400 group-hover:text-indigo-400 group-hover:underline transition-all duration-200 flex items-center gap-1"
          >
            <span>Buy</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomeLandingPage() {
  const containerRef = useRef(null);
  const [session, setSession] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [designsCount, setDesignsCount] = useState(0);
  const [overlayColor, setOverlayColor] = useState("rgba(0,0,0,0)");
  const [announcementText, setAnnouncementText] = useState("⚡ NEXT-GEN 3D STUDIO COUTURE DROP LIVE · USE CODE THREAD3D FOR 20% OFF ⚡");
  const [activeFlashOffer, setActiveFlashOffer] = useState(null);
  const [flashOfferProduct, setFlashOfferProduct] = useState(null);
  const [flashOffersList, setFlashOffersList] = useState([]); // multi-offer list
  const [flashOffersProducts, setFlashOffersProducts] = useState({}); // {product_id: product}
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);

  // Dynamic Promotion Cards State & Default Seed Values
  const [promoCards, setPromoCards] = useState([
    { id: 1, badge: "Thread3D Originals", title: "Classic Boxy Tees", description: "Perfect drop-shoulder silhouettes tailored from 380 GSM certified organic cotton.", image_url: "/boxy_tee_promo.png", cta_text: "Explore Drop", cta_href: "/dashboard?category=t-shirt", accent_color: "indigo" },
    { id: 2, badge: "Anime Special Edition", title: "The Anime Zone", description: "Officially licensed subculture prints and glowing reflective patterns.", image_url: "/anime_streetwear_promo.png", cta_text: "Explore Drop", cta_href: "/dashboard?q=anime", accent_color: "purple" },
    { id: 3, badge: "Interactive Studio", title: "Create in 3D Customizer", description: "Upload your graphics, change base colors, adjust lighting and roughness properties live.", image_url: "/threejs_customizer_promo.png", cta_text: "Design Now", cta_href: "/studio", accent_color: "pink" },
    { id: 4, badge: "Premium Jackets", title: "Cozy Winterwear", description: "Heavy luxury fleece garments, utility jacket shells, and oversized joggers.", image_url: "/winter_jacket_promo.png", cta_text: "Explore Drop", cta_href: "/dashboard?category=jacket", accent_color: "emerald" }
  ]);

  const colorMap = {
    indigo: {
      badge: "text-indigo-400",
      accentGlow: "bg-indigo-500/10",
      hoverGlow: "group-hover:bg-indigo-950/20",
      btnText: "group-hover:text-indigo-400",
      borderHover: "group-hover:border-indigo-500/40"
    },
    purple: {
      badge: "text-purple-400",
      accentGlow: "bg-purple-500/10",
      hoverGlow: "group-hover:bg-purple-950/20",
      btnText: "group-hover:text-purple-400",
      borderHover: "group-hover:border-purple-500/40"
    },
    pink: {
      badge: "text-pink-400",
      accentGlow: "bg-pink-500/10",
      hoverGlow: "group-hover:bg-pink-950/20",
      btnText: "group-hover:text-pink-400",
      borderHover: "group-hover:border-pink-500/40"
    },
    emerald: {
      badge: "text-emerald-400",
      accentGlow: "bg-emerald-500/10",
      hoverGlow: "group-hover:bg-emerald-950/20",
      btnText: "group-hover:text-emerald-400",
      borderHover: "group-hover:border-emerald-500/40"
    },
    blue: {
      badge: "text-blue-400",
      accentGlow: "bg-blue-500/10",
      hoverGlow: "group-hover:bg-blue-950/20",
      btnText: "group-hover:text-blue-400",
      borderHover: "group-hover:border-blue-500/40"
    },
    red: {
      badge: "text-red-400",
      accentGlow: "bg-red-500/10",
      hoverGlow: "group-hover:bg-red-950/20",
      btnText: "group-hover:text-red-400",
      borderHover: "group-hover:border-red-500/40"
    },
    amber: {
      badge: "text-amber-400",
      accentGlow: "bg-amber-500/10",
      hoverGlow: "group-hover:bg-amber-950/20",
      btnText: "group-hover:text-amber-400",
      borderHover: "group-hover:border-amber-500/40"
    }
  };

  const getCardStyle = (colorName) => {
    const norm = (colorName || "indigo").toLowerCase().trim();
    return colorMap[norm] || colorMap.indigo;
  };

  const [carouselSlides, setCarouselSlides] = useState([
    {
      id: 1,
      image_url: "/banner_studio.png",
      title: "Design in Real-Time 3D",
      subtitle: "Relocate standard e-commerce limits. Experience a premium workspace featuring real-time Three.js model viewport loading, Fabric.js decals, and studio lighting presets.",
      badge: "3D STUDIO CONFIGURATOR",
      cta_text: "Enter 3D Studio",
      cta_href: "/studio",
      accent: "from-indigo-400 via-purple-500 to-pink-500"
    },
    {
      id: 2,
      image_url: "/banner_anime.png",
      title: "Licensed Pop-Culture Drops",
      subtitle: "Pre-designed premium streetwear drops inspired by anime, gaming, and urban subcultures. Tailored with heavyweight 380 GSM fleece and ready to ship.",
      badge: "NEW SEASON COLLECTIONS",
      cta_text: "Shop Ready-to-Wear",
      cta_href: "/dashboard",
      accent: "from-orange-400 via-red-500 to-yellow-500"
    },
    {
      id: 3,
      image_url: "/banner_membership.png",
      title: "Thread3D Membership Club",
      subtitle: "Join the VIP Club to get exclusive early access to drop collabs, free scaling customization, and 20% off your first 3D print order. Use code THREAD3D at checkout.",
      badge: "LIMITED VIP ENROLLMENT",
      cta_text: "Use Code: THREAD3D",
      cta_href: "/dashboard",
      accent: "from-purple-600 via-pink-600 to-blue-500"
    }
  ]);

  const [shopCategories, setShopCategories] = useState([
    { id: "t-shirt", label: "Tees", image: "/cat_tees.png", href: "/dashboard?category=t-shirt" },
    { id: "hoodie", label: "Hoodies", image: "/cat_hoodies.png", href: "/dashboard?category=hoodie" },
    { id: "jacket", label: "Jackets", image: "/cat_jackets.png", href: "/dashboard?category=jacket" },
    { id: "activewear", label: "Active", image: "/cat_activewear.png", href: "/dashboard?category=activewear" },
    { id: "custom", label: "3D Custom", image: "/cat_custom.png", href: "/studio" }
  ]);

  // Carousel controls
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  useEffect(() => {
    // Autoplay Carousel every 6 seconds
    slideInterval.current = setInterval(nextSlide, 6000);
    return () => clearInterval(slideInterval.current);
  }, []);

  // GSAP animations on load
  useGSAP(() => {
    // 1. Reveal page sections smoothly on scroll
    gsap.fromTo(".fade-in-section",
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.8, 
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".fade-in-section",
          start: "top 85%"
        }
      }
    );

    // 2. Parallax Background Spotlights (Scrubbed with Scroll)
    gsap.to(".bg-spotlight", {
      y: (i, target) => -120 * (i + 1),
      scale: 1.15,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1.2
      }
    });

    // 3. Category Circles Stagger Scale
    gsap.fromTo(".category-circle",
      { scale: 0.7, opacity: 0 },
      { 
        scale: 1, 
        opacity: 1, 
        duration: 0.6, 
        stagger: 0.08, 
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ".category-section",
          start: "top 90%"
        }
      }
    );

  }, { scope: containerRef });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Fetch featured catalog products (non-templates)
    const fetchFeatured = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, price, texture_url, category, gallery_urls, glb_file_url, is_template")
          .order("created_at", { ascending: false });
        if (data) {
          const nonTemplates = data.filter(p => {
            if (p.glb_file_url) return false;
            if (p.is_template === true) return false;
            const cat = (p.category || "").toLowerCase().trim();
            if (cat === "custom-template" || cat === "template" || cat.startsWith("custom-")) return false;
            const name = (p.name || "").toLowerCase();
            if (name.includes("template") || name.includes("blank")) return false;
            return true;
          });
          setFeaturedProducts(nonTemplates.slice(0, 4));
        }
      } catch {}
      finally { setLoadingFeatured(false); }
    };
    fetchFeatured();

    // Fetch total designs count
    const fetchDesignsCount = async () => {
      try {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true });
        
        let localCount = 0;
        try {
          const stored = localStorage.getItem("apparel_products_local");
          localCount = stored ? JSON.parse(stored).length : 0;
        } catch {}
        
        setDesignsCount((count || 0) + localCount);
      } catch (err) {
        try {
          const stored = localStorage.getItem("apparel_products_local");
          setDesignsCount(stored ? JSON.parse(stored).length : 0);
        } catch {}
      }
    };
    fetchDesignsCount();

    // Fetch dynamic carousel banners from Supabase (fallback to localStorage)
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_banners")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          setCarouselSlides(data);
        }
      } catch (err) {
        console.warn("Could not load homepage banners from Supabase, checking local storage:", err.message || err);
        try {
          const saved = localStorage.getItem("apparel_banners_local");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.length > 0) {
              setCarouselSlides(parsed);
            }
          }
        } catch (localErr) {
          console.error("Failed to load local banners on landing page:", localErr);
        }
      }
    };
    fetchBanners();

    // Fetch dynamic promo cards from Supabase (fallback to localStorage)
    const fetchPromoCards = async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_promo_cards")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          setPromoCards(data);
        }
      } catch (err) {
        console.warn("Could not load homepage promo cards from Supabase, checking local storage:", err.message || err);
        try {
          const saved = localStorage.getItem("apparel_promo_cards_local");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.length > 0) {
              setPromoCards(parsed);
            }
          }
        } catch (localErr) {
          console.error("Failed to load local promo cards on landing page:", localErr);
        }
      }
    };
    fetchPromoCards();

    // Fetch dynamic category buttons from Supabase categories table
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("id", { ascending: true });
        
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = data.map(cat => ({
            id: cat.id,
            label: cat.label === "T-Shirts" ? "Tees" : cat.label === "Activewears" ? "Active" : cat.label,
            image: cat.image_url || "/cat_tees.png",
            href: `/dashboard?category=${cat.id}`
          }));
          mapped.push({ id: "custom", label: "3D Custom", image: "/cat_custom.png", href: "/studio" });
          setShopCategories(mapped);
        }
      } catch (err) {
        console.warn("Could not load homepage categories from Supabase (using defaults):", err.message || err);
      }
    };
    fetchCategories();

    // Fetch dynamic announcement ticker & flash offer settings (fallback to localStorage)
    const fetchAnnouncementText = async () => {
      const applyLocalSettings = () => {
        try {
          const saved = localStorage.getItem("apparel_storefront_settings_local");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.announcement_text) setAnnouncementText(parsed.announcement_text);
            if (parsed.offer_product_id && parsed.offer_ends_at) {
              const diff = +new Date(parsed.offer_ends_at) - +new Date();
              if (diff > 0) {
                setActiveFlashOffer(parsed);
                try {
                  const localProds = JSON.parse(localStorage.getItem("apparel_products_local") || "[]");
                  const matched = localProds.find(p => p.id === parsed.offer_product_id);
                  if (matched) setFlashOfferProduct(matched);
                } catch {}
              }
            }
          }
        } catch (localErr) {
          console.error("Failed to load local storefront settings on landing page:", localErr);
        }
      };

      try {
        const res = await fetch("/api/announcement");
        const data = await res.json();
        if (res.ok && data) {
          if (data.announcement_text) {
            setAnnouncementText(data.announcement_text);
          }
          // Multi-offer list (new)
          const now = new Date();
          const validOffers = (data.flash_offers_list || []).filter(o => o.ends_at && new Date(o.ends_at) > now);
          if (validOffers.length > 0) {
            setFlashOffersList(validOffers);
            setActiveFlashOffer(validOffers[0]); // first = hero
            // Fetch product details for all offers
            const prodMap = {};
            for (const offer of validOffers) {
              const { data: pd, error: pe } = await supabase.from("products").select("*").eq("id", offer.product_id).single();
              if (!pe && pd) prodMap[offer.product_id] = pd;
              else {
                try {
                  const lp = JSON.parse(localStorage.getItem("apparel_products_local") || "[]");
                  const m = lp.find(p => p.id === offer.product_id);
                  if (m) prodMap[offer.product_id] = m;
                } catch {}
              }
            }
            setFlashOffersProducts(prodMap);
            setFlashOfferProduct(prodMap[validOffers[0].product_id] || null);
          } else if (data.offer_product_id && data.offer_ends_at) {
            // Legacy single offer fallback
            const difference = +new Date(data.offer_ends_at) - +new Date();
            if (difference > 0) {
              setActiveFlashOffer(data);
              const { data: prodData, error: prodError } = await supabase.from("products").select("*").eq("id", data.offer_product_id).single();
              if (!prodError && prodData) {
                setFlashOfferProduct(prodData);
              } else {
                try {
                  const localProds = JSON.parse(localStorage.getItem("apparel_products_local") || "[]");
                  const matched = localProds.find(p => p.id === data.offer_product_id);
                  if (matched) setFlashOfferProduct(matched);
                } catch {}
              }
            }
          }
          if (data.fallbackMode) {
            applyLocalSettings();
          }
        } else {
          applyLocalSettings();
        }
      } catch (err) {
        console.warn("Could not load storefront announcement text & flash offer, checking local storage:", err);
        applyLocalSettings();
      }
    };
    fetchAnnouncementText();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loadingFeatured) {
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [loadingFeatured, featuredProducts]);

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-clip relative select-none">
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out z-0"
        style={{ backgroundColor: overlayColor }}
      />
      
      {/* Background Neon Spotlights */}
      <div className="bg-spotlight absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="bg-spotlight absolute top-[30%] right-1/4 w-[700px] h-[700px] bg-purple-600/5  rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="bg-spotlight absolute bottom-[10%] left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Global Navbar */}
      <Navbar />

      {/* Category Sub-Navbar */}
      <div className="w-full bg-zinc-950/40 border-b border-zinc-900/60 backdrop-blur-md relative z-20 pt-3 pb-0 select-none overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-start md:justify-center gap-4 md:gap-8 min-w-max">
          {[
            { label: "For You", icon: Sparkles, href: "/dashboard", color: "hover:text-indigo-400 hover:border-indigo-400 text-zinc-400" },
            { label: "Men", icon: Shirt, href: "/dashboard?q=men", color: "hover:text-blue-400 hover:border-blue-400 text-zinc-400" },
            { label: "Women", icon: Heart, href: "/dashboard?q=women", color: "hover:text-pink-400 hover:border-pink-400 text-zinc-400" },
            { label: "Kids", icon: Baby, href: "/dashboard?q=kids", color: "hover:text-amber-400 hover:border-amber-400 text-zinc-400" },
            { label: "Accessories", icon: Gem, href: "/dashboard?q=accessories", color: "hover:text-emerald-400 hover:border-emerald-400 text-zinc-400" },
            { label: "Home & Living", icon: Home, href: "/dashboard?q=home", color: "hover:text-teal-400 hover:border-teal-400 text-zinc-400" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className={`flex items-center gap-2.5 pb-3 pt-1 border-b-2 border-transparent transition-all duration-300 group cursor-pointer font-medium hover:font-bold select-none ${item.color}`}
              >
                <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-[13px] sm:text-sm uppercase tracking-wider font-sans select-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ====== ANNOUNCEMENT TICKER ====== */}
      <div className="w-full bg-indigo-650 border-b border-indigo-500/20 text-white py-2.5 text-[10px] sm:text-xs font-black tracking-widest uppercase overflow-hidden select-none relative z-20">
        <div className="animate-marquee flex gap-16">
          <span>{announcementText}</span>
          <span>{announcementText}</span>
          <span>{announcementText}</span>
          <span>{announcementText}</span>
        </div>
      </div>

      {/* ====== HERO CAROUSEL ====== */}
      <section className="relative pt-6 md:pt-8">
        <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[75vh] overflow-hidden bg-black">
          {carouselSlides.map((slide, idx) => (
            <div 
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out flex items-center ${
                idx === currentSlide ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Background Image Banner */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={slide.image_url} 
                  alt={slide.title} 
                  className="w-full h-full object-cover opacity-65"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent hidden md:block" />
              </div>
              
              {/* Content Panel */}
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-xl md:max-w-2xl text-left space-y-4">
                  {/* Badge */}
                  <span className="inline-block text-[10px] sm:text-xs font-black bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-3.5 py-1 rounded-full uppercase tracking-wider">
                    {slide.badge}
                  </span>
                  
                  {/* Title */}
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-none tracking-tight">
                    {slide.title.split(" ").map((word, wIdx) => {
                      if (word === "3D" || word === "VIP" || word === "Pop-Culture") {
                        return (
                          <span key={wIdx} className={`bg-gradient-to-r ${slide.accent} bg-clip-text text-transparent mr-2.5`}>
                            {word}
                          </span>
                        );
                      }
                      return <span key={wIdx} className="mr-2.5">{word}</span>;
                    })}
                  </h1>
                  
                  {/* Subtitle */}
                  <p className="text-zinc-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-lg font-medium">
                    {slide.subtitle}
                  </p>
                  
                  {/* Action Link */}
                  <div className="pt-2">
                    <Link
                      href={slide.cta_href}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <span>{slide.cta_text}</span>
                      <ArrowRight className="w-4 h-4 text-zinc-950" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Navigation Controls */}
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-zinc-950/50 border border-zinc-900/50 hover:bg-zinc-900 text-white hover:border-zinc-700 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-zinc-950/50 border border-zinc-900/50 hover:bg-zinc-900 text-white hover:border-zinc-700 transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {carouselSlides.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? "w-6 bg-indigo-500" : "w-1.5 bg-zinc-600 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ====== SHOP BY CATEGORY (Circular Grid) ====== */}
      <section className="category-section py-12 border-b border-zinc-900/50 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center mb-8">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              TOP CATEGORIES
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Shop by Category</h2>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
            {shopCategories.map((cat) => (
              <Link 
                key={cat.id} 
                href={cat.href}
                className="category-circle flex flex-col items-center group cursor-pointer"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group-hover:border-indigo-500/80 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
                  <img src={cat.image} alt={cat.label} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                </div>
                <span className="text-xs font-extrabold text-zinc-400 group-hover:text-white mt-3 uppercase tracking-wider transition-colors duration-200">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ====== THEMATIC 2x2 PROMOTION GRID ====== */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoCards.map((card) => {
            const styles = getCardStyle(card.accent_color);
            return (
              <Link 
                key={card.id}
                href={card.cta_href}
                className="group relative h-[28rem] rounded-3xl overflow-hidden border border-zinc-900 hover:border-zinc-800 transition-all duration-300 flex items-end p-6 bg-zinc-950"
              >
                {/* Backdrop Image if uploaded */}
                {card.image_url ? (
                  <>
                    <img 
                      src={card.image_url} 
                      alt={card.title} 
                      className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-65 transition-all duration-700 ease-out z-0" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/60 to-transparent z-10" />
                    {/* Background pattern */}
                    <div className="absolute inset-0 bg-grid-white/[0.01] z-0" />
                  </>
                )}
                
                <div className={`absolute inset-0 z-0 transition-all duration-500 ${styles.hoverGlow}`} />
                <div className={`absolute -right-6 -bottom-6 w-40 h-40 rounded-full blur-[40px] pointer-events-none z-0 ${styles.accentGlow}`} />
                
                {/* Floating Glassmorphic Text Card */}
                <div className={`relative z-20 w-full bg-zinc-950/75 border border-zinc-900 rounded-2xl p-5 select-none transition-all duration-300 backdrop-blur-md hover:bg-zinc-950/85 ${styles.borderHover}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest block ${styles.badge}`}>{card.badge}</span>
                  <h3 className="text-lg font-black text-white mt-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-355 transition-all">{card.title}</h3>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1.5 line-clamp-2">{card.description}</p>
                  <div className={`text-xs font-black text-white flex items-center gap-1.5 mt-4 transition-colors ${styles.btnText}`}>
                    <span className="group-hover:underline">{card.cta_text || "Explore Drop"}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ====== NEW ARRIVALS SHELF ====== */}
      {(loadingFeatured || featuredProducts.length > 0) && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">NEW ARRIVALS</span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">New Streetwear Arrivals</h2>
              <p className="text-xs text-zinc-500 mt-1">The latest ready-to-wear drops, fresh from the atelier.</p>
            </div>
            <Link 
              href="/dashboard" 
              className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1 group transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-zinc-900" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-1/3" />
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} setBgColor={setOverlayColor} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ====== FLASH SALE SPOTLIGHT SECTION ====== */}
      <section className="py-20 border-t border-zinc-900/60 bg-zinc-950/40 relative">
        <div className="absolute inset-0 bg-grid-white/[0.005] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-1 rounded-full uppercase tracking-wider font-sans">
              <Flame className="w-3 h-3 animate-pulse" /> Flash Deals
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-light text-white tracking-tight uppercase">
              Exclusive Flash Offers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed max-w-md mx-auto">
              Limited-time discounts on premium catalog collections. Customize in 3D or buy directly before the countdown timer expires!
            </p>
          </div>

          {activeFlashOffer && flashOfferProduct ? (
            <div className="space-y-6">
              {/* ── HERO FLASH OFFER ── */}
              <div className="bg-gradient-to-br from-zinc-900/80 via-zinc-950 to-zinc-900/80 border border-rose-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl max-w-4xl mx-auto">
                {/* Decorative glows */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  {/* Product Image Panel */}
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-850 relative group shadow-lg">
                    <img
                      src={getDisplayImage(flashOfferProduct)}
                      alt={flashOfferProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-rose-650 text-white font-extrabold text-[10px] px-3 py-1 rounded-full select-none tracking-widest uppercase animate-pulse shadow-md">
                        🔥 FLASH DEAL - {activeFlashOffer.offer_discount_percent ?? activeFlashOffer.discount_percent}% OFF
                      </span>
                    </div>
                  </div>

                  {/* Offer Details Panel */}
                  <div className="space-y-6 text-left">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Flame className="w-4 h-4 animate-pulse text-rose-500" />
                        LIMITED TIME STAGE PROMO
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight">
                        {flashOfferProduct.name}
                      </h2>
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                        {flashOfferProduct.description
                          ? parseDescriptionPersonalization(flashOfferProduct.description).cleanDescription
                          : "Limited custom couture garments. Secure this flash discount now."}
                      </p>
                    </div>

                    {/* Pricing and Timer Display */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900">
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Special Promo Pricing</span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-2xl font-black text-rose-400">
                            ₹{Math.round(flashOfferProduct.price * (1 - (activeFlashOffer.offer_discount_percent ?? activeFlashOffer.discount_percent) / 100)).toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm text-zinc-500 line-through font-bold">
                            ₹{flashOfferProduct.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Offer Ends In</span>
                        <FlashOfferCountdown
                          targetDate={activeFlashOffer.offer_ends_at ?? activeFlashOffer.ends_at}
                          onExpire={() => {
                            setActiveFlashOffer(null);
                            setFlashOfferProduct(null);
                            setFlashOffersList([]);
                          }}
                        />
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-4">
                      <Link
                        href={flashOfferProduct.glb_file_url ? `/studio?template=${flashOfferProduct.id}` : `/product/${flashOfferProduct.id}`}
                        className="flex-1 text-center py-3 bg-gradient-to-r from-rose-600 to-pink-650 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        {flashOfferProduct.glb_file_url ? "Customize Now in 3D" : "Buy Now with Discount"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECONDARY OFFER CARDS (offers 2+) ── */}
              {flashOffersList.length > 1 && (
                <div className="max-w-4xl mx-auto">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Flame className="w-3 h-3 text-rose-500" /> More Flash Deals
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashOffersList.slice(1).map((offer) => {
                      const prod = flashOffersProducts[offer.product_id];
                      if (!prod) return null;
                      const discPct = offer.discount_percent;
                      const salePrice = Math.round(prod.price * (1 - discPct / 100));
                      return (
                        <div
                          key={offer.product_id}
                          className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-rose-500/30 transition-all group"
                        >
                          <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
                            <img
                              src={getDisplayImage(prod)}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                              🔥 {discPct}% OFF
                            </span>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs font-bold text-white truncate">{prod.name}</p>
                              <p className="text-[10px] text-zinc-500 capitalize">{prod.category}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-black text-rose-400">₹{salePrice.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-zinc-600 line-through">₹{prod.price.toLocaleString('en-IN')}</span>
                              </div>
                              <FlashOfferCountdown
                                targetDate={offer.ends_at}
                                onExpire={() => setFlashOffersList(prev => prev.filter(o => o.product_id !== offer.product_id))}
                              />
                            </div>
                            <Link
                              href={prod.glb_file_url ? `/studio?template=${prod.id}` : `/product/${prod.id}`}
                              className="block w-full text-center py-2 bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 font-bold text-[10px] rounded-lg border border-rose-500/20 transition-all"
                            >
                              {prod.glb_file_url ? "Customize in 3D" : "Grab Deal"}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div className="bg-zinc-900/10 border border-zinc-900 rounded-3xl p-10 text-center space-y-4 max-w-3xl mx-auto relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-[60px]" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/5 rounded-full blur-[60px]" />
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-2xl w-fit mx-auto text-zinc-500">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-zinc-300 uppercase tracking-wider">Next Flash Drop Incoming</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Our creators activate flash offers at random times. Check back regularly or watch the announcement ticker to catch limited edition pricing.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====== PERSONALIZED 3D DESIGNER FOR ₹499 SECTION ====== */}
      <section className="py-20 border-t border-zinc-900/60 bg-zinc-950 relative overflow-hidden">
        {/* Background Gradients & Spotlight */}
        <div className="absolute inset-0 bg-grid-white/[0.005] pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual Column */}
            <div className="lg:col-span-5 relative">
              {/* Designer Screen Mockup */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative backdrop-blur-xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Visual Simulation of a Designer Window */}
                <div className="aspect-[4/3] rounded-2xl bg-zinc-950 border border-zinc-900/80 relative flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Canvas Grid Background */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
                  
                  {/* Glowing Accent Spot */}
                  <div className="absolute w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none animate-pulse" />
                  
                  {/* Vector Mockup / Icon Display */}
                  <div className="z-10 flex flex-col items-center gap-4 text-center">
                    <div className="p-4 bg-zinc-900 border border-zinc-805 rounded-2xl shadow-lg relative">
                      <Paintbrush className="w-12 h-12 text-indigo-400 animate-bounce" />
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full animate-ping" />
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase block mb-1">PRO-DESIGN MODE</span>
                      <h4 className="text-white font-extrabold text-sm tracking-wide">3D Layering & Decal Mapping</h4>
                    </div>
                  </div>

                  {/* Tiny floating status cards */}
                  <div className="absolute bottom-4 left-4 bg-zinc-950/90 border border-zinc-850 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-bold text-zinc-300 backdrop-blur-md flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Seamless Texturing</span>
</div>
                  <div className="absolute top-4 right-4 bg-zinc-950/90 border border-zinc-850 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-bold text-indigo-400 backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>₹499 Package</span>
                  </div>
                </div>

                {/* Service Metadata Row */}
                <div className="mt-6 grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-zinc-950/50 border border-zinc-900/50 p-2.5 rounded-xl">
                    <span className="text-[9px] text-zinc-550 block font-bold uppercase tracking-wider">Scope</span>
                    <span className="text-xs text-white font-black">Visual Layout</span>
                  </div>
                  <div className="bg-zinc-950/50 border border-zinc-900/50 p-2.5 rounded-xl">
                    <span className="text-[9px] text-zinc-550 block font-bold uppercase tracking-wider">Garment</span>
                    <span className="text-xs text-white font-black">Selected Item</span>
                  </div>
                  <div className="bg-zinc-950/50 border border-zinc-900/50 p-2.5 rounded-xl">
                    <span className="text-[9px] text-zinc-550 block font-bold uppercase tracking-wider">Placement</span>
                    <span className="text-xs text-white font-black">As Preferred</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1 rounded-full uppercase tracking-wider font-sans">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> Premium Services
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none">
                  Personalized 3D <br />
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Designer Service</span>
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-xl">
                  Stuck with your design placement? Let our professional apparel designer align your logos, size your graphics, and layout your custom artwork perfectly on the garment you select. We focus 100% on perfecting the visual design configuration.
                </p>
              </div>

              {/* Service Benefits List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {[
                  "1-on-1 Virtual Design Consultation",
                  "Logo & graphics placement setup",
                  "Custom pattern layout & text alignment",
                  "Garment-specific configuration review",
                  "Unlimited design revisions until approved"
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="bg-indigo-500/10 border border-indigo-500/25 p-1 rounded-full text-indigo-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] sm:text-xs text-zinc-300 font-bold tracking-wide">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA Booking Button */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => {
                    window.dispatchEvent(new Event("open-designer-chat"));
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-400 hover:via-purple-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer text-center uppercase tracking-widest animate-pulse"
                >
                  Hire Designer for ₹499
                </button>
                <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
                  ⚡ 100% focus on design layout & placement
                </span>
              </div>

            </div>

          </div>
        </div>
      </section>
      {/* ====== DETAILED SITE TRUST BADGES ====== */}
      <section className="py-12 border-t border-b border-zinc-900/60 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2 group p-4 border border-transparent hover:border-zinc-900 rounded-2xl transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Truck className="w-5 h-5 text-indigo-400" />
              </div>
              <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">Standard Shipping</h4>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">Tracked shipping calculated at payment checkout</p>
            </div>
            
            <div className="flex flex-col items-center gap-2 group p-4 border border-transparent hover:border-zinc-900 rounded-2xl transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">Secure Checkout</h4>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">Encrypted processing via Razorpay & Stripe gateway</p>
            </div>

            <div className="flex flex-col items-center gap-2 group p-4 border border-transparent hover:border-zinc-900 rounded-2xl transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-5 h-5 text-pink-400" />
              </div>
              <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">Easy Returns</h4>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">7-day hassle-free exchanges on standard purchases</p>
            </div>

            <div className="flex flex-col items-center gap-2 group p-4 border border-transparent hover:border-zinc-900 rounded-2xl transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">Quality Guarantee</h4>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">Garments crafted using premium 380 GSM textiles</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== DETAILED SITEMAP FOOTER ====== */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-16 text-zinc-550 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            
            <div className="space-y-4">
              <div className="text-lg font-black text-white">Thread<span className="text-indigo-400">3D</span></div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Luxury streetwear and pop-culture apparel, designed by you in real-time 3D, and hand-tailored on demand in high-grade fabrics. Relocate e-commerce limits.
              </p>
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold text-zinc-400">Join the movement:</div>
                <div className="flex gap-2">
                  {["📷", "🐦", "🎵", "👾"].map((s, i) => (
                    <span key={i} className="cursor-pointer hover:scale-110 transition-transform">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-4">Shop Collections</h4>
              <ul className="space-y-2.5 text-xs font-bold">
                <li><Link href="/dashboard?category=t-shirt" className="hover:text-indigo-400 transition-colors">T-Shirts Collection</Link></li>
                <li><Link href="/dashboard?category=hoodie" className="hover:text-indigo-400 transition-colors">Heavy Hoodies</Link></li>
                <li><Link href="/dashboard?category=jacket" className="hover:text-indigo-400 transition-colors">Winter Jackets</Link></li>
                <li><Link href="/dashboard?category=activewear" className="hover:text-indigo-400 transition-colors">High-Performance Active</Link></li>
                <li><Link href="/studio" className="hover:text-indigo-400 transition-colors">Blank Templates</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-4">Tools & Customizer</h4>
              <ul className="space-y-2.5 text-xs font-bold">
                <li><Link href="/studio" className="hover:text-indigo-400 transition-colors">Customizables</Link></li>
                <li><Link href="/dashboard" className="hover:text-indigo-400 transition-colors">Ready-to-Wear Store</Link></li>
                <li><Link href="/admin" className="hover:text-indigo-400 transition-colors">Merchant Dashboard</Link></li>
                <li><Link href="/auth" className="hover:text-indigo-450 transition-colors">Customer Login / SignUp</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-4">Contact Support</h4>
              <p className="text-xs leading-relaxed font-semibold">
                Have questions about custom printing, decals resolution, or sizing charts? Reach out to the desk:
              </p>
              <div className="space-y-1.5 text-xs font-bold">
                <div className="text-zinc-400">Email: help@thread3d.com</div>
                <div className="text-zinc-400">Response time: &lt; 12 hours</div>
              </div>
            </div>

          </div>
          
          <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium">
            <p>© 2026 Thread3D Studio LLC. All rights reserved.</p>
            <p>Designed and Built with Next.js · Three.js · Fabric.js · Supabase</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
