"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  ShoppingBag, 
  LogOut, 
  User, 
  Menu, 
  X, 
  Search,
  ChevronDown,
  ShieldCheck,
  Box,
  Shirt,
  Layers,
  ArrowRight,
  Heart,
  Palette
} from "lucide-react";
import CartDrawer from "./CartDrawer";
import WishlistDrawer from "./WishlistDrawer";

const applyTheme = (themeName) => {
  if (typeof window === "undefined") return;
  
  // Remove existing style block if it exists
  const existingStyle = document.getElementById("theme-overrides-style");
  if (existingStyle) {
    existingStyle.remove();
  }

  if (themeName === "classic") {
    return; // Midnight Classic needs no overrides
  }

  const styles = {
    cyberpunk: `
      :root {
        --color-zinc-950: #040306 !important;
        --color-zinc-900: #0a0914 !important;
        --color-zinc-800: #141228 !important;
        --color-indigo-600: #00f0ff !important; /* Electric Cyan */
        --color-indigo-505: #00e0ef !important;
        --color-indigo-500: #00e0ef !important;
        --color-indigo-400: #33f3ff !important;
        --color-purple-600: #ff007f !important; /* Hot Pink */
        --color-purple-505: #ef0070 !important;
        --color-purple-500: #ef0070 !important;
        --color-purple-400: #ff3399 !important;
      }
    `,
    emerald: `
      :root {
        --color-zinc-955: #040806 !important;
        --color-zinc-950: #040806 !important; /* Rich Spruce */
        --color-zinc-900: #08110c !important;
        --color-zinc-800: #0f1e15 !important;
        --color-indigo-600: #10b981 !important; /* Emerald Mint */
        --color-indigo-505: #059669 !important;
        --color-indigo-500: #059669 !important;
        --color-indigo-400: #34d399 !important;
        --color-purple-600: #fbbf24 !important; /* Warm Amber */
        --color-purple-505: #f59e0b !important;
        --color-purple-500: #f59e0b !important;
        --color-purple-400: #fcd34d !important;
      }
    `,
    sunset: `
      :root {
        --color-zinc-955: #090607 !important;
        --color-zinc-950: #090607 !important; /* Charcoal Crimson */
        --color-zinc-900: #120b0d !important;
        --color-zinc-800: #1e1216 !important;
        --color-indigo-600: #f43f5e !important; /* Rose Coral */
        --color-indigo-505: #e11d48 !important;
        --color-indigo-500: #e11d48 !important;
        --color-indigo-400: #fb7185 !important;
        --color-purple-600: #f97316 !important; /* Amber Sunset */
        --color-purple-505: #ea580c !important;
        --color-purple-500: #ea580c !important;
        --color-purple-400: #fb923c !important;
      }
    `,
    silver: `
      :root {
        --color-zinc-955: #050505 !important;
        --color-zinc-950: #050505 !important;
        --color-zinc-900: #111111 !important;
        --color-zinc-800: #1e1e1e !important;
        --color-indigo-600: #fafafa !important; /* Pure White/Silver */
        --color-indigo-505: #f4f4f5 !important;
        --color-indigo-500: #f4f4f5 !important;
        --color-indigo-400: #ffffff !important;
        --color-purple-600: #8a8a93 !important; /* Steel Silver */
        --color-purple-505: #71717a !important;
        --color-purple-500: #71717a !important;
        --color-purple-400: #a1a1aa !important;
      }
    `
  };

  if (styles[themeName]) {
    const styleEl = document.createElement("style");
    styleEl.id = "theme-overrides-style";
    styleEl.innerHTML = styles[themeName];
    document.head.appendChild(styleEl);
  }
};

export default function Navbar({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const [activeTheme, setActiveTheme] = useState("classic");
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const searchInputRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminEmails = adminEmailSetting
    ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
    : ["admin@example.com", "admin@thread3d.com"];
  const isAdmin = session?.user?.email && adminEmails.includes(session.user.email.toLowerCase());

  // Auth subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cart & wishlist badge sync
  const updateBadges = useCallback(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("apparel_cart") || "[]");
      setCartCount(cart.reduce((a, c) => a + c.quantity, 0));
      const wl = JSON.parse(localStorage.getItem("apparel_wishlist") || "[]");
      setWishlistCount(wl.length);
    } catch {}
  }, []);

  useEffect(() => {
    updateBadges();
    
    const handleOpenCart = () => setIsCartOpen(true);
    const handleOpenWishlist = () => setIsWishlistOpen(true);
    
    window.addEventListener("storage", updateBadges);
    window.addEventListener("cart-updated", updateBadges);
    window.addEventListener("wishlist-updated", updateBadges);
    window.addEventListener("open-cart", handleOpenCart);
    window.addEventListener("open-wishlist", handleOpenWishlist);
    return () => {
      window.removeEventListener("storage", updateBadges);
      window.removeEventListener("cart-updated", updateBadges);
      window.removeEventListener("wishlist-updated", updateBadges);
      window.removeEventListener("open-cart", handleOpenCart);
      window.removeEventListener("open-wishlist", handleOpenWishlist);
    };
  }, [updateBadges]);

  // Scroll detection for shadow/border
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + K → open search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") {
        closeSearch();
        setIsProfileDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync and persist active custom theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("apparel_theme") || "classic";
    setActiveTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeName) => {
    setActiveTheme(themeName);
    localStorage.setItem("apparel_theme", themeName);
    applyTheme(themeName);
    setIsThemeDropdownOpen(false);
  };

  const openSearch = () => {
    setIsSearchOverlayOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  const closeSearch = () => {
    setIsSearchOverlayOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Debounced live product search
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, price, texture_url, category, glb_file_url")
          .ilike("name", `%${val}%`)
          .limit(6);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    closeSearch();
    router.push(`/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Shop", href: "/dashboard" },
    { name: "3D Studio", href: "/studio" },
  ];

  const isActive = (href) => pathname === href;

  return (
    <>
      {/* ============================================================
          MAIN NAVBAR
      ============================================================ */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 select-none ${
          isScrolled
            ? "bg-zinc-950/95 border-b border-zinc-800/60 shadow-xl shadow-zinc-950/40 backdrop-blur-xl"
            : "bg-zinc-950/80 border-b border-zinc-900/50 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <div className="flex h-16 items-center gap-3 lg:gap-5">

            {/* ── 1. LOGO ── */}
            <Link
              href="/"
              className="flex items-center gap-2.5 shrink-0 group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold tracking-tight text-sm text-white hidden sm:block">
                THREAD<span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">3D</span>
              </span>
            </Link>

            {/* ── 2. DESKTOP NAV LINKS ── */}
            <nav className="hidden md:flex items-center gap-1 ml-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive(link.href)
                      ? "text-white bg-zinc-800/60"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  }`}
                >
                  {link.name}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </Link>
              ))}
            </nav>

            {/* ── 3. CENTER SEARCH BAR (desktop) ── */}
            <div className="hidden md:flex flex-1 max-w-md mx-auto lg:max-w-lg">
              <button
                onClick={openSearch}
                className="w-full flex items-center gap-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-500 hover:text-zinc-400 transition-all group cursor-text"
              >
                <Search className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-500 shrink-0" />
                <span className="flex-1 text-left">Search apparel, styles...</span>
                <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-500 font-mono shrink-0">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* ── 4. RIGHT ACTIONS ── */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-0 shrink-0">

              {/* Mobile search icon */}
              <button
                onClick={openSearch}
                className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Page-specific children (e.g. "Publish to Catalog" in Studio) */}
              {children && (
                <div className="hidden sm:flex items-center gap-2">{children}</div>
              )}

              {/* Wishlist icon */}
              {session && (
                <button
                  onClick={() => setIsWishlistOpen(true)}
                  className="relative p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                  title="Wishlist"
                >
                  <Heart className="w-4 h-4" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-sm font-extrabold flex items-center justify-center shadow-md">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                </button>
              )}

              {/* Cart */}
              {session && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                  title="Shopping Cart"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full text-sm font-extrabold flex items-center justify-center shadow-md animate-bounce">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Theme Selector Palette */}
              <div className="relative">
                <button
                  onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer flex items-center justify-center"
                  title="Customize Theme"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {isThemeDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-44 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1">
                    <div className="text-sm font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider select-none border-b border-zinc-900 mb-1">
                      Select Accent Theme
                    </div>
                    {[
                      { id: "classic", label: "Midnight Glow", color: "bg-indigo-500" },
                      { id: "cyberpunk", label: "Cyber Neon", color: "bg-cyan-400" },
                      { id: "emerald", label: "Emerald Mint", color: "bg-emerald-400" },
                      { id: "sunset", label: "Sunset Coral", color: "bg-rose-455" },
                      { id: "silver", label: "Monochrome Silver", color: "bg-zinc-300" }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-sm font-bold transition-all uppercase tracking-wider cursor-pointer ${
                          activeTheme === t.id 
                            ? "bg-zinc-900 text-white" 
                            : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${t.color === "bg-rose-455" ? "bg-rose-400" : t.color} shrink-0`} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Profile / Sign In */}
              {loading ? (
                <div className="w-8 h-8 rounded-xl border border-zinc-800 bg-zinc-900/50 animate-pulse" />
              ) : session ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    onBlur={() => setTimeout(() => setIsProfileDropdownOpen(false), 180)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isProfileDropdownOpen
                        ? "bg-zinc-800 border-zinc-700 text-white"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {/* Avatar circle */}
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                      {session.user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block max-w-[90px] truncate">
                      {session.user.email.split("@")[0]}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-zinc-950/60 overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                            {session.user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{session.user.email.split("@")[0]}</p>
                            <p className="text-sm text-zinc-500 truncate">{session.user.email}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="mt-2 inline-flex items-center gap-1 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Admin
                          </div>
                        )}
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        <a href="/dashboard?tab=shop" onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors">
                          <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                          Shop Catalog
                        </a>
                        <a href="/studio" onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors">
                          <Shirt className="w-3.5 h-3.5 text-zinc-500" />
                          3D Studio
                        </a>
                        <button 
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setIsWishlistOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors text-left cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 text-zinc-500" />
                          Saved Wishlist
                        </button>
                        <a href="/dashboard?tab=tracking" onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors">
                          <Box className="w-3.5 h-3.5 text-zinc-500" />
                          Track Orders
                        </a>
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 transition-colors">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                            Admin Panel
                          </Link>
                        )}
                      </div>

                      {/* Sign out */}
                      <div className="border-t border-zinc-800/60 py-1">
                        <button onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-colors cursor-pointer">
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="text-xs font-bold px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 md:hidden cursor-pointer transition-all"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── MOBILE DRAWER ── */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800/60 bg-zinc-950 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile nav links */}
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive(link.href)
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    {link.name === "Home" && <Sparkles className="w-4 h-4" />}
                    {link.name === "Shop" && <ShoppingBag className="w-4 h-4" />}
                    {link.name === "3D Studio" && <Layers className="w-4 h-4" />}
                    {link.name}
                    {isActive(link.href) && <ArrowRight className="w-3.5 h-3.5 ml-auto" />}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-indigo-400 hover:bg-indigo-500/5 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
              </nav>

              {/* Mobile children (page-specific buttons) */}
              {children && (
                <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-2">{children}</div>
              )}

              {/* Mobile Sign out / Sign in */}
              {session ? (
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black text-white">
                      {session.user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-400 font-medium truncate max-w-[160px]">{session.user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer px-2 py-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full block text-center py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-bold">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ============================================================
          GLOBAL SEARCH OVERLAY
      ============================================================ */}
      {isSearchOverlayOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center pt-[10vh] px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md" onClick={closeSearch} />

          {/* Search modal */}
          <div className="relative w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-zinc-950/70 overflow-hidden">

              {/* Input row */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
                <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search apparel, t-shirts, hoodies, jackets..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none font-medium"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); searchInputRef.current?.focus(); }}
                    className="text-zinc-600 hover:text-zinc-400 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:flex items-center text-xs font-mono text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded cursor-pointer"
                  onClick={closeSearch}>
                  ESC
                </kbd>
              </form>

              {/* Results body */}
              <div className="max-h-[50vh] overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center gap-3 px-4 py-5 text-zinc-500">
                    <div className="w-4 h-4 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs font-medium">Searching catalog...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-1">
                    <p className="px-4 pt-2 pb-1 text-xs text-zinc-600 font-bold uppercase tracking-widest">Products</p>
                    {searchResults.map(product => (
                      <button
                        key={product.id}
                        onClick={() => { closeSearch(); router.push(`/product/${product.id}`); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors text-left group cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
                          {product.texture_url && (
                            <img src={product.texture_url} alt={product.name}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              onError={(e) => { e.target.style.display = "none"; }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate transition-colors">{product.name}</p>
                          <p className="text-sm text-zinc-500 mt-0.5">
                            {product.category && <span className="mr-2 uppercase font-semibold">{product.category}</span>}
                            <span className="text-indigo-400 font-bold">₹{(product.price || 3999).toLocaleString('en-IN')}</span>
                            {product.glb_file_url && <span className="ml-2 text-purple-400">3D</span>}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </button>
                    ))}
                    {/* See all results */}
                    <div className="border-t border-zinc-800/60 p-2 mt-1">
                      <button
                        onClick={handleSearchSubmit}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        See all results for "{searchQuery}"
                      </button>
                    </div>
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-zinc-500 text-sm font-medium">No products found for "<span className="text-zinc-300">{searchQuery}</span>"</p>
                    <p className="text-zinc-700 text-xs mt-1">Try a different keyword or browse all categories.</p>
                    <Link href="/dashboard" onClick={closeSearch}
                      className="inline-flex items-center gap-1.5 mt-4 text-xs text-indigo-400 hover:text-indigo-300 font-bold">
                      Browse Catalog <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  /* Default empty state: quick links */
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mb-2">Quick Links</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Shop All", href: "/dashboard", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                          { label: "3D Studio", href: "/studio", icon: <Sparkles className="w-3.5 h-3.5" /> },
                          { label: "Track Orders", href: "/dashboard?tab=tracking", icon: <Box className="w-3.5 h-3.5" /> },
                          { label: "T-Shirts", href: "/dashboard?cat=t-shirt", icon: <Shirt className="w-3.5 h-3.5" /> },
                        ].map(item => (
                          <Link key={item.href} href={item.href} onClick={closeSearch}
                            className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 rounded-xl text-xs text-zinc-300 hover:text-white font-medium transition-all cursor-pointer">
                            <span className="text-zinc-500">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-700 text-center font-mono">
                      Type to search · ESC to close · ⌘K to open anywhere
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Global Wishlist Drawer */}
      <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
    </>
  );
}
