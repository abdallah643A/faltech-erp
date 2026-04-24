import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInventoryReservations = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-inventory-reservations", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_inventory_reservations").select("*").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: any) => {
      const { data, error } = await supabase.from("pos_inventory_reservations").insert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-inventory-reservations"] }); toast.success("Reservation created"); },
  });
};

export const useUpdateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("pos_inventory_reservations").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-inventory-reservations"] }); toast.success("Reservation updated"); },
  });
};

export const useReleaseReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase.from("pos_inventory_reservations").update({ status: "released", released_at: new Date().toISOString(), released_reason: reason }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-inventory-reservations"] }); toast.success("Reservation released"); },
  });
};

export const useConvertToSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, saleDocId }: { id: string; saleDocId: string }) => {
      const { data, error } = await supabase.from("pos_inventory_reservations").update({ status: "converted", converted_to_sale: true, sale_doc_id: saleDocId }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-inventory-reservations"] }); toast.success("Converted to sale"); },
  });
};
