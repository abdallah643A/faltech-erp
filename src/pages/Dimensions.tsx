import { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Loader2, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Settings2, Layers } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDimensions, DimensionInsert } from '@/hooks/useDimensions';
import { useDimensionLevels, DimensionLevel } from '@/hooks/useDimensionLevels';
import { useSAPSync, SyncDirection } from '@/hooks/useSAPSync';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

function DimensionLevelsSetup({ levels, onSave, onSync, isSyncing }: { levels: DimensionLevel[]; onSave: (l: { dimension_number: number; name: string; description: string | null; is_active: boolean }) => void; onSync: () => void; isSyncing: boolean }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<Record<number, { name: string; description: string; is_active: boolean }>>({});

  const getLevel = (num: number) => {
    if (editing[num]) return editing[num];
    const existing = levels.find(l => l.dimension_number === num);
    return existing ? { name: existing.name, description: existing.description || '', is_active: existing.is_active } : { name: `Dimension ${num}`, description: `Dimension ${num}`, is_active: false };
  };

  const handleEdit = (num: number) => {
    const current = getLevel(num);
    setEditing(p => ({ ...p, [num]: { ...current } }));
  };

  const handleSave = (num: number) => {
    const val = editing[num];
    if (val) {
      onSave({ dimension_number: num, name: val.name, description: val.description || null, is_active: val.is_active });
      setEditing(p => { const n = { ...p }; delete n[num]; return n; });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Dimension Levels Setup</h3>
          </div>
          <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 mr-1" />}
            Sync from SAP
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Configure up to 5 dimension levels for this company, similar to SAP B1 dimension types.</p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.active')}</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map(num => {
                const val = getLevel(num);
                const isEditing = !!editing[num];
                return (
                  <TableRow key={num}>
                    <TableCell className="font-medium">Dim {num}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input className="h-8" value={editing[num].name} onChange={e => setEditing(p => ({ ...p, [num]: { ...p[num], name: e.target.value } }))} />
                      ) : val.name}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Checkbox checked={editing[num].is_active} onCheckedChange={v => setEditing(p => ({ ...p, [num]: { ...p[num], is_active: !!v } }))} />
                      ) : (
                        <Badge variant={val.is_active ? 'default' : 'secondary'}>{val.is_active ? 'Yes' : 'No'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input className="h-8" value={editing[num].description} onChange={e => setEditing(p => ({ ...p, [num]: { ...p[num], description: e.target.value } }))} />
                      ) : (val.description || '-')}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleSave(num)}>{t('common.save')}</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(p => { const n = { ...p }; delete n[num]; return n; })}>{t('common.cancel')}</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(num)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionTab({ dimensionNumber, dimensionName }: { dimensionNumber: number; dimensionName: string }) {
  const { t } = useLanguage();
  // Map dimension_number to dimension_type stored in the dimensions table
  const typeMap: Record<number, string> = { 1: 'employees', 2: 'branches', 3: 'business_line', 4: 'factory', 5: 'dimension_5' };
  const type = typeMap[dimensionNumber] || `dimension_${dimensionNumber}`;

  const { dimensions, isLoading, createDimension, updateDimension, deleteDimension } = useDimensions(type as any);
  const { sync, isLoading: isSyncing } = useSAPSync();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    cost_center: '', name: '', dimension_code: '', effective_from: '', effective_to: '', is_active: true,
  });

  const resetForm = () => { setForm({ cost_center: '', name: '', dimension_code: '', effective_from: '', effective_to: '', is_active: true }); setEditingId(null); };
  const handleOpen = () => { resetForm(); setIsFormOpen(true); };
  const handleEdit = (dim: any) => {
    setForm({ cost_center: dim.cost_center, name: dim.name, dimension_code: dim.dimension_code || '', effective_from: dim.effective_from || '', effective_to: dim.effective_to || '', is_active: dim.is_active });
    setEditingId(dim.id); setIsFormOpen(true);
  };
  const handleSave = () => {
    const payload: DimensionInsert = { dimension_type: type as any, cost_center: form.cost_center, name: form.name, dimension_code: form.dimension_code || null, effective_from: form.effective_from || null, effective_to: form.effective_to || null, is_active: form.is_active, created_by: null, company_id: null };
    if (editingId) updateDimension.mutate({ id: editingId, ...payload }); else createDimension.mutate(payload);
    setIsFormOpen(false); resetForm();
  };
  const handleSync = async (direction: SyncDirection) => { await sync('dimension', direction); };

  const handleDeleteAll = useCallback(async () => {
    setIsDeleting(true);
    try {
      let query = supabase.from('dimensions').delete().eq('dimension_type', type);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { error } = await query;
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      toast({ title: 'Deleted', description: `All ${dimensionName} records have been deleted.` });
      setShowDeleteAll(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  }, [type, activeCompanyId, dimensionName, queryClient, toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{dimensions.length} records</p>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isSyncing}>
                {isSyncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sync with SAP
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSync('from_sap')}><ArrowDownToLine className="h-4 w-4 mr-2" /> Pull from SAP</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSync('to_sap')}><ArrowUpFromLine className="h-4 w-4 mr-2" /> Push to SAP</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSync('bidirectional')}><ArrowLeftRight className="h-4 w-4 mr-2" /> Bidirectional Sync</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {dimensions.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteAll(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete All
            </Button>
          )}
          <ExportImportButtons data={dimensions} columns={[
            { key: 'cost_center', header: 'Cost Center' }, { key: 'name', header: 'Name' },
            { key: 'dimension_code', header: 'Dimension Code' }, { key: 'is_active', header: 'Active' },
          ] as ColumnDef[]} filename="dimensions" title="Dimensions" />
          <Button size="sm" onClick={handleOpen}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cost Center</TableHead>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>Dimension Code</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>{t('common.active')}</TableHead>
              <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
            ) : dimensions.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No dimensions found. Add records or sync from SAP.</TableCell></TableRow>
            ) : dimensions.map(dim => (
              <TableRow key={dim.id}>
                <TableCell className="font-medium">{dim.cost_center}</TableCell>
                <TableCell>{dim.name}</TableCell>
                <TableCell>{dim.dimension_code || '-'}</TableCell>
                <TableCell>{dim.effective_from ? format(new Date(dim.effective_from), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell>{dim.effective_to ? format(new Date(dim.effective_to), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell><Badge variant={dim.is_active ? 'default' : 'secondary'}>{dim.is_active ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(dim)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDimension.mutate(dim.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Add'} {dimensionName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Cost Center</Label><Input value={form.cost_center} onChange={e => setForm(p => ({ ...p, cost_center: e.target.value }))} placeholder="e.g. CC-001" /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('common.name')}</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Dimension Code</Label><Input value={form.dimension_code} onChange={e => setForm(p => ({ ...p, dimension_code: e.target.value }))} placeholder="Optional code" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Effective From</Label><Input type="date" value={form.effective_from} onChange={e => setForm(p => ({ ...p, effective_from: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Effective To</Label><Input type="date" value={form.effective_to} onChange={e => setForm(p => ({ ...p, effective_to: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: !!v }))} id="dim-active" />
              <Label htmlFor="dim-active" className="text-sm">{t('common.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.cost_center || !form.name}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DestructiveConfirmDialog
        open={showDeleteAll}
        onOpenChange={setShowDeleteAll}
        onConfirm={handleDeleteAll}
        title={`Delete All ${dimensionName}?`}
        description={`This will permanently delete all ${dimensions.length} records from ${dimensionName}. This action cannot be undone.`}
        itemCount={dimensions.length}
        confirmText="DELETE"
        loading={isDeleting}
      />
    </div>
  );
}

export default function Dimensions() {
  const { t } = useLanguage();
  const { levels, activeLevels, isLoading: levelsLoading, upsertLevel } = useDimensionLevels();
  const { sync, isLoading: isSyncing } = useSAPSync();
  const [activeTab, setActiveTab] = useState<string>('');
  const [showSetup, setShowSetup] = useState(false);

  // Auto-select first active tab
  const effectiveTab = activeTab || (activeLevels.length > 0 ? String(activeLevels[0].dimension_number) : '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dimensions</h1>
          <p className="text-muted-foreground">Manage SAP B1 cost center dimensions across all transaction lines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSetup(p => !p)}>
            <Settings2 className="h-4 w-4 mr-1" /> {showSetup ? 'Hide Setup' : 'Dimension Levels'}
          </Button>
          <SAPSyncButton entity="dimension" />
        </div>
      </div>

      {showSetup && (
        <DimensionLevelsSetup
          levels={levels}
          onSave={(l) => upsertLevel.mutate(l)}
          onSync={() => sync('dimension_levels', 'from_sap')}
          isSyncing={isSyncing}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          {levelsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading dimension levels...
            </div>
          ) : activeLevels.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-lg mb-1">No Dimension Levels Configured</h3>
              <p className="text-sm text-muted-foreground mb-4">Set up your dimension levels first using the "Dimension Levels" button above.</p>
              <Button variant="outline" onClick={() => setShowSetup(true)}>
                <Settings2 className="h-4 w-4 mr-1" /> Configure Dimension Levels
              </Button>
            </div>
          ) : (
            <Tabs value={effectiveTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                {activeLevels.map(level => (
                  <TabsTrigger key={level.dimension_number} value={String(level.dimension_number)} className="gap-2">
                    <Layers className="h-4 w-4" />
                    {level.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {activeLevels.map(level => (
                <TabsContent key={level.dimension_number} value={String(level.dimension_number)}>
                  <DimensionTab dimensionNumber={level.dimension_number} dimensionName={level.name} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
