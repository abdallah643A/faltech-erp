import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface AssetCategory {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
}

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category_id: string | null;
  serial_number: string | null;
  barcode: string | null;
  status: string;
  condition: string | null;
  purchase_date: string | null;
  vendor: string | null;
  purchase_value: number | null;
  current_value: number | null;
  depreciation_method: string | null;
  depreciation_rate: number | null;
  warranty_start: string | null;
  warranty_end: string | null;
  location: string | null;
  department: string | null;
  assigned_to_employee_id: string | null;
  assigned_to_user_id: string | null;
  assigned_to_project_id: string | null;
  branch_id: string | null;
  purchase_request_id: string | null;
  notes: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  asset_categories?: AssetCategory | null;
  employees?: { id: string; first_name: string; last_name: string } | null;
}

export interface AssetPurchaseRequest {
  id: string;
  request_code: string;
  title: string;
  description: string | null;
  requester_id: string | null;
  requester_name: string | null;
  department: string | null;
  category_id: string | null;
  quantity: number;
  estimated_cost: number;
  priority: string;
  justification: string | null;
  status: string;
  manager_name: string | null;
  manager_status: string | null;
  manager_date: string | null;
  head_manager_name: string | null;
  head_manager_status: string | null;
  head_manager_date: string | null;
  it_manager_name: string | null;
  it_manager_status: string | null;
  it_manager_date: string | null;
  finance_manager_name: string | null;
  finance_manager_status: string | null;
  finance_manager_date: string | null;
  created_at: string;
  asset_categories?: AssetCategory | null;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  assigned_to_employee_id: string | null;
  assigned_to_user_name: string | null;
  assigned_to_department: string | null;
  assignment_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  condition_at_assignment: string | null;
  condition_at_return: string | null;
  handover_notes: string | null;
  status: string;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
  employees?: { first_name: string; last_name: string } | null;
}

export interface AssetTransfer {
  id: string;
  transfer_code: string;
  asset_id: string;
  from_user_name: string | null;
  from_department: string | null;
  from_location: string | null;
  to_user_name: string | null;
  to_department: string | null;
  to_location: string | null;
  reason: string | null;
  condition_before: string | null;
  status: string;
  transfer_date: string | null;
  notes: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface AssetMaintenance {
  id: string;
  maintenance_code: string;
  asset_id: string;
  maintenance_type: string;
  issue_description: string | null;
  priority: string;
  vendor_service_provider: string | null;
  cost: number;
  service_date: string | null;
  completion_date: string | null;
  downtime_hours: number;
  warranty_covered: boolean;
  status: string;
  reported_by_name: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface AssetHistoryRecord {
  id: string;
  asset_id: string;
  event_type: string;
  description: string | null;
  old_value: any;
  new_value: any;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
}

export interface AssetDisposal {
  id: string;
  asset_id: string;
  disposal_type: string;
  disposal_reason: string | null;
  disposal_date: string;
  residual_value: number;
  approved_by_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export function useAssets() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['asset-categories', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_categories').select('*').eq('is_active', true).order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as AssetCategory[];
    },
  });

  // Assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('assets').select('*, asset_categories(*), employees!assets_assigned_to_employee_id_fkey(id, first_name, last_name)').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Asset[];
    },
  });

  // Purchase Requests
  const { data: purchaseRequests = [], isLoading: prsLoading } = useQuery({
    queryKey: ['asset-purchase-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_purchase_requests')
        .select('*, asset_categories(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssetPurchaseRequest[];
    },
  });

  // Assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['asset-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select('*, assets(asset_code, name), employees!asset_assignments_assigned_to_employee_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssetAssignment[];
    },
  });

  // Transfers
  const { data: transfers = [] } = useQuery({
    queryKey: ['asset-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_transfers')
        .select('*, assets(asset_code, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssetTransfer[];
    },
  });

  // Maintenance
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['asset-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_maintenance')
        .select('*, assets(asset_code, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssetMaintenance[];
    },
  });

  // Disposals
  const { data: disposals = [] } = useQuery({
    queryKey: ['asset-disposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_disposals')
        .select('*, assets(asset_code, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssetDisposal[];
    },
  });

  // History for a specific asset
  const useAssetHistory = (assetId: string | null) => {
    return useQuery({
      queryKey: ['asset-history', assetId],
      queryFn: async () => {
        if (!assetId) return [];
        const { data, error } = await supabase
          .from('asset_history')
          .select('*')
          .eq('asset_id', assetId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as AssetHistoryRecord[];
      },
      enabled: !!assetId,
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['asset-purchase-requests'] });
    queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['asset-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['asset-disposals'] });
  };

  // Create Asset
  const createAsset = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const code = 'AST-' + String(Math.floor(Date.now() / 1000)).slice(-6);
      const insertData = { ...data, asset_code: code, created_by: user?.id || null };
      const { error } = await supabase.from('assets').insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Update Asset
  const updateAsset = useMutation({
    mutationFn: async ({ id, ...data }: Record<string, any>) => {
      const { error } = await supabase.from('assets').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Delete Asset
  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Create Purchase Request
  const createPurchaseRequest = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const code = 'APR-' + String(Math.floor(Date.now() / 1000)).slice(-6);
      const insertData = { ...data, request_code: code, requester_id: user?.id || null, requester_name: profile?.full_name || null, created_by: user?.id || null };
      const { error } = await supabase.from('asset_purchase_requests').insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Approve Purchase Request step
  const approvePurchaseRequest = useMutation({
    mutationFn: async ({ id, level, notes }: { id: string; level: string; notes?: string }) => {
      const now = new Date().toISOString();
      const updateData: Record<string, any> = {};
      const approverName = profile?.full_name || 'System';

      if (level === 'manager') {
        updateData.manager_status = 'approved';
        updateData.manager_date = now;
        updateData.manager_id = user?.id;
        updateData.manager_name = approverName;
        updateData.manager_notes = notes || null;
        updateData.status = 'pending_head_manager';
      } else if (level === 'head_manager') {
        updateData.head_manager_status = 'approved';
        updateData.head_manager_date = now;
        updateData.head_manager_id = user?.id;
        updateData.head_manager_name = approverName;
        updateData.head_manager_notes = notes || null;
        updateData.status = 'pending_it_manager';
      } else if (level === 'it_manager') {
        updateData.it_manager_status = 'approved';
        updateData.it_manager_date = now;
        updateData.it_manager_id = user?.id;
        updateData.it_manager_name = approverName;
        updateData.it_manager_notes = notes || null;
        updateData.status = 'pending_finance_manager';
      } else if (level === 'finance_manager') {
        updateData.finance_manager_status = 'approved';
        updateData.finance_manager_date = now;
        updateData.finance_manager_id = user?.id;
        updateData.finance_manager_name = approverName;
        updateData.finance_manager_notes = notes || null;
        updateData.status = 'approved';
      }

      const { error } = await supabase.from('asset_purchase_requests').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Reject Purchase Request
  const rejectPurchaseRequest = useMutation({
    mutationFn: async ({ id, level, notes }: { id: string; level: string; notes?: string }) => {
      const now = new Date().toISOString();
      const updateData: Record<string, any> = { status: 'rejected' };
      const approverName = profile?.full_name || 'System';

      updateData[`${level}_status`] = 'rejected';
      updateData[`${level}_date`] = now;
      updateData[`${level}_id`] = user?.id;
      updateData[`${level}_name`] = approverName;
      updateData[`${level}_notes`] = notes || null;

      const { error } = await supabase.from('asset_purchase_requests').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Create Assignment
  const createAssignment = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = { ...data, created_by: user?.id || null };
      const { error: assignError } = await supabase.from('asset_assignments').insert(insertData as any);
      if (assignError) throw assignError;

      // Update asset status
      const { error: updateError } = await supabase.from('assets').update({
        status: 'assigned',
        assigned_to_employee_id: data.assigned_to_employee_id || null,
        assigned_to_user_id: data.assigned_to_user_id || null,
        department: data.assigned_to_department || null,
      }).eq('id', data.asset_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => invalidateAll(),
  });

  // Return Assignment
  const returnAssignment = useMutation({
    mutationFn: async ({ id, asset_id, condition }: { id: string; asset_id: string; condition?: string }) => {
      const { error: assignError } = await supabase.from('asset_assignments').update({
        status: 'returned',
        actual_return_date: new Date().toISOString().split('T')[0],
        condition_at_return: condition || 'good',
      }).eq('id', id);
      if (assignError) throw assignError;

      const { error: updateError } = await supabase.from('assets').update({
        status: 'available',
        assigned_to_employee_id: null,
        assigned_to_user_id: null,
        condition: condition || 'good',
      }).eq('id', asset_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => invalidateAll(),
  });

  // Create Transfer
  const createTransfer = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const code = 'TRF-' + String(Math.floor(Date.now() / 1000)).slice(-6);
      const insertData = { ...data, transfer_code: code, created_by: user?.id || null };
      const { error } = await supabase.from('asset_transfers').insert(insertData as any);
      if (error) throw error;

      // Update asset status
      await supabase.from('assets').update({ status: 'in_transfer' }).eq('id', data.asset_id);
    },
    onSuccess: () => invalidateAll(),
  });

  // Complete Transfer
  const completeTransfer = useMutation({
    mutationFn: async ({ id, asset_id, to_location, to_department }: Record<string, any>) => {
      const { error } = await supabase.from('asset_transfers').update({
        status: 'completed',
        transfer_date: new Date().toISOString().split('T')[0],
      }).eq('id', id);
      if (error) throw error;

      await supabase.from('assets').update({
        status: 'available',
        location: to_location || null,
        department: to_department || null,
      }).eq('id', asset_id);
    },
    onSuccess: () => invalidateAll(),
  });

  // Create Maintenance
  const createMaintenance = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const code = 'MNT-' + String(Math.floor(Date.now() / 1000)).slice(-6);
      const insertData = { ...data, maintenance_code: code, reported_by: user?.id || null, reported_by_name: profile?.full_name || null, created_by: user?.id || null };
      const { error } = await supabase.from('asset_maintenance').insert(insertData as any);
      if (error) throw error;

      // Update asset status
      await supabase.from('assets').update({ status: 'under_maintenance' }).eq('id', data.asset_id);
    },
    onSuccess: () => invalidateAll(),
  });

  // Complete Maintenance
  const completeMaintenance = useMutation({
    mutationFn: async ({ id, asset_id, cost }: { id: string; asset_id: string; cost?: number }) => {
      const { error } = await supabase.from('asset_maintenance').update({
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0],
        cost: cost || 0,
      }).eq('id', id);
      if (error) throw error;

      await supabase.from('assets').update({ status: 'available' }).eq('id', asset_id);
    },
    onSuccess: () => invalidateAll(),
  });

  // Create Disposal
  const createDisposal = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = { ...data, created_by: user?.id || null };
      const { error } = await supabase.from('asset_disposals').insert(insertData as any);
      if (error) throw error;

      await supabase.from('assets').update({ status: 'disposed' }).eq('id', data.asset_id);
    },
    onSuccess: () => invalidateAll(),
  });

  return {
    categories,
    assets,
    assetsLoading,
    purchaseRequests,
    prsLoading,
    assignments,
    transfers,
    maintenanceRecords,
    disposals,
    useAssetHistory,
    createAsset,
    updateAsset,
    deleteAsset,
    createPurchaseRequest,
    approvePurchaseRequest,
    rejectPurchaseRequest,
    createAssignment,
    returnAssignment,
    createTransfer,
    completeTransfer,
    createMaintenance,
    completeMaintenance,
    createDisposal,
  };
}
