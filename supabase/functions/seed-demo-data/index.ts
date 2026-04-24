import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    // 1. Create 3 Business Partners
    const bpData = [
      { card_code: "C-DEMO-001", card_name: "Acme Construction Ltd", card_type: "customer", status: "active" },
      { card_code: "C-DEMO-002", card_name: "Gulf Trading Co", card_type: "customer", status: "active" },
      { card_code: "V-DEMO-001", card_name: "Steel Supply Corp", card_type: "vendor", status: "active" },
    ];
    const { error: bpErr } = await supabase.from("business_partners").upsert(bpData, { onConflict: "card_code" });
    results.push(bpErr ? `BPs: Error - ${bpErr.message}` : "BPs: 3 created");

    // 2. Create 5 Items
    const itemData = [
      { item_code: "ITEM-DEMO-001", item_name: "Steel Beam H200", item_type: "inventory", status: "active" },
      { item_code: "ITEM-DEMO-002", item_name: "Concrete Mix C40", item_type: "inventory", status: "active" },
      { item_code: "ITEM-DEMO-003", item_name: "Rebar 12mm", item_type: "inventory", status: "active" },
      { item_code: "ITEM-DEMO-004", item_name: "Engineering Service", item_type: "service", status: "active" },
      { item_code: "ITEM-DEMO-005", item_name: "Safety Equipment Set", item_type: "inventory", status: "active" },
    ];
    const { error: itemErr } = await supabase.from("items").upsert(itemData, { onConflict: "item_code" });
    results.push(itemErr ? `Items: Error - ${itemErr.message}` : "Items: 5 created");

    // 3. Create 2 Projects
    const projectData = [
      {
        name: "Demo: Al Rajhi Tower Phase 2",
        description: "High-rise construction project - QA demo data",
        status: "in_progress",
        project_type: "industrial",
        current_phase: "procurement",
        contract_value: 2500000,
        created_by: user.id,
      },
      {
        name: "Demo: Jeddah Mall Renovation",
        description: "Commercial renovation project - QA demo data",
        status: "in_progress",
        project_type: "industrial",
        current_phase: "design_costing",
        contract_value: 850000,
        created_by: user.id,
      },
    ];
    const { error: projErr } = await supabase.from("projects").insert(projectData);
    results.push(projErr ? `Projects: Error - ${projErr.message}` : "Projects: 2 created");

    // 4. Create 1 Deal (if table exists)
    const { error: dealErr } = await supabase.from("deals" as any).insert({
      title: "Demo: Steel Import Deal",
      status: "open",
      total_value: 450000,
      currency: "SAR",
      created_by: user.id,
    } as any);
    results.push(dealErr ? `Deal: ${dealErr.message}` : "Deal: 1 created");

    // 5. Create 1 Shipment (if table exists)
    const { error: shipErr } = await supabase.from("shipments" as any).insert({
      origin_country: "China",
      destination_country: "Saudi Arabia",
      status: "in_transit",
      shipping_mode: "ocean",
      estimated_arrival: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      created_by: user.id,
    } as any);
    results.push(shipErr ? `Shipment: ${shipErr.message}` : "Shipment: 1 created");

    // 6. Bank statement sample (if table exists)
    const { error: bankErr } = await supabase.from("bank_statement_lines" as any).insert([
      { description: "DEMO: Customer payment - Acme Construction", amount: 125000, credit: 125000, value_date: new Date().toISOString().split("T")[0], reference: "TRF-DEMO-001" },
      { description: "DEMO: Vendor payment - Steel Supply", amount: -45000, debit: 45000, value_date: new Date().toISOString().split("T")[0], reference: "TRF-DEMO-002" },
    ] as any);
    results.push(bankErr ? `Bank: ${bankErr.message}` : "Bank statements: 2 lines created");

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
