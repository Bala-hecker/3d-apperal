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
  Coins
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
    currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    currentEnd = now;
    prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else if (timeframe === "monthly") {
    currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
  const [selectedBaseTemplateId, setSelectedBaseTemplateId] = useState("");
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  // Edit Product Extensions
  const [editDescription, setEditDescription] = useState("");
  const [editGalleryUrls, setEditGalleryUrls] = useState("");
  const [editIsTemplate, setEditIsTemplate] = useState(false);
  const [editGalleryFiles, setEditGalleryFiles] = useState([]);

  const handleRemoveExistingGalleryImage = (urlToRemove) => {
    const current = (editGalleryUrls || "").split(",").map(u => u.trim()).filter(Boolean);
    const updated = current.filter(u => u !== urlToRemove);
    setEditGalleryUrls(updated.join(","));
  };

  // Sub tab selection
  const [adminInventorySubTab, setAdminInventorySubTab] = useState("standard");

  // Dynamic Category Management
  const [catalogCategories, setCatalogCategories] = useState(DEFAULT_CATEGORIES);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [categoryError, setCategoryError] = useState("");

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
      const csvRows = [];
      const headers = [
        "Order ID",
        "Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Total Amount (INR)",
        "Status",
        "Carrier",
        "Tracking Number",
        "Payment Gateway",
        "Items Summary"
      ];
      csvRows.push(headers.join(","));

      for (const order of filteredOrders) {
        const itemsSummary = (order.items || [])
          .map(item => `${item.name} (${item.size || "M"}) x ${item.quantity || 1}`)
          .join(" | ");

        const values = [
          order.id,
          new Date(order.created_at).toLocaleDateString(),
          `"${(order.customer_name || "Guest").replace(/"/g, '""')}"`,
          order.customer_email || "",
          order.customer_phone || "",
          order.total_amount || order.total || 0,
          order.status || "processing",
          order.carrier || "",
          order.tracking_number || "",
          order.payment_gateway || "razorpay",
          `"${itemsSummary.replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(","));
      }

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export Failed:", err);
      alert("Failed to export orders as CSV.");
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

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
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

    // B. Combine kept existing URLs with the newly uploaded URLs!
    const existingList = (editGalleryUrls || "").split(",").map(u => u.trim()).filter(Boolean);
    const combinedUrlsList = [...existingList, ...newlyUploadedUrls];
    const finalGalleryUrls = combinedUrlsList.join(",");

    const finalDescription = editIsTemplate
      ? editDescription
      : `${editDescription || ""}\n<!--PERS:NAME=${editAllowNamePersonalization ? "true" : "false"},NUMBER=${editAllowNumberPersonalization ? "true" : "false"}-->\n<!--STOCK:STATUS=${editStockStatus}-->`;

    // First try: name, price, category, description, gallery_urls, is_template update
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: editName,
          price: parsedPrice,
          category: editCategory,
          description: finalDescription,
          gallery_urls: finalGalleryUrls,
          is_template: editIsTemplate,
          allow_name: editAllowNamePersonalization,
          allow_number: editAllowNumberPersonalization,
          stock_status: editStockStatus
        })
        .eq("id", productId);

      if (!error) {
        updateSuccess = true;
      } else {
        console.warn("Category/Extensions update failed, retrying standard columns...", error.message);
        const { error: retryError } = await supabase
          .from("products")
          .update({
            name: editName,
            price: parsedPrice,
            category: editIsTemplate ? "custom-template" : editCategory
          })
          .eq("id", productId);

        if (!retryError) {
          updateSuccess = true;
        } else {
          const { error: nameOnlyError } = await supabase
            .from("products")
            .update({
              name: editName
            })
            .eq("id", productId);
          
          if (!nameOnlyError) {
            updateSuccess = true;
          }
        }
      }
    } catch (err) {
      console.warn("Direct update exception, attempting fallback:", err.message);
      try {
        const { error: nameOnlyError } = await supabase
          .from("products")
          .update({
            name: editName
          })
          .eq("id", productId);
        if (!nameOnlyError) {
          updateSuccess = true;
        }
      } catch (innerErr) {
        console.error("Double fallback failed:", innerErr);
      }
    }

    // Always update local products state & audit log to provide seamless operation
    await addAuditLog(`Updated base product details for ID #${productId.substring(0, 8)}. New Name: "${editName}", Category: "${editCategory}", Price: ₹${parsedPrice.toLocaleString('en-IN')}, Type: ${editIsTemplate ? 'Template' : 'Standard'}.`);
    
    // Save technical specs to localStorage keyed by product ID
    try {
      localStorage.setItem(`apparel_specs_${productId}`, JSON.stringify(editSpecs.filter(s => s.key.trim() && s.val.trim())));
      // Save personalization preference
      // Save personalization & stock preference
      if (!editIsTemplate) {
        localStorage.setItem(`apparel_personalization_${productId}`, (editAllowNamePersonalization || editAllowNumberPersonalization) ? "true" : "false");
        localStorage.setItem(`apparel_pers_name_${productId}`, editAllowNamePersonalization ? "true" : "false");
        localStorage.setItem(`apparel_pers_number_${productId}`, editAllowNumberPersonalization ? "true" : "false");
        localStorage.setItem(`apparel_stock_${productId}`, editStockStatus);
      }
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
      stock_status: editStockStatus
    } : p);
    setProducts(updatedProductsList);
    try {
      localStorage.setItem("apparel_products_local", JSON.stringify(updatedProductsList));
    } catch (e) { /* ignore */ }
    setEditGalleryFiles([]); // Clear selected file list
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
      if (!name || !glbFile || !textureFile) {
        setStatusMsg({ type: "error", text: "All fields (Name, GLB Model, and Texture) are required for templates." });
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

      const galleryUrlsString = uploadedGalleryUrls.join(",");

      const finalDescription = isTemplate
        ? description
        : `${description || ""}\n<!--PERS:NAME=${allowNamePersonalization ? "true" : "false"},NUMBER=${allowNumberPersonalization ? "true" : "false"}-->\n<!--STOCK:STATUS=${stockStatus}-->`;

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
        stock_status: stockStatus
      };

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
      if (newProductId && !isTemplate) {
        try {
          localStorage.setItem(`apparel_personalization_${newProductId}`, (allowNamePersonalization || allowNumberPersonalization) ? "true" : "false");
          localStorage.setItem(`apparel_pers_name_${newProductId}`, allowNamePersonalization ? "true" : "false");
          localStorage.setItem(`apparel_pers_number_${newProductId}`, allowNumberPersonalization ? "true" : "false");
          localStorage.setItem(`apparel_stock_${newProductId}`, stockStatus);
        } catch (e) { /* ignore */ }
      }

      setStatusMsg({ type: "success", text: "Product uploaded and created successfully!" });
      setName("");
      setPrice("3999");
      setGlbFile(null);
      setTextureFile(null);
      setDescription("");
      setGalleryFiles([]);
      setIsTemplate(false);
      setAllowPersonalization(false);
      setAllowNamePersonalization(false);
      setAllowNumberPersonalization(false);
      setSelectedBaseTemplateId("");
      
      // Reset file input elements manually safely
      const glbInput = document.getElementById("glb-input");
      if (glbInput) glbInput.value = "";
      
      const textureInput = document.getElementById("texture-input");
      if (textureInput) textureInput.value = "";
      
      const galleryInput = document.getElementById("gallery-input");
      if (galleryInput) galleryInput.value = "";

      // Refresh product list
      fetchProducts();

    } catch (err) {
      console.error("Full Error Object:", err);
      console.error("Error Message:", err.message);
      console.error("Error Details:", err.details);
      console.error("Error Hint:", err.hint);
      console.error("Error Code:", err.code);

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

        const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const parsedPrice = parseFloat(price) || 3999;
        
        const finalDescription = isTemplate
          ? description
          : `${description || ""}\n<!--PERS:NAME=${allowNamePersonalization ? "true" : "false"},NUMBER=${allowNumberPersonalization ? "true" : "false"}-->\n<!--STOCK:STATUS=${stockStatus}-->`;

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
        if (!isTemplate) {
          localStorage.setItem(`apparel_personalization_${fallbackId}`, (allowNamePersonalization || allowNumberPersonalization) ? "true" : "false");
          localStorage.setItem(`apparel_pers_name_${fallbackId}`, allowNamePersonalization ? "true" : "false");
          localStorage.setItem(`apparel_pers_number_${fallbackId}`, allowNumberPersonalization ? "true" : "false");
          localStorage.setItem(`apparel_stock_${fallbackId}`, stockStatus);
        }

        setStatusMsg({ 
          type: "success", 
          text: "Database connection timed out! Product saved successfully to your offline catalog fallback. It is fully active in the storefront!" 
        });

        // Reset form inputs
        setName("");
        setPrice("3999");
        setGlbFile(null);
        setTextureFile(null);
        setDescription("");
        setGalleryFiles([]);
        setIsTemplate(false);
        setAllowPersonalization(false);
        setAllowNamePersonalization(false);
        setAllowNumberPersonalization(false);
        setStockStatus("in_stock");
        setSelectedBaseTemplateId("");
        
        const glbInput = document.getElementById("glb-input");
        if (glbInput) glbInput.value = "";
        
        const textureInput = document.getElementById("texture-input");
        if (textureInput) textureInput.value = "";
        
        const galleryInput = document.getElementById("gallery-input");
        if (galleryInput) galleryInput.value = "";

        await addAuditLog(`Registered new product "${name}" (Type: ${isTemplate ? 'Template' : 'Standard'}) locally due to Supabase connection timeout fallback.`);
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
              setActiveTab("orders");
              fetchOrders();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Customer Orders</span>
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
              setActiveTab("qa");
              fetchGlobalFaqs();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "qa"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Customer Q&A</span>
            {globalFaqs.filter(faq => !faq.answer || faq.answer.includes("Thank you for asking")).length > 0 && (
              <span className="bg-rose-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {globalFaqs.filter(faq => !faq.answer || faq.answer.includes("Thank you for asking")).length}
              </span>
            )}
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
              setActiveTab("sales-stats");
              fetchOrders();
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "sales-stats"
                ? "border-indigo-500 text-indigo-400 font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Sales & Analytics</span>
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
        </section>

        {activeTab === "catalog" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left/Form Section */}
            <div className="md:col-span-1">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 backdrop-blur-xl sticky top-24">
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
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Product Price */}
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
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-550 focus:ring-1 focus:ring-indigo-550 cursor-pointer"
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
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
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
                          <p className="text-sm text-zinc-600 mt-1">PNG, JPG up to 5 files</p>
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

                  {/* Conditionally render GLB upload box for templates. Ready-made standard catalog products require no GLB upload or templates dropdown selector. */}
                  {isTemplate && (
                    /* GLB File Upload (Mesh Template mode) */
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
                          <p className="text-sm text-zinc-600 mt-1">Stitch canvas template mesh geometry</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Texture File or Main Display Photo (Always required) */}
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
                        <p className="text-sm text-zinc-600 mt-1">PNG, JPG, SVG up to 5MB</p>
                      </div>
                    </div>
                  </div>

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

            {/* Right/List Section */}
            <div className="md:col-span-2 space-y-6">

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
                <div className="flex flex-wrap gap-2 mb-4">
                  {catalogCategories.map((cat) => {
                    const isDefault = DEFAULT_CATEGORIES.some(d => d.id === cat.id);
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-300 group"
                      >
                        <span className="text-xs font-mono text-zinc-600 mr-0.5">{cat.id}</span>
                        <span>{cat.label}</span>
                        {isDefault ? (
                          <span className="text-sm bg-zinc-900 text-zinc-600 border border-zinc-800 rounded px-1 py-px ml-1 uppercase tracking-wider select-none">default</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="ml-1 p-0.5 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title={`Delete ${cat.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

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
                </div>

                {loadingProducts ? (
                  <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
                    <p className="text-xs">Loading items from database...</p>
                  </div>
                ) : products.filter(p => {
                    const isTemp = isTemplateProduct(p);
                    return adminInventorySubTab === "template" ? isTemp : !isTemp;
                  }).length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-lg bg-zinc-950/20 select-none">
                    <Package className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                    <p className="text-xs text-zinc-500 font-semibold">No {adminInventorySubTab === "template" ? "customizer templates" : "catalog items"} found here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.filter(p => {
                      const isTemp = isTemplateProduct(p);
                      return adminInventorySubTab === "template" ? isTemp : !isTemp;
                    }).map((product) => (
                      <div 
                        key={product.id}
                        className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all flex flex-col justify-between group shadow-sm min-h-[220px]"
                      >
                        {editingProduct === product.id ? (
                          <div className="space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-2.5">
                              <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Edit Product Details</h4>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Product Name</label>
                                <input 
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Base Price (₹ INR)</label>
                                <input 
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Category</label>
                                <select 
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                  {catalogCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Product Type</label>
                                  <select 
                                    value={editIsTemplate ? "template" : "standard"}
                                    onChange={(e) => setEditIsTemplate(e.target.value === "template")}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="standard">Standard Catalog Product</option>
                                    <option value="template">3D Customizer Template</option>
                                  </select>
                                </div>

                                {/* Stock Availability Selector */}
                                {!editIsTemplate && (
                                  <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Stock Availability</label>
                                    <select 
                                      value={editStockStatus}
                                      onChange={(e) => setEditStockStatus(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                      <option value="in_stock">In Stock (Default)</option>
                                      <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Description</label>
                                  <textarea 
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows="2"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-y"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 select-none">
                                    Product Gallery Images
                                  </label>
                                  
                                  {/* Current Gallery Thumbnails Grid */}
                                  {editGalleryUrls ? (
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                      {editGalleryUrls.split(",").map((url, idx) => (
                                        <div key={idx} className="aspect-square bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative group">
                                          <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveExistingGalleryImage(url)}
                                            className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded transition-colors cursor-pointer"
                                            title="Delete image"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-zinc-650 mb-2 select-none italic">No gallery images uploaded yet.</p>
                                  )}

                                  {/* Select new gallery files uploader */}
                                  <div className="relative border border-dashed border-zinc-850 rounded-xl p-3 bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors">
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
                                      <ImageIcon className={`w-5 h-5 mb-1.5 ${editGalleryFiles.length > 0 ? "text-indigo-400" : "text-zinc-500"}`} />
                                      <p className="text-[11px] font-semibold text-zinc-400">
                                        {editGalleryFiles.length > 0 ? `${editGalleryFiles.length} new photos selected` : "Upload more photos"}
                                      </p>
                                      <p className="text-[10px] text-zinc-650 mt-0.5">PNG, JPG up to 5MB</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Personalization Options */}
                                {!editIsTemplate && (
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-zinc-900/30 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
                                      <div>
                                        <h4 className="text-sm font-bold text-zinc-300">Allow Custom Name</h4>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">Allow customized names overlay.</p>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          className="sr-only peer"
                                          checked={editAllowNamePersonalization}
                                          onChange={(e) => setEditAllowNamePersonalization(e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                                      </label>
                                    </div>

                                    <div className="bg-zinc-900/30 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
                                      <div>
                                        <h4 className="text-sm font-bold text-zinc-300">Allow Custom Number</h4>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">Allow customized jersey numbers.</p>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          className="sr-only peer"
                                          checked={editAllowNumberPersonalization}
                                          onChange={(e) => setEditAllowNumberPersonalization(e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                                      </label>
                                    </div>
                                  </div>
                                )}
                                
                                {/* ── Technical Specifications Editor ── */}
                                <div className="pt-2 border-t border-zinc-800/40">
                                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 select-none flex items-center gap-1">
                                    Technical Specifications
                                  </label>
                                  <div className="space-y-2 mb-3">
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
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-sans"
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
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-sans"
                                          />
                                        </div>
                                        <button
                                          onClick={() => setEditSpecs(editSpecs.filter((_, i) => i !== idx))}
                                          className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer shrink-0"
                                          title="Remove specification"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="bg-zinc-950/20 p-2.5 border border-dashed border-zinc-800 rounded-xl space-y-2">
                                    <input
                                      type="text"
                                      value={newSpecKey}
                                      onChange={(e) => setNewSpecKey(e.target.value)}
                                      placeholder="New Spec Name (e.g. Fit Profile)"
                                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 placeholder-zinc-800 font-sans"
                                    />
                                    <input
                                      type="text"
                                      value={newSpecVal}
                                      onChange={(e) => setNewSpecVal(e.target.value)}
                                      placeholder="New Spec Value (e.g. Regular Fit)"
                                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 placeholder-zinc-800 font-sans"
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
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-zinc-800/50">
                              <button
                                onClick={() => handleSaveEditProduct(product.id)}
                                disabled={savingEdit}
                                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded text-sm transition-colors cursor-pointer"
                              >
                                {savingEdit ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="flex-1 text-center bg-zinc-850 hover:bg-zinc-800 text-zinc-400 font-bold py-1.5 px-3 rounded text-sm transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              {/* Thumbnail or placeholder */}
                              <div className="w-full aspect-[4/3] bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative mb-3.5 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                                <img 
                                  src={product.texture_url} 
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
                            </div>

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
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : activeTab === "orders" ? (
          /* Customer Orders Panel View */
          <div className="space-y-6">
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
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={fetchOrders}
                    className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Sync Orders
                  </button>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col md:flex-row items-center gap-3 mb-6 bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl select-none">
                <div className="relative w-full md:flex-1">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search orders by customer name, email, or order ID..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto py-1">
                  {["all", "processing", "shipped", "delivered"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        orderStatusFilter === status
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-extrabold"
                          : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-300 hover:border-zinc-800"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {loadingOrders ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Fetching custom transactions...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-950/20 max-w-xl mx-auto">
                  <ShoppingBag className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-sm font-semibold text-zinc-400">No transactions match your search filter.</p>
                  <p className="text-xs text-zinc-500 mt-1">Try resetting the status filter or modifying search terms.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-800 rounded-xl p-5 space-y-4 shadow-inner"
                    >
                      {/* Header of order */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-900 pb-3.5">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded">
                              {order.id}
                            </span>
                            <span className={`text-xs font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              order.status === "payment_pending" ? "text-amber-500 bg-amber-500/10 border border-amber-500/20" :
                              order.status === "processing" ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 animate-pulse" :
                              order.status === "in_production" ? "text-purple-400 bg-purple-500/10 border border-purple-500/20" :
                              order.status === "shipped" ? "text-sky-400 bg-sky-500/10 border border-sky-500/20" :
                              order.status === "delivered" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" :
                              "text-zinc-400 bg-zinc-500/10 border border-zinc-500/20"
                            }`}>
                              {order.status === "payment_pending" ? "payment pending" :
                               order.status === "processing" ? "processing" :
                               order.status === "in_production" ? "in production" :
                               order.status === "shipped" ? "shipped" :
                               order.status === "delivered" ? "delivered" :
                               order.status || "Pending"}
                            </span>
                          </div>
                          <span className="text-sm text-zinc-500 mt-1.5 block">
                            Order Date: {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Change status action */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setUpdatingOrderId(order.id);
                              setStatusInput(order.status || "processing");
                              setCarrierInput(order.carrier || "FedEx");
                              setTrackingNumberInput(order.tracking_number || "");
                            }}
                            className="text-sm font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Update Fulfillment
                          </button>

                          <button
                            onClick={() => setPrintingInvoiceOrder(order)}
                            className="p-1.5 bg-zinc-950 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/20 text-zinc-500 hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
                            title="Print Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1.5 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Fulfillment Update Section */}
                      {updatingOrderId === order.id && (
                        <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-4 space-y-3.5">
                          <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                            <span>Modify Fulfillment & Carrier Shipments</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 select-none">Fulfillment Phase</label>
                              <select
                                value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="payment_pending">Payment Pending</option>
                                <option value="processing">Processing</option>
                                <option value="in_production">In Production</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 select-none">Carrier Name</label>
                              <input
                                type="text"
                                value={carrierInput}
                                onChange={(e) => setCarrierInput(e.target.value)}
                                placeholder="e.g. FedEx, DHL, UPS"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 select-none">Tracking Number</label>
                              <input
                                type="text"
                                value={trackingNumberInput}
                                onChange={(e) => setTrackingNumberInput(e.target.value)}
                                placeholder="e.g. TRK12345678"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end pt-2 border-t border-zinc-900">
                            <button
                              onClick={() => handleSaveFulfillment(order.id, statusInput, carrierInput, trackingNumberInput)}
                              className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-1.5 rounded cursor-pointer transition-all shadow-md shadow-indigo-500/20"
                            >
                              Commit Fulfillment details
                            </button>
                            <button
                              onClick={() => setUpdatingOrderId(null)}
                              className="text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display active tracking info */}
                      {order.tracking_number && (
                        <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg px-4 py-2 flex items-center justify-between text-sm text-zinc-400">
                          <span className="font-semibold uppercase tracking-wider text-sm text-zinc-500">Shipping Details:</span>
                          <span className="flex items-center gap-1.5 font-bold text-white">
                            {order.carrier} — <span className="font-mono text-indigo-400 select-all">{order.tracking_number}</span>
                          </span>
                        </div>
                      )}

                      {/* Main Grid Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Customer Address Card */}
                        <div className="md:col-span-1 space-y-2 bg-zinc-950/30 border border-zinc-900 rounded-lg p-4">
                          <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900/60 pb-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Shipping Address</span>
                          </h4>
                          <div className="text-sm space-y-1 text-zinc-300">
                            <p className="font-semibold text-white">{order.customer_name}</p>
                            <p className="text-zinc-500">{order.customer_email}</p>
                            <p className="flex items-center gap-1 text-zinc-400 mt-1">
                              <Phone className="w-2.5 h-2.5 text-zinc-500" />
                              <span>{order.customer_phone}</span>
                            </p>
                            <div className="border-t border-zinc-900 mt-2.5 pt-2 text-zinc-400 leading-relaxed font-medium">
                              <p>{order.shipping_address?.address || order.shipping_address}</p>
                              <p className="mt-0.5">{order.shipping_address?.city}, {order.shipping_address?.zip}</p>
                            </div>
                          </div>
                        </div>

                        {/* Order Items & Design Preview Cards */}
                        <div className="md:col-span-2 space-y-2.5">
                          <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900/60 pb-1.5">
                            <Package className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ordered Items</span>
                          </h4>
                          
                          <div className="space-y-2">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-3 flex gap-4 items-center">
                                {/* 3D Printable Canvas preview */}
                                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded overflow-hidden shrink-0 relative flex items-center justify-center group/img">
                                  <img
                                    src={item.customDesignUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-0.5 right-0.5 bg-indigo-600 text-white text-[7px] font-extrabold px-1 rounded uppercase tracking-tighter shadow-md">
                                    {item.size}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                                  <p className="text-sm text-zinc-500 mt-0.5 font-medium">
                                    Qty: <span className="font-bold text-zinc-300">{item.quantity}</span> | Customized Base
                                  </p>
                                  <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <button
                                      onClick={async () => {
                                        let customDesign = item.customDesignUrl;
                                        if ((!customDesign || customDesign === "[Cached]") && item.designCacheKey) {
                                          const cached = await getDesignData(item.designCacheKey);
                                          if (cached) {
                                            customDesign = cached.customDesignUrl;
                                          }
                                        }
                                        const w = window.open();
                                        w.document.write(`
                                          <html>
                                            <head><title>Apparel Print Layout - ${item.name}</title></head>
                                            <body style="background:#0c0c0e; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-center; height:100vh; margin:0; padding:20px;">
                                              <h3 style="margin-bottom:15px; font-weight:bold;">Custom printable PNG decal target:</h3>
                                              <img src="${customDesign}" style="max-width:512px; max-height:512px; border:2px dashed #4f46e5; border-radius:12px; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.5);" />
                                              <p style="color:#71717a; font-size:12px; mt:15px;">Right-click custom png to save high-definition canvas asset.</p>
                                            </body>
                                          </html>
                                        `);
                                        w.document.close();
                                      }}
                                      className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors"
                                    >
                                      View Printable HD Decal
                                    </button>

                                    {(item.customGlbBase64 || item.designCacheKey) && (
                                      <button
                                        onClick={async () => {
                                          let base64Model = item.customGlbBase64;
                                          if ((!base64Model || base64Model === "[Cached]") && item.designCacheKey) {
                                            const cached = await getDesignData(item.designCacheKey);
                                            if (cached) {
                                              base64Model = cached.customGlbBase64;
                                            }
                                          }
                                          if (base64Model && base64Model !== "[Cached]") {
                                            setActiveAdmin3dModel(base64Model);
                                            setActiveAdmin3dModelName(item.name);
                                          } else {
                                            alert("Interactive 3D model asset is not found in cloud database or local IndexedDB cache.");
                                          }
                                        }}
                                        className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors flex items-center gap-1"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Load in 3D Viewer</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleDownloadZip(order, item)}
                                      className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download ZIP Package</span>
                                    </button>
                                  </div>
                                </div>

                                <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                                  ₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer Total */}
                      <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-xs bg-zinc-950/20 px-4 py-2.5 rounded-lg">
                        <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Total Value Received:</span>
                        <span className="font-mono text-emerald-400 font-extrabold text-sm">
                          ₹{order.total_amount ? order.total_amount.toLocaleString('en-IN') : "0"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "logs" ? (
          /* Security Audit Logs ledger tab */
          <div className="space-y-6">
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">System Security Audit Trail</h3>
                    <p className="text-sm text-zinc-500 mt-0.5 select-none">Live stream of administrator operations, order fulfillments, catalog alterations, and inventory uploads.</p>
                  </div>
                </div>
                
                <button
                  onClick={fetchAuditLogs}
                  className="text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Refresh Logs
                </button>
              </div>

              {/* Search & Advanced Log Controls */}
              <div className="mb-6 bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl space-y-4 select-none">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  {/* Search box */}
                  <div className="relative w-full md:flex-1">
                    <input
                      type="text"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      placeholder="Search logs by operator email or action keyword..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
                    />
                  </div>

                  {/* Log categories buttons */}
                  <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto py-1 shrink-0">
                    {[
                      { value: "all", label: "All Events" },
                      { value: "catalog", label: "Catalog" },
                      { value: "orders", label: "Orders" },
                      { value: "access", label: "Access Logs" }
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setLogActionFilter(item.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                          logActionFilter === item.value
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400 font-extrabold"
                            : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-300 hover:border-zinc-800"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-zinc-900">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Start Date Limit</span>
                    <input
                      type="date"
                      value={logStartDate}
                      onChange={(e) => setLogStartDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-rose-500 font-mono text-[11px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">End Date Limit</span>
                    <input
                      type="date"
                      value={logEndDate}
                      onChange={(e) => setLogEndDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-rose-500 font-mono text-[11px]"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setLogStartDate("");
                        setLogEndDate("");
                        setLogSearchQuery("");
                        setLogActionFilter("all");
                      }}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer w-full text-center"
                    >
                      Reset Log Filters
                    </button>
                  </div>
                </div>
              </div>

              {loadingLogs ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Streaming security events...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/10 max-w-xl mx-auto">
                  <ShieldAlert className="w-10 h-10 mx-auto text-zinc-800 mb-3" />
                  <p className="text-sm font-semibold text-zinc-500">No security audit logs match your search.</p>
                  <p className="text-xs text-zinc-600 mt-1">Try modifying search keywords or operators.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950/40 shadow-2xl">
                  {/* Console style list of logs */}
                  <div className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-900 font-mono text-sm leading-relaxed">
                    {filteredLogs.map((log, idx) => (
                      <div key={idx} className="p-3.5 hover:bg-zinc-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-2.5">
                          <span className="text-xs font-bold text-zinc-600 shrink-0">
                            [{new Date(log.created_at).toLocaleTimeString()}]
                          </span>
                          <span className="text-indigo-400 font-bold shrink-0">
                            {log.operator}:
                          </span>
                          <span className="text-zinc-200">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 shrink-0 select-none">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "qa" ? (
          /* Customer Q&A Panel Tab */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left section: Create new FAQ */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 backdrop-blur-xl sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Publish New Product FAQ</h3>
                </div>

                <form onSubmit={handleCreateFaq} className="space-y-4 font-sans text-left">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 select-none">Target Product</label>
                    <select
                      value={newFaqProductId}
                      onChange={(e) => setNewFaqProductId(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">Select a catalog product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.id.substring(0, 8)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 select-none">Question</label>
                    <textarea
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="e.g. What specific fabric structure does this use?"
                      rows="3"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 select-none">Answer</label>
                    <textarea
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                      placeholder="e.g. High-density ringspun organic cotton (380 GSM)..."
                      rows="4"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer text-center"
                  >
                    Publish FAQ Entry
                  </button>
                </form>
              </div>
            </div>

            {/* Right section: Customer Questions Ledger */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Q&A Questions Ledger</h3>
                      <p className="text-sm text-zinc-500 mt-0.5 select-none">Moderate customer inquiries, publish answers, and delete obsolete Q&A entries.</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={fetchGlobalFaqs}
                    className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Sync Questions
                  </button>
                </div>

                {globalFaqs.length === 0 ? (
                  <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/10 max-w-lg mx-auto">
                    <MessageSquare className="w-10 h-10 mx-auto text-zinc-800 mb-3" />
                    <p className="text-sm font-semibold text-zinc-500">No customer questions found.</p>
                    <p className="text-xs text-zinc-600 mt-1">Questions asked on product storefront pages will populate here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {globalFaqs.map((faq) => {
                      const isUnanswered = !faq.answer || faq.answer.includes("Thank you for asking");
                      return (
                        <div key={faq.id} className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl space-y-3 transition-all hover:border-zinc-800/80">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-mono">
                                Product: {faq.productName}
                              </span>
                              <h4 className="text-xs font-mono text-zinc-500 pt-1">
                                Question ID: {faq.id} · {faq.created_at ? new Date(faq.created_at).toLocaleDateString() : "Prior Entry"}
                              </h4>
                            </div>

                            <button
                              onClick={() => handleDeleteFaq(faq.id)}
                              className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer select-none"
                              title="Delete Q&A entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="bg-zinc-950 border border-zinc-900/50 p-3 rounded-xl text-left">
                            <p className="text-xs font-extrabold text-indigo-300">Q: {faq.question}</p>
                            <p className="text-xs text-zinc-400 mt-2 pl-3 border-l-2 border-zinc-800">
                              <span className="font-bold text-zinc-500">A:</span> {faq.answer}
                            </p>
                          </div>

                          {answeringFaqId === faq.id ? (
                            <div className="space-y-3 pt-2">
                              <textarea
                                value={faqAnswerInput}
                                onChange={(e) => setFaqAnswerInput(e.target.value)}
                                placeholder="Type answer for the customer..."
                                rows="3"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-y"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setAnsweringFaqId(null)}
                                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-lg text-[10px] font-bold text-zinc-400 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveFaqAnswer(faq.id)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-lg shadow-indigo-600/10"
                                >
                                  Submit Answer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => {
                                  setAnsweringFaqId(faq.id);
                                  setFaqAnswerInput(isUnanswered ? "" : faq.answer);
                                }}
                                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-[10px] font-extrabold text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <Edit className="w-3 h-3 text-indigo-400" />
                                <span>{isUnanswered ? "Answer Question" : "Edit Answer"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "payment-settings" ? (
          /* Payment Settings Tab */
          <div className="space-y-6">
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Razorpay Payment Gateway Integration</h3>
                    <p className="text-sm text-zinc-500 mt-0.5 select-none">
                      Configure your Razorpay API keys, webhooks, and toggle checkout status. Settings are saved securely in your Supabase database.
                    </p>
                  </div>
                </div>
              </div>

              {loadingPaymentSettings ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Fetching gateway credentials...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Configuration Form */}
                  <form onSubmit={handleSavePaymentSettings} className="lg:col-span-2 space-y-6">
                    
                    {/* Status switch */}
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-white block">Gateway Checkout Active</span>
                        <span className="text-xs text-zinc-500">When enabled, customers can check out using Razorpay on your website.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRazorpayEnabled(!razorpayEnabled)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                          razorpayEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow-md transition-transform" />
                      </button>
                    </div>

                    {/* API credentials inputs */}
                    <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-5 space-y-4">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block select-none">API Access Credentials</span>
                      
                      {/* Key ID */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">
                          Razorpay Key ID
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                            <Key className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            required
                            value={razorpayKeyId}
                            onChange={(e) => setRazorpayKeyId(e.target.value)}
                            placeholder="rzp_test_..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1.5 leading-normal">
                          Generate API Keys in your Razorpay Dashboard under Settings &gt; API Keys.
                        </p>
                      </div>

                      {/* Key Secret */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">
                          Razorpay Key Secret
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            value={razorpayKeySecret}
                            onChange={(e) => setRazorpayKeySecret(e.target.value)}
                            placeholder={keySecretConfigured ? "•••••••••••••••• (Configured)" : "Enter Key Secret"}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        {keySecretConfigured && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-medium select-none">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Secret key has been saved securely. Leave empty to keep it unchanged.</span>
                          </div>
                        )}
                      </div>

                      {/* Webhook Secret */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">
                          Webhook Secret Key
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            value={razorpayWebhookSecret}
                            onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                            placeholder={webhookSecretConfigured ? "•••••••••••••••• (Configured)" : "Enter Webhook Secret"}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        {webhookSecretConfigured && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-medium select-none">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Webhook Secret has been saved securely. Leave empty to keep it unchanged.</span>
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-1.5 leading-normal">
                          This key is used to cryptographically verify incoming webhook notifications.
                        </p>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        disabled={testingPaymentCredentials || savingPaymentSettings}
                        onClick={handleTestPaymentCredentials}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold text-xs py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        {testingPaymentCredentials ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        ) : (
                          <span>Test Connection</span>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={testingPaymentCredentials || savingPaymentSettings}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {savingPaymentSettings ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>Save Settings</span>
                        )}
                      </button>
                    </div>

                  </form>

                  {/* Sidebar Guides */}
                  <div className="space-y-6">
                    
                    {/* Webhook URL card */}
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 space-y-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">Webhook Endpoint</span>
                      <p className="text-xs text-zinc-500 leading-normal">
                        Configure this URL in your Razorpay Dashboard &gt; Webhooks to handle payments asynchronously (e.g. if the customer closes the tab during checkout).
                      </p>
                      <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-lg flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-zinc-300 truncate select-all">
                          {typeof window !== "undefined" ? window.location.origin + "/api/payment/webhook" : "https://yourdomain.com/api/payment/webhook"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              const url = window.location.origin + "/api/payment/webhook";
                              navigator.clipboard.writeText(url);
                              alert("Webhook URL copied to clipboard!");
                            }
                          }}
                          className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-zinc-600 space-y-1">
                        <p className="font-semibold text-zinc-500">Active webhook events to select:</p>
                        <p>• payment.captured</p>
                        <p>• order.paid</p>
                      </div>
                    </div>

                    {/* Setup Instruction checklist */}
                    <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-5 space-y-3.5 select-none">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Razorpay Setup Guide</span>
                      <div className="space-y-3 text-xs leading-normal">
                        <div className="flex gap-2.5">
                          <span className="text-indigo-400 font-extrabold font-mono">1.</span>
                          <p className="text-zinc-500">Create an account at <a href="https://razorpay.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">razorpay.com</a>.</p>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="text-indigo-400 font-extrabold font-mono">2.</span>
                          <p className="text-zinc-500">Switch to <strong>Test Mode</strong> or <strong>Live Mode</strong> in your Razorpay dashboard.</p>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="text-indigo-400 font-extrabold font-mono">3.</span>
                          <p className="text-zinc-500">Generate API Keys, paste Key ID & Key Secret here, and click <strong>Test Connection</strong>.</p>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="text-indigo-400 font-extrabold font-mono">4.</span>
                          <p className="text-zinc-500">Add a new Webhook with events `payment.captured` & `order.paid` using the webhook endpoint URL shown above. Save the secret key in both places.</p>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          </div>
        ) : activeTab === "sales-stats" ? (
          /* Sales Stats Tab */
          <SalesStatsView orders={orders} />
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
        ) : null}

      </main>

      {/* Premium Admin 3D Customizer Viewer Modal */}
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
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-extrabold text-sm">
                      T3D
                    </div>
                    <span className="font-extrabold text-sm tracking-tight text-zinc-950">THREAD 3D APPAREL STUDIO</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    102, Innovation & Sublimation Hub<br />
                    Industrial Sector Phase II, Chennai, TN, India<br />
                    help@thread3d.com | +91 44 2390 1234
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
                  <p className="text-zinc-700 leading-relaxed">{printingInvoiceOrder.shipping_address || "Standard Customization Depot"}</p>
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
                <p className="mt-1 font-bold">Thank you for supporting 3D Apparel Studio innovation!</p>
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
