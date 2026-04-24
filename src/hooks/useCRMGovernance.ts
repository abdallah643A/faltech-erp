import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useScoringRules = () => {
  return useQuery({
    queryKey: ["crm-scoring-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_scoring_rules" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useUpsertScoringRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...rule, created_by: rule.created_by ?? user?.id };
      const { data, error } = await (supabase.from("crm_scoring_rules" as any) as any)
        .upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-scoring-rules"] });
      toast.success("Rule saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useApproveScoringRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("crm_scoring_rules" as any) as any)
        .update({
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          is_active: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-scoring-rules"] });
      toast.success("Rule approved & activated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useSLAPolicies = () => {
  return useQuery({
    queryKey: ["crm-sla-policies"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_sla_policies" as any) as any)
        .select("*")
        .order("priority_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useUpsertSLAPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (policy: any) => {
      const { data, error } = await (supabase.from("crm_sla_policies" as any) as any)
        .upsert(policy).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-sla-policies"] });
      toast.success("SLA policy saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCaptureSources = () => {
  return useQuery({
    queryKey: ["crm-capture-sources"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_capture_sources" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useUpsertCaptureSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: any) => {
      const { data, error } = await (supabase.from("crm_capture_sources" as any) as any)
        .upsert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-capture-sources"] });
      toast.success("Source saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCaptureLog = (status?: string) => {
  return useQuery({
    queryKey: ["crm-capture-log", status],
    queryFn: async () => {
      let q = (supabase.from("crm_capture_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
};
