import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditSearchFilters {
  source?: string;
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
  text?: string;
  limit?: number;
}

export const useUnifiedAuditSearch = (f: AuditSearchFilters = {}) => {
  return useQuery({
    queryKey: ["unified-audit-search", f],
    queryFn: async () => {
      let q = (supabase.from("v_unified_audit_search" as any) as any)
        .select("*")
        .order("at", { ascending: false })
        .limit(f.limit ?? 200);
      if (f.source) q = q.eq("source", f.source);
      if (f.actor) q = q.ilike("actor", `%${f.actor}%`);
      if (f.action) q = q.ilike("action", `%${f.action}%`);
      if (f.from) q = q.gte("at", f.from);
      if (f.to) q = q.lte("at", f.to);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data as any[]) ?? [];
      if (f.text) {
        const t = f.text.toLowerCase();
        rows = rows.filter((r) => JSON.stringify(r.payload ?? {}).toLowerCase().includes(t));
      }
      return rows;
    },
  });
};
