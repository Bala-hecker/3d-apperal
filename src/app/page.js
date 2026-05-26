"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { 
  Sparkles, 
  Layers, 
  Paintbrush, 
  Sliders, 
  ShieldCheck, 
  ArrowRight, 
  ShoppingBag, 
  Cpu, 
  MousePointerClick,
  CheckCircle
} from "lucide-react";
import * as THREE from "three";

function InteractiveThreeMockup({ selectedFabric }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [preset, setPreset] = useState("sunset"); // sunset, neon, studio
  const [stats, setStats] = useState({ verts: 14192, fps: 60, scale: 1.0 });
  const meshRef = useRef(null);
  const lightsRef = useRef({});

  // Trigger material update when selectedFabric changes
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    
    // Update material based on fabric
    let roughness = 0.85;
    let metalness = 0.1;
    let color = 0x4f46e5; // Indigo
    let clearcoat = 0.0;
    
    if (selectedFabric === "polyester") {
      roughness = 0.25;
      metalness = 0.65;
      color = 0x8b5cf6; // Purple
      clearcoat = 0.5;
    } else if (selectedFabric === "fleece") {
      roughness = 1.0;
      metalness = 0.05;
      color = 0xec4899; // Pink
      clearcoat = 0.0;
    }

    mesh.material.roughness = roughness;
    mesh.material.metalness = metalness;
    mesh.material.color.setHex(color);
    if (mesh.material.clearcoat !== undefined) {
      mesh.material.clearcoat = clearcoat;
    }
    mesh.material.needsUpdate = true;
  }, [selectedFabric]);

  // Trigger lights update when preset changes
  useEffect(() => {
    const lights = lightsRef.current;
    if (!lights.dir1 || !lights.dir2) return;

    if (preset === "sunset") {
      lights.dir1.color.setHex(0xff7a00); // Warm orange
      lights.dir1.intensity = 1.5;
      lights.dir2.color.setHex(0xa5b4fc); // Soft indigo
      lights.dir2.intensity = 0.8;
    } else if (preset === "neon") {
      lights.dir1.color.setHex(0xff007f); // Hot pink
      lights.dir1.intensity = 1.8;
      lights.dir2.color.setHex(0x00f0ff); // Electric cyan
      lights.dir2.intensity = 1.2;
    } else if (preset === "studio") {
      lights.dir1.color.setHex(0xffffff); // Pure white
      lights.dir1.intensity = 1.2;
      lights.dir2.color.setHex(0xcccccc); // Neutral grey
      lights.dir2.intensity = 0.5;
    }
  }, [preset]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 200;

    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dir1 = new THREE.DirectionalLight(0xff7a00, 1.5);
    dir1.position.set(2, 4, 3);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xa5b4fc, 0.8);
    dir2.position.set(-2, -2, -2);
    scene.add(dir2);

    lightsRef.current = { dir1, dir2 };

    // Geometry - complex curved shape showing shadows and details
    const geometry = new THREE.TorusKnotGeometry(0.8, 0.28, 100, 16);
    
    // High premium physical material
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4f46e5,
      roughness: 0.85,
      metalness: 0.1,
      clearcoat: 0.0,
      clearcoatRoughness: 0.1,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Interactive mouse drag rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = () => { isDragging = true; };
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaMove = {
        x: e.offsetX - previousMousePosition.x,
        y: e.offsetY - previousMousePosition.y
      };

      mesh.rotation.y += deltaMove.x * 0.007;
      mesh.rotation.x += deltaMove.y * 0.007;

      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };
    const handleMouseUpOrLeave = () => { isDragging = false; };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener("mousedown", handleMouseDown);
    canvasElement.addEventListener("mousemove", handleMouseMove);
    canvasElement.addEventListener("mouseup", handleMouseUpOrLeave);
    canvasElement.addEventListener("mouseleave", handleMouseUpOrLeave);

    // Support touch
    const handleTouchStart = (e) => {
      isDragging = true;
      const touch = e.touches[0];
      const rect = e.target.getBoundingClientRect();
      previousMousePosition = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    };
    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const rect = e.target.getBoundingClientRect();
      const currentPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      const deltaMove = {
        x: currentPos.x - previousMousePosition.x,
        y: currentPos.y - previousMousePosition.y
      };

      mesh.rotation.y += deltaMove.x * 0.007;
      mesh.rotation.x += deltaMove.y * 0.007;

      previousMousePosition = currentPos;
    };
    canvasElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvasElement.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvasElement.addEventListener("touchend", handleMouseUpOrLeave);

    // Animation Loop
    let animationFrameId;
    let lastTime = performance.now();
    let frameCount = 0;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Auto-rotation when not dragging
      if (!isDragging) {
        mesh.rotation.y += 0.006;
        mesh.rotation.x += 0.003;
      }

      // Floating wave animation
      const elapsed = performance.now() * 0.001;
      mesh.position.y = Math.sin(elapsed * 2) * 0.08;

      renderer.render(scene, camera);

      // FPS tracking
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setStats(prev => ({ ...prev, fps: Math.round((frameCount * 1000) / (now - lastTime)) }));
        frameCount = 0;
        lastTime = now;
      }
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth && newHeight) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvasElement.removeEventListener("mousedown", handleMouseDown);
      canvasElement.removeEventListener("mousemove", handleMouseMove);
      canvasElement.removeEventListener("mouseup", handleMouseUpOrLeave);
      canvasElement.removeEventListener("mouseleave", handleMouseUpOrLeave);
      canvasElement.removeEventListener("touchstart", handleTouchStart);
      canvasElement.removeEventListener("touchmove", handleTouchMove);
      canvasElement.removeEventListener("touchend", handleMouseUpOrLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative border border-zinc-900 bg-zinc-950/80 rounded-2xl overflow-hidden p-6 aspect-video flex flex-col justify-between shadow-2xl transition-all hover:border-zinc-800">
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-600/5 pointer-events-none" />
      
      {/* Fake UI Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] font-mono text-zinc-400 font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          interactive_studio_mockup.glb
        </span>
        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/10">WebGL Live</span>
      </div>

      {/* 3D Canvas Area */}
      <div ref={containerRef} className="flex-1 relative cursor-grab active:cursor-grabbing my-2 flex items-center justify-center min-h-[140px]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        
        {/* Floating Controls Overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 backdrop-blur-md">
          <div className="text-[8px] font-bold text-zinc-500 px-1 uppercase tracking-wider mb-1">Preset Lighting</div>
          {[
            { id: "sunset", label: "Sunset Glow" },
            { id: "neon", label: "Cyber Neon" },
            { id: "studio", label: "Studio White" }
          ].map(p => (
            <button
              key={p.id}
              onClick={(e) => { e.stopPropagation(); setPreset(p.id); }}
              className={`text-[8px] font-extrabold px-2 py-1 rounded text-left transition-colors uppercase tracking-wider ${
                preset === p.id 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dynamic Label based on active fabric */}
        <div className="absolute bottom-2 left-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[9px] px-2.5 py-1 rounded-lg backdrop-blur-md pointer-events-none">
          Active Material: {selectedFabric.toUpperCase()}
        </div>
      </div>

      {/* Fake UI Footer with Real Metrics */}
      <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-zinc-500 text-[9px] font-mono z-10">
        <span>Verts: {stats.verts}</span>
        <span>Drag to rotate</span>
        <span>FPS: {stats.fps}</span>
      </div>
    </div>
  );
}

export default function HomeLandingPage() {
  const [session, setSession] = useState(null);
  const [selectedFabric, setSelectedFabric] = useState("cotton");
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

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

    return () => subscription.unsubscribe();
  }, []);

  const fabrics = {
    cotton: {
      name: "Matte Organic Cotton",
      roughness: "0.85 (High matte)",
      metalness: "0.10 (Non-metallic)",
      upcharge: "₹0 (Included)",
      description: "100% organic cotton weave. Offers a classic matte finish, exceptional comfort, and a relaxed everyday drape. Perfect for high-density graphic print overlays.",
      rating: 95
    },
    polyester: {
      name: "Shiny Athletic Polyester",
      roughness: "0.25 (High gloss)",
      metalness: "0.45 (Semi-metallic)",
      upcharge: "+₹999",
      description: "High-performance synthetic athletic mesh. Features high luster, light reflection, moisture-wicking characteristics, and a sleek modern sheen.",
      rating: 88
    },
    fleece: {
      name: "Heavy Luxury Fleece",
      roughness: "1.00 (Pure matte)",
      metalness: "0.05 (Organic structure)",
      upcharge: "+₹1,299",
      description: "Ultra-heavyweight designer fleece pile. Offers premium insulation, maximum structure retention, and a luxurious brushed pile finish that feels incredibly soft.",
      rating: 99
    }
  };

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
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden">
      
      {/* Background Neon Spotlights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-1/4 w-[700px] h-[700px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Global Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Badge indicator */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-8 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Interactive 3D Apparel Configurator</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-none max-w-4xl mx-auto">
            Design Your Own Custom Apparel in <span className="bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Real-Time 3D</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-zinc-400 mt-6 leading-relaxed max-w-2xl mx-auto font-medium">
            Relocate standard e-commerce limits. Experience a premium workspace featuring real-time Three.js model viewport loading, Fabric.js decals, studio lighting presets, and automated vector prepress packages.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
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
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            {[
              { value: "2,400+", label: "Designs Created" },
              { value: "48h", label: "Avg. Delivery" },
              { value: "100%", label: "Satisfaction" },
              { value: "380 GSM", label: "Fabric Quality" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Feature Showcase Container */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Technological Core</span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Cinematic Lighting and Double-Flipped Projection mapping
              </h2>
              
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Our custom configurator maps your interactive canvas onto a 3D model mesh dynamically. The texture maps are split into double-flipped UV coordinates, ensuring both front and back prints line up with extreme accuracy.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="border border-zinc-900/60 bg-zinc-950/40 p-4 rounded-2xl">
                  <h4 className="text-indigo-400 font-extrabold text-sm">3D Renderer</h4>
                  <p className="text-[11px] text-zinc-500 mt-1 font-medium">Three.js WebGL rendering with custom orbital damping controls.</p>
                </div>
                <div className="border border-zinc-900/60 bg-zinc-950/40 p-4 rounded-2xl">
                  <h4 className="text-purple-400 font-extrabold text-sm">Decal Composer</h4>
                  <p className="text-[11px] text-zinc-500 mt-1 font-medium">Fabric.js drawing context overlay with multi-object scaling safety limits.</p>
                </div>
              </div>
            </div>

            {/* Right Graphic Column: Configurator mockup */}
            <InteractiveThreeMockup selectedFabric={selectedFabric} />

          </div>
        </div>
      </section>

      {/* Interactive Fabric Showcase */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Premium Real-Time Fabric Simulation</h2>
          <p className="text-xs text-zinc-400 mt-2">Relocate fabrics to see how texture roughness and reflection changes standard pricing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(fabrics).map(([key, data]) => {
            const isActive = selectedFabric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedFabric(key)}
                className={`p-6 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isActive 
                    ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5" 
                    : "bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50"
                }`}
              >
                {isActive && (
                  <div className="absolute top-4 right-4 text-indigo-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isActive ? "text-indigo-400" : "text-zinc-500"}`}>
                  Material Option
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{data.name}</h3>
                
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  {data.description}
                </p>

                <div className="mt-6 pt-4 border-t border-zinc-900/60 space-y-1.5 text-[11px] font-mono text-zinc-500">
                  <div className="flex justify-between">
                    <span>Roughness Index:</span>
                    <span className="text-zinc-300 font-semibold">{data.roughness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metalness Index:</span>
                    <span className="text-zinc-300 font-semibold">{data.metalness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Upcharge:</span>
                    <span className="text-indigo-400 font-bold">{data.upcharge}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ====== FEATURED CATALOG PRODUCTS ====== */}
      {(loadingFeatured || featuredProducts.length > 0) && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">New Arrivals</div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">Shop Ready-to-Wear</h2>
              <p className="text-xs text-zinc-400 mt-1.5">Pre-designed by our studio team. Ship in 48h.</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredProducts.map(product => (
                <Link key={product.id} href={`/product/${product.id}`}
                  className="bg-zinc-900/25 border border-zinc-900 hover:border-zinc-700 rounded-2xl overflow-hidden group transition-all hover:shadow-xl hover:shadow-zinc-950/50 cursor-pointer block"
                >
                  <div className="relative bg-zinc-950 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                    <img src={product.texture_url} alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {product.category && (
                      <div className="absolute top-2 left-2 bg-zinc-950/80 border border-zinc-800 text-[9px] text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        {product.category}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs text-zinc-200 group-hover:text-white line-clamp-1 transition-colors">{product.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-black text-indigo-400">₹{(product.price || 3999).toLocaleString('en-IN')}</span>
                      <span className="text-[9px] font-bold text-zinc-500 group-hover:text-indigo-400 transition-colors">View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ====== TRUST BADGES ====== */}
      <section className="py-16 border-t border-b border-zinc-900/60 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { emoji: "🚀", title: "Free Express Shipping", sub: "On all orders over ₹1,999" },
              { emoji: "🔒", title: "Secure Payments", sub: "UPI, Stripe, Net Banking" },
              { emoji: "↩️", title: "Easy 7-Day Returns", sub: "No questions asked" },
              { emoji: "🏆", title: "Premium Quality", sub: "380 GSM certified fabrics" },
            ].map((badge, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5 group">
                <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{badge.emoji}</div>
                <h4 className="text-xs font-extrabold text-zinc-200">{badge.title}</h4>
                <p className="text-[10px] text-zinc-500 font-medium leading-snug">{badge.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">How Thread3D Works</h2>
            <p className="text-xs text-zinc-400 mt-2">A fully integrated, cloud-powered digital design system.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-zinc-900/20 border border-zinc-900/60 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-800 transition-all">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:border-zinc-700 transition-colors">
                  {step.icon}
                </div>
                <h3 className="text-sm font-extrabold text-white">{step.title}</h3>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-tr from-indigo-950/60 via-purple-950/40 to-zinc-950 border-2 border-indigo-500/10 rounded-3xl p-8 sm:p-16 text-center relative overflow-hidden">
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
              <p className="text-[11px] text-zinc-500 leading-relaxed">Luxury custom streetwear, designed in 3D and built by automated fabrication technology. Your design, in fabric, in 48 hours.</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Quick Links</h4>
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
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Support</h4>
              <div className="space-y-2">
                {[
                  "help@thread3d.com",
                  "Shipping Policy",
                  "Returns & Refunds",
                  "Privacy Policy"
                ].map((item, i) => (
                  <div key={i} className="text-xs text-zinc-500 font-medium">{item}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-zinc-600">
            <p>© 2026 Thread3D Studio LLC. All rights reserved.</p>
            <p>Built with Next.js · Three.js · Fabric.js · Supabase</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
