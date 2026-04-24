import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ProjectPhase = 
  | 'sales_initiation'
  | 'finance_verification'
  | 'operations_verification'
  | 'design_costing'
  | 'finance_gate_2'
  | 'procurement'
  | 'production'
  | 'logistics'
  | 'final_payment'
  | 'completed';

export type PhaseStatus = 
  | 'pending'
  | 'in_progress'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'skipped';

export interface ProjectContract {
  id: string;
  project_id: string;
  contract_number: string | null;
  contract_date: string | null;
  signed_date: string | null;
  contract_value: number;
  currency: string;
  contract_file_url: string | null;
  contract_type: string | null;
  scope_of_work: string | null;
  terms_and_conditions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPaymentTerm {
  id: string;
  project_id: string;
  payment_number: number;
  description: string;
  percentage: number;
  amount: number;
  due_date: string | null;
  milestone_id: string | null;
  status: string;
  invoice_id: string | null;
  payment_id: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhaseRecord {
  id: string;
  project_id: string;
  phase: ProjectPhase;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  auto_progress: boolean;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  phase: ProjectPhase | null;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ProjectActivityLog {
  id: string;
  project_id: string;
  phase: ProjectPhase | null;
  action: string;
  description: string | null;
  old_value: any;
  new_value: any;
  performed_by: string | null;
  performed_at: string;
  performer?: { full_name: string | null; email: string };
}

export const PHASE_CONFIG: Record<ProjectPhase, { 
  label: string; 
  icon: string; 
  color: string;
  department: string;
}> = {
  sales_initiation: { label: 'Sales & CRM', icon: 'FileSignature', color: 'blue', department: 'Sales' },
  finance_verification: { label: 'Finance Gate 1 (50% Down)', icon: 'BadgeDollarSign', color: 'green', department: 'Finance' },
  operations_verification: { label: 'Technical Assessment', icon: 'ClipboardCheck', color: 'orange', department: 'Technical' },
  design_costing: { label: 'Design & Costing', icon: 'PenTool', color: 'indigo', department: 'Design' },
  finance_gate_2: { label: 'Finance Gate 2 (Variance)', icon: 'DollarSign', color: 'yellow', department: 'Finance' },
  procurement: { label: 'Procurement', icon: 'ShoppingCart', color: 'purple', department: 'Procurement' },
  production: { label: 'Manufacturing', icon: 'Factory', color: 'amber', department: 'Production' },
  final_payment: { label: 'Finance Gate 3 (Final 50%)', icon: 'CreditCard', color: 'emerald', department: 'Finance' },
  logistics: { label: 'Delivery & Installation', icon: 'Truck', color: 'cyan', department: 'Logistics' },
  completed: { label: 'Completed', icon: 'CheckCircle', color: 'green', department: 'All' },
};

export function useProjectPhases(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: phases, isLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (error) throw error;
      return data as ProjectPhaseRecord[];
    },
    enabled: !!projectId,
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectPhaseRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_phases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast({ title: 'Phase updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating phase', description: error.message, variant: 'destructive' });
    },
  });

  const approvePhase = useMutation({
    mutationFn: async ({ phaseId, notes }: { phaseId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('project_phases')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes,
        })
        .eq('id', phaseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast({ title: 'Phase approved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving phase', description: error.message, variant: 'destructive' });
    },
  });

  const rejectPhase = useMutation({
    mutationFn: async ({ phaseId, reason }: { phaseId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('project_phases')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', phaseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast({ title: 'Phase rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error rejecting phase', description: error.message, variant: 'destructive' });
    },
  });

  const moveToNextPhase = useMutation({
    mutationFn: async (currentPhaseId: string) => {
      const phaseOrder: ProjectPhase[] = [
        'sales_initiation',
        'finance_verification',
        'operations_verification',
        'design_costing',
        'finance_gate_2',
        'procurement',
        'production',
        'final_payment',
        'logistics',
        'completed',
      ];

      const currentPhase = phases?.find(p => p.id === currentPhaseId);
      if (!currentPhase) throw new Error('Phase not found');

      const currentIndex = phaseOrder.indexOf(currentPhase.phase);
      if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
        throw new Error('Cannot advance beyond final phase');
      }

      // Complete current phase
      await supabase
        .from('project_phases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentPhaseId);

      // Start next phase
      const nextPhase = phaseOrder[currentIndex + 1];
      const { data, error } = await supabase
        .from('project_phases')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('project_id', currentPhase.project_id)
        .eq('phase', nextPhase)
        .select()
        .single();

      if (error) throw error;

      // Update project current phase
      await supabase
        .from('projects')
        .update({ current_phase: nextPhase })
        .eq('id', currentPhase.project_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Moved to next phase' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error advancing phase', description: error.message, variant: 'destructive' });
    },
  });

  return { 
    phases, 
    isLoading, 
    updatePhase, 
    approvePhase, 
    rejectPhase,
    moveToNextPhase,
  };
}

export function useProjectContracts(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['project-contracts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectContract[];
    },
    enabled: !!projectId,
  });

  const createContract = useMutation({
    mutationFn: async (contract: Partial<ProjectContract> & { project_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('project_contracts')
        .insert([{
          project_id: contract.project_id,
          contract_number: contract.contract_number,
          contract_date: contract.contract_date,
          signed_date: contract.signed_date,
          contract_value: contract.contract_value,
          currency: contract.currency,
          contract_file_url: contract.contract_file_url,
          contract_type: contract.contract_type,
          scope_of_work: contract.scope_of_work,
          terms_and_conditions: contract.terms_and_conditions,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-contracts', projectId] });
      toast({ title: 'Contract created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating contract', description: error.message, variant: 'destructive' });
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectContract> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-contracts', projectId] });
      toast({ title: 'Contract updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating contract', description: error.message, variant: 'destructive' });
    },
  });

  return { contracts, isLoading, createContract, updateContract };
}

export function useProjectPaymentTerms(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentTerms, isLoading } = useQuery({
    queryKey: ['project-payment-terms', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_payment_terms')
        .select('*')
        .eq('project_id', projectId)
        .order('payment_number');

      if (error) throw error;
      return data as ProjectPaymentTerm[];
    },
    enabled: !!projectId,
  });

  const createPaymentTerm = useMutation({
    mutationFn: async (term: { 
      project_id: string; 
      payment_number: number; 
      description: string;
      percentage?: number;
      amount?: number;
      due_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('project_payment_terms')
        .insert([{
          project_id: term.project_id,
          payment_number: term.payment_number,
          description: term.description,
          percentage: term.percentage || 0,
          amount: term.amount || 0,
          due_date: term.due_date || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-payment-terms', projectId] });
      toast({ title: 'Payment term added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding payment term', description: error.message, variant: 'destructive' });
    },
  });

  const updatePaymentTerm = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectPaymentTerm> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_payment_terms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-payment-terms', projectId] });
      toast({ title: 'Payment term updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating payment term', description: error.message, variant: 'destructive' });
    },
  });

  const deletePaymentTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_payment_terms')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-payment-terms', projectId] });
      toast({ title: 'Payment term removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing payment term', description: error.message, variant: 'destructive' });
    },
  });

  return { paymentTerms, isLoading, createPaymentTerm, updatePaymentTerm, deletePaymentTerm };
}

export function useProjectDocuments(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectDocument[];
    },
    enabled: !!projectId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ 
      file, 
      projectId, 
      phase, 
      documentType 
    }: { 
      file: File; 
      projectId: string; 
      phase?: ProjectPhase; 
      documentType: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365); // 1 year

      // Create document record
      const { data, error } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId,
          phase,
          document_type: documentType,
          file_name: file.name,
          file_url: urlData?.signedUrl || fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({ title: 'Document uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error uploading document', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({ title: 'Document deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting document', description: error.message, variant: 'destructive' });
    },
  });

  return { documents, isLoading, uploadDocument, deleteDocument };
}

export function useProjectActivityLog(projectId: string | undefined) {
  const { data: activityLog, isLoading } = useQuery({
    queryKey: ['project-activity-log', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch performer details
      const performerIds = [...new Set(data.map(a => a.performed_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', performerIds);

      return data.map(log => ({
        ...log,
        performer: profiles?.find(p => p.user_id === log.performed_by),
      })) as ProjectActivityLog[];
    },
    enabled: !!projectId,
  });

  return { activityLog, isLoading };
}
