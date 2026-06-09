"use client";
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, react-hooks/rules-of-hooks, react-hooks/purity, @next/next/no-img-element, react/no-unescaped-entities */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDesignData } from "@/lib/indexedDb";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  ShoppingBag, 
  Layers, 
  ChevronRight, 
  LogOut, 
  Loader2, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  User,
  ShoppingBag as CartIcon,
  CheckCircle,
  X,
  CreditCard,
  Lock,
  ShieldCheck,
  Heart,
  Shirt
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const getSlug = (name) => {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [preloadedDecalDataUrl, setPreloadedDecalDataUrl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // newest, price-asc, price-desc
  const [hoveredProductId, setHoveredProductId] = useState(null);
  // Dynamic categories — synced from admin Category Manager via localStorage
  const [catalogCategories, setCatalogCategories] = useState([
    { id: "t-shirt",    label: "T-Shirts" },
    { id: "hoodie",     label: "Hoodies" },
    { id: "jacket",     label: "Jackets" },
    { id: "activewear", label: "Activewears" },
  ]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok && data.categories && data.categories.length > 0) {
        setCatalogCategories(data.categories);
        localStorage.setItem("apparel_categories", JSON.stringify(data.categories));
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Load dynamic categories from localStorage & API on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("apparel_categories");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setCatalogCategories(parsed);
      }
    } catch (e) { /* use defaults */ }
    fetchCategories();
  }, []);

  // Dashboard view tab selector
  const [activeDashboardTab, setActiveDashboardTab] = useState("shop");
  const [pastOrders, setPastOrders] = useState([]);
  const [loadingPastOrders, setLoadingPastOrders] = useState(false);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [activeShipmentCheckpointStep, setActiveShipmentCheckpointStep] = useState(0);

  // Wishlist state
  const [wishlist, setWishlist] = useState([]);
  const [localProducts, setLocalProducts] = useState([]);

  // E-commerce Premium Features State (Coupons, Size Guide, Help-Desk)
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Welcome to Thread 3D Shop Help Desk! 🧵 How can we assist you today?", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = React.useRef(null);
  
  // Customer Notification Center & Slide-in Toasts (Loaded persistently from LocalStorage!)
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  // Synchronize notifications with LocalStorage to prevent reloads from wiping read states!
  const updateNotifications = (newNotisOrFn) => {
    setNotifications(prev => {
      const updated = typeof newNotisOrFn === "function" ? newNotisOrFn(prev) : newNotisOrFn;
      try {
        localStorage.setItem("apparel_notifications", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to persist notifications in LocalStorage:", err);
      }
      return updated;
    });
  };

  // Fetch customer's past orders
  const fetchPastOrders = async () => {
    // We can fetch if there's a session, or attempt a quick local fallback if offline
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userId = currentSession?.user?.id;
      
      if (!userId) {
        loadLocalPastOrdersFallback();
        return;
      }

      setLoadingPastOrders(true);
      // Try live database sync first
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase past orders fetch failed, reading from local backup...", error.message);
        loadLocalPastOrdersFallback();
      } else if (data && data.length > 0) {
        setPastOrders(data);
      } else {
        loadLocalPastOrdersFallback();
      }
    } catch (err) {
      console.warn("Error streaming orders from Supabase:", err);
      loadLocalPastOrdersFallback();
    } finally {
      setLoadingPastOrders(false);
    }
  };

  const loadLocalPastOrdersFallback = () => {
    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        setPastOrders(JSON.parse(stored));
      } else {
        setPastOrders([]);
      }
    } catch (err) {
      console.error("Local fallback order reading failed:", err);
    }
  };

  const loadPersistentNotifications = () => {
    try {
      const stored = localStorage.getItem("apparel_notifications");
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        const defaultNotis = [
          {
            id: "welcome",
            title: "🎉 Welcome to Thread 3D!",
            message: "Ready to design custom garments? Drag and drop decals, scale textures, and paint your garments in real-time 3D.",
            time: "Just now",
            read: false
          }
        ];
        setNotifications(defaultNotis);
        localStorage.setItem("apparel_notifications", JSON.stringify(defaultNotis));
      }
    } catch (err) {
      console.error("Local fallback notifications loading failed:", err);
    }
  };

  const loadWishlist = () => {
    try {
      const stored = localStorage.getItem("apparel_wishlist");
      if (stored) {
        setWishlist(JSON.parse(stored));
      } else {
        setWishlist([]);
      }
      
      const storedLocal = localStorage.getItem("apparel_products_local");
      if (storedLocal) {
        setLocalProducts(JSON.parse(storedLocal));
      } else {
        setLocalProducts([]);
      }
    } catch (err) {
      console.error("Error loading wishlist:", err);
    }
  };

  const handleDownloadInvoice = (order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download your invoice!");
      return;
    }
    
    const itemsHtml = (order.items || []).map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; font-size: 13px; color: #1e293b;">
          <strong style="color: #0f172a;">${item.name}</strong><br/>
          <span style="font-size: 10px; color: #64748b;">Size: ${item.size || "M"} | Qty: ${item.quantity}${item.customName ? ` | Jersey: ${item.customName} (${item.customNumber || "00"})` : ""}</span>
        </td>
        <td style="padding: 12px 0; font-size: 13px; color: #0f172a; font-family: monospace; font-weight: bold; text-align: right;">
          ₹${((item.price || 3999) * item.quantity).toLocaleString('en-IN')}
        </td>
      </tr>
    `).join("");

    const orderDate = new Date(order.created_at).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${order.id.substring(0, 8).toUpperCase()}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@700&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              margin: 0;
              padding: 40px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .invoice-card {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 30px;
              margin-bottom: 30px;
            }
            .brand {
              font-weight: 800;
              font-size: 24px;
              color: #4f46e5;
              letter-spacing: -0.05em;
            }
            .invoice-title {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 8px 0;
              text-align: right;
            }
            .meta-text {
              font-size: 12px;
              color: #64748b;
              margin: 2px 0;
              text-align: right;
            }
            .grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #64748b;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .address-text {
              font-size: 13px;
              line-height: 1.6;
              color: #334155;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
            }
            .totals-container {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              border-top: 2px solid #f1f5f9;
              padding-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              width: 250px;
              font-size: 14px;
              color: #475569;
              margin: 4px 0;
            }
            .grand-total {
              font-size: 20px;
              font-weight: 800;
              color: #4f46e5;
              border-top: 1px dashed #e2e8f0;
              padding-top: 12px;
              margin-top: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 60px;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 20px;
            }
            @media print {
              body {
                padding: 0;
              }
              .invoice-card {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header">
              <div>
                <div class="brand">THREAD 3D STUDIO</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Customized Luxury Streetwear</div>
              </div>
              <div>
                <h1 class="invoice-title">INVOICE</h1>
                <p class="meta-text">Invoice ID: <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #0f172a;">#${order.id.substring(0, 8).toUpperCase()}</span></p>
                <p class="meta-text">Order Date: ${orderDate}</p>
                <p class="meta-text">Status: <span style="color: #059669; font-weight: bold; text-transform: uppercase;">${order.status || "processing"}</span></p>
              </div>
            </div>

            <div class="grid">
              <div>
                <h3 class="section-title">Billing & Delivery To</h3>
                <div class="address-text">
                  <strong style="color: #0f172a; font-size: 14px;">${order.customer_name || "Valued Customer"}</strong><br/>
                  ${order.customer_phone || ""}<br/>
                  ${order.customer_address || ""}<br/>
                  ${order.customer_city || ""}
                </div>
              </div>
              <div>
                <h3 class="section-title">Fulfilled By</h3>
                <div class="address-text">
                  <strong>Thread 3D Studio</strong><br/>
                  Custom Fabrication Facility<br/>
                  Digital Customization Hub
                </div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 70%;">Custom Product Details</th>
                  <th style="text-align: right; width: 30%;">Total Charge</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals-container">
              <div class="total-row">
                <span>Subtotal:</span>
                <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #0f172a;">₹${(order.total_amount || 3999).toLocaleString('en-IN')}</span>
              </div>
              <div class="total-row">
                <span>Taxes & Custom Assembly:</span>
                <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #0f172a;">₹0</span>
              </div>
              <div class="total-row">
                <span>Garment Delivery:</span>
                <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #0e9f6e;">FREE</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Amount Charged:</span>
                <span style="font-family: 'JetBrains Mono', monospace;">₹${(order.total_amount || 3999).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for partnering with Thread 3D Studio! Your garments are tailored precisely to your coordinates.</p>
              <p style="font-size: 9px; margin-top: 8px;">Thread 3D Shop LLC. All rights reserved. For queries, contact help@thread3d.com</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm("Are you sure you want to cancel this order? This will permanently halt garment fabrication and queue a full refund.")) return;
    
    // 1. Try to delete in Supabase
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
        
      if (error) {
        console.warn("Could not delete from Supabase live table:", error.message);
      }
    } catch (err) {
      console.warn("Failed to contact Supabase:", err);
    }
    
    // 2. Remove/filter from LocalStorage backup
    try {
      const stored = localStorage.getItem("apparel_orders");
      if (stored) {
        const localList = JSON.parse(stored);
        const filtered = localList.filter(o => o.id !== orderId);
        localStorage.setItem("apparel_orders", JSON.stringify(filtered));
      }
    } catch (err) {
      console.error("LocalStorage delete failed:", err);
    }
    
    // 3. Trigger a beautiful customer cancellation notification!
    const cancelNotification = {
      id: `noti_${Date.now()}`,
      title: "❌ Order Cancelled Successfully",
      message: `Your customized order #${orderId.substring(0, 15)}... has been cancelled and garment fabrication has been halted. A full refund has been queued to your original payment method.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false
    };
    updateNotifications(prev => [cancelNotification, ...prev]);
    setActiveToast({
      title: "🛑 Order Cancelled",
      message: "Garment fabrication halted. Refund queued."
    });
    
    // Refresh past orders list
    fetchPastOrders();
  };

  // Auto-dismiss notification toasts
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);
  // Auto scroll chat to bottom when messages or typing status updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isBotTyping, showHelpChat]);

  // 1. Auth check and initial fetch
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        router.push("/auth");
      } else {
        setSession(currentSession);
        setCheckingAuth(false);
        fetchProducts();
        loadWishlist();
        fetchPastOrders();
        loadPersistentNotifications();
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.push("/auth");
      } else {
        setSession(newSession);
        setCheckingAuth(false);
        fetchPastOrders();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Live wishlist badge and state synchronization across multiple views/triggers
  useEffect(() => {
    loadWishlist();
    window.addEventListener("wishlist-updated", loadWishlist);
    return () => window.removeEventListener("wishlist-updated", loadWishlist);
  }, []);

  // Handle URL query parameters for dynamic view state (e.g. tracking tab)
  useEffect(() => {
    if (typeof window !== "undefined" && !checkingAuth) {
      const params = new URLSearchParams(window.location.search);
      
      const tabParam = params.get("tab");
      if (tabParam === "tracking") {
        setActiveDashboardTab("tracking");
        fetchPastOrders();
      } else if (tabParam === "wishlist") {
        setActiveDashboardTab("wishlist");
        loadWishlist();
      } else if (tabParam === "shop") {
        setActiveDashboardTab("shop");
      }
      
      // Clean query parameters from URL to keep UI clean
      if (tabParam) {
        const newUrl = window.location.pathname + (window.location.hash || "");
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [checkingAuth]);

  // Load products from Supabase
  async function fetchProducts() {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Trigger chatbot response based on user input
  const triggerBotResponse = (userQueryText) => {
    setIsBotTyping(true);
    
    setTimeout(() => {
      const query = userQueryText.toLowerCase();
      let replyText = "Our design operators are reviewing your query. Custom apparel production and tailoring takes 5-7 business days.";
      
      if (query.includes("ship") || query.includes("track") || query.includes("order")) {
        if (pastOrders && pastOrders.length > 0) {
          const latest = pastOrders[0];
          const ordId = latest.id.substring(0, 8).toUpperCase();
          const status = latest.status || "processing";
          const total = latest.total_amount || 3999;
          const tracking = latest.tracking_number ? ` (Tracking: ${latest.tracking_number} via ${latest.carrier || "Delivery"})` : "";
          replyText = `I found your latest order #${ordId}! Total: ₹${total.toLocaleString('en-IN')}. Current status: **${status.toUpperCase()}**.${tracking}. You can view detailed transit steps under the "Track Orders" tab in your dashboard!`;
        } else {
          replyText = "I checked our databases but couldn't find any orders placed under your account. Once you complete your checkout via Razorpay, they will be listed here.";
        }
      } else if (query.includes("price") || query.includes("discount") || query.includes("promo") || query.includes("coupon")) {
        replyText = "Get 20% off custom streetwear! Apply the promo coupon code **THREAD3D** in the cart drawer. Note: It applies to all customized items!";
      } else if (query.includes("size") || query.includes("fit") || query.includes("sizing")) {
        replyText = "Our 3D tailored street garments fit true to size. Typical specifications:\n• **S:** Chest 38\", Sleeve 8\"\n• **M:** Chest 40\", Sleeve 8.5\"\n• **L:** Chest 42\", Sleeve 9\"\n• **XL:** Chest 44\", Sleeve 9.5\"\n\nClick the Size Guide inside any garment page for a detailed scale diagram!";
      } else if (query.includes("3d") || query.includes("decal") || query.includes("custom") || query.includes("how to")) {
        replyText = "To design, select any blank item from our catalog, and customize it in real-time 3D by picking base colors, decals, and custom player squad name/number details before clicking checkout!";
      } else if (query.includes("hi") || query.includes("hello") || query.includes("hey")) {
        replyText = "Hello! I am your Thread 3D shopping assistant. Ask me about your orders, size specifications, custom templates, or active discounts!";
      } else if (query.includes("product") || query.includes("stock") || query.includes("buy")) {
        const inStock = products.filter(p => !isTemplateProduct(p)).slice(0, 2);
        if (inStock.length > 0) {
          replyText = `We currently have premium products in stock, including:\n${inStock.map(p => `• **${p.name}** for ₹${(p.price || 3999).toLocaleString('en-IN')}`).join("\n")}\n\nSelect a garment to launch the custom 3D editor!`;
        } else {
          replyText = "All custom model designs are available to order! Browse our categories above to get started.";
        }
      }
      
      const botMsg = {
        sender: "bot",
        text: replyText,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setChatMessages(prev => [...prev, botMsg]);
      setIsBotTyping(false);
    }, 1000);
  };

  // Help Desk Interactive Live Chat Submission
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = {
      sender: "user",
      text: chatInput,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    const textToSend = chatInput;
    setChatInput("");
    
    triggerBotResponse(textToSend);
  };

  const handleQuickActionClick = (promptText) => {
    const userMsg = {
      sender: "user",
      text: promptText,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    setChatMessages(prev => [...prev, userMsg]);
    triggerBotResponse(promptText);
  };



  const handleRemoveFromWishlist = (productId) => {
    const updated = wishlist.filter(id => id !== productId);
    setWishlist(updated);
    localStorage.setItem("apparel_wishlist", JSON.stringify(updated));
    
    // Dispatch custom event to sync shared Navbar badge
    window.dispatchEvent(new Event("wishlist-updated"));
    
    setActiveToast({
      title: "💔 Removed from Wishlist",
      message: "Item has been removed from your saved list."
    });
  };

  const handleToggleWishlist = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    const isWishlisted = wishlist.includes(product.id);
    let updated;
    if (isWishlisted) {
      updated = wishlist.filter(id => id !== product.id);
      setActiveToast({
        title: "💔 Removed from Wishlist",
        message: "Item removed from your saved list."
      });
    } else {
      updated = [...wishlist, product.id];
      setActiveToast({
        title: "❤️ Added to Wishlist",
        message: `${product.name} saved to your wishlist!`
      });
    }
    setWishlist(updated);
    localStorage.setItem("apparel_wishlist", JSON.stringify(updated));
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  const handleAddWishlistToCart = (product) => {
    handleAddCatalogToCart(product);
    handleRemoveFromWishlist(product.id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
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

  const handleAddCatalogToCart = (product) => {
    const itemId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cartItem = {
      id: itemId,
      productId: product.id,
      name: `${product.name} (Matte Organic Cotton)`,
      baseTexture: product.texture_url,
      glbUrl: product.glb_file_url,
      thumbnailUrl: product.texture_url,
      size: "M",
      quantity: 1,
      addedAt: new Date().toISOString(),
      price: product.price || 3999,
      fabric: "cotton"
    };

    try {
      const stored = JSON.parse(localStorage.getItem("apparel_cart") || "[]");
      const newCart = [...stored, cartItem];
      localStorage.setItem("apparel_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("cart-updated"));
      
      setActiveToast({
        title: "🛒 Added to Cart",
        message: `${product.name} has been added to your shopping bag!`
      });
    } catch(err) {
      console.error(err);
    }
  };

  // Filter categories — dynamic from admin panel (localStorage) + always includes "all"
  const categories = ["all", ...catalogCategories.map(c => c.id)];
  // Category label and icon map
  const getCatMeta = (catId) => {
    if (catId === "all")        return { label: "ALL",       icon: <Layers className="w-3.5 h-3.5" /> };
    if (catId === "t-shirt")    return { label: "T-SHIRTS",   icon: <Shirt className="w-3.5 h-3.5" /> };
    if (catId === "hoodie")     return { label: "HOODIES",    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> };
    if (catId === "jacket")     return { label: "JACKETS",    icon: <ShieldCheck className="w-3.5 h-3.5" /> };
    if (catId === "activewear") return { label: "ACTIVEWEARS", icon: <Sparkles className="w-3.5 h-3.5" /> };
    // Custom category — use stored label
    const found = catalogCategories.find(c => c.id === catId);
    return { label: (found?.label || catId).toUpperCase(), icon: <Layers className="w-3.5 h-3.5" /> };
  };
  const filteredProducts = products
    .filter(product => {
      if (isTemplateProduct(product)) return false;
      if (activeCategory !== "all") {
        const cat = (product.category || "").toLowerCase();
        if (cat !== activeCategory) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!product.name.toLowerCase().includes(q) && !(product.description || "").toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "price-asc") return (a.price || 3999) - (b.price || 3999);
      if (sortOrder === "price-desc") return (b.price || 3999) - (a.price || 3999);
      // newest: default — already sorted by created_at desc from Supabase
      return 0;
    });

  const customizableTemplates = products.filter(product => isTemplateProduct(product));

  // Merge Supabase catalog products and locally saved custom studio designs
  const allProductsForWishlist = [
    ...products,
    ...localProducts.filter(lp => !products.some(p => p.id === lp.id))
  ];

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-zinc-400">Loading customer studio dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-20 relative overflow-x-hidden">
      
      {/* Glow effects for modern UI */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Shared Navbar Header */}
      <Navbar>
        {/* Customer Notifications Center Bell Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-zinc-900 rounded-lg border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Notifications Ledger"
          >
            <span className="text-base select-none">🔔</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-sm font-extrabold flex items-center justify-center animate-pulse shadow-md">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-150">
              <div className="bg-zinc-900/60 border-b border-zinc-850 px-4 py-3 flex justify-between items-center select-none">
                <span className="font-extrabold text-xs text-white">Notifications Center</span>
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={() => updateNotifications(notifications.map(n => ({ ...n, read: true })))}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-900/40">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-600 font-medium select-none">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map(noti => (
                    <div 
                      key={noti.id} 
                      onClick={() => {
                        // Mark as read when clicked
                        updateNotifications(notifications.map(n => n.id === noti.id ? { ...n, read: true } : n));
                      }}
                      className={`p-3.5 transition-colors cursor-pointer hover:bg-zinc-900/20 text-left ${noti.read ? "opacity-60" : "bg-indigo-950/5"}`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <h4 className={`text-sm font-extrabold ${noti.read ? "text-zinc-400" : "text-white"}`}>
                          {noti.title}
                        </h4>
                        <span className="text-[7px] text-zinc-500 font-mono shrink-0">{noti.time}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed font-medium mt-1">
                        {noti.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Navbar>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 z-10 relative">
        


        {activeDashboardTab === "shop" ? (
          <>
            {/* Search + Sort + Category Filter Bar */}
            <section className="mb-8 space-y-4">
              {/* Search + Sort row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search apparel by name or style..."
                    className="w-full bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none font-semibold transition-colors"
                  />
                  <svg className="w-3.5 h-3.5 text-zinc-600 absolute left-3.5 top-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-zinc-600 hover:text-zinc-400 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 focus:outline-none font-semibold cursor-pointer transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-2.5 flex-wrap justify-between">
                <div className="bg-zinc-950/60 border border-zinc-900/80 p-1.5 rounded-2xl flex items-center shadow-inner gap-1 overflow-x-auto whitespace-nowrap">
                  {categories.map((category) => {
                    const isActive = activeCategory === category;
                    const { label, icon } = getCatMeta(category);
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-5 py-2.5 rounded-xl text-sm sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
                          isActive
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 font-black"
                            : "text-zinc-500 hover:text-zinc-300 font-bold border-transparent bg-transparent"
                        }`}
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
                {(searchQuery || activeCategory !== "all") && (
                  <span className="text-sm text-zinc-500 font-medium bg-zinc-900/40 border border-zinc-800/60 px-3 py-1.5 rounded-xl ml-auto">{filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </section>

            {/* Product Catalog Grid */}
            <section>
              {loadingProducts ? (
                <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Fetching catalog items...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 max-w-xl mx-auto">
                  <Layers className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-sm font-semibold text-zinc-400">
                    {searchQuery ? `No results for "${searchQuery}"` : "No apparel found in this category."}
                  </p>
                  {(searchQuery || activeCategory !== "all") && (
                    <button onClick={() => { setSearchQuery(""); setActiveCategory("all"); }} className="mt-3 text-xs text-indigo-400 hover:underline font-bold cursor-pointer">Clear filters</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
                  {(() => {
                    const gridItems = [...filteredProducts];
                    if (gridItems.length > 0) {
                      const insertIndex = Math.min(8, gridItems.length);
                      gridItems.splice(insertIndex, 0, { id: 'ad_card_3d', isAd: true });
                    }
                    return gridItems;
                  })().map((item) => {
                    if (item.isAd) {
                      return (
                        <div 
                          key="ad_card_3d" 
                          onClick={() => router.push('/studio')}
                          className="col-span-full my-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/40 border border-indigo-500/30 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/60 transition-all hover:shadow-xl hover:shadow-indigo-500/20 group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 relative z-10">
                            <Sparkles className="w-3 h-3 animate-spin" />
                            <span>Interactive 3D Apparel Lab</span>
                          </div>
                          <h2 className="text-balance text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 relative z-10">Design Your Own High-End Custom Apparel</h2>
                          <p className="text-balance text-xs sm:text-sm text-indigo-200 mb-6 max-w-xl relative z-10">Choose a premium base garment, enter our real-time 3D studio, and custom-craft your own apparel in minutes.</p>
                          <button className="bg-indigo-600 group-hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-xs uppercase tracking-wider flex items-center gap-2 relative z-10 shadow-lg shadow-indigo-600/30">
                            Enter Studio <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      );
                    }
                    
                    const product = item;
                    const galleryImages = product.gallery_urls
                      ? (product.gallery_urls.startsWith("data:image")
                          ? [product.gallery_urls]
                          : product.gallery_urls.split(",").map(u => u.trim()).filter(Boolean))
                      : [];
                    const uniqueGalleryImages = galleryImages.filter(u => u !== product.texture_url);
                    const hoverImage = uniqueGalleryImages.length > 0 ? uniqueGalleryImages[0] : null;
                    const isHovered = hoveredProductId === product.id;
                    return (
                      <div
                        key={product.id}
                        className="bg-zinc-900/25 border border-zinc-900/80 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all flex flex-col group shadow-sm hover:shadow-xl hover:shadow-zinc-950/60 cursor-pointer"
                        onMouseEnter={() => setHoveredProductId(product.id)}
                        onMouseLeave={() => setHoveredProductId(null)}
                        onClick={() => router.push(`/product/${product.id}`)}
                      >
                        {/* Portrait Image Frame — Amazon style */}
                        <div className="relative w-full bg-zinc-950 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                          {/* Main image */}
                          <img
                            src={product.texture_url}
                            alt={product.name}
                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${hoverImage && isHovered ? "opacity-0" : "opacity-90 group-hover:opacity-100"}`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {/* Hover / gallery image */}
                          {hoverImage && (
                            <img
                              src={hoverImage}
                              alt={`${product.name} alternate`}
                              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"}`}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          {/* Category badge */}
                          {product.category && (
                            <div className="absolute top-2 left-2 bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                              {product.category}
                            </div>
                          )}
                          {/* Multiple photos indicator */}
                          {galleryImages.length > 0 && (
                            <div className="absolute top-2 right-2 bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {galleryImages.length + 1} photos
                            </div>
                          )}
                          
                          {/* Wishlist Heart Overlay */}
                          <button
                            onClick={(e) => handleToggleWishlist(product, e)}
                            className="absolute top-2 left-2 p-1.5 rounded-full bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/50 text-zinc-400 hover:text-rose-400 hover:border-rose-400/50 transition-colors z-10"
                          >
                            <Heart className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                          </button>

                          {/* Quick add overlay on hover */}
                          <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-zinc-950 to-transparent transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddCatalogToCart(product); }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <CartIcon className="w-3 h-3" />
                              Quick Add
                            </button>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-3 flex flex-col gap-2 flex-1">
                          <h3 className="font-bold text-xs text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <span className="text-sm font-black text-indigo-400">
                              ₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}
                            </span>
                            <span className="text-xs text-emerald-500 font-bold">Free Ship</span>
                          </div>
                          <Link
                            href={`/product/${product.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full py-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-xl text-sm font-bold text-center transition-all"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : activeDashboardTab === "3d-design" ? (
          <div className="space-y-12">
            
            {/* Decal Preload Dropzone Section */}
            <section className="max-w-2xl mx-auto bg-zinc-900/20 border border-zinc-900 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden text-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
              <h3 className="text-sm font-bold text-white flex items-center justify-center gap-2 mb-2 select-none">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Preload Custom Design Graphics</span>
              </h3>
              <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
                (Optional) Select a transparent PNG decal or logo from your device first. It will be preloaded on the 3D customizer canvas automatically when you open a blank template!
              </p>

              <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 rounded-2xl p-6 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target.result;
                        setPreloadedDecalDataUrl(dataUrl);
                        localStorage.setItem("apparel_preloaded_decal", dataUrl);
                        setActiveToast({
                          title: "🎨 Graphic Preloaded",
                          message: "Your custom decal is cached! Redirecting to 3D Customizer Studio..."
                        });
                        setTimeout(() => {
                          router.push("/studio");
                        }, 800);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {preloadedDecalDataUrl ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <img 
                      src={preloadedDecalDataUrl} 
                      alt="Preloaded decal preview" 
                      className="w-16 h-16 object-contain rounded-lg border border-zinc-800 bg-zinc-900 p-1"
                    />
                    <div className="text-center animate-fade-in">
                      <p className="text-xs font-bold text-emerald-400">Custom Decal Loaded!</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setPreloadedDecalDataUrl(null);
                        }}
                        className="text-sm text-rose-400 hover:text-rose-350 mt-1 select-none font-bold underline underline-offset-2 cursor-pointer"
                      >
                        Remove Decal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-center text-zinc-400 select-none">
                    <span className="text-2xl mb-1.5">🖼️</span>
                    <p className="text-xs font-bold">Click to select graphic</p>
                    <p className="text-sm text-zinc-650 mt-1">Supports PNG, JPG transparent stickers</p>
                  </div>
                )}
              </div>
            </section>

            {/* Configurator Templates Selection Grid */}
            <section className="space-y-6">
              <div className="border-b border-zinc-900 pb-3 select-none">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Choose Customizable Blanks ({customizableTemplates.length})</span>
                </h3>
                <p className="text-sm text-zinc-500 mt-1">Select a template canvas model mesh below to enter the 3D customizer.</p>
              </div>

              {loadingProducts ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                  <p className="text-xs">Fetching template models...</p>
                </div>
              ) : customizableTemplates.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 max-w-xl mx-auto select-none">
                  <Layers className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
                  <p className="text-xs text-zinc-500 font-semibold">No blank configurator templates registered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                  {customizableTemplates.map((product) => (
                    <div 
                      key={product.id}
                      className="bg-zinc-900/30 border border-zinc-900/80 hover:border-indigo-950/40 rounded-2xl p-5 hover:bg-zinc-900/60 transition-all flex flex-col justify-between group shadow-sm overflow-hidden"
                    >
                      <div>
                        {/* Canvas Image frame */}
                        <div className="w-full aspect-[4/3] bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden relative mb-4.5 flex items-center justify-center group-hover:border-zinc-800 transition-all">
                          <img 
                            src={product.texture_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover opacity-65 group-hover:opacity-85 transition-opacity duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <span className="text-xs bg-indigo-600/95 text-white px-2 py-0.5 rounded font-mono uppercase font-extrabold animate-pulse">
                              Designable Canvas
                            </span>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-base text-zinc-100 group-hover:text-white transition-colors truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 select-none">
                          Interactive 3D configurator template
                        </p>
                      </div>

                      {/* Customize trigger button */}
                      <div className="border-t border-zinc-900 mt-5 pt-4 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-zinc-300">
                          ₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}
                        </span>
                        
                        <button
                          onClick={() => {
                            if (preloadedDecalDataUrl) {
                              localStorage.setItem("apparel_preloaded_decal", preloadedDecalDataUrl);
                            } else {
                              localStorage.removeItem("apparel_preloaded_decal");
                            }
                            router.push(`/studio?product=${getSlug(product.name)}`);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                          <span>Design in 3D</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeDashboardTab === "wishlist" ? (
          /* SAVED WISHLIST VIEW */
          <div className="space-y-8">
            <div className="border-b border-zinc-900 pb-3 select-none">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-450" />
                <span>My Saved Wishlist ({allProductsForWishlist.filter(p => wishlist.includes(p.id)).length})</span>
              </h3>
              <p className="text-sm text-zinc-500 mt-1">Review your saved items, move them directly to your shopping bag, or view full detail metrics.</p>
            </div>

            {allProductsForWishlist.filter(p => wishlist.includes(p.id)).length === 0 ? (
              <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 max-w-xl mx-auto">
                <Heart className="w-12 h-12 mx-auto text-zinc-800 mb-4 animate-pulse" />
                <p className="text-sm font-semibold text-zinc-500">Your saved wishlist is empty.</p>
                <p className="text-xs text-zinc-650 mt-1.5 leading-relaxed">Save garments from the shop catalog to keep track of designs you want to buy or custom customize.</p>
                <button
                  onClick={() => setActiveDashboardTab("shop")}
                  className="mt-6 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Browse Shop Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
                {allProductsForWishlist.filter(p => wishlist.includes(p.id)).map((product) => (
                  <div 
                    key={product.id}
                    className="bg-zinc-900/25 border border-zinc-900/80 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all flex flex-col group shadow-sm hover:shadow-xl hover:shadow-zinc-950/60"
                  >
                    <div className="relative w-full bg-zinc-950 overflow-hidden cursor-pointer" style={{ aspectRatio: '3/4' }} onClick={() => router.push(`/product/${product.id}`)}>
                      <img 
                        src={product.texture_url} 
                        alt={product.name} 
                        className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromWishlist(product.id); }}
                        className="absolute top-2.5 right-2.5 p-2 bg-zinc-950/80 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer"
                        title="Remove from saved list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="p-3 flex flex-col gap-2 flex-grow">
                      <h3 className="font-bold text-xs text-zinc-200 line-clamp-1 leading-snug pr-6 transition-colors group-hover:text-white" onClick={() => router.push(`/product/${product.id}`)}>{product.name}</h3>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-black text-indigo-400">₹{product.price ? product.price.toLocaleString('en-IN') : "3,999"}</span>
                        <span className="text-xs text-zinc-500">{product.category || "Apparel"}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-zinc-900/40">
                        <button
                          onClick={() => handleAddWishlistToCart(product)}
                          className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Move to Bag</span>
                        </button>
                        <button
                          onClick={() => router.push(`/product/${product.id}`)}
                          className="py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/40 hover:border-zinc-650 text-zinc-355 hover:text-white rounded-xl text-sm font-bold text-center transition-all cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* PAST ORDERS TRACKER VIEW */
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 select-none">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span>My Customized Apparel Orders ({pastOrders.length})</span>
              </h3>
              <button
                onClick={fetchPastOrders}
                disabled={loadingPastOrders}
                className="text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                {loadingPastOrders ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>Sync Orders</span>
                )}
              </button>
            </div>

            {loadingPastOrders ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                <p className="text-xs font-semibold">Streaming your transaction history...</p>
              </div>
            ) : pastOrders.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 max-w-xl mx-auto">
                <ShoppingBag className="w-12 h-12 mx-auto text-zinc-800 mb-4 animate-pulse" />
                <p className="text-sm font-semibold text-zinc-500">You haven&apos;t customized any apparel yet.</p>
                <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">Create your own 3D custom apparel, complete the checkout, and start tracking your shipment live!</p>
                <button
                  onClick={() => setActiveDashboardTab("shop")}
                  className="mt-6 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Start Customizing Apparel
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {pastOrders.map((order) => {
                  const states = [
                    { key: "payment_pending", label: "Paid", desc: "Payment Received" },
                    { key: "processing", label: "Confirmed", desc: "Design Compiled" },
                    { key: "in_production", label: "In Production", desc: "Printing Fabric" },
                    { key: "shipped", label: "Shipped", desc: "In Transit" },
                    { key: "delivered", label: "Delivered", desc: "Arrived Safely" }
                  ];

                  // Map old status strings to strict statuses
                  const mappedStatus = (order.status || "payment_pending").toLowerCase() === "pending" ? "payment_pending" : 
                                       (order.status || "payment_pending").toLowerCase() === "completed" ? "delivered" : 
                                       (order.status || "payment_pending").toLowerCase();

                  const activeIdx = states.findIndex(s => s.key === mappedStatus);
                  const currentStatusIdx = activeIdx !== -1 ? activeIdx : 0;

                  return (
                    <div 
                      key={order.id} 
                      className="bg-zinc-900/30 border border-zinc-900/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-lg"
                    >
                      {/* Order info header */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-900 pb-4">
                        <div>
                          <div className="flex items-center flex-wrap gap-2.5">
                            <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded select-all">
                              {order.id}
                            </span>
                            <span className="text-sm text-zinc-500 font-semibold select-none">
                              Placed on: {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-2 font-medium">
                            Shipping to: <strong className="text-zinc-200">{order.customer_name}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider select-none">Total Charged</p>
                            <p className="font-mono text-emerald-400 font-extrabold text-sm">₹{order.total_amount ? order.total_amount.toLocaleString('en-IN') : "0"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Stepper timeline */}
                      <div className="py-2.5 select-none">
                        <div className="relative flex items-center justify-between">
                          {/* Stepper track background line */}
                          <div className="absolute left-0 right-0 h-1 bg-zinc-800 rounded-full z-0 pointer-events-none" />
                          {/* Stepper active track line */}
                          <div 
                            className="absolute left-0 h-1 bg-indigo-500 rounded-full z-0 transition-all duration-500 pointer-events-none" 
                            style={{ width: `${(currentStatusIdx / (states.length - 1)) * 100}%` }}
                          />

                          {/* Stepper nodes */}
                          {states.map((step, idx) => {
                            const isCompleted = idx <= currentStatusIdx;
                            const isActive = idx === currentStatusIdx;
                            return (
                              <div key={step.key} className="flex flex-col items-center z-10 relative">
                                <div 
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-300 ${
                                    isCompleted 
                                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110" 
                                      : "bg-zinc-950 border-zinc-800 text-zinc-500"
                                  } ${isActive ? "ring-4 ring-indigo-500/10" : ""}`}
                                >
                                  {isCompleted && !isActive ? (
                                    <span className="text-xs font-extrabold">✓</span>
                                  ) : (
                                    <span>{idx + 1}</span>
                                  )}
                                </div>
                                <span className={`text-sm sm:text-sm font-extrabold mt-2 tracking-tight ${isCompleted ? "text-indigo-400" : "text-zinc-500"}`}>
                                  {step.label}
                                </span>
                                <span className="text-sm sm:text-xs text-zinc-600 mt-0.5 hidden sm:inline select-none">
                                  {step.desc}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ordered items preview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2.5">
                          <h5 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest select-none border-b border-zinc-900 pb-1">Custom Designs</h5>
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 flex gap-3.5 items-center">
                              <div className="w-12 h-12 bg-zinc-900 border border-zinc-850 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
                                <img 
                                  src={item.customDesignUrl} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover opacity-85" 
                                />
                                <span className="absolute bottom-0.5 right-0.5 bg-indigo-600 text-white text-[7px] font-bold px-1 rounded-sm uppercase tracking-tighter">
                                  {item.size}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h6 className="text-xs font-bold text-white truncate">{item.name}</h6>
                                <p className="text-sm text-zinc-500 font-semibold mt-0.5">Qty: {item.quantity} | Customized Base</p>
                              </div>
                              <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                                ₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Shipment card & details */}
                        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between min-h-[120px]">
                          <div className="space-y-2">
                            <h5 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest select-none border-b border-zinc-900 pb-1">Delivery Details</h5>
                            
                            {/* Real Date/Time Estimated Delivery */}
                            <div className="mb-2.5 bg-indigo-950/10 border border-indigo-900/10 rounded-lg p-2.5 flex items-center gap-2.5 text-indigo-400 select-none">
                              <span className="text-xs">📅</span>
                              <div className="text-xs font-semibold leading-relaxed">
                                {(() => {
                                  const orderDate = new Date(order.created_at);
                                  if (isNaN(orderDate.getTime())) return "Estimated: 7-10 Business Days";
                                  
                                  if (order.status?.toLowerCase() === "delivered") {
                                    const deliveredDate = new Date(orderDate);
                                    deliveredDate.setDate(orderDate.getDate() + 2);
                                    return `Delivered on ${deliveredDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${deliveredDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                                  }
                                  
                                  const minDate = new Date(orderDate);
                                  minDate.setDate(orderDate.getDate() + 7);
                                  const maxDate = new Date(orderDate);
                                  maxDate.setDate(orderDate.getDate() + 10);
                                  
                                  const minFormatted = minDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                  const maxFormatted = maxDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                  
                                  return `Estimated Arrival: ${minFormatted} - ${maxFormatted}`;
                                })()}
                              </div>
                            </div>

                            {order.tracking_number ? (
                              <div className="space-y-1.5 text-xs text-zinc-300">
                                <p className="font-semibold">Carrier: <span className="text-white">{order.carrier}</span></p>
                                <p className="font-semibold">Tracking ID: <span className="text-indigo-400 font-mono select-all font-bold">{order.tracking_number}</span></p>
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                                Your physical garment design is being compiled for high-resolution print matching. Tracking details will post here as soon as shipment dispatches!
                              </p>
                            )}
                          </div>

                          <div className="mt-3.5 space-y-2">
                            {order.tracking_number && (
                              <button
                                onClick={() => {
                                  setSelectedTrackingOrder(order);
                                  // Set starting checkpoint progress based on status
                                  let baseStep = 1;
                                  if (order.status === "delivered") baseStep = 4;
                                  else if (order.status === "shipped") baseStep = 3;
                                  setActiveShipmentCheckpointStep(baseStep);
                                }}
                                className="w-full bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 hover:text-white text-indigo-400 text-sm font-bold uppercase tracking-wider py-2 rounded-xl transition-all shadow-md cursor-pointer text-center"
                              >
                                Track Package Journey Live
                              </button>
                            )}

                            {/* Download PDF Invoice trigger */}
                            <button
                              onClick={() => handleDownloadInvoice(order)}
                              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-bold uppercase tracking-wider py-2 rounded-xl transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
                            >
                              <span>📄</span> Download Invoice PDF
                            </button>

                            {/* Dynamic Cancel Action for Customers */}
                            {(!order.status || ["pending", "payment_pending", "processing"].includes(order.status.toLowerCase())) ? (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="w-full bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 hover:text-white text-red-400 text-xs font-bold uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer text-center"
                              >
                                Cancel Order
                              </button>
                            ) : (
                              <div className="text-center py-1.5 bg-zinc-950/40 border border-zinc-900 rounded-lg text-sm text-zinc-500 font-bold uppercase tracking-wider select-none">
                                🔒 Production Locked: In fabrication
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>


      {/* Simulated Shipment Map Checkpoint Journey Drawer */}
      {selectedTrackingOrder && (
        <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[75vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5 select-none">
                    <span>Live Package Journey Map</span>
                    <span className="text-sm text-zinc-500 font-mono select-all">({selectedTrackingOrder.id.substring(0, 10)}...)</span>
                  </h3>
                  <p className="text-sm text-zinc-500 mt-0.5 select-none">
                    Carrier: <span className="text-zinc-300 font-bold">{selectedTrackingOrder.carrier}</span> | Tracking: <span className="text-indigo-400 font-mono font-bold select-all">{selectedTrackingOrder.tracking_number}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTrackingOrder(null)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Body split */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 bg-zinc-950/20">
              
              {/* Left Column: Interactive Checkpoints timeline */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-4 select-none">Fulfillment Milestones</span>
                  
                  <div className="space-y-5 relative pl-5 border-l border-zinc-850">
                    {[
                      { step: 1, title: "Custom Design Received", loc: "Digital Customization Studio", desc: "Your 3D custom specifications and design package have been successfully queued for custom fabrication.", activeLoc: "Tailoring Queue" },
                      { step: 2, title: "Custom Fabrication Completed", loc: "Thread 3D Stitched Lab", desc: "Garment printed, assembled, and cleared for delivery packaging after audit inspection.", activeLoc: "Fabricated & Packed" },
                      { step: 3, title: "Package Handed to Carrier", loc: "Logistics Distribution Center", desc: "Dispatched into local logistics network. Package is in transit to destination.", activeLoc: "In Transit" },
                      { step: 4, title: "Delivered to Doorstep", loc: `Destination - ${selectedTrackingOrder.shipping_address?.city || "Customer Address"}`, desc: "Package handed over directly to recipient or placed in secure delivery box.", activeLoc: "Arrived Safely" }
                    ].map((cp) => {
                      const isReached = activeShipmentCheckpointStep >= cp.step;
                      const isCurrent = activeShipmentCheckpointStep === cp.step;
                      
                      return (
                        <div 
                          key={cp.step} 
                          onClick={() => {
                            // Let the client simulate selecting checkpoints for visual fun!
                            if (selectedTrackingOrder.status !== "delivered" && selectedTrackingOrder.status !== "shipped" && cp.step > 2) return;
                            setActiveShipmentCheckpointStep(cp.step);
                          }}
                          className={`relative group transition-all duration-300 ${
                            isReached ? "cursor-pointer" : "opacity-40 cursor-not-allowed select-none"
                          }`}
                        >
                          {/* Stepper Node bullet */}
                          <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                            isReached 
                              ? isCurrent 
                                ? "bg-indigo-500 border-indigo-400 scale-125 ring-4 ring-indigo-500/20" 
                                : "bg-emerald-500 border-emerald-400" 
                              : "bg-zinc-950 border-zinc-850"
                          }`} />

                          <div className={`p-3 rounded-xl border transition-all ${
                            isCurrent 
                              ? "bg-indigo-500/5 border-indigo-500/20" 
                              : "border-transparent group-hover:bg-zinc-900/10"
                          }`}>
                            <h4 className={`text-xs font-bold ${isReached ? "text-zinc-200" : "text-zinc-500"}`}>{cp.title}</h4>
                            <p className="text-sm text-zinc-500 mt-0.5 font-medium">{cp.loc}</p>
                            {isCurrent && (
                              <div className="mt-2 text-sm text-zinc-400 leading-relaxed font-normal space-y-1.5">
                                <p>{cp.desc}</p>
                                <p className="text-xs font-mono text-indigo-400 select-all font-bold">📍 GPS: {cp.activeLoc}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-xl text-sm text-zinc-500 leading-relaxed select-none">
                  💡 <span className="font-semibold text-zinc-400">Interactive Map Sandbox:</span> Click any highlighted milestone on the list to lock onto that package checkpoint coordinate and trace GPS telemetry!
                </div>
              </div>

              {/* Right Column: Premium Visual Route Map simulator */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative min-h-[300px]">
                
                {/* Grid backdrop */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none" />
                
                {/* Header coordinates */}
                <div className="z-10 bg-zinc-900/80 backdrop-blur border border-zinc-850 p-2.5 rounded-xl text-center select-all font-mono text-xs text-zinc-400">
                  🛰️ GPS TRACKING SYNCED IN REAL-TIME: ACTIVE TELEMETRY
                </div>

                {/* Styled CSS Route Journey Map */}
                <div className="flex-1 flex flex-col justify-center items-center py-6 relative z-10 select-none">
                  {/* Origin Star icon */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      🏢
                    </div>
                    <span className="text-sm font-bold text-zinc-500 mt-1.5">Origin</span>
                  </div>

                  {/* Route dashed line */}
                  <div className="w-2/3 h-0.5 border-t-2 border-dashed border-zinc-850 relative">
                    {/* Animated truck positioning along the route */}
                    <div 
                      className="absolute -top-3.5 -translate-x-1/2 transition-all duration-1000 ease-out flex flex-col items-center"
                      style={{ 
                        left: `${
                          activeShipmentCheckpointStep === 1 ? "10%" :
                          activeShipmentCheckpointStep === 2 ? "40%" :
                          activeShipmentCheckpointStep === 3 ? "70%" : "95%"
                        }` 
                      }}
                    >
                      <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30 animate-bounce">
                        🚚
                      </div>
                      <span className="bg-indigo-950/90 text-indigo-400 border border-indigo-500/20 text-[7px] font-bold px-1 py-0.5 rounded mt-1 font-mono uppercase tracking-widest whitespace-nowrap">
                        {activeShipmentCheckpointStep === 4 ? "Delivered!" : "In Route"}
                      </span>
                    </div>
                  </div>

                  {/* Destination Star icon */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      activeShipmentCheckpointStep === 4 
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 scale-110" 
                        : "bg-zinc-900 border border-zinc-850 text-zinc-600"
                    }`}>
                      🏡
                    </div>
                    <span className={`text-sm font-bold mt-1.5 ${activeShipmentCheckpointStep === 4 ? "text-emerald-400 font-extrabold" : "text-zinc-500"}`}>
                      Home Door
                    </span>
                  </div>
                </div>

                {/* Bottom telemetry logs */}
                <div className="z-10 bg-zinc-950 border border-zinc-900 rounded-xl p-3 font-mono text-xs text-zinc-500 space-y-1 select-none">
                  <p className="text-zinc-400 font-bold uppercase tracking-wider mb-1">Telemetry Status</p>
                  <p>• STATUS: <span className={activeShipmentCheckpointStep === 4 ? "text-emerald-400 font-bold" : "text-indigo-400 font-bold"}>
                    {activeShipmentCheckpointStep === 4 ? "PACKAGE DELIVERED SUCCESSFULLY" : "IN ROUTE TO DESTINATION"}
                  </span></p>
                  <p>• SPEED: <span className="text-zinc-300 font-bold">{activeShipmentCheckpointStep === 4 ? "0.00 km/h" : "64.2 km/h"}</span></p>
                  <p>• EST TIME REMAINING: <span className="text-zinc-300 font-bold">
                    {activeShipmentCheckpointStep === 1 ? "14.2 Hours" :
                     activeShipmentCheckpointStep === 2 ? "8.5 Hours" :
                     activeShipmentCheckpointStep === 3 ? "2.1 Hours" : "Completed"}
                  </span></p>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-zinc-850 bg-zinc-900 flex justify-end select-none">
              <button 
                onClick={() => setSelectedTrackingOrder(null)}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Close Tracking Map
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Premium Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <div>
                  <h3 className="font-extrabold text-xs text-white">Garment Size Specifications</h3>
                  <p className="text-xs text-zinc-500 font-medium">Standard unisex measurement guide for true-to-fit sizing</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sizes Grid */}
            <div className="p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-zinc-400 font-mono">
                  <thead>
                    <tr className="border-b border-zinc-900 text-xs text-zinc-500 uppercase tracking-widest">
                      <th className="py-2 px-2">Size (US/EU)</th>
                      <th className="py-2 px-2">Chest Width (in)</th>
                      <th className="py-2 px-2">Body Length (in)</th>
                      <th className="py-2 px-2">Sleeve (in)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: "Small (S)", chest: "34 - 36", length: "28.0", sleeve: "15.75" },
                      { size: "Medium (M)", chest: "38 - 40", length: "29.0", sleeve: "17.0" },
                      { size: "Large (L)", chest: "42 - 44", length: "30.0", sleeve: "18.25" },
                      { size: "Extra Large (XL)", chest: "46 - 48", length: "31.0", sleeve: "19.5" }
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-900/40 hover:bg-zinc-900/20">
                        <td className="py-2.5 px-2 font-extrabold text-zinc-200">{row.size}</td>
                        <td className="py-2.5 px-2 text-zinc-400 font-bold">{row.chest}</td>
                        <td className="py-2.5 px-2 text-zinc-400 font-bold">{row.length}</td>
                        <td className="py-2.5 px-2 text-zinc-400 font-bold">{row.sleeve}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-3 space-y-1">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wide block">How to Measure Chest Width:</span>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Measure around the fullest part of your chest, keeping the tape horizontal. Our custom tees fit true-to-size with a premium retail drop shoulder cut.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-900/30 border-t border-zinc-900 flex justify-end">
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-md"
              >
                Got It, Thanks!
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Premium Floating Support Live Help Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        {!showHelpChat ? (
          <button
            onClick={() => setShowHelpChat(true)}
            className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/35 border border-indigo-400/20 active:scale-95 transition-all cursor-pointer"
            title="Launch Thread 3D Help Desk"
          >
            <span className="text-lg">💬</span>
          </button>
        ) : (
          <div className="w-80 h-[440px] bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden relative border-indigo-500/10 shadow-indigo-500/5 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="bg-zinc-900/60 border-b border-zinc-850 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-extrabold text-sm text-white">Thread 3D Live Help</span>
              </div>
              <button 
                onClick={() => setShowHelpChat(false)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-medium text-sm scrollbar-thin">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-2 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none animate-in fade-in slide-in-from-right duration-100" 
                      : "bg-zinc-900 text-zinc-300 border border-zinc-850 rounded-tl-none animate-in fade-in slide-in-from-left duration-150"
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[7px] text-zinc-500 mt-1 select-none font-mono">{m.time}</span>
                </div>
              ))}
              {isBotTyping && (
                <div className="flex flex-col items-start animate-in fade-in duration-200">
                  <div className="bg-zinc-900 text-zinc-400 border border-zinc-850 px-3 py-2 rounded-xl rounded-tl-none flex items-center gap-1 select-none">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick suggestion pills */}
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-zinc-950 border-t border-zinc-900/60 scrollbar-none select-none">
              <button
                type="button"
                onClick={() => handleQuickActionClick("Track my orders")}
                className="shrink-0 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors"
              >
                🚚 Track Orders
              </button>
              <button
                type="button"
                onClick={() => handleQuickActionClick("Get promo code")}
                className="shrink-0 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors"
              >
                🎫 Promo Code
              </button>
              <button
                type="button"
                onClick={() => handleQuickActionClick("Size guide advice")}
                className="shrink-0 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors"
              >
                📏 Sizing
              </button>
              <button
                type="button"
                onClick={() => handleQuickActionClick("Custom design tips")}
                className="shrink-0 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors"
              >
                🎨 Design Tips
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-2 border-t border-zinc-900 bg-zinc-950/40 flex gap-1.5">
              <input
                type="text"
                placeholder="Ask about shipping, sizing, decals..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 flex-1 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Floating Checkout Success Slide-in Toast Notice */}
      {activeToast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-zinc-950 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl shadow-indigo-500/10 flex gap-3.5 items-start animate-in slide-in-from-top-6 duration-200 select-none">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-base shrink-0 select-none">
            ✉️
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-white">{activeToast.title}</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium mt-1">
              {activeToast.message}
            </p>
            <span className="text-[7px] font-bold text-indigo-400 block mt-2 uppercase tracking-widest animate-pulse font-mono">
              INBOX RECEIPT NOTIFICATION ACTIVE
            </span>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
