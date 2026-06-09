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

// GET: Fetch all coupons
export async function GET(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        return Response.json({ 
          coupons: [], 
          fallbackMode: true, 
          message: "Database table 'coupons' not found. Please execute the SQL script in schema.sql on your Supabase dashboard." 
        });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ coupons: data || [], fallbackMode: false });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create coupon
export async function POST(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { code, discount_percent, usage_limit, is_first_time_only, is_active } = body;

    if (!code || !discount_percent) {
      return Response.json({ error: "Code and discount percentage are required" }, { status: 400 });
    }

    const uppercaseCode = code.trim().toUpperCase();

    const { data, error } = await supabase
      .from("coupons")
      .insert([{
        code: uppercaseCode,
        discount_percent: parseInt(discount_percent),
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        is_first_time_only: !!is_first_time_only,
        is_active: is_active !== false
      }])
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "Coupon code already exists" }, { status: 400 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("system_logs").insert([{
      operator: auth.user.email,
      action: `Created coupon code ${uppercaseCode} with ${discount_percent}% discount.`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ success: true, coupon: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update coupon status/details
export async function PUT(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, code, discount_percent, usage_limit, is_first_time_only, is_active } = body;

    if (!id) {
      return Response.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const uppercaseCode = code ? code.trim().toUpperCase() : undefined;

    const { data, error } = await supabase
      .from("coupons")
      .update({
        code: uppercaseCode,
        discount_percent: discount_percent ? parseInt(discount_percent) : undefined,
        usage_limit: usage_limit !== undefined ? (usage_limit ? parseInt(usage_limit) : null) : undefined,
        is_first_time_only: is_first_time_only !== undefined ? !!is_first_time_only : undefined,
        is_active: is_active !== undefined ? !!is_active : undefined
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("system_logs").insert([{
      operator: auth.user.email,
      action: `Updated coupon code ${data.code} details.`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ success: true, coupon: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove coupon
export async function DELETE(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("coupons")
      .select("code")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    if (existing) {
      await supabase.from("system_logs").insert([{
        operator: auth.user.email,
        action: `Deleted coupon code ${existing.code}.`,
        created_at: new Date().toISOString()
      }]);
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
