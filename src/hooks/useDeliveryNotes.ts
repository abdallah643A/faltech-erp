import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface DeliveryNoteLine {
  id?: string;
  delivery_note_id?: string;
  line_num: number;
  item_code: string;
  item_id?: string | null;
  description: string;
  quantity: number;
  delivered_quantity?: number;
  unit?: string | null;
  unit_price: number;
  discount_percent?: number;
  tax_code?: string | null;
  tax_percent?: number;
  line_total: number;
  warehouse?: string | null;
  base_doc_line_id?: string | null;
  base_doc_line_num?: number | null;
  dim_employee_id?: string | null;
  dim_branch_id?: string | null;
  dim_business_line_id?: string | null;
  dim_factory_id?: string | null;
  batch_number?: string | null;
  serial_number?: string | null;
  cost_center?: string | null;
}

export interface DeliveryNote {
  id: string;
  doc_num: number;
  doc_date: string;
  posting_date?: string | null;
  doc_due_date?: string | null;
  customer_code: string;
  customer_name: string;
  customer_id?: string | null;
  contact_person?: string | null;
  sales_employee_code?: number | null;
  sales_rep_id?: string | null;
  base_doc_type?: string | null;
  base_doc_id?: string | null;
  base_doc_num?: number | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  ship_to_code?: string | null;
  shipping_method?: string | null;
  tracking_number?: string | null;
  carrier_name?: string | null;
  pick_date?: string | null;
  ship_date?: string | null;
  currency?: string | null;
  doc_rate?: number | null;
  subtotal?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  total?: number | null;
  status: string;
  sap_doc_entry?: string | null;
  sync_status?: string | null;
  last_synced_at?: string | null;
  series?: number | null;
  remarks?: string | null;
  num_at_card?: string | null;
  branch_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  lines?: DeliveryNoteLine[];
}

export function useDeliveryNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: deliveryNotes = [], isLoading } = useQuery({
    queryKey: ['deliveryNotes', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('delivery_notes')
        .select('*')
        .order('doc_num', { ascending: false });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DeliveryNote[];
    },
  });

  const fetchLines = async (deliveryNoteId: string): Promise<DeliveryNoteLine[]> => {
    const { data, error } = await supabase
      .from('delivery_note_lines')
      .select('*')
      .eq('delivery_note_id', deliveryNoteId)
      .order('line_num');
    if (error) throw error;
    return data as DeliveryNoteLine[];
  };

  const createDeliveryNote = async (note: Partial<DeliveryNote>, lines: DeliveryNoteLine[]) => {
    const { data: user } = await supabase.auth.getUser();
    const { lines: _, ...noteData } = note as any;
    
    const { data, error } = await supabase
      .from('delivery_notes')
      .insert({ ...noteData, created_by: user.user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) })
      .select()
      .single();
    if (error) throw error;

    if (lines.length > 0) {
      const lineInserts = lines.map((line, i) => ({
        delivery_note_id: data.id,
        line_num: i + 1,
        item_code: line.item_code,
        item_id: line.item_id || null,
        description: line.description,
        quantity: line.quantity,
        delivered_quantity: line.delivered_quantity || 0,
        unit: line.unit || null,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent || 0,
        tax_code: line.tax_code || null,
        tax_percent: line.tax_percent || 0,
        line_total: line.line_total,
        warehouse: line.warehouse || null,
        base_doc_line_id: line.base_doc_line_id || null,
        base_doc_line_num: line.base_doc_line_num || null,
        dim_employee_id: line.dim_employee_id || null,
        dim_branch_id: line.dim_branch_id || null,
        dim_business_line_id: line.dim_business_line_id || null,
        dim_factory_id: line.dim_factory_id || null,
        batch_number: line.batch_number || null,
        serial_number: line.serial_number || null,
        cost_center: line.cost_center || null,
      }));
      const { error: lineError } = await supabase
        .from('delivery_note_lines')
        .insert(lineInserts);
      if (lineError) throw lineError;
    }

    queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
    toast({ title: 'Delivery Note Created', description: `DN-${data.doc_num} created successfully` });
    return data;
  };

  const updateDeliveryNote = async (id: string, note: Partial<DeliveryNote>, lines: DeliveryNoteLine[]) => {
    const { lines: _, ...noteData } = note as any;
    
    const { error } = await supabase
      .from('delivery_notes')
      .update(noteData)
      .eq('id', id);
    if (error) throw error;

    // Delete and reinsert lines
    await supabase.from('delivery_note_lines').delete().eq('delivery_note_id', id);

    if (lines.length > 0) {
      const lineInserts = lines.map((line, i) => ({
        delivery_note_id: id,
        line_num: i + 1,
        item_code: line.item_code,
        item_id: line.item_id || null,
        description: line.description,
        quantity: line.quantity,
        delivered_quantity: line.delivered_quantity || 0,
        unit: line.unit || null,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent || 0,
        tax_code: line.tax_code || null,
        tax_percent: line.tax_percent || 0,
        line_total: line.line_total,
        warehouse: line.warehouse || null,
        dim_employee_id: line.dim_employee_id || null,
        dim_branch_id: line.dim_branch_id || null,
        dim_business_line_id: line.dim_business_line_id || null,
        dim_factory_id: line.dim_factory_id || null,
      }));
      const { error: lineError } = await supabase
        .from('delivery_note_lines')
        .insert(lineInserts);
      if (lineError) throw lineError;
    }

    queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
    toast({ title: 'Delivery Note Updated' });
  };

  const deleteDeliveryNote = async (id: string) => {
    const { error } = await supabase
      .from('delivery_notes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
    toast({ title: 'Delivery Note Deleted' });
  };

  return {
    deliveryNotes,
    isLoading,
    fetchLines,
    createDeliveryNote,
    updateDeliveryNote,
    deleteDeliveryNote,
  };
}
