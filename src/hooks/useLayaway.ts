import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useLayawayOrders = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-layaway-orders", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_layaway_orders").select("*").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useLayawayPayments = (layawayId?: string) => {
  return useQuery({
    queryKey: ["pos-layaway-payments", layawayId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_layaway_payments").select("*").eq("layaway_id", layawayId!).order("payment_number");
      if (error) throw error;
      return data;
    },
    enabled: !!layawayId,
  });
};

export const useCreateLayaway = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await supabase.from("pos_layaway_orders").insert(order).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-layaway-orders"] }); toast.success("Layaway order created"); },
  });
};

export const useUpdateLayaway = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("pos_layaway_orders").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-layaway-orders"] }); toast.success("Layaway updated"); },
  });
};

export const useRecordLayawayPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: { layaway_id: string; amount: number; payment_method?: string; reference?: string }) => {
      const { data, error } = await (supabase.rpc as any)('pos_post_layaway_payment', {
        p_layaway_id: payment.layaway_id,
        p_amount: payment.amount,
        p_payment_method: payment.payment_method ?? 'cash',
        p_reference: payment.reference ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-layaway-payments"] }); qc.invalidateQueries({ queryKey: ["pos-layaway-orders"] }); toast.success("Payment recorded"); },
  });
};
