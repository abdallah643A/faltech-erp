import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCashierPermissions = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-cashier-permissions", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_cashier_permissions").select("*").order("role_name");
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const usePermissionOverrides = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-permission-overrides", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_permission_overrides").select("*, pos_cashier_permissions(role_name)").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useCreatePermissionRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: any) => {
      const { data, error } = await supabase.from("pos_cashier_permissions").insert(role).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-cashier-permissions"] }); toast.success("Permission role created"); },
  });
};

export const useUpdatePermissionRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("pos_cashier_permissions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-cashier-permissions"] }); toast.success("Permission role updated"); },
  });
};

export const useCreateOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (override: any) => {
      const { data, error } = await supabase.from("pos_permission_overrides").insert(override).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-permission-overrides"] }); toast.success("Override created"); },
  });
};
