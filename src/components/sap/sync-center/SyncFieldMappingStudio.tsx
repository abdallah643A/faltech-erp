import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFieldMappings, useFieldMappingActions } from '@/hooks/useSyncEnhanced';
import { Loader2, Plus, Trash2, Save, ArrowLeftRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ENTITIES = ['business_partner','item','sales_order','ar_invoice','incoming_payment','purchase_order','journal_entry','ap_invoice_payable','chart_of_accounts','activity','opportunity','quote','goods_receipt','delivery_note'];
const DIRECTIONS = [
  { value: 'pull', label: 'Pull (SAP→ERP)', icon: ArrowLeft },
  { value: 'push', label: 'Push (ERP→SAP)', icon: ArrowRight },
  { value: 'both', label: 'Bidirectional', icon: ArrowLeftRight },
];
const TRANSFORM_RULES = ['direct','lookup','format_date','enum_map','default','formula','uppercase','lowercase','trim'];

export function SyncFieldMappingStudio() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [entityFilter, setEntityFilter] = useState('business_partner');
  const [directionFilter, setDirectionFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editMapping, setEditMapping] = useState<any>(null);

  const { data: mappings = [], isLoading } = useFieldMappings(entityFilter || undefined, directionFilter || undefined);
  const { createMapping, updateMapping, deleteMapping } = useFieldMappingActions();

  const [form, setForm] = useState({
    entity_name: entityFilter,
    direction: 'pull',
    sap_field_name: '',
    erp_field_name: '',
    sap_table: '',
    transformation_rule: 'direct',
    transformation_config: null as any,
    default_value: '',
    is_required: false,
    is_key_field: false,
    is_udf: false,
    is_active: true,
    sort_order: 0,
    notes: '',
  });

  const resetForm = () => {
    setForm({ entity_name: entityFilter, direction: 'pull', sap_field_name: '', erp_field_name: '', sap_table: '', transformation_rule: 'direct', transformation_config: null, default_value: '', is_required: false, is_key_field: false, is_udf: false, is_active: true, sort_order: 0, notes: '' });
  };

  const handleCreate = () => {
    createMapping.mutate(form);
    setShowCreate(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editMapping) return;
    updateMapping.mutate({ id: editMapping.id, ...form });
    setEditMapping(null);
    resetForm();
  };

  const openEdit = (m: any) => {
    setEditMapping(m);
    setForm({ ...m, transformation_config: m.transformation_config || null });
  };

  const MappingForm = ({ onSave, isPending }: { onSave: () => void; isPending: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Entity</Label>
          <Select value={form.entity_name} onValueChange={v => setForm({...form, entity_name: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Direction</Label>
          <Select value={form.direction} onValueChange={v => setForm({...form, direction: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>SAP Field Name</Label>
          <Input value={form.sap_field_name} onChange={e => setForm({...form, sap_field_name: e.target.value})} placeholder="CardCode" />
        </div>
        <div className="space-y-1">
          <Label>ERP Field Name</Label>
          <Input value={form.erp_field_name} onChange={e => setForm({...form, erp_field_name: e.target.value})} placeholder="card_code" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>SAP Table</Label>
          <Input value={form.sap_table || ''} onChange={e => setForm({...form, sap_table: e.target.value})} placeholder="OCRD" />
        </div>
        <div className="space-y-1">
          <Label>Transformation</Label>
          <Select value={form.transformation_rule} onValueChange={v => setForm({...form, transformation_rule: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TRANSFORM_RULES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Default Value</Label>
        <Input value={form.default_value || ''} onChange={e => setForm({...form, default_value: e.target.value})} placeholder="Optional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})} />
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Input value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2"><Switch checked={form.is_required} onCheckedChange={v => setForm({...form, is_required: v})} /><Label className="text-xs">Required</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_key_field} onCheckedChange={v => setForm({...form, is_key_field: v})} /><Label className="text-xs">Key Field</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_udf} onCheckedChange={v => setForm({...form, is_udf: v})} /><Label className="text-xs">UDF</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /><Label className="text-xs">Active</Label></div>
      </div>
      <Button onClick={onSave} disabled={isPending || !form.sap_field_name || !form.erp_field_name} className="w-full">
        <Save className="h-4 w-4 mr-2" /> {isAr ? 'حفظ' : 'Save Mapping'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Select Entity" /></SelectTrigger>
          <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={directionFilter || 'all'} onValueChange={v => setDirectionFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Directions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            {DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> {isAr ? 'إضافة' : 'Add Mapping'}</Button>
        <Badge variant="outline">{(mappings as any[]).length} mappings</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-right">#</th>
                    <th className="p-2 text-left">SAP Field</th>
                    <th className="p-2 text-center">Dir</th>
                    <th className="p-2 text-left">ERP Field</th>
                    <th className="p-2 text-left">Transform</th>
                    <th className="p-2 text-center">Key</th>
                    <th className="p-2 text-center">UDF</th>
                    <th className="p-2 text-center">Req</th>
                    <th className="p-2 text-center">Active</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(mappings as any[]).map((m: any) => {
                    const DirIcon = DIRECTIONS.find(d => d.value === m.direction)?.icon || ArrowRight;
                    return (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 text-right text-muted-foreground">{m.sort_order}</td>
                        <td className="p-2 font-mono text-xs">{m.sap_field_name}</td>
                        <td className="p-2 text-center"><DirIcon className="h-3.5 w-3.5 mx-auto text-muted-foreground" /></td>
                        <td className="p-2 font-mono text-xs">{m.erp_field_name}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{m.transformation_rule}</Badge></td>
                        <td className="p-2 text-center">{m.is_key_field ? '🔑' : '-'}</td>
                        <td className="p-2 text-center">{m.is_udf ? <Badge variant="secondary" className="text-[10px]">UDF</Badge> : '-'}</td>
                        <td className="p-2 text-center">{m.is_required ? '✓' : '-'}</td>
                        <td className="p-2 text-center"><Badge variant={m.is_active ? 'secondary' : 'outline'} className="text-[10px]">{m.is_active ? 'Yes' : 'No'}</Badge></td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(m)}>Edit</Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMapping.mutate(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(mappings as any[]).length === 0 && (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">{isAr ? 'لا توجد تعيينات' : 'No field mappings for this entity. Add mappings to configure sync behavior.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isAr ? 'إضافة تعيين حقل' : 'Add Field Mapping'}</DialogTitle></DialogHeader>
          <MappingForm onSave={handleCreate} isPending={createMapping.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!editMapping} onOpenChange={() => setEditMapping(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{isAr ? 'تعديل التعيين' : 'Edit Mapping'}</SheetTitle></SheetHeader>
          <div className="mt-4">
            <MappingForm onSave={handleUpdate} isPending={updateMapping.isPending} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
