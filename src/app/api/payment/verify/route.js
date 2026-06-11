import { supabase } from "@/lib/supabase";
import crypto from "crypto";

async function uploadBase64ToStorage(base64String, productId) {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `${Date.now()}_custom_design_${productId}.png`;
    const filePath = `textures/${fileName}`;
    
    const { error } = await supabase.storage
      .from("product-assets")
      .upload(filePath, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true
      });
      
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from("product-assets")
      .getPublicUrl(filePath);
      
    return urlData.publicUrl;
  } catch (err) {
    console.error("Failed to upload custom design base64 texture to storage:", err);
    return null;
  }
}

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

    // 3. Try to locate existing pending order pre-created in the database
    let existingOrder = null;
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("shipping_details->payment_details->>razorpay_order_id", razorpay_order_id)
        .limit(1)
        .maybeSingle();
      if (data) {
        existingOrder = data;
      }
    } catch (e) {
      console.warn("Failed to check for existing pending order by Razorpay Order ID:", e);
    }

    let finalOrder = null;
    let saveError = null;

    if (existingOrder) {
      const shippingDetails = {
        ...existingOrder.shipping_details,
        payment_details: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          verified_at: new Date().toISOString()
        }
      };

      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "processing",
          shipping_details: shippingDetails
        })
        .eq("id", existingOrder.id)
        .select("id")
        .single();

      if (updateError) {
        saveError = updateError;
      } else {
        finalOrder = updatedOrder;
      }
    } else {
      // Create new order (fallback for backward compatibility or cases where pre-creation failed)
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
        saveError = insertError;
      } else {
        finalOrder = insertedOrder;
      }
    }

    if (saveError || !finalOrder) {
      console.error("Order save failure in Supabase after successful payment:", saveError);
      await supabase.from("system_logs").insert([{
        operator: "system/payment-verifier",
        action: `Payment verified for ID: ${razorpay_payment_id}, but order saving/updating failed: ${(saveError || {}).message}`,
        created_at: new Date().toISOString()
      }]);
      return Response.json({ 
        error: "Payment captured, but failed to save order to database. Our team has been notified."
      }, { status: 500 });
    }

    // 3b. Save custom on-the-spot designs to products database table
    try {
      const items = orderDetails.items || [];
      for (const item of items) {
        if (item.productId && String(item.productId).startsWith("custom_")) {
          const baseTextureBase64 = item.customDesignUrl || item.baseTexture;
          if (baseTextureBase64 && baseTextureBase64.startsWith("data:image")) {
            const publicUrl = await uploadBase64ToStorage(baseTextureBase64, item.productId);
            if (publicUrl) {
              const customProductPayload = {
                id: item.productId,
                name: item.name || `Custom Garment`,
                glb_file_url: item.glbUrl || null,
                texture_url: publicUrl,
                price: parseFloat(item.price) || 3999,
                category: item.category || "custom",
                description: `A customized premium garment ordered and fabricated on the spot.`,
                is_template: false,
                gallery_urls: publicUrl
              };
              
              const { error: prodErr } = await supabase
                .from("products")
                .insert([customProductPayload]);
                
              if (prodErr) {
                console.error(`Failed to insert custom product ${item.productId} into products table:`, prodErr);
              } else {
                console.log(`Successfully saved custom design ${item.productId} to products table!`);
              }
            }
          }
        }
      }
    } catch (customProdErr) {
      console.error("Error processing custom products in verify route:", customProdErr);
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
      action: `Order #${finalOrder.id} placed successfully. Razorpay Payment ID: ${razorpay_payment_id}.`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ 
      success: true, 
      orderId: finalOrder.id,
      message: "Payment verified and order placed successfully!" 
    });
  } catch (err) {
    console.error("Razorpay Verification Exception:", err);
    return Response.json({ error: err.message || "Failed to verify payment." }, { status: 500 });
  }
}
