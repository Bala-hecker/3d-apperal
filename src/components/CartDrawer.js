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
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Address State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  // Simulated Checkout Payment Details
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");

  // Promo Code State
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponSuccess, setCouponSuccess] = useState(null);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    loadCart();
    const handleCartUpdate = () => loadCart();
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

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

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (code === "THREAD3D" || code === "SAAS20") {
      setAppliedDiscount(20);
      setCouponSuccess("20% Discount applied successfully!");
    } else {
      setCouponError("Invalid or expired promotional code.");
      setAppliedDiscount(0);
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setShowStripeCheckout(true);
  };

  const executeOrderPlacement = async (gatewayType) => {
    setIsSubmittingOrder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const orderPayload = {
        user_id: userId || null,
        items: cart,
        total_amount: finalTotalAmount,
        status: "processing",
        shipping_details: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          city: customerCity,
          zip: customerZip
        },
        payment_gateway: gatewayType
      };

      const { error } = await supabase.from("orders").insert([orderPayload]);
      if (error) throw error;

      setCheckoutSuccess(true);
      setShowStripeCheckout(false);
      clearCart();
      setTimeout(() => {
        setCheckoutSuccess(false);
        setIsCheckingOut(false);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setCustomerCity("");
        setCustomerZip("");
        setAppliedDiscount(0);
        setCouponCode("");
        onClose();
      }, 5000);
    } catch (err) {
      alert("Failed to place order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
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

  if (!isOpen && !showStripeCheckout && !checkoutSuccess) return null;

  return (
    <>
      {/* Modern Slide-out Shopping Cart Drawer */}
      {isOpen && !showStripeCheckout && !checkoutSuccess && (
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
                      <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Contact Phone</label>
                      <input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Street Address</label>
                      <input type="text" required value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">City / Region</label>
                        <input type="text" required value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Postal / ZIP</label>
                        <input type="text" required value={customerZip} onChange={(e) => setCustomerZip(e.target.value)} className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
                      </div>
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

      {/* Premium Full-Screen Stripe Payment Gateway Overlay */}
      {showStripeCheckout && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col md:flex-row overflow-y-auto">
          <button onClick={() => setShowStripeCheckout(false)} className="absolute top-6 left-6 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs font-semibold z-20">
            <X className="w-4 h-4" /><span>Cancel payment & Return</span>
          </button>
          <div className="w-full md:w-1/2 bg-zinc-900/40 border-r border-zinc-900 p-8 md:p-16 flex flex-col justify-between min-h-[300px] md:min-h-screen">
            <div className="space-y-8 mt-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Thread 3D Store</h2>
                <div className="text-4xl font-black text-indigo-400 font-mono">₹{finalTotalAmount.toLocaleString('en-IN')}</div>
              </div>
              <div className="space-y-4 pt-4 border-t border-zinc-900/60 max-h-60 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/60">
                    <img src={item.thumbnailUrl || item.customDesignUrl} alt={item.name} className="w-12 h-12 rounded-lg border border-zinc-800 object-cover bg-zinc-900" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs text-white truncate">{item.name}</h4>
                      <p className="text-sm text-zinc-500 mt-0.5">Size: <span className="text-zinc-300 font-bold">{item.size}</span> • Qty: <span className="text-zinc-300 font-bold">{item.quantity}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 mt-8 pt-6 border-t border-zinc-900/60">
              <div className="flex items-center gap-3 text-zinc-500"><ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" /><span className="text-sm leading-relaxed">Guaranteed safe and secure checkouts.</span></div>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-zinc-950 relative min-h-[450px]">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div className="flex bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-900">
                <button type="button" onClick={() => setPaymentMethod("card")} className={`flex-1 py-2 text-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${paymentMethod === "card" ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-400 hover:text-white"}`}>Credit Card</button>
                <button type="button" onClick={() => setPaymentMethod("upi")} className={`flex-1 py-2 text-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${paymentMethod === "upi" ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-400 hover:text-white"}`}>UPI / Netbanking</button>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4 font-sans text-left">
                {paymentMethod === "card" ? (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">Card Information</span>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">Cardholder Name</label>
                      <input 
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-sans"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">Card Number</label>
                      <input 
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").substring(0, 16);
                          const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ");
                          setCardNumber(formatted);
                        }}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">Expiration Date</label>
                        <input 
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").substring(0, 4);
                            if (val.length >= 2) {
                              setCardExpiry(`${val.substring(0, 2)}/${val.substring(2, 4)}`);
                            } else {
                              setCardExpiry(val);
                            }
                          }}
                          placeholder="MM/YY"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">CVC / CVV</label>
                        <input 
                          type="password"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").substring(0, 3))}
                          placeholder="•••"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block select-none">UPI Payment Details</span>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 select-none">Virtual Payment Address (VPA)</label>
                      <input 
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. john@okaxis"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                      <p className="text-[10px] text-zinc-600 mt-2.5 leading-normal">Submit your UPI ID to trigger a simulated checkout notification request on your banking app device.</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      if (paymentMethod === "card" && (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim())) {
                        alert("Please fill in all credit card payment details.");
                        return;
                      }
                      if (paymentMethod === "upi" && !upiId.trim()) {
                        alert("Please provide your VPA / UPI ID.");
                        return;
                      }
                      executeOrderPlacement(paymentMethod);
                    }} 
                    disabled={isSubmittingOrder} 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Pay ₹{finalTotalAmount.toLocaleString('en-IN')} securely</span>}
                  </button>
                </div>
              </div>
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
