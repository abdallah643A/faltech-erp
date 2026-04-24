import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Save, Search, Download, Eye, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface FieldDef {
  id: string;
  technical_name: string;
  display_label: string;
  field_type: string;
  is_required: boolean;
  is_read_only: boolean;
  default_value: string | null;
  dropdown_options: any;
  section_name: string | null;
  sort_order: number;
  visible_in_form: boolean;
  visible_in_grid: boolean;
}

interface ScreenBuilderRendererProps {
  entityId?: string;
  entityName?: string;
  tableName?: string;
}

export function ScreenBuilderRenderer({ entityId, entityName, tableName }: ScreenBuilderRendererProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Fetch entity metadata
  const { data: entity } = useQuery({
    queryKey: ['screen-entity', entityId],
    queryFn: async () => {
      if (!entityId) return null;
      const { data } = await supabase.from('metadata_entities').select('*').eq('id', entityId).single();
      return data;
    },
    enabled: !!entityId,
  });

  // Fetch fields for this entity
  const { data: fields = [] } = useQuery({
    queryKey: ['screen-fields', entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data } = await supabase.from('metadata_fields').select('*').eq('entity_id', entityId).eq('is_active', true).order('sort_order');
      return (data || []) as FieldDef[];
    },
    enabled: !!entityId,
  });

  const resolvedTable = tableName || entity?.technical_name;

  // Fetch records from the custom table
  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['screen-records', resolvedTable, page, search],
    queryFn: async () => {
      if (!resolvedTable) return [];
      let q = supabase.from(resolvedTable as any).select('*', { count: 'exact' }).range(page * pageSize, (page + 1) * pageSize - 1).order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) { console.error('Record fetch error:', error); return []; }
      return data || [];
    },
    enabled: !!resolvedTable,
  });

  const formFields = useMemo(() => fields.filter(f => f.visible_in_form), [fields]);
  const gridFields = useMemo(() => fields.filter(f => f.visible_in_grid), [fields]);
  const sections = useMemo(() => {
    const secs: Record<string, FieldDef[]> = {};
    formFields.forEach(f => {
      const sec = f.section_name || 'General';
      if (!secs[sec]) secs[sec] = [];
      secs[sec].push(f);
    });
    return secs;
  }, [formFields]);

  const initFormData = useCallback((record?: any) => {
    const data: Record<string, any> = {};
    formFields.forEach(f => {
      data[f.technical_name] = record?.[f.technical_name] ?? f.default_value ?? '';
    });
    setFormData(data);
  }, [formFields]);

  const handleCreate = () => { initFormData(); setMode('create'); setSelectedRecordId(null); };
  const handleEdit = (record: any) => { initFormData(record); setMode('edit'); setSelectedRecordId(record.id); };
  const handleView = (record: any) => { initFormData(record); setMode('view'); setSelectedRecordId(record.id); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedTable) throw new Error('No table');
      const payload: Record<string, any> = {};
      formFields.forEach(f => {
        let val = formData[f.technical_name];
        if (f.field_type === 'integer') val = val ? parseInt(val) : null;
        else if (f.field_type === 'decimal' || f.field_type === 'currency' || f.field_type === 'percent') val = val ? parseFloat(val) : null;
        else if (f.field_type === 'boolean') val = !!val;
        else if (val === '') val = null;
        payload[f.technical_name] = val;
      });

      if (mode === 'create') {
        const { error } = await supabase.from(resolvedTable as any).insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(resolvedTable as any).update(payload as any).eq('id', selectedRecordId!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Record created' : 'Record updated');
      queryClient.invalidateQueries({ queryKey: ['screen-records', resolvedTable] });
      setMode('list');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!resolvedTable) throw new Error('No table');
      const { error } = await supabase.from(resolvedTable as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['screen-records', resolvedTable] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const renderField = (field: FieldDef) => {
    const val = formData[field.technical_name] ?? '';
    const readOnly = mode === 'view' || field.is_read_only;
    const onChange = (v: any) => setFormData(prev => ({ ...prev, [field.technical_name]: v }));

    switch (field.field_type) {
      case 'long_text':
        return <Textarea value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} rows={3} />;
      case 'boolean':
        return <Switch checked={!!val} onCheckedChange={onChange} disabled={readOnly} />;
      case 'dropdown':
      case 'multi_select': {
        const opts = Array.isArray(field.dropdown_options) ? field.dropdown_options : [];
        return (
          <Select value={val?.toString()} onValueChange={onChange} disabled={readOnly}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {opts.map((o: any) => <SelectItem key={o.value || o} value={o.value || o}>{o.label || o}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      case 'date':
        return <Input type="date" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'datetime':
        return <Input type="datetime-local" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'time':
        return <Input type="time" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'integer':
        return <Input type="number" step="1" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'decimal':
      case 'currency':
      case 'percent':
        return <Input type="number" step="0.01" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'email':
        return <Input type="email" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'url':
        return <Input type="url" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      case 'phone':
        return <Input type="tel" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
      default:
        return <Input type="text" value={val} onChange={e => onChange(e.target.value)} disabled={readOnly} />;
    }
  };

  // LIST VIEW
  if (mode === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{entityName || entity?.display_name || resolvedTable}</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-56" />
            </div>
            <Button size="sm" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />New</Button>
          </div>
        </div>

        <Card>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {gridFields.slice(0, 8).map(f => (
                    <TableHead key={f.id} className="text-xs">{f.display_label}</TableHead>
                  ))}
                  <TableHead className="w-24 text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecords ? (
                  <TableRow><TableCell colSpan={gridFields.length + 1} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={gridFields.length + 1} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                ) : records.map((rec: any) => (
                  <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(rec)}>
                    {gridFields.slice(0, 8).map(f => (
                      <TableCell key={f.id} className="text-xs">
                        {f.field_type === 'boolean' ? (rec[f.technical_name] ? '✓' : '—') :
                         f.field_type === 'currency' ? `${Number(rec[f.technical_name] || 0).toLocaleString()}` :
                         String(rec[f.technical_name] ?? '—')}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleEdit(rec); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteMutation.mutate(rec.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={records.length < pageSize} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // FORM VIEW (Create / Edit / View)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? 'New' : mode === 'edit' ? 'Edit' : 'View'} {entityName || entity?.display_name}
          </h2>
          <Badge variant={mode === 'create' ? 'default' : mode === 'edit' ? 'secondary' : 'outline'}>{mode}</Badge>
        </div>
        {mode !== 'view' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMode('list')}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        )}
        {mode === 'view' && (
          <Button size="sm" onClick={() => setMode('edit')}><Edit className="h-4 w-4 mr-1" />Edit</Button>
        )}
      </div>

      {Object.entries(sections).map(([secName, secFields]) => (
        <Card key={secName}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{secName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {secFields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {field.display_label}
                    {field.is_required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
