import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SQLServerConnection {
  id: string;
  name: string;
  name_ar?: string | null;
  connection_type: string;
  sql_host: string;
  sql_port: number;
  sql_database: string;
  username: string;
  password: string;
  sql_encrypt: boolean;
  sql_trust_cert: boolean;
  is_active: boolean;
  last_sync_at?: string | null;
  last_sync_error?: string | null;
  created_at?: string;
}

export interface SQLQueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowCount?: number;
  error?: string;
}

export function useSQLServerConnections() {
  const { toast } = useToast();

  const { data: connections = [], isLoading, refetch } = useQuery({
    queryKey: ['sql-server-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sap_database_connections' as any)
        .select('*')
        .eq('connection_type', 'sql_server')
        .order('name') as any;
      if (error) throw error;
      return (data || []) as SQLServerConnection[];
    },
  });

  const saveConnection = async (conn: Partial<SQLServerConnection>): Promise<boolean> => {
    try {
      const payload = {
        name: conn.name!,
        name_ar: conn.name_ar || null,
        connection_type: 'sql_server',
        service_layer_url: '', // Not used for SQL Server
        company_db: conn.sql_database || '',
        sql_host: conn.sql_host!,
        sql_port: conn.sql_port || 1433,
        sql_database: conn.sql_database!,
        username: conn.username!,
        password: conn.password!,
        sql_encrypt: conn.sql_encrypt ?? true,
        sql_trust_cert: conn.sql_trust_cert ?? false,
        is_active: conn.is_active ?? true,
        is_primary: false,
      };

      let error;
      if (conn.id) {
        ({ error } = await (supabase.from('sap_database_connections' as any).update(payload).eq('id', conn.id) as any));
      } else {
        ({ error } = await (supabase.from('sap_database_connections' as any).insert(payload) as any));
      }
      if (error) throw error;
      toast({ title: 'Connection saved' });
      refetch();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      const { error } = await (supabase.from('sap_database_connections' as any).delete().eq('id', id) as any);
      if (error) throw error;
      toast({ title: 'Connection deleted' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const testConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('sql-server-proxy', {
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

  return { connections, isLoading, saveConnection, deleteConnection, testConnection, refetch };
}

export function useSQLServerQuery(connectionId: string | null) {
  const { toast } = useToast();

  const executeQuery = useCallback(async (query: string, params?: Record<string, any>): Promise<SQLQueryResult> => {
    if (!connectionId) return { success: false, error: 'No connection selected' };
    
    try {
      const { data, error } = await supabase.functions.invoke('sql-server-proxy', {
        body: { action: 'query', connectionId, query, params },
      });
      if (error) throw error;
      return data as SQLQueryResult;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [connectionId]);

  const fetchTables = useCallback(async () => {
    if (!connectionId) return [];
    try {
      const { data, error } = await supabase.functions.invoke('sql-server-proxy', {
        body: { action: 'tables', connectionId },
      });
      if (error) throw error;
      return data.tables || [];
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return [];
    }
  }, [connectionId]);

  const fetchColumns = useCallback(async (tableName: string, schemaName?: string) => {
    if (!connectionId) return [];
    try {
      const { data, error } = await supabase.functions.invoke('sql-server-proxy', {
        body: { action: 'columns', connectionId, tableName, schemaName },
      });
      if (error) throw error;
      return data.columns || [];
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return [];
    }
  }, [connectionId]);

  // Pre-built SAP B1 queries
  const fetchSAPCustomers = useCallback(async () => {
    if (!connectionId) return [];
    const { data } = await supabase.functions.invoke('sql-server-proxy', {
      body: { action: 'sap_customers', connectionId },
    });
    return data?.data || [];
  }, [connectionId]);

  const fetchSAPItems = useCallback(async () => {
    if (!connectionId) return [];
    const { data } = await supabase.functions.invoke('sql-server-proxy', {
      body: { action: 'sap_items', connectionId },
    });
    return data?.data || [];
  }, [connectionId]);

  const fetchSAPInvoices = useCallback(async (dateFrom?: string, dateTo?: string) => {
    if (!connectionId) return [];
    const { data } = await supabase.functions.invoke('sql-server-proxy', {
      body: { action: 'sap_invoices', connectionId, dateFrom, dateTo },
    });
    return data?.data || [];
  }, [connectionId]);

  return { executeQuery, fetchTables, fetchColumns, fetchSAPCustomers, fetchSAPItems, fetchSAPInvoices };
}
