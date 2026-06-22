"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Sparkles, ChevronDown, Palette, CreditCard, CheckCircle, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

const getShippingDetails = (zip) => {
  const cleanZip = (zip || "").trim().replace(/\D/g, "");
  
  if (!cleanZip) {
    return { distance: 0, fee: 0, mode: "Enter Postal Code" };
  }
  
  let distance = 950;
  let fee = 199;
  let mode = "National Air Express";

  if (cleanZip.length >= 2) {
    const prefix = cleanZip.substring(0, 2);
    const prefixNum = parseInt(prefix, 10);
    
    if (prefixNum >= 60 && prefixNum <= 64) {
      if (prefixNum === 60) {
        distance = 45;
        fee = 49;
        mode = "Local Courier Service";
      } else {
        distance = 250;
        fee = 99;
        mode = "Intra-State Express";
      }
    } else if (prefixNum >= 56 && prefixNum <= 59) {
      distance = 350;
      fee = 99;
      mode = "Regional Fast Courier";
    } else if (prefixNum >= 50 && prefixNum <= 53) {
      distance = 630;
      fee = 149;
      mode = "National Surface Line";
    } else if (prefixNum >= 67 && prefixNum <= 69) {
      distance = 680;
      fee = 149;
      mode = "National Surface Line";
    } else if (prefixNum >= 40 && prefixNum <= 44) {
      distance = 1180;
      fee = 249;
      mode = "Premium Zone Delivery";
    } else if (prefixNum >= 70 && prefixNum <= 74) {
      distance = 1660;
      fee = 299;
      mode = "Premium Zone Delivery";
    } else if ((prefixNum >= 11 && prefixNum <= 28) || prefixNum === 30 || prefixNum === 31 || prefixNum === 32 || prefixNum === 33 || prefixNum === 34) {
      distance = 2200;
      fee = 299;
      mode = "Premium Zone Delivery";
    } else {
      distance = 950;
      fee = 199;
      mode = "National Air Express";
    }
  }

  return { distance, fee, mode };
};


function ProductPickerMessage({ isLocked, onSelect, productsList, loadingProducts, searchQuery, setSearchQuery }) {
  const [selected, setSelected] = useState(null);

  const filtered = productsList.filter((p) =>
    (p.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  if (isLocked) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-tl-sm w-[90%] text-zinc-300">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Product Selected</span>
        {selected ? (
          <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-lg border border-zinc-855">
            {getDisplayImage(selected) && (
              <img src={getDisplayImage(selected)} alt={selected.name} className="w-8 h-8 rounded object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{selected.name}</p>
              <p className="text-[10px] text-zinc-400 font-semibold font-mono">₹{selected.price.toLocaleString("en-IN")}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs italic text-zinc-500">No product selected</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl rounded-tl-sm w-[90%] text-zinc-300 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <span className="text-xs font-bold text-white">Select a template or catalog item</span>
      </div>

      <input
        type="text"
        placeholder="Search product..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
      />

      <div className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
        {loadingProducts ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[10px] text-zinc-500 text-center py-2 font-medium">No matching products found</p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className={`w-full text-left flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                selected?.id === p.id
                  ? "bg-indigo-600/15 border-indigo-500/35 text-white"
                  : "bg-zinc-950/40 border-zinc-850 hover:bg-zinc-950 text-zinc-450 hover:text-zinc-200"
              }`}
            >
              {getDisplayImage(p) && (
                <img src={getDisplayImage(p)} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate leading-snug">{p.name}</p>
                <p className="text-[9px] font-mono mt-0.5">₹{p.price.toLocaleString("en-IN")}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => onSelect(selected)}
          className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          Confirm {selected.name.substring(0, 16)}...
        </button>
      )}
    </div>
  );
}

function SizeQtyPickerMessage({ isLocked, onConfirm, selectedProduct }) {
  const [itemsList, setItemsList] = useState([]);
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);

  // Sync the quantity spinner to reflect the currently configured item count for the selected size
  useEffect(() => {
    const configured = itemsList.find((item) => item.size === selectedSize);
    setQuantity(configured ? configured.quantity : 1);
  }, [selectedSize, itemsList]);

  const addConfig = () => {
    const existingIdx = itemsList.findIndex((item) => item.size === selectedSize);
    if (existingIdx > -1) {
      const updated = [...itemsList];
      updated[existingIdx].quantity = quantity;
      setItemsList(updated);
    } else {
      setItemsList([...itemsList, { size: selectedSize, quantity }]);
    }
  };

  const removeConfig = (idx) => {
    setItemsList(itemsList.filter((_, i) => i !== idx));
  };

  if (isLocked) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-tl-sm w-[90%] text-zinc-300">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Sizes Selected</span>
        <div className="space-y-1 mt-1">
          {itemsList.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs font-mono text-zinc-400 bg-zinc-950/60 px-2.5 py-1 rounded">
              <span>Size {item.size}</span>
              <span className="font-bold text-white">× {item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl rounded-tl-sm w-[90%] text-zinc-300 space-y-3">
      <span className="text-xs font-bold text-white block">Add Size & Quantity Variations</span>

      <div className="space-y-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block mb-1">Size</label>
          <div className="flex gap-1">
            {["S", "M", "L", "XL", "XXL"].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-all ${
                  selectedSize === sz
                    ? "bg-indigo-600 text-white font-extrabold"
                    : "bg-zinc-950 border border-zinc-850 text-zinc-500 hover:text-zinc-350"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block mb-1">Quantity</label>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-6 h-6 flex items-center justify-center text-xs text-zinc-500 hover:text-white cursor-pointer font-bold"
              >
                -
              </button>
              <span className="w-6 text-center text-xs font-mono text-white font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-6 h-6 flex items-center justify-center text-xs text-zinc-500 hover:text-white cursor-pointer font-bold"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={addConfig}
            className="self-end px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase rounded-lg tracking-wider cursor-pointer"
          >
            {itemsList.some((item) => item.size === selectedSize) ? "Update Qty" : "+ Add size"}
          </button>
        </div>
      </div>

      {itemsList.length > 0 && (
        <div className="space-y-1 border-t border-zinc-800/80 pt-2.5">
          <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block mb-1">Configured items</label>
          {itemsList.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs font-mono bg-zinc-950/60 px-2.5 py-1 rounded">
              <span>Size {item.size} × {item.quantity}</span>
              <button
                type="button"
                onClick={() => removeConfig(idx)}
                className="text-rose-405 hover:text-rose-350 text-[10px] uppercase font-bold cursor-pointer flex items-center gap-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {itemsList.length > 0 && (
        <button
          type="button"
          onClick={() => onConfirm(itemsList)}
          className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-600/10"
        >
          Confirm items
        </button>
      )}
    </div>
  );
}

function PaymentSummaryMessage({ isLocked, consultationData, designerFee, designerPaymentLoading, handlePayment }) {
  const { selectedProduct, configurations, name, phone, email } = consultationData;

  const [shippingZip, setShippingZip] = useState("");
  useEffect(() => {
    try {
      const savedAddress = localStorage.getItem("apparel_saved_address");
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress);
        if (parsed.zip) {
          setShippingZip(parsed.zip);
        }
      }
    } catch (e) {}
  }, []);

  const totalQuantity = configurations.reduce((acc, c) => acc + c.quantity, 0);
  const productsSubtotal = (selectedProduct?.price || 0) * totalQuantity;
  
  const shippingInfo = getShippingDetails(shippingZip);
  const deliveryFee = shippingZip.trim().length >= 2 ? shippingInfo.fee : 0;
  const totalPayable = designerFee + productsSubtotal + deliveryFee;

  if (isLocked) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-tl-sm w-[90%] text-zinc-300">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Payment Successful</span>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-2 rounded text-emerald-400 text-[11px] font-bold font-mono">
          ₹{totalPayable.toLocaleString("en-IN")} Total Paid Successfully
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-500/20 p-4 rounded-2xl rounded-tl-sm w-[95%] text-zinc-300 space-y-3">
      <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-xs font-bold text-white block">Personalized Designer Service Checkout</span>
          <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5">Please review before payment</span>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] leading-relaxed">
        <div className="flex justify-between">
          <span className="text-zinc-500">Customer Name:</span>
          <span className="text-white font-semibold">{name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Contact Number:</span>
          <span className="text-white font-mono">{phone}</span>
        </div>
        {email && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Email:</span>
            <span className="text-white font-semibold truncate max-w-[150px]">{email}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-500">Product:</span>
          <span className="text-white font-semibold truncate max-w-[150px]">{selectedProduct?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Sizes Selected:</span>
          <span className="text-white font-mono font-bold">{configurations.map(c => `${c.size}(x${c.quantity})`).join(", ")}</span>
        </div>
      </div>

      <div className="space-y-1 border-t border-zinc-800 pt-2.5 font-mono text-[11px]">
        <div className="flex justify-between">
          <span className="text-zinc-500">Designer Service Fee:</span>
          <span className="text-white">₹{designerFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Product Subtotal:</span>
          <span className="text-white">₹{(selectedProduct?.price || 0).toLocaleString("en-IN")} × {totalQuantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Delivery Fee:</span>
          <span className="text-white">
            {shippingZip.trim().length >= 2 ? `₹${deliveryFee}` : "Calculated at checkout"}
          </span>
        </div>
        <div className="flex justify-between text-xs font-bold border-t border-zinc-800/80 pt-1.5 mt-1">
          <span className="text-white font-bold uppercase tracking-wider">Total Payable:</span>
          <span className="text-emerald-400 font-extrabold">₹{totalPayable.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={designerPaymentLoading}
        onClick={handlePayment}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-550 disabled:opacity-60 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/15"
      >
        {designerPaymentLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay ₹{totalPayable.toLocaleString("en-IN")} & Book</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1 text-[9px] text-zinc-650 font-semibold select-none">
        <ShieldCheck className="w-3 h-3" />
        <span>Secure Gateway Verification</span>
      </div>
    </div>
  );
}

const WELCOME_MESSAGE = {
  sender: "bot",
  text: "Hey there! 👋 I'm your Thread 3D assistant. Ask me about orders, sizing, custom designs, discounts, or anything else!",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const chatEndRef = useRef(null);

  // Auth User state
  const [currentUser, setCurrentUser] = useState(null);

  // Designer consultation state
  const [showDesignerCard, setShowDesignerCard] = useState(false);
  const [designerFee, setDesignerFee] = useState(500);
  const [designerEnabled, setDesignerEnabled] = useState(true);
  const [designerPaymentLoading, setDesignerPaymentLoading] = useState(false);
  const [designerPaymentSuccess, setDesignerPaymentSuccess] = useState(false);

  // Consultation Conversation Flow States
  const [consultationStep, setConsultationStep] = useState(null); // null | 'ask_product' | 'ask_size_qty' | 'review_payment'
  const [consultationData, setConsultationData] = useState({
    name: "",
    phone: "",
    email: "",
    selectedProduct: null,
    configurations: [], // { size, quantity }
  });
  const [productsList, setProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingEmail, setShippingEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [saveShippingAddress, setSaveShippingAddress] = useState(true);
  const [modalErrors, setModalErrors] = useState({});

  useEffect(() => {
    try {
      const savedAddress = localStorage.getItem("apparel_saved_address");
      let parsed = {};
      if (savedAddress) {
        parsed = JSON.parse(savedAddress);
      }
      
      const name = parsed.name || currentUser?.user_metadata?.full_name || "";
      const phone = parsed.phone || "";
      const email = currentUser?.email || parsed.email || "";

      setShippingName((prev) => prev || name);
      setShippingPhone((prev) => prev || phone);
      setShippingEmail((prev) => prev || email);
      setShippingAddress((prev) => prev || parsed.address || "");
      setShippingCity((prev) => prev || parsed.city || "");
      setShippingZip((prev) => prev || parsed.zip || "");

      // Sync consultationData
      setConsultationData((prev) => ({
        ...prev,
        name: prev.name || name,
        phone: prev.phone || phone,
        email: prev.email || email,
      }));
    } catch (err) {
      console.warn("Failed to load prefilled address:", err);
    }
  }, [currentUser, showCheckoutModal]);

  const fetchProductsList = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, texture_url, is_template, glb_file_url, category, description, gallery_urls")
        .order("name", { ascending: true });
      if (!error && data) {
        // Filter: only customizable templates or personalizable catalog products
        const customizableOnly = data.filter((p) => {
          // Resolve stock status priority: 1) local override, 2) db status, 3) description comments
          const dbStockStatus = p.stock_status || null;
          const rawStockLocal = typeof window !== "undefined" ? localStorage.getItem(`apparel_stock_${p.id}`) : null;
          
          let persStockStatus = "in_stock";
          const desc = p.description || "";
          const stockMatch = desc.match(/<!--STOCK:STATUS=(in_stock|out_of_stock)-->/);
          if (stockMatch) {
            persStockStatus = stockMatch[1];
          }
          
          const status = rawStockLocal || dbStockStatus || persStockStatus || "in_stock";
          if (status === "out_of_stock") return false;

          if (p.is_template === true) return true;
          if (p.glb_file_url) return true;
          const cat = (p.category || "").toLowerCase().trim();
          if (cat === "custom-template" || cat === "template" || cat.startsWith("custom-")) return true;
          const name = (p.name || "").toLowerCase();
          if (name.includes("template") || name.includes("blank")) return true;

          if (desc.includes("<!--PERS:NAME=true") || desc.includes("<!--PERS:NUMBER=true")) return true;

          return false;
        });
        setProductsList(customizableOnly);
      }
    } catch (err) {
      console.warn("Failed to load products for consultation widget:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchGlobalDesignerSettings = async () => {
    try {
      const res = await fetch("/api/announcement");
      if (res.ok) {
        const data = await res.json();
        if (data.designer_fee !== undefined) setDesignerFee(Number(data.designer_fee));
        if (data.designer_enabled !== undefined) setDesignerEnabled(data.designer_enabled);
      }
    } catch (err) {
      console.warn("Failed to fetch designer settings from API:", err);
    }
  };

  // Load designer settings from localStorage, then update from API
  useEffect(() => {
    try {
      const saved = localStorage.getItem("apparel_designer_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fee !== undefined) setDesignerFee(Number(parsed.fee));
        if (parsed.enabled !== undefined) setDesignerEnabled(parsed.enabled);
      }
    } catch {
      // default fee
    }
    fetchGlobalDesignerSettings();
  }, []);

  // Re-read designer settings when chat opens (in case admin changed them)
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem("apparel_designer_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fee !== undefined) setDesignerFee(Number(parsed.fee));
          if (parsed.enabled !== undefined) setDesignerEnabled(parsed.enabled);
        }
      } catch {
        // keep defaults
      }
      fetchGlobalDesignerSettings();
    }
  }, [isOpen]);

  // Track user session for customer details/email
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
        }
      } catch (err) {
        console.warn("Failed to get auth session in ChatWidget:", err);
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, showDesignerCard]);

  // Mark as read when opening
  useEffect(() => {
    if (isOpen) setHasUnread(false);
  }, [isOpen]);

  // Listen for the custom "open-designer-chat" event to open chatbot and start consultation
  useEffect(() => {
    const handleOpenDesignerChat = () => {
      setIsOpen(true);
      // Give a tiny timeout so the chat widget can finish opening animation
      setTimeout(() => {
        handleContactDesignerClick();
      }, 150);
    };

    window.addEventListener("open-designer-chat", handleOpenDesignerChat);
    return () => {
      window.removeEventListener("open-designer-chat", handleOpenDesignerChat);
    };
  }, [currentUser]);

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const validateModalInputs = () => {
    const errors = {};
    const nameClean = shippingName.trim();
    const phoneClean = shippingPhone.trim();
    const emailClean = shippingEmail.trim();
    const addressClean = shippingAddress.trim();
    const cityClean = shippingCity.trim();
    const zipClean = shippingZip.trim();

    if (!nameClean) {
      errors.name = "Recipient name is required.";
    } else if (nameClean.length < 3) {
      errors.name = "Name must be at least 3 characters.";
    } else if (!/^[a-zA-Z\s]+$/.test(nameClean)) {
      errors.name = "Name can only contain letters.";
    }

    if (!phoneClean) {
      errors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(phoneClean.replace(/\D/g, ""))) {
      errors.phone = "Phone number must be exactly 10 digits.";
    }

    if (!emailClean) {
      errors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(emailClean)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!addressClean) {
      errors.address = "Street address is required.";
    } else if (addressClean.length < 5) {
      errors.address = "Please enter a complete address (minimum 5 characters).";
    }

    if (!cityClean) {
      errors.city = "City is required.";
    } else if (cityClean.length < 2) {
      errors.city = "City must be at least 2 characters.";
    }

    if (!zipClean) {
      errors.zip = "PIN code is required.";
    } else if (!/^\d{6}$/.test(zipClean.replace(/\D/g, ""))) {
      errors.zip = "PIN code must be exactly 6 digits.";
    }

    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDesignerPayment = async (modalShippingDetails) => {
    const zipCode = modalShippingDetails?.zip || shippingZip;
    const shippingInfo = getShippingDetails(zipCode);
    const deliveryFee = zipCode.trim().length >= 2 ? shippingInfo.fee : 0;

    const productsTotal = consultationData.configurations.reduce(
      (sum, cfg) => sum + ((consultationData.selectedProduct?.price || 0) * cfg.quantity),
      0
    );
    const totalPayable = designerFee + productsTotal + deliveryFee;

    const shippingDetails = {
      name: modalShippingDetails?.name || consultationData.name || "Customer",
      phone: modalShippingDetails?.phone || consultationData.phone || "",
      email: modalShippingDetails?.email || consultationData.email || currentUser?.email || "",
      address: modalShippingDetails?.address || `Personalized Designer Service (${consultationData.selectedProduct?.name})`,
      city: modalShippingDetails?.city || "WhatsApp / Call Contact",
      zip: modalShippingDetails?.zip || "000000",
      isDesignerConsultation: true,
    };

    if (totalPayable <= 0) {
      // Free consultation — just show success
      setDesignerPaymentSuccess(true);
      setShowCheckoutModal(false);
      const botMsg = {
        sender: "bot",
        text: `🎉 **Designer service request submitted!** Our designer will reach out to you within 2-4 hours via call or email.\n\n**Details:**\n👤 Name: ${shippingDetails.name}\n📞 Contact: ${shippingDetails.phone}\n📍 Address: ${shippingDetails.address}\n🏙️ City: ${shippingDetails.city}\n📮 ZIP: ${shippingDetails.zip}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setConsultationStep(null);
      return;
    }

    setDesignerPaymentLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        const botMsg = {
          sender: "bot",
          text: "❌ **Error**: Could not load payment gateway. Please check your internet connection.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setDesignerPaymentLoading(false);
        return;
      }

      // Prepare items for checkout
      const checkoutItems = [
        {
          id: "designer_consultation",
          name: "Personalized Designer Service",
          price: designerFee,
          quantity: 1,
          size: "N/A",
        },
        ...consultationData.configurations.map((cfg) => ({
          productId: consultationData.selectedProduct.id,
          name: consultationData.selectedProduct.name,
          price: consultationData.selectedProduct.price,
          quantity: cfg.quantity,
          size: cfg.size,
        }))
      ];

      // Create a designer consultation order
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems,
          shippingDetails: shippingDetails,
          couponCode: "",
          userId: currentUser?.id || null,
          isDesignerConsultation: true,
        }),
      });

      const orderData = await response.json();
      if (!response.ok) {
        const botMsg = {
          sender: "bot",
          text: `❌ **Error**: ${orderData.error || "Failed to initiate payment. Please try again."}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setDesignerPaymentLoading(false);
        return;
      }

      const { key_id, order_id, amount, currency, isMockMode, db_order_id } = orderData;

      // ============ MOCK MODE: Skip Razorpay, call verify directly ============
      if (isMockMode) {
        try {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isMockMode: true,
              razorpay_order_id: order_id,
              razorpay_payment_id: `mock_pay_${Date.now()}`,
              razorpay_signature: "mock_signature",
              orderDetails: {
                db_order_id: db_order_id,
                user_id: currentUser?.id || null,
                items: checkoutItems,
                total_amount: totalPayable,
                shipping_details: shippingDetails,
                isDesignerConsultation: true,
              },
            }),
          });

          if (verifyRes.ok) {
            setDesignerPaymentSuccess(true);
            setConsultationStep(null);
            setShowCheckoutModal(false);
            const botMsg = {
              sender: "bot",
              text: `🎉 **Order of ₹${totalPayable.toLocaleString("en-IN")} placed successfully! (Test Mode)**\n\nIn 30mins our designer will contact you through call or whatsapp message on **${shippingDetails.phone}**.\n\n**Shipping Details:**\n👤 Name: ${shippingDetails.name}\n📍 Address: ${shippingDetails.address}\n🏙️ City: ${shippingDetails.city}\n📮 ZIP: ${shippingDetails.zip}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, botMsg]);
          } else {
            const verifyData = await verifyRes.json();
            const botMsg = {
              sender: "bot",
              text: `❌ **Error**: ${verifyData.error || "Mock payment verification failed."}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, botMsg]);
          }
        } catch (err) {
          const botMsg = {
            sender: "bot",
            text: `❌ **Mock Verification Error**: ${err.message}`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, botMsg]);
        }
        setDesignerPaymentLoading(false);
        return;
      }

      // ============ LIVE RAZORPAY FLOW ============
      const options = {
        key: key_id,
        amount,
        currency,
        name: "Thread 3D Studio",
        description: "Personalized Designer Service Fee",
        order_id,
        handler: async function (paymentRes) {
          // Payment successful
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: paymentRes.razorpay_order_id,
                razorpay_payment_id: paymentRes.razorpay_payment_id,
                razorpay_signature: paymentRes.razorpay_signature,
                orderDetails: {
                  user_id: currentUser?.id || null,
                  items: checkoutItems,
                  total_amount: totalPayable,
                  shipping_details: shippingDetails,
                  isDesignerConsultation: true,
                },
              }),
            });

            if (verifyRes.ok) {
              setDesignerPaymentSuccess(true);
              setConsultationStep(null);
              setShowCheckoutModal(false);
              const botMsg = {
                sender: "bot",
                text: `🎉 **Payment of ₹${totalPayable.toLocaleString("en-IN")} confirmed!**\n\nIn 30mins our designer will contact you through call or whatsapp message on **${shippingDetails.phone}**.\n\n**Shipping Details:**\n👤 Name: ${shippingDetails.name}\n📍 Address: ${shippingDetails.address}\n🏙️ City: ${shippingDetails.city}\n📮 ZIP: ${shippingDetails.zip}`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              setMessages((prev) => [...prev, botMsg]);
            } else {
              const botMsg = {
                sender: "bot",
                text: "❌ **Error**: Payment verification failed. Please contact support.",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              setMessages((prev) => [...prev, botMsg]);
            }
          } catch (err) {
            const botMsg = {
              sender: "bot",
              text: `❌ **Verification Error**: ${err.message}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, botMsg]);
          }
          setDesignerPaymentLoading(false);
        },
        prefill: {
          name: shippingDetails.name,
          contact: shippingDetails.phone,
          email: shippingDetails.email,
        },
        theme: { color: "#059669" },
        modal: {
          ondismiss: function () {
            setDesignerPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const botMsg = {
        sender: "bot",
        text: `❌ **Payment Error**: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setDesignerPaymentLoading(false);
    }
  };

  const triggerBotResponse = (userQueryText) => {
    setIsTyping(true);

    setTimeout(() => {
      const query = userQueryText.toLowerCase();
      let replyText =
        "Our design operators are reviewing your query. Custom apparel production and tailoring takes 5-7 business days. You can reach out to us anytime!";
      let additionalMsg = null;

      // Order / Shipping
      if (query.includes("ship") || query.includes("track") || query.includes("order") || query.includes("delivery")) {
        try {
          const stored = localStorage.getItem("apparel_past_orders");
          const pastOrders = stored ? JSON.parse(stored) : [];
          if (pastOrders.length > 0) {
            const latest = pastOrders[0];
            const ordId = latest.id?.substring(0, 8).toUpperCase() || "N/A";
            const status = latest.status || "processing";
            const total = latest.total_amount || 3999;
            const tracking = latest.tracking_number
              ? ` Tracking: ${latest.tracking_number} via ${latest.carrier || "Courier"}.`
              : "";
            replyText = `Your latest order #${ordId} — Total: ₹${total.toLocaleString("en-IN")}. Status: ${status.toUpperCase()}.${tracking} Visit the Dashboard → Tracking tab for full details.`;
          } else {
            replyText =
              "I couldn't find any orders under your account yet. Once you complete checkout, your orders will appear in the Dashboard → Tracking tab.";
          }
        } catch {
          replyText = "Visit the Dashboard → Tracking tab to view all your orders and live shipment status.";
        }
      }
      // Returns / Refunds
      else if (query.includes("return") || query.includes("refund") || query.includes("exchange") || query.includes("cancel")) {
        replyText =
          "Standard catalog products are eligible for return or exchange within 14 days of delivery (unused, tags attached). Custom 3D-designed garments from the Studio are made-to-order and are Final Sale (non-returnable).";
      }
      // Pricing / Discounts
      else if (query.includes("price") || query.includes("discount") || query.includes("promo") || query.includes("coupon") || query.includes("offer")) {
        replyText =
          "Use promo code **THREAD3D** for 20% off! Apply it in the cart drawer at checkout. Check the homepage for any active flash sale offers too!";
      }
      // Sizing
      else if (query.includes("size") || query.includes("fit") || query.includes("sizing") || query.includes("measurement")) {
        replyText =
          "Our garments fit true-to-size. Here's a quick reference:\n• **S**: Chest 36″, Length 26″\n• **M**: Chest 38″, Length 27″\n• **L**: Chest 40″, Length 28″\n• **XL**: Chest 42″, Length 29″\nVisit any product page for the full size chart.";
      }
      // Designer
      else if (query.includes("designer") || query.includes("consult") || query.includes("contact designer")) {
        if (designerEnabled) {
          setConsultationStep("ask_product");
          setConsultationData({
            name: "",
            phone: "",
            email: currentUser?.email || "",
            selectedProduct: null,
            configurations: [],
          });
          fetchProductsList();
          replyText = "Awesome! 🎨 Let's find the product you want to work on with a designer. Please search and select from the catalog below:";
          additionalMsg = {
            sender: "bot",
            type: "product_picker",
            text: "Search and select product",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        } else {
          replyText = "Personalized designer services are currently unavailable. Please check back later or email us at help@thread3d.com.";
        }
      }
      // 3D / Custom Design
      else if (query.includes("3d") || query.includes("decal") || query.includes("custom") || query.includes("design") || query.includes("studio") || query.includes("how to")) {
        replyText =
          "To create a custom design: go to the 3D Studio → select a blank template → choose your base color, fabric material → add decals, player name & number → preview in real-time 3D → add to cart and checkout!";
      }
      // Greeting
      else if (query.includes("hi") || query.includes("hello") || query.includes("hey") || query.includes("help")) {
        replyText =
          "Hello! 👋 I'm your Thread 3D assistant. I can help with:\n• 🚚 Order tracking\n• 📏 Size guidance\n• 🎨 Custom design tips\n• 🎫 Promo codes & offers\n• ↩️ Return/exchange policy\n• 🎨 Personalized designer service\n\nJust type your question!";
      }
      // Products / Stock
      else if (query.includes("product") || query.includes("stock") || query.includes("buy") || query.includes("shop") || query.includes("catalog")) {
        replyText =
          "Browse our full catalog on the Shop page! We have T-Shirts, Hoodies, Jackets, Jerseys, and Activewear. Each can be customized in our 3D Studio with your own designs.";
      }
      // Payment
      else if (query.includes("pay") || query.includes("razorpay") || query.includes("upi") || query.includes("card")) {
        replyText =
          "We accept all major payment methods via Razorpay — UPI, Credit/Debit Cards, Net Banking, and popular wallets. All transactions are SSL-encrypted and secure.";
      }
      // Contact
      else if (query.includes("contact") || query.includes("email") || query.includes("phone") || query.includes("support")) {
        replyText =
          "You can reach our support team at **help@thread3d.com** or call **+91 44 2390 1234** (Mon-Sat, 10AM-7PM IST). We typically respond within 2-4 hours!";
      }

      const botMsg = {
        sender: "bot",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => {
        const next = [...prev, botMsg];
        if (additionalMsg) next.push(additionalMsg);
        return next;
      });
      setIsTyping(false);

      if (!isOpen) setHasUnread(true);
    }, 800 + Math.random() * 600);
  };

  const handleConsultationStepInput = (text) => {
    setIsTyping(true);
    setTimeout(() => {
      let botMsgText = "Please use the selection options above to proceed.";
      if (consultationStep === "ask_product") {
        botMsgText = "Please search and select a template or catalog item from the list above.";
      } else if (consultationStep === "ask_size_qty") {
        botMsgText = "Please select size and quantities from the picker above and confirm.";
      } else if (consultationStep === "review_payment") {
        botMsgText = "Please proceed to shipping checkout using the payment card above.";
      }
      const botMsg = {
        sender: "bot",
        text: botMsgText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleProductSelect = (product) => {
    setConsultationData((prev) => ({ ...prev, selectedProduct: product }));
    
    const userMsg = {
      sender: "user",
      text: `I selected: ${product.name}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    setConsultationStep("ask_size_qty");
    setIsTyping(true);
    setTimeout(() => {
      const botMsg = {
        sender: "bot",
        text: `Great choice! 🎨 The price for **${product.name}** is **₹${product.price.toLocaleString("en-IN")}**.\n\nNow, specify the **sizes** and **quantities** you need help with. You can add multiple size variations of this product if needed.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const sizeQtyMsg = {
        sender: "bot",
        type: "size_qty_picker",
        text: "Select sizes and quantities",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg, sizeQtyMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleSizeQtyConfirm = (configs) => {
    setConsultationData((prev) => ({ ...prev, configurations: configs }));
    
    const configsText = configs.map(c => `Size ${c.size} × ${c.quantity}`).join(", ");
    const userMsg = {
      sender: "user",
      text: `My items: ${configsText}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    setConsultationStep("review_payment");
    setIsTyping(true);
    setTimeout(() => {
      const botMsg = {
        sender: "bot",
        text: `Perfect! Here is your personalized design service order review. Use the card below to pay the designer fee (₹${designerFee}) plus the products total.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const summaryMsg = {
        sender: "bot",
        type: "payment_summary",
        text: "Payment summary",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg, summaryMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    const userMsg = {
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    
    if (consultationStep) {
      handleConsultationStepInput(userText);
    } else {
      triggerBotResponse(userText);
    }
  };

  const handleQuickAction = (promptText) => {
    const userMsg = {
      sender: "user",
      text: promptText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (consultationStep) {
      handleConsultationStepInput(promptText);
    } else {
      triggerBotResponse(promptText);
    }
  };

  const handleContactDesignerClick = () => {
    setConsultationStep("ask_product");
    setConsultationData({
      name: "",
      phone: "",
      email: currentUser?.email || "",
      selectedProduct: null,
      configurations: [],
    });
    fetchProductsList();

    const userMsg = {
      sender: "user",
      text: "I'd like to contact a designer",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);
    setTimeout(() => {
      const botMsg = {
        sender: "bot",
        text: "Awesome! 🎨 Let's find the product you want to work on with a designer. Please search and select from the catalog below:",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const pickerMsg = {
        sender: "bot",
        type: "product_picker",
        text: "Search and select product",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg, pickerMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" id="global-chat-widget">
      {/* Collapsed: FAB Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 border border-indigo-400/20 active:scale-95 transition-all cursor-pointer relative"
          title="Chat with Thread 3D Assistant"
          id="chat-widget-toggle"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />

          {/* Unread indicator */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            </span>
          )}

          {/* Subtle pulse ring */}
          <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping pointer-events-none" style={{ animationDuration: "3s" }} />
        </button>
      ) : (
        /* Expanded: Chat Panel */
        <div
          className="w-[340px] h-[520px] bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          style={{ animation: "chatSlideUp 0.25s ease-out" }}
          id="chat-widget-panel"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white leading-none">Thread 3D Help</h4>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online now
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              id="chat-widget-close"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm scrollbar-thin">
            {messages.map((m, idx) => {
              const isLastPicker = (type) => {
                const lastIndex = messages.map(msg => msg.type).lastIndexOf(type);
                return lastIndex === idx;
              };

              return (
                <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"} w-full`}>
                  {m.type === "product_picker" ? (
                    <ProductPickerMessage
                      isLocked={!isLastPicker("product_picker") || consultationStep !== "ask_product"}
                      onSelect={handleProductSelect}
                      productsList={productsList}
                      loadingProducts={loadingProducts}
                      searchQuery={productSearchQuery}
                      setSearchQuery={setProductSearchQuery}
                    />
                  ) : m.type === "size_qty_picker" ? (
                    <SizeQtyPickerMessage
                      isLocked={!isLastPicker("size_qty_picker") || consultationStep !== "ask_size_qty"}
                      onConfirm={handleSizeQtyConfirm}
                      selectedProduct={consultationData.selectedProduct}
                    />
                  ) : m.type === "payment_summary" ? (
                    <PaymentSummaryMessage
                      isLocked={!isLastPicker("payment_summary") || consultationStep !== "review_payment" || designerPaymentSuccess}
                      consultationData={consultationData}
                      designerFee={designerFee}
                      designerPaymentLoading={designerPaymentLoading}
                      handlePayment={() => setShowCheckoutModal(true)}
                    />
                  ) : (
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line ${
                        m.sender === "user"
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-tl-sm"
                      }`}
                    >
                      {m.text?.split("**").map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-extrabold text-white">
                            {part}
                          </strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  )}
                  <span className="text-[8px] text-zinc-600 mt-1 select-none font-mono px-1">{m.time}</span>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick action pills */}
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-zinc-950/80 border-t border-zinc-900/50 scrollbar-none select-none shrink-0">
            {designerEnabled && !designerPaymentSuccess && (
              <button
                type="button"
                onClick={handleContactDesignerClick}
                className="shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                🎨 Contact Designer
              </button>
            )}
            {[
              { emoji: "🚚", label: "Track Orders", prompt: "Track my orders" },
              { emoji: "🎫", label: "Promo Code", prompt: "Get promo code" },
              { emoji: "📏", label: "Sizing", prompt: "Size guide advice" },
              { emoji: "🎨", label: "Design Tips", prompt: "Custom design tips" },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleQuickAction(action.prompt)}
                className="shrink-0 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                {action.emoji} {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="px-3 py-2.5 border-t border-zinc-800 bg-zinc-950/60 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 flex-1 placeholder:text-zinc-600 font-medium"
              id="chat-widget-input"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
              id="chat-widget-send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[10005] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 flex flex-col space-y-4 shadow-2xl relative" style={{ animation: "chatSlideUp 0.2s ease-out" }}>
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-extrabold text-white">Consultation Delivery Details</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Please provide shipping information for custom delivery</p>
              </div>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setModalErrors({});
                }}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form fields */}
            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold block">Recipient Name</label>
                <input
                  type="text"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={`w-full bg-zinc-950 border ${modalErrors.name ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650`}
                />
                {modalErrors.name && <p className="text-[9px] text-rose-500 font-semibold">{modalErrors.name}</p>}
              </div>

              {/* Email & Phone grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold block">Email Address</label>
                  <input
                    type="email"
                    value={shippingEmail}
                    onChange={(e) => setShippingEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className={`w-full bg-zinc-950 border ${modalErrors.email ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650`}
                  />
                  {modalErrors.email && <p className="text-[9px] text-rose-500 font-semibold">{modalErrors.email}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold block">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    placeholder="10-digit number"
                    className={`w-full bg-zinc-950 border ${modalErrors.phone ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650`}
                  />
                  {modalErrors.phone && <p className="text-[9px] text-rose-500 font-semibold">{modalErrors.phone}</p>}
                </div>
              </div>

              {/* Street Address */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold block">Street Address</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="e.g. Flat/House No, Building, Street Name"
                  className={`w-full bg-zinc-950 border ${modalErrors.address ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650`}
                />
                {modalErrors.address && <p className="text-[9px] text-rose-500 font-semibold">{modalErrors.address}</p>}
              </div>

              {/* City & Zip Code grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold block">City</label>
                  <input
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className={`w-full bg-zinc-950 border ${modalErrors.city ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650`}
                  />
                  {modalErrors.city && <p className="text-[9px] text-rose-500 font-semibold">{modalErrors.city}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold block">Postal / ZIP Code</label>
                  <input
                    type="text"
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    placeholder="6-digit ZIP"
                    className={`w-full bg-zinc-950 border ${modalErrors.zip ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650`}
                  />
                  {modalErrors.zip && <p className="text-[9px] text-rose-500 font-semibold">{modalErrors.zip}</p>}
                </div>
              </div>

              {/* Save Address Checkbox */}
              <div className="flex items-center gap-2 pt-1 select-none">
                <input
                  type="checkbox"
                  id="save-shipping-address"
                  checked={saveShippingAddress}
                  onChange={(e) => setSaveShippingAddress(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-zinc-950 border border-zinc-800 accent-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="save-shipping-address" className="text-[10px] text-zinc-400 font-semibold cursor-pointer">
                  Save address for future purchases
                </label>
              </div>

              {/* Delivery Fee & Summary Details */}
              {(() => {
                const zipClean = (shippingZip || "").trim().replace(/\D/g, "");
                const shippingInfo = getShippingDetails(zipClean);
                const fee = zipClean.length >= 2 ? shippingInfo.fee : 0;
                const productsTotal = consultationData.configurations?.reduce(
                  (sum, cfg) => sum + ((consultationData.selectedProduct?.price || 0) * cfg.quantity),
                  0
                ) || 0;
                const totalPayable = designerFee + productsTotal + fee;

                return (
                  <div className="space-y-2 pt-1 border-t border-zinc-800/50">
                    {zipClean.length >= 2 && (
                      <div className="bg-zinc-950/50 border border-zinc-850 rounded-xl p-3.5 space-y-1.5 text-[10px] text-zinc-400">
                        <div className="flex justify-between">
                          <span>Shipping Tier:</span>
                          <span className="text-zinc-200 font-bold">{shippingInfo.mode}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-900 pt-1.5">
                          <span>Delivery Charge:</span>
                          <span className="text-indigo-400 font-extrabold">₹{shippingInfo.fee}</span>
                        </div>
                      </div>
                    )}

                    <div className="bg-zinc-950/20 border border-zinc-850 rounded-xl p-3.5 space-y-2 text-[10px] text-zinc-450">
                      <div className="flex justify-between">
                        <span>Designer Service Fee:</span>
                        <span className="font-mono text-zinc-350">₹{designerFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Product Subtotal:</span>
                        <span className="font-mono text-zinc-350">₹{productsTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span className="font-mono text-zinc-350">
                          {zipClean.length >= 2 ? `₹${fee}` : "Calculated at checkout"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-805 pt-2 text-xs font-bold text-white">
                        <span>Total Due:</span>
                        <span className="font-mono text-emerald-400 text-xs font-extrabold">₹{totalPayable.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t border-zinc-800/80 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setModalErrors({});
                }}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={designerPaymentLoading}
                onClick={async () => {
                  if (validateModalInputs()) {
                    const addressObj = {
                      name: shippingName.trim(),
                      phone: shippingPhone.trim(),
                      email: shippingEmail.trim(),
                      address: shippingAddress.trim(),
                      city: shippingCity.trim(),
                      zip: shippingZip.trim()
                    };
                    if (saveShippingAddress) {
                      localStorage.setItem("apparel_saved_address", JSON.stringify(addressObj));
                    } else {
                      localStorage.removeItem("apparel_saved_address");
                    }
                    
                    await handleDesignerPayment(addressObj);
                  }
                }}
                className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white font-extrabold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {designerPaymentLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay & Book Consultation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline animation keyframes */}
      <style jsx global>{`
        @keyframes chatSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
