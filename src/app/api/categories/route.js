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

// GET: Fetch all categories (Publicly accessible)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("label", { ascending: true });

    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        return Response.json({
          categories: [],
          fallbackMode: true,
          message: "Database table 'categories' not found. Please execute the SQL script in schema.sql on your Supabase dashboard."
        });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ categories: data || [], fallbackMode: false });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new category (Admin only)
export async function POST(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, label, image_url } = body;

    if (!id || !label) {
      return Response.json({ error: "Category ID and Label are required" }, { status: 400 });
    }

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const cleanLabel = label.trim();

    const { data, error } = await supabase
      .from("categories")
      .insert([{ id: cleanId, label: cleanLabel, image_url: image_url || "" }])
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "Category ID already exists" }, { status: 400 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // System log
    await supabase.from("system_logs").insert([{
      operator: auth.user.email,
      action: `Created new category: ${cleanLabel} (${cleanId})`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ success: true, category: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update category details (Admin only)
export async function PUT(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, label, image_url } = body;

    if (!id || !label) {
      return Response.json({ error: "Category ID and Label are required" }, { status: 400 });
    }

    const cleanLabel = label.trim();

    const { data, error } = await supabase
      .from("categories")
      .update({ label: cleanLabel, image_url: image_url || "" })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // System log
    await supabase.from("system_logs").insert([{
      operator: auth.user.email,
      action: `Updated category: ${cleanLabel} (${id})`,
      created_at: new Date().toISOString()
    }]);

    return Response.json({ success: true, category: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}


// DELETE: Remove category (Admin only)
export async function DELETE(request) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Category ID is required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("categories")
      .select("label")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (existing) {
      await supabase.from("system_logs").insert([{
        operator: auth.user.email,
        action: `Deleted category: ${existing.label} (${id})`,
        created_at: new Date().toISOString()
      }]);
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
