import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InsuranceApproval {
  id: string;
  encounter_id: string;
  patient_id: string;
  payer: string;
  policy_no: string | null;
  approval_no: string | null;
  requested_amount: number | null;
  approved_amount: number | null;
  status: string;
  stage: string;
  priority: string;
  service_category: string | null;
  diagnosis_codes: string[] | null;
  procedure_codes: string[] | null;
  expected_service_date: string | null;
  assigned_to: string | null;
  sla_due_at: string | null;
  expires_at: string | null;
  appeal_count: number;
  rejection_reason: string | null;
  requested_at: string;
  responded_at: string | null;
  notes: string | null;
}

export interface InsuranceHistory {
  id: string;
  approval_id: string;
  from_status: string | null;
  to_status: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  comments: string | null;
  approved_amount: number | null;
  rejection_reason: string | null;
  created_at: string;
}

export const STAGE_FLOW = [
  'draft',
  'submitted',
  'insurer_review',
  'medical_review',
  'pending',
  'approved',
] as const;

export const TERMINAL_STAGES = ['approved', 'partial', 'rejected', 'expired', 'cancelled'];

export function nextAllowed(current: string): string[] {
  switch (current) {
    case 'draft': return ['submitted', 'cancelled'];
    case 'submitted': return ['insurer_review', 'rejected', 'cancelled'];
    case 'insurer_review': return ['medical_review', 'approved', 'partial', 'rejected', 'pending'];
    case 'medical_review': return ['approved', 'partial', 'rejected', 'pending'];
    case 'pending': return ['approved', 'partial', 'rejected', 'expired'];
    case 'rejected':
    case 'partial': return ['appealed'];
    case 'appealed': return ['approved', 'partial', 'rejected'];
    case 'requested': return ['submitted', 'insurer_review', 'approved', 'partial', 'rejected', 'cancelled'];
    default: return [];
  }
}

export const useInsuranceHistory = (approvalId?: string) =>
  useQuery({
    queryKey: ['hosp-insurance-history', approvalId],
    enabled: !!approvalId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hosp_insurance_approval_history')
        .select('*')
        .eq('approval_id', approvalId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InsuranceHistory[];
    },
  });

export const useAdvanceInsuranceStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      to_status: string;
      comments?: string;
      approved_amount?: number;
      approval_no?: string;
      rejection_reason?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('hosp_insurance_advance_stage', {
        p_approval_id: payload.id,
        p_to_status: payload.to_status,
        p_comments: payload.comments ?? null,
        p_approved_amount: payload.approved_amount ?? null,
        p_approval_no: payload.approval_no ?? null,
        p_rejection_reason: payload.rejection_reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['hosp-insurance'] });
      qc.invalidateQueries({ queryKey: ['hosp-insurance-history', vars.id] });
      toast.success(`Moved to ${vars.to_status.replace(/_/g, ' ')}`);
    },
    onError: (e: any) => toast.error(e.message || 'Transition failed'),
  });
};
