import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CRMLead {
  id: string;
  lead_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  channel: string;
  source: string | null;
  status: string;
  score: number;
  grade: string | null;
  assigned_to: string | null;
  sla_first_response_due: string | null;
  sla_breached: boolean | null;
  created_at: string;
}

export const useCRMLeads = (filters?: { status?: string; channel?: string }) =>
  useQuery({
    queryKey: ["crm-leads", filters],
    queryFn: async () => {
      let q = (supabase.from("crm_leads" as any) as any)
        .select("*").order("created_at", { ascending: false }).limit(500);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.channel) q = q.eq("channel", filters.channel);
      const { data, error } = await q;
      if (error) throw error;
      return data as CRMLead[];
    },
  });

export const useCRMLead = (id?: string) =>
  useQuery({
    queryKey: ["crm-lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_leads" as any) as any)
        .select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as CRMLead;
    },
  });

export const useCRMLeadActivities = (leadId?: string) =>
  useQuery({
    queryKey: ["crm-lead-activities", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_lead_activities" as any) as any)
        .select("*").eq("lead_id", leadId).order("occurred_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: any) => {
      const { data, error } = await supabase.functions.invoke("crm-capture-lead", {
        body: { ...lead, channel: lead.channel ?? "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Lead captured");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useScoreLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead_id: string) => {
      const { data, error } = await supabase.functions.invoke("crm-score-lead", { body: { lead_id } });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, lead_id) => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      qc.invalidateQueries({ queryKey: ["crm-lead", lead_id] });
      toast.success("Lead scored");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useAssignLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead_id: string) => {
      const { data, error } = await supabase.functions.invoke("crm-assign-lead", { body: { lead_id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Routed via SLA rules");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// SLA rules
export const useSLARules = () =>
  useQuery({
    queryKey: ["crm-sla-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_sla_rules" as any) as any)
        .select("*").order("priority", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

export const useUpsertSLARule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { data, error } = await (supabase.from("crm_sla_rules" as any) as any)
        .upsert(rule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-sla-rules"] });
      toast.success("SLA rule saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Partner referrals
export const usePartnerReferrals = () =>
  useQuery({
    queryKey: ["crm-partner-referrals"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_partner_referrals" as any) as any)
        .select("*, opportunities(name, value), crm_leads(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

export const useUpsertPartnerReferral = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: any) => {
      const { data, error } = await (supabase.from("crm_partner_referrals" as any) as any)
        .upsert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-partner-referrals"] });
      toast.success("Referral saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// NBA
export const useNextBestActions = (entity_type?: string, entity_id?: string) =>
  useQuery({
    queryKey: ["crm-nba", entity_type, entity_id],
    queryFn: async () => {
      let q = (supabase.from("crm_next_best_actions" as any) as any)
        .select("*").eq("status", "open").order("priority", { ascending: false }).limit(100);
      if (entity_type) q = q.eq("entity_type", entity_type);
      if (entity_id) q = q.eq("entity_id", entity_id);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

export const useGenerateNBA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { entity_type: "lead" | "opportunity"; entity_id: string }) => {
      const { data, error } = await supabase.functions.invoke("crm-generate-nba", { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["crm-nba"] });
      qc.invalidateQueries({ queryKey: ["crm-nba", p.entity_type, p.entity_id] });
      toast.success("Next best actions generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCompleteNBA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "done" | "dismissed" | "snoozed" }) => {
      const { error } = await (supabase.from("crm_next_best_actions" as any) as any)
        .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-nba"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
