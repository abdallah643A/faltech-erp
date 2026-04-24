import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SAPDatabaseConnection {
  id: string;
  name: string;
  name_ar?: string | null;
  service_layer_url: string;
  company_db: string;
  username: string;
  password: string;
  is_active: boolean;
  is_primary: boolean;
  last_sync_at?: string | null;
  last_sync_error?: string | null;
  created_at?: string;
}

export interface ExternalItem {
  id: string;
  database_connection_id: string;
  item_code: string;
  item_name?: string | null;
  item_name_ar?: string | null;
  warehouse_code?: string | null;
  warehouse_name?: string | null;
  available_qty: number;
  on_hand_qty: number;
  committed_qty: number;
  unit_price: number;
  currency: string;
  last_synced_at?: string | null;
}

export interface ExternalReservation {
  id: string;
  ar_invoice_id?: string | null;
  database_connection_id: string;
  sap_draft_doc_entry?: string | null;
  sap_draft_doc_num?: number | null;
  status: string;
  error_message?: string | null;
  created_at?: string;
}

export function useExternalSAPDatabase() {
  const [connections, setConnections] = useState<SAPDatabaseConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sap_database_connections')
        .select('*')
        .order('name');
      if (error) throw error;
      setConnections((data || []) as SAPDatabaseConnection[]);
    } catch (err: any) {
      toast({ title: 'Error loading connections', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async (conn: Partial<SAPDatabaseConnection>) => {
    try {
      const payload = {
        name: conn.name!,
        name_ar: conn.name_ar || null,
        service_layer_url: conn.service_layer_url!,
        company_db: conn.company_db!,
        username: conn.username!,
        password: conn.password!,
        is_active: conn.is_active ?? true,
        is_primary: conn.is_primary ?? false,
      };

      let error;
      if (conn.id) {
        ({ error } = await supabase.from('sap_database_connections').update(payload).eq('id', conn.id));
      } else {
        ({ error } = await supabase.from('sap_database_connections').insert(payload));
      }
      if (error) throw error;
      toast({ title: 'Connection saved', description: `${conn.name} saved successfully` });
      fetchConnections();
      return true;
    } catch (err: any) {
      toast({ title: 'Error saving connection', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      const { error } = await supabase.from('sap_database_connections').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Connection deleted' });
      fetchConnections();
    } catch (err: any) {
      toast({ title: 'Error deleting connection', description: err.message, variant: 'destructive' });
    }
  };

  const testConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('external-sap', {
        body: { action: 'test_connection', connectionId },
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: 'Connection successful', description: data.message });
        return true;
      } else {
        toast({ title: 'Connection failed', description: data.error, variant: 'destructive' });
        return false;
      }
    } catch (err: any) {
      toast({ title: 'Connection error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const syncItems = async (connectionId: string, warehouse?: string, limit?: number): Promise<number> => {
    try {
      toast({ title: 'Syncing items...', description: 'Fetching available quantities from external database' });
      const { data, error } = await supabase.functions.invoke('external-sap', {
        body: { action: 'sync_items', connectionId, warehouse, limit: limit || 500 },
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: 'Sync complete', description: `Synced ${data.synced} item-warehouse combinations` });
        return data.synced;
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
      return 0;
    }
  };

  const getExternalItems = async (connectionId: string, search?: string, includeZeroStock?: boolean): Promise<ExternalItem[]> => {
    try {
      let query = supabase
        .from('external_items')
        .select('*')
        .eq('database_connection_id', connectionId)
        .order('available_qty', { ascending: false })
        .order('item_code');

      if (!includeZeroStock) {
        query = query.gt('available_qty', 0);
      }

      if (search) {
        query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as ExternalItem[];
    } catch (err: any) {
      console.error('Error fetching external items:', err);
      return [];
    }
  };

  const verifyAndCreateDraft = async (
    connectionId: string,
    invoiceData: any,
    lines: Array<{ item_code: string; quantity: number; unit_price: number; discount_percent?: number; warehouse?: string }>
  ): Promise<{ success: boolean; docEntry?: number; docNum?: number; error?: string; verifyResults?: any[] }> => {
    try {
      const { data, error } = await supabase.functions.invoke('external-sap', {
        body: { action: 'create_draft', connectionId, invoiceData, lines },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const saveReservation = async (reservation: {
    ar_invoice_id?: string;
    database_connection_id: string;
    sap_draft_doc_entry?: string;
    sap_draft_doc_num?: number;
    status: string;
    lines: Array<{ item_code: string; item_name?: string; warehouse_code?: string; quantity: number; unit_price: number; line_total: number }>;
  }) => {
    try {
      const { data: resData, error: resError } = await supabase
        .from('external_invoice_reservations')
        .insert({
          ar_invoice_id: reservation.ar_invoice_id || null,
          database_connection_id: reservation.database_connection_id,
          sap_draft_doc_entry: reservation.sap_draft_doc_entry || null,
          sap_draft_doc_num: reservation.sap_draft_doc_num || null,
          status: reservation.status,
          reserved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (resError) throw resError;

      // Save reservation lines
      if (reservation.lines.length > 0) {
        const linesData = reservation.lines.map((l, i) => ({
          reservation_id: resData.id,
          line_num: i + 1,
          item_code: l.item_code,
          item_name: l.item_name || null,
          warehouse_code: l.warehouse_code || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.line_total,
        }));
        await supabase.from('external_reservation_lines').insert(linesData);
      }

      return resData as ExternalReservation;
    } catch (err: any) {
      console.error('Error saving reservation:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return {
    connections,
    loading,
    fetchConnections,
    saveConnection,
    deleteConnection,
    testConnection,
    syncItems,
    getExternalItems,
    verifyAndCreateDraft,
    saveReservation,
  };
}
