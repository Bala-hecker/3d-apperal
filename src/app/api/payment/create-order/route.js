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
    const { items, shippingDetails, couponCode } = body;

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

    let subtotal = 0;
    items.forEach(item => {
      // Fallback to item price if product details aren't in Supabase (e.g. customized studio items draft)
      const unitPrice = priceMap[item.productId] !== undefined ? priceMap[item.productId] : (parseFloat(item.price) || 3999);
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
            const { data: allOrders } = await supabase
              .from("orders")
              .select("shipping_details")
              .neq("status", "cancelled");
            if (allOrders) {
              const matchingOrder = allOrders.find(o => {
                const shipEmail = o.shipping_details?.email || "";
                return shipEmail.trim().toLowerCase() === shippingDetails.email.trim().toLowerCase();
              });
              if (matchingOrder) firstTimeValid = false;
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

    // 4. Re-calculate shipping fee
    const deliveryFee = getShippingFee(shippingDetails.zip);

    // 5. Final total
    const finalTotalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);

    // 6. Check Razorpay Settings are active
    if (settingsError || !settings || !settings.enabled) {
      return Response.json({ error: "Razorpay payment gateway is not enabled. Please configure and enable it in the Admin Dashboard Settings." }, { status: 400 });
    }

    if (!settings.key_id || !settings.key_secret) {
      return Response.json({ error: "Razorpay credentials are not fully configured in the Admin settings." }, { status: 500 });
    }

    if (finalTotalAmount <= 0) {
      return Response.json({ error: "Order total must be greater than zero." }, { status: 400 });
    }

    // 6. Initialize Razorpay and create order
    const razorpay = new Razorpay({
      key_id: settings.key_id.trim(),
      key_secret: settings.key_secret.trim(),
    });

    const compactItems = items.map(i => [
      i.productId || "",
      i.quantity || 1,
      i.size || "M",
      (i.name || "Custom Apparel").substring(0, 30),
      i.price || 3999
    ]);
    const compactShipping = [
      (shippingDetails.name || "").substring(0, 40),
      (shippingDetails.phone || "").substring(0, 20),
      (shippingDetails.address || "").substring(0, 80),
      (shippingDetails.city || "").substring(0, 30),
      (shippingDetails.zip || "").substring(0, 10)
    ];

    const options = {
      amount: Math.round(finalTotalAmount * 100), // amount in paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: {
        user_id: body.userId || "",
        items: JSON.stringify(compactItems).substring(0, 255),
        shipping_details: JSON.stringify(compactShipping).substring(0, 255),
        coupon_code: (couponCode || "").trim().toUpperCase()
      }
    };

    const rzpOrder = await razorpay.orders.create(options);

    return Response.json({
      success: true,
      key_id: settings.key_id.trim(),
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      calculated_total: finalTotalAmount
    });
  } catch (err) {
    console.error("Razorpay Order Creation Exception:", err);
    return Response.json({ error: err.message || "Failed to initiate Razorpay order." }, { status: 500 });
  }
}
