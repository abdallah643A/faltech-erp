import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, Layers, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';

const MODULES = ['sales', 'procurement', 'hr', 'finance', 'crm', 'construction', 'inventory', 'service'];
const FIELD_TYPES = ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'email', 'phone', 'url', 'currency'];

export default function DynamicFormBuilder() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDef, setSelectedDef] = useState<any>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', module: 'sales', document_type: '', description: '' });
  const [fieldData, setFieldData] = useState({ field_name: '', field_label: '', field_type: 'text', section: 'General', is_required: false, placeholder: '', help_text: '' });

  const { data: definitions = [] } = useQuery({
    queryKey: ['custom-form-definitions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('custom_form_definitions' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['custom-form-fields', selectedDef?.id],
    queryFn: async () => {
      if (!selectedDef) return [];
      const { data, error } = await (supabase.from('custom_form_fields' as any).select('*').eq('form_definition_id', selectedDef.id).order('sort_order') as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDef,
  });

  const createDef = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('custom_form_definitions' as any).insert({ ...formData, company_id: activeCompanyId, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-form-definitions'] }); setShowCreate(false); toast({ title: 'Form definition created' }); },
  });

  const addField = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('custom_form_fields' as any).insert({ ...fieldData, form_definition_id: selectedDef.id, sort_order: fields.length }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-form-fields'] }); setShowFieldDialog(false); setFieldData({ field_name: '', field_label: '', field_type: 'text', section: 'General', is_required: false, placeholder: '', help_text: '' }); toast({ title: 'Field added' }); },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('custom_form_fields' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-form-fields'] }); },
  });

  const toggleActive = useMutation({
    mutationFn: async (def: any) => {
      const { error } = await (supabase.from('custom_form_definitions' as any).update({ is_active: !def.is_active }).eq('id', def.id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-form-definitions'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dynamic Form Builder</h1>
          <p className="text-muted-foreground">Add custom fields, sections, and validations to any ERP document</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Form Definition</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Form Definition</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Module</Label>
                <Select value={formData.module} onValueChange={v => setFormData(p => ({ ...p, module: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Document Type</Label><Input value={formData.document_type} onChange={e => setFormData(p => ({ ...p, document_type: e.target.value }))} placeholder="e.g., sales_order, purchase_order" /></div>
              <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={() => createDef.mutate()} disabled={!formData.name || !formData.document_type}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Total Definitions', value: definitions.length, color: 'text-primary' },
          { label: 'Active', value: definitions.filter((d: any) => d.is_active).length, color: 'text-green-600' },
          { label: 'Modules Covered', value: new Set(definitions.map((d: any) => d.module)).size, color: 'text-blue-600' },
          { label: 'Total Fields', value: '—', color: 'text-orange-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" />Form Definitions</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {definitions.map((def: any) => (
              <div key={def.id} onClick={() => setSelectedDef(def)} className={`p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${selectedDef?.id === def.id ? 'bg-accent border-primary' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{def.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant={def.is_active ? 'default' : 'secondary'} className="text-[10px]">{def.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); toggleActive.mutate(def); }}>
                      {def.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{def.module} → {def.document_type}</div>
              </div>
            ))}
            {definitions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No form definitions yet</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" />Fields {selectedDef && `— ${selectedDef.name}`}</CardTitle>
              {selectedDef && (
                <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Add Field</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Custom Field</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Field Name (key)</Label><Input value={fieldData.field_name} onChange={e => setFieldData(p => ({ ...p, field_name: e.target.value.toLowerCase().replace(/\s/g, '_') }))} placeholder="e.g., custom_ref" /></div>
                        <div><Label>Display Label</Label><Input value={fieldData.field_label} onChange={e => setFieldData(p => ({ ...p, field_label: e.target.value }))} placeholder="e.g., Custom Reference" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Field Type</Label>
                          <Select value={fieldData.field_type} onValueChange={v => setFieldData(p => ({ ...p, field_type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{FIELD_TYPES.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>Section</Label><Input value={fieldData.section} onChange={e => setFieldData(p => ({ ...p, section: e.target.value }))} /></div>
                      </div>
                      <div><Label>Placeholder</Label><Input value={fieldData.placeholder} onChange={e => setFieldData(p => ({ ...p, placeholder: e.target.value }))} /></div>
                      <div><Label>Help Text</Label><Input value={fieldData.help_text} onChange={e => setFieldData(p => ({ ...p, help_text: e.target.value }))} /></div>
                      <div className="flex items-center gap-2"><Switch checked={fieldData.is_required} onCheckedChange={v => setFieldData(p => ({ ...p, is_required: v }))} /><Label>Required</Label></div>
                      <Button onClick={() => addField.mutate()} disabled={!fieldData.field_name || !fieldData.field_label}>Add Field</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDef ? (
              <p className="text-muted-foreground text-center py-8">Select a form definition to manage fields</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-8"></TableHead><TableHead>Field</TableHead><TableHead>Type</TableHead><TableHead>Section</TableHead><TableHead>Required</TableHead><TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {fields.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell><GripVertical className="h-3 w-3 text-muted-foreground" /></TableCell>
                      <TableCell><div className="font-medium text-sm">{f.field_label}</div><div className="text-xs text-muted-foreground">{f.field_name}</div></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{f.field_type}</Badge></TableCell>
                      <TableCell className="text-sm">{f.section}</TableCell>
                      <TableCell>{f.is_required ? <Badge variant="destructive" className="text-[10px]">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteField.mutate(f.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {fields.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No fields defined yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
