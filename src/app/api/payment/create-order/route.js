import { supabase } from "@/lib/supabase";
import Razorpay from "razorpay";

function getShippingFee(zip) {
  const cleanZip = (zip || "").trim().replace(/\D/g, "");
  if (!cleanZip || cleanZip.length < 2) return 0;
  
  const prefixNum = parseInt(cleanZip.substring(0, 2), 10);
  
  if (prefixNum >= 60 && prefixNum <= 64) {
    return prefixNum === 60 ? 49 : 99; // Chennai vs Rest of TN
  } else if (prefixNum >= 56 && prefixNum <= 59) {
    return 99; // Karnataka
  } else if (prefixNum >= 50 && prefixNum <= 53) {
    return 149; // AP / Telangana
  } else if (prefixNum >= 67 && prefixNum <= 69) {
    return 149; // Kerala
  } else if (prefixNum >= 40 && prefixNum <= 44) {
    return 249; // Maharashtra
  } else if (prefixNum >= 70 && prefixNum <= 74) {
    return 299; // West Bengal
  } else if ((prefixNum >= 11 && prefixNum <= 28) || [30, 31, 32, 33, 34].includes(prefixNum)) {
    return 299; // Delhi / North India / Rajasthan
  }
  return 199; // Default national
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, shippingDetails, couponCode, isDesignerConsultation } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Cart items are required" }, { status: 400 });
    }

    if (!shippingDetails || !shippingDetails.zip) {
      return Response.json({ error: "Shipping details with ZIP code are required" }, { status: 400 });
    }

    // 1. Fetch active Razorpay Settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("id", "razorpay")
      .single();

    // 2. Re-calculate subtotal securely on server side
    const productIds = items.map(item => item.productId).filter(Boolean);
    let dbProducts = [];
    try {
      if (productIds.length > 0) {
        const { data, error } = await supabase
          .from("products")
          .select("id, price")
          .in("id", productIds);
        if (!error && data) {
          dbProducts = data;
        }
      }
    } catch (err) {
      console.warn("Could not query products from database, falling back to local item prices:", err.message || err);
    }

    const priceMap = {};
    dbProducts.forEach(p => {
      priceMap[p.id] = parseFloat(p.price) || 3999;
    });

    // Fetch active flash offer & designer fee settings from storefront_settings
    let activeOffer = null;
    let dbDesignerFee = 500;
    try {
      const { data: offerData, error } = await supabase
        .from("storefront_settings")
        .select("offer_product_id, offer_discount_percent, offer_ends_at, designer_fee")
        .eq("id", "default")
        .maybeSingle();
        
      if (!error && offerData) {
        if (offerData.offer_product_id && offerData.offer_ends_at) {
          const endsAt = new Date(offerData.offer_ends_at);
          if (endsAt > new Date() && offerData.offer_discount_percent > 0) {
            activeOffer = {
              productId: offerData.offer_product_id,
              discountPercent: offerData.offer_discount_percent
            };
          }
        }
        if (offerData.designer_fee !== undefined && offerData.designer_fee !== null) {
          dbDesignerFee = offerData.designer_fee;
        }
      } else if (error) {
        // Fallback: query flash offer columns only
        console.warn("storefront_settings query failed, trying fallback...", error.message);
        const { data: fallbackData } = await supabase
          .from("storefront_settings")
          .select("offer_product_id, offer_discount_percent, offer_ends_at")
          .eq("id", "default")
          .maybeSingle();
        
        if (fallbackData && fallbackData.offer_product_id && fallbackData.offer_ends_at) {
          const endsAt = new Date(fallbackData.offer_ends_at);
          if (endsAt > new Date() && fallbackData.offer_discount_percent > 0) {
            activeOffer = {
              productId: fallbackData.offer_product_id,
              discountPercent: fallbackData.offer_discount_percent
            };
          }
        }
      }
    } catch (err) {
      console.warn("Could not query storefront settings schema:", err.message);
    }

    let subtotal = 0;
    items.forEach(item => {
      // Fallback to item price if product details aren't in Supabase (e.g. customized studio items draft)
      let unitPrice = priceMap[item.productId] !== undefined ? priceMap[item.productId] : (parseFloat(item.price) || 3999);
      
      // Override price for designer consultation
      if (isDesignerConsultation && item.id === "designer_consultation") {
        unitPrice = dbDesignerFee;
      } else {
        // Apply active flash offer discount if applicable (skip for designer consultation)
        if (activeOffer && activeOffer.productId === item.productId) {
          const discountAmt = Math.round(unitPrice * (activeOffer.discountPercent / 100));
          unitPrice = Math.max(0, unitPrice - discountAmt);
        }
      }
      
      subtotal += unitPrice * item.quantity;
    });

    // 3. Re-calculate promo code discount
    let discountPercent = 0;
    const code = (couponCode || "").trim().toUpperCase();
    if (code) {
      const { data: dbCoupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (dbCoupon) {
        // Check usage limit
        const limitNotReached = dbCoupon.usage_limit === null || dbCoupon.used_count < dbCoupon.usage_limit;
        
        // Check first-time-only logic
        let firstTimeValid = true;
        if (dbCoupon.is_first_time_only) {
          const uId = body.userId || null;
          if (uId) {
            const { data: past } = await supabase
              .from("orders")
              .select("id")
              .eq("user_id", uId)
              .neq("status", "cancelled")
              .limit(1);
            if (past && past.length > 0) firstTimeValid = false;
          } else if (shippingDetails.email) {
            const cleanEmail = shippingDetails.email.trim().toLowerCase();
            const { data: existingGuestOrders } = await supabase
              .from("orders")
              .select("id")
              .eq("customer_email", cleanEmail)
              .neq("status", "cancelled")
              .limit(1);
            if (existingGuestOrders && existingGuestOrders.length > 0) {
              firstTimeValid = false;
            }
          }
        }

        if (limitNotReached && firstTimeValid) {
          discountPercent = dbCoupon.discount_percent;
        }
      } else {
        // Fallback for static default codes
        if (code === "THREAD3D" || code === "SAAS20") {
          discountPercent = 20;
        }
      }
    }
    const discountAmount = subtotal * (discountPercent / 100);

    // 4. Re-calculate shipping fee based on delivery ZIP code
    const deliveryFee = getShippingFee(shippingDetails.zip);

    // 5. Final total
    const finalTotalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);

    // 6. Check Razorpay Settings are active
    const isRazorpayConfigured = !settingsError && settings && settings.enabled && settings.key_id && settings.key_secret;
    const isMockModeEnabled = settings?.mock_mode_enabled === true;

    if (!isRazorpayConfigured) {
      // If Razorpay is NOT configured, check if Mock Mode is enabled by admin
      if (!isMockModeEnabled) {
        return Response.json({ 
          error: "Payment failed. Please try again later." 
        }, { status: 400 });
      }

      // ============ MOCK MODE FLOW ============
      if (finalTotalAmount <= 0) {
        return Response.json({ error: "Order total must be greater than zero." }, { status: 400 });
      }

      // Create pending order in Supabase with mock gateway mapped to actual database columns
      const mockOrderPayload = {
        user_id: body.userId || null,
        customer_name: shippingDetails.name,
        customer_email: shippingDetails.email,
        customer_phone: shippingDetails.phone,
        shipping_address: {
          address: shippingDetails.address,
          city: shippingDetails.city,
          state: shippingDetails.state,
          zip: shippingDetails.zip,
          coupon_code: code || null,
          payment_details: {
            razorpay_order_id: `mock_order_${Date.now()}`,
            razorpay_payment_id: null,
            razorpay_signature: null
          }
        },
        items: items,
        total_amount: finalTotalAmount,
        status: "pending",
        payment_gateway: "mock_test"
      };

      const { data: mockDbOrder, error: mockDbErr } = await supabase
        .from("orders")
        .insert([mockOrderPayload])
        .select("id")
        .single();

      if (mockDbErr || !mockDbOrder) {
        console.error("Failed to create mock order:", mockDbErr);
        return Response.json({ error: "Failed to initiate mock order. Please try again." }, { status: 500 });
      }

      return Response.json({
        success: true,
        isMockMode: true,
        db_order_id: mockDbOrder.id,
        order_id: `mock_order_${mockDbOrder.id}`,
        amount: Math.round(finalTotalAmount * 100),
        currency: "INR",
        calculated_total: finalTotalAmount
      });
    }

    // ============ LIVE RAZORPAY FLOW ============
    if (finalTotalAmount <= 0) {
      return Response.json({ error: "Order total must be greater than zero." }, { status: 400 });
    }

    // A. Pre-create pending order in Supabase mapped to actual database columns
    const pendingOrderPayload = {
      user_id: body.userId || null,
      customer_name: shippingDetails.name,
      customer_email: shippingDetails.email,
      customer_phone: shippingDetails.phone,
      shipping_address: {
        address: shippingDetails.address,
        city: shippingDetails.city,
        state: shippingDetails.state,
        zip: shippingDetails.zip,
        coupon_code: code || null,
        payment_details: {
          razorpay_order_id: null,
          razorpay_payment_id: null,
          razorpay_signature: null
        }
      },
      items: items,
      total_amount: finalTotalAmount,
      status: "pending",
      payment_gateway: "razorpay"
    };

    const { data: dbOrder, error: dbErr } = await supabase
      .from("orders")
      .insert([pendingOrderPayload])
      .select("id")
      .single();

    if (dbErr || !dbOrder) {
      console.error("Failed to pre-create pending order in database:", dbErr);
      return Response.json({ error: "Failed to initiate order in the database. Please try again." }, { status: 500 });
    }

    // B. Initialize Razorpay and create order
    const razorpay = new Razorpay({
      key_id: settings.key_id.trim(),
      key_secret: settings.key_secret.trim(),
    });

    const options = {
      amount: Math.round(finalTotalAmount * 100), // amount in paisa
      currency: "INR",
      receipt: `rcpt_${dbOrder.id}`,
      notes: {
        db_order_id: String(dbOrder.id) // extremely short, safe from truncation
      }
    };

    const rzpOrder = await razorpay.orders.create(options);

    // C. Update the pending order with the actual Razorpay Order ID
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        shipping_address: {
          address: shippingDetails.address,
          city: shippingDetails.city,
          state: shippingDetails.state,
          zip: shippingDetails.zip,
          coupon_code: code || null,
          payment_details: {
            razorpay_order_id: rzpOrder.id,
            razorpay_payment_id: null,
            razorpay_signature: null
          }
        }
      })
      .eq("id", dbOrder.id);

    if (updateErr) {
      console.warn(`Failed to update pending order #${dbOrder.id} with Razorpay Order ID:`, updateErr.message);
    }

    return Response.json({
      success: true,
      isMockMode: false,
      key_id: settings.key_id.trim(),
      order_id: rzpOrder.id,
      db_order_id: dbOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      calculated_total: finalTotalAmount
    });
  } catch (err) {
    console.error("Razorpay Order Creation Exception:", err);
    return Response.json({ error: err.message || "Failed to initiate Razorpay order." }, { status: 500 });
  }
}
