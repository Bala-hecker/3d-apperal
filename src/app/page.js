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
  Heart
} from "lucide-react";

function MagneticProductCard({ product, index, setBgColor }) {
  const cardRef = useRef(null);
  const imageRef = useRef(null);
  const textRef = useRef(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const wl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
    setIsWishlisted(wl.includes(product.id));

    const handleUpdate = () => {
      const updatedWl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
      setIsWishlisted(updatedWl.includes(product.id));
    };
    window.addEventListener("wishlist-updated", handleUpdate);
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
    if (!cardRef.current || !imageRef.current || !textRef.current) return;

    let proxy = { skew: 0 };
    let skewSetter = gsap.quickTo(imageRef.current, "skewY", { duration: 0.8, ease: "power3" });
    let clamp = gsap.utils.clamp(-15, 15);

    const st = ScrollTrigger.create({
      trigger: cardRef.current,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        let skew = clamp(self.getVelocity() / -100);
        if (Math.abs(skew) > Math.abs(proxy.skew)) {
          proxy.skew = skew;
          gsap.to(proxy, {
            skew: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.4)",
            overwrite: "auto",
            onUpdate: () => skewSetter(proxy.skew)
          });
        }
      },
      onEnter: () => {
        const colors = {
          "t-shirt": "rgba(79, 70, 229, 0.05)",
          "hoodie": "rgba(147, 51, 234, 0.05)",
          "jacket": "rgba(236, 72, 153, 0.05)",
          "activewear": "rgba(56, 189, 248, 0.05)"
        };
        const color = colors[product.category?.toLowerCase()] || "rgba(255, 255, 255, 0.02)";
        setBgColor(color);
      },
      onEnterBack: () => {
        const colors = {
          "t-shirt": "rgba(79, 70, 229, 0.05)",
          "hoodie": "rgba(147, 51, 234, 0.05)",
          "jacket": "rgba(236, 72, 153, 0.05)",
          "activewear": "rgba(56, 189, 248, 0.05)"
        };
        const color = colors[product.category?.toLowerCase()] || "rgba(255, 255, 255, 0.02)";
        setBgColor(color);
      }
    });

    gsap.set(imageRef.current, { transformOrigin: "center center", force3D: true });
    
    const xToImg = gsap.quickTo(imageRef.current, "x", { duration: 0.6, ease: "power3" });
    const yToImg = gsap.quickTo(imageRef.current, "y", { duration: 0.6, ease: "power3" });
    const xToText = gsap.quickTo(textRef.current, "x", { duration: 0.4, ease: "power3" });
    const yToText = gsap.quickTo(textRef.current, "y", { duration: 0.4, ease: "power3" });

    const handleMouseMove = (e) => {
      const rect = cardRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const moveX = (relX - centerX) * 0.1;
      const moveY = (relY - centerY) * 0.1;
      
      xToImg(moveX);
      yToImg(moveY);
      
      xToText(moveX * 1.5);
      yToText(moveY * 1.5);
    };

    const handleMouseLeave = () => {
      xToImg(0);
      yToImg(0);
      xToText(0);
      yToText(0);
      gsap.to(imageRef.current, { scale: 1, filter: "brightness(1)", duration: 0.5 });
    };
    
    const handleMouseEnter = () => {
      gsap.to(imageRef.current, { scale: 1.05, filter: "brightness(0.95)", duration: 0.5 });
    };

    const card = cardRef.current;
    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);
    card.addEventListener("mouseenter", handleMouseEnter);

    gsap.fromTo(cardRef.current, 
      { y: 50, opacity: 0, clipPath: "inset(10%)" },
      { y: 0, opacity: 1, clipPath: "inset(0%)", duration: 1.2, ease: "power4.out", delay: index * 0.2, scrollTrigger: {
          trigger: cardRef.current,
          start: "top 85%"
      }}
    );

    return () => {
      st.kill();
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
      card.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, { dependencies: [product] });

  return (
    <Link ref={cardRef} href={`/product/${product.id}`} className="block group cursor-pointer relative bg-zinc-900/25 border border-zinc-900 hover:border-zinc-700 rounded-2xl overflow-hidden transition-colors">
      <div className="relative bg-zinc-950 overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <img 
          ref={imageRef}
          src={product.texture_url} 
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {product.category && (
          <div className="absolute top-2 left-2 bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm z-10">
            {product.category}
          </div>
        )}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/50 text-zinc-400 hover:text-rose-400 hover:border-rose-400/50 transition-colors z-10"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>
      <div ref={textRef} className="p-3 will-change-transform">
        <h3 className="font-bold text-xs text-zinc-200 group-hover:text-white line-clamp-2 transition-colors">{product.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-black text-indigo-400">₹{(product.price || 3999).toLocaleString('en-IN')}</span>
          <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-400 transition-colors">View →</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeLandingPage() {
  const containerRef = useRef(null);
  const [session, setSession] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [designsCount, setDesignsCount] = useState(0);
  const [overlayColor, setOverlayColor] = useState("rgba(0,0,0,0)");

  useGSAP(() => {
    // 1. God-Level Hero Reveal
    // We split the hero elements to do a dramatic 3D fold-in with clip-path
    gsap.set(".hero-reveal", { perspective: 1000 });
    gsap.fromTo(".hero-reveal", 
      { 
        y: 80, 
        opacity: 0, 
        rotateX: -45, 
        scale: 0.9,
        clipPath: "inset(100% 0% 0% 0%)"
      }, 
      { 
        y: 0, 
        opacity: 1, 
        rotateX: 0, 
        scale: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.8, 
        stagger: 0.05, 
        ease: "power4.out", 
        delay: 0 
      }
    );

    // 2. Parallax Background Spotlights (Scrubbed with Scroll)
    gsap.to(".bg-spotlight", {
      y: (i, target) => -150 * (i + 1), // Different parallax speeds
      scale: 1.2,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1.5
      }
    });



    // 4. Trust Badges Magnetic Spring
    gsap.fromTo(".trust-badge",
      { y: 40, scale: 0.5, opacity: 0, rotationZ: -10 },
      { y: 0, scale: 1, opacity: 1, rotationZ: 0, duration: 0.5, stagger: 0.05, ease: "elastic.out(1.2, 0.5)", scrollTrigger: {
        trigger: ".trust-section",
        start: "top 85%"
      }}
    );

    // 5. Steps Section Skew & Slide
    gsap.fromTo(".step-card",
      { y: 80, opacity: 0, skewY: 5 },
      { y: 0, opacity: 1, skewY: 0, duration: 0.5, stagger: 0.05, ease: "power4.out", scrollTrigger: {
        trigger: ".steps-section",
        start: "top 80%"
      }}
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
          .select("id, name, price, texture_url, category, gallery_urls, glb_file_url")
          .is("glb_file_url", null)
          .eq("is_template", false)
          .order("created_at", { ascending: false })
          .limit(4);
        if (data && data.length > 0) {
          setFeaturedProducts(data);
        }
      } catch {}
      finally { setLoadingFeatured(false); }
    };
    fetchFeatured();

    // Fetch legitimate total designs count
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

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Dynamically refresh ScrollTrigger to adapt to content loading / page height changes
    if (!loadingFeatured) {
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [loadingFeatured, featuredProducts]);



  const steps = [
    {
      icon: <MousePointerClick className="w-5 h-5 text-indigo-400" />,
      title: "1. Select Base Mesh",
      desc: "Choose from our designer library of blanks—including raw-hem tees, oversized hoodies, utility jackets, and activewear mesh."
    },
    {
      icon: <Paintbrush className="w-5 h-5 text-purple-400" />,
      title: "2. Overlay Graphics & Text",
      desc: "Upload custom transparent decals, configure text layers with premium typography, or paint freehand brush strokes directly."
    },
    {
      icon: <Sliders className="w-5 h-5 text-pink-400" />,
      title: "3. Choose Premium Fabric",
      desc: "Simulate fabric weave properties in real-time, toggle studio environment lights, and select sizing guides for tailored precision."
    },
    {
      icon: <ShoppingBag className="w-5 h-5 text-emerald-400" />,
      title: "4. Checkout & Fabricate",
      desc: "Place your order securely via Stripe or local UPI. Your design package is zipped with vectors and sent to physical printing."
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden relative">
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out z-0"
        style={{ backgroundColor: overlayColor }}
      />
      
      {/* Background Neon Spotlights */}
      <div className="bg-spotlight absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="bg-spotlight absolute top-[30%] right-1/4 w-[700px] h-[700px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="bg-spotlight absolute bottom-[10%] left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Global Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Badge indicator */}
          <div className="hero-reveal inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-8 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Interactive 3D Apparel Configurator</span>
          </div>

          {/* Main Title */}
          <h1 className="hero-reveal text-balance text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-none max-w-4xl mx-auto">
            Design Your Own Custom Apparel in <span className="bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Real-Time 3D</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-reveal text-balance text-sm sm:text-lg text-zinc-400 mt-6 leading-relaxed max-w-2xl mx-auto font-medium">
            Relocate standard e-commerce limits. Experience a premium workspace featuring real-time Three.js model viewport loading, Fabric.js decals, studio lighting presets, and automated vector prepress packages.
          </p>

          {/* CTAs */}
          <div className="hero-reveal flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/studio"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Enter 3D Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Catalog</span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="hero-reveal mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            {[
              { value: designsCount > 0 ? `${designsCount}` : "Loading...", label: "Designs Created" },
              { value: "7-10 Days", label: "Tailoring & Delivery" },
              { value: "100%", label: "Satisfaction" },
              { value: "380 GSM", label: "Fabric Quality" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ====== FEATURED CATALOG PRODUCTS ====== */}
      {(loadingFeatured || featuredProducts.length > 0) && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <div className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">New Arrivals</div>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white">Shop Ready-to-Wear</h2>
              <p className="text-xs text-zinc-400 mt-1.5">Pre-designed by our studio team. Ready for prompt courier delivery.</p>
            </div>
            <Link href="/dashboard" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 group">
              View All
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-zinc-900" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
              {featuredProducts.map((product, index) => (
                <MagneticProductCard key={product.id} product={product} index={index} setBgColor={setOverlayColor} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ====== TRUST BADGES ====== */}
      <section className="trust-section py-16 border-t border-b border-zinc-900/60 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { emoji: "🚀", title: "Free Express Shipping", sub: "On all orders over ₹1,999" },
              { emoji: "🔒", title: "Secure Payments", sub: "UPI, Stripe, Net Banking" },
              { emoji: "🛠️", title: "Custom Tailored", sub: "Crafted to your exact specs" },
              { emoji: "🏆", title: "Premium Quality", sub: "380 GSM certified fabrics" },
            ].map((badge, i) => (
              <div key={i} className="trust-badge flex flex-col items-center gap-2.5 group">
                <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{badge.emoji}</div>
                <h4 className="text-xs font-extrabold text-zinc-200">{badge.title}</h4>
                <p className="text-sm text-zinc-500 font-medium leading-snug">{badge.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="steps-section py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">How Thread3D Works</h2>
            <p className="text-xs text-zinc-400 mt-2">A fully integrated, cloud-powered digital design system.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="step-card bg-zinc-900/20 border border-zinc-900/60 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-800 transition-all">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:border-zinc-700 transition-colors">
                  {step.icon}
                </div>
                <h3 className="text-sm font-extrabold text-white">{step.title}</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-section py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="cta-banner bg-gradient-to-tr from-indigo-950/60 via-purple-950/40 to-zinc-950 border-2 border-indigo-500/10 rounded-3xl p-8 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-2xl mx-auto">
            Ready to Forge Your Signature Custom Blend?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-4 leading-relaxed max-w-lg mx-auto font-medium">
            Jump in and configure decals, modify base-mesh properties, and simulate details under dramatic sunsets. We package your vectors instantly.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/studio"
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Design Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="text-lg font-extrabold text-white mb-2">Thread<span className="text-indigo-400">3D</span></div>
              <p className="text-sm text-zinc-500 leading-relaxed">Luxury custom streetwear, designed in 3D and tailored on-demand. Your custom design, tailored in premium fabric and shipped directly to you.</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Quick Links</h4>
              <div className="space-y-2">
                {[
                  { label: "Shop Catalog", href: "/dashboard" },
                  { label: "3D Design Studio", href: "/studio" },
                  { label: "Track Orders", href: "/dashboard" },
                  { label: "Admin Panel", href: "/admin" },
                ].map(link => (
                  <Link key={link.label} href={link.href} className="block text-xs text-zinc-500 hover:text-indigo-400 font-medium transition-colors">{link.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Support</h4>
              <div className="space-y-2">
                {[
                  "help@thread3d.com",
                  "Shipping Policy",
                  "Privacy Policy"
                ].map((item, i) => (
                  <div key={i} className="text-xs text-zinc-500 font-medium">{item}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-600">
            <p>© 2026 Thread3D Studio LLC. All rights reserved.</p>
            <p>Built with Next.js · Three.js · Fabric.js · Supabase</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
