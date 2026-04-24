import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSubscriptionPlans = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-subscription-plans", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_subscription_plans").select("*").order("sort_order");
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useMemberships = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-memberships", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_memberships").select("*, pos_subscription_plans(*)").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useMembershipTransactions = (membershipId?: string) => {
  return useQuery({
    queryKey: ["pos-membership-transactions", membershipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_membership_transactions").select("*").eq("membership_id", membershipId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!membershipId,
  });
};

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: any) => {
      const { data, error } = await supabase.from("pos_subscription_plans").insert(plan).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-subscription-plans"] }); toast.success("Plan created"); },
  });
};

export const useCreateMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: any) => {
      const { data, error } = await supabase.from("pos_memberships").insert(m).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-memberships"] }); toast.success("Membership created"); },
  });
};

export const useUpdateMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("pos_memberships").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-memberships"] }); toast.success("Membership updated"); },
  });
};

export const useRecordMembershipTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: any) => {
      const { data, error } = await supabase.from("pos_membership_transactions").insert(tx).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-membership-transactions"] }); toast.success("Transaction recorded"); },
  });
};
