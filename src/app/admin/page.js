"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Upload, 
  Layers, 
  Package, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  DollarSign,
  MapPin,
  Phone,
  Clock,
  Download,
  Box,
  Eye,
  X,
  Edit,
  ShieldAlert,
  Plus,
  Key,
  Lock,
  Copy,
  Check,
  Settings,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Calendar,
  Percent,
  Coins,
  Search,
  Sliders,
  Shield,
  AlertTriangle,
  CreditCard,
  Zap
} from "lucide-react";
import Link from "next/link";
import { FileText, Printer } from "lucide-react";
import Navbar from "@/components/Navbar";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import JSZip from "jszip";
import { getDesignData } from "@/lib/indexedDb";

const getSlug = (name) => {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

// Default built-in categories — always present as baseline
const DEFAULT_CATEGORIES = [
  { id: "t-shirt",    label: "T-Shirts" },
  { id: "hoodie",     label: "Hoodies" },
  { id: "jacket",     label: "Jackets" },
  { id: "activewear", label: "Activewears" },
];

const CATEGORIES_STORAGE_KEY = "apparel_categories";

const loadStoredCategories = () => {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_CATEGORIES;
};

const saveStoredCategories = (cats) => {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
  } catch (e) { /* ignore */ }
};

const isTemplateProduct = (p) => {
  if (!p) return false;
  if (p.glb_file_url) return true; // Any product with a GLB file is a 3D model template/blank for the studio!
  if (p.is_template === true) return true;
  const cat = (p.category || "").toLowerCase().trim();
  if (cat === "custom-template" || cat === "template" || cat.startsWith("custom-")) return true;
  const name = (p.name || "").toLowerCase();
  if (name.includes("template") || name.includes("blank")) return true;
  return false;
};

const getDisplayImage = (p) => {
  if (!p) return "";
  if (isTemplateProduct(p) && p.gallery_urls) {
    const urls = p.gallery_urls.includes(",") 
      ? p.gallery_urls.split(",").map(u => u.trim()).filter(Boolean)
      : [p.gallery_urls.trim()];
    if (urls.length > 0) return urls[0];
  }
  return p.texture_url || "";
};

// -------------------------------------------------------------
// SALES ANALYTICS & STATS DASHBOARD COMPONENT
// -------------------------------------------------------------
function SalesStatsView({ orders }) {
  const [timeframe, setTimeframe] = useState("weekly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useDemoData, setUseDemoData] = useState(false);
  const [demoOrders, setDemoOrders] = useState([]);

  // Generate realistic demo orders once when requested
  useEffect(() => {
    if (useDemoData && demoOrders.length === 0) {
      const generated = [];
      const now = new Date();
      const productTemplates = [
        { name: "Thread 3D Classic Tee", price: 3999, category: "t-shirt" },
        { name: "Neon Aero Jersey", price: 4499, category: "jersey" },
        { name: "Retro Classic Jersey", price: 4299, category: "jersey" },
        { name: "Prismatic Hoodie", price: 5999, category: "hoodie" }
      ];
      
      const customNames = ["AVIS", "BALA", "JORDAN", "MESSI", "CR7", "PABLO", "VIRAT", "DHONI"];
      
      // Generate 80 orders spread over last 365 days
      for (let i = 0; i < 80; i++) {
        // Random date between now and 365 days ago
        const dateOffset = Math.random() * 365 * 24 * 60 * 60 * 1000;
        const createdDate = new Date(now.getTime() - dateOffset);
        
        // Random items (1 to 3 items)
        const itemCount = Math.floor(Math.random() * 2) + 1;
        const items = [];
        let orderSubtotal = 0;
        
        for (let j = 0; j < itemCount; j++) {
          const prod = productTemplates[Math.floor(Math.random() * productTemplates.length)];
          const qty = Math.floor(Math.random() * 2) + 1;
          const isCustom = Math.random() > 0.5;
          
          items.push({
            id: `prod_${j}_${i}`,
            name: prod.name,
            price: prod.price,
            quantity: qty,
            size: ["S", "M", "L", "XL"][Math.floor(Math.random() * 4)],
            customName: isCustom ? customNames[Math.floor(Math.random() * customNames.length)] : null,
            customNumber: isCustom ? String(Math.floor(Math.random() * 99) + 1) : null
          });
          orderSubtotal += prod.price * qty;
        }

        const deliveryFee = orderSubtotal > 5000 ? 0 : 199;
        const discountAmount = Math.random() > 0.7 ? Math.round(orderSubtotal * 0.1) : 0;
        const totalAmount = orderSubtotal - discountAmount + deliveryFee;

        generated.push({
          id: `demo_ord_${i}_${createdDate.getTime()}`,
          created_at: createdDate.toISOString(),
          total_amount: totalAmount,
          status: Math.random() > 0.15 ? "delivered" : "processing",
          items,
          shipping_details: {
            name: `Customer ${i + 1}`,
            phone: `987654${String(i).padStart(4, "0")}`,
            address: `${Math.floor(Math.random() * 500) + 1} Park Street`,
            city: ["Chennai", "Coimbatore", "Bangalore", "Mumbai"][Math.floor(Math.random() * 4)],
            zip: "600001"
          }
        });
      }
      setDemoOrders(generated);
    }
  }, [useDemoData, demoOrders.length]);

  const activeOrders = useDemoData ? demoOrders : orders;

  // Calculate Date boundaries
  const now = new Date();
  let currentStart, currentEnd, prevStart, prevEnd;

  if (timeframe === "daily") {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    prevStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    prevEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
  } else if (timeframe === "weekly") {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    currentStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    currentEnd = now;
    prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else if (timeframe === "monthly") {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    currentStart = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    currentEnd = now;
    prevStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else if (timeframe === "yearly") {
    currentStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    currentEnd = now;
    prevStart = new Date(currentStart.getTime() - 365 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else {
    // Custom
    currentStart = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    currentEnd = customEnd ? new Date(customEnd + "T23:59:59") : now;
    const diff = currentEnd.getTime() - currentStart.getTime();
    prevStart = new Date(currentStart.getTime() - diff);
    prevEnd = currentStart;
  }

  // Calculate Metrics helper
  const getPeriodStats = (ordersList, start, end) => {
    const filtered = ordersList.filter(o => {
      if (o.status === "cancelled") return false;
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });

    const revenue = filtered.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const count = filtered.length;
    const aov = count > 0 ? revenue / count : 0;
    
    let units = 0;
    filtered.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          units += (Number(item.quantity) || 1);
        });
      }
    });

    return { revenue, count, aov, units, orders: filtered };
  };

  const currentStats = getPeriodStats(activeOrders, currentStart, currentEnd);
  const prevStats = getPeriodStats(activeOrders, prevStart, prevEnd);

  const getGrowth = (current, prev) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  // Generate SVG Points
  let points = [];
  if (timeframe === "daily") {
    points = Array.from({ length: 24 }, (_, i) => {
      const hourStart = new Date(currentStart.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 59 * 60 * 1000 + 59000);
      const stats = getPeriodStats(activeOrders, hourStart, hourEnd);
      return {
        label: `${i}:00`,
        value: stats.revenue,
        count: stats.count
      };
    });
  } else if (timeframe === "weekly") {
    points = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(currentStart.getTime() + i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59000);
      const stats = getPeriodStats(activeOrders, dayStart, dayEnd);
      return {
        label: dayStart.toLocaleDateString("en-IN", { weekday: "short" }),
        value: stats.revenue,
        count: stats.count
      };
    });
  } else if (timeframe === "monthly") {
    points = Array.from({ length: 30 }, (_, i) => {
      const dayStart = new Date(currentStart.getTime() + i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59000);
      const stats = getPeriodStats(activeOrders, dayStart, dayEnd);
      return {
        label: dayStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        value: stats.revenue,
        count: stats.count
      };
    });
  } else if (timeframe === "yearly") {
    points = Array.from({ length: 12 }, (_, i) => {
      const blockStart = new Date(currentStart.getTime() + i * (365 / 12) * 24 * 60 * 60 * 1000);
      const blockEnd = new Date(blockStart.getTime() + (365 / 12) * 24 * 60 * 60 * 1000);
      const stats = getPeriodStats(activeOrders, blockStart, blockEnd);
      return {
        label: blockStart.toLocaleDateString("en-IN", { month: "short" }),
        value: stats.revenue,
        count: stats.count
      };
    });
  } else {
    // Custom
    const intervalsCount = 10;
    const duration = currentEnd.getTime() - currentStart.getTime();
    const intervalLength = duration / intervalsCount;
    points = Array.from({ length: intervalsCount }, (_, i) => {
      const blockStart = new Date(currentStart.getTime() + i * intervalLength);
      const blockEnd = new Date(blockStart.getTime() + intervalLength);
      const stats = getPeriodStats(activeOrders, blockStart, blockEnd);
      return {
        label: blockStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        value: stats.revenue,
        count: stats.count
      };
    });
  }

  // Draw SVG
  const width = 600;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const maxValue = Math.max(...points.map(p => p.value), 1000);
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = (maxValue / 4) * i;
    const y = height - paddingBottom - (val / maxValue) * (height - paddingTop - paddingBottom);
    return { y, value: val };
  });

  const getCoordinates = () => {
    return points.map((p, index) => {
      const x = paddingLeft + (index / (points.length - 1)) * (width - paddingLeft - paddingRight);
      const y = height - paddingBottom - (p.value / maxValue) * (height - paddingTop - paddingBottom);
      return { x, y, ...p };
    });
  };

  const coords = getCoordinates();
  let linePath = "";
  let areaPath = "";

  if (coords.length > 0) {
    linePath = `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map(c => `L ${c.x} ${c.y}`).join(" ");
    areaPath = linePath + ` L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;
  }

  const labelStep = points.length > 15 ? 5 : points.length > 7 ? 2 : 1;

  // Calculate Product Leaderboard
  const productLeaderboard = {};
  let totalPersonalized = 0;
  let totalStandard = 0;

  currentStats.orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        const revenue = (Number(item.price) || 3999) * qty;
        
        if (item.customName || item.customNumber) {
          totalPersonalized += qty;
        } else {
          totalStandard += qty;
        }

        if (!productLeaderboard[item.name]) {
          productLeaderboard[item.name] = {
            name: item.name,
            qty: 0,
            revenue: 0,
            sizes: {}
          };
        }
        productLeaderboard[item.name].qty += qty;
        productLeaderboard[item.name].revenue += revenue;
        
        const sz = item.size || "M";
        productLeaderboard[item.name].sizes[sz] = (productLeaderboard[item.name].sizes[sz] || 0) + qty;
      });
    }
  });

  const sortedLeaderboard = Object.values(productLeaderboard).sort((a, b) => b.qty - a.qty);
  const totalGarments = totalPersonalized + totalStandard;
  const personalizedPercent = totalGarments > 0 ? Math.round((totalPersonalized / totalGarments) * 100) : 0;

  // Calculate Category Sales Distribution
  const categorySales = {};
  currentStats.orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        const cat = item.category || "t-shirt";
        categorySales[cat] = (categorySales[cat] || 0) + qty;
      });
    }
  });

  const totalSalesQty = Object.values(categorySales).reduce((sum, q) => sum + q, 0);

  const categoryColors = {
    "t-shirt": "#6366f1",
    "jersey": "#ec4899",
    "hoodie": "#f59e0b",
    "jacket": "#10b981",
    "activewear": "#a855f7"
  };

  return (
    <div className="space-y-6">
      {/* Timeframe & Demo Data Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-900 rounded-xl p-5">
        <div className="flex flex-wrap gap-2">
          {["daily", "weekly", "monthly", "yearly", "custom"].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                timeframe === t
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Demo Data Toggle */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg select-none">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Demo Data Mode</span>
            <button
              onClick={() => setUseDemoData(!useDemoData)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                useDemoData ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
              }`}
            >
              <span className="w-3.5 h-3.5 bg-white rounded-full shadow" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {timeframe === "custom" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Start Date</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">End Date</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Sales */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full filter blur-xl" />
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Gross Sales</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            ₹{currentStats.revenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {getGrowth(currentStats.revenue, prevStats.revenue) >= 0 ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{getGrowth(currentStats.revenue, prevStats.revenue).toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-extrabold flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {getGrowth(currentStats.revenue, prevStats.revenue).toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500 font-semibold select-none">vs prev period</span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full filter blur-xl" />
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Orders Count</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {currentStats.count}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {getGrowth(currentStats.count, prevStats.count) >= 0 ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{getGrowth(currentStats.count, prevStats.count).toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-extrabold flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {getGrowth(currentStats.count, prevStats.count).toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500 font-semibold select-none">vs prev period</span>
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full filter blur-xl" />
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Average Value (AOV)</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            ₹{Math.round(currentStats.aov).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {getGrowth(currentStats.aov, prevStats.aov) >= 0 ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                +{getGrowth(currentStats.aov, prevStats.aov).toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-extrabold flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {getGrowth(currentStats.aov, prevStats.aov).toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500 font-semibold select-none">vs prev period</span>
          </div>
        </div>

        {/* KPI 4: Items Sold */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full filter blur-xl" />
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Garments Dispatched</span>
            <Box className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {currentStats.units}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {getGrowth(currentStats.units, prevStats.units) >= 0 ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{getGrowth(currentStats.units, prevStats.units).toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-extrabold flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {getGrowth(currentStats.units, prevStats.units).toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500 font-semibold select-none">vs prev period</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest select-none">Revenue Stream Chart</span>
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
            Linear Projection Mode
          </span>
        </div>

        {points.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-xs text-zinc-500">
            No transaction records found for this period.
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {gridLines.map((gl, idx) => (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={gl.y}
                    x2={width - paddingRight}
                    y2={gl.y}
                    stroke="#1e1e2f"
                    strokeDasharray="4,4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={gl.y + 4}
                    fill="#52525b"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="end"
                    className="font-mono"
                  >
                    ₹{Math.round(gl.value).toLocaleString('en-IN')}
                  </text>
                </g>
              ))}

              {/* Area Path */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#chart-gradient)"
                  className="transition-all duration-500 ease-in-out"
                />
              )}

              {/* Line Path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-in-out"
                />
              )}

              {/* X Axis Labels */}
              {coords.map((c, idx) => {
                if (idx % labelStep !== 0) return null;
                return (
                  <text
                    key={idx}
                    x={c.x}
                    y={height - 15}
                    fill="#52525b"
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono select-none"
                  >
                    {c.label}
                  </text>
                );
              })}

              {/* Interactive nodes */}
              {coords.map((c, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="4"
                    fill="#818cf8"
                    stroke="#09090b"
                    strokeWidth="1.5"
                    className="transition-all duration-200 group-hover:r-5 group-hover:fill-white"
                  />
                  <title>
                    {c.label}: ₹{Math.round(c.value).toLocaleString('en-IN')} ({c.count} orders)
                  </title>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Sales table (Left/Middle) */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-850 rounded-2xl p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">Garment Leaderboard</span>
          
          {sortedLeaderboard.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">
              No garments sold in this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-zinc-500 font-bold border-b border-zinc-850 uppercase tracking-wider">
                    <th className="py-2.5">Product Name</th>
                    <th className="py-2.5 text-center">Qty Sold</th>
                    <th className="py-2.5 text-right">Revenue</th>
                    <th className="py-2.5 text-center">Size Metrics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {sortedLeaderboard.map((item, idx) => (
                    <tr key={idx} className="text-zinc-200 font-medium">
                      <td className="py-3 font-semibold">{item.name}</td>
                      <td className="py-3 text-center font-bold font-mono">{item.qty}</td>
                      <td className="py-3 text-right font-bold font-mono text-indigo-400">
                        ₹{item.revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex justify-center gap-1.5 text-[9px] font-bold">
                          {Object.entries(item.sizes).map(([sz, count]) => (
                            <span key={sz} className="bg-zinc-950 border border-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                              {sz}:{count}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customization Distribution (Right) */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">Design Preference</span>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Customized Jerseys
                </span>
                <span className="font-bold font-mono text-white">{totalPersonalized} units</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  Standard Blanks
                </span>
                <span className="font-bold font-mono text-white">{totalStandard} units</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Visual Bar Indicator */}
            <div className="w-full h-3 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${personalizedPercent}%` }}
                className="bg-indigo-500 h-full rounded-l transition-all duration-500"
              />
              <div
                style={{ width: `${100 - personalizedPercent}%` }}
                className="bg-zinc-850 h-full transition-all duration-500"
              />
            </div>
            
            <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
              <span className="text-indigo-400 font-extrabold">{personalizedPercent}%</span> of ordered designs contain customized player names or squad numbers.
            </div>
          </div>

          {/* Category Breakdown Donut Chart */}
          <div className="border-t border-zinc-850 pt-5 space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">Category Distribution</span>
            {totalSalesQty === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs">No category sales in this period.</div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                {/* SVG Donut Circle */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#18181b" strokeWidth="3.2" />
                    {(() => {
                      let accumulatedPercent = 0;
                      return Object.entries(categorySales).map(([cat, qty]) => {
                        const percent = (qty / totalSalesQty) * 100;
                        const strokeDashArray = `${percent} ${100 - percent}`;
                        const strokeDashOffset = 100 - accumulatedPercent;
                        accumulatedPercent += percent;
                        const color = categoryColors[cat.toLowerCase()] || "#71717a";
                        return (
                          <circle
                            key={cat}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke={color}
                            strokeWidth="3.2"
                            strokeDasharray={strokeDashArray}
                            strokeDashoffset={strokeDashOffset}
                            className="transition-all duration-500"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                    <span className="text-xs font-black text-white leading-none">{totalSalesQty}</span>
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Units</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-1.5 text-[10px]">
                  {Object.entries(categorySales).map(([cat, qty]) => {
                    const pct = Math.round((qty / totalSalesQty) * 100);
                    const color = categoryColors[cat.toLowerCase()] || "#71717a";
                    return (
                      <div key={cat} className="flex justify-between items-center text-zinc-400">
                        <span className="flex items-center gap-1.5 capitalize font-semibold">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {cat}
                        </span>
                        <span className="font-mono font-bold text-zinc-300">{qty} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN ADMIN PAGE EXPORT
// -------------------------------------------------------------
export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [glbFile, setGlbFile] = useState(null);
  const [textureFile, setTextureFile] = useState(null);
  const [displayPhotoFile, setDisplayPhotoFile] = useState(null);

  // Upload/Status State
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  
  // Products State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State additions
  const [price, setPrice] = useState("3999");
  const [category, setCategory] = useState("t-shirt");
  const [description, setDescription] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [allowPersonalization, setAllowPersonalization] = useState(false);
  const [allowNamePersonalization, setAllowNamePersonalization] = useState(false);
  const [allowNumberPersonalization, setAllowNumberPersonalization] = useState(false);
  const [stockStatus, setStockStatus] = useState("in_stock");
  const [gender, setGender] = useState("unisex");
  const [selectedBaseTemplateId, setSelectedBaseTemplateId] = useState("");
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  // Edit Product Extensions
  const [editDescription, setEditDescription] = useState("");
  const [editGalleryUrls, setEditGalleryUrls] = useState("");
  const [editIsTemplate, setEditIsTemplate] = useState(false);
  const [editGalleryFiles, setEditGalleryFiles] = useState([]);
  const [editTextureFile, setEditTextureFile] = useState(null);
  const [editGlbFile, setEditGlbFile] = useState(null);
  const [editDisplayPhotoFile, setEditDisplayPhotoFile] = useState(null);

  const handleRemoveExistingGalleryImage = (urlToRemove) => {
    const current = (editGalleryUrls || "").split(",").map(u => u.trim()).filter(Boolean);
    const updated = current.filter(u => u !== urlToRemove);
    setEditGalleryUrls(updated.join(","));
  };

  // Sub tab selection
  const [adminInventorySubTab, setAdminInventorySubTab] = useState("standard");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [catalogSubView, setCatalogSubView] = useState("inventory");
  const [customProductId, setCustomProductId] = useState("");

  // Dynamic Category Management
  const [catalogCategories, setCatalogCategories] = useState(DEFAULT_CATEGORIES);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryImageFile, setCategoryImageFile] = useState(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("t-shirt");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editAllowPersonalization, setEditAllowPersonalization] = useState(false);
  const [editAllowNamePersonalization, setEditAllowNamePersonalization] = useState(false);
  const [editAllowNumberPersonalization, setEditAllowNumberPersonalization] = useState(false);
  const [editStockStatus, setEditStockStatus] = useState("in_stock");
  const [editGender, setEditGender] = useState("unisex");

  // Technical Specifications per product
  const DEFAULT_PRODUCT_SPECS = [
    { key: "Fit Profile",         val: "Relaxed Modern Boxy Fit" },
    { key: "Material",            val: "100% Organic Ring-Spun Cotton" },
    { key: "Fabric Weight",       val: "380 GSM Heavyweight" },
    { key: "Country of Assembly", val: "India" },
  ];
  const [editSpecs, setEditSpecs] = useState(DEFAULT_PRODUCT_SPECS);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecVal, setNewSpecVal] = useState("");

  // Simulated Email State
  const [simulatedEmail, setSimulatedEmail] = useState(null);

  // Order Tracking Form states per order
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("FedEx");
  const [statusInput, setStatusInput] = useState("processing");

  // Customer Q&A and FAQ States
  const [globalFaqs, setGlobalFaqs] = useState([]);
  const [answeringFaqId, setAnsweringFaqId] = useState(null);
  const [faqAnswerInput, setFaqAnswerInput] = useState("");
  const [newFaqProductId, setNewFaqProductId] = useState("");
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");

  // Orders State
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog", "orders", or "logs"
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [dbMismatches, setDbMismatches] = useState([]);

  // Orders & Analytics sub-tab
  const [ordersSubTab, setOrdersSubTab] = useState("orders"); // "orders" | "analytics"

  // Search and Filter States for Orders and Logs
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logOperatorFilter, setLogOperatorFilter] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("all");
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");

  // 3D Product Preview Modal State
  const adminCatalogPreviewRef = useRef(null);
  const [previewProduct3D, setPreviewProduct3D] = useState(null);
  const [loading3DPreview, setLoading3DPreview] = useState(false);

  // Invoice view state
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState(null);

  // Razorpay Gateway Settings State
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState("");
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [keySecretConfigured, setKeySecretConfigured] = useState(false);
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [testingPaymentCredentials, setTestingPaymentCredentials] = useState(false);
  const [mockModeEnabled, setMockModeEnabled] = useState(false);
  const [togglingMockMode, setTogglingMockMode] = useState(false);

  // Coupons state variables
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponsFallbackMode, setCouponsFallbackMode] = useState(false);
  const [couponsFallbackMessage, setCouponsFallbackMessage] = useState("");
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [newCouponLimit, setNewCouponLimit] = useState("");
  const [newCouponFirstTime, setNewCouponFirstTime] = useState(false);
  const [newCouponActive, setNewCouponActive] = useState(true);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponFormError, setCouponFormError] = useState("");

  // Custom 3D Studio Pricing Settings
  const [studioCottonUpcharge, setStudioCottonUpcharge] = useState("0");
  const [studioPolyesterUpcharge, setStudioPolyesterUpcharge] = useState("999");
  const [studioFleeceUpcharge, setStudioFleeceUpcharge] = useState("1299");
  const [studioCustomizationBaseFee, setStudioCustomizationBaseFee] = useState("0");
  const [loadingStudioPricing, setLoadingStudioPricing] = useState(false);
  const [savingStudioPricing, setSavingStudioPricing] = useState(false);

  // Custom 3D Studio Fabric Material Properties (roughness, metalness, bump scale)
  const [studioCottonRoughness, setStudioCottonRoughness] = useState("0.85");
  const [studioCottonMetalness, setStudioCottonMetalness] = useState("0.1");
  const [studioCottonBumpScale, setStudioCottonBumpScale] = useState("0.04");

  const [studioPolyesterRoughness, setStudioPolyesterRoughness] = useState("0.25");
  const [studioPolyesterMetalness, setStudioPolyesterMetalness] = useState("0.45");
  const [studioPolyesterBumpScale, setStudioPolyesterBumpScale] = useState("0.02");

  const [studioFleeceRoughness, setStudioFleeceRoughness] = useState("1.0");
  const [studioFleeceMetalness, setStudioFleeceMetalness] = useState("0.05");
  const [studioFleeceBumpScale, setStudioFleeceBumpScale] = useState("0.06");

  // Custom 3D Studio Fabric Material Custom labels & descriptions
  const [studioCottonLabel, setStudioCottonLabel] = useState("Matte Organic Cotton");
  const [studioCottonDesc, setStudioCottonDesc] = useState("Flat, organic 100% cotton threads");

  const [studioPolyesterLabel, setStudioPolyesterLabel] = useState("Shiny Athletic Polyester");
  const [studioPolyesterDesc, setStudioPolyesterDesc] = useState("Reflective, sleek high-performance finish");

  const [studioFleeceLabel, setStudioFleeceLabel] = useState("Heavy Luxury Fleece");
  const [studioFleeceDesc, setStudioFleeceDesc] = useState("Extra thick, warm luxury heavy fleece feel");

  // Homepage Carousel Banners State
  const [bannersList, setBannersList] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);

  // Announcement Ticker State
  const [announcementText, setAnnouncementText] = useState("");
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Homepage Promo Cards State
  const [promoCardsList, setPromoCardsList] = useState([]);
  const [loadingPromoCards, setLoadingPromoCards] = useState(false);
  const [editingPromoCard, setEditingPromoCard] = useState(null);
  const [savingPromoCard, setSavingPromoCard] = useState(false);
  const [promoCardFile, setPromoCardFile] = useState(null);

  // Storefront Settings sub-tab
  const [storefrontSubTab, setStorefrontSubTab] = useState("banners"); // "banners" | "promo-cards" | "ticker" | "invoice" | "designer"

  // Designer Consultation Fee State
  const [designerFee, setDesignerFee] = useState("500");
  const [designerEnabled, setDesignerEnabled] = useState(true);

  // Flash Offers State — multi-product support
  // Each row in flashOfferItems is one product+discount pair being configured
  const [flashOfferItems, setFlashOfferItems] = useState([
    { _key: Date.now(), product_id: "", discount_percent: "10", searchQuery: "", searchOpen: false }
  ]);
  const [sharedOfferDays, setSharedOfferDays] = useState("0");
  const [sharedOfferHours, setSharedOfferHours] = useState("0");
  const [sharedOfferMinutes, setSharedOfferMinutes] = useState("15");
  const [activeOffersList, setActiveOffersList] = useState([]); // [{product_id, discount_percent, ends_at}]
  const [savingOffer, setSavingOffer] = useState(false);
  const [offersTimeLeft, setOffersTimeLeft] = useState("");
  // Legacy compat (kept so localStorage fallback blocks compile cleanly)
  const [activeOfferProduct, setActiveOfferProduct] = useState(null);
  const [activeOfferEndsAt, setActiveOfferEndsAt] = useState(null);
  const [activeOfferDiscount, setActiveOfferDiscount] = useState(0);
  const [offerProductId, setOfferProductId] = useState("");
  const [offerDiscountPercent, setOfferDiscountPercent] = useState("10");

  // Shared countdown timer for active offers batch
  useEffect(() => {
    const endsAt = activeOffersList[0]?.ends_at || activeOfferEndsAt;
    if (!endsAt) { setOffersTimeLeft(""); return; }
    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) {
        setOffersTimeLeft("Expired");
        setActiveOffersList([]);
        setActiveOfferProduct(null);
        setActiveOfferDiscount(0);
        setActiveOfferEndsAt(null);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      parts.push(`${String(h).padStart(2, "0")}h`);
      parts.push(`${String(m).padStart(2, "0")}m`);
      parts.push(`${String(s).padStart(2, "0")}s`);
      setOffersTimeLeft(parts.join(" : "));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeOffersList, activeOfferEndsAt]);

  // Helper: add a blank product row
  const addOfferRow = () => {
    setFlashOfferItems(prev => [
      ...prev,
      { _key: Date.now(), product_id: "", discount_percent: "10", searchQuery: "", searchOpen: false }
    ]);
  };

  // Helper: remove a row by _key
  const removeOfferRow = (key) => {
    setFlashOfferItems(prev => prev.filter(r => r._key !== key));
  };

  // Helper: update a single field in a specific row
  const updateOfferRow = (key, field, value) => {
    setFlashOfferItems(prev =>
      prev.map(r => r._key === key ? { ...r, [field]: value } : r)
    );
  };

  // Close dropdowns when clicking outside any offer row's search box
  useEffect(() => {
    const handleClickOutside = () => {
      setFlashOfferItems(prev => prev.map(r => ({ ...r, searchOpen: false })));
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Invoice settings state
  const [invoiceCompanyName, setInvoiceCompanyName] = useState("THREAD 3D APPAREL STUDIO");
  const [invoiceCompanyAbbr, setInvoiceCompanyAbbr] = useState("T3D");
  const [invoiceAddressLine1, setInvoiceAddressLine1] = useState("102, Innovation & Sublimation Hub");
  const [invoiceAddressLine2, setInvoiceAddressLine2] = useState("Industrial Sector Phase II, Chennai, TN, India");
  const [invoiceEmail, setInvoiceEmail] = useState("help@thread3d.com");
  const [invoicePhone, setInvoicePhone] = useState("+91 44 2390 1234");

  // Load invoice settings on mount
  useEffect(() => {
    try {
      const savedInvoiceSettings = localStorage.getItem("apparel_invoice_settings");
      if (savedInvoiceSettings) {
        const parsed = JSON.parse(savedInvoiceSettings);
        if (parsed.companyName) setInvoiceCompanyName(parsed.companyName);
        if (parsed.companyAbbr) setInvoiceCompanyAbbr(parsed.companyAbbr);
        if (parsed.addressLine1) setInvoiceAddressLine1(parsed.addressLine1);
        if (parsed.addressLine2) setInvoiceAddressLine2(parsed.addressLine2);
        if (parsed.email) setInvoiceEmail(parsed.email);
        if (parsed.phone) setInvoicePhone(parsed.phone);
      }
    } catch (e) {
      console.warn("Failed to load invoice settings:", e);
    }

    // Load designer consultation fee settings
    try {
      const savedDesignerSettings = localStorage.getItem("apparel_designer_settings");
      if (savedDesignerSettings) {
        const parsed = JSON.parse(savedDesignerSettings);
        if (parsed.fee) setDesignerFee(String(parsed.fee));
        if (parsed.enabled !== undefined) setDesignerEnabled(parsed.enabled);
      }
    } catch (e) {
      console.warn("Failed to load designer settings:", e);
    }
  }, []);

  const handleSaveInvoiceSettings = (e) => {
    e.preventDefault();
    try {
      const settings = {
        companyName: invoiceCompanyName,
        companyAbbr: invoiceCompanyAbbr,
        addressLine1: invoiceAddressLine1,
        addressLine2: invoiceAddressLine2,
        email: invoiceEmail,
        phone: invoicePhone,
      };
      localStorage.setItem("apparel_invoice_settings", JSON.stringify(settings));
      alert("Invoice settings saved successfully!");
    } catch (e) {
      alert("Failed to save invoice settings: " + e.message);
    }
  };

  const handleSaveDesignerSettings = async (e) => {
    e.preventDefault();
    const feeVal = parseInt(designerFee, 10);
    if (isNaN(feeVal) || feeVal < 0) {
      alert("Please enter a valid designer service fee amount.");
      return;
    }
    try {
      const settings = {
        fee: feeVal,
        enabled: designerEnabled,
      };
      localStorage.setItem("apparel_designer_settings", JSON.stringify(settings));

      try {
        let currentSettings = {};
        const saved = localStorage.getItem("apparel_storefront_settings_local");
        if (saved) currentSettings = JSON.parse(saved);
        currentSettings.designer_fee = feeVal;
        currentSettings.designer_enabled = designerEnabled;
        localStorage.setItem("apparel_storefront_settings_local", JSON.stringify(currentSettings));
      } catch (err) {
        console.warn("Failed to save designer settings to local mirror:", err);
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          designer_fee: feeVal,
          designer_enabled: designerEnabled
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("✓ Personalized designer service settings saved globally!");
        await addAuditLog(`Updated personalized designer service settings: Fee ₹${feeVal}, Status: ${designerEnabled ? "Enabled" : "Disabled"}`);
      } else {
        console.warn("Could not save designer settings globally, fell back to local browser storage:", data.error);
        alert("✓ Saved successfully! (Note: Saved to local browser storage only. Database columns might be pending setup.)");
      }
    } catch (e) {
      console.warn("Failed to save designer settings to API, using local storage fallback:", e.message);
      alert("✓ Saved successfully! (Note: Saved to local browser storage only. Database columns might be pending setup.)");
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      
      const res = await fetch("/api/coupons", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCoupons(data.coupons || []);
        setCouponsFallbackMode(!!data.fallbackMode);
        setCouponsFallbackMessage(data.message || "");
      } else {
        console.error("Failed to load coupons:", data.error);
      }
    } catch (err) {
      console.error("Error fetching coupons:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setCouponFormError("");
    if (!newCouponCode.trim()) {
      setCouponFormError("Coupon code is required");
      return;
    }
    const disc = parseInt(newCouponDiscount);
    if (isNaN(disc) || disc <= 0 || disc > 100) {
      setCouponFormError("Discount percentage must be between 1 and 100");
      return;
    }

    setSavingCoupon(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          code: newCouponCode,
          discount_percent: disc,
          usage_limit: newCouponLimit ? parseInt(newCouponLimit) : null,
          is_first_time_only: newCouponFirstTime,
          is_active: newCouponActive
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNewCouponCode("");
        setNewCouponDiscount("");
        setNewCouponLimit("");
        setNewCouponFirstTime(false);
        setNewCouponActive(true);
        fetchCoupons();
      } else {
        setCouponFormError(data.error || "Failed to create coupon.");
      }
    } catch (err) {
      setCouponFormError(err.message || "Failed to create coupon.");
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCouponStatus = async (coupon) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/coupons", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id: coupon.id,
          is_active: !coupon.is_active
        })
      });

      if (res.ok) {
        fetchCoupons();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update coupon.");
      }
    } catch (err) {
      alert("Error toggling coupon status: " + err.message);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm("Are you sure you want to delete this coupon code?")) return;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch(`/api/coupons?id=${couponId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchCoupons();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete coupon.");
      }
    } catch (err) {
      alert("Error deleting coupon: " + err.message);
    }
  };

  const fetchPaymentSettings = async () => {
    setLoadingPaymentSettings(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      
      const res = await fetch("/api/payment/settings", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRazorpayKeyId(data.key_id || "");
        setRazorpayEnabled(data.enabled || false);
        setKeySecretConfigured(data.key_secret_configured || false);
        setWebhookSecretConfigured(data.webhook_secret_configured || false);
        setMockModeEnabled(data.mock_mode_enabled || false);
        setRazorpayKeySecret(""); 
        setRazorpayWebhookSecret(""); 
      } else {
        console.error("Failed to load payment settings:", data.error);
      }
    } catch (err) {
      console.error("Error fetching payment settings:", err);
    } finally {
      setLoadingPaymentSettings(false);
    }
  };

  const handleToggleMockMode = async (newValue) => {
    setTogglingMockMode(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/payment/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ mock_mode_enabled: newValue })
      });
      const data = await res.json();
      if (res.ok) {
        setMockModeEnabled(newValue);
      } else {
        console.error("Failed to toggle mock mode:", data.error);
        alert(`❌ Failed to toggle mock mode:\n\n${data.error}`);
      }
    } catch (err) {
      console.error("Error toggling mock mode:", err);
      alert(`❌ Error toggling mock mode: ${err.message}`);
    } finally {
      setTogglingMockMode(false);
    }
  };

  const handleTestPaymentCredentials = async (e) => {
    e.preventDefault();
    if (!razorpayKeyId.trim()) {
      alert("Key ID is required for testing.");
      return;
    }
    setTestingPaymentCredentials(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/payment/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
          test_mode: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("✓ Success: Razorpay Key ID and Key Secret credentials are valid!");
      } else {
        alert(`❌ Validation Failed: ${data.error || "Incorrect credentials."}`);
      }
    } catch (err) {
      alert(`❌ Error testing credentials: ${err.message}`);
    } finally {
      setTestingPaymentCredentials(false);
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    if (!razorpayKeyId.trim()) {
      alert("Key ID is required.");
      return;
    }
    setSavingPaymentSettings(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/payment/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: razorpayEnabled,
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
          webhook_secret: razorpayWebhookSecret,
          test_mode: false
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("✓ Settings saved and validated successfully!");
        fetchPaymentSettings();
      } else {
        alert(`❌ Failed to save settings: ${data.error || "Incorrect credentials."}`);
      }
    } catch (err) {
      alert(`❌ Error saving settings: ${err.message}`);
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const fetchStudioPricingSettings = async () => {
    setLoadingStudioPricing(true);
    try {
      const { data, error } = await supabase
        .from("studio_pricing_settings")
        .select("*")
        .eq("id", "default")
        .single();
      if (error) {
        console.warn("Could not load studio pricing settings from database:", error.message);
        // Fall back to default placeholders
        setStudioCottonUpcharge("0");
        setStudioPolyesterUpcharge("999");
        setStudioFleeceUpcharge("1299");
        setStudioCustomizationBaseFee("0");
        setStudioCottonRoughness("0.85");
        setStudioCottonMetalness("0.1");
        setStudioCottonBumpScale("0.04");
        setStudioPolyesterRoughness("0.25");
        setStudioPolyesterMetalness("0.45");
        setStudioPolyesterBumpScale("0.02");
        setStudioFleeceRoughness("1.0");
        setStudioFleeceMetalness("0.05");
        setStudioFleeceBumpScale("0.06");
        
        setStudioCottonLabel("Matte Organic Cotton");
        setStudioCottonDesc("Flat, organic 100% cotton threads");
        setStudioPolyesterLabel("Shiny Athletic Polyester");
        setStudioPolyesterDesc("Reflective, sleek high-performance finish");
        setStudioFleeceLabel("Heavy Luxury Fleece");
        setStudioFleeceDesc("Extra thick, warm luxury heavy fleece feel");
      } else if (data) {
        setStudioCottonUpcharge(String(data.cotton_upcharge ?? 0));
        setStudioPolyesterUpcharge(String(data.polyester_upcharge ?? 999));
        setStudioFleeceUpcharge(String(data.fleece_upcharge ?? 1299));
        setStudioCustomizationBaseFee(String(data.customization_base_fee ?? 0));

        setStudioCottonRoughness(String(data.cotton_roughness ?? 0.85));
        setStudioCottonMetalness(String(data.cotton_metalness ?? 0.1));
        setStudioCottonBumpScale(String(data.cotton_bump_scale ?? 0.04));

        setStudioPolyesterRoughness(String(data.polyester_roughness ?? 0.25));
        setStudioPolyesterMetalness(String(data.polyester_metalness ?? 0.45));
        setStudioPolyesterBumpScale(String(data.polyester_bump_scale ?? 0.02));

        setStudioFleeceRoughness(String(data.fleece_roughness ?? 1.0));
        setStudioFleeceMetalness(String(data.fleece_metalness ?? 0.05));
        setStudioFleeceBumpScale(String(data.fleece_bump_scale ?? 0.06));

        setStudioCottonLabel(data.cotton_label ?? "Matte Organic Cotton");
        setStudioCottonDesc(data.cotton_desc ?? "Flat, organic 100% cotton threads");
        setStudioPolyesterLabel(data.polyester_label ?? "Shiny Athletic Polyester");
        setStudioPolyesterDesc(data.polyester_desc ?? "Reflective, sleek high-performance finish");
        setStudioFleeceLabel(data.fleece_label ?? "Heavy Luxury Fleece");
        setStudioFleeceDesc(data.fleece_desc ?? "Extra thick, warm luxury heavy fleece feel");
      }
    } catch (err) {
      console.error("Error fetching studio pricing:", err);
    } finally {
      setLoadingStudioPricing(false);
    }
  };

  const handleSaveStudioPricing = async (e) => {
    e.preventDefault();
    setSavingStudioPricing(true);
    try {
      const cottonVal = parseFloat(studioCottonUpcharge) || 0;
      const polyVal = parseFloat(studioPolyesterUpcharge) || 0;
      const fleeceVal = parseFloat(studioFleeceUpcharge) || 0;
      const baseFeeVal = parseFloat(studioCustomizationBaseFee) || 0;

      const cottonRough = parseFloat(studioCottonRoughness) ?? 0.85;
      const cottonMetal = parseFloat(studioCottonMetalness) ?? 0.1;
      const cottonBump = parseFloat(studioCottonBumpScale) ?? 0.04;

      const polyRough = parseFloat(studioPolyesterRoughness) ?? 0.25;
      const polyMetal = parseFloat(studioPolyesterMetalness) ?? 0.45;
      const polyBump = parseFloat(studioPolyesterBumpScale) ?? 0.02;

      const fleeceRough = parseFloat(studioFleeceRoughness) ?? 1.0;
      const fleeceMetal = parseFloat(studioFleeceMetalness) ?? 0.05;
      const fleeceBump = parseFloat(studioFleeceBumpScale) ?? 0.06;

      const { error } = await supabase
        .from("studio_pricing_settings")
        .upsert({
          id: "default",
          cotton_upcharge: cottonVal,
          polyester_upcharge: polyVal,
          fleece_upcharge: fleeceVal,
          customization_base_fee: baseFeeVal,
          cotton_roughness: cottonRough,
          cotton_metalness: cottonMetal,
          cotton_bump_scale: cottonBump,
          polyester_roughness: polyRough,
          polyester_metalness: polyMetal,
          polyester_bump_scale: polyBump,
          fleece_roughness: fleeceRough,
          fleece_metalness: fleeceMetal,
          fleece_bump_scale: fleeceBump,
          cotton_label: studioCottonLabel,
          cotton_desc: studioCottonDesc,
          polyester_label: studioPolyesterLabel,
          polyester_desc: studioPolyesterDesc,
          fleece_label: studioFleeceLabel,
          fleece_desc: studioFleeceDesc,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await addAuditLog(`Updated 3D Customizer Studio pricing & materials. Upcharges - Cotton: ₹${cottonVal}, Polyester: ₹${polyVal}, Fleece: ₹${fleeceVal}, Base: ₹${baseFeeVal}. Materials updated.`);
      alert("✓ Studio settings and materials saved successfully!");
    } catch (err) {
      alert("❌ Error saving studio pricing settings: " + err.message);
    } finally {
      setSavingStudioPricing(false);
    }
  };

  // Fetch homepage banners from Supabase
  const fetchHomepageBanners = async () => {
    setLoadingBanners(true);
    try {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      
      if (data && data.length > 0) {
        setBannersList(data);
      } else {
        // Fallback defaults if table is empty
        setBannersList([
          { id: 1, badge: "3D STUDIO CONFIGURATOR", title: "Design in Real-Time 3D", subtitle: "Experience the customizer.", image_url: "/banner_studio.png", cta_text: "Enter 3D Studio", cta_href: "/studio", accent: "from-indigo-400 via-purple-500 to-pink-500", display_order: 0 },
          { id: 2, badge: "NEW SEASON COLLECTIONS", title: "Licensed Pop-Culture Drops", subtitle: "Shop catalog apparel.", image_url: "/banner_anime.png", cta_text: "Shop Ready-to-Wear", cta_href: "/dashboard", accent: "from-orange-400 via-red-500 to-yellow-500", display_order: 1 },
          { id: 3, badge: "LIMITED VIP ENROLLMENT", title: "Thread3D Membership Club", subtitle: "Join VIP.", image_url: "/banner_membership.png", cta_text: "Use Code: THREAD3D", cta_href: "/dashboard", accent: "from-purple-600 via-pink-600 to-blue-500", display_order: 2 }
        ]);
      }
    } catch (err) {
      console.warn("Could not fetch homepage banners from Supabase (checking local storage fallback):", err.message || err);
      try {
        const saved = localStorage.getItem("apparel_banners_local");
        if (saved && JSON.parse(saved).length > 0) {
          setBannersList(JSON.parse(saved));
          setLoadingBanners(false);
          return;
        }
      } catch (localErr) {
        console.error("Failed to load local banners:", localErr);
      }
      // Fallback defaults in case Supabase query fails and no local storage is present
      setBannersList([
        { id: 1, badge: "3D STUDIO CONFIGURATOR", title: "Design in Real-Time 3D", subtitle: "Experience the customizer.", image_url: "/banner_studio.png", cta_text: "Enter 3D Studio", cta_href: "/studio", accent: "from-indigo-400 via-purple-500 to-pink-500", display_order: 0 },
        { id: 2, badge: "NEW SEASON COLLECTIONS", title: "Licensed Pop-Culture Drops", subtitle: "Shop catalog apparel.", image_url: "/banner_anime.png", cta_text: "Shop Ready-to-Wear", cta_href: "/dashboard", accent: "from-orange-400 via-red-500 to-yellow-500", display_order: 1 },
        { id: 3, badge: "LIMITED VIP ENROLLMENT", title: "Thread3D Membership Club", subtitle: "Join VIP.", image_url: "/banner_membership.png", cta_text: "Use Code: THREAD3D", cta_href: "/dashboard", accent: "from-purple-600 via-pink-600 to-blue-500", display_order: 2 }
      ]);
    } finally {
      setLoadingBanners(false);
    }
  };

  // Save or Update a single banner record
  const handleSaveBanner = async (bannerData) => {
    setSavingBanner(true);
    try {
      let finalImageUrl = bannerData.image_url;

      // Handle Image Upload if a file has been selected
      if (bannerFile) {
        try {
          const fileExt = bannerFile.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const filePath = `banners/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("product-assets")
            .upload(filePath, bannerFile, { cacheControl: "3600", upsert: false });

          if (uploadErr) throw new Error(`Banner Image Upload failed: ${uploadErr.message}`);

          const { data: urlData } = supabase.storage
            .from("product-assets")
            .getPublicUrl(filePath);

          finalImageUrl = urlData.publicUrl;
        } catch (uploadException) {
          console.warn("Storage upload failed, converting image to base64 for offline fallback...", uploadException.message);
          finalImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(bannerFile);
          });
        }
      }

      const { id, badge, title, subtitle, cta_text, cta_href, accent, display_order } = bannerData;
      
      const payload = {
        badge: badge || "",
        title: title || "",
        subtitle: subtitle || "",
        image_url: finalImageUrl || "",
        cta_text: cta_text || "Learn More",
        cta_href: cta_href || "/",
        accent: accent || "from-indigo-500 via-purple-500 to-pink-500",
        display_order: parseInt(display_order) || 0
      };

      // Use upsert so that newly customized default banners are automatically created in the database table
      const targetId = id || (bannersList.length > 0 ? Math.max(...bannersList.map(b => b.id)) + 1 : 1);
      
      try {
        const { error } = await supabase
          .from("homepage_banners")
          .upsert({
            id: targetId,
            ...payload,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        await addAuditLog(`Updated homepage banner slide: "${title}"`);
        alert("✓ Banner slide saved successfully!");
      } catch (supabaseErr) {
        console.warn("Supabase banner save failed, falling back to local storage:", supabaseErr.message);
        const updatedList = [...bannersList];
        const matchIdx = updatedList.findIndex(b => b.id === targetId);
        const newBanner = { id: targetId, ...payload, created_at: new Date().toISOString() };
        if (matchIdx > -1) {
          updatedList[matchIdx] = newBanner;
        } else {
          updatedList.push(newBanner);
        }
        localStorage.setItem("apparel_banners_local", JSON.stringify(updatedList));
        setBannersList(updatedList);
        alert("✓ Saved locally in browser storage! Note: To save permanently in database, execute schema.sql in your Supabase dashboard.");
      }

      setEditingBanner(null);
      setBannerFile(null); // Reset file selection state
      fetchHomepageBanners();
    } catch (err) {
      alert("❌ Error saving banner: " + err.message);
    } finally {
      setSavingBanner(false);
    }
  };

  // Delete a banner record
  const handleDeleteBanner = async (id) => {
    if (!confirm("Are you sure you want to delete this banner slide?")) return;
    try {
      try {
        const { error } = await supabase
          .from("homepage_banners")
          .delete()
          .eq("id", id);
        if (error) throw error;

        await addAuditLog(`Deleted homepage banner ID: ${id}`);
        alert("✓ Banner slide deleted successfully!");
      } catch (supabaseErr) {
        console.warn("Supabase banner delete failed, falling back to local storage:", supabaseErr.message);
        const updatedList = bannersList.filter(b => b.id !== id);
        localStorage.setItem("apparel_banners_local", JSON.stringify(updatedList));
        setBannersList(updatedList);
        alert("✓ Banner deleted locally in browser storage! Note: To delete permanently in database, execute schema.sql in your Supabase dashboard.");
      }
      fetchHomepageBanners();
    } catch (err) {
      alert("❌ Error deleting banner: " + err.message);
    }
  };

  const DEFAULT_PROMO_CARDS = [
    { id: 1, badge: "Thread3D Originals", title: "Classic Boxy Tees", description: "Perfect drop-shoulder silhouettes tailored from 380 GSM certified organic cotton.", image_url: "", cta_text: "Explore Drop", cta_href: "/dashboard?category=t-shirt", accent_color: "indigo", display_order: 0 },
    { id: 2, badge: "Anime Special Edition", title: "The Anime Zone", description: "Officially licensed subculture prints and glowing reflective patterns.", image_url: "", cta_text: "Explore Drop", cta_href: "/dashboard?q=anime", accent_color: "purple", display_order: 1 },
    { id: 3, badge: "Interactive Studio", title: "Create in 3D Customizer", description: "Upload your graphics, change base colors, adjust lighting and roughness properties live.", image_url: "", cta_text: "Design Now", cta_href: "/studio", accent_color: "pink", display_order: 2 },
    { id: 4, badge: "Premium Jackets", title: "Cozy Winterwear", description: "Heavy luxury fleece garments, utility jacket shells, and oversized joggers.", image_url: "", cta_text: "Explore Drop", cta_href: "/dashboard?category=jacket", accent_color: "emerald", display_order: 3 }
  ];

  // Fetch homepage promo cards from Supabase
  const fetchPromoCards = async () => {
    setLoadingPromoCards(true);
    try {
      const { data, error } = await supabase
        .from("homepage_promo_cards")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      
      if (data && data.length > 0) {
        setPromoCardsList(data);
      } else {
        setPromoCardsList(DEFAULT_PROMO_CARDS);
      }
    } catch (err) {
      console.warn("Could not fetch homepage promo cards from Supabase (checking local storage fallback):", err.message || err);
      try {
        const saved = localStorage.getItem("apparel_promo_cards_local");
        if (saved && JSON.parse(saved).length > 0) {
          setPromoCardsList(JSON.parse(saved));
          setLoadingPromoCards(false);
          return;
        }
      } catch (localErr) {
        console.error("Failed to load local promo cards:", localErr);
      }
      setPromoCardsList(DEFAULT_PROMO_CARDS);
    } finally {
      setLoadingPromoCards(false);
    }
  };

  // Save or Update a single promo card
  const handleSavePromoCard = async (promoData) => {
    setSavingPromoCard(true);
    try {
      let finalImageUrl = promoData.image_url;

      // Handle Image Upload if a file has been selected
      if (promoCardFile) {
        try {
          const fileExt = promoCardFile.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const filePath = `promos/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("product-assets")
            .upload(filePath, promoCardFile, { cacheControl: "3600", upsert: false });

          if (uploadErr) throw new Error(`Promo Image Upload failed: ${uploadErr.message}`);

          const { data: urlData } = supabase.storage
            .from("product-assets")
            .getPublicUrl(filePath);

          finalImageUrl = urlData.publicUrl;
        } catch (uploadException) {
          console.warn("Storage upload failed, converting image to base64 for offline fallback...", uploadException.message);
          finalImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(promoCardFile);
          });
        }
      }

      const { id, badge, title, description, cta_text, cta_href, accent_color, display_order } = promoData;
      
      const payload = {
        badge: badge || "",
        title: title || "",
        description: description || "",
        image_url: finalImageUrl || "",
        cta_text: cta_text || "Explore Drop",
        cta_href: cta_href || "/",
        accent_color: accent_color || "indigo",
        display_order: parseInt(display_order) || 0
      };

      const targetId = id || (promoCardsList.length > 0 ? Math.max(...promoCardsList.map(p => p.id)) + 1 : 1);
      
      try {
        const { error } = await supabase
          .from("homepage_promo_cards")
          .upsert({
            id: targetId,
            ...payload,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        await addAuditLog(`Updated homepage promo card: "${title}"`);
        alert("✓ Promo card saved successfully!");
      } catch (supabaseErr) {
        console.warn("Supabase promo card save failed, falling back to local storage:", supabaseErr.message);
        const updatedList = [...promoCardsList];
        const matchIdx = updatedList.findIndex(p => p.id === targetId);
        const newCard = { id: targetId, ...payload, created_at: new Date().toISOString() };
        if (matchIdx > -1) {
          updatedList[matchIdx] = newCard;
        } else {
          updatedList.push(newCard);
        }
        localStorage.setItem("apparel_promo_cards_local", JSON.stringify(updatedList));
        setPromoCardsList(updatedList);
        alert("✓ Saved locally in browser storage! Note: To save permanently in database, execute schema.sql in your Supabase dashboard.");
      }

      setEditingPromoCard(null);
      setPromoCardFile(null);
      fetchPromoCards();
    } catch (err) {
      alert("❌ Error saving promo card: " + err.message);
    } finally {
      setSavingPromoCard(false);
    }
  };

  // Delete a promo card
  const handleDeletePromoCard = async (id) => {
    if (!confirm("Are you sure you want to delete this promo card?")) return;
    try {
      try {
        const { error } = await supabase
          .from("homepage_promo_cards")
          .delete()
          .eq("id", id);
        if (error) throw error;

        await addAuditLog(`Deleted homepage promo card ID: ${id}`);
        alert("✓ Promo card deleted successfully!");
      } catch (supabaseErr) {
        console.warn("Supabase promo card delete failed, falling back to local storage:", supabaseErr.message);
        const updatedList = promoCardsList.filter(p => p.id !== id);
        localStorage.setItem("apparel_promo_cards_local", JSON.stringify(updatedList));
        setPromoCardsList(updatedList);
        alert("✓ Promo card deleted locally in browser storage! Note: To delete permanently in database, execute schema.sql in your Supabase dashboard.");
      }
      fetchPromoCards();
    } catch (err) {
      alert("❌ Error deleting promo card: " + err.message);
    }
  };

  // Fetch Announcement Ticker & Flash Offer settings
  const fetchAnnouncement = async () => {
    setLoadingAnnouncement(true);
    try {
      const res = await fetch("/api/announcement");
      const data = await res.json();
      if (res.ok) {
        setAnnouncementText(data.announcement_text || "");
        // Load multi-offer list (new) — filter out expired entries
        const now = new Date();
        const validOffers = (data.flash_offers_list || []).filter(o => o.ends_at && new Date(o.ends_at) > now);
        setActiveOffersList(validOffers);
        // Legacy single-offer compat
        if (validOffers.length > 0) {
          setActiveOfferProduct(validOffers[0].product_id);
          setActiveOfferDiscount(validOffers[0].discount_percent);
          setActiveOfferEndsAt(validOffers[0].ends_at);
        } else {
          setActiveOfferProduct(data.offer_product_id || null);
          setActiveOfferDiscount(data.offer_discount_percent || 0);
          setActiveOfferEndsAt(data.offer_ends_at || null);
        }
        if (data.designer_fee !== undefined) {
          setDesignerFee(String(data.designer_fee));
        }
        if (data.designer_enabled !== undefined) {
          setDesignerEnabled(data.designer_enabled);
        }

        // If DB says it's in fallback mode, apply local mirror too
        if (data.fallbackMode) {
          try {
            const saved = localStorage.getItem("apparel_storefront_settings_local");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.announcement_text !== undefined) setAnnouncementText(parsed.announcement_text);
              if (Array.isArray(parsed.flash_offers_list) && parsed.flash_offers_list.length > 0) {
                const validLocal = parsed.flash_offers_list.filter(o => o.ends_at && new Date(o.ends_at) > new Date());
                setActiveOffersList(validLocal);
              }
              if (parsed.designer_fee !== undefined) setDesignerFee(String(parsed.designer_fee));
              if (parsed.designer_enabled !== undefined) setDesignerEnabled(parsed.designer_enabled);
            }
          } catch (localErr) {
            console.error("Failed to parse local storefront settings:", localErr);
          }
        }
      } else {
        console.error("Failed to load storefront announcement:", data.error);
        try {
          const saved = localStorage.getItem("apparel_storefront_settings_local");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.announcement_text !== undefined) setAnnouncementText(parsed.announcement_text);
            if (Array.isArray(parsed.flash_offers_list)) {
              const validLocal = parsed.flash_offers_list.filter(o => o.ends_at && new Date(o.ends_at) > new Date());
              setActiveOffersList(validLocal);
            }
            if (parsed.designer_fee !== undefined) setDesignerFee(String(parsed.designer_fee));
            if (parsed.designer_enabled !== undefined) setDesignerEnabled(parsed.designer_enabled);
          }
        } catch (localErr) {
          console.error("Failed to parse local storefront fallback:", localErr);
        }
      }
    } catch (err) {
      console.error("Error fetching announcement:", err);
      try {
        const saved = localStorage.getItem("apparel_storefront_settings_local");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.announcement_text !== undefined) setAnnouncementText(parsed.announcement_text);
          if (Array.isArray(parsed.flash_offers_list)) {
            const validLocal = parsed.flash_offers_list.filter(o => o.ends_at && new Date(o.ends_at) > new Date());
            setActiveOffersList(validLocal);
          }
          if (parsed.designer_fee !== undefined) setDesignerFee(String(parsed.designer_fee));
          if (parsed.designer_enabled !== undefined) setDesignerEnabled(parsed.designer_enabled);
        }
      } catch (localErr) {
        console.error("Failed to load local storefront settings:", localErr);
      }
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  // Save ALL flash offers (multi-product)
  const handleSaveFlashOffers = async (e) => {
    e.preventDefault();
    const validItems = flashOfferItems.filter(r => r.product_id.trim());
    if (validItems.length === 0) {
      alert("Please select at least one product.");
      return;
    }
    for (const r of validItems) {
      const pct = parseInt(r.discount_percent, 10);
      if (isNaN(pct) || pct < 1 || pct > 99) {
        alert(`Discount for row must be between 1% and 99%.`);
        return;
      }
    }
    const days = parseInt(sharedOfferDays, 10) || 0;
    const hours = parseInt(sharedOfferHours, 10) || 0;
    const mins = parseInt(sharedOfferMinutes, 10) || 0;
    const totalMinutes = (days * 24 * 60) + (hours * 60) + mins;
    if (totalMinutes < 1) {
      alert("Duration must be at least 1 minute.");
      return;
    }

    setSavingOffer(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      const endsAt = new Date(Date.now() + totalMinutes * 60 * 1000).toISOString();
      const offerList = validItems.map(r => ({
        product_id: r.product_id,
        discount_percent: parseInt(r.discount_percent, 10),
        ends_at: endsAt
      }));

      try {
        const res = await fetch("/api/announcement", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            flash_offers_list: offerList,
            // Also write first offer to legacy single-offer columns for backward compat
            offer_product_id: offerList[0].product_id,
            offer_discount_percent: offerList[0].discount_percent,
            offer_ends_at: endsAt
          })
        });
        const data = await res.json();
        if (res.ok) {
          setActiveOffersList(offerList);
          setActiveOfferProduct(offerList[0].product_id);
          setActiveOfferDiscount(offerList[0].discount_percent);
          setActiveOfferEndsAt(endsAt);
          await addAuditLog(`Started ${offerList.length} flash offer(s) for ${totalMinutes}min`);
          alert(`✓ ${offerList.length} flash offer(s) started successfully!`);
          // Reset form
          setFlashOfferItems([{ _key: Date.now(), product_id: "", discount_percent: "10", searchQuery: "", searchOpen: false }]);
          setSharedOfferDays("0"); setSharedOfferHours("0"); setSharedOfferMinutes("15");
        } else {
          throw new Error(data.error || "Failed to save to database");
        }
      } catch (apiErr) {
        console.warn("Supabase flash offers save failed, falling back to local storage:", apiErr.message);
        let cs = {};
        try { const sv = localStorage.getItem("apparel_storefront_settings_local"); if (sv) cs = JSON.parse(sv); } catch {}
        cs.flash_offers_list = offerList;
        localStorage.setItem("apparel_storefront_settings_local", JSON.stringify(cs));
        setActiveOffersList(offerList);
        alert("✓ Saved locally in browser storage! Note: To save permanently in database, execute schema.sql in your Supabase dashboard.");
      }
    } catch (err) {
      alert("❌ Error saving flash offers: " + err.message);
    } finally {
      setSavingOffer(false);
    }
  };

  // End ONE offer from the active list
  const handleEndSingleOffer = async (productId) => {
    if (!confirm("End this flash offer?")) return;
    setSavingOffer(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      const remaining = activeOffersList.filter(o => o.product_id !== productId);
      try {
        const res = await fetch("/api/announcement", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            flash_offers_list: remaining,
            offer_product_id: remaining[0]?.product_id || null,
            offer_discount_percent: remaining[0]?.discount_percent || 0,
            offer_ends_at: remaining[0]?.ends_at || null
          })
        });
        const data = await res.json();
        if (res.ok) {
          setActiveOffersList(remaining);
          if (remaining.length === 0) { setActiveOfferProduct(null); setActiveOfferDiscount(0); setActiveOfferEndsAt(null); }
          await addAuditLog(`Ended flash offer for product ${productId}`);
          alert("✓ Flash offer ended!");
        } else throw new Error(data.error);
      } catch (apiErr) {
        let cs = {};
        try { const sv = localStorage.getItem("apparel_storefront_settings_local"); if (sv) cs = JSON.parse(sv); } catch {}
        cs.flash_offers_list = remaining;
        localStorage.setItem("apparel_storefront_settings_local", JSON.stringify(cs));
        setActiveOffersList(remaining);
        alert("✓ Offer ended locally in browser storage!");
      }
    } catch (err) {
      alert("❌ Error ending offer: " + err.message);
    } finally { setSavingOffer(false); }
  };

  // End ALL active offers
  const handleEndAllOffers = async () => {
    if (!confirm("End ALL active flash offers?")) return;
    setSavingOffer(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      try {
        const res = await fetch("/api/announcement", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ flash_offers_list: [], offer_product_id: null, offer_discount_percent: 0, offer_ends_at: null })
        });
        const data = await res.json();
        if (res.ok) {
          setActiveOffersList([]); setActiveOfferProduct(null); setActiveOfferDiscount(0); setActiveOfferEndsAt(null);
          await addAuditLog("Ended all flash offers.");
          alert("✓ All flash offers ended!");
        } else throw new Error(data.error);
      } catch (apiErr) {
        let cs = {};
        try { const sv = localStorage.getItem("apparel_storefront_settings_local"); if (sv) cs = JSON.parse(sv); } catch {}
        cs.flash_offers_list = [];
        localStorage.setItem("apparel_storefront_settings_local", JSON.stringify(cs));
        setActiveOffersList([]); setActiveOfferProduct(null); setActiveOfferDiscount(0); setActiveOfferEndsAt(null);
        alert("✓ All offers ended locally!");
      }
    } catch (err) {
      alert("❌ Error ending all offers: " + err.message);
    } finally { setSavingOffer(false); }
  };

  // Save Announcement Ticker settings
  const handleSaveAnnouncement = async (e) => {
    if (e) e.preventDefault();
    setSavingAnnouncement(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const res = await fetch("/api/announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          announcement_text: announcementText
        })
      });
      const data = await res.json();
      if (res.ok) {
        await addAuditLog(`Updated storefront announcement ticker to: "${announcementText}"`);
        alert("✓ Announcement ticker saved successfully!");
      } else {
        throw new Error(data.error || "Failed to save announcement to DB");
      }
    } catch (err) {
      console.warn("Announcement save failed, falling back to local storage:", err.message);
      try {
        let currentSettings = {};
        try {
          const saved = localStorage.getItem("apparel_storefront_settings_local");
          if (saved) currentSettings = JSON.parse(saved);
        } catch {}
        currentSettings.announcement_text = announcementText;
        localStorage.setItem("apparel_storefront_settings_local", JSON.stringify(currentSettings));
        alert("✓ Saved locally in browser storage! Note: To save permanently in database, execute schema.sql in your Supabase dashboard.");
      } catch (localErr) {
        alert("❌ Error saving announcement locally: " + localErr.message);
      }
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Verify Supabase Database Table Schemas & Columns on Admin Dashboard Boot
  const checkDatabaseSchema = async () => {
    const mismatches = [];
    try {
      const { error } = await supabase.from("products").select("price").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing 'price' column in your 'products' table.");
      }
    } catch (e) {
      mismatches.push("Missing 'price' column in your 'products' table.");
    }

    try {
      const { error } = await supabase.from("orders").select("carrier, tracking_number").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing 'carrier' or 'tracking_number' columns in your 'orders' table.");
      }
    } catch (e) {
      mismatches.push("Missing 'carrier' or 'tracking_number' columns in your 'orders' table.");
    }

    try {
      const { error } = await supabase.from("products").select("is_template, description, gallery_urls").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing new columns ('is_template', 'description', 'gallery_urls') in the 'products' table.");
      }
    } catch (e) {
      mismatches.push("Missing new columns ('is_template', 'description', 'gallery_urls') in the 'products' table.");
    }

    try {
      const { error } = await supabase.from("products").select("gender").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing the 'gender' classification column in your 'products' table. Run schema.sql SQL command to fix.");
      }
    } catch (e) {
      mismatches.push("Missing the 'gender' classification column in your 'products' table. Run schema.sql SQL command to fix.");
    }

    try {
      const { error } = await supabase.from("product_reviews").select("*").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'product_reviews' table in your Supabase database schema.");
      }
    } catch (e) {
      mismatches.push("Missing the 'product_reviews' table in your Supabase database schema.");
    }

    try {
      const { error } = await supabase.from("system_logs").select("*").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'system_logs' table in your Supabase database schema.");
      }
    } catch (e) {
      mismatches.push("Missing the 'system_logs' table in your Supabase database schema.");
    }

    try {
      const { error } = await supabase.from("payment_gateway_settings").select("id").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'payment_gateway_settings' table in your Supabase database schema.");
      }
    } catch (e) {
      mismatches.push("Missing the 'payment_gateway_settings' table in your Supabase database schema.");
    }

    try {
      const { error } = await supabase.from("studio_pricing_settings").select("id").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'studio_pricing_settings' table in your Supabase database schema. Run schema.sql SQL command to fix.");
      }
    } catch (e) {
      mismatches.push("Missing the 'studio_pricing_settings' table in your Supabase database schema. Run schema.sql SQL command to fix.");
    }

    try {
      const { error } = await supabase.from("homepage_banners").select("id").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'homepage_banners' table in your Supabase database schema. Run schema.sql SQL command to fix.");
      }
    } catch (e) {
      mismatches.push("Missing the 'homepage_banners' table in your Supabase database schema. Run schema.sql SQL command to fix.");
    }

    try {
      const { error } = await supabase.from("storefront_settings").select("id").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'storefront_settings' table in your Supabase database schema. Run schema.sql SQL command to fix.");
      }
    } catch (e) {
      mismatches.push("Missing the 'storefront_settings' table in your Supabase database schema. Run schema.sql SQL command to fix.");
    }

    try {
      const { error } = await supabase.from("homepage_promo_cards").select("id").limit(1);
      if (error && (error.message.includes("does not exist") || error.code === "PGRST205" || error.code === "42P01")) {
        mismatches.push("Missing the 'homepage_promo_cards' table in your Supabase database schema. Run schema.sql SQL command to fix.");
      }
    } catch (e) {
      mismatches.push("Missing the 'homepage_promo_cards' table in your Supabase database schema. Run schema.sql SQL command to fix.");
    }

    try {
      const { error } = await supabase.from("categories").select("image_url").limit(1);
      if (error && (error.message.includes("column") || error.code === "PGRST205" || error.code === "42703")) {
        mismatches.push("Missing the 'image_url' column in your 'categories' table. Run schema.sql SQL command to fix.");
      }
    } catch (e) {
      mismatches.push("Missing the 'image_url' column in your 'categories' table. Run schema.sql SQL command to fix.");
    }

    setDbMismatches(mismatches);
  };


  // Audit Log insertion utility
  const addAuditLog = async (actionMsg) => {
    const logData = {
      operator: session?.user?.email || "admin@example.com",
      action: actionMsg,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from("system_logs")
        .insert([logData]);

      if (error) {
        console.warn("Could not insert log row in Supabase system_logs:", error.message);
      }
    } catch (err) {
      console.warn("Network issue writing audit logs to Supabase:", err);
    }

    try {
      const storedLogs = localStorage.getItem("apparel_system_logs");
      const currentLogs = storedLogs ? JSON.parse(storedLogs) : [];
      localStorage.setItem("apparel_system_logs", JSON.stringify([logData, ...currentLogs]));
    } catch (err) {
      console.error("Failed to back up audit log in LocalStorage:", err);
    }
  };

  // Audit Log fetching utility
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    let cloudLogs = [];
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        cloudLogs = data;
      }
    } catch (err) {
      console.warn("Could not fetch audit logs from Supabase:", err.message);
    }

    let localLogs = [];
    try {
      const stored = localStorage.getItem("apparel_system_logs");
      if (stored) {
        localLogs = JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to read local audit logs:", err);
    }

    const mergedMap = new Map();
    localLogs.forEach(l => mergedMap.set(l.created_at + l.action, l));
    cloudLogs.forEach(l => mergedMap.set(l.created_at + l.action, l));

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setAuditLogs(mergedList.slice(0, 100)); // Cap at 100 logs
    setLoadingLogs(false);
  };

  // Admin 3D Viewer & ZIP Exporter states
  const adminThreeContainerRef = useRef(null);
  const [activeAdmin3dModel, setActiveAdmin3dModel] = useState(null);
  const [activeAdmin3dModelName, setActiveAdmin3dModelName] = useState("");

  // Download ZIP bundle package containing GLB, 2D composite texture, transparent decal PNG and details.json
  const handleDownloadZip = async (order, item) => {
    try {
      const zip = new JSZip();

      // Dynamic Hydration from Local IndexedDB Cache if using the stripped LocalStorage fallback
      let customDesign = item.customDesignUrl;
      let customDecal = item.customDecalUrl;
      let customGlb = item.customGlbBase64;
      let customSvg = null;

      if ((!customDesign || customDesign === "[Cached]") && item.designCacheKey) {
        const cached = await getDesignData(item.designCacheKey);
        if (cached) {
          customDesign = cached.customDesignUrl;
          customDecal = cached.customDecalUrl;
          customGlb = cached.customGlbBase64;
          customSvg = cached.customSvg;
        }
      }

      // A. Compile details descriptor JSON
      const details = {
        orderId: order.id,
        createdAt: order.created_at,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.shipping_address
        },
        product: {
          productId: item.productId,
          name: item.name,
          size: item.size,
          quantity: item.quantity
        }
      };
      zip.file("details.json", JSON.stringify(details, null, 2));

      // B. Save composite custom texture image
      if (customDesign && customDesign !== "[Cached]") {
        const designData = customDesign.includes(",") 
          ? customDesign.split(",")[1] 
          : customDesign;
        zip.file("composite_texture.png", designData, { base64: true });
      }

      // C. Save isolated transparent decal image
      if (customDecal && customDecal !== "[Cached]") {
        const decalData = customDecal.includes(",") 
          ? customDecal.split(",")[1] 
          : customDecal;
        zip.file("decal.png", decalData, { base64: true });
      }

      // D. Save base64 GLB model
      if (customGlb && customGlb !== "[Cached]") {
        zip.file("design.glb", customGlb, { base64: true });
      }

      // E. Save vector design SVG file for high-res printing shop prepress
      if (customSvg) {
        zip.file("vector_design.svg", customSvg);
      }

      // F. Generate and save ZIP package
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Order_${order.id}_Item_${item.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP Generation Failed:", err);
      alert("Failed to build ZIP archive. Please verify design data exists.");
    }
  };

  // Mount 3D Three.js canvas dynamically to render active custom GLB
  useEffect(() => {
    if (!activeAdmin3dModel || !adminThreeContainerRef.current) return;

    let scene, camera, renderer, controls, frameId;
    const container = adminThreeContainerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // 1. Setup Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#09090b");

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.35, 2.3);

    // 3. Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(2, 4, 3);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa5b4fc, 0.4);
    dirLight2.position.set(-2, -2, -3);
    scene.add(dirLight2);

    // 5. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10;
    controls.minDistance = 0.8;
    controls.target.set(0, 0.35, 0);

    // 6. LoadGLB model from base64
    const loader = new GLTFLoader();
    
    try {
      const binaryStr = atob(activeAdmin3dModel);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "model/gltf-binary" });
      const blobUrl = URL.createObjectURL(blob);

      loader.load(
        blobUrl,
        (gltf) => {
          const model = gltf.scene;
          
          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              if (node.material) {
                node.material.needsUpdate = true;
              }
            }
          });

          // Center model automatically
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          model.position.x += (model.position.x - center.x);
          model.position.y += (model.position.y - center.y);
          model.position.z += (model.position.z - center.z);

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 1.6 / maxDim;
            model.scale.set(scale, scale, scale);
          }

          scene.add(model);
          URL.revokeObjectURL(blobUrl);
        },
        undefined,
        (err) => {
          console.error("GLB render parsing issue:", err);
        }
      );
    } catch (err) {
      console.error("Base64 string decode issue:", err);
    }

    // 7. Animation Loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
      }
      container.innerHTML = "";
    };
  }, [activeAdmin3dModel]);

  // Mount Three.js canvas dynamically to render standard catalog product 3D preview
  useEffect(() => {
    if (!previewProduct3D || !adminCatalogPreviewRef.current) return;

    setLoading3DPreview(true);
    let scene, camera, renderer, controls, frameId, model;
    const container = adminCatalogPreviewRef.current;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 400;

    scene = new THREE.Scene();
    scene.background = new THREE.Color("#09090b");

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.35, 2.3);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.9);
    d1.position.set(2, 4, 3);
    scene.add(d1);

    const d2 = new THREE.DirectionalLight(0xa5b4fc, 0.4);
    d2.position.set(-2, -2, -3);
    scene.add(d2);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.35, 0);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, img.width / 2, img.height, 0, 0, 256, 512);
        ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height, 256, 0, 256, 512);
        try {
          const imgData = ctx.getImageData(0, 0, 512, 512);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const diffRG = Math.abs(r - g);
            const diffGB = Math.abs(g - b);
            const diffRB = Math.abs(r - b);
            if (diffRG < 18 && diffGB < 18 && diffRB < 18 && r >= 85 && r <= 225) {
              data[i] = 255;
              data[i+1] = 255;
              data[i+2] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {}
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;

      const loader = new GLTFLoader();
      loader.load(previewProduct3D.glb_file_url, (gltf) => {
        model = gltf.scene;
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material.map = texture;
            if (node.material.color) node.material.color.set("#ffffff");
            node.material.roughness = 0.8;
            node.material.metalness = 0.1;
            node.material.needsUpdate = true;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 1.6 / maxDim;
          model.scale.set(scale, scale, scale);
        }
        scene.add(model);
        setLoading3DPreview(false);
      }, undefined, () => setLoading3DPreview(false));
    };
    img.onerror = () => setLoading3DPreview(false);
    img.src = previewProduct3D.texture_url;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight || 400;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      if (renderer) renderer.dispose();
      if (scene) scene.clear();
      container.innerHTML = "";
    };
  }, [previewProduct3D]);

  const handleExportOrdersToCSV = () => {
    try {
      if (!orders || orders.length === 0) {
        alert("No orders to export.");
        return;
      }

      // RFC 4180 compliant: wrap every cell in quotes, escape internal quotes by doubling
      const esc = (val) => {
        const str = val == null ? "" : String(val).trim();
        return `"${str.replace(/"/g, '""')}"`;
      };

      const headers = [
        "Order ID", "Order Date", "Order Time", "Status",
        "Customer Name", "Customer Email", "Customer Phone",
        "Shipping Name", "Shipping Address", "Shipping City",
        "Shipping State", "Shipping ZIP", "Shipping Phone",
        "Item Name", "Item Size", "Item Qty",
        "Item Unit Price (INR)", "Item Total (INR)",
        "Custom Name (Jersey)", "Custom Number (Jersey)",
        "Subtotal (INR)", "Discount / Coupon",
        "Total Amount (INR)", "Payment Gateway", "Payment ID",
        "Carrier", "Tracking Number",
      ];

      const rows = [headers.map(esc).join(",")];

      for (const order of orders) {
        const orderDate = order.created_at ? new Date(order.created_at) : null;
        const dateStr = orderDate
          ? orderDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "";
        const timeStr = orderDate
          ? orderDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
          : "";

        const shipping = order.shipping_details || {};
        const items = Array.isArray(order.items) && order.items.length > 0
          ? order.items
          : [{ name: "N/A", size: "", quantity: 1, price: 0 }];

        const subtotal = items.reduce(
          (s, it) => s + (parseFloat(it.price || 0) * parseInt(it.quantity || 1, 10)), 0
        );
        const total = parseFloat(order.total_amount || order.total || 0);
        const discountAmt = subtotal > total ? (subtotal - total).toFixed(2) : "0.00";
        const couponLabel = order.coupon_code
          ? `${order.coupon_code} (-INR ${discountAmt})`
          : "";

        items.forEach((item) => {
          const unitPrice = parseFloat(item.price || 0);
          const qty = parseInt(item.quantity || 1, 10);
          const itemTotal = (unitPrice * qty).toFixed(2);

          let csvAddr = "";
          let csvCity = "";
          let csvZip = "";
          if (shipping.address && typeof shipping.address === "object") {
            csvAddr = shipping.address.address || "";
            csvCity = shipping.address.city || shipping.city || "";
            csvZip = shipping.address.zip || shipping.zip || "";
          } else {
            csvAddr = [shipping.address, shipping.address2].filter(Boolean).join(", ");
            csvCity = shipping.city || "";
            csvZip = shipping.zip || shipping.pincode || "";
          }

          const row = [
            order.id || "",
            dateStr,
            timeStr,
            order.status || "processing",
            order.customer_name || "Guest",
            order.customer_email || "",
            order.customer_phone || shipping.phone || "",
            shipping.name || "",
            csvAddr,
            csvCity,
            shipping.state || "",
            csvZip,
            shipping.phone || "",
            item.name || "",
            item.size || "",
            qty,
            unitPrice.toFixed(2),
            itemTotal,
            item.customName || "",
            item.customNumber || "",
            subtotal.toFixed(2),
            couponLabel,
            total.toFixed(2),
            order.payment_gateway || "Razorpay",
            order.payment_id || order.razorpay_payment_id || "",
            order.carrier || "",
            order.tracking_number || "",
          ];
          rows.push(row.map(esc).join(","));
        });
      }

      // UTF-8 BOM so Excel opens correctly with special chars
      const BOM = "\uFEFF";
      const csvContent = BOM + rows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV Export Failed:", err);
      alert("Failed to export orders as CSV. Please try again.");
    }
  };

  // Fetch all orders from Supabase & fallback LocalStorage
  const fetchOrders = async () => {
    setLoadingOrders(true);
    let cloudOrders = [];
    
    // 1. Try to fetch orders from Supabase table
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        cloudOrders = data;
      }
    } catch (err) {
      console.warn("Could not read orders from Supabase, relying on local redundancy:", err.message);
    }

    // 2. Fetch local orders for double-layered redundancy
    let localOrders = [];
    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        localOrders = JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to read local storage backup orders:", err);
    }

    // 3. Merge them based on unique identifiers to present a complete unified dashboard!
    const mergedMap = new Map();
    localOrders.forEach(o => mergedMap.set(o.id, o));
    cloudOrders.forEach(o => mergedMap.set(o.id, o));

    const mergedList = Array.from(mergedMap.values()).map(o => {
      // Dynamic fallback mapping: if orders fetched from Supabase have separate customer/address columns
      if (!o.shipping_details && o.customer_name) {
        return {
          ...o,
          shipping_details: {
            name: o.customer_name,
            email: o.customer_email,
            phone: o.customer_phone,
            address: o.shipping_address?.address || o.shipping_address || "",
            city: o.shipping_address?.city || "",
            state: o.shipping_address?.state || "",
            zip: o.shipping_address?.zip || "",
            coupon_code: o.shipping_address?.coupon_code || null,
            payment_details: o.shipping_address?.payment_details || null
          }
        };
      }
      return o;
    }).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setOrders(mergedList);
    setLoadingOrders(false);
  };

  // Update order status, carrier, tracking details in Supabase & LocalStorage
  const handleSaveFulfillment = async (orderId, newStatus, carrier, trackingNumber) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          carrier: carrier || null,
          tracking_number: trackingNumber || null
        })
        .eq("id", orderId);

      if (error) {
        console.warn("Could not update full fulfillment on Supabase, retrying with status-only...", error.message);
        // Fallback: update ONLY the status column which is always present
        const { error: retryError } = await supabase
          .from("orders")
          .update({ 
            status: newStatus
          })
          .eq("id", orderId);

        if (retryError) {
          console.error("Complete Supabase order status update failure:", retryError.message);
        } else {
          console.log("Successfully updated order status in Supabase. Carrier & tracking synced locally.");
        }
      }
    } catch (err) {
      console.warn("Failed to reach Supabase network:", err);
    }

    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        const localList = JSON.parse(stored);
        const updated = localList.map(o => {
          if (o.id === orderId) {
            return { 
              ...o, 
              status: newStatus,
              carrier: carrier || null,
              tracking_number: trackingNumber || null
            };
          }
          return o;
        });
        localStorage.setItem("apparel_orders", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Failed to update status in LocalStorage backup:", err);
    }

    // Retrieve order details to log audit and show dynamic email preview
    const activeOrder = orders.find(o => o.id === orderId) || {};
    
    // Log Audit Log
    await addAuditLog(`Updated fulfillment for Order #${orderId}. State: ${newStatus}${carrier ? `, Carrier: ${carrier}` : ""}${trackingNumber ? `, Track #: ${trackingNumber}` : ""}.`);

    // Trigger simulated email notice to customer
    setSimulatedEmail({
      to: activeOrder.customer_email || "customer@example.com",
      customerName: activeOrder.customer_name || "Valued Customer",
      orderId: orderId,
      status: newStatus,
      carrier: carrier || "FedEx",
      trackingNumber: trackingNumber || "TRK" + Math.floor(Math.random() * 1000000000),
      items: activeOrder.items || [],
      total: activeOrder.total_amount || 0.00
    });

    fetchOrders();
    setUpdatingOrderId(null); // Close active form
  };

  // Delete/Cancel order
  const handleDeleteOrder = async (orderId) => {
    if (!confirm("Are you sure you want to delete/cancel this order?")) return;

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) {
        console.warn("Could not delete from Supabase orders table:", error.message);
      }
    } catch (err) {
      console.warn("Failed to delete from Supabase network:", err);
    }

    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        const localList = JSON.parse(stored);
        const filtered = localList.filter(o => o.id !== orderId);
        localStorage.setItem("apparel_orders", JSON.stringify(filtered));
      }
    } catch (err) {
      console.error("Failed to delete from LocalStorage backup:", err);
    }

    await addAuditLog(`Deleted/cancelled order ID #${orderId} from system ledger.`);
    fetchOrders();
  };

  // Inline Product Details Update (CRUD: Update)
  const handleSaveEditProduct = async (productId) => {
    // Ensure all mandatory technical specifications exist with defaults if missing
    const requiredSpecs = [
      { key: "Fit Profile",         val: "Relaxed Modern Boxy Fit" },
      { key: "Material",            val: "100% Organic Ring-Spun Cotton" },
      { key: "Fabric Weight",       val: "380 GSM Heavyweight" },
      { key: "Country of Assembly", val: "India" },
    ];
    
    let updatedSpecsList = [...editSpecs];
    requiredSpecs.forEach(req => {
      const index = updatedSpecsList.findIndex(s => s.key && s.key.trim().toLowerCase() === req.key.toLowerCase());
      if (index === -1) {
        // Not found, add it with default value
        updatedSpecsList.push({ key: req.key, val: req.val });
      } else if (!updatedSpecsList[index].val || !updatedSpecsList[index].val.trim()) {
        // Value is empty, fill with default
        updatedSpecsList[index].val = req.val;
      }
    });

    // Check for any user-entered spec that has a key but empty value
    const incompleteSpec = updatedSpecsList.find(s => s.key && s.key.trim() && (!s.val || !s.val.trim()));
    if (incompleteSpec) {
      setStatusMsg({ 
        type: "error", 
        text: `Technical specs error: Value cannot be empty for specification "${incompleteSpec.key}".` 
      });
      return;
    }

    setSavingEdit(true);
    const parsedPrice = parseFloat(editPrice) || 3999;
    let updateSuccess = false;

    // A. First upload any newly selected edit gallery files to Supabase!
    const newlyUploadedUrls = [];
    if (editGalleryFiles && editGalleryFiles.length > 0) {
      setStatusMsg({ type: "info", text: `Uploading ${editGalleryFiles.length} new gallery photos...` });
      for (let i = 0; i < editGalleryFiles.length; i++) {
        const file = editGalleryFiles[i];
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}_gal_edit_${i}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
        const filePath = `gallery/${fileName}`;

        try {
          const { error: uploadErr } = await supabase.storage
            .from("product-assets")
            .upload(filePath, file, { cacheControl: "3600", upsert: false });

          if (uploadErr) {
            console.error(`Edit gallery file ${i} upload failed:`, uploadErr.message);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("product-assets")
            .getPublicUrl(filePath);

          newlyUploadedUrls.push(urlData.publicUrl);
        } catch (uploadExc) {
          console.error("Gallery file upload exception:", uploadExc);
        }
      }
    }

    // B. Upload new display photo / catalog mockup if selected (only for templates)
    let updatedDisplayPhotoUrl = null;
    if (editIsTemplate && editDisplayPhotoFile) {
      try {
        setStatusMsg({ type: "info", text: "Uploading new catalog display photo..." });
        const displayExt = editDisplayPhotoFile.name.split(".").pop();
        const displayFileName = `${Date.now()}_display_edit_${Math.random().toString(36).substr(2, 9)}.${displayExt}`;
        const displayPath = `gallery/${displayFileName}`;

        const { error: displayUploadErr } = await supabase.storage
          .from("product-assets")
          .upload(displayPath, editDisplayPhotoFile, { cacheControl: "3600", upsert: false });

        if (displayUploadErr) {
          console.error("Display Photo upload failed:", displayUploadErr.message);
          setStatusMsg({ type: "error", text: `Display Photo Upload failed: ${displayUploadErr.message}` });
          setSavingEdit(false);
          return;
        }

        const { data: displayUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(displayPath);

        updatedDisplayPhotoUrl = displayUrlData.publicUrl;
      } catch (uploadExc) {
        console.error("Display photo upload exception:", uploadExc);
        setStatusMsg({ type: "error", text: `Display Photo Upload exception: ${uploadExc.message}` });
        setSavingEdit(false);
        return;
      }
    }

    // C. Upload GLB model if a new one is selected
    let updatedGlbUrl = null;
    if (editIsTemplate && editGlbFile) {
      try {
        setStatusMsg({ type: "info", text: "Uploading new 3D model GLB..." });
        const glbExt = editGlbFile.name.split(".").pop();
        const glbFileName = `${Date.now()}_glb_edit_${Math.random().toString(36).substr(2, 9)}.${glbExt}`;
        const glbPath = `models/${glbFileName}`;

        const { error: glbUploadErr } = await supabase.storage
          .from("product-assets")
          .upload(glbPath, editGlbFile, { cacheControl: "3600", upsert: false });

        if (glbUploadErr) {
          console.error("GLB upload failed:", glbUploadErr.message);
          setStatusMsg({ type: "error", text: `GLB Model Upload failed: ${glbUploadErr.message}` });
          setSavingEdit(false);
          return;
        }

        const { data: glbUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(glbPath);

        updatedGlbUrl = glbUrlData.publicUrl;
      } catch (uploadExc) {
        console.error("GLB upload exception:", uploadExc);
        setStatusMsg({ type: "error", text: `GLB Model Upload exception: ${uploadExc.message}` });
        setSavingEdit(false);
        return;
      }
    }

    // D. Upload texture file if a new one is selected
    let updatedTextureUrl = null;
    if (editTextureFile) {
      try {
        setStatusMsg({ type: "info", text: "Uploading new main photo/texture..." });
        const textureExt = editTextureFile.name.split(".").pop();
        const textureFileName = `${Date.now()}_tex_edit_${Math.random().toString(36).substr(2, 9)}.${textureExt}`;
        const texturePath = `textures/${textureFileName}`;

        const { error: textureUploadErr } = await supabase.storage
          .from("product-assets")
          .upload(texturePath, editTextureFile, { cacheControl: "3600", upsert: false });

        if (textureUploadErr) {
          console.error("Texture upload failed:", textureUploadErr.message);
          setStatusMsg({ type: "error", text: `Texture Upload failed: ${textureUploadErr.message}` });
          setSavingEdit(false);
          return;
        }

        const { data: textureUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(texturePath);

        updatedTextureUrl = textureUrlData.publicUrl;
      } catch (uploadExc) {
        console.error("Texture upload exception:", uploadExc);
        setStatusMsg({ type: "error", text: `Texture Upload exception: ${uploadExc.message}` });
        setSavingEdit(false);
        return;
      }
    }

    // E. Combine kept existing URLs with the newly uploaded URLs!
    const existingList = (editGalleryUrls || "").split(",").map(u => u.trim()).filter(Boolean);
    let combinedUrlsList = [...existingList, ...newlyUploadedUrls];
    if (editIsTemplate && updatedDisplayPhotoUrl) {
      // Prepend mockup display photo to the gallery URLs list
      combinedUrlsList = [updatedDisplayPhotoUrl, ...combinedUrlsList];
    }
    const finalGalleryUrls = combinedUrlsList.join(",");

    const finalDescription = `${editDescription || ""}\n<!--PERS:NAME=${editAllowNamePersonalization ? "true" : "false"},NUMBER=${editAllowNumberPersonalization ? "true" : "false"}-->\n<!--STOCK:STATUS=${editStockStatus}-->`;

    // First try: name, price, category, description, gallery_urls, is_template, texture_url, glb_file_url update
    const updatePayload = {
      name: editName,
      price: parsedPrice,
      category: editCategory,
      description: finalDescription,
      gallery_urls: finalGalleryUrls,
      is_template: editIsTemplate,
      allow_name: editAllowNamePersonalization,
      allow_number: editAllowNumberPersonalization,
      stock_status: editStockStatus,
      gender: editGender
    };

    let retryPayload = { ...updatePayload };
    if (updatedTextureUrl) {
      retryPayload.texture_url = updatedTextureUrl;
    }
    if (updatedGlbUrl) {
      retryPayload.glb_file_url = updatedGlbUrl;
    }

    // Attempt update, dynamically stripping out columns that fail due to missing schema cache matching (PGRST204 / 42703)
    let attempts = 0;
    while (attempts < 10) {
      try {
        const { error } = await supabase
          .from("products")
          .update(retryPayload)
          .eq("id", productId);

        if (!error) {
          updateSuccess = true;
          break;
        }

        console.warn(`Update attempt ${attempts + 1} failed:`, error.message);
        
        // Match standard PostgreSQL "column does not exist" or PostgREST schema cache mismatch errors
        let match = error.message.match(/column "?([a-zA-Z0-9_]+)"?/);
        if (!match) {
          match = error.message.match(/find the '([a-zA-Z0-9_]+)' column/);
        }

        if (match && match[1]) {
          const missingCol = match[1];
          if (missingCol in retryPayload) {
            console.warn(`Removing missing column '${missingCol}' from update payload and retrying...`);
            delete retryPayload[missingCol];
            attempts++;
            continue;
          }
        }
        
        break;
      } catch (err) {
        console.error("Update execution exception:", err);
        break;
      }
    }

    // If dynamic loop didn't succeed, fallback to standard safe columns (excluding customization flags)
    if (!updateSuccess) {
      console.warn("Dynamic column stripping failed or did not resolve. Attempting safe-column fallback...");
      const safePayload = {
        name: editName,
        price: parsedPrice,
        category: editCategory,
        description: finalDescription,
        gallery_urls: finalGalleryUrls,
        is_template: editIsTemplate,
        gender: editGender
      };
      if (updatedTextureUrl) {
        safePayload.texture_url = updatedTextureUrl;
      }
      if (updatedGlbUrl) {
        safePayload.glb_file_url = updatedGlbUrl;
      }

      try {
        const { error: fallbackError } = await supabase
          .from("products")
          .update(safePayload)
          .eq("id", productId);

        if (!fallbackError) {
          updateSuccess = true;
        } else {
          console.warn("Safe fallback failed, retrying minimal fields...", fallbackError.message);
          const { error: minimalError } = await supabase
            .from("products")
            .update({
              name: editName,
              price: parsedPrice,
              category: editIsTemplate ? "custom-template" : editCategory
            })
            .eq("id", productId);

          if (!minimalError) {
            updateSuccess = true;
          } else {
            console.warn("Minimal fallback failed, retrying name-only...", minimalError.message);
            const { error: nameOnlyError } = await supabase
              .from("products")
              .update({ name: editName })
              .eq("id", productId);

            if (!nameOnlyError) {
              updateSuccess = true;
            }
          }
        }
      } catch (err) {
        console.error("Fallback execution exception:", err);
      }
    }

    // Always update local products state & audit log to provide seamless operation
    await addAuditLog(`Updated base product details for ID #${productId.substring(0, 8)}. New Name: "${editName}", Category: "${editCategory}", Price: ₹${parsedPrice.toLocaleString('en-IN')}, Type: ${editIsTemplate ? 'Template' : 'Standard'}.`);
    
    // Save technical specs to localStorage keyed by product ID
    try {
      localStorage.setItem(`apparel_specs_${productId}`, JSON.stringify(updatedSpecsList.filter(s => s.key.trim() && s.val.trim())));
      // Save personalization preference
      // Save personalization & stock preference
      localStorage.setItem(`apparel_personalization_${productId}`, (editAllowNamePersonalization || editAllowNumberPersonalization) ? "true" : "false");
      localStorage.setItem(`apparel_pers_name_${productId}`, editAllowNamePersonalization ? "true" : "false");
      localStorage.setItem(`apparel_pers_number_${productId}`, editAllowNumberPersonalization ? "true" : "false");
      localStorage.setItem(`apparel_stock_${productId}`, editStockStatus);
      localStorage.setItem(`apparel_gender_${productId}`, editGender);
    } catch (e) { /* ignore */ }
    const updatedProductsList = products.map(p => p.id === productId ? { 
      ...p, 
      name: editName, 
      price: parsedPrice, 
      category: editCategory, 
      description: finalDescription,
      gallery_urls: finalGalleryUrls,
      is_template: editIsTemplate,
      allow_name: editAllowNamePersonalization,
      allow_number: editAllowNumberPersonalization,
      stock_status: editStockStatus,
      gender: editGender,
      ...(updatedTextureUrl ? { texture_url: updatedTextureUrl } : {}),
      ...(updatedGlbUrl ? { glb_file_url: updatedGlbUrl } : {})
    } : p);
    setProducts(updatedProductsList);
    try {
      localStorage.setItem("apparel_products_local", JSON.stringify(updatedProductsList));
    } catch (e) { /* ignore */ }
    setEditGalleryFiles([]); // Clear selected file list
    setEditTextureFile(null);
    setEditGlbFile(null);
    setEditDisplayPhotoFile(null);
    setEditingProduct(null);

    if (updateSuccess) {
      setStatusMsg({ type: "success", text: "Product details saved successfully!" });
    } else {
      setStatusMsg({ type: "warning", text: "Saved locally fallback! Please run schema.sql inside Supabase to sync new columns." });
    }
    setSavingEdit(false);
  };

  // Auth checking
  useEffect(() => {
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        router.push("/auth");
      } else {
        const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
        const adminEmails = adminEmailSetting 
          ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
          : ["admin@example.com", "admin@thread3d.com"];
        const userEmail = currentSession.user?.email?.toLowerCase();

        if (!adminEmails.includes(userEmail)) {
          alert("Access Denied: You are not authorized to view the admin panel.");
          router.push("/");
        } else {
          setSession(currentSession);
          setCheckingAuth(false);
          fetchCategories();
          fetchProducts();
          fetchOrders();
          checkDatabaseSchema();
          fetchGlobalFaqs();
          fetchStudioPricingSettings();
          fetchAnnouncement();
          fetchHomepageBanners();
          fetchPromoCards();
        }
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.push("/auth");
      } else {
        const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
        const adminEmails = adminEmailSetting 
          ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
          : ["admin@example.com", "admin@thread3d.com"];
        const userEmail = newSession.user?.email?.toLowerCase();

        if (!adminEmails.includes(userEmail)) {
          router.push("/");
        } else {
          setSession(newSession);
          setCheckingAuth(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch dynamic categories from Supabase
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok && data.categories) {
        setCatalogCategories(data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Fetch all products
  const fetchProducts = async () => {

    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      if (data) {
        localStorage.setItem("apparel_products_local", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error fetching products:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch all global Customer Q&A and pre-design FAQ questions
  const fetchGlobalFaqs = () => {
    try {
      const stored = localStorage.getItem("apparel_faqs_global");
      if (stored) {
        setGlobalFaqs(JSON.parse(stored));
      } else {
        const sampleFaqs = [
          {
            id: 1,
            productId: "t-shirt",
            productName: "Pre-designed Streetwear Jersey",
            question: "Can I customize the color overlay or upload logos on this product?",
            answer: "No, this is a ready-to-wear pre-designed catalog item. For custom decals and 3D color mapping, head to our 3D Design Studio tab.",
            isCustom: true,
            created_at: new Date(Date.now() - 3600000 * 24).toISOString()
          },
          {
            id: 2,
            productId: "hoodie",
            productName: "Premium Heavyweight Hoodie",
            question: "What specific fabric structure does this use?",
            answer: "High-density ringspun organic cotton (380 GSM). Premium double-knitted draping structure that fits flat with minimal wrinkles.",
            isCustom: true,
            created_at: new Date(Date.now() - 3600000 * 12).toISOString()
          }
        ];
        localStorage.setItem("apparel_faqs_global", JSON.stringify(sampleFaqs));
        setGlobalFaqs(sampleFaqs);
      }
    } catch (e) {
      setGlobalFaqs([]);
    }
  };

  // Answer a customer question
  const handleSaveFaqAnswer = async (faqId) => {
    if (!faqAnswerInput.trim()) return;
    
    try {
      const stored = localStorage.getItem("apparel_faqs_global");
      const globalList = stored ? JSON.parse(stored) : [];
      
      let targetFaq = null;
      const updatedGlobal = globalList.map(faq => {
        if (faq.id === faqId) {
          targetFaq = { ...faq, answer: faqAnswerInput };
          return targetFaq;
        }
        return faq;
      });
      
      localStorage.setItem("apparel_faqs_global", JSON.stringify(updatedGlobal));
      setGlobalFaqs(updatedGlobal);
      
      if (targetFaq && targetFaq.productId) {
        const prodKey = `apparel_faqs_${targetFaq.productId}`;
        const prodStored = localStorage.getItem(prodKey);
        const prodList = prodStored ? JSON.parse(prodStored) : [];
        const updatedProdList = prodList.map(faq => {
          if (faq.id === faqId || faq.question === targetFaq.question) {
            return { ...faq, answer: faqAnswerInput };
          }
          return faq;
        });
        if (!updatedProdList.some(faq => faq.id === faqId)) {
          updatedProdList.push(targetFaq);
        }
        localStorage.setItem(prodKey, JSON.stringify(updatedProdList));
      }
      
      await addAuditLog(`Answered customer Q&A question: "${targetFaq?.question?.substring(0, 40)}..." for product "${targetFaq?.productName}".`);
      setStatusMsg({ type: "success", text: "Customer question answered successfully!" });
      
      setAnsweringFaqId(null);
      setFaqAnswerInput("");
    } catch (e) {
      console.error("Failed to answer FAQ:", e);
      setStatusMsg({ type: "error", text: "Failed to submit answer." });
    }
  };

  // Delete Q&A entry
  const handleDeleteFaq = async (faqId) => {
    if (!confirm("Are you sure you want to delete this Q&A entry?")) return;
    
    try {
      const stored = localStorage.getItem("apparel_faqs_global");
      const globalList = stored ? JSON.parse(stored) : [];
      
      const targetFaq = globalList.find(faq => faq.id === faqId);
      const updatedGlobal = globalList.filter(faq => faq.id !== faqId);
      
      localStorage.setItem("apparel_faqs_global", JSON.stringify(updatedGlobal));
      setGlobalFaqs(updatedGlobal);
      
      if (targetFaq && targetFaq.productId) {
        const prodKey = `apparel_faqs_${targetFaq.productId}`;
        const prodStored = localStorage.getItem(prodKey);
        const prodList = prodStored ? JSON.parse(prodStored) : [];
        const updatedProdList = prodList.filter(faq => faq.id !== faqId && faq.question !== targetFaq.question);
        localStorage.setItem(prodKey, JSON.stringify(updatedProdList));
      }
      
      await addAuditLog(`Deleted Q&A item: "${targetFaq?.question?.substring(0, 40)}..." for product "${targetFaq?.productName}".`);
      setStatusMsg({ type: "success", text: "Q&A entry removed from system." });
    } catch (e) {
      console.error("Failed to delete FAQ:", e);
    }
  };

  // Create new FAQ for a product
  const handleCreateFaq = async (e) => {
    e.preventDefault();
    if (!newFaqProductId || !newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      setStatusMsg({ type: "error", text: "All fields are required to create a new FAQ entry." });
      return;
    }
    
    try {
      const selectedProduct = products.find(p => p.id === newFaqProductId);
      const faqId = Date.now();
      const newFaq = {
        id: faqId,
        productId: newFaqProductId,
        productName: selectedProduct?.name || "Ready-made Garment",
        question: newFaqQuestion,
        answer: newFaqAnswer,
        isCustom: true,
        created_at: new Date().toISOString()
      };
      
      const storedGlobal = localStorage.getItem("apparel_faqs_global");
      const globalList = storedGlobal ? JSON.parse(storedGlobal) : [];
      const updatedGlobal = [newFaq, ...globalList];
      localStorage.setItem("apparel_faqs_global", JSON.stringify(updatedGlobal));
      setGlobalFaqs(updatedGlobal);
      
      const prodKey = `apparel_faqs_${newFaqProductId}`;
      const storedProd = localStorage.getItem(prodKey);
      const prodList = storedProd ? JSON.parse(storedProd) : [];
      const updatedProdList = [newFaq, ...prodList];
      localStorage.setItem(prodKey, JSON.stringify(updatedProdList));
      
      await addAuditLog(`Created new FAQ: "${newFaqQuestion.substring(0, 40)}..." for product "${selectedProduct?.name}".`);
      setStatusMsg({ type: "success", text: "New FAQ created and assigned successfully!" });
      
      setNewFaqQuestion("");
      setNewFaqAnswer("");
    } catch (e) {
      console.error("Failed to create FAQ:", e);
      setStatusMsg({ type: "error", text: "Failed to create FAQ." });
    }
  };

  // Handle GLB Upload
  const handleGlbChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".glb")) {
        setStatusMsg({ type: "error", text: "Please upload a valid .glb file for the 3D model." });
        setGlbFile(null);
        return;
      }
      setGlbFile(file);
    }
  };

  // Handle Texture Upload
  const handleTextureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setStatusMsg({ type: "error", text: "Please upload a valid image file for the texture." });
        setTextureFile(null);
        return;
      }
      setTextureFile(file);
    }
  };

  // Handle Gallery Uploads
  const handleGalleryChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const invalidFile = files.find(file => !file.type.startsWith("image/"));
      if (invalidFile) {
        setStatusMsg({ type: "error", text: "Please upload valid image files for the gallery." });
        return;
      }
      setGalleryFiles(files);
    }
  };

  // Submit Product Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check validation based on Template (Requires GLB upload) vs Ready-made Catalog Product
    if (isTemplate) {
      if (!name || !glbFile || !textureFile || !displayPhotoFile) {
        setStatusMsg({ type: "error", text: "All fields (Name, GLB Model, Texture Map, and Display Image) are required for templates." });
        return;
      }
    } else {
      if (!name || !textureFile) {
        setStatusMsg({ type: "error", text: "Name and Main Display Photo are required for standard catalog products." });
        return;
      }
    }

    setUploading(true);
    setStatusMsg({ type: "info", text: "Starting file uploads..." });

    try {
      let glbPublicUrl = null;

      if (isTemplate) {
        // 1. Upload GLB model (Only for 3D Configurator templates!)
        const glbExt = glbFile.name.split(".").pop();
        const glbFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${glbExt}`;
        const glbPath = `models/${glbFileName}`;

        setStatusMsg({ type: "info", text: "Uploading 3D model to cloud storage..." });
        const { error: glbUploadErr } = await supabase.storage
          .from("product-assets")
          .upload(glbPath, glbFile, { cacheControl: "3600", upsert: false });

        if (glbUploadErr) throw new Error(`GLB Upload failed: ${glbUploadErr.message}`);

        const { data: glbUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(glbPath);
        
        glbPublicUrl = glbUrlData.publicUrl;
      } else {
        // Standard ready-made catalog products do not have 3D models (purely 2D)
        glbPublicUrl = null;
      }

      // 2. Upload Texture image
      const textureExt = textureFile.name.split(".").pop();
      const textureFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${textureExt}`;
      const texturePath = `textures/${textureFileName}`;

      setStatusMsg({ type: "info", text: "Uploading texture to cloud storage..." });
      const { error: textureUploadErr } = await supabase.storage
        .from("product-assets")
        .upload(texturePath, textureFile, { cacheControl: "3600", upsert: false });

      if (textureUploadErr) throw new Error(`Texture Upload failed: ${textureUploadErr.message}`);

      const { data: textureUrlData } = supabase.storage
        .from("product-assets")
        .getPublicUrl(texturePath);

      const texturePublicUrl = textureUrlData.publicUrl;

      // 2a. Upload Catalog Display Photo (Only for 3D Configurator templates!)
      let displayPhotoPublicUrl = null;
      if (isTemplate && displayPhotoFile) {
        setStatusMsg({ type: "info", text: "Uploading catalog display photo..." });
        const displayExt = displayPhotoFile.name.split(".").pop();
        const displayFileName = `${Date.now()}_display_${Math.random().toString(36).substr(2, 9)}.${displayExt}`;
        const displayPath = `gallery/${displayFileName}`;

        const { error: displayUploadErr } = await supabase.storage
          .from("product-assets")
          .upload(displayPath, displayPhotoFile, { cacheControl: "3600", upsert: false });

        if (displayUploadErr) throw new Error(`Display Photo Upload failed: ${displayUploadErr.message}`);

        const { data: displayUrlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(displayPath);

        displayPhotoPublicUrl = displayUrlData.publicUrl;
      }

      // 2b. Upload Gallery images (if any)
      const uploadedGalleryUrls = [];
      if (galleryFiles && galleryFiles.length > 0) {
        setStatusMsg({ type: "info", text: `Uploading ${galleryFiles.length} gallery images...` });
        for (let i = 0; i < galleryFiles.length; i++) {
          const file = galleryFiles[i];
          const ext = file.name.split(".").pop();
          const fileName = `${Date.now()}_gal_${i}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
          const filePath = `gallery/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("product-assets")
            .upload(filePath, file, { cacheControl: "3600", upsert: false });

          if (uploadErr) {
            console.error(`Gallery file ${i} upload failed:`, uploadErr.message);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("product-assets")
            .getPublicUrl(filePath);

          uploadedGalleryUrls.push(urlData.publicUrl);
        }
      }

      const allGalleryUrls = [];
      if (displayPhotoPublicUrl) {
        allGalleryUrls.push(displayPhotoPublicUrl);
      }
      uploadedGalleryUrls.forEach(url => allGalleryUrls.push(url));
      const galleryUrlsString = allGalleryUrls.join(",");

      const finalDescription = `${description || ""}\n<!--PERS:NAME=${allowNamePersonalization ? "true" : "false"},NUMBER=${allowNumberPersonalization ? "true" : "false"}-->\n<!--STOCK:STATUS=${stockStatus}-->`;

      // 3. Save DB Row
      setStatusMsg({ type: "info", text: "Registering product in database..." });
      const parsedPrice = parseFloat(price) || 3999;
      
      // NOTE: glb_file_url uses "" (empty string) instead of null to satisfy the
      // Supabase NOT NULL constraint on that column for standard catalog products.
      const insertData = {
        name,
        glb_file_url: glbPublicUrl || "",
        texture_url: texturePublicUrl,
        price: parsedPrice,
        category: category,
        description: finalDescription,
        gallery_urls: galleryUrlsString,
        is_template: isTemplate,
        allow_name: allowNamePersonalization,
        allow_number: allowNumberPersonalization,
        stock_status: stockStatus,
        gender: gender
      };

      if (customProductId.trim()) {
        insertData.id = customProductId.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
      }

      let dbErr = null;
      let newProductId = null;
      try {
        const { data, error } = await supabase
          .from("products")
          .insert([insertData])
          .select();
        dbErr = error;
        if (data && data.length > 0) newProductId = data[0].id;
      } catch (err) {
        dbErr = err;
      }

      if (dbErr) {
        console.warn("Complete columns insert failed, retrying standard columns...", dbErr.message || dbErr);
        // Fallback retry — also use "" not null for glb_file_url
        const fallbackData = {
          name,
          glb_file_url: glbPublicUrl || "",
          texture_url: texturePublicUrl,
          price: parsedPrice,
          category: isTemplate ? "custom-template" : category
        };
        const { data: retryData, error: retryErr } = await supabase
          .from("products")
          .insert([fallbackData])
          .select();
        if (retryErr) throw retryErr;
        if (retryData && retryData.length > 0) newProductId = retryData[0].id;
      }

      // Log Security Audit Log!
      await addAuditLog(`Uploaded and registered new product "${name}" (Type: ${isTemplate ? 'Template' : 'Standard'}) with pricing: ₹${parsedPrice.toLocaleString('en-IN')}.`);

      // Save Personalization & Stock settings
      if (newProductId) {
        try {
          localStorage.setItem(`apparel_personalization_${newProductId}`, (allowNamePersonalization || allowNumberPersonalization) ? "true" : "false");
          localStorage.setItem(`apparel_pers_name_${newProductId}`, allowNamePersonalization ? "true" : "false");
          localStorage.setItem(`apparel_pers_number_${newProductId}`, allowNumberPersonalization ? "true" : "false");
          localStorage.setItem(`apparel_stock_${newProductId}`, stockStatus);
        } catch (e) { /* ignore */ }
      }
      if (newProductId) {
        try {
          localStorage.setItem(`apparel_gender_${newProductId}`, gender);
        } catch (e) { /* ignore */ }
      }

      setStatusMsg({ type: "success", text: "Product uploaded and created successfully!" });
      setName("");
      setPrice("3999");
      setGlbFile(null);
      setTextureFile(null);
      setDisplayPhotoFile(null);
      setDescription("");
      setGalleryFiles([]);
      setIsTemplate(false);
      setAllowPersonalization(false);
      setAllowNamePersonalization(false);
      setAllowNumberPersonalization(false);
      setSelectedBaseTemplateId("");
      setCustomProductId("");
      
      // Reset file input elements manually safely
      const glbInput = document.getElementById("glb-input");
      if (glbInput) glbInput.value = "";
      
      const textureInput = document.getElementById("texture-input");
      if (textureInput) textureInput.value = "";
      
      const displayPhotoInput = document.getElementById("display-photo-input");
      if (displayPhotoInput) displayPhotoInput.value = "";
      
      const galleryInput = document.getElementById("gallery-input");
      if (galleryInput) galleryInput.value = "";

      // Refresh product list
      fetchProducts();
      setCatalogSubView("inventory");

    } catch (err) {
      console.error("Full Error Object:", err);
      console.error("Error Message:", err.message);
      console.error("Error Details:", err.details);
      console.error("Error Hint:", err.hint);
      console.error("Error Code:", err.code);

      if (err.code === "23505" || (err.message && err.message.includes("duplicate key"))) {
        setStatusMsg({ type: "error", text: `Product ID "${customProductId}" already exists in catalog. Please choose a different, unique ID.` });
        setUploading(false);
        return;
      }

      // Supabase database / storage timeout offline fallback!
      try {
        setStatusMsg({ type: "info", text: "Database connection timed out. Activating local storage redundancy fallback..." });

        const readFileAsBase64 = (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
        };

        let localTextureUrl = "";
        try {
          localTextureUrl = await readFileAsBase64(textureFile);
        } catch (readErr) {
          localTextureUrl = URL.createObjectURL(textureFile);
        }

        let localGlbUrl = "";
        if (glbFile) {
          try {
            localGlbUrl = await readFileAsBase64(glbFile);
          } catch (readErr) {
            localGlbUrl = URL.createObjectURL(glbFile);
          }
        }

        const localGalleryList = [];
        if (isTemplate && displayPhotoFile) {
          try {
            const b64 = await readFileAsBase64(displayPhotoFile);
            localGalleryList.push(b64);
          } catch (readErr) {
            localGalleryList.push(URL.createObjectURL(displayPhotoFile));
          }
        }
        if (galleryFiles && galleryFiles.length > 0) {
          for (let i = 0; i < galleryFiles.length; i++) {
            try {
              const b64 = await readFileAsBase64(galleryFiles[i]);
              localGalleryList.push(b64);
            } catch (readErr) {
              localGalleryList.push(URL.createObjectURL(galleryFiles[i]));
            }
          }
        }

        const fallbackId = customProductId.trim()
          ? customProductId.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-")
          : `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const parsedPrice = parseFloat(price) || 3999;
        
        const finalDescription = `${description || ""}\n<!--PERS:NAME=${allowNamePersonalization ? "true" : "false"},NUMBER=${allowNumberPersonalization ? "true" : "false"}-->\n<!--STOCK:STATUS=${stockStatus}-->`;

        const localProduct = {
          id: fallbackId,
          name,
          glb_file_url: localGlbUrl,
          texture_url: localTextureUrl,
          price: parsedPrice,
          category: category,
          description: finalDescription,
          gallery_urls: localGalleryList.join(","),
          is_template: isTemplate,
          allow_name: allowNamePersonalization,
          allow_number: allowNumberPersonalization,
          stock_status: stockStatus,
          created_at: new Date().toISOString()
        };

        const updatedLocalProducts = [localProduct, ...products];
        setProducts(updatedLocalProducts);
        localStorage.setItem("apparel_products_local", JSON.stringify(updatedLocalProducts));

        // Save local personalization & stock settings
        try {
          localStorage.setItem(`apparel_personalization_${fallbackId}`, (allowNamePersonalization || allowNumberPersonalization) ? "true" : "false");
          localStorage.setItem(`apparel_pers_name_${fallbackId}`, allowNamePersonalization ? "true" : "false");
          localStorage.setItem(`apparel_pers_number_${fallbackId}`, allowNumberPersonalization ? "true" : "false");
          localStorage.setItem(`apparel_stock_${fallbackId}`, stockStatus);
        } catch (e) { /* ignore */ }

        setStatusMsg({ 
          type: "success", 
          text: "Database connection timed out! Product saved successfully to your offline catalog fallback. It is fully active in the storefront!" 
        });

        // Reset form inputs
        setName("");
        setPrice("3999");
        setGlbFile(null);
        setTextureFile(null);
        setDisplayPhotoFile(null);
        setDescription("");
        setGalleryFiles([]);
        setIsTemplate(false);
        setAllowPersonalization(false);
        setAllowNamePersonalization(false);
        setAllowNumberPersonalization(false);
        setStockStatus("in_stock");
        setSelectedBaseTemplateId("");
        setCustomProductId("");
        
        const glbInput = document.getElementById("glb-input");
        if (glbInput) glbInput.value = "";
        
        const textureInput = document.getElementById("texture-input");
        if (textureInput) textureInput.value = "";
        
        const displayPhotoInput = document.getElementById("display-photo-input");
        if (displayPhotoInput) displayPhotoInput.value = "";
        
        const galleryInput = document.getElementById("gallery-input");
        if (galleryInput) galleryInput.value = "";

        await addAuditLog(`Registered new product "${name}" (Type: ${isTemplate ? 'Template' : 'Standard'}) locally due to Supabase connection timeout fallback.`);
        setCatalogSubView("inventory");
        return; // End execution successfully
      } catch (fallbackErr) {
        console.error("Local fallback registration failed:", fallbackErr);
      }

      const errorMessage = err.message 
        ? `${err.message} ${err.details ? `Details: ${err.details}` : ''} ${err.hint ? `Hint: ${err.hint}` : ''}`
        : "Something went wrong during submission.";

      setStatusMsg({ 
        type: "error", 
        text: errorMessage 
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id, glbUrl, textureUrl) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    // Get details for the log before deletion
    const deletedProduct = products.find(p => p.id === id);

    try {
      // Parse file paths out of Supabase URLs to delete from storage as well (optional but good practice)
      // e.g. https://.../storage/v1/object/public/product-assets/models/file.glb
      const getStoragePath = (url) => {
        if (!url) return null;
        const parts = url.split("/product-assets/");
        return parts.length > 1 ? parts[1] : null;
      };

      const glbPath = getStoragePath(glbUrl);
      const texturePath = getStoragePath(textureUrl);

      if (glbPath) {
        await supabase.storage.from("product-assets").remove([glbPath]);
      }
      if (texturePath) {
        await supabase.storage.from("product-assets").remove([texturePath]);
      }

      // Delete database row
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Log Security Audit Trail
      await addAuditLog(`Deleted base product "${deletedProduct?.name || id}" (ID: #${id.substring(0, 8)}) from system database and cloud storage.`);

      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err.message);
      alert(`Failed to delete product: ${err.message}`);
    }
  };

  const handleCreateCategory = async (label) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setCategoryError("Please enter a category name.");
      return;
    }
    const id = cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (catalogCategories.some(c => c.id === id)) {
      setCategoryError(`"${cleanLabel}" already exists.`);
      return;
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token || "";
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ id, label: cleanLabel })
      });
      const data = await res.json();
      if (res.ok) {
        fetchCategories();
        setNewCategoryLabel("");
        setCategoryError("");
        addAuditLog(`Added new category "${cleanLabel}" (${id}) to catalog.`);
      } else {
        setCategoryError(data.error || "Failed to add category.");
      }
    } catch (err) {
      setCategoryError("Error connecting to server to add category.");
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`Delete the "${cat.label}" category? Products in this category will remain but won't filter here.`)) return;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token || "";
      const res = await fetch(`/api/categories?id=${cat.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        fetchCategories();
        setCategoryError("");
        addAuditLog(`Removed category "${cat.label}" (${cat.id}) from catalog.`);
      } else {
        setCategoryError(data.error || "Failed to delete category.");
      }
    } catch (err) {
      setCategoryError("Error connecting to server to delete category.");
    }
  };

  const handleSaveCategory = async (catData) => {
    setSavingCategory(true);
    try {
      let finalImageUrl = catData.image_url;

      // Handle Category Image Upload if a file has been selected
      if (categoryImageFile) {
        const fileExt = categoryImageFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `categories/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("product-assets")
          .upload(filePath, categoryImageFile, { cacheControl: "3600", upsert: false });

        if (uploadErr) throw new Error(`Category Image Upload failed: ${uploadErr.message}`);

        const { data: urlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(filePath);

        finalImageUrl = urlData.publicUrl;
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token || "";
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id: catData.id,
          label: catData.label,
          image_url: finalImageUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        fetchCategories();
        setEditingCategory(null);
        setCategoryImageFile(null);
        addAuditLog(`Updated category details for "${catData.label}" (${catData.id}).`);
        alert("✓ Category updated successfully!");
      } else {
        alert("❌ Error updating category: " + data.error);
      }
    } catch (err) {
      alert("❌ Error saving category: " + err.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-zinc-400">Verifying administrator credentials...</p>
      </div>
    );
  }

  // Calculate dynamic stats
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount || o.total) || 0), 0);
  const totalFulfilled = orders.filter(o => o.status === "shipped" || o.status === "delivered").length;
  const fulfillmentRate = orders.length > 0 ? Math.round((totalFulfilled / orders.length) * 100) : 0;

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer_name || "").toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order.customer_email || "").toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order.id || "").toLowerCase().includes(orderSearchQuery.toLowerCase());
    
    const matchesStatus = orderStatusFilter === "all" || (order.status || "").toLowerCase() === orderStatusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    // 1. Text keyword search
    const matchesSearch = 
      (log.operator || "").toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(logSearchQuery.toLowerCase());
    
    // 2. Action Category Filter
    let matchesCategory = true;
    if (logActionFilter !== "all") {
      const actionLower = (log.action || "").toLowerCase();
      if (logActionFilter === "catalog") {
        matchesCategory = actionLower.includes("catalog") || actionLower.includes("template") || actionLower.includes("product");
      } else if (logActionFilter === "orders") {
        matchesCategory = actionLower.includes("order") || actionLower.includes("fulfillment") || actionLower.includes("status");
      } else if (logActionFilter === "access") {
        matchesCategory = actionLower.includes("login") || actionLower.includes("session") || actionLower.includes("credential") || actionLower.includes("auth");
      }
    }

    // 3. Date filters
    let matchesDate = true;
    const logDate = new Date(log.created_at);
    if (logStartDate) {
      const start = new Date(logStartDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && logDate >= start;
    }
    if (logEndDate) {
      const end = new Date(logEndDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && logDate <= end;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Filter inventory products
  const filteredInventoryProducts = products.filter(p => {
    const isTemp = isTemplateProduct(p);
    const matchesSubTab = adminInventorySubTab === "template" ? isTemp : !isTemp;
    if (!matchesSubTab) return false;

    if (!inventorySearchQuery.trim()) return true;
    const query = inventorySearchQuery.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(query) ||
      (p.category || "").toLowerCase().includes(query) ||
      (p.id || "").toLowerCase().includes(query) ||
      (p.description || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      
      {/* Header Bar (Shared Navbar) */}
      <Navbar>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            <span>Admin Dashboard</span>
          </div>

          {dbMismatches.length > 0 && (
            <button
              onClick={() => setShowDiagnosticsModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-550 border border-amber-500/25 text-amber-450 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer animate-pulse"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Warnings ({dbMismatches.length})</span>
            </button>
          )}
        </div>
      </Navbar>

      {/* Diagnostics Warning popover modal dialog */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl max-w-xl w-full p-6 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowDiagnosticsModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-3.5 items-start">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-2 text-left">
                <h4 className="text-sm font-extrabold text-amber-400 tracking-wide uppercase">
                  Supabase Database Schema Diagnostics
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  Your cloud Supabase database tables are missing some schema elements required for live data synchronization:
                </p>
                <ul className="list-disc list-inside text-sm text-zinc-400 font-mono space-y-1 py-1">
                  {dbMismatches.map((m, idx) => (
                    <li key={idx} className="text-amber-300/85">{m}</li>
                  ))}
                </ul>
                <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 mt-3 space-y-2.5">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    💡 <strong>To Connect Fully:</strong> Copy the contents of the generated <code className="bg-zinc-900 text-indigo-400 px-1.5 py-0.5 rounded font-bold font-mono">schema.sql</code> script, paste it in your <strong>Supabase SQL Editor</strong>, and click <strong>Run</strong>.
                  </p>
                  <p className="text-sm text-emerald-450 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Interactive LocalStorage Offline-Redundancy is currently handling operations.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        
        {/* Intro */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            {activeTab === "catalog" 
              ? "Apparel Inventory Manager" 
              : activeTab === "orders" 
              ? "Customer Order Ledger" 
              : "System Security Audit Logs"}
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            {activeTab === "catalog" 
              ? "Upload and deploy 3D models and base textures directly into your studio engine." 
              : activeTab === "orders"
              ? "Track customized apparel transactions, print layouts, and shipping fulfillment statuses live."
              : "Review real-time security logs, operator updates, product modifications, and shipment dispatches."}
          </p>
        </div>

        {/* Executive Stats Dashboard Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Revenue Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Total Sales</span>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-zinc-500 mt-1 select-none">Gross sales generated online</p>
          </div>

          {/* Orders Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Orders</span>
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {orders.length}
            </div>
            <p className="text-xs text-zinc-500 mt-1 select-none">Total customer transactions</p>
          </div>

          {/* Catalog Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Inventory</span>
              <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {products.length}
            </div>
            <p className="text-xs text-zinc-500 mt-1 select-none">Products in catalog</p>
          </div>

          {/* Fulfillment Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Fulfillment</span>
              <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {fulfillmentRate}%
            </div>
            <p className="text-xs text-zinc-500 mt-1 select-none">Garments dispatched/delivered</p>
          </div>
        </div>

        {/* Tab Selector */}
        <section className="mb-8 border-b border-zinc-900 pb-px flex gap-6">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === "catalog"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Inventory Catalog
          </button>
          <button
            onClick={() => {
              setActiveTab("orders-analytics");
              fetchOrders();
              setOrdersSubTab("orders");
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders-analytics"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Orders &amp; Analytics</span>
            {orders.length > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("logs");
              fetchAuditLogs();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Security Audit Logs</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("payment-settings");
              fetchPaymentSettings();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "payment-settings"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Payment Settings</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("coupons");
              fetchCoupons();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "coupons"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Coupons Manager</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("studio-pricing");
              fetchStudioPricingSettings();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "studio-pricing"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Studio Pricing</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("storefront");
              fetchHomepageBanners();
              fetchPromoCards();
              fetchAnnouncement();
              setStorefrontSubTab("banners");
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "storefront"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Storefront Settings</span>
          </button>
        </section>

        {activeTab === "catalog" ? (
          <div className="space-y-6">
            
            {/* Catalog Sub-tabs */}
            <div className="bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-1.5 flex gap-2 w-full max-w-md">
              <button
                onClick={() => setCatalogSubView("inventory")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  catalogSubView === "inventory"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Active Inventory List
              </button>
              <button
                onClick={() => setCatalogSubView("add-product")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  catalogSubView === "add-product"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Add Catalog Product
              </button>
            </div>

            {catalogSubView === "inventory" ? (
              /* ACTIVE INVENTORY VIEW */
              <div className="space-y-6">
                  {/* ─── Category Manager ─── */}
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Manage Categories</h3>
                          <p className="text-sm text-zinc-500 mt-0.5">Add or remove catalog filter tabs. Changes appear immediately in the shop.</p>
                        </div>
                      </div>
                      <span className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {catalogCategories.length} categories
                      </span>
                    </div>

                    {/* Current categories chip list */}
                    <div className="flex flex-wrap gap-2.5 mb-4">
                      {catalogCategories.map((cat) => {
                        const isDefault = DEFAULT_CATEGORIES.some(d => d.id === cat.id);
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-3 py-1.5 text-xs font-semibold text-zinc-300 group"
                          >
                            {/* Circle Thumbnail */}
                            <div className="w-5 h-5 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 select-none">
                              <img src={cat.image_url || "/cat_tees.png"} alt={cat.label} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/cat_tees.png"; }} />
                            </div>

                            <span className="text-[10px] font-mono text-zinc-600">{cat.id}</span>
                            <span>{cat.label}</span>

                            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-900">
                              {/* Edit Button */}
                              <button
                                onClick={() => setEditingCategory({ id: cat.id, label: cat.label, image_url: cat.image_url || "" })}
                                className="p-0.5 rounded text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                title={`Edit ${cat.label}`}
                              >
                                <Edit className="w-3 h-3" />
                              </button>

                              {/* Delete Button */}
                              {!isDefault && (
                                <button
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="p-0.5 rounded text-zinc-600 hover:text-rose-450 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title={`Delete ${cat.label}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Category Edit Modal Dialog */}
                    {editingCategory && (
                      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-800">
                            <div>
                              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Edit Category Details</h3>
                              <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{editingCategory.id}</p>
                            </div>
                            <button
                              onClick={() => { setEditingCategory(null); setCategoryImageFile(null); }}
                              className="p-1 rounded-full text-zinc-550 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(editingCategory); }} className="p-6 space-y-5">
                            {/* Category Label Input */}
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-550 mb-1.5">Category Label Name</label>
                              <input
                                type="text"
                                required
                                value={editingCategory.label}
                                onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                                placeholder="e.g. Hoodies, Tees, Jeans..."
                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none transition-colors"
                              />
                            </div>

                            {/* Image Preview & Custom Image Upload */}
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-550 mb-2">Category Image Backdrop</label>

                              <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3">
                                {/* Circular Preview */}
                                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                                  <img
                                    src={categoryImageFile ? URL.createObjectURL(categoryImageFile) : (editingCategory.image_url || "/cat_tees.png")}
                                    alt="Category Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = "/cat_tees.png"; }}
                                  />
                                </div>

                                {/* Uploader Input */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCategoryImageFile(e.target.files[0] || null)}
                                    className="hidden"
                                    id="category-image-upload"
                                  />
                                  <label
                                    htmlFor="category-image-upload"
                                    className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>{categoryImageFile ? "Change Image" : "Upload File"}</span>
                                  </label>
                                  <p className="text-[9px] text-zinc-550 truncate font-mono">
                                    {categoryImageFile ? categoryImageFile.name : (editingCategory.image_url ? "Current: " + editingCategory.image_url.split("/").pop() : "No custom backdrop uploaded")}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/60">
                              <button
                                type="button"
                                onClick={() => { setEditingCategory(null); setCategoryImageFile(null); }}
                                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={savingCategory}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                              >
                                {savingCategory ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></>) : (<span>Save Changes</span>)}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Add new category row */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={newCategoryLabel}
                          onChange={(e) => { setNewCategoryLabel(e.target.value); setCategoryError(""); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateCategory(newCategoryLabel);
                            }
                          }}
                          placeholder="e.g. Cargo Pants, Shorts, Kurtas..."
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                        />
                        {categoryError && (
                          <p className="text-sm text-rose-400 font-medium">{categoryError}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCreateCategory(newCategoryLabel)}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0 self-start"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                      New categories appear instantly in the shop filter bar and the product upload dropdown. Default categories (T-Shirts, Hoodies, Jackets, Activewears) cannot be deleted.
                    </p>
                  </div>

                {/* Active Inventory List */}
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
                            <Package className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-semibold">Active Inventory</h3>
                        </div>
                      </div>
                      
                      {/* Inventory Sub-Tabs */}
                      <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-1 flex">
                        <button
                          onClick={() => setAdminInventorySubTab("standard")}
                          className={`flex-1 text-center py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                            adminInventorySubTab === "standard"
                              ? "bg-indigo-600 text-white shadow"
                              : "text-zinc-500 hover:text-zinc-350"
                          }`}
                        >
                          Standard Catalog Products
                        </button>
                        <button
                          onClick={() => setAdminInventorySubTab("template")}
                          className={`flex-1 text-center py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                            adminInventorySubTab === "template"
                              ? "bg-indigo-600 text-white shadow"
                              : "text-zinc-500 hover:text-zinc-355"
                          }`}
                        >
                          3D Customizer Templates
                        </button>
                      </div>

                      {/* Inventory Search Box */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search inventory by name, category, or ID..."
                          value={inventorySearchQuery}
                          onChange={(e) => setInventorySearchQuery(e.target.value)}
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        {inventorySearchQuery && (
                          <button
                            onClick={() => setInventorySearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-350 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {loadingProducts ? (
                      <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
                        <p className="text-xs">Loading items from database...</p>
                      </div>
                    ) : filteredInventoryProducts.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-lg bg-zinc-950/20 select-none">
                        <Package className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                        <p className="text-xs text-zinc-500 font-semibold">
                          {inventorySearchQuery.trim()
                            ? "No matching products found."
                            : `No ${adminInventorySubTab === "template" ? "customizer templates" : "catalog items"} found here.`}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredInventoryProducts.map((product) => (
                          <div 
                            key={product.id}
                            className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all flex flex-col justify-between group"
                          >
                              {/* Thumbnail or placeholder */}
                              <div className="w-full aspect-[4/3] bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative mb-3.5 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                                <img 
                                  src={getDisplayImage(product)} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent flex items-end p-2.5">
                                  <span className="text-sm bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono tracking-tighter truncate max-w-full">
                                    {(product.glb_file_url || "").split("/").pop().substring(0, 20)}...
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm text-white group-hover:text-indigo-400 transition-colors truncate">
                                  {product.name}
                                </h4>
                                <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                  ₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-500 mt-1 flex items-center justify-between select-none">
                                <span>ID: <span className="font-mono text-zinc-600">{product.id.substring(0, 8)}...</span></span>
                                <span className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  {product.category || (product.name.toLowerCase().includes("hoodie") ? "hoodie" : product.name.toLowerCase().includes("jacket") ? "jacket" : product.name.toLowerCase().includes("activewear") ? "activewear" : "t-shirt")}
                                </span>
                              </p>

                              <div className="flex items-center justify-between border-t border-zinc-800/60 mt-4 pt-3">
                              <span className="text-sm text-zinc-500">
                                {new Date(product.created_at).toLocaleDateString()}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product.id);
                                    setEditName(product.name);
                                    setEditPrice(product.price ? String(product.price) : "3999");
                                    setEditCategory(product.category || "t-shirt");
                                    
                                    // Parse description personalization settings
                                    const parsedPers = parseDescriptionPersonalization(product.description || "");
                                    setEditDescription(parsedPers.cleanDescription);
                                    
                                    const dbAllowName = product.allow_name !== undefined && product.allow_name !== null ? product.allow_name : null;
                                    const dbAllowNumber = product.allow_number !== undefined && product.allow_number !== null ? product.allow_number : null;
                                    const dbStockStatus = product.stock_status || null;

                                    setEditAllowNamePersonalization(dbAllowName !== null ? dbAllowName : parsedPers.allowName);
                                    setEditAllowNumberPersonalization(dbAllowNumber !== null ? dbAllowNumber : parsedPers.allowNumber);
                                    setEditStockStatus(dbStockStatus !== null ? dbStockStatus : (parsedPers.stockStatus || "in_stock"));
                                    
                                    setEditGalleryUrls(product.gallery_urls || "");
                                    setEditIsTemplate(isTemplateProduct(product));
                                    const dbGender = product.gender || null;
                                    setEditGender(dbGender !== null ? dbGender : (localStorage.getItem(`apparel_gender_${product.id}`) || "unisex"));
                                    setEditTextureFile(null);
                                    setEditGlbFile(null);
                                    setEditDisplayPhotoFile(null);
                                    setNewSpecKey("");
                                    setNewSpecVal("");
                                    // Load saved specs for this product
                                    try {
                                      const raw = localStorage.getItem(`apparel_specs_${product.id}`);
                                      if (raw) {
                                        const parsed = JSON.parse(raw);
                                        setEditSpecs(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRODUCT_SPECS);
                                      } else {
                                        setEditSpecs(DEFAULT_PRODUCT_SPECS);
                                      }
                                      // Load personalization setting from localStorage too as a fallback, but trust db columns / parsedPers first
                                      const rawPersName = localStorage.getItem(`apparel_pers_name_${product.id}`);
                                      const rawPersNumber = localStorage.getItem(`apparel_pers_number_${product.id}`);
                                      const rawStock = localStorage.getItem(`apparel_stock_${product.id}`) || "in_stock";
                                      if ((product.description && product.description.includes("<!--PERS:")) || dbAllowName !== null || dbAllowNumber !== null) {
                                        // already loaded
                                      } else {
                                        if (rawPersName) setEditAllowNamePersonalization(rawPersName === "true");
                                        if (rawPersNumber) setEditAllowNumberPersonalization(rawPersNumber === "true");
                                      }
                                      if ((product.description && product.description.includes("<!--STOCK:")) || dbStockStatus !== null) {
                                        // already loaded
                                      } else {
                                        setEditStockStatus(rawStock);
                                      }
                                    } catch { 
                                      setEditSpecs(DEFAULT_PRODUCT_SPECS); 
                                    }
                                  }}
                                  className="p-1.5 bg-zinc-950 hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
                                  title="Edit product"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteProduct(product.id, product.glb_file_url, product.texture_url)}
                                  className="p-1.5 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                                  title="Delete product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {product.glb_file_url && (
                                  <button
                                    onClick={() => setPreviewProduct3D(product)}
                                    className="p-1.5 bg-zinc-950 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 text-zinc-500 hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
                                    title="Preview in 3D"
                                  >
                                    <Box className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <Link
                                  href={`/product/${product.id}`}
                                  className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-md transition-colors flex items-center justify-center"
                                  title="View product page"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pop-up Edit Product Modal overlay */}
                    {editingProduct !== null && (
                      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-left">
                          {/* Close button */}
                          <button 
                            onClick={() => setEditingProduct(null)} 
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                            title="Close modal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          
                          <div className="space-y-5">
                            <div className="border-b border-zinc-800 pb-3 flex items-center gap-2">
                              <Sliders className="w-5 h-5 text-indigo-500" />
                              <h3 className="text-base font-black text-white uppercase tracking-wider">Edit Product Details</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Product Name */}
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">Product Name</label>
                                <input 
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                                />
                              </div>
                              
                              {/* Base Price */}
                              <div>
                                <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">Base Price (₹ INR)</label>
                                <input 
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                                />
                              </div>

                              {/* Category */}
                              <div>
                                <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">Category</label>
                                <select 
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                                >
                                  {catalogCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Product Type */}
                              <div>
                                <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">Product Type</label>
                                <select 
                                  value={editIsTemplate ? "template" : "standard"}
                                  onChange={(e) => setEditIsTemplate(e.target.value === "template")}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                                >
                                  <option value="standard">Standard Catalog Product</option>
                                  <option value="template">3D Customizer Template</option>
                                </select>
                              </div>

                              {/* Stock Availability */}
                              {!editIsTemplate && (
                                <div>
                                  <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">Stock Availability</label>
                                  <select 
                                    value={editStockStatus}
                                    onChange={(e) => setEditStockStatus(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                                  >
                                    <option value="in_stock">In Stock (Default)</option>
                                    <option value="out_of_stock">Out of Stock</option>
                                  </select>
                                </div>
                              )}

                              {/* Target Audience / Gender */}
                              <div>
                                <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">Target Audience / Gender</label>
                                <select 
                                  value={editGender}
                                  onChange={(e) => setEditGender(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                                >
                                  <option value="unisex">Unisex (Default)</option>
                                  <option value="men">Men</option>
                                  <option value="women">Women</option>
                                  <option value="kids">Kids</option>
                                </select>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">Description</label>
                              <textarea 
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows="2"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-y"
                              />
                            </div>

                            {/* Personalization Options */}
                            {!editIsTemplate && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex items-center justify-between">
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-350">Allow Custom Name</h4>
                                    <p className="text-[10px] text-zinc-650 mt-0.5">Allow customized names overlay.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={editAllowNamePersonalization}
                                      onChange={(e) => setEditAllowNamePersonalization(e.target.checked)}
                                    />
                                    <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
                                  </label>
                                </div>

                                <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex items-center justify-between">
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-350">Allow Custom Number</h4>
                                    <p className="text-[10px] text-zinc-650 mt-0.5">Allow customized jersey numbers.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={editAllowNumberPersonalization}
                                      onChange={(e) => setEditAllowNumberPersonalization(e.target.checked)}
                                    />
                                    <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Product Asset Files (Texture, GLB, Mockup) */}
                            <div className="space-y-4 border-t border-b border-zinc-800/40 py-4">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest select-none">Update Product Assets</h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Texture / Main Image */}
                                <div>
                                  <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">
                                    {editIsTemplate ? "Change Base 3D Texture Image" : "Change Main Product Photo"}
                                  </label>
                                  <div className="relative border border-dashed border-zinc-800 rounded-xl p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          setEditTextureFile(e.target.files[0]);
                                        }
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center py-1 text-center select-none">
                                      <ImageIcon className={`w-5 h-5 mb-1 ${editTextureFile ? "text-indigo-400" : "text-zinc-500"}`} />
                                      <p className="text-[11px] font-semibold text-zinc-450 font-sans truncate max-w-full">
                                        {editTextureFile ? editTextureFile.name : "Select new main image"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Display Mockup Photo (Templates only) */}
                                {editIsTemplate && (
                                  <div>
                                    <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">
                                      Change Catalog Mockup Image
                                    </label>
                                    <div className="relative border border-dashed border-zinc-800 rounded-xl p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            setEditDisplayPhotoFile(e.target.files[0]);
                                          }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      />
                                      <div className="flex flex-col items-center justify-center py-1 text-center select-none">
                                        <ImageIcon className={`w-5 h-5 mb-1 ${editDisplayPhotoFile ? "text-indigo-400" : "text-zinc-500"}`} />
                                        <p className="text-[11px] font-semibold text-zinc-450 font-sans truncate max-w-full">
                                          {editDisplayPhotoFile ? editDisplayPhotoFile.name : "Select new mockup display"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* GLB Model File (Templates only) */}
                                {editIsTemplate && (
                                  <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-1.5 select-none">
                                      Change 3D GLB Model File
                                    </label>
                                    <div className="relative border border-dashed border-zinc-800 rounded-xl p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                                      <input
                                        type="file"
                                        accept=".glb"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            setEditGlbFile(e.target.files[0]);
                                          }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      />
                                      <div className="flex flex-col items-center justify-center py-1 text-center select-none">
                                        <Sliders className={`w-5 h-5 mb-1 ${editGlbFile ? "text-indigo-400" : "text-zinc-500"}`} />
                                        <p className="text-[11px] font-semibold text-zinc-450 font-sans truncate max-w-full">
                                          {editGlbFile ? editGlbFile.name : "Select new 3D model .glb file"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Product Gallery Images */}
                            <div>
                              <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-2 select-none">Product Gallery Images</label>
                              {editGalleryUrls ? (
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                  {editGalleryUrls.split(",").map((url, idx) => (
                                    <div key={idx} className="aspect-square bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden relative group">
                                      <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExistingGalleryImage(url)}
                                        className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-750 text-white rounded transition-colors cursor-pointer"
                                        title="Delete image"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-zinc-550 mb-2 italic">No gallery images uploaded yet.</p>
                              )}
                              
                              <div className="relative border border-dashed border-zinc-800 rounded-xl p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      setEditGalleryFiles(Array.from(e.target.files));
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center justify-center py-1 text-center select-none">
                                  <ImageIcon className={`w-5 h-5 mb-1 ${editGalleryFiles.length > 0 ? "text-indigo-400" : "text-zinc-500"}`} />
                                  <p className="text-[11px] font-semibold text-zinc-450 font-sans">
                                    {editGalleryFiles.length > 0 ? `${editGalleryFiles.length} new photos selected` : "Upload more photos"}
                                  </p>
                                  <p className="text-[10px] text-zinc-600 mt-0.5">PNG, JPG up to 5MB</p>
                                </div>
                              </div>
                            </div>

                            {/* Technical Specifications */}
                            <div className="pt-2 border-t border-zinc-800/40">
                              <label className="block text-xs font-bold text-zinc-550 uppercase tracking-widest mb-2 select-none">Technical Specifications (Mandatory)</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                {editSpecs.map((spec, idx) => (
                                  <div key={idx} className="bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-xl flex items-start gap-2 relative">
                                    <div className="flex-1 space-y-1.5 pr-6">
                                      <input
                                        type="text"
                                        value={spec.key}
                                        onChange={(e) => {
                                          const updated = [...editSpecs];
                                          updated[idx] = { ...updated[idx], key: e.target.value };
                                          setEditSpecs(updated);
                                        }}
                                        placeholder="Spec Name (e.g. Fit Profile)"
                                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-sans font-bold"
                                      />
                                      <input
                                        type="text"
                                        value={spec.val}
                                        onChange={(e) => {
                                          const updated = [...editSpecs];
                                          updated[idx] = { ...updated[idx], val: e.target.value };
                                          setEditSpecs(updated);
                                        }}
                                        placeholder="Spec Value (e.g. Regular Fit)"
                                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-sans"
                                      />
                                    </div>
                                    <button
                                      onClick={() => setEditSpecs(editSpecs.filter((_, i) => i !== idx))}
                                      className="absolute top-2 right-2 p-1 text-zinc-650 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer shrink-0"
                                      title="Remove specification"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="bg-zinc-950/20 p-2.5 border border-dashed border-zinc-800 rounded-xl space-y-2 max-w-xs">
                                <input
                                  type="text"
                                  value={newSpecKey}
                                  onChange={(e) => setNewSpecKey(e.target.value)}
                                  placeholder="New Spec Name (e.g. Fabric Weight)"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-500 focus:outline-none focus:border-indigo-500 placeholder-zinc-850 font-sans"
                                />
                                <input
                                  type="text"
                                  value={newSpecVal}
                                  onChange={(e) => setNewSpecVal(e.target.value)}
                                  placeholder="New Spec Value (e.g. 380 GSM)"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-500 focus:outline-none focus:border-indigo-500 placeholder-zinc-850 font-sans"
                                />
                                <button
                                  onClick={() => {
                                    if (!newSpecKey.trim() || !newSpecVal.trim()) return;
                                    setEditSpecs([...editSpecs, { key: newSpecKey.trim(), val: newSpecVal.trim() }]);
                                    setNewSpecKey("");
                                    setNewSpecVal("");
                                  }}
                                  className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold py-1.5 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Specification</span>
                                </button>
                              </div>
                            </div>

                            {/* Save & Cancel */}
                            <div className="flex items-center gap-3 pt-3 border-t border-zinc-800/60">
                              <button
                                onClick={() => handleSaveEditProduct(editingProduct)}
                                disabled={savingEdit}
                                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
                              >
                                {savingEdit ? "Saving..." : "Save Changes"}
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="flex-1 text-center bg-zinc-800 hover:bg-zinc-750 text-zinc-400 font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            ) : (
              /* ADD CATALOG PRODUCT VIEW */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form column (Left/Middle Column) */}
                <div className="lg:col-span-2">
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-semibold">{isTemplate ? "Add 3D Template" : "Add Catalog Product"}</h3>
                    </div>
                    <p className="text-sm text-zinc-500 mb-5 ml-8 leading-relaxed">
                      {isTemplate
                        ? "Upload a GLB mesh + texture to register a new 3D customizer base model."
                        : "Fill in the details below to publish a new ready-made product to your shop catalog."}
                    </p>

                    {/* Form Status Banner */}
                    {statusMsg.text && (
                      <div className={`mb-6 p-3 rounded-lg border text-xs flex gap-2 items-start ${
                        statusMsg.type === "error" 
                          ? "bg-red-500/10 border-red-500/20 text-red-400" 
                          : statusMsg.type === "success" 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                      }`}>
                        {statusMsg.type === "error" ? (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : statusMsg.type === "success" ? (
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                        )}
                        <span>{statusMsg.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Product Name */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Product Name
                        </label>
                        <input
                          type="text"
                          required
                          disabled={uploading}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Classic White Hoodie"
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Custom Product ID / SKU */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Custom Product ID / SKU (Optional)
                        </label>
                        <input
                          type="text"
                          disabled={uploading}
                          value={customProductId}
                          onChange={(e) => setCustomProductId(e.target.value)}
                          placeholder="e.g. classic-white-hoodie (auto-generated if empty)"
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-zinc-550 mt-1">
                          Only lowercase letters, numbers, hyphens, and underscores are allowed.
                        </p>
                      </div>

                      {/* Product Price */}
                      {!isTemplate && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Base Price (₹ INR)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            required={!isTemplate}
                            disabled={uploading}
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="e.g. 3999"
                            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* Product Category Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Product Category
                        </label>
                        <select
                          disabled={uploading}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          {catalogCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Product Type Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                           Product Type
                        </label>
                        <select
                          disabled={uploading}
                          value={isTemplate ? "template" : "standard"}
                          onChange={(e) => setIsTemplate(e.target.value === "template")}
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="standard">Standard Catalog Product</option>
                          <option value="template">3D Configurator Template Model</option>
                        </select>
                      </div>

                      {/* Stock Availability Selector */}
                      {!isTemplate && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Stock Availability
                          </label>
                          <select
                            disabled={uploading}
                            value={stockStatus}
                            onChange={(e) => setStockStatus(e.target.value)}
                            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="in_stock">In Stock (Default)</option>
                            <option value="out_of_stock">Out of Stock</option>
                          </select>
                        </div>
                      )}

                      {/* Target Audience / Gender Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Target Audience / Gender
                        </label>
                        <select
                          disabled={uploading}
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="unisex">Unisex (Default)</option>
                          <option value="men">Men</option>
                          <option value="women">Women</option>
                          <option value="kids">Kids</option>
                        </select>
                      </div>

                      {/* Product Description */}
                      {!isTemplate && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Product Description
                          </label>
                          <textarea
                            disabled={uploading}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter detailed description of the product garment (material care, style advice)..."
                            rows="3"
                            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-605 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                          />
                        </div>
                      )}

                      {/* Gallery Images (Multiple) */}
                      {!isTemplate && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Gallery Photos (Multiple)
                          </label>
                          <div className="relative border border-dashed border-zinc-800 rounded-lg p-3.5 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                            <input
                              id="gallery-input"
                              type="file"
                              multiple
                              disabled={uploading}
                              accept="image/*"
                              onChange={handleGalleryChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center py-2 text-center select-none">
                              <ImageIcon className={`w-6 h-6 mb-2 ${galleryFiles.length > 0 ? "text-indigo-400" : "text-zinc-500"}`} />
                              <p className="text-xs font-medium">
                                {galleryFiles.length > 0 ? `${galleryFiles.length} images selected` : "Select gallery photos"}
                              </p>
                              <p className="text-sm text-zinc-500 mt-1">PNG, JPG up to 5 files</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Personalization Options */}
                      {!isTemplate && (
                        <div className="sm:col-span-2 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-zinc-900/30 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-zinc-300">Allow Custom Name</h4>
                              <p className="text-[11px] text-zinc-500 mt-0.5">Allow users to enter customized jersey names.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={allowNamePersonalization}
                                onChange={(e) => setAllowNamePersonalization(e.target.checked)}
                                disabled={uploading}
                              />
                              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                          </div>

                          <div className="bg-zinc-900/30 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-zinc-300">Allow Custom Number</h4>
                              <p className="text-[11px] text-zinc-500 mt-0.5">Allow users to enter customized jersey numbers.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={allowNumberPersonalization}
                                onChange={(e) => setAllowNumberPersonalization(e.target.checked)}
                                disabled={uploading}
                              />
                              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Conditionally render GLB upload box for templates */}
                      {isTemplate && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            3D Mesh Template (.glb)
                          </label>
                          <div className="relative border border-dashed border-zinc-800 rounded-lg p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                            <input
                              id="glb-input"
                              type="file"
                              required={isTemplate}
                              disabled={uploading}
                              accept=".glb"
                              onChange={handleGlbChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex flex-col items-center justify-center py-2 text-center">
                              <Layers className={`w-6 h-6 mb-2 ${glbFile ? "text-indigo-400" : "text-zinc-500"}`} />
                              <p className="text-xs font-medium">
                                {glbFile ? glbFile.name : "Select Mesh GLB File"}
                              </p>
                              <p className="text-sm text-zinc-500 mt-1">Stitch canvas template mesh geometry</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Texture File or Main Display Photo */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          {isTemplate ? "3D Mesh Default Texture Map" : "Main Display Photo"}
                        </label>
                        <div className="relative border border-dashed border-zinc-800 rounded-lg p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                          <input
                            id="texture-input"
                            type="file"
                            required
                            disabled={uploading}
                            accept="image/*"
                            onChange={handleTextureChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col items-center justify-center py-2 text-center">
                            <ImageIcon className={`w-6 h-6 mb-2 ${textureFile ? "text-indigo-400" : "text-zinc-500"}`} />
                            <p className="text-xs font-medium">
                              {textureFile ? textureFile.name : (isTemplate ? "Select Texture / Graphic Image" : "Select Main Product Photo")}
                            </p>
                            <p className="text-sm text-zinc-500 mt-1">PNG, JPG, SVG up to 5MB</p>
                          </div>
                        </div>
                      </div>

                      {/* Catalog Card Display Image (Only for templates) */}
                      {isTemplate && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Catalog Card Display Image
                          </label>
                          <div className="relative border border-dashed border-zinc-800 rounded-lg p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
                            <input
                              id="display-photo-input"
                              type="file"
                              required={isTemplate}
                              disabled={uploading}
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  if (!file.type.startsWith("image/")) {
                                    setStatusMsg({ type: "error", text: "Please upload a valid image file for the display photo." });
                                    setDisplayPhotoFile(null);
                                    return;
                                  }
                                  setDisplayPhotoFile(file);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex flex-col items-center justify-center py-2 text-center">
                              <ImageIcon className={`w-6 h-6 mb-2 ${displayPhotoFile ? "text-indigo-400" : "text-zinc-500"}`} />
                              <p className="text-xs font-medium">
                                {displayPhotoFile ? displayPhotoFile.name : "Select Catalog Mockup Image"}
                              </p>
                              <p className="text-sm text-zinc-500 mt-1">PNG, JPG, JPEG up to 5MB</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={uploading}
                        className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Publishing...</span>
                          </>
                        ) : isTemplate ? (
                          <>
                            <Layers className="w-4 h-4" />
                            <span>Upload 3D Template</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Add to Catalog</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right side: Instructions */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Quick Add Hint Banner */}
                  <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-800/30 rounded-xl p-4 flex items-start gap-3">
                    <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0 mt-0.5">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-300">Adding More Catalog Items</p>
                      <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">
                        Use the <span className="font-semibold text-white">"Add Catalog Product"</span> form on the left to publish new ready-made items to the shop. Set the product type to <span className="font-semibold text-white">"Standard Catalog Product"</span>, upload a photo, fill in details, and click <span className="font-semibold text-white">"Add to Catalog"</span>. Items appear instantly in the customer shop.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "orders-analytics" ? (
          /* ====== ORDERS & ANALYTICS MERGED TAB ====== */
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Sub-tab Switcher */}
            <div className="bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-1.5 flex gap-2 w-full max-w-sm">
              <button
                onClick={() => setOrdersSubTab("orders")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  ordersSubTab === "orders"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Customer Orders
                {orders.length > 0 && (
                  <span className="ml-1.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setOrdersSubTab("analytics")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  ordersSubTab === "analytics"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Sales Analytics
              </button>
            </div>

            {/* ---- CUSTOMER ORDERS SUB-PANEL ---- */}
            {ordersSubTab === "orders" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-semibold">Custom Apparel Orders Ledger</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportOrdersToCSV}
                        className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Export all orders to CSV file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>
                      <button
                        onClick={fetchOrders}
                        className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Sync Orders
                      </button>
                    </div>
                  </div>

                  {/* Search + Filter */}
                  <div className="flex flex-col md:flex-row gap-3 mb-5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Search orders by customer name, email, or order ID..."
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {["all", "confirming_design", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setOrderStatusFilter(status)}
                          className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                            orderStatusFilter === status
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {status === "confirming_design" ? "Confirm Design" : status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingOrders ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
                      <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                      <p className="text-xs">Loading order records...</p>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-xs">No orders found matching your search criteria.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => (
                        <div key={order.id} className="bg-zinc-950/40 border border-zinc-900 rounded-xl overflow-hidden">
                          {/* Order Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-zinc-900/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div>
                                <p className="text-xs font-extrabold text-white">{order.customer_name || "Guest Customer"}</p>
                                <p className="text-[10px] text-zinc-500 font-mono">{order.customer_email || "no-email@thread3d.com"}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                (order.status || "").toLowerCase() === "confirming_design" ? "bg-purple-500/10 border-purple-500/30 text-purple-400 border-dashed" :
                                (order.status || "").toLowerCase() === "delivered" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                                (order.status || "").toLowerCase() === "shipped" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" :
                                (order.status || "").toLowerCase() === "cancelled" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                                "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              }`}>
                                {order.status === "confirming_design" ? "Confirm Design" : (order.status || "processing")}
                              </span>
                              <span className="text-xs font-bold font-mono text-zinc-300">₹{(parseFloat(order.total_amount || order.total) || 0).toLocaleString("en-IN")}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                              <span className="text-[10px] font-mono text-zinc-600">#{(order.id || "").substring(0, 8).toUpperCase()}</span>
                            </div>
                          </div>

                          {/* Order Items */}
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="px-4 py-3 border-b border-zinc-900/50">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">Items</p>
                              <div className="space-y-1.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-zinc-300 font-semibold">{item.name}</span>
                                      {item.size && <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{item.size}</span>}
                                      {item.customName && <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold">Name: {item.customName}</span>}
                                      {item.customNumber && <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">#{item.customNumber}</span>}
                                    </div>
                                    <span className="text-zinc-400 font-mono">×{item.quantity || 1} · ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shipping + Tracking */}
                          <div className="px-4 py-3 flex flex-col md:flex-row gap-4">
                            {order.shipping_details && (() => {
                              const details = order.shipping_details;
                              const name = typeof details.name === "object" && details.name !== null
                                ? (details.name.name || JSON.stringify(details.name))
                                : (details.name || "Guest");
                              const phone = typeof details.phone === "object" && details.phone !== null
                                ? (details.phone.phone || JSON.stringify(details.phone))
                                : details.phone;

                              let address = "";
                              let city = "";
                              let zip = "";
                              if (details.address && typeof details.address === "object") {
                                address = details.address.address || "";
                                city = details.address.city || details.city || "";
                                zip = details.address.zip || details.zip || "";
                              } else {
                                address = details.address || "";
                                city = details.city || "";
                                zip = details.zip || "";
                              }

                              return (
                                <div className="flex-1 text-xs text-zinc-500 space-y-0.5">
                                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-1">Ship To</p>
                                  <p className="text-zinc-300 font-semibold">{name}</p>
                                  <p>{address}{city ? `, ${city}` : ""} {zip}</p>
                                  {phone && <p>{phone}</p>}
                                </div>
                              );
                            })()}

                            {/* Update Form */}
                            <div className="flex-1">
                              {updatingOrderId === order.id ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <select value={statusInput} onChange={(e) => setStatusInput(e.target.value)}
                                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                                      {((order.shipping_details?.isDesignerConsultation || 
                                        order.status === "confirming_design" ||
                                        (order.items && order.items.some(it => it.id === 'designer_consultation' || it.productId === 'designer_consultation')))
                                        ? ["confirming_design", "processing", "shipped", "delivered", "cancelled"]
                                        : ["processing", "shipped", "delivered", "cancelled"]
                                      ).map(s => <option key={s} value={s}>{s === "confirming_design" ? "Confirm Design" : s}</option>)}
                                    </select>
                                    <select value={carrierInput} onChange={(e) => setCarrierInput(e.target.value)}
                                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                                      {["FedEx","DHL","Delhivery","DTDC","BlueDart","Ekart","Shiprocket"].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <input type="text" value={trackingNumberInput} onChange={(e) => setTrackingNumberInput(e.target.value)}
                                    placeholder="Tracking number..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleSaveFulfillment(order.id, statusInput, carrierInput, trackingNumberInput)}
                                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors">
                                      Save Update
                                    </button>
                                    <button onClick={() => setUpdatingOrderId(null)}
                                      className="px-3 py-1.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  {order.tracking_number && (
                                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                                      {order.carrier && <span className="text-zinc-500 mr-1">{order.carrier}:</span>}{order.tracking_number}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      setUpdatingOrderId(order.id);
                                      setStatusInput(order.status || "processing");
                                      setCarrierInput(order.carrier || "FedEx");
                                      setTrackingNumberInput(order.tracking_number || "");
                                    }}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <Edit className="w-3 h-3" /> Update Fulfillment
                                  </button>
                                  <button
                                    onClick={() => setPrintingInvoiceOrder(order)}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" /> Invoice
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- SALES ANALYTICS SUB-PANEL ---- */}
            {ordersSubTab === "analytics" && (
              <div className="animate-in fade-in duration-150">
                <SalesStatsView orders={orders} />
              </div>
            )}

          </div>
        ) : activeTab === "coupons" ? (
          /* Coupons & Discounts Manager Tab */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-200">
            
            {/* Left section: Create/Add Coupon Form */}
            <div className="md:col-span-1">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 backdrop-blur-xl sticky top-24">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Create Promo Code</h3>
                    <p className="text-xs text-zinc-500">Configure new customer discounts</p>
                  </div>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-4 mt-6">
                  {couponFormError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
                      <span>⚠️</span> {couponFormError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Coupon Code</label>
                    <input
                      type="text"
                      placeholder="e.g. WELCOME30"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-950 border border-zinc-850 px-3.5 py-2 rounded-lg text-xs font-mono font-bold text-zinc-200 focus:outline-none focus:border-indigo-500 uppercase placeholder:text-zinc-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Discount Percentage (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 30"
                      min="1"
                      max="100"
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 px-3.5 py-2 rounded-lg text-xs font-bold text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total Usage Limit (Optional)</label>
                    <input
                      type="number"
                      placeholder="Unlimited if empty"
                      min="1"
                      value={newCouponLimit}
                      onChange={(e) => setNewCouponLimit(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 px-3.5 py-2 rounded-lg text-xs font-bold text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-700"
                    />
                  </div>

                  {/* Settings Toggles */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newCouponFirstTime}
                        onChange={(e) => setNewCouponFirstTime(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-300 block">First-Time Users Only</span>
                        <span className="text-[10px] text-zinc-500 block">Restrict code to users with 0 completed orders</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newCouponActive}
                        onChange={(e) => setNewCouponActive(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-300 block">Active Status</span>
                        <span className="text-[10px] text-zinc-500 block">Enable coupon code immediately</span>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingCoupon}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-extrabold text-xs py-2.5 rounded-lg transition-all cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 mt-4"
                  >
                    {savingCoupon ? "Creating..." : "Generate Promo Code"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right section: Coupons Table */}
            <div className="md:col-span-2">
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6 backdrop-blur-xl">
                
                {/* Fallback alert banner if schema is not run yet */}
                {couponsFallbackMode && (
                  <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3.5 items-start">
                    <span className="text-lg">📢</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Database Schema Setup Required</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {couponsFallbackMessage}
                      </p>
                      <pre className="bg-zinc-950 border border-zinc-900 rounded p-2 text-[10px] font-mono text-zinc-500 mt-2.5 overflow-x-auto whitespace-pre-wrap select-all">
                        {`CREATE TABLE coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  usage_limit INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  is_first_time_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-extrabold text-sm text-white">Active Promo Codes List</h3>
                  <button
                    onClick={fetchCoupons}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Reload list
                  </button>
                </div>

                {loadingCoupons ? (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2.5">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading coupons...</span>
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="py-20 text-center text-zinc-600 border border-dashed border-zinc-850 rounded-xl">
                    <Percent className="w-8 h-8 mx-auto text-zinc-700 mb-3" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Coupon Codes Found</p>
                    <p className="text-xs text-zinc-500 mt-1">Generate your first promo code using the panel on the left.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Discount</th>
                          <th className="py-3 px-4">Usage Count</th>
                          <th className="py-3 px-4">Audience</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {coupons.map((coupon) => (
                          <tr key={coupon.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="py-4 px-4 font-mono font-bold text-white tracking-wider text-xs">
                              {coupon.code}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-emerald-400">
                              {coupon.discount_percent}% OFF
                            </td>
                            <td className="py-4 px-4 text-zinc-400">
                              <span className="font-extrabold text-zinc-300">{coupon.used_count || 0}</span> 
                              <span className="text-zinc-600 font-mono"> / {coupon.usage_limit !== null ? coupon.usage_limit : "∞"}</span>
                            </td>
                            <td className="py-4 px-4">
                              {coupon.is_first_time_only ? (
                                <span className="bg-purple-950/40 border border-purple-900/60 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                                  First Time Users
                                </span>
                              ) : (
                                <span className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                                  All Users
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${coupon.is_active ? "text-emerald-400" : "text-rose-400"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${coupon.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                {coupon.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right space-x-3">
                              <button
                                onClick={() => handleToggleCouponStatus(coupon)}
                                className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:underline ${
                                  coupon.is_active ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {coupon.is_active ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon.id)}
                                className="text-zinc-500 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : activeTab === "studio-pricing" ? (
          /* Studio Pricing Tab */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Custom 3D Studio Pricing & Upcharges</h3>
                    <p className="text-sm text-zinc-500 mt-0.5 select-none">
                      Configure custom upcharges for premium fabrics and set general customization base fees for the 3D Customizer Studio.
                    </p>
                  </div>
                </div>
              </div>

              {loadingStudioPricing ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Fetching custom studio settings...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveStudioPricing} className="max-w-2xl space-y-6">
                  
                  {/* Upcharges & Material configuration */}
                  <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-5 space-y-6">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block select-none">Fabric pricing & 3D Materials</span>
                    
                    {/* Cotton Upcharge & Materials */}
                    <div className="space-y-3 pt-3 border-t border-zinc-900 first:border-t-0 first:pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Material Name (Label)</label>
                            <input
                              type="text"
                              required
                              value={studioCottonLabel}
                              onChange={(e) => setStudioCottonLabel(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Description</label>
                            <textarea
                              required
                              rows="2"
                              value={studioCottonDesc}
                              onChange={(e) => setStudioCottonDesc(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Upcharge (₹)</label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={studioCottonUpcharge}
                              onChange={(e) => setStudioCottonUpcharge(e.target.value)}
                              placeholder="0"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Roughness</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                required
                                value={studioCottonRoughness}
                                onChange={(e) => setStudioCottonRoughness(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Metalness</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                required
                                value={studioCottonMetalness}
                                onChange={(e) => setStudioCottonMetalness(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Bump Scale</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="0.1"
                                required
                                value={studioCottonBumpScale}
                                onChange={(e) => setStudioCottonBumpScale(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Polyester Upcharge & Materials */}
                    <div className="space-y-3 pt-4 border-t border-zinc-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Material Name (Label)</label>
                            <input
                              type="text"
                              required
                              value={studioPolyesterLabel}
                              onChange={(e) => setStudioPolyesterLabel(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Description</label>
                            <textarea
                              required
                              rows="2"
                              value={studioPolyesterDesc}
                              onChange={(e) => setStudioPolyesterDesc(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Upcharge (₹)</label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={studioPolyesterUpcharge}
                              onChange={(e) => setStudioPolyesterUpcharge(e.target.value)}
                              placeholder="999"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Roughness</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                required
                                value={studioPolyesterRoughness}
                                onChange={(e) => setStudioPolyesterRoughness(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Metalness</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                required
                                value={studioPolyesterMetalness}
                                onChange={(e) => setStudioPolyesterMetalness(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Bump Scale</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="0.1"
                                required
                                value={studioPolyesterBumpScale}
                                onChange={(e) => setStudioPolyesterBumpScale(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fleece Upcharge & Materials */}
                    <div className="space-y-3 pt-4 border-t border-zinc-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Material Name (Label)</label>
                            <input
                              type="text"
                              required
                              value={studioFleeceLabel}
                              onChange={(e) => setStudioFleeceLabel(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Description</label>
                            <textarea
                              required
                              rows="2"
                              value={studioFleeceDesc}
                              onChange={(e) => setStudioFleeceDesc(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Upcharge (₹)</label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={studioFleeceUpcharge}
                              onChange={(e) => setStudioFleeceUpcharge(e.target.value)}
                              placeholder="1299"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Roughness</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                required
                                value={studioFleeceRoughness}
                                onChange={(e) => setStudioFleeceRoughness(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Metalness</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                required
                                value={studioFleeceMetalness}
                                onChange={(e) => setStudioFleeceMetalness(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Bump Scale</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="0.1"
                                required
                                value={studioFleeceBumpScale}
                                onChange={(e) => setStudioFleeceBumpScale(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* General settings */}
                  <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-5 space-y-4">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block select-none">General Customization Settings</span>
                    
                    {/* Customization Base Fee */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-xs font-bold text-white mb-0.5">Customization Base Fee</label>
                        <span className="text-[11px] text-zinc-500">Extra setup/print fee added to any custom studio order.</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          required
                          value={studioCustomizationBaseFee}
                          onChange={(e) => setStudioCustomizationBaseFee(e.target.value)}
                          placeholder="0"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingStudioPricing}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                    >
                      {savingStudioPricing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <span>Save Pricing Settings</span>
                      )}
                    </button>
                  </div>

                </form>
              )}
            </div>
          </div>
        ) : activeTab === "storefront" ? (
          /* ====== STOREFRONT SETTINGS TAB ====== */
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Sub-tab Switcher */}
            <div className="bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-1.5 flex gap-2 w-full max-w-xl">
              <button
                onClick={() => setStorefrontSubTab("banners")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storefrontSubTab === "banners"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Homepage Banners
              </button>
              <button
                onClick={() => setStorefrontSubTab("promo-cards")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storefrontSubTab === "promo-cards"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Promotion Grid
              </button>
              <button
                onClick={() => setStorefrontSubTab("ticker")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storefrontSubTab === "ticker"
                    ? "bg-amber-500 text-black shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Announcement Ticker
              </button>
              <button
                onClick={() => setStorefrontSubTab("flash-offer")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storefrontSubTab === "flash-offer"
                    ? "bg-rose-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Flash Offers
              </button>
              <button
                onClick={() => setStorefrontSubTab("invoice")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storefrontSubTab === "invoice"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Invoice Settings
              </button>
              <button
                onClick={() => setStorefrontSubTab("designer")}
                className={`flex-1 text-center py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storefrontSubTab === "designer"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Designer
              </button>
            </div>

            {/* ---- BANNERS SUB-PANEL ---- */}
            {storefrontSubTab === "banners" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Homepage Carousel Banners</h2>
                    <p className="text-xs text-zinc-500 mt-1">Control the marketing slides displayed on the storefront landing page hero section.</p>
                  </div>
                  {!editingBanner && (
                    <button
                      onClick={() => setEditingBanner({ badge: "", title: "", subtitle: "", image_url: "/banner_studio.png", cta_text: "Learn More", cta_href: "/", accent: "from-indigo-500 via-purple-500 to-pink-500", display_order: bannersList.length })}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Banner Slide</span>
                    </button>
                  )}
                </div>

                {editingBanner ? (
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 max-w-2xl space-y-4">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                      {editingBanner.id ? "Edit Slide Settings" : "Create New Slide"}
                    </h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveBanner(editingBanner); }} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Badge Indicator (Upper Tag)</label>
                          <input type="text" required value={editingBanner.badge} onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })} placeholder="e.g. EXCLUSIVE 3D STUDIO" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Slide Title</label>
                          <input type="text" required value={editingBanner.title} onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })} placeholder="e.g. Design in Real-Time 3D" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Subtitle / Paragraph Description</label>
                        <textarea rows="3" required value={editingBanner.subtitle} onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })} placeholder="Enter the slider descriptive paragraph details..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Upload Banner Image File</label>
                          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { setBannerFile(e.target.files[0]); } }} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-black file:bg-indigo-650 file:text-white hover:file:bg-indigo-500 file:cursor-pointer" />
                          {bannerFile && (<span className="text-[10px] text-indigo-400 font-bold block mt-1">✓ Ready to upload: {bannerFile.name}</span>)}
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">OR Background Image URL (Path)</label>
                          <input type="text" required={!bannerFile && !editingBanner.image_url} value={editingBanner.image_url} onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })} placeholder="e.g. /banner_studio.png" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Accent Tailwind Gradient Colors</label>
                          <input type="text" required value={editingBanner.accent} onChange={(e) => setEditingBanner({ ...editingBanner, accent: e.target.value })} placeholder="from-indigo-500 via-purple-500 to-pink-500" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                        </div>
                        <div />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">CTA Button Text</label>
                          <input type="text" required value={editingBanner.cta_text} onChange={(e) => setEditingBanner({ ...editingBanner, cta_text: e.target.value })} placeholder="Enter 3D Studio" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">CTA Button Href (Link Redirect)</label>
                          <input type="text" required value={editingBanner.cta_href} onChange={(e) => setEditingBanner({ ...editingBanner, cta_href: e.target.value })} placeholder="e.g. /studio" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                          <span className="text-[9px] text-zinc-550 mt-1.5 block">
                            Use <code className="text-indigo-400 font-mono">/dashboard?q=word</code> for search terms, or <code className="text-indigo-400 font-mono">/dashboard?category=name</code> for categories.
                          </span>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Display Sort Order</label>
                          <input type="number" required min="0" value={editingBanner.display_order} onChange={(e) => setEditingBanner({ ...editingBanner, display_order: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => { setEditingBanner(null); setBannerFile(null); }} className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">Cancel</button>
                        <button type="submit" disabled={savingBanner} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50">
                          {savingBanner ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving Slide...</span></>) : (<span>Save Slide Configuration</span>)}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden backdrop-blur-xl">
                    {loadingBanners ? (
                      <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                        <p className="text-xs">Loading homepage banners...</p>
                      </div>
                    ) : bannersList.length === 0 ? (
                      <div className="p-12 text-center text-zinc-500">
                        <p className="text-xs">No custom banners found. Displaying system defaults on the storefront.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-950/40 text-[10px] font-black uppercase tracking-wider text-zinc-400 select-none">
                              <th className="p-4 w-12 text-center">Order</th>
                              <th className="p-4">Badge</th>
                              <th className="p-4">Title &amp; Subtitle</th>
                              <th className="p-4">Image Path</th>
                              <th className="p-4">Redirect (CTA)</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {bannersList.map((banner) => (
                              <tr key={banner.id} className="hover:bg-zinc-950/20 text-xs transition-colors">
                                <td className="p-4 font-mono font-bold text-center text-indigo-400">{banner.display_order}</td>
                                <td className="p-4 font-bold">
                                  <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black">{banner.badge || "No Badge"}</span>
                                </td>
                                <td className="p-4 space-y-0.5 max-w-sm">
                                  <div className="font-extrabold text-zinc-200 line-clamp-1">{banner.title}</div>
                                  <div className="text-[11px] text-zinc-500 line-clamp-1">{banner.subtitle}</div>
                                </td>
                                <td className="p-4 font-mono text-zinc-400 text-[11px]">{banner.image_url}</td>
                                <td className="p-4">
                                  <div className="font-bold text-zinc-300">{banner.cta_text}</div>
                                  <div className="font-mono text-zinc-500 text-[11px]">{banner.cta_href}</div>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingBanner(banner)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Edit Banner Settings"><Edit className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteBanner(banner.id)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer" title="Delete Banner Slide"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---- PROMOTION GRID SUB-PANEL ---- */}
            {storefrontSubTab === "promo-cards" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Homepage 2x2 Promotion Grid</h2>
                    <p className="text-xs text-zinc-500 mt-1">Manage the 4 primary promotional callouts featured in the middle of the landing page.</p>
                  </div>
                  {!editingPromoCard && (
                    <button
                      onClick={() => setEditingPromoCard({ badge: "", title: "", description: "", image_url: "", cta_text: "Explore Drop", cta_href: "/", accent_color: "indigo", display_order: promoCardsList.length })}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Promo Card</span>
                    </button>
                  )}
                </div>

                {editingPromoCard ? (
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 max-w-2xl space-y-4">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                      {editingPromoCard.id ? "Edit Promo Card Settings" : "Create New Promo Card"}
                    </h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleSavePromoCard(editingPromoCard); }} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Badge Tag</label>
                          <input type="text" required value={editingPromoCard.badge} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, badge: e.target.value })} placeholder="e.g. Thread3D Originals" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Card Title</label>
                          <input type="text" required value={editingPromoCard.title} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, title: e.target.value })} placeholder="e.g. Classic Boxy Tees" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Card Description</label>
                        <textarea rows="3" required value={editingPromoCard.description} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, description: e.target.value })} placeholder="Enter short subtitle/teaser text..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Upload Card Backdrop (Optional)</label>
                          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPromoCardFile(e.target.files[0]); } }} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-black file:bg-indigo-650 file:text-white hover:file:bg-indigo-500 file:cursor-pointer" />
                          {promoCardFile && (<span className="text-[10px] text-indigo-400 font-bold block mt-1">✓ Ready to upload: {promoCardFile.name}</span>)}
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">OR Image Path / URL</label>
                          <input type="text" value={editingPromoCard.image_url || ""} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, image_url: e.target.value })} placeholder="e.g. /promos/boxy-tee.jpg" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Accent Theme Color</label>
                          <select 
                            value={editingPromoCard.accent_color || "indigo"} 
                            onChange={(e) => setEditingPromoCard({ ...editingPromoCard, accent_color: e.target.value })} 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                          >
                            <option value="indigo">Indigo</option>
                            <option value="purple">Purple</option>
                            <option value="pink">Pink</option>
                            <option value="emerald">Emerald</option>
                            <option value="blue">Blue</option>
                            <option value="red">Red</option>
                            <option value="amber">Amber</option>
                          </select>
                        </div>
                        <div />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">CTA Button Text</label>
                          <input type="text" required value={editingPromoCard.cta_text} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, cta_text: e.target.value })} placeholder="Explore Drop" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">CTA Button Link Href</label>
                          <input type="text" required value={editingPromoCard.cta_href} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, cta_href: e.target.value })} placeholder="e.g. /dashboard?category=t-shirt" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                          <span className="text-[9px] text-zinc-550 mt-1.5 block">
                            Use <code className="text-indigo-400 font-mono">/dashboard?q=word</code> for search terms, or <code className="text-indigo-400 font-mono">/dashboard?category=name</code> for categories.
                          </span>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Display Grid Order</label>
                          <input type="number" required min="0" value={editingPromoCard.display_order} onChange={(e) => setEditingPromoCard({ ...editingPromoCard, display_order: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => { setEditingPromoCard(null); setPromoCardFile(null); }} className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">Cancel</button>
                        <button type="submit" disabled={savingPromoCard} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50">
                          {savingPromoCard ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving Card...</span></>) : (<span>Save Card Configuration</span>)}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden backdrop-blur-xl">
                    {loadingPromoCards ? (
                      <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                        <p className="text-xs">Loading promotion cards...</p>
                      </div>
                    ) : promoCardsList.length === 0 ? (
                      <div className="p-12 text-center text-zinc-500">
                        <p className="text-xs">No custom cards found. Displaying system defaults on the storefront.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-950/40 text-[10px] font-black uppercase tracking-wider text-zinc-400 select-none">
                              <th className="p-4 w-12 text-center">Order</th>
                              <th className="p-4">Accent</th>
                              <th className="p-4">Badge</th>
                              <th className="p-4">Title &amp; Teaser Description</th>
                              <th className="p-4">Image Backdrop</th>
                              <th className="p-4">Redirect (CTA)</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {promoCardsList.map((card) => (
                              <tr key={card.id} className="hover:bg-zinc-950/20 text-xs transition-colors">
                                <td className="p-4 font-mono font-bold text-center text-indigo-400">{card.display_order}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-1.5 uppercase font-bold text-[10px] text-zinc-300">
                                    <span className={`w-2 h-2 rounded-full`} style={{
                                      backgroundColor: card.accent_color === "indigo" ? "#6366f1" :
                                                       card.accent_color === "purple" ? "#a855f7" :
                                                       card.accent_color === "pink" ? "#ec4899" :
                                                       card.accent_color === "emerald" ? "#10b981" :
                                                       card.accent_color === "blue" ? "#3b82f6" :
                                                       card.accent_color === "red" ? "#ef4444" :
                                                       card.accent_color === "amber" ? "#f59e0b" : "#71717a"
                                    }} />
                                    <span>{card.accent_color}</span>
                                  </div>
                                </td>
                                <td className="p-4 font-bold">
                                  <span className="text-zinc-300 text-[10px] font-bold tracking-wide">{card.badge || "No Badge"}</span>
                                </td>
                                <td className="p-4 space-y-0.5 max-w-sm">
                                  <div className="font-extrabold text-zinc-200 line-clamp-1">{card.title}</div>
                                  <div className="text-[11px] text-zinc-500 line-clamp-1">{card.description}</div>
                                </td>
                                <td className="p-4 font-mono text-zinc-500 text-[11px]">{card.image_url || "(Solid Gradient Only)"}</td>
                                <td className="p-4">
                                  <div className="font-bold text-zinc-300">{card.cta_text}</div>
                                  <div className="font-mono text-zinc-500 text-[11px]">{card.cta_href}</div>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingPromoCard(card)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Edit Card Settings"><Edit className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeletePromoCard(card.id)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer" title="Delete Card"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---- ANNOUNCEMENT TICKER SUB-PANEL ---- */}
            {storefrontSubTab === "ticker" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">

                  {/* Header */}
                  <div className="flex items-start justify-between mb-6 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Storefront Announcement Ticker</h3>
                        <p className="text-xs text-zinc-500 mt-0.5 select-none">This scrolling text bar is displayed between the navigation bar and the hero banner on the homepage.</p>
                      </div>
                    </div>
                  </div>

                  {loadingAnnouncement ? (
                    <div className="py-16 flex flex-col items-center justify-center text-zinc-500">
                      <Loader2 className="w-7 h-7 animate-spin text-zinc-400 mb-3" />
                      <p className="text-xs">Loading announcement settings...</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveAnnouncement} className="max-w-2xl space-y-5">

                      {/* Live Preview */}
                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-zinc-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-zinc-500 font-mono ml-2 select-none">Live Homepage Preview</span>
                        </div>
                        <div className="bg-black/40 py-2.5 px-4 overflow-hidden">
                          <div className="flex whitespace-nowrap">
                            <span className="animate-marquee text-[11px] font-bold tracking-widest text-amber-300 uppercase inline-block">
                              {announcementText || "⚡ Your announcement ticker text will appear here ⚡"}
                            </span>
                            <span aria-hidden className="animate-marquee text-[11px] font-bold tracking-widest text-amber-300 uppercase inline-block ml-16">
                              {announcementText || "⚡ Your announcement ticker text will appear here ⚡"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Text Input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500">Ticker Message</label>
                        <textarea
                          rows="3"
                          value={announcementText}
                          onChange={(e) => setAnnouncementText(e.target.value)}
                          placeholder="e.g. ⚡ NEXT-GEN 3D STUDIO COUTURE DROP LIVE · USE CODE THREAD3D FOR 20% OFF ⚡"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-sans transition-colors"
                        />
                        <p className="text-[10px] text-zinc-600 select-none">Use &middot; or · to separate phrases. Emoji symbols work great for eye-catching announcements.</p>
                      </div>

                      {/* Presets */}
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500">Quick Presets</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "⚡ NEXT-GEN 3D STUDIO COUTURE DROP LIVE · USE CODE THREAD3D FOR 20% OFF ⚡",
                            "🎉 NEW SEASON ARRIVALS ARE HERE · SHOP THE LATEST DROPS NOW ·",
                            "🔥 LIMITED TIME OFFER · FREE CUSTOMIZATION ON ALL ORDERS ABOVE ₹2000 ·",
                            "✨ CUSTOM JERSEYS · HOODIES · TEES · DESIGN YOURS IN 3D TODAY ·"
                          ].map((preset, idx) => (
                            <button key={idx} type="button" onClick={() => setAnnouncementText(preset)}
                              className="text-[10px] font-semibold text-zinc-400 hover:text-amber-300 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer text-left truncate max-w-xs"
                              title={preset}>
                              {preset.length > 60 ? preset.substring(0, 60) + "..." : preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2 border-t border-zinc-900">
                        <button type="submit" disabled={savingAnnouncement || !announcementText.trim()}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-md shadow-amber-500/10 cursor-pointer">
                          {savingAnnouncement ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></>) : (<><Check className="w-3.5 h-3.5" /><span>Save Announcement</span></>)}
                        </button>
                        <button type="button" onClick={() => setAnnouncementText("⚡ NEXT-GEN 3D STUDIO COUTURE DROP LIVE · USE CODE THREAD3D FOR 20% OFF ⚡")}
                          className="px-4 py-2.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">
                          Reset to Default
                        </button>
                      </div>

                    </form>
                  )}
                </div>

                {/* Info Card */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-300">About the Announcement Ticker</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      The ticker requires the <span className="font-mono font-bold text-zinc-300">storefront_settings</span> table in your Supabase database.
                      If the table is missing, a fallback default message is shown automatically on the storefront.
                      Run the SQL commands from <span className="font-mono font-bold text-zinc-300">schema.sql</span> in your Supabase SQL Editor to initialize the table.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ---- FLASH OFFERS SUB-PANEL ---- */}
            {storefrontSubTab === "flash-offer" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
                        <Percent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Flash Offers Manager</h3>
                        <p className="text-sm text-zinc-500 mt-0.5 select-none">
                          Start multiple simultaneous flash deals — first product is the hero spotlight.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Active offers list ── */}
                  {activeOffersList.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          {activeOffersList.length} Active Flash Sale{activeOffersList.length > 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          {offersTimeLeft && (
                            <span className="text-xs font-black text-rose-400 font-mono">{offersTimeLeft}</span>
                          )}
                          <button
                            type="button"
                            onClick={handleEndAllOffers}
                            disabled={savingOffer}
                            className="px-3 py-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-[10px] font-bold rounded-lg border border-rose-900/40 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> End All
                          </button>
                        </div>
                      </div>

                      {activeOffersList.map((offer, idx) => {
                        const prod = products.find(p => p.id === offer.product_id);
                        return (
                          <div
                            key={offer.product_id + idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${idx === 0 ? "bg-rose-500/5 border-rose-500/25" : "bg-zinc-950/60 border-zinc-800/60"}`}
                          >
                            {/* Badge for featured */}
                            {idx === 0 && (
                              <span className="shrink-0 text-[8px] bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                Hero
                              </span>
                            )}
                            {prod?.image_url ? (
                              <img src={prod.image_url} alt="" className="w-9 h-9 rounded-lg object-cover bg-zinc-900 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-zinc-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white truncate">{prod?.name || offer.product_id}</div>
                              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                <span className="capitalize">{prod?.category}</span>
                                <span>•</span>
                                <span className="text-rose-400 font-bold">{offer.discount_percent}% OFF</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEndSingleOffer(offer.product_id)}
                              disabled={savingOffer}
                              className="shrink-0 p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-lg border border-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
                              title="End this offer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Creation form ── */}
                  <form onSubmit={handleSaveFlashOffers} className="space-y-5">
                    <div className="space-y-3">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                        Products &amp; Discounts
                        <span className="ml-1.5 text-zinc-600 normal-case font-medium">(first product = hero spotlight)</span>
                      </label>

                      {flashOfferItems.map((row, idx) => (
                        <div
                          key={row._key}
                          className={`relative rounded-xl border p-3 space-y-2 ${idx === 0 ? "border-rose-500/20 bg-rose-500/3" : "border-zinc-800 bg-zinc-950/40"}`}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {/* Row label */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                              {idx === 0 ? "⭐ Hero / Featured Offer" : `Offer ${idx + 1}`}
                            </span>
                            {flashOfferItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOfferRow(row._key)}
                                className="text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2">
                            {/* Product search */}
                            <div className="relative">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                                <input
                                  type="text"
                                  value={row.searchQuery}
                                  onChange={(e) => {
                                    updateOfferRow(row._key, "searchQuery", e.target.value);
                                    updateOfferRow(row._key, "searchOpen", true);
                                  }}
                                  onFocus={() => updateOfferRow(row._key, "searchOpen", true)}
                                  placeholder="Search product…"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                                />
                                {row.product_id && (
                                  <button
                                    type="button"
                                    onClick={() => { updateOfferRow(row._key, "product_id", ""); updateOfferRow(row._key, "searchQuery", ""); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Selected chip */}
                              {row.product_id && !row.searchOpen && (
                                <div className="mt-1 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="text-xs font-semibold text-indigo-300 truncate">
                                    {products.find(p => p.id === row.product_id)?.name || row.product_id}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono ml-auto shrink-0">
                                    ₹{products.find(p => p.id === row.product_id)?.price || "—"}
                                  </span>
                                </div>
                              )}

                              {/* Dropdown */}
                              {row.searchOpen && (
                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 max-h-52 overflow-y-auto">
                                  {products
                                    .filter(p => {
                                      if (!row.searchQuery.trim()) return true;
                                      const q = row.searchQuery.toLowerCase();
                                      return (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q) || String(p.price).includes(q);
                                    })
                                    .slice(0, 20)
                                    .map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          updateOfferRow(row._key, "product_id", p.id);
                                          updateOfferRow(row._key, "searchQuery", p.name);
                                          updateOfferRow(row._key, "searchOpen", false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-zinc-900/80 transition-colors cursor-pointer border-b border-zinc-900/50 last:border-0 ${row.product_id === p.id ? "bg-indigo-500/10" : ""}`}
                                      >
                                        {p.image_url ? (
                                          <img src={p.image_url} alt="" className="w-8 h-8 rounded-md object-cover bg-zinc-900 shrink-0" />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-zinc-900 flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4 text-zinc-600" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                                          <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                            <span className="capitalize">{p.category}</span>
                                            <span>•</span>
                                            <span className="font-mono">₹{p.price}</span>
                                          </div>
                                        </div>
                                        {row.product_id === p.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                                      </button>
                                    ))}
                                  {products.filter(p => {
                                    if (!row.searchQuery.trim()) return true;
                                    const q = row.searchQuery.toLowerCase();
                                    return (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
                                  }).length === 0 && (
                                    <div className="px-4 py-6 text-center text-xs text-zinc-500">
                                      <Search className="w-5 h-5 mx-auto mb-2 opacity-40" />
                                      No products matching &ldquo;{row.searchQuery}&rdquo;
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Discount % */}
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-600 mb-1">Discount %</label>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                required
                                value={row.discount_percent}
                                onChange={(e) => updateOfferRow(row._key, "discount_percent", e.target.value)}
                                placeholder="10"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add another row */}
                      <button
                        type="button"
                        onClick={addOfferRow}
                        className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500/50 text-zinc-500 hover:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Another Product
                      </button>
                    </div>

                    {/* Shared Duration */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-2">
                        Offer Duration <span className="text-zinc-600 normal-case font-medium">(shared across all above)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block text-center">Days</span>
                          <input type="number" min="0" max="365" value={sharedOfferDays} onChange={(e) => setSharedOfferDays(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500 font-mono font-bold" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block text-center">Hours</span>
                          <input type="number" min="0" max="23" value={sharedOfferHours} onChange={(e) => setSharedOfferHours(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500 font-mono font-bold" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-600 block text-center">Minutes</span>
                          <input type="number" min="0" max="59" value={sharedOfferMinutes} onChange={(e) => setSharedOfferMinutes(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500 font-mono font-bold" />
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1.5 text-center font-medium">
                        Total: {(() => {
                          const d = parseInt(sharedOfferDays) || 0;
                          const h = parseInt(sharedOfferHours) || 0;
                          const m = parseInt(sharedOfferMinutes) || 0;
                          const total = (d * 24 * 60) + (h * 60) + m;
                          if (total === 0) return "Set a duration above";
                          const parts = [];
                          if (d > 0) parts.push(`${d} day${d > 1 ? "s" : ""}`);
                          if (h > 0) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
                          if (m > 0) parts.push(`${m} min${m > 1 ? "s" : ""}`);
                          return parts.join(", ") + ` (${total.toLocaleString()} min)`;
                        })()}
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-zinc-900">
                      <button
                        type="submit"
                        disabled={savingOffer}
                        className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-650 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/10 cursor-pointer"
                      >
                        {savingOffer ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Activating…</span></>
                        ) : (
                          <><Percent className="w-3.5 h-3.5" /><span>Start Flash Offer{flashOfferItems.filter(r => r.product_id).length > 1 ? "s" : ""}</span></>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}


            {/* ---- INVOICE SETTINGS SUB-PANEL ---- */}
            {storefrontSubTab === "invoice" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Default Invoice Settings</h3>
                        <p className="text-sm text-zinc-500 mt-0.5 select-none">
                          Configure common details rendered on customer order invoices (e.g. company name, address, email, and phone).
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveInvoiceSettings} className="max-w-2xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Company Name</label>
                        <input
                          type="text"
                          required
                          value={invoiceCompanyName}
                          onChange={(e) => setInvoiceCompanyName(e.target.value)}
                          placeholder="THREAD 3D APPAREL STUDIO"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Abbreviation (Code)</label>
                        <input
                          type="text"
                          required
                          value={invoiceCompanyAbbr}
                          onChange={(e) => setInvoiceCompanyAbbr(e.target.value)}
                          placeholder="T3D"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        required
                        value={invoiceAddressLine1}
                        onChange={(e) => setInvoiceAddressLine1(e.target.value)}
                        placeholder="102, Innovation & Sublimation Hub"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Address Line 2 (City, State, Zip, Country)</label>
                      <input
                        type="text"
                        required
                        value={invoiceAddressLine2}
                        onChange={(e) => setInvoiceAddressLine2(e.target.value)}
                        placeholder="Industrial Sector Phase II, Chennai, TN, India"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Support Email</label>
                        <input
                          type="email"
                          required
                          value={invoiceEmail}
                          onChange={(e) => setInvoiceEmail(e.target.value)}
                          placeholder="help@thread3d.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Support Phone</label>
                        <input
                          type="text"
                          required
                          value={invoicePhone}
                          onChange={(e) => setInvoicePhone(e.target.value)}
                          placeholder="+91 44 2390 1234"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Invoice Settings</span>
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

            {/* ---- DESIGNER CONSULTATION SUB-PANEL ---- */}
            {storefrontSubTab === "designer" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Personalized Designer Service Settings</h3>
                        <p className="text-sm text-zinc-500 mt-0.5 select-none">
                          Set the fee charged to hire a designer to create a custom design for customers via the chatbot.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveDesignerSettings} className="max-w-2xl space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Designer Service Fee (₹)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={designerFee}
                          onChange={(e) => setDesignerFee(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                        />
                        <p className="text-[10px] text-zinc-600 mt-1 font-medium">Amount in INR that customers pay to hire a designer. Set to 0 for free service.</p>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1">Service Status</label>
                        <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5">
                          <button
                            type="button"
                            onClick={() => setDesignerEnabled(!designerEnabled)}
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                              designerEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                            }`}
                          >
                            <span className="w-4 h-4 bg-white rounded-full shadow" />
                          </button>
                          <span className={`text-xs font-bold ${designerEnabled ? "text-emerald-400" : "text-zinc-500"}`}>
                            {designerEnabled ? "Enabled — Button visible in chatbot" : "Disabled — Hidden from chatbot"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-5 space-y-3">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 block">Customer Preview</span>
                      <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                          <span className="text-lg">🎨</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-extrabold text-white">Hire a Designer</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {parseInt(designerFee) > 0
                              ? `Hire a designer for ₹${parseInt(designerFee).toLocaleString("en-IN")}`
                              : "Free designer service available"}
                          </p>
                        </div>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          {parseInt(designerFee) > 0 ? `₹${parseInt(designerFee).toLocaleString("en-IN")}` : "FREE"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-zinc-900">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Designer Settings</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        ) : activeTab === "payment-settings" ? (
          /* ====== PAYMENT SETTINGS TAB ====== */
          <div className="space-y-6 animate-in fade-in duration-200">

            {loadingPaymentSettings ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                <p className="text-xs">Loading payment gateway settings...</p>
              </div>
            ) : (
              <>
                {/* Mock Payment Mode Toggle Card */}
                <div className={`border rounded-xl p-6 transition-all ${mockModeEnabled ? "bg-amber-500/5 border-amber-500/30" : "bg-zinc-900/20 border-zinc-900"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`p-1.5 rounded-md ${mockModeEnabled ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Mock Payment Mode (Test)</h3>
                        {mockModeEnabled && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
                        When enabled, checkout will bypass Razorpay and simulate payments instantly. Orders will be created with <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-amber-400">mock_test</code> as the payment gateway. Use this only for development or testing purposes.
                      </p>
                      {mockModeEnabled && (
                        <div className="mt-3 flex items-center gap-2 text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <p className="text-[11px] font-semibold">Real payments are currently disabled. Customers will not be charged.</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleMockMode(!mockModeEnabled)}
                      disabled={togglingMockMode}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        mockModeEnabled
                          ? "bg-amber-500 border-amber-500"
                          : "bg-zinc-800 border-zinc-700"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                        mockModeEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`} style={{ width: "20px", height: "20px", marginTop: "1.5px" }} />
                    </button>
                  </div>
                </div>

                {/* Razorpay Configuration Card */}
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Razorpay Gateway Configuration</h3>
                    {razorpayEnabled && keySecretConfigured && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        LIVE
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSavePaymentSettings} className="space-y-4">
                    {/* Enable Gateway Toggle */}
                    <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-white">Enable Razorpay Gateway</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">When enabled, live Razorpay payments will be processed.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRazorpayEnabled(!razorpayEnabled)}
                        className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                          razorpayEnabled
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-zinc-800 border-zinc-700"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                          razorpayEnabled ? "translate-x-4" : "translate-x-0.5"
                        }`} style={{ width: "16px", height: "16px", marginTop: "1px" }} />
                      </button>
                    </div>

                    {/* Key ID */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Razorpay Key ID</label>
                      <input
                        type="text"
                        value={razorpayKeyId}
                        onChange={(e) => setRazorpayKeyId(e.target.value)}
                        placeholder="rzp_live_xxxxxxxxxxxxx"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Key Secret */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Razorpay Key Secret
                        {keySecretConfigured && (
                          <span className="ml-2 text-emerald-400 normal-case font-semibold">(configured — leave blank to keep existing)</span>
                        )}
                      </label>
                      <input
                        type="password"
                        value={razorpayKeySecret}
                        onChange={(e) => setRazorpayKeySecret(e.target.value)}
                        placeholder={keySecretConfigured ? "••••••••••••••••" : "Enter Razorpay Key Secret"}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Webhook Secret (Optional)
                        {webhookSecretConfigured && (
                          <span className="ml-2 text-emerald-400 normal-case font-semibold">(configured)</span>
                        )}
                      </label>
                      <input
                        type="password"
                        value={razorpayWebhookSecret}
                        onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                        placeholder={webhookSecretConfigured ? "••••••••••••••••" : "Enter Webhook Secret"}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={handleTestPaymentCredentials}
                        disabled={testingPaymentCredentials || !razorpayKeyId.trim()}
                        className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {testingPaymentCredentials ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Test Credentials</span>
                      </button>
                      <button
                        type="submit"
                        disabled={savingPaymentSettings || !razorpayKeyId.trim()}
                        className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {savingPaymentSettings ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save Razorpay Settings</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Status Summary */}
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-3">Current Status</p>
                  <div className="flex flex-wrap gap-3">
                    <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${razorpayEnabled && keySecretConfigured ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                      Razorpay: {razorpayEnabled && keySecretConfigured ? "Active" : "Inactive"}
                    </div>
                    <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${mockModeEnabled ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                      Mock Mode: {mockModeEnabled ? "Enabled" : "Disabled"}
                    </div>
                    <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${keySecretConfigured ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                      Key Secret: {keySecretConfigured ? "Configured" : "Not Set"}
                    </div>
                    <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${webhookSecretConfigured ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                      Webhook: {webhookSecretConfigured ? "Configured" : "Not Set"}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        ) : activeTab === "logs" ? (
          /* ====== SECURITY AUDIT LOGS TAB ====== */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Security Audit Logs</h3>
              </div>
              <p className="text-xs text-zinc-500">Audit logs for admin actions are stored in the database system_logs table. Access these directly from your Supabase dashboard for detailed event history.</p>
            </div>
          </div>
        ) : null}
      </main>
      {activeAdmin3dModel && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Custom 3D Model Inspector</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">Apparel: <span className="font-bold text-zinc-300">{activeAdmin3dModelName}</span></p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setActiveAdmin3dModel(null);
                  setActiveAdmin3dModelName("");
                }}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Three.js Render Target container */}
            <div className="flex-1 bg-zinc-950 relative min-h-0">
              <div ref={adminThreeContainerRef} className="w-full h-full" />
              
              {/* Overlay Interactive Help controls */}
              <div className="absolute bottom-4 left-4 bg-zinc-900/85 backdrop-blur border border-zinc-800 rounded-xl p-3 max-w-xs space-y-1 select-none pointer-events-none">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Interactive controls:</p>
                <p className="text-sm text-zinc-300">• Drag left click to rotate mesh</p>
                <p className="text-sm text-zinc-300">• Pinch or scroll to zoom in/out</p>
                <p className="text-sm text-zinc-300">• Hold shift + drag to pan cameras</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-850 bg-zinc-900/50 flex justify-end">
              <button 
                onClick={() => {
                  setActiveAdmin3dModel(null);
                  setActiveAdmin3dModelName("");
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Catalog Product 3D Preview Modal */}
      {previewProduct3D && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Catalog Product 3D Preview</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Product: <span className="font-bold text-zinc-300">{previewProduct3D.name}</span></p>
                </div>
              </div>
              
              <button 
                onClick={() => setPreviewProduct3D(null)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 w-full bg-zinc-950 relative flex items-center justify-center">
              <div ref={adminCatalogPreviewRef} className="w-full h-full" />
              {loading3DPreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/70 text-white gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs text-zinc-400">Loading 3D asset pipeline...</p>
                </div>
              )}
            </div>

            {/* Instruction Footer */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-850 text-center text-xs text-zinc-500">
              Drag to rotate. Scroll to zoom. Hold shift to pan.
            </div>

          </div>
        </div>
      )}

      {/* Printable Invoice Modal Overlay */}
      {printingInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-invoice-body, #printable-invoice-body * {
                visibility: visible;
              }
              #printable-invoice-body {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: auto;
                margin: 0;
                padding: 20px;
                box-shadow: none;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header bar */}
            <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-sans">Order Invoice Inspector</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </button>
                <button 
                  onClick={() => setPrintingInvoiceOrder(null)}
                  className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Invoice Printable Body */}
            <div id="printable-invoice-body" className="p-8 overflow-y-auto max-h-[75vh] bg-white text-zinc-900 font-sans text-left space-y-6">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-extrabold text-sm uppercase">
                      {invoiceCompanyAbbr || "T3D"}
                    </div>
                    <span className="font-extrabold text-sm tracking-tight text-zinc-950 uppercase">{invoiceCompanyName || "THREAD 3D APPAREL STUDIO"}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {invoiceAddressLine1 || "102, Innovation & Sublimation Hub"}<br />
                    {invoiceAddressLine2 || "Industrial Sector Phase II, Chennai, TN, India"}<br />
                    {invoiceEmail || "help@thread3d.com"} | {invoicePhone || "+91 44 2390 1234"}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">INVOICE</h2>
                  <p className="text-xs text-zinc-500 mt-1">Invoice ID: <span className="font-mono font-bold text-zinc-800">#{printingInvoiceOrder.id.substring(0, 8).toUpperCase()}</span></p>
                  <p className="text-xs text-zinc-500">Date: <span className="font-bold text-zinc-800">{new Date(printingInvoiceOrder.created_at).toLocaleDateString()}</span></p>
                  <p className="text-xs text-zinc-500">Payment: <span className="font-bold text-zinc-800 uppercase">{printingInvoiceOrder.payment_gateway || "Razorpay"}</span></p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div>
                  <h3 className="font-bold text-zinc-400 uppercase tracking-wider mb-2">Bill To</h3>
                  <p className="font-bold text-sm text-zinc-800">{printingInvoiceOrder.customer_name || "Guest Customer"}</p>
                  <p className="text-zinc-600 mt-1">{printingInvoiceOrder.customer_email || "no-email@thread3d.com"}</p>
                  {printingInvoiceOrder.customer_phone && (
                    <p className="text-zinc-600 mt-0.5">Phone: {printingInvoiceOrder.customer_phone}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-400 uppercase tracking-wider mb-2">Shipping Destination</h3>
                  <p className="text-zinc-700 leading-relaxed">
                    {typeof (printingInvoiceOrder.shipping_address || printingInvoiceOrder.shipping_details) === "object" && (printingInvoiceOrder.shipping_address || printingInvoiceOrder.shipping_details) !== null
                      ? (() => {
                          const addrObj = printingInvoiceOrder.shipping_address || printingInvoiceOrder.shipping_details;
                          return `${addrObj.address || ""}${addrObj.city ? `, ${addrObj.city}` : ""} ${addrObj.zip || ""}`.trim() || "Standard Customization Depot";
                        })()
                      : (printingInvoiceOrder.shipping_address || printingInvoiceOrder.shipping_details || "Standard Customization Depot")}
                  </p>
                  {printingInvoiceOrder.carrier && (
                    <p className="text-zinc-600 mt-2">Carrier: <span className="font-bold text-zinc-800">{printingInvoiceOrder.carrier}</span></p>
                  )}
                  {printingInvoiceOrder.tracking_number && (
                    <p className="text-zinc-600 mt-0.5">Tracking ID: <span className="font-mono font-bold text-zinc-800">{printingInvoiceOrder.tracking_number}</span></p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-zinc-200 rounded-lg overflow-hidden mt-4">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Item Details</th>
                      <th className="p-3 text-center">Size</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-800">
                    {(printingInvoiceOrder.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium">
                          <div>{item.name || "Custom Apparel"}</div>
                          {(item.customName || item.customNumber) && (
                            <div className="text-[10px] text-indigo-600 mt-0.5 font-bold uppercase">
                              Specs: {item.customName ? `NAME: ${item.customName}` : ""} {item.customNumber ? `NUMBER: ${item.customNumber}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">{item.size || "M"}</td>
                        <td className="p-3 text-center">{item.quantity || 1}</td>
                        <td className="p-3 text-right font-mono">₹{(item.price || 3999).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-semibold">₹{((item.price || 3999) * (item.quantity || 1)).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial calculations */}
              <div className="flex justify-end text-xs pt-4">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{((printingInvoiceOrder.total_amount || printingInvoiceOrder.total) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Shipping fee:</span>
                    <span className="font-mono text-emerald-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 border-t border-zinc-150 pt-2 font-bold text-sm text-zinc-950">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-600">₹{((printingInvoiceOrder.total_amount || printingInvoiceOrder.total) || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Thank you note */}
              <div className="text-center pt-8 border-t border-zinc-200 text-zinc-400 text-[10px]">
                <p>This is a computer-generated invoice. No physical signature is required.</p>
                <p className="mt-1 font-bold">Thank you for supporting {invoiceCompanyName || "3D Apparel Studio"} innovation!</p>
              </div>

            </div>

            {/* Modal actions */}
            <div className="p-3 border-t border-zinc-850 bg-zinc-900 flex justify-end gap-2 no-print">
              <button 
                onClick={() => setPrintingInvoiceOrder(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Customer Email Preview Modal Overlay */}
      {simulatedEmail && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header bar */}
            <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans select-none">Simulated Automated Email Notification</span>
              </div>
              <button 
                onClick={() => setSimulatedEmail(null)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Body Preview */}
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-zinc-950 font-sans text-left space-y-4">
              
              {/* Meta headers */}
              <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 text-xs text-zinc-400 space-y-1 font-mono">
                <p><span className="text-zinc-600 font-bold">FROM:</span> fulfillment@thread3d.com</p>
                <p><span className="text-zinc-600 font-bold">TO:</span> {simulatedEmail.to}</p>
                <p><span className="text-zinc-600 font-bold">SUBJECT:</span> Your Custom Apparel Order #{simulatedEmail.orderId.substring(0, 8)} is now {simulatedEmail.status.toUpperCase()}!</p>
              </div>

              {/* Styled Email HTML Preview */}
              <div className="bg-white text-zinc-900 rounded-xl p-6 space-y-5 shadow-inner">
                {/* Logo */}
                <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-4">
                  <div className="w-7 h-7 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded flex items-center justify-center text-white font-extrabold text-xs">
                    T3D
                  </div>
                  <span className="font-extrabold text-xs tracking-tight text-zinc-900 select-none">THREAD 3D APPAREL SaaS</span>
                </div>

                {/* Greeting */}
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-zinc-900">Order Shipment Update</h3>
                  <p className="text-xs text-zinc-600">Hi {simulatedEmail.customerName},</p>
                </div>

                {/* Update message */}
                <div className="bg-indigo-50/70 border border-indigo-100/50 rounded-lg p-3 text-xs text-indigo-900">
                  <p className="leading-relaxed">
                    Great news! Your customized physical apparel order <strong>#{simulatedEmail.orderId.substring(0, 8)}</strong> status has been updated to <strong>{simulatedEmail.status.replace("_", " ").toUpperCase()}</strong>.
                  </p>
                </div>

                {/* Stepper equivalent inside email */}
                <div className="border border-zinc-100 rounded-lg p-3.5 space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">Transit Details</span>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-sm text-zinc-400 font-semibold uppercase">Shipping Carrier</p>
                      <p className="font-bold text-zinc-800 mt-0.5">{simulatedEmail.carrier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 font-semibold uppercase">Tracking Number</p>
                      <p className="font-mono font-bold text-indigo-600 mt-0.5 select-all">{simulatedEmail.trackingNumber}</p>
                    </div>
                  </div>
                  
                  {simulatedEmail.status === "shipped" && (
                    <div className="pt-3 border-t border-zinc-100 mt-3 text-center">
                      <a 
                        href={`https://www.google.com/search?q=${simulatedEmail.carrier}+${simulatedEmail.trackingNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg text-center transition-colors shadow-md shadow-indigo-600/10"
                      >
                        Track Shipment Delivery
                      </a>
                    </div>
                  )}
                </div>

                {/* Items preview list */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-100 pb-1.5 select-none">Order Summary</span>
                  {simulatedEmail.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-zinc-800">
                      <span>{item.name} ({item.size}) x {item.quantity}</span>
                      <span className="font-mono font-semibold">₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-950 pt-2 border-t border-zinc-100">
                    <span>Total Charged Amount:</span>
                    <span className="font-mono text-emerald-600">₹{simulatedEmail.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-sm text-zinc-400 pt-4 border-t border-zinc-100 text-center leading-relaxed select-none">
                  <p>Thank you for customizing with Thread 3D Apparel Studio!</p>
                  <p className="mt-0.5">If you have any questions, reach out to help@thread3d.com</p>
                </div>
              </div>

            </div>

            {/* Modal actions */}
            <div className="p-3 border-t border-zinc-850 bg-zinc-900 flex justify-end">
              <button 
                onClick={() => setSimulatedEmail(null)}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
