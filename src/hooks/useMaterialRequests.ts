import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface MaterialRequestLine {
  id?: string;
  material_request_id?: string;
  line_num: number;
  part_no: string;
  description: string;
  unit_of_measurement: string;
  quantity: number;
  remark: string;
}

export interface MaterialRequest {
  id: string;
  mr_number: string;
  request_date: string;
  project_name: string | null;
  sector: string | null;
  department: string | null;
  delivery_location: string | null;
  store_availability: string | null;
  spec: string | null;
  due_out_date: string | null;
  attachment_url: string | null;
  sole_source_adjustment: string | null;
  reference: string | null;
  category: string | null;
  status: string;
  requested_by_id: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  requested_by_position: string | null;
  requested_at: string | null;
  reviewed_by_id: string | null;
  reviewed_by_name: string | null;
  reviewed_by_email: string | null;
  reviewed_by_position: string | null;
  reviewed_at: string | null;
  approved_by_1_id: string | null;
  approved_by_1_name: string | null;
  approved_by_1_email: string | null;
  approved_by_1_position: string | null;
  approved_at_1: string | null;
  approved_by_2_id: string | null;
  approved_by_2_name: string | null;
  approved_by_2_email: string | null;
  approved_by_2_position: string | null;
  approved_at_2: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: MaterialRequestLine[];
}

export function useMaterialRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: materialRequests, isLoading, error } = useQuery({
    queryKey: ['material-requests', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('material_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialRequest[];
    },
  });

  const createMaterialRequest = useMutation({
    mutationFn: async (data: { 
      request: Partial<MaterialRequest>; 
      lines: MaterialRequestLine[] 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate MR number using timestamp
      const mrNumber = `MR-${Date.now().toString().slice(-8)}`;

      // Insert material request
      const { data: mrData, error: mrError } = await supabase
        .from('material_requests')
        .insert([{
          ...data.request,
          mr_number: mrNumber,
          created_by: user?.id,
          request_date: data.request.request_date || new Date().toISOString().split('T')[0],
          due_out_date: data.request.due_out_date || null,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        }])
        .select()
        .single();

      if (mrError) throw mrError;

      // Insert lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines
          .filter(line => line.part_no || line.description)
          .map((line, idx) => ({
            material_request_id: mrData.id,
            line_num: idx + 1,
            part_no: line.part_no || null,
            description: line.description || null,
            unit_of_measurement: line.unit_of_measurement || null,
            quantity: line.quantity || 0,
            remark: line.remark || null,
          }));

        if (linesToInsert.length > 0) {
          const { error: linesError } = await supabase
            .from('material_request_lines')
            .insert(linesToInsert);

          if (linesError) throw linesError;
        }
      }

      return mrData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Material Request created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating Material Request', description: error.message, variant: 'destructive' });
    },
  });

  const updateMaterialRequest = useMutation({
    mutationFn: async (data: { 
      id: string;
      request: Partial<MaterialRequest>; 
      lines: MaterialRequestLine[] 
    }) => {
      // Update material request
      const { error: mrError } = await supabase
        .from('material_requests')
        .update({
          ...data.request,
          due_out_date: data.request.due_out_date || null,
        })
        .eq('id', data.id);

      if (mrError) throw mrError;

      // Delete existing lines and re-insert
      await supabase
        .from('material_request_lines')
        .delete()
        .eq('material_request_id', data.id);

      // Insert new lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines
          .filter(line => line.part_no || line.description)
          .map((line, idx) => ({
            material_request_id: data.id,
            line_num: idx + 1,
            part_no: line.part_no || null,
            description: line.description || null,
            unit_of_measurement: line.unit_of_measurement || null,
            quantity: line.quantity || 0,
            remark: line.remark || null,
          }));

        if (linesToInsert.length > 0) {
          const { error: linesError } = await supabase
            .from('material_request_lines')
            .insert(linesToInsert);

          if (linesError) throw linesError;
        }
      }

      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Material Request updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating Material Request', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMaterialRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Material Request deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting Material Request', description: error.message, variant: 'destructive' });
    },
  });

  return {
    materialRequests,
    isLoading,
    error,
    createMaterialRequest,
    updateMaterialRequest,
    deleteMaterialRequest,
  };
}

export function useMaterialRequestLines(materialRequestId: string | undefined) {
  const { data: lines, isLoading } = useQuery({
    queryKey: ['material-request-lines', materialRequestId],
    queryFn: async () => {
      if (!materialRequestId) return [];
      const { data, error } = await supabase
        .from('material_request_lines')
        .select('*')
        .eq('material_request_id', materialRequestId)
        .order('line_num');

      if (error) throw error;
      return data as MaterialRequestLine[];
    },
    enabled: !!materialRequestId,
  });

  return { lines, isLoading };
}
