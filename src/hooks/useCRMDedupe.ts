import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDedupeCandidates = (status: string = "pending") => {
  return useQuery({
    queryKey: ["crm-dedupe", status],
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_dedupe_candidates" as any) as any)
        .select("*")
        .eq("status", status)
        .order("score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useScanForDuplicates = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { min_score?: number; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("crm-dedupe-scan", { body: params ?? {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["crm-dedupe"] });
      toast.success(`Scan complete: ${d?.inserted ?? 0} new candidates`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDecideDuplicate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, masterId, dupId, notes }: {
      id: string; decision: "merged" | "dismissed" | "kept_both";
      masterId?: string; dupId?: string; notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: e1 } = await (supabase.from("crm_dedupe_candidates" as any) as any)
        .update({
          status: decision,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          decision_notes: notes ?? null,
        })
        .eq("id", id);
      if (e1) throw e1;
      if (decision === "merged" && masterId && dupId) {
        const { error: e2 } = await supabase
          .from("business_partners")
          .update({ merged_into_partner_id: masterId, status: "merged" })
          .eq("id", dupId);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-dedupe"] });
      toast.success("Decision recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
