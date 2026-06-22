import { supabase } from "@/lib/supabase";

async function verifyAdmin(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized: Missing auth token", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: "Unauthorized: Invalid token", status: 401 };
  }

  const adminEmailSetting = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminEmails = adminEmailSetting
    ? adminEmailSetting.split(",").map(e => e.trim().toLowerCase())
    : ["admin@example.com", "admin@thread3d.com"];

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return { error: "Forbidden: You are not authorized", status: 403 };
  }

  return { user };
}

const DEFAULT_ANNOUNCEMENT = "\u26a1 NEXT-GEN 3D STUDIO COUTURE DROP LIVE \u00b7 USE CODE THREAD3D FOR 20% OFF \u26a1";

// GET: Fetch storefront settings (Public)
export async function GET() {
  try {
    // 1. Try to fetch all columns including flash offer and designer settings columns
    let query = supabase
      .from("storefront_settings")
      .select("announcement_text, offer_product_id, offer_discount_percent, offer_ends_at, designer_fee, designer_enabled, flash_offers_list")
      .eq("id", "default")
      .maybeSingle();

    let { data, error } = await query;

    let fallbackDesigner = false;
    let fallbackOffer = false;

    if (error) {
      console.warn("Full storefront settings fetch failed, falling back to offer settings columns...", error.message);
      fallbackDesigner = true;

      // Fallback 1: Query announcement + offer columns (no designer columns)
      const { data: offerData, error: offerError } = await supabase
        .from("storefront_settings")
        .select("announcement_text, offer_product_id, offer_discount_percent, offer_ends_at")
        .eq("id", "default")
        .maybeSingle();

      if (offerError) {
        console.warn("Flash offer settings columns failed, falling back to announcement only...", offerError.message);
        fallbackOffer = true;

        // Fallback 2: Query announcement text only
        const { data: legacyData, error: legacyError } = await supabase
          .from("storefront_settings")
          .select("announcement_text")
          .eq("id", "default")
          .maybeSingle();

        if (legacyError) {
          return Response.json({
            announcement_text: DEFAULT_ANNOUNCEMENT,
            offer_product_id: null,
            offer_discount_percent: 0,
            offer_ends_at: null,
            designer_fee: 500,
            designer_enabled: true,
            fallbackMode: true,
          });
        }

        data = {
          announcement_text: legacyData?.announcement_text || DEFAULT_ANNOUNCEMENT,
          offer_product_id: null,
          offer_discount_percent: 0,
          offer_ends_at: null,
          designer_fee: 500,
          designer_enabled: true
        };
      } else {
        data = {
          announcement_text: offerData?.announcement_text || DEFAULT_ANNOUNCEMENT,
          offer_product_id: offerData?.offer_product_id || null,
          offer_discount_percent: offerData?.offer_discount_percent || 0,
          offer_ends_at: offerData?.offer_ends_at || null,
          designer_fee: 500,
          designer_enabled: true
        };
      }
    }

    if (!data) {
      // Table exists but no default row — auto-seed it and return default
      await supabase
        .from("storefront_settings")
        .insert({ id: "default", announcement_text: DEFAULT_ANNOUNCEMENT });

      return Response.json({
        announcement_text: DEFAULT_ANNOUNCEMENT,
        offer_product_id: null,
        offer_discount_percent: 0,
        offer_ends_at: null,
        designer_fee: 500,
        designer_enabled: true,
        fallbackMode: false,
      });
    }

    return Response.json({
      announcement_text: data.announcement_text || DEFAULT_ANNOUNCEMENT,
      offer_product_id: data.offer_product_id || null,
      offer_discount_percent: data.offer_discount_percent || 0,
      offer_ends_at: data.offer_ends_at || null,
      designer_fee: data.designer_fee !== undefined ? data.designer_fee : 500,
      designer_enabled: data.designer_enabled !== undefined ? data.designer_enabled : true,
      flash_offers_list: Array.isArray(data.flash_offers_list) ? data.flash_offers_list : [],
      fallbackMode: fallbackDesigner || fallbackOffer,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST: Update storefront settings (Admin only)
export async function POST(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { 
      announcement_text, 
      offer_product_id, 
      offer_discount_percent, 
      offer_ends_at,
      designer_fee,
      designer_enabled,
      flash_offers_list
    } = body;

    const payload = {
      id: "default",
      updated_at: new Date().toISOString()
    };

    if (announcement_text !== undefined) {
      payload.announcement_text = announcement_text.trim();
    }
    
    if (offer_product_id !== undefined) {
      payload.offer_product_id = offer_product_id;
    }
    
    if (offer_discount_percent !== undefined) {
      payload.offer_discount_percent = parseInt(offer_discount_percent, 10) || 0;
    }
    
    if (offer_ends_at !== undefined) {
      payload.offer_ends_at = offer_ends_at;
    }

    if (designer_fee !== undefined) {
      payload.designer_fee = parseInt(designer_fee, 10) || 0;
    }

    if (designer_enabled !== undefined) {
      payload.designer_enabled = !!designer_enabled;
    }

    if (flash_offers_list !== undefined) {
      payload.flash_offers_list = Array.isArray(flash_offers_list) ? flash_offers_list : [];
    }

    let { error } = await supabase
      .from("storefront_settings")
      .upsert(payload, { onConflict: "id" });

    // Handle schema column missing errors (PGRST204 or PostgreSQL 42703 / column not found)
    if (error && (error.code === "PGRST204" || error.message?.includes("designer_fee") || error.message?.includes("designer_enabled"))) {
      console.warn("Designer settings columns missing in storefront_settings database table, retrying without them...");
      const fallbackPayload = { ...payload };
      delete fallbackPayload.designer_fee;
      delete fallbackPayload.designer_enabled;

      const retryRes = await supabase
        .from("storefront_settings")
        .upsert(fallbackPayload, { onConflict: "id" });
      error = retryRes.error;
    }

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // System log
    let logMsg = "Updated storefront settings.";
    if (announcement_text !== undefined) {
      logMsg = `Updated announcement ticker: "${announcement_text.trim()}"`;
    } else if (offer_product_id) {
      logMsg = `Activated flash offer for product ${offer_product_id} (${offer_discount_percent}% off, ends at ${offer_ends_at})`;
    } else if (offer_product_id === null) {
      logMsg = "Cancelled active flash offer.";
    } else if (designer_fee !== undefined || designer_enabled !== undefined) {
      logMsg = `Updated personalized designer settings: Fee: ₹${designer_fee}, Enabled: ${designer_enabled}`;
    }

    await supabase.from("system_logs").insert([{
      operator: auth.user.email,
      action: logMsg,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
