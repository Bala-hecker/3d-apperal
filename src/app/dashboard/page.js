"use client";

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
  Heart
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

  // Dashboard view tab selector
  const [activeDashboardTab, setActiveDashboardTab] = useState("shop");
  const [pastOrders, setPastOrders] = useState([]);
  const [loadingPastOrders, setLoadingPastOrders] = useState(false);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [activeShipmentCheckpointStep, setActiveShipmentCheckpointStep] = useState(0);

  // Wishlist state
  const [wishlist, setWishlist] = useState([]);

  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // E-commerce Premium Features State (Coupons, Size Guide, Help-Desk)
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0); // percentage value, e.g. 20 for 20%
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Welcome to Thread 3D Shop Help Desk! 🧵 How can we assist you today?", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [chatInput, setChatInput] = useState("");
  
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

  // Checkout Address Form State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Stripe Payment Portal State
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripePaying, setStripePaying] = useState(false);
  const [stripeCardName, setStripeCardName] = useState("");
  const [stripeCardNumber, setStripeCardNumber] = useState("");
  const [stripeCardExpiry, setStripeCardExpiry] = useState("");
  const [stripeCardCVC, setStripeCardCVC] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card"); // card or upi
  const [upiTimer, setUpiTimer] = useState(300); // 5 minutes in seconds

  // UPI Payment Session Timer countdown
  useEffect(() => {
    let timer = null;
    if (showStripeCheckout && paymentMethod === "upi" && upiTimer > 0) {
      timer = setInterval(() => {
        setUpiTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showStripeCheckout, paymentMethod, upiTimer]);

  useEffect(() => {
    if (showStripeCheckout && paymentMethod === "upi") {
      setUpiTimer(300);
    }
  }, [showStripeCheckout, paymentMethod]);
  
  // Shipping Address input handler

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
          <span style="font-size: 10px; color: #64748b;">Size: ${item.size || "M"} | Qty: ${item.quantity}</span>
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
        loadCart();
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

  // Handle URL query parameters for dynamic view state (e.g. cart drawer, tracking tab)
  useEffect(() => {
    if (typeof window !== "undefined" && !checkingAuth) {
      const params = new URLSearchParams(window.location.search);
      const openCartParam = params.get("cart");
      if (openCartParam === "open") {
        setIsCartOpen(true);
      }
      
      const tabParam = params.get("tab");
      if (tabParam === "tracking") {
        setActiveDashboardTab("tracking");
      }
      
      // Clean query parameters from URL to keep UI clean
      if (openCartParam || tabParam) {
        const newUrl = window.location.pathname + (window.location.hash || "");
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [checkingAuth]);

  // Load products from Supabase
  const fetchProducts = async () => {
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

  // Apply promotional coupon discounts
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");
    const cleaned = couponCode.trim().toUpperCase();
    if (cleaned === "THREAD3D" || cleaned === "SAAS20" || cleaned === "WELCOME20") {
      setAppliedDiscount(20);
      setCouponSuccess("Success! Coupon applied: 20% OFF your total order! 🎉");
    } else if (cleaned === "SUPER50") {
      setAppliedDiscount(50);
      setCouponSuccess("Wow! Super Saver coupon applied: 50% OFF your entire custom order! 🚀");
    } else {
      setCouponError("Invalid promo code. Try using 'THREAD3D' or 'SAAS20'!");
    }
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
    setChatInput("");
    
    // Auto-respond simulating active support desk operators
    setTimeout(() => {
      let replyText = "Our design operators are reviewing your design. Custom apparel production and tailoring takes 5-7 business days.";
      const query = chatInput.toLowerCase();
      if (query.includes("ship") || query.includes("track") || query.includes("order")) {
        replyText = "You can track physical shipments live using the 'Track Orders' tab in your dashboard! Once shipped, you can launch our real-time GPS packaging journey simulation maps!";
      } else if (query.includes("price") || query.includes("discount") || query.includes("promo")) {
        replyText = "Try using the discount coupon code 'THREAD3D' in your shopping cart to get an instant 20% discount on your order!";
      } else if (query.includes("size") || query.includes("fit")) {
        replyText = "Our garments fit true to size! You can click 'Open Size Guide chart' inside the apparel configurator to see detailed chest and sleeve length measurements in inches.";
      } else if (query.includes("3d") || query.includes("decal") || query.includes("custom")) {
        replyText = "Yes! You can upload custom decals, paint brush strokes, and overlay text using our Three.js customizer. Admins get high-resolution transparent print vectors!";
      }
      
      const botMsg = {
        sender: "bot",
        text: replyText,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setChatMessages(prev => [...prev, botMsg]);
    }, 1200);
  };

  // Load cart from localStorage
  const loadCart = () => {
    try {
      const stored = localStorage.getItem("apparel_cart");
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading cart:", err);
    }
  };

  // Sync cart to state and localStorage
  const saveCartState = (newCart) => {
    setCart(newCart);
    localStorage.setItem("apparel_cart", JSON.stringify(newCart));
    
    // Dispatch custom event to sync shared Navbar badge
    window.dispatchEvent(new Event("cart-updated"));
  };

  // Update cart item quantity
  const updateQuantity = (itemId, change) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCartState(updated);
  };

  // Update cart item size
  const updateSize = (itemId, size) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, size };
      }
      return item;
    });
    saveCartState(updated);
  };

  // Delete item from cart
  const removeCartItem = (itemId) => {
    const filtered = cart.filter(item => item.id !== itemId);
    saveCartState(filtered);
  };

  // Clear entire cart
  const clearCart = () => {
    saveCartState([]);
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

  const handleAddWishlistToCart = (product) => {
    handleAddCatalogToCart(product);
    handleRemoveFromWishlist(product.id);
  };

  // Launch Payment Gateway
  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    // Close Drawer and launch premium full-screen Stripe Checkout Simulation Portal!
    setIsCartOpen(false);
    setShowStripeCheckout(true);
  };

  // Secure Order Placement after payment capture
  const executeOrderPlacement = async (gatewayType, details = "") => {
    setIsSubmittingOrder(true);
    setStripePaying(true);
    
    // Hoist variables to parent function scope so they are fully available to nested setTimeout callbacks
    const generatedOrderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generatedTotal = finalTotalAmount;
    
    const shippingInfo = {
      address: customerAddress,
      city: customerCity,
      zip: customerZip,
    };

    // Hydrate cart items with high-fidelity binary data from IndexedDB browser cache
    const hydratedItems = await Promise.all(
      cart.map(async (item) => {
        if (item.designCacheKey) {
          const cachedData = await getDesignData(item.designCacheKey);
          if (cachedData) {
            return {
              ...item,
              customDesignUrl: cachedData.customDesignUrl,
              customDecalUrl: cachedData.customDecalUrl,
              customGlbBase64: cachedData.customGlbBase64,
            };
          }
        }
        return item;
      })
    );

    const orderData = {
      user_id: session?.user?.id || null,
      customer_name: customerName,
      customer_email: session?.user?.email || "customer@example.com",
      customer_phone: customerPhone,
      shipping_address: shippingInfo,
      items: hydratedItems, // Fully hydrated with full binary mesh, overlay, and fabric textures!
      total_amount: generatedTotal,
      status: "Pending",
      payment_gateway: gatewayType,
      payment_details: details
    };

    // 1. Try to sync to Supabase live order table
    try {
      const { error } = await supabase
        .from("orders")
        .insert([orderData]);

      if (error) {
        console.warn("Supabase orders table write failed. Falling back to LocalStorage.", error.message);
      }
    } catch (err) {
      console.warn("Supabase orders network issue. Falling back to LocalStorage.", err);
    }

    // 2. Double-layered LocalStorage redundancy (Guarantees flawless admin operation regardless of schema sync!)
    try {
      const storedOrders = localStorage.getItem("apparel_orders");
      const currentOrders = storedOrders ? JSON.parse(storedOrders) : [];
      
      // Strip heavy Base64 strings for local storage backup to strictly prevent QuotaExceededError
      const lightweightItems = orderData.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        baseTexture: item.baseTexture,
        glbUrl: item.glbUrl,
        thumbnailUrl: item.thumbnailUrl,
        designCacheKey: item.designCacheKey, // Shared IndexedDB reference key
        size: item.size,
        quantity: item.quantity,
        addedAt: item.addedAt,
        customDesignUrl: "[Cached]", 
        customDecalUrl: "[Cached]", 
        customGlbBase64: "[Cached]" 
      }));

      const newOrderLocal = {
        id: generatedOrderId,
        created_at: new Date().toISOString(),
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        shipping_address: orderData.shipping_address,
        items: lightweightItems,
        total_amount: generatedTotal,
        status: orderData.status,
        payment_gateway: gatewayType
      };
      
      localStorage.setItem("apparel_orders", JSON.stringify([newOrderLocal, ...currentOrders]));
    } catch (err) {
      console.error("Failed to write to LocalStorage backup:", err);
    }

    // 3. Complete Checkout success state
    setTimeout(() => {
      setCheckoutSuccess(true);
      setStripePaying(false);
      setIsSubmittingOrder(false);
      setShowStripeCheckout(false);

      // Trigger a beautiful, high-fidelity customer notification and toast alert!
      const newOrderNotification = {
        id: `noti_${Date.now()}`,
        title: gatewayType === "UPI" ? "⚡ UPI Payment Received Successfully!" : "🛒 Stripe Order Placed Successfully!",
        message: `Your custom apparel order has been received via ${gatewayType}! Order ID: #${generatedOrderId.substring(0, 15)}... Total Charged: ₹${generatedTotal.toLocaleString('en-IN')}. High-fidelity design coordinates have been transmitted to our textile manufacturing facility.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
        isOrder: true,
        orderId: generatedOrderId,
        total: generatedTotal
      };
      updateNotifications(prev => [newOrderNotification, ...prev]);
      setActiveToast({
        title: "🎉 Order Confirmed!",
        message: `Design sent to facility. Order ID: ${generatedOrderId.substring(0, 10)}...`
      });
      
      setTimeout(() => {
        clearCart();
        setCheckoutSuccess(false);
        setIsCartOpen(false);
        setIsCheckingOut(false);
        
        // Reset states
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setCustomerCity("");
        setCustomerZip("");
        setStripeCardName("");
        setStripeCardNumber("");
        setStripeCardExpiry("");
        setStripeCardCVC("");
        setPaymentMethod("card");
      }, 3000);
    }, 2500); // Realistic transaction capture delay
  };

  const handleExecutePayment = async (e) => {
    e.preventDefault();
    await executeOrderPlacement("Stripe Card", `Cardholder: ${stripeCardName}`);
  };

  const triggerUpiSimulation = async (appName) => {
    await executeOrderPlacement("UPI", `App: ${appName}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // Calculate cart metrics with applied coupon discount!
  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = cart.reduce((acc, curr) => acc + ((curr.price || 3999) * curr.quantity), 0);
  const discountAmount = subtotal * (appliedDiscount / 100);
  const finalTotalAmount = subtotal - discountAmount;

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

    const newCart = [...cart, cartItem];
    saveCartState(newCart);

    setActiveToast({
      title: "🛒 Added to Cart",
      message: `${product.name} has been added to your shopping bag!`
    });
  };

  // Filter categories
  const categories = ["all", "t-shirt", "hoodie", "jacket", "activewear"];
  const filteredProducts = products
    .filter(product => {
      if (isTemplateProduct(product)) return false;
      if (activeCategory !== "all") {
        const cat = (product.category || "").toLowerCase();
        if (cat !== activeCategory && !product.name.toLowerCase().includes(activeCategory)) return false;
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
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[8px] font-extrabold flex items-center justify-center animate-pulse shadow-md">
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
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-900/40">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-[10px] text-zinc-600 font-medium select-none">
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
                        <h4 className={`text-[10px] font-extrabold ${noti.read ? "text-zinc-400" : "text-white"}`}>
                          {noti.title}
                        </h4>
                        <span className="text-[7px] text-zinc-500 font-mono shrink-0">{noti.time}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-relaxed font-medium mt-1">
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
        
        {/* Modern Premium Hero banner */}
        <section className="mb-14 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>Interactive 3D Apparel Lab</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight">
            Design Your Own High-End Custom Apparel
          </h1>
          
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed max-w-xl mx-auto">
            Choose a premium base garment from our designer canvas selection below, enter our real-time 3D studio, and custom-craft your own apparel in minutes.
          </p>
        </section>

        {/* Primary View Switcher: Shop vs Tracking */}
        <section className="mb-12 max-w-2xl mx-auto bg-zinc-900/60 border border-zinc-900 rounded-xl p-1 flex shadow-inner gap-1 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveDashboardTab("shop")}
            className={`flex-1 text-center py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 ${
              activeDashboardTab === "shop"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-extrabold"
                : "text-zinc-500 hover:text-zinc-355"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Shop Catalog</span>
            <span className="md:hidden">Shop</span>
          </button>
          
          <button
            onClick={() => setActiveDashboardTab("3d-design")}
            className={`flex-1 text-center py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 ${
              activeDashboardTab === "3d-design"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-extrabold"
                : "text-zinc-500 hover:text-zinc-355"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span className="hidden md:inline">3D Studio</span>
            <span className="md:hidden">Studio</span>
          </button>

          <button
            onClick={() => {
              setActiveDashboardTab("wishlist");
              loadWishlist();
            }}
            className={`flex-1 text-center py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 ${
              activeDashboardTab === "wishlist"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-extrabold"
                : "text-zinc-500 hover:text-zinc-355"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Saved Wishlist</span>
            <span className="md:hidden">Wishlist</span>
            {wishlist.length > 0 && (
              <span className="bg-zinc-850 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {wishlist.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveDashboardTab("tracking");
              fetchPastOrders();
            }}
            className={`flex-1 text-center py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 ${
              activeDashboardTab === "tracking"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-extrabold"
                : "text-zinc-500 hover:text-zinc-355"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Track Orders</span>
            <span className="md:hidden">Track</span>
            {pastOrders.length > 0 && (
              <span className="bg-zinc-850 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pastOrders.length}
              </span>
            )}
          </button>
        </section>

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
              <div className="flex items-center gap-2 flex-wrap">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all uppercase tracking-wider cursor-pointer ${
                      activeCategory === category
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                        : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-500 hover:text-white hover:bg-zinc-900/60"
                    }`}
                  >
                    {category === "all" ? "All" : category.charAt(0).toUpperCase() + category.slice(1) + "s"}
                  </button>
                ))}
                {(searchQuery || activeCategory !== "all") && (
                  <span className="text-[10px] text-zinc-500 font-medium ml-1">{filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}</span>
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
                  {filteredProducts.map((product) => {
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
                            <div className="absolute top-2 left-2 bg-zinc-950/80 border border-zinc-800 text-[9px] text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                              {product.category}
                            </div>
                          )}
                          {/* Multiple photos indicator */}
                          {galleryImages.length > 0 && (
                            <div className="absolute top-2 right-2 bg-zinc-950/80 border border-zinc-800 text-[9px] text-zinc-400 font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {galleryImages.length + 1} photos
                            </div>
                          )}
                          {/* Quick add overlay on hover */}
                          <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-zinc-950 to-transparent transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddCatalogToCart(product); }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                            <span className="text-[9px] text-emerald-500 font-bold">Free Ship</span>
                          </div>
                          <Link
                            href={`/product/${product.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full py-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold text-center transition-all"
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
              <p className="text-[11px] text-zinc-500 mb-5 leading-relaxed">
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
                        className="text-[10px] text-rose-400 hover:text-rose-350 mt-1 select-none font-bold underline underline-offset-2 cursor-pointer"
                      >
                        Remove Decal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-center text-zinc-400 select-none">
                    <span className="text-2xl mb-1.5">🖼️</span>
                    <p className="text-xs font-bold">Click to select graphic</p>
                    <p className="text-[10px] text-zinc-650 mt-1">Supports PNG, JPG transparent stickers</p>
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
                <p className="text-[10px] text-zinc-500 mt-1">Select a template canvas model mesh below to enter the 3D customizer.</p>
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
                            <span className="text-[9px] bg-indigo-600/95 text-white px-2 py-0.5 rounded font-mono uppercase font-extrabold animate-pulse">
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
                <span>My Saved Wishlist ({products.filter(p => wishlist.includes(p.id)).length})</span>
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Review your saved items, move them directly to your shopping bag, or view full detail metrics.</p>
            </div>

            {products.filter(p => wishlist.includes(p.id)).length === 0 ? (
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
                {products.filter(p => wishlist.includes(p.id)).map((product) => (
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
                        <span className="text-[9px] text-zinc-500">{product.category || "Apparel"}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-zinc-900/40">
                        <button
                          onClick={() => handleAddWishlistToCart(product)}
                          className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Move to Bag</span>
                        </button>
                        <button
                          onClick={() => router.push(`/product/${product.id}`)}
                          className="py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/40 hover:border-zinc-650 text-zinc-355 hover:text-white rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer"
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
                className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
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
                <p className="text-sm font-semibold text-zinc-500">You haven't customized any apparel yet.</p>
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
                            <span className="text-[10px] text-zinc-500 font-semibold select-none">
                              Placed on: {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-2 font-medium">
                            Shipping to: <strong className="text-zinc-200">{order.customer_name}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider select-none">Total Charged</p>
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
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 font-bold text-[10px] transition-all duration-300 ${
                                    isCompleted 
                                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110" 
                                      : "bg-zinc-950 border-zinc-800 text-zinc-500"
                                  } ${isActive ? "ring-4 ring-indigo-500/10" : ""}`}
                                >
                                  {isCompleted && !isActive ? (
                                    <span className="text-[9px] font-extrabold">✓</span>
                                  ) : (
                                    <span>{idx + 1}</span>
                                  )}
                                </div>
                                <span className={`text-[10px] sm:text-[11px] font-extrabold mt-2 tracking-tight ${isCompleted ? "text-indigo-400" : "text-zinc-500"}`}>
                                  {step.label}
                                </span>
                                <span className="text-[8px] sm:text-[9px] text-zinc-600 mt-0.5 hidden sm:inline select-none">
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
                          <h5 className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest select-none border-b border-zinc-900 pb-1">Custom Designs</h5>
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
                                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Qty: {item.quantity} | Customized Base</p>
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
                            <h5 className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest select-none border-b border-zinc-900 pb-1">Delivery Details</h5>
                            
                            {/* Real Date/Time Estimated Delivery */}
                            <div className="mb-2.5 bg-indigo-950/10 border border-indigo-900/10 rounded-lg p-2.5 flex items-center gap-2.5 text-indigo-400 select-none">
                              <span className="text-xs">📅</span>
                              <div className="text-[9px] font-semibold leading-relaxed">
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
                              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
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
                                className="w-full bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 hover:text-white text-indigo-400 text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl transition-all shadow-md cursor-pointer text-center"
                              >
                                Track Package Journey Live
                              </button>
                            )}

                            {/* Download PDF Invoice trigger */}
                            <button
                              onClick={() => handleDownloadInvoice(order)}
                              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
                            >
                              <span>📄</span> Download Invoice PDF
                            </button>

                            {/* Dynamic Cancel Action for Customers */}
                            {(!order.status || ["pending", "payment_pending", "processing"].includes(order.status.toLowerCase())) ? (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="w-full bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 hover:text-white text-red-400 text-[9px] font-bold uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer text-center"
                              >
                                Cancel Order
                              </button>
                            ) : (
                              <div className="text-center py-1.5 bg-zinc-950/40 border border-zinc-900 rounded-lg text-[8px] text-zinc-500 font-bold uppercase tracking-wider select-none">
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

      {/* Modern Slide-out Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />

          <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
            {/* Drawer Content */}
            <div className="w-full bg-zinc-950 border-l border-zinc-900 flex flex-col justify-between shadow-2xl relative">
              
              {/* Checkout success modal */}
              {checkoutSuccess && (
                <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Order Placed Successfully!</h3>
                  <p className="text-xs text-zinc-400 mt-2 max-w-xs leading-relaxed">
                    Thank you! Your high-fidelity customized design has been sent to our manufacturing print facility. We'll update you as soon as it ships!
                  </p>
                </div>
              )}

              {/* Drawer Header */}
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-extrabold text-base">
                    {isCheckingOut ? "Secure Checkout" : "Custom Shopping Cart"}
                  </h2>
                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">
                    {totalItems} items
                  </span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer List or Checkout Form */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 && !checkoutSuccess ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-12">
                    <CartIcon className="w-12 h-12 text-zinc-800 mb-3" />
                    <p className="text-sm font-semibold text-zinc-400">Your shopping cart is empty.</p>
                    <p className="text-xs text-zinc-600 mt-1 max-w-[200px] mx-auto">
                      Go to the studio page and click "Add to Cart" to capture your customized garments!
                    </p>
                  </div>
                ) : isCheckingOut ? (
                  /* Checkout Shipping Address Form */
                  <form onSubmit={handlePlaceOrder} className="space-y-4">
                    <div className="border-b border-zinc-900 pb-3 mb-4">
                      <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Shipping Details</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Please provide delivery address details for your order.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter recipient name"
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        required
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Enter street address"
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          City / Region
                        </label>
                        <input
                          type="text"
                          required
                          value={customerCity}
                          onChange={(e) => setCustomerCity(e.target.value)}
                          placeholder="e.g. New York"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Postal / ZIP Code
                        </label>
                        <input
                          type="text"
                          required
                          value={customerZip}
                          onChange={(e) => setCustomerZip(e.target.value)}
                          placeholder="e.g. 10001"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <button
                        type="submit"
                        disabled={isSubmittingOrder}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingOrder ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Securing order...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirm Order & Pay (₹${subtotal.toLocaleString('en-IN')})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCheckingOut(false)}
                        className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                      >
                        Back to Shopping Cart
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Original Cart list */
                  cart.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-zinc-900/40 border border-zinc-900/80 rounded-xl p-4 flex gap-4 items-start relative group"
                    >
                      {/* Customized Image Preview */}
                      <div className="w-20 h-20 bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative">
                        <img 
                          src={item.thumbnailUrl || item.customDesignUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-0.5 left-0.5 bg-indigo-600 text-white text-[8px] font-extrabold px-1 rounded uppercase tracking-tighter">
                          Custom
                        </div>
                      </div>

                      {/* Item Specs & Controls */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-zinc-200 truncate pr-6">
                          {item.name}
                        </h4>
                        
                        {/* Size Picker Selector */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Size:</span>
                            <div className="flex gap-1">
                              {["S", "M", "L", "XL"].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => updateSize(item.id, s)}
                                  className={`text-[9px] font-bold w-5 h-5 border rounded flex items-center justify-center transition-all cursor-pointer ${
                                    item.size === s
                                      ? "bg-indigo-600 border-indigo-500 text-white"
                                      : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-white"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => setShowSizeGuide(true)}
                            className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                          >
                            Size Guide
                          </button>
                        </div>

                        {/* Quantity controls & Price */}
                        <div className="flex items-center justify-between mt-3.5 border-t border-zinc-900/50 pt-2.5">
                          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-lg">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-0.5 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold text-zinc-300 w-4 text-center select-none">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-0.5 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-extrabold text-indigo-400 font-mono">
                            ₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Trash Delete button */}
                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="absolute top-3 right-3 p-1 bg-zinc-950/80 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 text-zinc-600 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer (Summary & Checkout) */}
              {cart.length > 0 && !isCheckingOut && (
                <div className="p-5 border-t border-zinc-900 bg-zinc-950/30 backdrop-blur-md space-y-4">
                  {/* Dynamic Promo Code Discount Box */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      Promotional Discount Coupon
                    </span>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. THREAD3D, SAAS20"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-zinc-200 focus:outline-none focus:border-indigo-500 flex-1 uppercase"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                    {couponError && (
                      <p className="text-[10px] font-bold text-rose-400 mt-1 select-none">⚠️ {couponError}</p>
                    )}
                    {couponSuccess && (
                      <p className="text-[10px] font-bold text-emerald-400 mt-1 select-none">✓ {couponSuccess}</p>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-1.5 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono text-zinc-200">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400/90 font-medium">
                        <span>Discount Coupon ({appliedDiscount}% Off)</span>
                        <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping (Manufacturing Delivery)</span>
                      <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        FREE Express
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-900 pt-3 text-sm font-extrabold text-white">
                      <span>Total Value</span>
                      <span className="font-mono text-indigo-400">₹{finalTotalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Address details</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Premium Full-Screen Stripe Payment Gateway Overlay */}
      {showStripeCheckout && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col md:flex-row overflow-y-auto">
          {/* Back button */}
          <button 
            onClick={() => setShowStripeCheckout(false)}
            className="absolute top-6 left-6 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs font-semibold z-20"
          >
            <X className="w-4 h-4" />
            <span>Cancel payment & Return</span>
          </button>

          {/* Left Pane - Order Summary & Brand */}
          <div className="w-full md:w-1/2 bg-zinc-900/40 border-r border-zinc-900 p-8 md:p-16 flex flex-col justify-between min-h-[300px] md:min-h-screen">
            <div className="space-y-8 mt-8">
              {/* Stripe Brand & Locker */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] tracking-widest font-mono uppercase font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Stripe Testmode Portal
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  Thread 3D Store
                </h2>
                <div className="text-4xl font-black text-indigo-400 font-mono">
                  ₹{finalTotalAmount.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Order Items Scrollable */}
              <div className="space-y-4 pt-4 border-t border-zinc-900/60 max-h-60 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/60">
                    <img 
                      src={item.thumbnailUrl || item.customDesignUrl} 
                      alt={item.name} 
                      className="w-12 h-12 rounded-lg border border-zinc-800 object-cover bg-zinc-900" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs text-white truncate">{item.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Size: <span className="text-zinc-300 font-bold">{item.size}</span> • Qty: <span className="text-zinc-300 font-bold">{item.quantity}</span></p>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Secure Footer */}
            <div className="space-y-4 mt-8 pt-6 border-t border-zinc-900/60">
              <div className="flex items-center gap-3 text-zinc-500">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="text-[10px] leading-relaxed">
                  Guaranteed safe and secure credit card checkouts backed by industry-standard AES-256 Stripe encryptions.
                </span>
              </div>
            </div>
          </div>

          {/* Right Pane - Payment Selector & Details */}
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-zinc-950 relative min-h-[450px]">
            {/* Payment Container Box */}
            <div className="max-w-md w-full mx-auto space-y-6">
              
              {/* Tabs */}
              <div className="flex bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-900">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex-1 py-2 text-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    paymentMethod === "card"
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Credit Card (Stripe)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`flex-1 py-2 text-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    paymentMethod === "upi"
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  UPI / Indian Apps (Razorpay)
                </button>
              </div>

              {paymentMethod === "card" ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Secure Card Payment</h3>
                    <p className="text-xs text-zinc-500">Enter credit card details. Feel free to use the Stripe Sandbox card number below:</p>
                  </div>

                  {/* Demo Sandbox Alert Badge */}
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                    <span className="font-medium">Sandbox Card:</span>
                    <span 
                      onClick={() => {
                        setStripeCardNumber("4242 4242 4242 4242");
                        setStripeCardExpiry("12/28");
                        setStripeCardCVC("424");
                        setStripeCardName(customerName || "John Doe");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                      title="Click to auto-fill sandbox card info"
                    >
                      4242 4242 4242 4242 (Click to Auto-fill)
                    </span>
                  </div>

                  <form onSubmit={handleExecutePayment} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Cardholder Name</label>
                      <input 
                        type="text" 
                        required 
                        value={stripeCardName}
                        onChange={(e) => setStripeCardName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Card Number</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          value={stripeCardNumber}
                          onChange={(e) => setStripeCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <CreditCard className="w-4 h-4 text-zinc-600 absolute left-3.5 top-3.5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Expiration Date</label>
                        <input 
                          type="text" 
                          required 
                          value={stripeCardExpiry}
                          onChange={(e) => setStripeCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          maxLength="5"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">CVC / CVV</label>
                        <div className="relative">
                          <input 
                            type="password" 
                            required 
                            value={stripeCardCVC}
                            onChange={(e) => setStripeCardCVC(e.target.value)}
                            placeholder="•••"
                            maxLength="4"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <Lock className="w-4 h-4 text-zinc-600 absolute left-3.5 top-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Confirm Pay Button */}
                    <button
                      type="submit"
                      disabled={stripePaying}
                      className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-all active:scale-[0.99]"
                    >
                      {stripePaying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Processing Stripe Payment...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pay & Secure Design Bundle (₹{finalTotalAmount.toLocaleString('en-IN')})</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                      <span>Instant UPI Payment</span>
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest font-mono">Razorpay UPI</span>
                    </h3>
                    <p className="text-xs text-zinc-500">Scan the secure QR Code to complete the checkout instantly using Google Pay, PhonePe, Paytm, or BHIM.</p>
                  </div>

                  {/* Scannable QR Code */}
                  <div className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
                    <div className="relative p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                          `upi://pay?pa=designaravis@gmail.com&pn=Thread3D%20Studio&am=${finalTotalAmount}&cu=INR&tn=Thread3D%20Order`
                        )}&color=6366f1&bgcolor=09090b`}
                        alt="UPI QR Code"
                        className="w-44 h-44 rounded-lg bg-zinc-950"
                      />
                      {stripePaying && (
                        <div className="absolute inset-0 bg-zinc-950/80 rounded-xl flex flex-col items-center justify-center">
                          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                          <span className="text-[10px] text-zinc-400 mt-2 font-mono">Verifying payment...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center space-y-1 select-none">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold">Scan QR code using UPI apps</p>
                      <div className="text-zinc-500 text-[10px] flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                        <span>Expires in:</span>
                        <span className="text-indigo-400 font-bold font-mono">
                          {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* App Redirect Buttons */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Or Pay directly using apps</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => triggerUpiSimulation("Google Pay")}
                        disabled={stripePaying || upiTimer === 0}
                        className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-colors text-white font-semibold disabled:opacity-50"
                      >
                        <span className="text-xs font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">GPay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerUpiSimulation("PhonePe")}
                        disabled={stripePaying || upiTimer === 0}
                        className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-colors text-white font-semibold disabled:opacity-50"
                      >
                        <span className="text-xs font-bold text-purple-400">PhonePe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerUpiSimulation("Paytm")}
                        disabled={stripePaying || upiTimer === 0}
                        className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-colors text-white font-semibold disabled:opacity-50"
                      >
                        <span className="text-xs font-bold text-sky-400">Paytm</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Payment completed verification */}
                  <button
                    type="button"
                    onClick={() => triggerUpiSimulation("QR Code Scan")}
                    disabled={stripePaying || upiTimer === 0}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-all active:scale-[0.99] mt-4"
                  >
                    {stripePaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying UPI payment with bank...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>I have completed the payment (₹{finalTotalAmount.toLocaleString('en-IN')})</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                    <span className="text-[10px] text-zinc-500 font-mono select-all">({selectedTrackingOrder.id.substring(0, 10)}...)</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5 select-none">
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
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-4 select-none">Fulfillment Milestones</span>
                  
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
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{cp.loc}</p>
                            {isCurrent && (
                              <div className="mt-2 text-[10px] text-zinc-400 leading-relaxed font-normal space-y-1.5">
                                <p>{cp.desc}</p>
                                <p className="text-[9px] font-mono text-indigo-400 select-all font-bold">📍 GPS: {cp.activeLoc}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-xl text-[10px] text-zinc-500 leading-relaxed select-none">
                  💡 <span className="font-semibold text-zinc-400">Interactive Map Sandbox:</span> Click any highlighted milestone on the list to lock onto that package checkpoint coordinate and trace GPS telemetry!
                </div>
              </div>

              {/* Right Column: Premium Visual Route Map simulator */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative min-h-[300px]">
                
                {/* Grid backdrop */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none" />
                
                {/* Header coordinates */}
                <div className="z-10 bg-zinc-900/80 backdrop-blur border border-zinc-850 p-2.5 rounded-xl text-center select-all font-mono text-[9px] text-zinc-400">
                  🛰️ GPS TRACKING SYNCED IN REAL-TIME: ACTIVE TELEMETRY
                </div>

                {/* Styled CSS Route Journey Map */}
                <div className="flex-1 flex flex-col justify-center items-center py-6 relative z-10 select-none">
                  {/* Origin Star icon */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      🏢
                    </div>
                    <span className="text-[8px] font-bold text-zinc-500 mt-1.5">Origin</span>
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
                    <span className={`text-[8px] font-bold mt-1.5 ${activeShipmentCheckpointStep === 4 ? "text-emerald-400 font-extrabold" : "text-zinc-500"}`}>
                      Home Door
                    </span>
                  </div>
                </div>

                {/* Bottom telemetry logs */}
                <div className="z-10 bg-zinc-950 border border-zinc-900 rounded-xl p-3 font-mono text-[9px] text-zinc-500 space-y-1 select-none">
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
                  <p className="text-[9px] text-zinc-500 font-medium">Standard unisex measurement guide for true-to-fit sizing</p>
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
                    <tr className="border-b border-zinc-900 text-[9px] text-zinc-500 uppercase tracking-widest">
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
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide block">How to Measure Chest Width:</span>
                <p className="text-[9px] text-zinc-500 leading-relaxed font-medium">
                  Measure around the fullest part of your chest, keeping the tape horizontal. Our custom tees fit true-to-size with a premium retail drop shoulder cut.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-900/30 border-t border-zinc-900 flex justify-end">
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-md"
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
          <div className="w-80 h-96 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden relative border-indigo-500/10 shadow-indigo-500/5 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="bg-zinc-900/60 border-b border-zinc-850 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-extrabold text-[10px] text-white">Thread 3D Live Help</span>
              </div>
              <button 
                onClick={() => setShowHelpChat(false)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-medium text-[10px]">
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
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-2 border-t border-zinc-900 bg-zinc-950/40 flex gap-1.5">
              <input
                type="text"
                placeholder="Ask about shipping, sizing, decals..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg text-[9px] text-zinc-200 focus:outline-none focus:border-indigo-500 flex-1 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
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
            <h4 className="text-[10px] font-extrabold text-white">{activeToast.title}</h4>
            <p className="text-[9px] text-zinc-400 leading-relaxed font-medium mt-1">
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
