import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

/**
 * Sales Visits — Module 2 / Enhancement #4
 *
 * Field-rep activity tracking with GPS check-in/out, daily call reports,
 * outcomes, and follow-ups. Backed by `sales_visits` table.
 */

export interface SalesVisit {
  id: string;
  company_id: string | null;
  branch_id: string | null;
  rep_user_id: string;
  rep_name: string | null;
  business_partner_id: string | null;
  customer_code: string | null;
  customer_name: string | null;
  contact_name: string | null;
  visit_purpose: string;
  visit_date: string;
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy: number | null;
  check_in_address: string | null;
  check_out_at: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  duration_minutes: number | null;
  outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  related_opportunity_id: string | null;
  related_lead_id: string | null;
  related_quotation_id: string | null;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface VisitListFilters {
  /** ISO date (YYYY-MM-DD) — visits on this exact date */
  date?: string;
  /** ISO date range (inclusive) */
  from?: string;
  to?: string;
  status?: SalesVisit['status'] | 'all';
  /** Restrict to a specific rep. Omit to use RLS-scoped default. */
  repUserId?: string;
  businessPartnerId?: string;
}

export function useSalesVisits(filters: VisitListFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-visits', filters],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase as any).from('sales_visits').select('*');
      if (filters.date) q = q.eq('visit_date', filters.date);
      if (filters.from) q = q.gte('visit_date', filters.from);
      if (filters.to) q = q.lte('visit_date', filters.to);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.repUserId) q = q.eq('rep_user_id', filters.repUserId);
      if (filters.businessPartnerId) q = q.eq('business_partner_id', filters.businessPartnerId);
      q = q.order('visit_date', { ascending: false }).order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SalesVisit[];
    },
  });
}

export interface CreateVisitInput {
  business_partner_id?: string | null;
  customer_code?: string | null;
  customer_name: string;
  contact_name?: string | null;
  visit_purpose: string;
  visit_date: string;
  notes?: string | null;
  related_opportunity_id?: string | null;
}

/** Best-effort browser geolocation. Resolves null on denial / failure. */
export function getCurrentPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

export function useSalesVisitMutations() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const c = supabase as any;

  const create = useMutation({
    mutationFn: async (input: CreateVisitInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await c.from('sales_visits').insert({
        ...input,
        rep_user_id: user.id,
        rep_name: user.user_metadata?.full_name ?? user.email ?? null,
        company_id: activeCompanyId ?? null,
        status: 'Planned',
        created_by: user.id,
      }).select().single();
      if (error) throw error;
      return data as SalesVisit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-visits'] });
      toast.success('Visit planned');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not create visit'),
  });

  const checkIn = useMutation({
    mutationFn: async (visitId: string) => {
      const pos = await getCurrentPosition();
      const payload: Record<string, any> = {
        check_in_at: new Date().toISOString(),
      };
      if (pos) {
        payload.check_in_lat = pos.coords.latitude;
        payload.check_in_lng = pos.coords.longitude;
        payload.check_in_accuracy = pos.coords.accuracy;
      }
      const { error } = await c.from('sales_visits').update(payload).eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-visits'] });
      toast.success('Checked in');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Check-in failed'),
  });

  const checkOut = useMutation({
    mutationFn: async (input: { visitId: string; outcome?: string; notes?: string; nextAction?: string; nextActionDate?: string }) => {
      const pos = await getCurrentPosition();
      const payload: Record<string, any> = {
        check_out_at: new Date().toISOString(),
      };
      if (pos) {
        payload.check_out_lat = pos.coords.latitude;
        payload.check_out_lng = pos.coords.longitude;
      }
      if (input.outcome !== undefined) payload.outcome = input.outcome;
      if (input.notes !== undefined) payload.notes = input.notes;
      if (input.nextAction !== undefined) payload.next_action = input.nextAction;
      if (input.nextActionDate !== undefined) payload.next_action_date = input.nextActionDate;
      const { error } = await c.from('sales_visits').update(payload).eq('id', input.visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-visits'] });
      toast.success('Checked out');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Check-out failed'),
  });

  const cancel = useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await c.from('sales_visits').update({ status: 'Cancelled' }).eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-visits'] });
      toast.success('Visit cancelled');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not cancel'),
  });

  return { create, checkIn, checkOut, cancel };
}

/** Quick KPIs for a rep's daily call report. */
export function summarizeVisits(visits: SalesVisit[]) {
  return {
    total: visits.length,
    completed: visits.filter(v => v.status === 'Completed').length,
    inProgress: visits.filter(v => v.status === 'In Progress').length,
    planned: visits.filter(v => v.status === 'Planned').length,
    cancelled: visits.filter(v => v.status === 'Cancelled').length,
    totalMinutes: visits.reduce((s, v) => s + (v.duration_minutes ?? 0), 0),
  };
}
