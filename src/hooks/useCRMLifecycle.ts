import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CRMSegment = {
  id: string;
  segment_code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  color: string | null;
  criteria: any;
  is_dynamic: boolean | null;
  is_active: boolean | null;
  member_count: number | null;
  last_refreshed_at: string | null;
  created_at: string;
};

export type CRMTimelineEvent = {
  id: string;
  business_partner_id: string | null;
  event_type: string;
  event_category: string;
  source_module: string;
  reference_id: string | null;
  reference_doc: string | null;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  occurred_at: string;
  performed_by_name: string | null;
  metadata: any;
};

export type CRMTemplate = {
  id: string;
  template_code: string;
  template_name: string;
  channel: "email" | "whatsapp" | "sms" | "in_app";
  category: string;
  language: "en" | "ar" | "ur" | "hi";
  subject: string | null;
  body: string;
  variables: any;
  is_active: boolean | null;
  is_default: boolean | null;
  region: string | null;
  created_at: string;
  updated_at: string;
};

export type CRMRiskSignal = {
  id: string;
  opportunity_id: string | null;
  signal_type: string;
  severity: "low" | "medium" | "high" | "critical";
  signal_label: string;
  signal_description: string | null;
  weight: number;
  detected_at: string;
  resolved_at: string | null;
  is_active: boolean | null;
  metadata: any;
};

export const useCRMSegments = () =>
  useQuery({
    queryKey: ["crm-segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_segments")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as CRMSegment[];
    },
  });

export const useUpsertSegment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CRMSegment> & { segment_code: string; name: string }) => {
      const { data, error } = await supabase
        .from("crm_segments")
        .upsert(payload as any, { onConflict: "company_id,segment_code" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-segments"] });
      toast.success("Segment saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useCustomerTimeline = (businessPartnerId?: string) =>
  useQuery({
    queryKey: ["crm-timeline", businessPartnerId],
    enabled: !!businessPartnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_customer_timeline")
        .select("*")
        .eq("business_partner_id", businessPartnerId!)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as CRMTimelineEvent[];
    },
  });

export const useCRMTemplates = (filters?: { channel?: string; language?: string }) =>
  useQuery({
    queryKey: ["crm-templates", filters],
    queryFn: async () => {
      let q = supabase.from("crm_message_templates").select("*").order("template_name");
      if (filters?.channel) q = q.eq("channel", filters.channel);
      if (filters?.language) q = q.eq("language", filters.language);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CRMTemplate[];
    },
  });

export const useUpsertTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("crm_message_templates")
        .upsert(payload as any, { onConflict: "company_id,template_code,language" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-templates"] });
      toast.success("Template saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDealRiskSignals = (opportunityId?: string) =>
  useQuery({
    queryKey: ["crm-risk-signals", opportunityId],
    enabled: !!opportunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_risk_signals")
        .select("*")
        .eq("opportunity_id", opportunityId!)
        .eq("is_active", true)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CRMRiskSignal[];
    },
  });

export const useComputeDealRisk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opportunityId: string) => {
      const { data, error } = await supabase.functions.invoke("crm-compute-deal-risk", {
        body: { opportunityId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, opportunityId) => {
      qc.invalidateQueries({ queryKey: ["crm-risk-signals", opportunityId] });
      toast.success("Deal risk recomputed");
    },
    onError: (e: any) => toast.error(e.message),
  });
};
