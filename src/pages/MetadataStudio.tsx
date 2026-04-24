import { useState } from 'react';
import { useMetadataEntities, useMetadataFields, MetadataEntity, MetadataField, FIELD_TYPES } from '@/hooks/useMetadataStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Database, Plus, Settings2, Table2, Layers, Edit, Trash2, Search,
  FileText, CheckCircle2, Circle, FolderKanban, Rocket, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const BASE_TABLES = [
  'ar_invoices', 'ap_invoices', 'sales_orders', 'purchase_orders', 'business_partners',
  'items', 'employees', 'projects', 'activities', 'opportunities', 'quotations',
  'deliveries', 'goods_receipts', 'inventory_items', 'journal_entries',
];

export default function MetadataStudio() {
  const { entities, create: createEntity, update: updateEntity, remove: removeEntity } = useMetadataEntities();
  const [activeTab, setActiveTab] = useState('custom-fields');
  const [selectedEntity, setSelectedEntity] = useState<MetadataEntity | null>(null);
  const [selectedBaseTable, setSelectedBaseTable] = useState<string | null>(null);
  const [showEntityDialog, setShowEntityDialog] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Partial<MetadataEntity>>({});
  const [editingField, setEditingField] = useState<Partial<MetadataField>>({});
  const [search, setSearch] = useState('');

  // Fields for selected entity or base table
  const { fields, create: createField, update: updateField, remove: removeField } = useMetadataFields(
    activeTab === 'custom-tables' ? selectedEntity?.id : null,
    activeTab === 'custom-fields' ? selectedBaseTable : null
  );

  const handleSaveEntity = () => {
    if (!editingEntity.technical_name || !editingEntity.display_name) return;
    if (editingEntity.id) {
      updateEntity.mutate(editingEntity as MetadataEntity & { id: string });
    } else {
      createEntity.mutate(editingEntity);
    }
    setShowEntityDialog(false);
    setEditingEntity({});
  };

  const handleSaveField = () => {
    if (!editingField.technical_name || !editingField.display_label) return;
    if (editingField.id) {
      updateField.mutate(editingField as MetadataField & { id: string });
    } else {
      const payload: Partial<MetadataField> = { ...editingField };
      if (activeTab === 'custom-tables' && selectedEntity) payload.entity_id = selectedEntity.id;
      if (activeTab === 'custom-fields' && selectedBaseTable) payload.base_table = selectedBaseTable;
      createField.mutate(payload);
    }
    setShowFieldDialog(false);
    setEditingField({});
  };

  const handlePublish = (entity: MetadataEntity) => {
    if (!confirm(`Publish "${entity.display_name}"? This will make it available for use.`)) return;
    updateEntity.mutate({ id: entity.id, status: 'published', version: entity.version + 1 });
  };

  const filteredEntities = entities.filter(e =>
    !search || e.display_name.toLowerCase().includes(search.toLowerCase()) || e.technical_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Metadata Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage custom fields, user-defined tables, and screen layouts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="custom-fields" className="gap-1.5 text-xs"><Settings2 className="h-3.5 w-3.5" /> Custom Fields (UDF)</TabsTrigger>
          <TabsTrigger value="custom-tables" className="gap-1.5 text-xs"><Table2 className="h-3.5 w-3.5" /> Custom Tables (UDT)</TabsTrigger>
        </TabsList>

        {/* ─── Custom Fields Tab ─── */}
        <TabsContent value="custom-fields" className="space-y-4">
          <div className="grid grid-cols-12 gap-4" style={{ minHeight: '60vh' }}>
            <Card className="col-span-3">
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Base Tables</CardTitle>
              </CardHeader>
              <ScrollArea className="h-[55vh]">
                <div className="px-2 pb-2 space-y-0.5">
                  {BASE_TABLES.map(t => (
                    <button key={t} onClick={() => setSelectedBaseTable(t)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${selectedBaseTable === t ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}>
                      <Table2 className="h-3 w-3 inline mr-2" />{t.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <div className="col-span-9 space-y-3">
              {selectedBaseTable ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Custom Fields for <Badge variant="outline">{selectedBaseTable}</Badge></h3>
                    <Button size="sm" className="text-xs gap-1" onClick={() => { setEditingField({ field_type: 'text', sort_order: fields.length }); setShowFieldDialog(true); }}>
                      <Plus className="h-3 w-3" /> Add Field
                    </Button>
                  </div>
                  <FieldsTable fields={fields} onEdit={f => { setEditingField(f); setShowFieldDialog(true); }} onDelete={f => { if (confirm('Delete this field?')) removeField.mutate(f.id); }} />
                </>
              ) : (
                <Card className="p-12 text-center text-muted-foreground">
                  <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a base table to manage its custom fields</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── Custom Tables Tab ─── */}
        <TabsContent value="custom-tables" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search tables..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Button size="sm" className="text-xs gap-1" onClick={() => { setEditingEntity({ status: 'draft', audit_enabled: true }); setShowEntityDialog(true); }}>
              <Plus className="h-3 w-3" /> New Table
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-4" style={{ minHeight: '55vh' }}>
            <Card className="col-span-4 overflow-hidden">
              <ScrollArea className="h-[55vh]">
                <div className="p-2 space-y-1">
                  {filteredEntities.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">No custom tables defined yet.</div>
                  )}
                  {filteredEntities.map(e => (
                    <button key={e.id} onClick={() => setSelectedEntity(e)}
                      className={`w-full text-left p-3 rounded-lg transition-colors border ${selectedEntity?.id === e.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{e.display_name}</span>
                        <Badge variant={e.status === 'published' ? 'default' : 'secondary'} className="text-[9px]">
                          {e.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{e.technical_name}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <div className="col-span-8 space-y-3">
              {selectedEntity ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{selectedEntity.display_name}</h3>
                      <p className="text-[10px] text-muted-foreground">{selectedEntity.technical_name} · v{selectedEntity.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setEditingEntity(selectedEntity); setShowEntityDialog(true); }}>
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                      {selectedEntity.status === 'draft' && (
                        <Button size="sm" className="text-xs gap-1" onClick={() => handlePublish(selectedEntity)}>
                          <Rocket className="h-3 w-3" /> Publish
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground border rounded-lg p-3">
                    <span>Audit: {selectedEntity.audit_enabled ? '✓' : '✗'}</span>
                    <span>Soft Delete: {selectedEntity.soft_delete_enabled ? '✓' : '✗'}</span>
                    <span>Attachments: {selectedEntity.attachments_enabled ? '✓' : '✗'}</span>
                    <span>Workflow: {selectedEntity.workflow_ready ? '✓' : '✗'}</span>
                    <span>Category: {selectedEntity.category || 'general'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold">Fields</h4>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditingField({ field_type: 'text', sort_order: fields.length, entity_id: selectedEntity.id }); setShowFieldDialog(true); }}>
                      <Plus className="h-3 w-3" /> Add Field
                    </Button>
                  </div>
                  <FieldsTable fields={fields} onEdit={f => { setEditingField(f); setShowFieldDialog(true); }} onDelete={f => { if (confirm('Delete?')) removeField.mutate(f.id); }} />
                </>
              ) : (
                <Card className="p-12 text-center text-muted-foreground">
                  <Table2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select or create a custom table</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Entity Dialog ─── */}
      <Dialog open={showEntityDialog} onOpenChange={setShowEntityDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingEntity.id ? 'Edit' : 'Create'} Custom Table</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Technical Name *</Label><Input value={editingEntity.technical_name || ''} onChange={e => setEditingEntity(p => ({ ...p, technical_name: e.target.value }))} className="h-8 text-sm" placeholder="udt_my_table" /></div>
              <div><Label className="text-xs">Display Name *</Label><Input value={editingEntity.display_name || ''} onChange={e => setEditingEntity(p => ({ ...p, display_name: e.target.value }))} className="h-8 text-sm" placeholder="My Table" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Plural Name</Label><Input value={editingEntity.plural_name || ''} onChange={e => setEditingEntity(p => ({ ...p, plural_name: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Category</Label>
                <Select value={editingEntity.category || 'general'} onValueChange={v => setEditingEntity(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{['general', 'finance', 'sales', 'purchasing', 'inventory', 'hr', 'operations'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea value={editingEntity.description || ''} onChange={e => setEditingEntity(p => ({ ...p, description: e.target.value }))} className="text-sm min-h-[50px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between"><Label className="text-xs">Audit Enabled</Label><Switch checked={editingEntity.audit_enabled ?? true} onCheckedChange={v => setEditingEntity(p => ({ ...p, audit_enabled: v }))} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Soft Delete</Label><Switch checked={editingEntity.soft_delete_enabled ?? false} onCheckedChange={v => setEditingEntity(p => ({ ...p, soft_delete_enabled: v }))} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Attachments</Label><Switch checked={editingEntity.attachments_enabled ?? false} onCheckedChange={v => setEditingEntity(p => ({ ...p, attachments_enabled: v }))} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Workflow Ready</Label><Switch checked={editingEntity.workflow_ready ?? false} onCheckedChange={v => setEditingEntity(p => ({ ...p, workflow_ready: v }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEntityDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEntity} disabled={!editingEntity.technical_name || !editingEntity.display_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Field Dialog ─── */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingField.id ? 'Edit' : 'Add'} Field</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <fieldset className="space-y-3 border rounded-lg p-3">
              <legend className="text-xs font-semibold text-muted-foreground px-2">Basic</legend>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Technical Name *</Label><Input value={editingField.technical_name || ''} onChange={e => setEditingField(p => ({ ...p, technical_name: e.target.value }))} className="h-8 text-sm" placeholder="u_field_name" /></div>
                <div><Label className="text-xs">Display Label *</Label><Input value={editingField.display_label || ''} onChange={e => setEditingField(p => ({ ...p, display_label: e.target.value }))} className="h-8 text-sm" /></div>
                <div><Label className="text-xs">Field Type *</Label>
                  <Select value={editingField.field_type || 'text'} onValueChange={v => setEditingField(p => ({ ...p, field_type: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Default Value</Label><Input value={editingField.default_value || ''} onChange={e => setEditingField(p => ({ ...p, default_value: e.target.value }))} className="h-8 text-sm" /></div>
                <div><Label className="text-xs">Section</Label><Input value={editingField.section_name || ''} onChange={e => setEditingField(p => ({ ...p, section_name: e.target.value }))} className="h-8 text-sm" placeholder="General" /></div>
                <div><Label className="text-xs">Tab</Label><Input value={editingField.tab_name || ''} onChange={e => setEditingField(p => ({ ...p, tab_name: e.target.value }))} className="h-8 text-sm" /></div>
              </div>
              <div><Label className="text-xs">Help Text</Label><Input value={editingField.help_text || ''} onChange={e => setEditingField(p => ({ ...p, help_text: e.target.value }))} className="h-8 text-sm" /></div>
            </fieldset>

            <fieldset className="space-y-3 border rounded-lg p-3">
              <legend className="text-xs font-semibold text-muted-foreground px-2">Flags</legend>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: 'is_required', label: 'Required' },
                  { key: 'is_unique', label: 'Unique' },
                  { key: 'is_indexed', label: 'Indexed' },
                  { key: 'is_searchable', label: 'Searchable' },
                  { key: 'is_filterable', label: 'Filterable' },
                  { key: 'visible_in_form', label: 'Show in Form' },
                  { key: 'visible_in_grid', label: 'Show in Grid' },
                  { key: 'is_read_only', label: 'Read Only' },
                  { key: 'is_primary_identifier', label: 'Primary ID' },
                  { key: 'is_list_default', label: 'List Default' },
                ].map(flag => (
                  <div key={flag.key} className="flex items-center justify-between">
                    <Label className="text-[10px]">{flag.label}</Label>
                    <Switch checked={(editingField as any)[flag.key] ?? (flag.key === 'visible_in_form' || flag.key === 'visible_in_grid')} onCheckedChange={v => setEditingField(p => ({ ...p, [flag.key]: v }))} />
                  </div>
                ))}
              </div>
            </fieldset>

            {(editingField.field_type === 'select' || editingField.field_type === 'multi_select') && (
              <fieldset className="space-y-2 border rounded-lg p-3">
                <legend className="text-xs font-semibold text-muted-foreground px-2">Dropdown Options</legend>
                <Textarea
                  value={editingField.dropdown_options ? JSON.stringify(editingField.dropdown_options, null, 2) : '[\n  {"value": "opt1", "label": "Option 1"},\n  {"value": "opt2", "label": "Option 2"}\n]'}
                  onChange={e => { try { setEditingField(p => ({ ...p, dropdown_options: JSON.parse(e.target.value) })); } catch {} }}
                  className="text-xs font-mono min-h-[80px]"
                />
              </fieldset>
            )}

            {editingField.field_type === 'lookup' && (
              <fieldset className="space-y-2 border rounded-lg p-3">
                <legend className="text-xs font-semibold text-muted-foreground px-2">Lookup Configuration</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Source Table</Label><Input value={(editingField.lookup_config as any)?.source_table || ''} onChange={e => setEditingField(p => ({ ...p, lookup_config: { ...(p.lookup_config || {}), source_table: e.target.value } }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Key Field</Label><Input value={(editingField.lookup_config as any)?.key_field || 'id'} onChange={e => setEditingField(p => ({ ...p, lookup_config: { ...(p.lookup_config || {}), key_field: e.target.value } }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Display Field</Label><Input value={(editingField.lookup_config as any)?.display_field || 'name'} onChange={e => setEditingField(p => ({ ...p, lookup_config: { ...(p.lookup_config || {}), display_field: e.target.value } }))} className="h-8 text-sm" /></div>
                </div>
              </fieldset>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowFieldDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveField} disabled={!editingField.technical_name || !editingField.display_label}>Save Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldsTable({ fields, onEdit, onDelete }: { fields: MetadataField[]; onEdit: (f: MetadataField) => void; onDelete: (f: MetadataField) => void }) {
  if (fields.length === 0) {
    return <Card className="p-8 text-center text-xs text-muted-foreground">No fields defined. Click "Add Field" to create one.</Card>;
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-8">#</TableHead>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Label</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs text-center">Req</TableHead>
            <TableHead className="text-xs text-center">Grid</TableHead>
            <TableHead className="text-xs text-center">Form</TableHead>
            <TableHead className="text-xs text-center">Active</TableHead>
            <TableHead className="text-xs w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((f, i) => (
            <TableRow key={f.id}>
              <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="text-xs font-mono">{f.technical_name}</TableCell>
              <TableCell className="text-xs">{f.display_label}</TableCell>
              <TableCell><Badge variant="outline" className="text-[9px]">{f.field_type}</Badge></TableCell>
              <TableCell className="text-center">{f.is_required ? <CheckCircle2 className="h-3 w-3 text-emerald-500 mx-auto" /> : <Circle className="h-3 w-3 text-muted-foreground/30 mx-auto" />}</TableCell>
              <TableCell className="text-center">{f.visible_in_grid ? <CheckCircle2 className="h-3 w-3 text-emerald-500 mx-auto" /> : <Circle className="h-3 w-3 text-muted-foreground/30 mx-auto" />}</TableCell>
              <TableCell className="text-center">{f.visible_in_form ? <CheckCircle2 className="h-3 w-3 text-emerald-500 mx-auto" /> : <Circle className="h-3 w-3 text-muted-foreground/30 mx-auto" />}</TableCell>
              <TableCell className="text-center">{f.is_active ? <Badge className="text-[9px] bg-emerald-500/10 text-emerald-700">Yes</Badge> : <Badge variant="secondary" className="text-[9px]">No</Badge>}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(f)}><Edit className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(f)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
