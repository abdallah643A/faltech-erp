import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MetadataEntity {
  id: string;
  technical_name: string;
  display_name: string;
  plural_name: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  code_prefix: string | null;
  numbering_strategy: string | null;
  audit_enabled: boolean;
  soft_delete_enabled: boolean;
  attachments_enabled: boolean;
  workflow_ready: boolean;
  status: string;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetadataField {
  id: string;
  entity_id: string | null;
  base_table: string | null;
  technical_name: string;
  display_label: string;
  description: string | null;
  help_text: string | null;
  field_type: string;
  field_length: number | null;
  field_precision: number | null;
  field_scale: number | null;
  default_value: string | null;
  is_required: boolean;
  is_unique: boolean;
  is_indexed: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  visible_in_form: boolean;
  visible_in_grid: boolean;
  is_read_only: boolean;
  is_active: boolean;
  sort_order: number;
  section_name: string | null;
  tab_name: string | null;
  validation_rules: any;
  dropdown_options: any;
  lookup_config: any;
  is_primary_identifier: boolean;
  is_list_default: boolean;
  column_width: number | null;
  format_pattern: string | null;
  created_at: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  query_type: string;
  sql_text: string | null;
  visual_config: any;
  base_table: string | null;
  joins: any;
  selected_fields: any;
  filters: any;
  sort_config: any;
  group_by: any;
  aggregations: any;
  sharing: string;
  shared_roles: string[] | null;
  tags: string[] | null;
  is_favorite: boolean;
  row_limit: number | null;
  last_run_at: string | null;
  last_run_rows: number | null;
  last_run_ms: number | null;
  run_count: number;
  status: string;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  data_source_type: string;
  data_source_query_id: string | null;
  data_source_table: string | null;
  data_source_sql: string | null;
  page_size: string;
  page_orientation: string;
  margin_top: number | null;
  margin_bottom: number | null;
  margin_left: number | null;
  margin_right: number | null;
  header_config: any;
  footer_config: any;
  columns_config: any;
  grouping_config: any;
  totals_config: any;
  filters_config: any;
  conditional_formatting: any;
  sharing: string;
  shared_roles: string[] | null;
  tags: string[] | null;
  status: string;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueryFolder {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: 'type' },
  { value: 'long_text', label: 'Long Text', icon: 'align-left' },
  { value: 'integer', label: 'Integer', icon: 'hash' },
  { value: 'decimal', label: 'Decimal', icon: 'percent' },
  { value: 'currency', label: 'Currency', icon: 'dollar-sign' },
  { value: 'percentage', label: 'Percentage', icon: 'percent' },
  { value: 'boolean', label: 'Boolean', icon: 'toggle-left' },
  { value: 'date', label: 'Date', icon: 'calendar' },
  { value: 'datetime', label: 'Date & Time', icon: 'clock' },
  { value: 'time', label: 'Time', icon: 'clock' },
  { value: 'select', label: 'Dropdown', icon: 'chevron-down' },
  { value: 'multi_select', label: 'Multi-Select', icon: 'list' },
  { value: 'lookup', label: 'Lookup', icon: 'search' },
  { value: 'attachment', label: 'Attachment', icon: 'paperclip' },
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'phone', label: 'Phone', icon: 'phone' },
  { value: 'url', label: 'URL', icon: 'link' },
  { value: 'barcode', label: 'Barcode/QR', icon: 'scan-line' },
];
export { FIELD_TYPES };

// ─── Entities ───
export function useMetadataEntities() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['metadata-entities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('metadata_entities').select('*').order('display_name');
      if (error) throw error;
      return data as MetadataEntity[];
    },
  });

  const create = useMutation({
    mutationFn: async (e: Partial<MetadataEntity>) => {
      const { data, error } = await supabase.from('metadata_entities').insert({ ...e, created_by: user?.id, updated_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metadata-entities'] }); toast.success('Entity created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<MetadataEntity> & { id: string }) => {
      const { error } = await supabase.from('metadata_entities').update({ ...rest, updated_by: user?.id } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metadata-entities'] }); toast.success('Entity updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metadata_entities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metadata-entities'] }); toast.success('Entity deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  return { query, create, update, remove, entities: query.data || [] };
}

// ─── Fields ───
export function useMetadataFields(entityId?: string | null, baseTable?: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['metadata-fields', entityId, baseTable],
    queryFn: async () => {
      let q = supabase.from('metadata_fields').select('*').order('sort_order');
      if (entityId) q = q.eq('entity_id', entityId);
      if (baseTable) q = q.eq('base_table', baseTable);
      const { data, error } = await q;
      if (error) throw error;
      return data as MetadataField[];
    },
    enabled: !!(entityId || baseTable),
  });

  const create = useMutation({
    mutationFn: async (f: Partial<MetadataField>) => {
      const { data, error } = await supabase.from('metadata_fields').insert({ ...f, created_by: user?.id, updated_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metadata-fields'] }); toast.success('Field created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<MetadataField> & { id: string }) => {
      const { error } = await supabase.from('metadata_fields').update({ ...rest, updated_by: user?.id } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metadata-fields'] }); toast.success('Field updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metadata_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metadata-fields'] }); toast.success('Field deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  return { query, create, update, remove, fields: query.data || [] };
}

// ─── Saved Queries ───
export function useSavedQueries() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['saved-queries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('saved_queries').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data as SavedQuery[];
    },
  });

  const create = useMutation({
    mutationFn: async (q: Partial<SavedQuery>) => {
      const { data, error } = await supabase.from('saved_queries').insert({ ...q, created_by: user?.id, updated_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-queries'] }); toast.success('Query saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<SavedQuery> & { id: string }) => {
      const { error } = await supabase.from('saved_queries').update({ ...rest, updated_by: user?.id } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-queries'] }); toast.success('Query updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_queries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-queries'] }); toast.success('Query deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  return { query, create, update, remove, queries: query.data || [] };
}

// ─── Reports ───
export function useReportDefinitions() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['report-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('report_definitions').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ReportDefinition[];
    },
  });

  const create = useMutation({
    mutationFn: async (r: Partial<ReportDefinition>) => {
      const { data, error } = await supabase.from('report_definitions').insert({ ...r, created_by: user?.id, updated_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-definitions'] }); toast.success('Report saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<ReportDefinition> & { id: string }) => {
      const { error } = await supabase.from('report_definitions').update({ ...rest, updated_by: user?.id } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-definitions'] }); toast.success('Report updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('report_definitions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-definitions'] }); toast.success('Report deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  return { query, create, update, remove, reports: query.data || [] };
}

// ─── Query Folders ───
export function useQueryFolders() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['query-folders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('query_folders').select('*').order('sort_order');
      if (error) throw error;
      return data as QueryFolder[];
    },
  });

  const create = useMutation({
    mutationFn: async (f: Partial<QueryFolder>) => {
      const { data, error } = await supabase.from('query_folders').insert({ ...f, created_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['query-folders'] }); toast.success('Folder created'); },
    onError: (e: any) => toast.error(e.message),
  });

  return { query, create, folders: query.data || [] };
}
