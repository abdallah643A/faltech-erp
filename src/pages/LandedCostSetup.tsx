import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit2, Users, Tag, Settings2, BarChart3, FileText, Shield, Sliders } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { GLAccountSelect } from '@/components/shared/GLAccountSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLCDocuments, useLCAccountMappings, useLCSettings } from '@/hooks/useLandedCostSetup';
import { LCDashboard } from '@/components/landed-cost/LCDashboard';
import { LCDocumentList } from '@/components/landed-cost/LCDocumentList';
import { LCDocumentForm } from '@/components/landed-cost/LCDocumentForm';

const landedCostTabs = [
  { id: 'dashboard', path: '/landed-cost-setup' },
  { id: 'documents', path: '/landed-cost-setup/documents' },
  { id: 'categories', path: '/landed-cost-setup/categories' },
  { id: 'brokers', path: '/landed-cost-setup/brokers' },
  { id: 'mappings', path: '/landed-cost-setup/mappings' },
  { id: 'settings', path: '/landed-cost-setup/settings' },
];

const ALLOCATION_METHODS = [
  { value: 'by_quantity', label: 'By Quantity' },
  { value: 'by_value', label: 'By Value' },
  { value: 'by_weight', label: 'By Weight' },
  { value: 'by_volume', label: 'By Volume' },
  { value: 'by_customs_value', label: 'By Customs Value' },
  { value: 'by_packages', label: 'By Packages' },
  { value: 'equal', label: 'Equal Distribution' },
  { value: 'manual', label: 'Manual' },
];

const CHARGE_CATEGORIES = [
  'Freight', 'Customs Duty', 'Insurance', 'Clearance', 'Port Charges',
  'Inland Transport', 'Handling', 'Storage', 'Inspection', 'Documentation',
  'Bank Charges', 'Demurrage', 'Other',
];

export default function LandedCostSetup() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = landedCostTabs.find(t => t.path === location.pathname)?.id || 'dashboard';
  const handleTabChange = (tabId: string) => {
    const tab = landedCostTabs.find(t => t.id === tabId);
    if (tab) navigate(tab.path);
  };
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBrokerForm, setShowBrokerForm] = useState(false);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editBrokerId, setEditBrokerId] = useState<string | null>(null);
  const [editMappingId, setEditMappingId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ category_code: '', category_name: '', description: '', default_allocation_method: 'by_value', gl_account: '', is_active: true });
  const [brokerForm, setBrokerForm] = useState({ broker_code: '', broker_name: '', contact_person: '', phone: '', email: '', address: '', license_number: '', is_active: true });
  const [mappingForm, setMappingForm] = useState({ charge_category: 'Freight', inventory_account: '', clearing_account: '', expense_account: '', tax_account: '', rounding_account: '' });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // LC Documents
  const lcDocs = useLCDocuments();
  const accountMappings = useLCAccountMappings();
  const lcSettings = useLCSettings();
  const [settingsForm, setSettingsForm] = useState<any>(null);

  // Categories & Brokers
  const categories = useQuery({
    queryKey: ['lc-categories', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('landed_cost_categories' as any).select('*').order('category_code') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const brokers = useQuery({
    queryKey: ['lc-brokers', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('landed_cost_brokers' as any).select('*').order('broker_code') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  // Category CRUD
  const saveCategory = useMutation({
    mutationFn: async (cat: any) => {
      if (editCategoryId) {
        const { error } = await (supabase.from('landed_cost_categories' as any).update(cat).eq('id', editCategoryId) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('landed_cost_categories' as any).insert({ ...cat, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lc-categories'] });
      toast.success(editCategoryId ? 'Category updated' : 'Category created');
      closeCategoryForm();
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from('landed_cost_categories' as any).delete().eq('id', id) as any); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-categories'] }); toast.success('Category deleted'); },
  });

  // Broker CRUD
  const saveBroker = useMutation({
    mutationFn: async (broker: any) => {
      if (editBrokerId) {
        const { error } = await (supabase.from('landed_cost_brokers' as any).update(broker).eq('id', editBrokerId) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('landed_cost_brokers' as any).insert({ ...broker, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lc-brokers'] });
      toast.success(editBrokerId ? 'Broker updated' : 'Broker created');
      closeBrokerForm();
    },
  });

  const deleteBroker = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from('landed_cost_brokers' as any).delete().eq('id', id) as any); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-brokers'] }); toast.success('Broker deleted'); },
  });

  // Mapping delete
  const deleteMapping = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from('lc_account_mappings' as any).delete().eq('id', id) as any); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-account-mappings'] }); toast.success('Mapping deleted'); },
  });

  // Form helpers
  const closeCategoryForm = () => {
    setShowCategoryForm(false);
    setEditCategoryId(null);
    setCategoryForm({ category_code: '', category_name: '', description: '', default_allocation_method: 'by_value', gl_account: '', is_active: true });
  };

  const openEditCategory = (cat: any) => {
    setCategoryForm({
      category_code: cat.category_code || '',
      category_name: cat.category_name || '',
      description: cat.description || '',
      default_allocation_method: cat.default_allocation_method || 'by_value',
      gl_account: cat.gl_account || '',
      is_active: cat.is_active ?? true,
    });
    setEditCategoryId(cat.id);
    setShowCategoryForm(true);
  };

  const closeBrokerForm = () => {
    setShowBrokerForm(false);
    setEditBrokerId(null);
    setBrokerForm({ broker_code: '', broker_name: '', contact_person: '', phone: '', email: '', address: '', license_number: '', is_active: true });
  };

  const openEditBroker = (b: any) => {
    setBrokerForm({
      broker_code: b.broker_code || '',
      broker_name: b.broker_name || '',
      contact_person: b.contact_person || '',
      phone: b.phone || '',
      email: b.email || '',
      address: b.address || '',
      license_number: b.license_number || '',
      is_active: b.is_active ?? true,
    });
    setEditBrokerId(b.id);
    setShowBrokerForm(true);
  };

  const closeMappingForm = () => {
    setShowMappingForm(false);
    setEditMappingId(null);
    setMappingForm({ charge_category: 'Freight', inventory_account: '', clearing_account: '', expense_account: '', tax_account: '', rounding_account: '' });
  };

  const openEditMapping = (m: any) => {
    setMappingForm({
      charge_category: m.charge_category || 'Freight',
      inventory_account: m.inventory_account || '',
      clearing_account: m.clearing_account || '',
      expense_account: m.expense_account || '',
      tax_account: m.tax_account || '',
      rounding_account: m.rounding_account || '',
    });
    setEditMappingId(m.id);
    setShowMappingForm(true);
  };

  const handleSaveMapping = () => {
    if (editMappingId) {
      // Update existing
      accountMappings.upsert.mutate({ ...mappingForm, id: editMappingId });
    } else {
      accountMappings.upsert.mutate(mappingForm);
    }
    closeMappingForm();
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'category') deleteCategory.mutate(deleteConfirm.id);
    else if (deleteConfirm.type === 'broker') deleteBroker.mutate(deleteConfirm.id);
    else if (deleteConfirm.type === 'mapping') deleteMapping.mutate(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Doc actions
  const handleCreateDoc = () => {
    const docNum = `LC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    lcDocs.create.mutate({
      doc_number: docNum,
      posting_date: new Date().toISOString().split('T')[0],
      document_date: new Date().toISOString().split('T')[0],
      lc_type: 'import_shipment',
      currency: 'SAR',
      exchange_rate: 1,
      status: 'draft',
    }, {
      onSuccess: (data: any) => {
        setSelectedDoc(data);
        navigate('/landed-cost-setup/documents');
      },
    });
  };

  const handleSaveDoc = (doc: any) => {
    const { id, created_at, created_by, ...rest } = doc;
    lcDocs.update.mutate({ id, ...rest });
  };

  const handleUpdateStatus = (id: string, updates: any) => {
    lcDocs.update.mutate({ id, ...updates });
  };

  const handleDeleteDoc = (id: string) => {
    lcDocs.remove.mutate(id);
  };

  // If viewing a specific document
  if (selectedDoc) {
    return (
      <div className="p-4">
        <LCDocumentForm
          document={selectedDoc}
          onBack={() => { setSelectedDoc(null); lcDocs.refetch(); }}
          onSave={handleSaveDoc}
          onUpdateStatus={handleUpdateStatus}
        />
      </div>
    );
  }

  // Settings init
  if (activeTab === 'settings' && !settingsForm && lcSettings.data) {
    setSettingsForm(lcSettings.data);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Landed Cost Setup
          </h1>
          <p className="text-xs text-muted-foreground">Configure, manage, and track landed cost documents</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="dashboard" className="text-[11px] h-7 gap-1"><BarChart3 className="h-3 w-3" /> Dashboard</TabsTrigger>
          <TabsTrigger value="documents" className="text-[11px] h-7 gap-1"><FileText className="h-3 w-3" /> Documents</TabsTrigger>
          <TabsTrigger value="categories" className="text-[11px] h-7 gap-1"><Tag className="h-3 w-3" /> Cost Categories</TabsTrigger>
          <TabsTrigger value="brokers" className="text-[11px] h-7 gap-1"><Users className="h-3 w-3" /> Brokers</TabsTrigger>
          <TabsTrigger value="mappings" className="text-[11px] h-7 gap-1"><Shield className="h-3 w-3" /> GL Mappings</TabsTrigger>
          <TabsTrigger value="settings" className="text-[11px] h-7 gap-1"><Sliders className="h-3 w-3" /> Controls</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-3">
          <LCDashboard documents={lcDocs.data || []} />
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-3">
          <LCDocumentList
            documents={lcDocs.data || []}
            onSelect={setSelectedDoc}
            onCreate={handleCreateDoc}
            onDelete={handleDeleteDoc}
          />
        </TabsContent>

        {/* Cost Categories */}
        <TabsContent value="categories" className="mt-3">
          <Card className="border-border">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Cost Categories</CardTitle>
              <Button size="sm" className="h-7 text-xs" onClick={() => { closeCategoryForm(); setShowCategoryForm(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Category</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead className="h-8">Code</TableHead><TableHead className="h-8">Name</TableHead><TableHead className="h-8">Description</TableHead>
                  <TableHead className="h-8">Default Allocation</TableHead><TableHead className="h-8">G/L Account</TableHead><TableHead className="h-8">Status</TableHead><TableHead className="h-8 w-20">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {categories.data?.map((cat: any) => (
                    <TableRow key={cat.id} className="text-xs">
                      <TableCell className="py-1.5 font-medium">{cat.category_code}</TableCell>
                      <TableCell className="py-1.5">{cat.category_name}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{cat.description || '-'}</TableCell>
                      <TableCell className="py-1.5">{ALLOCATION_METHODS.find(m => m.value === cat.default_allocation_method)?.label || cat.default_allocation_method}</TableCell>
                      <TableCell className="py-1.5">{cat.gl_account || '-'}</TableCell>
                      <TableCell className="py-1.5"><Badge variant={cat.is_active ? 'default' : 'secondary'} className="text-[10px]">{cat.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditCategory(cat)}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDeleteConfirm({ type: 'category', id: cat.id, name: cat.category_name })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!categories.data?.length && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No cost categories defined</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brokers */}
        <TabsContent value="brokers" className="mt-3">
          <Card className="border-border">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Customs Brokers</CardTitle>
              <Button size="sm" className="h-7 text-xs" onClick={() => { closeBrokerForm(); setShowBrokerForm(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Broker</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead className="h-8">Code</TableHead><TableHead className="h-8">Name</TableHead><TableHead className="h-8">Contact</TableHead>
                  <TableHead className="h-8">Phone</TableHead><TableHead className="h-8">Email</TableHead><TableHead className="h-8">License</TableHead>
                  <TableHead className="h-8">Status</TableHead><TableHead className="h-8 w-20">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {brokers.data?.map((b: any) => (
                    <TableRow key={b.id} className="text-xs">
                      <TableCell className="py-1.5 font-medium">{b.broker_code}</TableCell>
                      <TableCell className="py-1.5">{b.broker_name}</TableCell>
                      <TableCell className="py-1.5">{b.contact_person || '-'}</TableCell>
                      <TableCell className="py-1.5">{b.phone || '-'}</TableCell>
                      <TableCell className="py-1.5">{b.email || '-'}</TableCell>
                      <TableCell className="py-1.5">{b.license_number || '-'}</TableCell>
                      <TableCell className="py-1.5"><Badge variant={b.is_active ? 'default' : 'secondary'} className="text-[10px]">{b.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditBroker(b)}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDeleteConfirm({ type: 'broker', id: b.id, name: b.broker_name })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!brokers.data?.length && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">No brokers defined</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GL Mappings */}
        <TabsContent value="mappings" className="mt-3">
          <Card className="border-border">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">GL Account Mappings</CardTitle>
              <Button size="sm" className="h-7 text-xs" onClick={() => { closeMappingForm(); setShowMappingForm(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Mapping</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead className="h-8">Charge Category</TableHead><TableHead className="h-8">Inventory Acct</TableHead><TableHead className="h-8">Clearing Acct</TableHead>
                  <TableHead className="h-8">Expense Acct</TableHead><TableHead className="h-8">Tax Acct</TableHead><TableHead className="h-8">Rounding Acct</TableHead>
                  <TableHead className="h-8 w-20">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(accountMappings.data || []).map((m: any) => (
                    <TableRow key={m.id} className="text-xs">
                      <TableCell className="py-1.5 font-medium">{m.charge_category}</TableCell>
                      <TableCell className="py-1.5">{m.inventory_account || '-'}</TableCell>
                      <TableCell className="py-1.5">{m.clearing_account || '-'}</TableCell>
                      <TableCell className="py-1.5">{m.expense_account || '-'}</TableCell>
                      <TableCell className="py-1.5">{m.tax_account || '-'}</TableCell>
                      <TableCell className="py-1.5">{m.rounding_account || '-'}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditMapping(m)}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDeleteConfirm({ type: 'mapping', id: m.id, name: m.charge_category })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!(accountMappings.data || []).length && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No GL mappings configured</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controls / Settings */}
        <TabsContent value="settings" className="mt-3">
          <Card className="border-border">
            <CardHeader className="py-2 px-4"><CardTitle className="text-sm">Posting Controls & Defaults</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Default Allocation Method</Label>
                  <Select value={settingsForm?.default_allocation_method || 'by_value'} onValueChange={v => setSettingsForm((p: any) => ({ ...p, default_allocation_method: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALLOCATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Default Currency</Label><Input className="h-7 text-xs" value={settingsForm?.default_currency || 'SAR'} onChange={e => setSettingsForm((p: any) => ({ ...p, default_currency: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Tolerance %</Label><Input type="number" className="h-7 text-xs" value={settingsForm?.tolerance_pct ?? 5} onChange={e => setSettingsForm((p: any) => ({ ...p, tolerance_pct: Number(e.target.value) }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Tolerance Amount</Label><Input type="number" className="h-7 text-xs" value={settingsForm?.tolerance_amount ?? 1000} onChange={e => setSettingsForm((p: any) => ({ ...p, tolerance_amount: Number(e.target.value) }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Rounding Account</Label><GLAccountSelect value={settingsForm?.rounding_account || ''} onChange={v => setSettingsForm((p: any) => ({ ...p, rounding_account: v }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Clearing Account</Label><GLAccountSelect value={settingsForm?.clearing_account || ''} onChange={v => setSettingsForm((p: any) => ({ ...p, clearing_account: v }))} /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Duplicate LC on Receipt</Label>
                  <Select value={settingsForm?.duplicate_lc_on_receipt || 'warning'} onValueChange={v => setSettingsForm((p: any) => ({ ...p, duplicate_lc_on_receipt: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox checked={settingsForm?.posting_require_approval ?? true} onCheckedChange={v => setSettingsForm((p: any) => ({ ...p, posting_require_approval: !!v }))} id="post-req-approval" />
                  <Label htmlFor="post-req-approval" className="text-xs">Posting requires approval</Label>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox checked={settingsForm?.capitalize_non_recoverable_tax ?? true} onCheckedChange={v => setSettingsForm((p: any) => ({ ...p, capitalize_non_recoverable_tax: !!v }))} id="cap-nr-tax" />
                  <Label htmlFor="cap-nr-tax" className="text-xs">Capitalize non-recoverable tax</Label>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox checked={settingsForm?.exclude_recoverable_tax ?? true} onCheckedChange={v => setSettingsForm((p: any) => ({ ...p, exclude_recoverable_tax: !!v }))} id="excl-recov-tax" />
                  <Label htmlFor="excl-recov-tax" className="text-xs">Exclude recoverable tax from inv. value</Label>
                </div>
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={() => settingsForm && lcSettings.save.mutate(settingsForm)}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog (Add/Edit) */}
      <Dialog open={showCategoryForm} onOpenChange={v => { if (!v) closeCategoryForm(); else setShowCategoryForm(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editCategoryId ? 'Edit' : 'Add'} Cost Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Code</Label><Input className="h-7 text-xs" value={categoryForm.category_code} onChange={e => setCategoryForm(p => ({ ...p, category_code: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Name</Label><Input className="h-7 text-xs" value={categoryForm.category_name} onChange={e => setCategoryForm(p => ({ ...p, category_name: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Description</Label><Input className="h-7 text-xs" value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Allocation</Label>
              <Select value={categoryForm.default_allocation_method} onValueChange={v => setCategoryForm(p => ({ ...p, default_allocation_method: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ALLOCATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">GL Account</Label>
              <GLAccountSelect value={categoryForm.gl_account} onChange={v => setCategoryForm(p => ({ ...p, gl_account: v }))} />
            </div>
            <div className="flex items-center gap-2 pl-[108px]"><Checkbox checked={categoryForm.is_active} onCheckedChange={v => setCategoryForm(p => ({ ...p, is_active: !!v }))} id="cat-active" /><Label htmlFor="cat-active" className="text-xs">Active</Label></div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={closeCategoryForm}>Cancel</Button>
            <Button size="sm" onClick={() => saveCategory.mutate(categoryForm)}>{editCategoryId ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broker Dialog (Add/Edit) */}
      <Dialog open={showBrokerForm} onOpenChange={v => { if (!v) closeBrokerForm(); else setShowBrokerForm(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editBrokerId ? 'Edit' : 'Add'} Customs Broker</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Code</Label><Input className="h-7 text-xs" value={brokerForm.broker_code} onChange={e => setBrokerForm(p => ({ ...p, broker_code: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Name</Label><Input className="h-7 text-xs" value={brokerForm.broker_name} onChange={e => setBrokerForm(p => ({ ...p, broker_name: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Contact</Label><Input className="h-7 text-xs" value={brokerForm.contact_person} onChange={e => setBrokerForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Phone</Label><Input className="h-7 text-xs" value={brokerForm.phone} onChange={e => setBrokerForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Email</Label><Input className="h-7 text-xs" value={brokerForm.email} onChange={e => setBrokerForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">Address</Label><Input className="h-7 text-xs" value={brokerForm.address} onChange={e => setBrokerForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2"><Label className="text-xs text-right">License #</Label><Input className="h-7 text-xs" value={brokerForm.license_number} onChange={e => setBrokerForm(p => ({ ...p, license_number: e.target.value }))} /></div>
            <div className="flex items-center gap-2 pl-[108px]"><Checkbox checked={brokerForm.is_active} onCheckedChange={v => setBrokerForm(p => ({ ...p, is_active: !!v }))} id="brk-active" /><Label htmlFor="brk-active" className="text-xs">Active</Label></div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={closeBrokerForm}>Cancel</Button>
            <Button size="sm" onClick={() => saveBroker.mutate(brokerForm)}>{editBrokerId ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GL Mapping Dialog (Add/Edit) */}
      <Dialog open={showMappingForm} onOpenChange={v => { if (!v) closeMappingForm(); else setShowMappingForm(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editMappingId ? 'Edit' : 'Add'} GL Account Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Category</Label>
              <Select value={mappingForm.charge_category} onValueChange={v => setMappingForm(p => ({ ...p, charge_category: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CHARGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2"><Label className="text-xs text-right">Inventory Acct</Label><GLAccountSelect value={mappingForm.inventory_account} onChange={v => setMappingForm(p => ({ ...p, inventory_account: v }))} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2"><Label className="text-xs text-right">Clearing Acct</Label><GLAccountSelect value={mappingForm.clearing_account} onChange={v => setMappingForm(p => ({ ...p, clearing_account: v }))} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2"><Label className="text-xs text-right">Expense Acct</Label><GLAccountSelect value={mappingForm.expense_account} onChange={v => setMappingForm(p => ({ ...p, expense_account: v }))} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2"><Label className="text-xs text-right">Tax Acct</Label><GLAccountSelect value={mappingForm.tax_account} onChange={v => setMappingForm(p => ({ ...p, tax_account: v }))} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2"><Label className="text-xs text-right">Rounding Acct</Label><GLAccountSelect value={mappingForm.rounding_account} onChange={v => setMappingForm(p => ({ ...p, rounding_account: v }))} /></div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={closeMappingForm}>Cancel</Button>
            <Button size="sm" onClick={handleSaveMapping}>{editMappingId ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
