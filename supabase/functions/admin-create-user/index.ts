import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    // Verify the caller is an admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin role
    const { data: callerRoles } = await createClient(supabaseUrl, serviceRoleKey)
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");
    
    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, full_name, department, role, phone, mobile, user_code, default_series_id } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user with admin API (doesn't affect caller's session)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = newUser.user.id;

    // Update profile
    await adminClient.from("profiles").update({
      department,
      full_name,
      phone: phone || null,
      mobile: mobile || null,
      user_code: user_code || null,
      default_series_id: default_series_id || null,
    }).eq("user_id", userId);

    // Set role (the trigger already created 'user' role, so update if different)
    if (role && role !== "user") {
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const { error: roleError } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (roleError) {
        console.error("Role assignment error:", roleError);
        return new Response(JSON.stringify({ error: `User created but role assignment failed: ${roleError.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
