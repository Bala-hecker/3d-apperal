import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return Response.json({ error: "Missing signature header" }, { status: 400 });
    }

    // 1. Fetch Webhook Secret from database settings
    const { data: settings, error: settingsError } = await supabase
      .from("payment_gateway_settings")
      .select("webhook_secret")
      .eq("id", "razorpay")
      .single();

    if (settingsError || !settings || !settings.webhook_secret) {
      console.warn("Webhook received, but Webhook Secret is not configured in database.");
      return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // 2. Verify webhook signature
    const hmac = crypto.createHmac("sha256", settings.webhook_secret.trim());
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (expectedSignature !== signature) {
      await supabase.from("system_logs").insert([{
        operator: "system/payment-webhook",
        action: "CRITICAL: Webhook signature mismatch! Unauthorized event received.",
        created_at: new Date().toISOString()
      }]);
      return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    // 3. Process the verified event
    const event = JSON.parse(rawBody);
    
    // We are interested in payment captured or order paid events
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const amount = paymentEntity.amount / 100; // in INR

      // Search for order by Razorpay Order ID in shipping_details or receipt
      // We check if an order has been created.
      // First, fetch the matching order using highly-optimized jsonb database index query.
      let matchingOrder = null;
      let searchError = null;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("shipping_details->payment_details->>razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (error) {
          searchError = error;
        } else if (data) {
          matchingOrder = data;
        }
      } catch (err) {
        console.warn("Exception during Razorpay Order ID search in webhook:", err);
      }

      // Fallback: If not found by Razorpay Order ID, check notes for db_order_id (new pending order pre-creation)
      if (!matchingOrder && !searchError) {
        const notes = paymentEntity.notes || {};
        const dbOrderId = notes.db_order_id;
        if (dbOrderId) {
          try {
            const { data } = await supabase
              .from("orders")
              .select("*")
              .eq("id", dbOrderId)
              .limit(1)
              .maybeSingle();
            if (data) {
              matchingOrder = data;
            }
          } catch (err) {
            console.warn("Exception during DB Order ID search in webhook:", err);
          }
        }
      }

      if (searchError) {
        console.error("Failed to query orders in webhook:", searchError);
        return Response.json({ error: "Database search error" }, { status: 500 });
      }

      if (matchingOrder) {
        // If order already exists, ensure status is processing and payment details are attached
        if (matchingOrder.status === "pending" || matchingOrder.status === "awaiting_payment") {
          const updatedShippingDetails = {
            ...matchingOrder.shipping_details,
            payment_details: {
              ...(matchingOrder.shipping_details?.payment_details || {}),
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayPaymentId,
              webhook_verified_at: new Date().toISOString()
            }
          };

          const { error: updateError } = await supabase
            .from("orders")
            .update({ 
              status: "processing",
              shipping_details: updatedShippingDetails,
              updated_at: new Date().toISOString()
            })
            .eq("id", matchingOrder.id);

          if (updateError) {
            console.error("Failed to update order status in webhook:", updateError);
          } else {
            await supabase.from("system_logs").insert([{
              operator: "system/payment-webhook",
              action: `Webhook verified: Updated Order #${matchingOrder.id} status to processing.`,
              created_at: new Date().toISOString()
            }]);
          }
        }
      } else {
        // Order not found (e.g. signature verification API failed or browser closed before callback)
        // We can create the order if the full details are in the notes (legacy orders), or log warning for manual sync.
        const notes = paymentEntity.notes || {};
        
        // If the user's name, email, items etc are in notes, we could reconstruct it.
        // Let's check if we have enough info in notes.
        if (notes.items && notes.shipping_details) {
          try {
            const parsedItemsArray = JSON.parse(notes.items);
            const items = parsedItemsArray.map(itemArr => ({
              productId: itemArr[0],
              quantity: itemArr[1],
              size: itemArr[2],
              name: itemArr[3],
              price: itemArr[4]
            }));

            const parsedShippingArray = JSON.parse(notes.shipping_details);
            const shipping_details = {
              name: parsedShippingArray[0],
              phone: parsedShippingArray[1],
              address: parsedShippingArray[2],
              city: parsedShippingArray[3],
              zip: parsedShippingArray[4]
            };
            const userId = notes.user_id || null;

            const finalOrderPayload = {
              user_id: userId === "guest" ? null : userId,
              items: items,
              total_amount: amount,
              status: "processing",
              shipping_details: {
                ...shipping_details,
                coupon_code: notes.coupon_code || null,
                payment_details: {
                  razorpay_order_id: razorpayOrderId,
                  razorpay_payment_id: razorpayPaymentId,
                  webhook_verified_at: new Date().toISOString()
                }
              },
              payment_gateway: "razorpay"
            };

            const { data: newOrder, error: createError } = await supabase
              .from("orders")
              .insert([finalOrderPayload])
              .select("id")
              .single();

            if (!createError) {
              // Increment coupon used_count if a coupon was applied
              if (notes.coupon_code) {
                try {
                   const codeToIncrement = notes.coupon_code.trim().toUpperCase();
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
                  console.warn("Failed to increment coupon used_count in webhook:", couponIncrErr);
                }
              }

              await supabase.from("system_logs").insert([{
                operator: "system/payment-webhook",
                action: `Webhook reconciled & created Order #${newOrder.id} asynchronously. Payment ID: ${razorpayPaymentId}.`,
                created_at: new Date().toISOString()
              }]);
            } else {
              console.error("Failed to insert order from webhook notes:", createError);
            }
          } catch (e) {
            console.error("Failed to parse notes in webhook:", e);
          }
        } else {
          // Log a manual reconciliation warning
          await supabase.from("system_logs").insert([{
            operator: "system/payment-webhook",
            action: `WARNING: Webhook payment captured (ID: ${razorpayPaymentId}, Order: ${razorpayOrderId}), but no matching order found in database. Manual check required.`,
            created_at: new Date().toISOString()
          }]);
        }
      }
    }

    return Response.json({ success: true, message: "Webhook processed successfully" });
  } catch (err) {
    console.error("Webhook route error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
