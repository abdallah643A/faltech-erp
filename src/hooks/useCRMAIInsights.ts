import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InsightType = "next_best_action" | "churn_risk";

export interface CRMAIInsight {
  id: string;
  business_partner_id: string;
  insight_type: InsightType;
  recommendation: string | null;
  rationale: string | null;
  confidence: number | null;
  risk_score: number | null;
  risk_band: "low" | "medium" | "high" | "critical" | null;
  model_used: string | null;
  generated_at: string;
  expires_at: string;
}

export const useCRMAIInsights = (
  businessPartnerId?: string,
  insightType?: InsightType,
) => {
  return useQuery({
    queryKey: ["crm-ai-insights", businessPartnerId, insightType],
    enabled: !!businessPartnerId && !!insightType,
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_ai_insights" as any) as any)
        .select("*")
        .eq("business_partner_id", businessPartnerId)
        .eq("insight_type", insightType)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CRMAIInsight | null;
    },
  });
};

export const useGenerateInsight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      business_partner_id: string;
      insight_type: InsightType;
      force_refresh?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("crm-ai-insights", {
        body: params,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).insight as CRMAIInsight;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["crm-ai-insights", vars.business_partner_id, vars.insight_type],
      });
      toast.success("AI insight generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
