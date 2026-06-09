import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderDetails
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderDetails) {
      return Response.json({ error: "Missing required verification details." }, { status: 400 });
    }

    // 1. Fetch active Razorpay Key Secret from database
    const { data: settings, error: settingsError } = await supabase
      .from("payment_gateway_settings")
      .select("key_secret")
      .eq("id", "razorpay")
      .single();

    if (settingsError || !settings || !settings.key_secret) {
      await supabase.from("system_logs").insert([{
        operator: "system/payment-verifier",
        action: `Failed verification: Razorpay configuration missing in database. Order ID: ${razorpay_order_id}.`,
        created_at: new Date().toISOString()
      }]);
      return Response.json({ error: "Razorpay settings not configured." }, { status: 500 });
    }

    // 2. Cryptographically verify signature
    const hmac = crypto.createHmac("sha256", settings.key_secret.trim());
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await supabase.from("system_logs").insert([{
        operator: "system/payment-verifier",
        action: `CRITICAL: Razorpay signature mismatch! Potential fraud attempt. Order ID: ${razorpay_order_id}, Payment ID: ${razorpay_payment_id}.`,
        created_at: new Date().toISOString()
      }]);
      return Response.json({ error: "Invalid payment signature. Verification failed." }, { status: 400 });
    }

    // 3. Create the final order in Supabase with payment reference
    const shippingDetails = {
      ...orderDetails.shipping_details,
      payment_details: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        verified_at: new Date().toISOString()
      }
    };

    const finalOrderPayload = {
      user_id: orderDetails.user_id || null,
      items: orderDetails.items,
      total_amount: orderDetails.total_amount,
      status: "processing",
      shipping_details: shippingDetails,
      payment_gateway: "razorpay"
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert([finalOrderPayload])
      .select("id")
      .single();

    if (insertError) {
      console.error("Order save failure in Supabase after successful payment:", insertError);
      await supabase.from("system_logs").insert([{
        operator: "system/payment-verifier",
        action: `Payment verified for ID: ${razorpay_payment_id}, but order insertion failed: ${insertError.message}`,
        created_at: new Date().toISOString()
      }]);
      return Response.json({ 
        error: "Payment captured, but failed to save order to database. Our team has been notified."
      }, { status: 500 });
    }

    // 4. Increment coupon used_count if a coupon was applied
    const appliedCoupon = orderDetails.couponCode || orderDetails.coupon_code || orderDetails.shipping_details?.coupon_code;
    if (appliedCoupon) {
      try {
        const codeToIncrement = appliedCoupon.trim().toUpperCase();
        const { data: currentCoupon } = await supabase
          .from("coupons")
          .select("id, used_count")
          .eq("code", codeToIncrement)
          .single();
        
        if (currentCoupon) {
          await supabase
            .from("coupons")
            .update({ used_count: (currentCoupon.used_count || 0) + 1 })
            .eq("id", currentCoupon.id);
        }
      } catch (couponIncrErr) {
        console.warn("Failed to increment coupon used_count:", couponIncrErr);
      }
    }

    // 5. Log successful audit trail
    await supabase.from("system_logs").insert([{
      operator: "system/payment-verifier",
      action: `Order #${insertedOrder.id} placed successfully. Razorpay Payment ID: ${razorpay_payment_id}.`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ 
      success: true, 
      orderId: insertedOrder.id,
      message: "Payment verified and order placed successfully!" 
    });
  } catch (err) {
    console.error("Razorpay Verification Exception:", err);
    return Response.json({ error: err.message || "Failed to verify payment." }, { status: 500 });
  }
}
