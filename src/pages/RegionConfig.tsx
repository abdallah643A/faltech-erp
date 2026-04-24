import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Globe, Building2, GitBranch } from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

interface Region { id: string; name: string; name_ar: string | null; is_active: boolean; sort_order: number; }
interface Company { id: string; name: string; name_ar: string | null; region_id: string; is_active: boolean; sort_order: number; }
interface Branch { id: string; name: string; name_ar: string | null; company_id: string; is_active: boolean; sort_order: number; }

export default function RegionConfig() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  // Region state
  const [regOpen, setRegOpen] = useState(false);
  const [editReg, setEditReg] = useState<Region | null>(null);
  const [regForm, setRegForm] = useState({ name: '', name_ar: '', sort_order: '0' });

  // Company state
  const [compOpen, setCompOpen] = useState(false);
  const [editComp, setEditComp] = useState<Company | null>(null);
  const [compForm, setCompForm] = useState({ name: '', name_ar: '', region_ids: [] as string[], sort_order: '0' });

  // Branch state
  const [brOpen, setBrOpen] = useState(false);
  const [editBr, setEditBr] = useState<Branch | null>(null);
  const [brForm, setBrForm] = useState({ name: '', name_ar: '', company_id: '', region_filter: '', sort_order: '0' });

  // Fetch data
  const { data: regions = [] } = useQuery({
    queryKey: ['config-regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regions').select('*').order('sort_order');
      if (error) throw error;
      return data as Region[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['config-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('sort_order');
      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: companyRegions = [] } = useQuery({
    queryKey: ['config-company-regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_regions').select('*');
      if (error) throw error;
      return data as { id: string; company_id: string; region_id: string }[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['config-branches', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('branches').select('*').order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Branch[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['config-regions'] });
    qc.invalidateQueries({ queryKey: ['config-companies'] });
    qc.invalidateQueries({ queryKey: ['config-company-regions'] });
    qc.invalidateQueries({ queryKey: ['config-branches'] });
  };

  const getCompanyRegionIds = (companyId: string) =>
    companyRegions.filter(cr => cr.company_id === companyId).map(cr => cr.region_id);

  const getCompanyRegionNames = (companyId: string) => {
    const regionIds = getCompanyRegionIds(companyId);
    return regionIds.map(rid => {
      const r = regions.find(r => r.id === rid);
      return r ? (isAr && r.name_ar ? r.name_ar : r.name) : '';
    }).filter(Boolean).join(', ') || '-';
  };

  // --- Region CRUD ---
  const saveRegion = useMutation({
    mutationFn: async () => {
      const payload = { name: regForm.name, name_ar: regForm.name_ar || null, sort_order: parseInt(regForm.sort_order) || 0 };
      if (editReg) {
        const { error } = await supabase.from('regions').update(payload).eq('id', editReg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('regions').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setRegOpen(false); toast({ title: isAr ? 'تم الحفظ' : 'Saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleRegion = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('regions').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteRegion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('regions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: isAr ? 'تم الحذف' : 'Deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // --- Company CRUD ---
  const saveCompany = useMutation({
    mutationFn: async () => {
      const payload = { name: compForm.name, name_ar: compForm.name_ar || null, region_id: compForm.region_ids[0] || regions[0]?.id, sort_order: parseInt(compForm.sort_order) || 0 };
      let companyId: string;
      if (editComp) {
        const { error } = await supabase.from('companies').update(payload).eq('id', editComp.id);
        if (error) throw error;
        companyId = editComp.id;
        // Delete old region mappings
        await supabase.from('company_regions').delete().eq('company_id', companyId);
      } else {
        const { data, error } = await supabase.from('companies').insert([payload]).select('id').single();
        if (error) throw error;
        companyId = data.id;
      }
      // Insert new region mappings
      if (compForm.region_ids.length > 0) {
        const mappings = compForm.region_ids.map(rid => ({ company_id: companyId, region_id: rid }));
        const { error } = await supabase.from('company_regions').insert(mappings);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setCompOpen(false); toast({ title: isAr ? 'تم الحفظ' : 'Saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleCompany = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('companies').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: isAr ? 'تم الحذف' : 'Deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // --- Branch CRUD ---
  const saveBranch = useMutation({
    mutationFn: async () => {
      const payload = { name: brForm.name, name_ar: brForm.name_ar || null, company_id: brForm.company_id, sort_order: parseInt(brForm.sort_order) || 0 };
      if (editBr) {
        const { error } = await supabase.from('branches').update(payload).eq('id', editBr.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setBrOpen(false); toast({ title: isAr ? 'تم الحفظ' : 'Saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleBranch = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('branches').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: isAr ? 'تم الحذف' : 'Deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getRegionName = (id: string) => {
    const r = regions.find(r => r.id === id);
    return r ? (isAr && r.name_ar ? r.name_ar : r.name) : '-';
  };

  const getCompanyName = (id: string) => {
    const c = companies.find(c => c.id === id);
    return c ? (isAr && c.name_ar ? c.name_ar : c.name) : '-';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {isAr ? 'إعداد المناطق والشركات والفروع' : 'Region, Company & Branch Configuration'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAr ? 'إدارة الهيكل التنظيمي: المناطق → الشركات → الفروع' : 'Manage organizational structure: Regions → Companies → Branches'}
        </p>
      </div>

      <Tabs defaultValue="regions">
        <TabsList>
          <TabsTrigger value="regions" className="gap-2"><Globe className="h-4 w-4" />{isAr ? 'المناطق' : 'Regions'}</TabsTrigger>
          <TabsTrigger value="companies" className="gap-2"><Building2 className="h-4 w-4" />{isAr ? 'الشركات' : 'Companies'}</TabsTrigger>
          <TabsTrigger value="branches" className="gap-2"><GitBranch className="h-4 w-4" />{isAr ? 'الفروع' : 'Branches'}</TabsTrigger>
        </TabsList>

        {/* Regions Tab */}
        <TabsContent value="regions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAr ? 'المناطق' : 'Regions'}</CardTitle>
              <Button onClick={() => { setEditReg(null); setRegForm({ name: '', name_ar: '', sort_order: '0' }); setRegOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />{isAr ? 'منطقة جديدة' : 'New Region'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</TableHead>
                    <TableHead>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</TableHead>
                    <TableHead>{isAr ? 'الترتيب' : 'Order'}</TableHead>
                    <TableHead>{isAr ? 'نشط' : 'Active'}</TableHead>
                    <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.name_ar || '-'}</TableCell>
                      <TableCell>{r.sort_order}</TableCell>
                      <TableCell><Switch checked={r.is_active} onCheckedChange={checked => toggleRegion.mutate({ id: r.id, is_active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditReg(r); setRegForm({ name: r.name, name_ar: r.name_ar || '', sort_order: String(r.sort_order) }); setRegOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteRegion.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAr ? 'الشركات' : 'Companies'}</CardTitle>
              <Button onClick={() => { setEditComp(null); setCompForm({ name: '', name_ar: '', region_ids: [], sort_order: '0' }); setCompOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />{isAr ? 'شركة جديدة' : 'New Company'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</TableHead>
                    <TableHead>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</TableHead>
                    <TableHead>{isAr ? 'المنطقة' : 'Region'}</TableHead>
                    <TableHead>{isAr ? 'الترتيب' : 'Order'}</TableHead>
                    <TableHead>{isAr ? 'نشط' : 'Active'}</TableHead>
                    <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.name_ar || '-'}</TableCell>
                      <TableCell>{getCompanyRegionNames(c.id)}</TableCell>
                      <TableCell>{c.sort_order}</TableCell>
                      <TableCell><Switch checked={c.is_active} onCheckedChange={checked => toggleCompany.mutate({ id: c.id, is_active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditComp(c); setCompForm({ name: c.name, name_ar: c.name_ar || '', region_ids: getCompanyRegionIds(c.id), sort_order: String(c.sort_order) }); setCompOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCompany.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAr ? 'الفروع' : 'Branches'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="branch" />
                <Button onClick={() => { setEditBr(null); setBrForm({ name: '', name_ar: '', company_id: '', region_filter: '', sort_order: '0' }); setBrOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />{isAr ? 'فرع جديد' : 'New Branch'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</TableHead>
                    <TableHead>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</TableHead>
                    <TableHead>{isAr ? 'الشركة' : 'Company'}</TableHead>
                    <TableHead>{isAr ? 'المنطقة' : 'Region'}</TableHead>
                    <TableHead>{isAr ? 'الترتيب' : 'Order'}</TableHead>
                    <TableHead>{isAr ? 'نشط' : 'Active'}</TableHead>
                    <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map(b => {
                    const comp = companies.find(c => c.id === b.company_id);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{(b as any).code || '-'}</TableCell>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{b.name_ar || '-'}</TableCell>
                        <TableCell>{getCompanyName(b.company_id)}</TableCell>
                        <TableCell>{comp ? getCompanyRegionNames(comp.id) : '-'}</TableCell>
                        <TableCell>{b.sort_order}</TableCell>
                        <TableCell><Switch checked={b.is_active} onCheckedChange={checked => toggleBranch.mutate({ id: b.id, is_active: checked })} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditBr(b); setBrForm({ name: b.name, name_ar: b.name_ar || '', company_id: b.company_id, region_filter: '', sort_order: String(b.sort_order) }); setBrOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteBranch.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Region Dialog */}
      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editReg ? (isAr ? 'تعديل المنطقة' : 'Edit Region') : (isAr ? 'منطقة جديدة' : 'New Region')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{isAr ? 'الاسم (English)' : 'Name (English)'}</Label><Input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{isAr ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label><Input value={regForm.name_ar} onChange={e => setRegForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
            <div className="space-y-2"><Label>{isAr ? 'الترتيب' : 'Sort Order'}</Label><Input type="number" value={regForm.sort_order} onChange={e => setRegForm(p => ({ ...p, sort_order: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => saveRegion.mutate()} disabled={!regForm.name}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Dialog */}
      <Dialog open={compOpen} onOpenChange={setCompOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editComp ? (isAr ? 'تعديل الشركة' : 'Edit Company') : (isAr ? 'شركة جديدة' : 'New Company')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{isAr ? 'الاسم (English)' : 'Name (English)'}</Label><Input value={compForm.name} onChange={e => setCompForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{isAr ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label><Input value={compForm.name_ar} onChange={e => setCompForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
            <div className="space-y-2">
              <Label>{isAr ? 'المناطق' : 'Regions'}</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {regions.filter(r => r.is_active).map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`region-${r.id}`}
                      checked={compForm.region_ids.includes(r.id)}
                      onCheckedChange={(checked) => {
                        setCompForm(p => ({
                          ...p,
                          region_ids: checked
                            ? [...p.region_ids, r.id]
                            : p.region_ids.filter(id => id !== r.id),
                        }));
                      }}
                    />
                    <label htmlFor={`region-${r.id}`} className="text-sm cursor-pointer">
                      {isAr && r.name_ar ? r.name_ar : r.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>{isAr ? 'الترتيب' : 'Sort Order'}</Label><Input type="number" value={compForm.sort_order} onChange={e => setCompForm(p => ({ ...p, sort_order: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => saveCompany.mutate()} disabled={!compForm.name || compForm.region_ids.length === 0}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={brOpen} onOpenChange={setBrOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBr ? (isAr ? 'تعديل الفرع' : 'Edit Branch') : (isAr ? 'فرع جديد' : 'New Branch')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{isAr ? 'الاسم (English)' : 'Name (English)'}</Label><Input value={brForm.name} onChange={e => setBrForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{isAr ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label><Input value={brForm.name_ar} onChange={e => setBrForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
            <div className="space-y-2">
              <Label>{isAr ? 'المنطقة' : 'Region'}</Label>
              <Select value={brForm.region_filter || 'all'} onValueChange={v => setBrForm(p => ({ ...p, region_filter: v === 'all' ? '' : v, company_id: '' }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'كل المناطق' : 'All Regions'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'كل المناطق' : 'All Regions'}</SelectItem>
                  {regions.filter(r => r.is_active).map(r => (
                    <SelectItem key={r.id} value={r.id}>{isAr && r.name_ar ? r.name_ar : r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الشركة' : 'Company'}</Label>
              <Select value={brForm.company_id} onValueChange={v => setBrForm(p => ({ ...p, company_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الشركة' : 'Select Company'} /></SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.is_active && (!brForm.region_filter || companyRegions.some(cr => cr.company_id === c.id && cr.region_id === brForm.region_filter))).map(c => (
                    <SelectItem key={c.id} value={c.id}>{isAr && c.name_ar ? c.name_ar : c.name} ({getCompanyRegionNames(c.id)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{isAr ? 'الترتيب' : 'Sort Order'}</Label><Input type="number" value={brForm.sort_order} onChange={e => setBrForm(p => ({ ...p, sort_order: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => saveBranch.mutate()} disabled={!brForm.name || !brForm.company_id}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
