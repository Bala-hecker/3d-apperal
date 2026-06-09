import { supabase } from "@/lib/supabase";

// Get helper for admin verification
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

// GET: Fetch Razorpay Settings
export async function GET(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data, error } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("id", "razorpay")
      .single();

    if (error && error.code !== "PGRST116") {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({
        enabled: false,
        key_id: "",
        key_secret_configured: false,
        webhook_secret_configured: false,
      });
    }

    return Response.json({
      enabled: data.enabled,
      key_id: data.key_id || "",
      key_secret_configured: !!data.key_secret,
      webhook_secret_configured: !!data.webhook_secret,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save or Validate Razorpay Settings
export async function POST(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { enabled, key_id, key_secret, webhook_secret, test_mode } = body;

    if (!key_id) {
      return Response.json({ error: "Razorpay Key ID is required" }, { status: 400 });
    }

    // Determine the secret to use for validation
    let activeSecret = key_secret;
    if (!activeSecret && !test_mode) {
      // If we are saving, and they didn't provide a new key_secret, fetch existing secret
      const { data: existing } = await supabase
        .from("payment_gateway_settings")
        .select("key_secret")
        .eq("id", "razorpay")
        .single();
      activeSecret = existing?.key_secret;
    }

    if (!activeSecret) {
      return Response.json({ error: "Razorpay Key Secret is required" }, { status: 400 });
    }

    // Validate keys by making a request to Razorpay's API
    const authString = Buffer.from(`${key_id.trim()}:${activeSecret.trim()}`).toString("base64");
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (razorpayResponse.status === 401) {
      return Response.json({ error: "Invalid Razorpay Key ID or Key Secret." }, { status: 400 });
    }

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json().catch(() => ({}));
      return Response.json({
        error: errorData.error?.description || `Razorpay validation failed with status ${razorpayResponse.status}`,
      }, { status: 400 });
    }

    if (test_mode) {
      return Response.json({ success: true, message: "Credentials are valid!" });
    }

    // Build update payload
    const updatePayload = {
      id: "razorpay",
      enabled: !!enabled,
      key_id: key_id.trim(),
      updated_at: new Date().toISOString(),
    };

    if (key_secret) {
      updatePayload.key_secret = key_secret.trim();
    }
    if (webhook_secret !== undefined) {
      updatePayload.webhook_secret = webhook_secret.trim();
    }

    const { error: saveError } = await supabase
      .from("payment_gateway_settings")
      .upsert(updatePayload);

    if (saveError) {
      return Response.json({ error: saveError.message }, { status: 500 });
    }

    // Add Audit Log
    await supabase.from("system_logs").insert([{
      operator: auth.user.email,
      action: `Updated Razorpay payment settings (Enabled: ${enabled}, Key ID: ${key_id}).`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ success: true, message: "Settings saved and validated successfully!" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
