import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RetentionPolicy {
  id: string;
  policy_name: string;
  document_type: string | null;
  folder_id: string | null;
  retention_years: number;
  action_on_expiry: string;
  legal_hold_default: boolean;
  is_active: boolean;
}

export interface EligibleDoc {
  id: string;
  title: string;
  file_name: string;
  document_type: string;
  retention_until: string;
  days_overdue: number;
  policy_name: string | null;
  action_on_expiry: string | null;
}

export function useRetentionPolicies() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const policies = useQuery({
    queryKey: ["ecm-retention-policies"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_retention_policies" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as RetentionPolicy[];
    },
  });

  const upsertPolicy = useMutation({
    mutationFn: async (p: Partial<RetentionPolicy> & { policy_name: string; retention_years: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...p, created_by: user?.id ?? null };
      const { error } = p.id
        ? await (supabase.from("ecm_retention_policies" as any).update(payload).eq("id", p.id) as any)
        : await (supabase.from("ecm_retention_policies" as any).insert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-retention-policies"] });
      toast({ title: "Policy saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return { policies, upsertPolicy };
}

export function useRetentionEligibleDocs() {
  return useQuery({
    queryKey: ["ecm-retention-eligible"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("v_ecm_retention_eligible" as any)
        .select("*")
        .order("days_overdue", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as EligibleDoc[];
    },
  });
}

export function useToggleLegalHold() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { documentId: string; hold: boolean; reason?: string }) => {
      const { error } = await supabase
        .from("ecm_documents")
        .update({
          legal_hold: params.hold,
          legal_hold_reason: params.hold ? params.reason ?? null : null,
        })
        .eq("id", params.documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-retention-eligible"] });
      toast({ title: "Legal hold updated" });
    },
  });
}
