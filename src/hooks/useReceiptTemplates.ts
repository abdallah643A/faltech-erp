import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useReceiptTemplates = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-receipt-templates", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_receipt_templates").select("*").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useCreateReceiptTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: any) => {
      const { data, error } = await supabase.from("pos_receipt_templates").insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-receipt-templates"] }); toast.success("Template created"); },
  });
};

export const useUpdateReceiptTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("pos_receipt_templates").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-receipt-templates"] }); toast.success("Template updated"); },
  });
};

export const useDeleteReceiptTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_receipt_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-receipt-templates"] }); toast.success("Template deleted"); },
  });
};
