"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ShoppingBag as CartIcon, 
  X, 
  Minus, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle,
  Loader2
} from "lucide-react";

export default function CartDrawer({ isOpen, onClose }) {
  const [cart, setCart] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Address State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);

  // Promo Code State
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponSuccess, setCouponSuccess] = useState(null);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    loadCart();
    const handleCartUpdate = () => loadCart();
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, []);

  // Load saved address from localStorage when checkout/drawer opens
  useEffect(() => {
    if (isOpen) {
      try {
        const savedAddress = localStorage.getItem("apparel_saved_address");
        if (savedAddress) {
          const parsed = JSON.parse(savedAddress);
          setCustomerName(parsed.name || "");
          setCustomerPhone(parsed.phone || "");
          setCustomerAddress(parsed.address || "");
          setCustomerCity(parsed.city || "");
          setCustomerZip(parsed.zip || "");
        }
      } catch (err) {
        console.warn("Failed to load saved address:", err);
      }
    }
  }, [isOpen]);

  const loadCart = () => {
    try {
      const stored = localStorage.getItem("apparel_cart");
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (err) {}
  };

  const saveCartState = (newCart) => {
    setCart(newCart);
    localStorage.setItem("apparel_cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart-updated"));
  };

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

  const updateSize = (itemId, size) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, size };
      }
      return item;
    });
    saveCartState(updated);
  };

  const removeCartItem = (itemId) => {
    const filtered = cart.filter(item => item.id !== itemId);
    saveCartState(filtered);
  };

  const clearCart = () => {
    saveCartState([]);
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const email = session?.user?.email || null;

      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, userId, email })
      });

      const resData = await response.json();
      if (!response.ok) {
        setCouponError(resData.error || "Invalid coupon code.");
        setAppliedDiscount(0);
      } else if (resData.success && resData.coupon) {
        const disc = resData.coupon.discount_percent;
        setAppliedDiscount(disc);
        setCouponSuccess(`${disc}% discount applied successfully!`);
      }
    } catch (err) {
      setCouponError("Failed to validate coupon code.");
      setAppliedDiscount(0);
    }
  };

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

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Form Validation Checks
    const errors = {};
    const nameClean = customerName.trim();
    const phoneClean = customerPhone.trim();
    const addressClean = customerAddress.trim();
    const cityClean = customerCity.trim();
    const zipClean = customerZip.trim();

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
      errors.zip = "Postal/ZIP code is required.";
    } else if (!/^\d{6}$/.test(zipClean.replace(/\D/g, ""))) {
      errors.zip = "PIN code must be exactly 6 digits.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    // Save session details to localStorage
    const checkoutSession = {
      cart,
      shippingDetails: {
        name: nameClean,
        phone: phoneClean,
        address: addressClean,
        city: cityClean,
        zip: zipClean
      },
      couponCode,
      subtotal,
      discountAmount,
      deliveryFee,
      finalTotalAmount
    };

    try {
      localStorage.setItem("apparel_checkout_session", JSON.stringify(checkoutSession));
      
      // Save address for next time reuse if requested
      if (saveAddressForFuture) {
        const savedAddress = {
          name: nameClean,
          phone: phoneClean,
          address: addressClean,
          city: cityClean,
          zip: zipClean
        };
        localStorage.setItem("apparel_saved_address", JSON.stringify(savedAddress));
      } else {
        localStorage.removeItem("apparel_saved_address");
      }
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }

    onClose();
    window.location.href = "/checkout/payment";
  };


  const getShippingDetails = (zip) => {
    const cleanZip = (zip || "").trim().replace(/\D/g, "");
    
    // Default values if inputs are empty
    if (!cleanZip) {
      return { distance: 0, fee: 0, mode: "Enter Postal Code" };
    }
    
    let distance = 950;
    let fee = 199;
    let mode = "National Air Express";

    // PIN code based estimation (extremely precise for India logistics)
    if (cleanZip.length >= 2) {
      const prefix = cleanZip.substring(0, 2);
      const prefixNum = parseInt(prefix, 10);
      
      if (prefixNum >= 60 && prefixNum <= 64) {
        // Tamil Nadu (Local / Regional Zone from Chennai HQ)
        if (prefixNum === 60) {
          // Chennai & Immediate surroundings (Chengalpattu, Tiruvallur, Kanchipuram)
          distance = 45;
          fee = 49;
          mode = "Local Courier Service";
        } else {
          // Rest of Tamil Nadu (Coimbatore, Madurai, Trichy, etc.)
          distance = 250;
          fee = 99;
          mode = "Intra-State Express";
        }
      } else if (prefixNum >= 56 && prefixNum <= 59) {
        // Karnataka (Bangalore, Mysore, etc.)
        distance = 350;
        fee = 99;
        mode = "Regional Fast Courier";
      } else if (prefixNum >= 50 && prefixNum <= 53) {
        // Andhra Pradesh & Telangana (Hyderabad, etc.)
        distance = 630;
        fee = 149;
        mode = "National Surface Line";
      } else if (prefixNum >= 67 && prefixNum <= 69) {
        // Kerala (Cochin, Trivandrum, etc.)
        distance = 680;
        fee = 149;
        mode = "National Surface Line";
      } else if (prefixNum >= 40 && prefixNum <= 44) {
        // Maharashtra (Mumbai, Pune, etc.)
        distance = 1180;
        fee = 249;
        mode = "Premium Zone Delivery";
      } else if (prefixNum >= 70 && prefixNum <= 74) {
        // West Bengal (Kolkata, etc.)
        distance = 1660;
        fee = 299;
        mode = "Premium Zone Delivery";
      } else if ((prefixNum >= 11 && prefixNum <= 28) || prefixNum === 30 || prefixNum === 31 || prefixNum === 32 || prefixNum === 33 || prefixNum === 34) {
        // North India & Rajasthan (Delhi, Jaipur, etc.)
        distance = 2200;
        fee = 299;
        mode = "Premium Zone Delivery";
      } else {
        // Fallback for other PIN prefixes (e.g. Northeast, Bihar, etc.)
        distance = 950;
        fee = 199;
        mode = "National Air Express";
      }
    }

    return { distance, fee, mode };
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = cart.reduce((acc, curr) => acc + ((curr.price || 3999) * curr.quantity), 0);
  const discountAmount = appliedDiscount > 0 ? (subtotal * (appliedDiscount / 100)) : 0;
  
  const shippingInfo = getShippingDetails(customerZip);
  const deliveryFee = isCheckingOut ? shippingInfo.fee : 0;
  const finalTotalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);

  if (!isOpen && !checkoutSuccess) return null;

  return (
    <>
      {/* Modern Slide-out Shopping Cart Drawer */}
      {isOpen && !checkoutSuccess && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
          <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
            <div className="w-full bg-zinc-950 border-l border-zinc-900 flex flex-col justify-between shadow-2xl relative">
              
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <CartIcon className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-extrabold text-base">
                    {isCheckingOut ? "Secure Checkout" : "Custom Shopping Cart"}
                  </h2>
                  <span className="text-sm bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">
                    {totalItems} items
                  </span>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-12">
                    <CartIcon className="w-12 h-12 text-zinc-800 mb-3" />
                    <p className="text-sm font-semibold text-zinc-400">Your shopping cart is empty.</p>
                    <p className="text-xs text-zinc-600 mt-1 max-w-[200px] mx-auto">
                      Go to the catalog or studio to add customized garments!
                    </p>
                  </div>
                ) : isCheckingOut ? (
                  <form onSubmit={handlePlaceOrder} className="space-y-4">
                    <div className="border-b border-zinc-900 pb-3 mb-4">
                      <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Shipping Details</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Recipient Name</label>
                      <input 
                        type="text" 
                        required 
                        value={customerName} 
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (formErrors.name) setFormErrors(prev => ({ ...prev, name: null }));
                        }} 
                        className={`w-full bg-zinc-900/60 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none ${formErrors.name ? "border-red-500/80 focus:border-red-500" : "border-zinc-850 focus:border-indigo-500"}`} 
                      />
                      {formErrors.name && (
                        <p className="text-[10px] text-red-400 mt-1 font-medium select-none">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Contact Phone</label>
                      <input 
                        type="tel" 
                        required 
                        value={customerPhone} 
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: null }));
                        }} 
                        className={`w-full bg-zinc-900/60 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none ${formErrors.phone ? "border-red-500/80 focus:border-red-500" : "border-zinc-850 focus:border-indigo-500"}`} 
                      />
                      {formErrors.phone && (
                        <p className="text-[10px] text-red-400 mt-1 font-medium select-none">{formErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Street Address</label>
                      <input 
                        type="text" 
                        required 
                        value={customerAddress} 
                        onChange={(e) => {
                          setCustomerAddress(e.target.value);
                          if (formErrors.address) setFormErrors(prev => ({ ...prev, address: null }));
                        }} 
                        className={`w-full bg-zinc-900/60 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none ${formErrors.address ? "border-red-500/80 focus:border-red-500" : "border-zinc-850 focus:border-indigo-500"}`} 
                      />
                      {formErrors.address && (
                        <p className="text-[10px] text-red-400 mt-1 font-medium select-none">{formErrors.address}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">City / Region</label>
                        <input 
                          type="text" 
                          required 
                          value={customerCity} 
                          onChange={(e) => {
                            setCustomerCity(e.target.value);
                            if (formErrors.city) setFormErrors(prev => ({ ...prev, city: null }));
                          }} 
                          className={`w-full bg-zinc-900/60 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none ${formErrors.city ? "border-red-500/80 focus:border-red-500" : "border-zinc-850 focus:border-indigo-500"}`} 
                        />
                        {formErrors.city && (
                          <p className="text-[10px] text-red-400 mt-1 font-medium select-none">{formErrors.city}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Postal / ZIP</label>
                        <input 
                          type="text" 
                          required 
                          value={customerZip} 
                          onChange={(e) => {
                            setCustomerZip(e.target.value);
                            if (formErrors.zip) setFormErrors(prev => ({ ...prev, zip: null }));
                          }} 
                          className={`w-full bg-zinc-900/60 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none ${formErrors.zip ? "border-red-500/80 focus:border-red-500" : "border-zinc-850 focus:border-indigo-500"}`} 
                        />
                        {formErrors.zip && (
                          <p className="text-[10px] text-red-400 mt-1 font-medium select-none">{formErrors.zip}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 select-none">
                      <input 
                        type="checkbox" 
                        id="saveAddressCheckbox"
                        checked={saveAddressForFuture} 
                        onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="saveAddressCheckbox" className="text-xs font-semibold text-zinc-400 cursor-pointer">
                        Save address for future checkouts
                      </label>
                    </div>
                    {customerZip.trim().length >= 2 && (
                      <div className="bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-3.5 space-y-1.5 text-[10px]">
                        <div className="flex justify-between text-zinc-500 font-semibold uppercase tracking-wider">
                          <span>Shipping Tier:</span>
                          <span className="text-zinc-300 font-bold">{shippingInfo.mode}</span>
                        </div>
                        <div className="flex justify-between text-zinc-500 font-semibold uppercase tracking-wider pt-1.5 border-t border-zinc-900">
                          <span>Delivery Charge:</span>
                          <span className="text-indigo-400 font-extrabold">₹{shippingInfo.fee}</span>
                        </div>
                      </div>
                    )}

                    <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-3.5 space-y-2 text-[10px] text-zinc-400">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="font-mono text-zinc-200">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      {appliedDiscount > 0 && (
                        <div className="flex justify-between text-emerald-400/90 font-medium">
                          <span>Coupon Discount ({appliedDiscount}%):</span>
                          <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span className="font-mono text-zinc-200">
                          {customerZip.trim().length >= 2 ? `₹${deliveryFee}` : "Enter Postal Code"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-900 pt-2 text-xs font-extrabold text-white">
                        <span>Total Due:</span>
                        <span className="font-mono text-indigo-400 text-sm">₹{finalTotalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button type="submit" disabled={isSubmittingOrder} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                        {isSubmittingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Confirm Order & Pay (₹{finalTotalAmount.toLocaleString('en-IN')})</span>}
                      </button>
                      <button type="button" onClick={() => setIsCheckingOut(false)} className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer">
                        Back to Shopping Cart
                      </button>
                    </div>
                  </form>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="bg-zinc-900/40 border border-zinc-900/80 rounded-xl p-4 flex gap-4 items-start relative group">
                      <div className="w-20 h-20 bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative">
                        <img src={item.thumbnailUrl || item.customDesignUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-zinc-200 truncate pr-6">{item.name}</h4>
                        {item.customName && (
                          <div className="mt-1 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg w-max select-none">
                            <span className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest">👕 Jersey: {item.customName} ({item.customNumber || "00"})</span>
                          </div>
                        )}
                        {/* Return eligibility status badge */}
                        <div className="mt-1.5 select-none">
                          {(() => {
                            const isCustom = !!(item.customDesignUrl || item.designCacheKey || (item.name && item.name.toLowerCase().includes("custom")) || item.customName || item.customNumber);
                            return isCustom ? (
                              <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-rose-950/20 border border-rose-900/30 text-rose-400">
                                🔒 Final Sale
                              </span>
                            ) : (
                              <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-950/20 border border-emerald-900/30 text-emerald-450">
                                🔄 14-Day Return
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-zinc-500 font-semibold uppercase">Size:</span>
                            <div className="flex gap-1">
                              {["S", "M", "L", "XL"].map((s) => (
                                <button key={s} onClick={() => updateSize(item.id, s)} className={`text-xs font-bold w-5 h-5 border rounded flex items-center justify-center transition-all cursor-pointer ${item.size === s ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-white"}`}>{s}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3.5 border-t border-zinc-900/50 pt-2.5">
                          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-lg">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-0.5 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"><Minus className="w-3 h-3" /></button>
                            <span className="text-xs font-mono font-bold text-zinc-300 w-4 text-center select-none">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-0.5 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="text-xs font-extrabold text-indigo-400 font-mono">₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <button onClick={() => removeCartItem(item.id)} className="absolute top-3 right-3 p-1 bg-zinc-950/80 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 text-zinc-600 hover:text-red-400 rounded-md transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && !isCheckingOut && (
                <div className="p-5 border-t border-zinc-900 bg-zinc-950/30 backdrop-blur-md space-y-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2">
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input type="text" placeholder="e.g. THREAD3D" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-zinc-200 focus:outline-none flex-1 uppercase" />
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer">Apply</button>
                    </form>
                    {couponError && <p className="text-sm font-bold text-rose-400 mt-1 select-none">⚠️ {couponError}</p>}
                    {couponSuccess && <p className="text-sm font-bold text-emerald-400 mt-1 select-none">✓ {couponSuccess}</p>}
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-400">
                    <div className="flex justify-between"><span>Subtotal</span><span className="font-mono text-zinc-200">₹{subtotal.toLocaleString('en-IN')}</span></div>
                    {appliedDiscount > 0 && <div className="flex justify-between text-emerald-400/90 font-medium"><span>Discount ({appliedDiscount}%)</span><span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span></div>}
                    <div className="flex justify-between text-zinc-500"><span>Delivery Fee</span><span className="font-sans text-zinc-400 italic">Calculated at checkout</span></div>
                    <div className="flex justify-between border-t border-zinc-900 pt-3 text-sm font-extrabold text-white"><span>Total Value</span><span className="font-mono text-indigo-400">₹{finalTotalAmount.toLocaleString('en-IN')}</span></div>
                  </div>
                  <button onClick={() => setIsCheckingOut(true)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>Proceed to Address details</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {checkoutSuccess && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white">Order Placed Successfully!</h3>
          <p className="text-xs text-zinc-400 mt-2 max-w-xs leading-relaxed">Thank you! Your high-fidelity customized design has been sent to our manufacturing print facility. We'll update you as soon as it ships!</p>
        </div>
      )}
    </>
  );
}
