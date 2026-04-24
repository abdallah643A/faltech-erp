import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSalesTargets = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-sales-targets", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_sales_targets").select("*").order("period_start", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useSalesTargetProgress = (targetId?: string) => {
  return useQuery({
    queryKey: ["pos-sales-target-progress", targetId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_sales_target_progress").select("*").eq("target_id", targetId!).order("progress_date");
      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });
};

export const useCreateSalesTarget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: any) => {
      const { data, error } = await supabase.from("pos_sales_targets").insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-sales-targets"] }); toast.success("Target created"); },
  });
};

export const useUpdateSalesTarget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("pos_sales_targets").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-sales-targets"] }); toast.success("Target updated"); },
  });
};

export const useRecordProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await supabase.from("pos_sales_target_progress").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-sales-target-progress"] }); toast.success("Progress recorded"); },
  });
};
