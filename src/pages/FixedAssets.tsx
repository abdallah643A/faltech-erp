import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  HardDrive, Plus, FileText, RotateCcw, ArrowRightLeft, TrendingDown, RefreshCw,
  DollarSign, Calendar, BarChart3, ClipboardList, MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSAPSync } from '@/hooks/useSAPSync';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import { SAPSyncProgressBar } from '@/components/sap/SAPSyncProgressBar';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

export default function FixedAssets() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const isAr = language === 'ar';
  const [tab, setTab] = useState('master');
  const qc = useQueryClient();
  const { sync: sapSync, isLoading: isSyncing, lastResult: sapResult } = useSAPSync();

  // Dialog states
  const [showCapDialog, setShowCapDialog] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showManualDepDialog, setShowManualDepDialog] = useState(false);
  const [showRevalDialog, setShowRevalDialog] = useState(false);
  const [showDepRunDialog, setShowDepRunDialog] = useState(false);

  // Forms
  const [capForm, setCapForm] = useState({ asset_id: '', amount: '', remarks: '' });
  const [retireForm, setRetireForm] = useState({ asset_id: '', retirement_type: 'sale', proceeds: '', reason: '' });
  const [transferForm, setTransferForm] = useState({ asset_id: '', from_department: '', to_department: '', from_location: '', to_location: '', reason: '' });
  const [manDepForm, setManDepForm] = useState({ asset_id: '', amount: '', reason: '' });
  const [revalForm, setRevalForm] = useState({ asset_id: '', new_value: '', reason: '' });
  const [depRunForm, setDepRunForm] = useState({ fiscal_year: new Date().getFullYear().toString(), period_number: '1', period_from: '', period_to: '' });

  const isAuthReady = !authLoading && !!user;

  // Queries
  const { data: assets = [], isLoading: assetsLoading, error: assetsError } = useQuery({
    queryKey: ['fa-assets', user?.id, activeCompanyId],
    enabled: isAuthReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, asset_code, purchase_value, current_value, status, department, location')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: capitalizations = [] } = useQuery({
    queryKey: ['capitalizations', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('asset_capitalizations' as any).select('*, assets!inner(name, asset_code)').order('created_at', { ascending: false }) as any);
      return (data || []) as any[];
    },
  });

  const { data: retirements = [] } = useQuery({
    queryKey: ['retirements', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('asset_retirements' as any).select('*, assets!inner(name, asset_code)').order('created_at', { ascending: false }) as any);
      return (data || []) as any[];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['asset-transfers-fa', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('asset_transfers' as any).select('*, assets!inner(name, asset_code)').order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: manualDeps = [] } = useQuery({
    queryKey: ['manual-depreciations', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('manual_depreciations' as any).select('*, assets!inner(name, asset_code)').order('created_at', { ascending: false }) as any);
      return (data || []) as any[];
    },
  });

  const { data: depRuns = [] } = useQuery({
    queryKey: ['depreciation-runs', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('depreciation_runs' as any).select('*').order('created_at', { ascending: false }) as any);
      return (data || []) as any[];
    },
  });

  const { data: revaluations = [] } = useQuery({
    queryKey: ['asset-revaluations', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('asset_revaluations' as any).select('*, assets!inner(name, asset_code)').order('created_at', { ascending: false }) as any);
      return (data || []) as any[];
    },
  });

  // Mutations
  const createCap = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('asset_capitalizations' as any).insert({
        asset_id: form.asset_id, amount: Number(form.amount), remarks: form.remarks, status: 'posted', created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capitalizations', activeCompanyId] }); setShowCapDialog(false); toast.success('Capitalization posted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const createRetirement = useMutation({
    mutationFn: async (form: any) => {
      const asset = assets.find((a: any) => a.id === form.asset_id);
      const nbv = asset?.current_value || asset?.purchase_value || 0;
      const proceeds = Number(form.proceeds) || 0;
      const { error } = await (supabase.from('asset_retirements' as any).insert({
        asset_id: form.asset_id, retirement_type: form.retirement_type, proceeds, net_book_value: nbv,
        gain_loss: proceeds - nbv, reason: form.reason, status: 'posted', created_by: user?.id,
      }) as any);
      if (error) throw error;
      await supabase.from('assets').update({ status: 'disposed' }).eq('id', form.asset_id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retirements', 'fa-assets', activeCompanyId] }); setShowRetireDialog(false); toast.success('Retirement posted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const createTransfer = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('asset_transfers' as any).insert({
        asset_id: form.asset_id, from_department: form.from_department, to_department: form.to_department,
        from_location: form.from_location, to_location: form.to_location, reason: form.reason, status: 'posted', created_by: user?.id,
      }) as any);
      if (error) throw error;
      await supabase.from('assets').update({ department: form.to_department, location: form.to_location }).eq('id', form.asset_id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-transfers-fa', 'fa-assets', activeCompanyId] }); setShowTransferDialog(false); toast.success('Transfer posted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const createManualDep = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('manual_depreciations' as any).insert({
        asset_id: form.asset_id, amount: Number(form.amount), reason: form.reason, status: 'posted', created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manual-depreciations', activeCompanyId] }); setShowManualDepDialog(false); toast.success('Manual depreciation posted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const createRevaluation = useMutation({
    mutationFn: async (form: any) => {
      const asset = assets.find((a: any) => a.id === form.asset_id);
      const oldVal = asset?.current_value || asset?.purchase_value || 0;
      const newVal = Number(form.new_value);
      const { error } = await (supabase.from('asset_revaluations' as any).insert({
        asset_id: form.asset_id, old_value: oldVal, new_value: newVal, revaluation_difference: newVal - oldVal,
        reason: form.reason, status: 'posted', created_by: user?.id,
      }) as any);
      if (error) throw error;
      await supabase.from('assets').update({ current_value: newVal }).eq('id', form.asset_id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-revaluations', 'fa-assets', activeCompanyId] }); setShowRevalDialog(false); toast.success('Revaluation posted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const createDepRun = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('depreciation_runs' as any).insert({
        fiscal_year: Number(form.fiscal_year), period_number: Number(form.period_number),
        period_from: form.period_from, period_to: form.period_to, total_assets: assets.length,
        status: 'posted', created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['depreciation-runs', activeCompanyId] }); setShowDepRunDialog(false); toast.success('Depreciation run completed'); },
    onError: (e: any) => toast.error(e.message),
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(v || 0);

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { draft: 'bg-muted text-muted-foreground', posted: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
    return <Badge className={colors[s] || 'bg-muted text-muted-foreground'}>{s}</Badge>;
  };

  const assetSelector = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'اختر الأصل' : 'Select Asset'} /></SelectTrigger>
      <SelectContent>
        {assets.filter((a: any) => a.status !== 'disposed').map((a: any) => (
          <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const totalAssetValue = assets.reduce((s: number, a: any) => s + (a.current_value || a.purchase_value || 0), 0);
  const totalCapitalized = capitalizations.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalRetired = retirements.reduce((s: number, r: any) => s + (r.net_book_value || 0), 0);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            {isAr ? 'الأصول الثابتة' : 'Fixed Assets'}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'إدارة الأصول الثابتة - نمط SAP B1' : 'Fixed Assets Management — SAP B1 Style'}</p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="fixed_asset" size="sm" />
        </div>
      </div>

      <SAPSyncProgressBar isLoading={isSyncing} entityLabel={isAr ? 'الأصول الثابتة' : 'Fixed Assets'} result={sapResult} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'إجمالي الأصول' : 'Total Assets'}</p>
          <p className="text-lg font-bold">{assets.length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'إجمالي القيمة' : 'Total Value'}</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(totalAssetValue)}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'الرسملة' : 'Capitalized'}</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalCapitalized)}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'المستبعد' : 'Retired'}</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(totalRetired)}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="master" className="text-xs gap-1"><HardDrive className="h-3 w-3" />{isAr ? 'بيانات الأصول' : 'Asset Master Data'}</TabsTrigger>
          <TabsTrigger value="capitalization" className="text-xs gap-1"><DollarSign className="h-3 w-3" />{isAr ? 'الرسملة' : 'Capitalization'}</TabsTrigger>
          <TabsTrigger value="retirement" className="text-xs gap-1"><RotateCcw className="h-3 w-3" />{isAr ? 'الاستبعاد' : 'Retirement'}</TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs gap-1"><ArrowRightLeft className="h-3 w-3" />{isAr ? 'النقل' : 'Transfer'}</TabsTrigger>
          <TabsTrigger value="manual-dep" className="text-xs gap-1"><TrendingDown className="h-3 w-3" />{isAr ? 'إهلاك يدوي' : 'Manual Depreciation'}</TabsTrigger>
          <TabsTrigger value="dep-run" className="text-xs gap-1"><RefreshCw className="h-3 w-3" />{isAr ? 'تشغيل الإهلاك' : 'Depreciation Run'}</TabsTrigger>
          <TabsTrigger value="revaluation" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />{isAr ? 'إعادة التقييم' : 'Revaluation'}</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1"><ClipboardList className="h-3 w-3" />{isAr ? 'التقارير' : 'Reports'}</TabsTrigger>
        </TabsList>

        {/* Asset Master Data */}
        <TabsContent value="master">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'بيانات الأصول الرئيسية' : 'Asset Master Data'}</CardTitle>
              <SAPSyncButton entity="fixed_asset" size="sm" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{isAr ? 'القسم' : 'Department'}</TableHead>
                    <TableHead>{isAr ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'قيمة الشراء' : 'Purchase Value'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'القيمة الحالية' : 'Current Value'}</TableHead>
                     <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                     <TableHead>{isAr ? 'المزامنة' : 'Sync'}</TableHead>
                     <TableHead>{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetsLoading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">
                        {isAr ? 'جارِ تحميل بيانات الأصول...' : 'Loading asset data...'}
                      </TableCell>
                    </TableRow>
                  )}

                  {!assetsLoading && assetsError && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-xs text-destructive py-6">
                        {isAr ? 'تعذر تحميل الأصول. تحقق من تسجيل الدخول ثم أعد المحاولة.' : 'Could not load assets. Please verify login and retry sync.'}
                      </TableCell>
                    </TableRow>
                  )}

                  {!assetsLoading && !assetsError && assets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">
                        {isAr ? 'لا توجد أصول حالياً. اضغط مزامنة لجلب البيانات من SAP.' : 'No assets yet. Click Sync to pull from SAP.'}
                      </TableCell>
                    </TableRow>
                  )}

                  {!assetsLoading && !assetsError && assets.map((a: any) => (
                    <TableRow key={a.id} className="text-xs">
                      <TableCell className="font-mono">{a.asset_code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.department || '—'}</TableCell>
                      <TableCell>{a.location || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(a.purchase_value)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(a.current_value || a.purchase_value)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                      <TableCell><SyncStatusBadge syncStatus={(a as any).sync_status || 'local'} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-3 w-3" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => sapSync('fixed_asset', 'to_sap', a.id)}>
                              <RefreshCw className="h-3 w-3 mr-2" />{isAr ? 'مزامنة إلى SAP' : 'Sync to SAP'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sapSync('fixed_asset', 'from_sap', a.id)}>
                              <RefreshCw className="h-3 w-3 mr-2" />{isAr ? 'سحب من SAP' : 'Pull from SAP'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capitalization */}
        <TabsContent value="capitalization">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'الرسملة' : 'Capitalizations'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="fixed_asset" size="sm" />
                <Button size="sm" onClick={() => setShowCapDialog(true)}><Plus className="h-3 w-3 mr-1" />{isAr ? 'جديد' : 'New'}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead>{isAr ? 'الأصل' : 'Asset'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{isAr ? 'ملاحظات' : 'Remarks'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {capitalizations.map((c: any) => (
                    <TableRow key={c.id} className="text-xs">
                      <TableCell>{c.assets?.asset_code} - {c.assets?.name}</TableCell>
                      <TableCell>{format(new Date(c.capitalization_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{c.remarks || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusBadge(c.status)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => sapSync('fixed_asset', 'from_sap', c.asset_id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!capitalizations.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد رسملة' : 'No capitalizations'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retirement */}
        <TabsContent value="retirement">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'الاستبعاد' : 'Retirements'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="fixed_asset" size="sm" />
                <Button size="sm" onClick={() => setShowRetireDialog(true)}><Plus className="h-3 w-3 mr-1" />{isAr ? 'جديد' : 'New'}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead>{isAr ? 'الأصل' : 'Asset'}</TableHead>
                  <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'العائد' : 'Proceeds'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'صافي القيمة' : 'NBV'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'الربح/الخسارة' : 'Gain/Loss'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {retirements.map((r: any) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell>{r.assets?.asset_code} - {r.assets?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.retirement_type}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.proceeds)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.net_book_value)}</TableCell>
                      <TableCell className={cn("text-right font-mono", (r.gain_loss || 0) >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatCurrency(r.gain_loss)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => sapSync('fixed_asset', 'from_sap', r.asset_id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!retirements.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا يوجد استبعاد' : 'No retirements'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfer */}
        <TabsContent value="transfer">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'نقل الأصول' : 'Asset Transfers'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="fixed_asset" size="sm" />
                <Button size="sm" onClick={() => setShowTransferDialog(true)}><Plus className="h-3 w-3 mr-1" />{isAr ? 'جديد' : 'New'}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead>{isAr ? 'الأصل' : 'Asset'}</TableHead>
                  <TableHead>{isAr ? 'من القسم' : 'From Dept'}</TableHead>
                  <TableHead>{isAr ? 'إلى القسم' : 'To Dept'}</TableHead>
                  <TableHead>{isAr ? 'من الموقع' : 'From Location'}</TableHead>
                  <TableHead>{isAr ? 'إلى الموقع' : 'To Location'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {transfers.map((t: any) => (
                    <TableRow key={t.id} className="text-xs">
                      <TableCell>{t.assets?.asset_code} - {t.assets?.name}</TableCell>
                      <TableCell>{t.from_department || '—'}</TableCell>
                      <TableCell>{t.to_department || '—'}</TableCell>
                      <TableCell>{t.from_location || '—'}</TableCell>
                      <TableCell>{t.to_location || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusBadge(t.status)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => sapSync('fixed_asset', 'from_sap', t.asset_id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!transfers.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا يوجد نقل' : 'No transfers'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Depreciation */}
        <TabsContent value="manual-dep">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'الإهلاك اليدوي' : 'Manual Depreciation'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="fixed_asset" size="sm" />
                <Button size="sm" onClick={() => setShowManualDepDialog(true)}><Plus className="h-3 w-3 mr-1" />{isAr ? 'جديد' : 'New'}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead>{isAr ? 'الأصل' : 'Asset'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{isAr ? 'السبب' : 'Reason'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {manualDeps.map((d: any) => (
                    <TableRow key={d.id} className="text-xs">
                      <TableCell>{d.assets?.asset_code} - {d.assets?.name}</TableCell>
                      <TableCell>{format(new Date(d.depreciation_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(d.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{d.reason || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusBadge(d.status)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => sapSync('fixed_asset', 'from_sap', d.asset_id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!manualDeps.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isAr ? 'لا يوجد إهلاك يدوي' : 'No manual depreciations'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Depreciation Run */}
        <TabsContent value="dep-run">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'تشغيل الإهلاك' : 'Depreciation Run'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="fixed_asset" size="sm" />
                <Button size="sm" onClick={() => setShowDepRunDialog(true)}><Plus className="h-3 w-3 mr-1" />{isAr ? 'تشغيل جديد' : 'New Run'}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead>{isAr ? 'السنة المالية' : 'Fiscal Year'}</TableHead>
                  <TableHead>{isAr ? 'الفترة' : 'Period'}</TableHead>
                  <TableHead>{isAr ? 'من' : 'From'}</TableHead>
                  <TableHead>{isAr ? 'إلى' : 'To'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'الأصول' : 'Assets'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {depRuns.map((r: any) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell className="font-mono">{r.fiscal_year}</TableCell>
                      <TableCell>{r.period_number}</TableCell>
                      <TableCell>{format(new Date(r.period_from), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(r.period_to), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">{r.total_assets}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => sapSync('fixed_asset', 'from_sap')}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!depRuns.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا يوجد تشغيل' : 'No depreciation runs'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revaluation */}
        <TabsContent value="revaluation">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{isAr ? 'إعادة التقييم' : 'Asset Revaluation'}</CardTitle>
              <div className="flex items-center gap-2">
                <SAPSyncButton entity="fixed_asset" size="sm" />
                <Button size="sm" onClick={() => setShowRevalDialog(true)}><Plus className="h-3 w-3 mr-1" />{isAr ? 'جديد' : 'New'}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead>{isAr ? 'الأصل' : 'Asset'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'القيمة القديمة' : 'Old Value'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'القيمة الجديدة' : 'New Value'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'الفرق' : 'Difference'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {revaluations.map((r: any) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell>{r.assets?.asset_code} - {r.assets?.name}</TableCell>
                      <TableCell>{format(new Date(r.revaluation_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.old_value)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.new_value)}</TableCell>
                      <TableCell className={cn("text-right font-mono", (r.revaluation_difference || 0) >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatCurrency(r.revaluation_difference)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => sapSync('fixed_asset', 'from_sap', r.asset_id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!revaluations.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا يوجد إعادة تقييم' : 'No revaluations'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: isAr ? 'تقرير الأصول' : 'Asset Register', desc: isAr ? 'قائمة جميع الأصول مع القيم' : 'Complete list with values', count: assets.length },
              { title: isAr ? 'تقرير الإهلاك' : 'Depreciation Schedule', desc: isAr ? 'جدول الإهلاك لجميع الأصول' : 'Depreciation schedule for all assets', count: depRuns.length },
              { title: isAr ? 'تقرير الاستبعاد' : 'Retirement Report', desc: isAr ? 'الأصول المستبعدة والأرباح/الخسائر' : 'Retired assets with gain/loss', count: retirements.length },
              { title: isAr ? 'تقرير النقل' : 'Transfer Report', desc: isAr ? 'حركات نقل الأصول' : 'Asset transfer movements', count: transfers.length },
              { title: isAr ? 'تقرير إعادة التقييم' : 'Revaluation Report', desc: isAr ? 'تغييرات قيم الأصول' : 'Asset value changes', count: revaluations.length },
            ].map((r, i) => (
              <Card key={i} className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{r.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">{r.count} {isAr ? 'سجل' : 'records'}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Capitalization Dialog */}
      <Dialog open={showCapDialog} onOpenChange={setShowCapDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'رسملة جديدة' : 'New Capitalization'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{isAr ? 'الأصل' : 'Asset'}</Label>{assetSelector(capForm.asset_id, v => setCapForm(p => ({ ...p, asset_id: v })))}</div>
            <div><Label className="text-xs">{isAr ? 'المبلغ' : 'Amount'}</Label><Input type="number" value={capForm.amount} onChange={e => setCapForm(p => ({ ...p, amount: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">{isAr ? 'ملاحظات' : 'Remarks'}</Label><Textarea value={capForm.remarks} onChange={e => setCapForm(p => ({ ...p, remarks: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createCap.mutate(capForm)} disabled={!capForm.asset_id || !capForm.amount}>{isAr ? 'ترحيل' : 'Post'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retirement Dialog */}
      <Dialog open={showRetireDialog} onOpenChange={setShowRetireDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'استبعاد أصل' : 'Retire Asset'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{isAr ? 'الأصل' : 'Asset'}</Label>{assetSelector(retireForm.asset_id, v => setRetireForm(p => ({ ...p, asset_id: v })))}</div>
            <div><Label className="text-xs">{isAr ? 'النوع' : 'Type'}</Label>
              <Select value={retireForm.retirement_type} onValueChange={v => setRetireForm(p => ({ ...p, retirement_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">{isAr ? 'بيع' : 'Sale'}</SelectItem>
                  <SelectItem value="scrap">{isAr ? 'تخريد' : 'Scrap'}</SelectItem>
                  <SelectItem value="donation">{isAr ? 'تبرع' : 'Donation'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{isAr ? 'العائد' : 'Proceeds'}</Label><Input type="number" value={retireForm.proceeds} onChange={e => setRetireForm(p => ({ ...p, proceeds: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">{isAr ? 'السبب' : 'Reason'}</Label><Textarea value={retireForm.reason} onChange={e => setRetireForm(p => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createRetirement.mutate(retireForm)} disabled={!retireForm.asset_id}>{isAr ? 'ترحيل' : 'Post'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'نقل أصل' : 'Transfer Asset'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{isAr ? 'الأصل' : 'Asset'}</Label>{assetSelector(transferForm.asset_id, v => {
              const asset = assets.find((a: any) => a.id === v);
              setTransferForm(p => ({ ...p, asset_id: v, from_department: asset?.department || '', from_location: asset?.location || '' }));
            })}</div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{isAr ? 'من القسم' : 'From Dept'}</Label><Input value={transferForm.from_department} disabled className="h-8 text-xs" /></div>
              <div><Label className="text-xs">{isAr ? 'إلى القسم' : 'To Dept'}</Label><Input value={transferForm.to_department} onChange={e => setTransferForm(p => ({ ...p, to_department: e.target.value }))} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{isAr ? 'من الموقع' : 'From Location'}</Label><Input value={transferForm.from_location} disabled className="h-8 text-xs" /></div>
              <div><Label className="text-xs">{isAr ? 'إلى الموقع' : 'To Location'}</Label><Input value={transferForm.to_location} onChange={e => setTransferForm(p => ({ ...p, to_location: e.target.value }))} className="h-8 text-xs" /></div>
            </div>
            <div><Label className="text-xs">{isAr ? 'السبب' : 'Reason'}</Label><Textarea value={transferForm.reason} onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createTransfer.mutate(transferForm)} disabled={!transferForm.asset_id}>{isAr ? 'ترحيل' : 'Post'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Depreciation Dialog */}
      <Dialog open={showManualDepDialog} onOpenChange={setShowManualDepDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'إهلاك يدوي' : 'Manual Depreciation'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{isAr ? 'الأصل' : 'Asset'}</Label>{assetSelector(manDepForm.asset_id, v => setManDepForm(p => ({ ...p, asset_id: v })))}</div>
            <div><Label className="text-xs">{isAr ? 'المبلغ' : 'Amount'}</Label><Input type="number" value={manDepForm.amount} onChange={e => setManDepForm(p => ({ ...p, amount: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">{isAr ? 'السبب' : 'Reason'}</Label><Textarea value={manDepForm.reason} onChange={e => setManDepForm(p => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createManualDep.mutate(manDepForm)} disabled={!manDepForm.asset_id || !manDepForm.amount}>{isAr ? 'ترحيل' : 'Post'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Depreciation Run Dialog */}
      <Dialog open={showDepRunDialog} onOpenChange={setShowDepRunDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'تشغيل الإهلاك' : 'Depreciation Run'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{isAr ? 'السنة المالية' : 'Fiscal Year'}</Label><Input type="number" value={depRunForm.fiscal_year} onChange={e => setDepRunForm(p => ({ ...p, fiscal_year: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">{isAr ? 'رقم الفترة' : 'Period #'}</Label><Input type="number" value={depRunForm.period_number} onChange={e => setDepRunForm(p => ({ ...p, period_number: e.target.value }))} className="h-8" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{isAr ? 'من' : 'From'}</Label><Input type="date" value={depRunForm.period_from} onChange={e => setDepRunForm(p => ({ ...p, period_from: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">{isAr ? 'إلى' : 'To'}</Label><Input type="date" value={depRunForm.period_to} onChange={e => setDepRunForm(p => ({ ...p, period_to: e.target.value }))} className="h-8" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => createDepRun.mutate(depRunForm)} disabled={!depRunForm.period_from || !depRunForm.period_to}>{isAr ? 'تشغيل' : 'Run'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revaluation Dialog */}
      <Dialog open={showRevalDialog} onOpenChange={setShowRevalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'إعادة تقييم' : 'Asset Revaluation'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{isAr ? 'الأصل' : 'Asset'}</Label>{assetSelector(revalForm.asset_id, v => setRevalForm(p => ({ ...p, asset_id: v })))}</div>
            <div><Label className="text-xs">{isAr ? 'القيمة الجديدة' : 'New Value'}</Label><Input type="number" value={revalForm.new_value} onChange={e => setRevalForm(p => ({ ...p, new_value: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">{isAr ? 'السبب' : 'Reason'}</Label><Textarea value={revalForm.reason} onChange={e => setRevalForm(p => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createRevaluation.mutate(revalForm)} disabled={!revalForm.asset_id || !revalForm.new_value}>{isAr ? 'ترحيل' : 'Post'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
