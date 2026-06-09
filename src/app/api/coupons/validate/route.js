import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, userId, email } = body;

    if (!code) {
      return Response.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const uppercaseCode = code.trim().toUpperCase();

    // 1. Fetch coupon details from Supabase
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", uppercaseCode)
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.code === "PGRST205" || error.code === "42P01") {
        // Fallback for static default codes if database table is not created yet
        if (uppercaseCode === "THREAD3D") {
          return Response.json({
            success: true,
            coupon: {
              code: "THREAD3D",
              discount_percent: 20,
              is_first_time_only: false
            }
          });
        }
        return Response.json({ error: "Invalid coupon code." }, { status: 404 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 2. Check if coupon is active
    if (!coupon.is_active) {
      return Response.json({ error: "This coupon code is no longer active." }, { status: 400 });
    }

    // 3. Check if usage limit is reached
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return Response.json({ error: "This coupon has reached its maximum usage limit." }, { status: 400 });
    }

    // 4. Check if coupon is restricted to first-time users only
    if (coupon.is_first_time_only) {
      let hasPreviousOrders = false;

      if (userId) {
        const { data: userOrders, error: orderErr } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", userId)
          .neq("status", "cancelled")
          .limit(1);

        if (!orderErr && userOrders && userOrders.length > 0) {
          hasPreviousOrders = true;
        }
      } else if (email) {
        // Guest user check by email in shipping details
        const { data: allOrders, error: orderErr } = await supabase
          .from("orders")
          .select("shipping_details")
          .neq("status", "cancelled");

        if (!orderErr && allOrders) {
          const matchingOrder = allOrders.find(o => {
            const shipEmail = o.shipping_details?.email || "";
            return shipEmail.trim().toLowerCase() === email.trim().toLowerCase();
          });
          if (matchingOrder) hasPreviousOrders = true;
        }
      }

      if (hasPreviousOrders) {
        return Response.json({ error: "This coupon is only valid for first-time customers." }, { status: 400 });
      }
    }

    return Response.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        is_first_time_only: coupon.is_first_time_only
      }
    });

  } catch (err) {
    return Response.json({ error: err.message || "Validation failed." }, { status: 500 });
  }
}
