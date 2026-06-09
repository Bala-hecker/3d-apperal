"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Lock, 
  ShieldCheck, 
  CreditCard, 
  Truck, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  ShoppingBag
} from "lucide-react";
import Link from "next/link";

export default function CheckoutPaymentPage() {
  const [sessionData, setSessionData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [userId, setUserId] = useState(null);

  // 1. Retrieve checkout details from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("apparel_checkout_session");
      if (saved) {
        setSessionData(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading checkout session:", e);
    }

    // Retrieve user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
    });
  }, []);

  // 2. Load Razorpay script dynamically
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

  const handlePayNow = async () => {
    if (!sessionData) return;
    setPaymentError("");
    setIsSubmitting(true);

    // Load Razorpay helper script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentError("Could not load Razorpay payment helper. Please verify your internet connection.");
      setIsSubmitting(false);
      return;
    }

    // Call API to create order
    try {
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: sessionData.cart,
          shippingDetails: sessionData.shippingDetails,
          couponCode: sessionData.couponCode,
          userId: userId
        })
      });

      const orderData = await response.json();
      if (!response.ok) {
        setPaymentError(orderData.error || "Failed to start checkout. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const { key_id, order_id, amount, currency } = orderData;

      // Configure Razorpay modal
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Thread 3D Store",
        description: "Custom Apparel Design Checkout",
        order_id: order_id,
        handler: async function (paymentRes) {
          setIsSubmitting(true);
          try {
            // Verify payment on the server
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                razorpay_order_id: paymentRes.razorpay_order_id,
                razorpay_payment_id: paymentRes.razorpay_payment_id,
                razorpay_signature: paymentRes.razorpay_signature,
                orderDetails: {
                  user_id: userId,
                  items: sessionData.cart,
                  total_amount: sessionData.finalTotalAmount,
                  shipping_details: sessionData.shippingDetails
                }
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              // Clear shopping cart and session cache
              localStorage.removeItem("apparel_cart");
              localStorage.removeItem("apparel_checkout_session");
              
              setPaymentSuccess(true);
              setIsSubmitting(false);

              // Redirect to homepage/orders after 5 seconds
              setTimeout(() => {
                window.location.href = "/";
              }, 5000);
            } else {
              setPaymentError(verifyData.error || "Payment verification failed. Please contact support.");
              setIsSubmitting(false);
            }
          } catch (err) {
            setPaymentError(`Verification error: ${err.message}`);
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: sessionData.shippingDetails.name,
          contact: sessionData.shippingDetails.phone
        },
        theme: {
          color: "#6366f1"
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setPaymentError(`Network connection error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (!sessionData && !paymentSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-850 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-white">No Active Checkout Session</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We couldn't find your checkout information. Please return to the configurator and add items to your cart.
            </p>
          </div>
          <Link href="/" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs py-3 px-4 rounded-xl transition-all block cursor-pointer">
            Return to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* 1. Header Bar */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="font-black text-lg bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent tracking-tighter">THREAD 3D</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* 2. Main Layout Container */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shopping</span>
          </Link>
        </div>

        {paymentError && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed max-w-4xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wide">Checkout Blocked</p>
              <p className="mt-0.5 text-zinc-300 font-medium">{paymentError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Order Details list (Left) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>Order Summary</span>
              </h2>

              <div className="space-y-4 pt-2">
                {sessionData?.cart?.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-3.5">
                    <div className="w-16 h-16 bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={item.thumbnailUrl || item.customDesignUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs text-zinc-200 truncate">{item.name}</h4>
                      <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                        <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">Size: {item.size}</span>
                        <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">Qty: {item.quantity}</span>
                        {item.customName && (
                          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">👕 Jersey: {item.customName} ({item.customNumber || "00"})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-indigo-400">₹{((item.price || 3999) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address display */}
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>Delivery Information</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1 bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Recipient Name</span>
                  <span className="text-zinc-200 font-extrabold">{sessionData?.shippingDetails?.name}</span>
                </div>
                <div className="space-y-1 bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Contact Phone</span>
                  <span className="text-zinc-200 font-extrabold">{sessionData?.shippingDetails?.phone}</span>
                </div>
                <div className="space-y-1 bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl md:col-span-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Delivery Address</span>
                  <span className="text-zinc-200 font-semibold">
                    {sessionData?.shippingDetails?.address}, {sessionData?.shippingDetails?.city} - <span className="font-mono font-bold text-indigo-400">{sessionData?.shippingDetails?.zip}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Ledger & Submit (Right) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full filter blur-xl pointer-events-none" />

              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-300 pb-2 border-b border-zinc-800">
                Payment Invoice
              </h2>

              <div className="space-y-3 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Cart Items Value:</span>
                  <span className="font-mono text-zinc-200">₹{sessionData?.subtotal?.toLocaleString('en-IN')}</span>
                </div>
                {sessionData?.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Promo Discount:</span>
                    <span className="font-mono">-₹{sessionData?.discountAmount?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-mono text-zinc-200">₹{sessionData?.deliveryFee?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-4 text-sm font-extrabold text-white">
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-indigo-400 text-base">₹{sessionData?.finalTotalAmount?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handlePayNow} 
                  disabled={isSubmitting} 
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Securely (₹{sessionData?.finalTotalAmount?.toLocaleString('en-IN')})</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Fully encrypted SSL Connection</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Secure connection full-screen loader overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="space-y-6 max-w-sm">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Preparing Gateway Connection</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                Opening the secure Razorpay payment helper checkout drawer. Please do not close or refresh this tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Payment Success Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 bg-zinc-950 z-[110] flex flex-col items-center justify-center p-6 text-center">
          <div className="space-y-6 max-w-md bg-zinc-900 border border-zinc-850 p-8 rounded-2xl shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Payment Successful!</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Thank you! Your transaction has been approved. The custom design files have been generated and dispatched to our print facility.
              </p>
              <p className="text-[10px] text-zinc-500 mt-4 leading-normal font-mono">
                Order details saved to database. Returning to the store page in 5 seconds...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
