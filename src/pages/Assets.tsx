import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import {
  Search, Plus, MoreVertical, Monitor, Laptop, Server, Printer, Package,
  CheckCircle, Clock, XCircle, Wrench, QrCode, ArrowRightLeft, Eye, Trash2, Edit, RotateCcw, AlertTriangle,
  TrendingDown, DollarSign, BarChart3, PieChart, Calendar, Shield, Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAssets } from '@/hooks/useAssets';
import { AssetFormDialog } from '@/components/assets/AssetFormDialog';
import { AssetDetailsDialog } from '@/components/assets/AssetDetailsDialog';
import { AssetQRPrint } from '@/components/assets/AssetQRPrint';
import type { Asset, AssetPurchaseRequest } from '@/hooks/useAssets';
import { format, differenceInMonths, differenceInDays } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { BulkDepreciationDialog } from '@/components/assets/BulkDepreciationDialog';

const assetColumns: ColumnDef[] = [
  { key: 'asset_code', header: 'Asset Code' },
  { key: 'name', header: 'Name' },
  { key: 'serial_number', header: 'Serial Number' },
  { key: 'status', header: 'Status' },
  { key: 'department', header: 'Department' },
  { key: 'location', header: 'Location' },
  { key: 'purchase_value', header: 'Purchase Value' },
  { key: 'current_value', header: 'Current Value' },
  { key: 'purchase_date', header: 'Purchase Date' },
];

const statusColors: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_transfer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  disposed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  purchased: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  returned: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  requested: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const prStatusColors: Record<string, string> = {
  pending_manager: 'bg-amber-100 text-amber-700',
  pending_head_manager: 'bg-amber-100 text-amber-700',
  pending_it_manager: 'bg-blue-100 text-blue-700',
  pending_finance_manager: 'bg-purple-100 text-purple-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-cyan-100 text-cyan-700',
  draft: 'bg-gray-100 text-gray-700',
};

const categoryIcons: Record<string, React.ReactNode> = {
  Laptop: <Laptop className="h-5 w-5" />,
  Desktop: <Monitor className="h-5 w-5" />,
  Server: <Server className="h-5 w-5" />,
  Printer: <Printer className="h-5 w-5" />,
};

// Calculate depreciation
function calcDepreciation(asset: Asset) {
  if (!asset.purchase_date || !asset.purchase_value) return null;
  const usefulLife = (asset as any).useful_life_years || 5;
  const salvage = (asset as any).salvage_value || 0;
  const method = asset.depreciation_method || 'straight_line';
  const purchaseDate = new Date(asset.purchase_date);
  const now = new Date();
  const monthsElapsed = Math.max(0, differenceInMonths(now, purchaseDate));
  const totalMonths = usefulLife * 12;

  let accumulatedDep = 0;
  let annualDep = 0;
  let monthlyDep = 0;

  if (method === 'straight_line') {
    annualDep = (asset.purchase_value - salvage) / usefulLife;
    monthlyDep = annualDep / 12;
    accumulatedDep = Math.min(monthlyDep * monthsElapsed, asset.purchase_value - salvage);
  } else if (method === 'declining_balance') {
    const rate = (asset.depreciation_rate || 20) / 100;
    let value = asset.purchase_value;
    const yearsElapsed = Math.floor(monthsElapsed / 12);
    for (let i = 0; i < yearsElapsed && value > salvage; i++) {
      const dep = value * rate;
      accumulatedDep += dep;
      value -= dep;
    }
    const partialMonths = monthsElapsed % 12;
    if (value > salvage && partialMonths > 0) {
      accumulatedDep += (value * rate / 12) * partialMonths;
    }
    accumulatedDep = Math.min(accumulatedDep, asset.purchase_value - salvage);
    annualDep = value * rate;
    monthlyDep = annualDep / 12;
  }

  const netBookValue = asset.purchase_value - accumulatedDep;
  const depPercent = ((accumulatedDep / (asset.purchase_value - salvage)) * 100);
  const remainingLife = Math.max(0, totalMonths - monthsElapsed);

  return {
    annualDep: Math.round(annualDep),
    monthlyDep: Math.round(monthlyDep),
    accumulatedDep: Math.round(accumulatedDep),
    netBookValue: Math.round(netBookValue),
    depPercent: Math.min(100, Math.round(depPercent)),
    remainingMonths: remainingLife,
    usefulLife,
    salvage,
    method,
  };
}

export default function Assets() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const {
    categories, assets, assetsLoading, purchaseRequests, assignments, transfers,
    maintenanceRecords, disposals,
    createAsset, updateAsset, deleteAsset, createPurchaseRequest,
    approvePurchaseRequest, rejectPurchaseRequest,
    createAssignment, returnAssignment,
    createTransfer, completeTransfer,
    createMaintenance, completeMaintenance,
    createDisposal,
  } = useAssets();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dialog states
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [detailsAsset, setDetailsAsset] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [depAsset, setDepAsset] = useState<Asset | null>(null);
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [disposalDialogOpen, setDisposalDialogOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [showBulkDep, setShowBulkDep] = useState(false);

  // Simple form states
  const [prForm, setPrForm] = useState({ title: '', description: '', department: '', category_id: '', quantity: '1', estimated_cost: '', priority: 'medium', justification: '' });
  const [assignForm, setAssignForm] = useState({ assigned_to_user_name: '', assigned_to_department: '', expected_return_date: '', handover_notes: '', condition_at_assignment: 'good' });
  const [transferForm, setTransferForm] = useState({ from_user_name: '', from_department: '', from_location: '', to_user_name: '', to_department: '', to_location: '', reason: '' });
  const [maintForm, setMaintForm] = useState({ maintenance_type: 'corrective', issue_description: '', priority: 'medium', vendor_service_provider: '', cost: '', assigned_to: '' });
  const [disposalForm, setDisposalForm] = useState({ disposal_type: 'obsolete', disposal_reason: '', residual_value: '' });

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const formatCurrency = (v: number | null) => v != null ? new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v) : '-';

  const filteredAssets = useMemo(() => assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.asset_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesCat = categoryFilter === 'all' || a.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  }), [assets, searchQuery, statusFilter, categoryFilter]);

  // Enhanced Stats
  const stats = useMemo(() => {
    const totalValue = assets.reduce((s, a) => s + (a.purchase_value || 0), 0);
    const totalCurrentValue = assets.reduce((s, a) => s + (a.current_value || 0), 0);
    const totalDepreciation = assets.reduce((s, a) => {
      const dep = calcDepreciation(a);
      return s + (dep?.accumulatedDep || 0);
    }, 0);
    const totalNBV = assets.reduce((s, a) => {
      const dep = calcDepreciation(a);
      return s + (dep?.netBookValue || a.current_value || 0);
    }, 0);
    const maintenanceCost = maintenanceRecords.reduce((s, m) => s + (m.cost || 0), 0);

    const warrantyExpiring = assets.filter(a => {
      if (!a.warranty_end) return false;
      const diff = (new Date(a.warranty_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length;

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    assets.forEach(a => {
      const catName = a.asset_categories?.name || 'Uncategorized';
      byCategory[catName] = (byCategory[catName] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      const dept = a.department || 'Unassigned';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    return {
      total: assets.length,
      available: byStatus['available'] || 0,
      assigned: byStatus['assigned'] || 0,
      maintenance: byStatus['under_maintenance'] || 0,
      disposed: byStatus['disposed'] || 0,
      totalValue,
      totalCurrentValue,
      totalDepreciation,
      totalNBV,
      maintenanceCost,
      warrantyExpiring,
      pendingPRs: purchaseRequests.filter(p => !['approved', 'rejected', 'converted'].includes(p.status)).length,
      byCategory,
      byStatus,
      byDepartment,
    };
  }, [assets, maintenanceRecords, purchaseRequests]);

  // Handlers
  const handleSaveAsset = async (data: Record<string, any>) => {
    try {
      if (data.id) {
        await updateAsset.mutateAsync(data);
        toast({ title: t('Success', 'نجاح'), description: t('Asset updated', 'تم تحديث الأصل') });
      } else {
        await createAsset.mutateAsync(data);
        toast({ title: t('Success', 'نجاح'), description: t('Asset registered', 'تم تسجيل الأصل') });
      }
      setEditingAsset(null);
    } catch (e: any) {
      toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' });
    }
  };

  const handleCreatePR = async () => {
    try {
      await createPurchaseRequest.mutateAsync({
        title: prForm.title, description: prForm.description || null, department: prForm.department || null,
        category_id: prForm.category_id || null, quantity: parseInt(prForm.quantity) || 1,
        estimated_cost: parseFloat(prForm.estimated_cost) || 0, priority: prForm.priority, justification: prForm.justification || null,
      });
      setPrDialogOpen(false);
      setPrForm({ title: '', description: '', department: '', category_id: '', quantity: '1', estimated_cost: '', priority: 'medium', justification: '' });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleAssign = async () => {
    try {
      await createAssignment.mutateAsync({ asset_id: selectedAssetId, ...assignForm, assigned_to_user_name: assignForm.assigned_to_user_name || null, assigned_to_department: assignForm.assigned_to_department || null, expected_return_date: assignForm.expected_return_date || null, handover_notes: assignForm.handover_notes || null });
      setAssignDialogOpen(false);
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleTransfer = async () => {
    try {
      await createTransfer.mutateAsync({ asset_id: selectedAssetId, from_user_name: transferForm.from_user_name || null, from_department: transferForm.from_department || null, from_location: transferForm.from_location || null, to_user_name: transferForm.to_user_name || null, to_department: transferForm.to_department || null, to_location: transferForm.to_location || null, reason: transferForm.reason || null });
      setTransferDialogOpen(false);
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleMaintenance = async () => {
    try {
      await createMaintenance.mutateAsync({ asset_id: selectedAssetId, maintenance_type: maintForm.maintenance_type, issue_description: maintForm.issue_description || null, priority: maintForm.priority, vendor_service_provider: maintForm.vendor_service_provider || null, cost: parseFloat(maintForm.cost) || 0, assigned_to: maintForm.assigned_to || null });
      setMaintenanceDialogOpen(false);
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleDisposal = async () => {
    try {
      await createDisposal.mutateAsync({ asset_id: selectedAssetId, disposal_type: disposalForm.disposal_type, disposal_reason: disposalForm.disposal_reason || null, residual_value: parseFloat(disposalForm.residual_value) || 0 });
      setDisposalDialogOpen(false);
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const getCategoryIcon = (catName: string | undefined) => categoryIcons[catName || ''] || <Package className="h-5 w-5" />;

  const depInfo = depAsset ? calcDepreciation(depAsset) : null;

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Asset Management', 'إدارة الأصول')}</h1>
          <p className="text-sm text-muted-foreground">{t('Full lifecycle tracking, depreciation & reporting', 'تتبع دورة حياة الأصول والاستهلاك والتقارير')}</p>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const m = getModuleById('assets'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <ExportImportButtons
            data={filteredAssets}
            columns={assetColumns}
            filename="assets"
            title="Asset Master Data"
          />
          <SAPSyncButton entity="fixed_asset" />
          <Button onClick={() => setShowBulkDep(true)} size="sm" variant="outline">
            <TrendingDown className="h-4 w-4 mr-1" />
            {t('Run Depreciation', 'تشغيل الإهلاك')}
          </Button>
        </div>
      </div>

      <BulkDepreciationDialog open={showBulkDep} onOpenChange={setShowBulkDep} assets={assets} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: Package, label: t('Total Assets', 'إجمالي الأصول'), value: stats.total, color: 'text-foreground' },
          { icon: DollarSign, label: t('Purchase Value', 'قيمة الشراء'), value: formatCurrency(stats.totalValue), color: 'text-primary' },
          { icon: TrendingDown, label: t('Depreciation', 'الاستهلاك'), value: formatCurrency(stats.totalDepreciation), color: 'text-amber-600' },
          { icon: BarChart3, label: t('Net Book Value', 'صافي القيمة'), value: formatCurrency(stats.totalNBV), color: 'text-emerald-600' },
          { icon: Wrench, label: t('Maint. Cost', 'تكلفة الصيانة'), value: formatCurrency(stats.maintenanceCost), color: 'text-orange-600' },
          { icon: AlertTriangle, label: t('Warranty Alert', 'تنبيه ضمان'), value: stats.warrantyExpiring, color: 'text-red-600' },
        ].map((s, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><BarChart3 className="h-3 w-3 mr-1" />{t('Dashboard', 'لوحة')}</TabsTrigger>
          <TabsTrigger value="assets"><Package className="h-3 w-3 mr-1" />{t('Assets', 'الأصول')}</TabsTrigger>
          <TabsTrigger value="depreciation"><TrendingDown className="h-3 w-3 mr-1" />{t('Depreciation', 'الاستهلاك')}</TabsTrigger>
          <TabsTrigger value="purchase-requests">{t('Purchase Requests', 'طلبات الشراء')}</TabsTrigger>
          <TabsTrigger value="assignments">{t('Assignments', 'التخصيصات')}</TabsTrigger>
          <TabsTrigger value="transfers">{t('Transfers', 'التحويلات')}</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-3 w-3 mr-1" />{t('Maintenance', 'الصيانة')}</TabsTrigger>
          <TabsTrigger value="disposals">{t('Disposals', 'التخلص')}</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* By Status */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Status Distribution', 'توزيع الحالات')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.byStatus).map(([s, count]) => (
                  <div key={s} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[s] || 'bg-muted'} variant="secondary">{s.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{count}</span>
                      <span className="text-[10px] text-muted-foreground">({stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* By Category */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('By Category', 'حسب الفئة')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.byCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span>{cat}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(count / (stats.total || 1)) * 100} className="w-16 h-2" />
                      <span className="font-bold w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* By Department */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('By Department', 'حسب القسم')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.byDepartment).slice(0, 8).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between text-sm">
                    <span className="truncate">{dept}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Warranty Alerts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  {t('Warranty Expiring', 'انتهاء الضمان')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assets.filter(a => {
                  if (!a.warranty_end) return false;
                  const diff = (new Date(a.warranty_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                  return diff > 0 && diff <= 90;
                }).slice(0, 6).map(a => {
                  const daysLeft = Math.round((new Date(a.warranty_end!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-xs">{a.asset_code}</span>
                      <Badge variant={daysLeft <= 30 ? 'destructive' : 'secondary'} className="text-[10px]">{daysLeft}d left</Badge>
                    </div>
                  );
                })}
                {stats.warrantyExpiring === 0 && <p className="text-sm text-muted-foreground">{t('No alerts', 'لا تنبيهات')}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Recent Maintenance', 'الصيانة الأخيرة')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {maintenanceRecords.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <div>
                      <span className="font-mono text-xs">{m.maintenance_code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{m.assets?.name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{formatCurrency(m.cost)}</span>
                      <Badge className={m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} variant="secondary">{m.status}</Badge>
                    </div>
                  </div>
                ))}
                {maintenanceRecords.length === 0 && <p className="text-sm text-muted-foreground">{t('No records', 'لا سجلات')}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Financial Summary', 'الملخص المالي')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: t('Total Purchase Value', 'إجمالي قيمة الشراء'), value: formatCurrency(stats.totalValue), color: 'text-primary' },
                    { label: t('Accumulated Depreciation', 'الاستهلاك المتراكم'), value: formatCurrency(stats.totalDepreciation), color: 'text-amber-600' },
                    { label: t('Net Book Value', 'صافي القيمة الدفترية'), value: formatCurrency(stats.totalNBV), color: 'text-emerald-600' },
                    { label: t('Total Maintenance Cost', 'إجمالي تكلفة الصيانة'), value: formatCurrency(stats.maintenanceCost), color: 'text-orange-600' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {stats.totalValue > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{t('Depreciation Progress', 'تقدم الاستهلاك')}</span>
                      <span>{Math.round((stats.totalDepreciation / stats.totalValue) * 100)}%</span>
                    </div>
                    <Progress value={(stats.totalDepreciation / stats.totalValue) * 100} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ASSETS */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('Search...', 'بحث...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Status', 'كل الحالات')}</SelectItem>
                  {['available', 'assigned', 'under_maintenance', 'in_transfer', 'disposed'].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Categories', 'كل الفئات')}</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditingAsset(null); setAssetFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />{t('Register Asset', 'تسجيل أصل')}
            </Button>
          </div>

          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Code', 'الكود')}</th>
                    <th>{t('Name', 'الاسم')}</th>
                    <th>{t('Category', 'الفئة')}</th>
                    <th>{t('Status', 'الحالة')}</th>
                    <th>{t('Location', 'الموقع')}</th>
                    <th>{t('Purchase Value', 'قيمة الشراء')}</th>
                    <th>{t('Net Book Value', 'صافي القيمة')}</th>
                    <th>{t('Actions', 'الإجراءات')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(asset => {
                    const dep = calcDepreciation(asset);
                    return (
                      <tr key={asset.id}>
                        <td><span className="font-mono text-sm">{asset.asset_code}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                              {getCategoryIcon(asset.asset_categories?.name)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{asset.name}</p>
                              {asset.serial_number && <p className="text-xs text-muted-foreground">{asset.serial_number}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{asset.asset_categories?.name || '-'}</td>
                        <td><Badge className={statusColors[asset.status] || 'bg-muted'}>{asset.status.replace(/_/g, ' ')}</Badge></td>
                        <td className="text-sm">{asset.location || '-'}</td>
                        <td className="text-sm">{formatCurrency(asset.purchase_value)}</td>
                        <td className="text-sm font-medium">{dep ? formatCurrency(dep.netBookValue) : formatCurrency(asset.current_value)}</td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailsAsset(asset)}><Eye className="h-4 w-4 mr-2" />{t('View', 'عرض')}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingAsset(asset); setAssetFormOpen(true); }}><Edit className="h-4 w-4 mr-2" />{t('Edit', 'تعديل')}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDepAsset(asset)}><TrendingDown className="h-4 w-4 mr-2" />{t('Depreciation', 'الاستهلاك')}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setQrAsset(asset)}><QrCode className="h-4 w-4 mr-2" />{t('QR Code', 'رمز QR')}</DropdownMenuItem>
                              {asset.status === 'available' && <DropdownMenuItem onClick={() => { setSelectedAssetId(asset.id); setAssignDialogOpen(true); }}><CheckCircle className="h-4 w-4 mr-2" />{t('Assign', 'تخصيص')}</DropdownMenuItem>}
                              {(asset.status === 'assigned' || asset.status === 'available') && <DropdownMenuItem onClick={() => { setSelectedAssetId(asset.id); setTransferDialogOpen(true); }}><ArrowRightLeft className="h-4 w-4 mr-2" />{t('Transfer', 'تحويل')}</DropdownMenuItem>}
                              {asset.status !== 'disposed' && asset.status !== 'under_maintenance' && <DropdownMenuItem onClick={() => { setSelectedAssetId(asset.id); setMaintenanceDialogOpen(true); }}><Wrench className="h-4 w-4 mr-2" />{t('Maintenance', 'صيانة')}</DropdownMenuItem>}
                              {asset.status !== 'disposed' && <DropdownMenuItem onClick={() => { setSelectedAssetId(asset.id); setDisposalDialogOpen(true); }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t('Dispose', 'تخلص')}</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAssets.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t('No assets found', 'لا توجد أصول')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* DEPRECIATION */}
        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Depreciation Schedule', 'جدول الاستهلاك')}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Asset', 'الأصل')}</th>
                      <th>{t('Method', 'الطريقة')}</th>
                      <th>{t('Purchase Value', 'قيمة الشراء')}</th>
                      <th>{t('Useful Life', 'العمر')}</th>
                      <th>{t('Annual Dep.', 'الاستهلاك السنوي')}</th>
                      <th>{t('Accumulated', 'المتراكم')}</th>
                      <th>{t('Net Book Value', 'صافي القيمة')}</th>
                      <th>{t('Progress', 'التقدم')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.filter(a => a.purchase_value && a.status !== 'disposed').map(asset => {
                      const dep = calcDepreciation(asset);
                      if (!dep) return null;
                      return (
                        <tr key={asset.id}>
                          <td>
                            <div>
                              <p className="font-medium text-sm">{asset.asset_code}</p>
                              <p className="text-xs text-muted-foreground">{asset.name}</p>
                            </div>
                          </td>
                          <td className="text-xs capitalize">{dep.method.replace(/_/g, ' ')}</td>
                          <td className="text-sm">{formatCurrency(asset.purchase_value)}</td>
                          <td className="text-sm">{dep.usefulLife} {t('yrs', 'سنة')}</td>
                          <td className="text-sm">{formatCurrency(dep.annualDep)}</td>
                          <td className="text-sm text-amber-600">{formatCurrency(dep.accumulatedDep)}</td>
                          <td className="text-sm font-bold text-emerald-600">{formatCurrency(dep.netBookValue)}</td>
                          <td className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={dep.depPercent} className="h-2 flex-1" />
                              <span className="text-[10px] text-muted-foreground w-8">{dep.depPercent}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PURCHASE REQUESTS */}
        <TabsContent value="purchase-requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPrDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />{t('New Purchase Request', 'طلب شراء جديد')}</Button>
          </div>
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Code', 'الكود')}</th><th>{t('Title', 'العنوان')}</th><th>{t('Dept', 'القسم')}</th>
                    <th>{t('Qty', 'الكمية')}</th><th>{t('Cost', 'التكلفة')}</th><th>{t('Priority', 'الأولوية')}</th>
                    <th>{t('Status', 'الحالة')}</th><th>{t('Approvals', 'الموافقات')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequests.map(pr => (
                    <tr key={pr.id}>
                      <td className="font-mono text-sm">{pr.request_code}</td>
                      <td className="font-medium text-sm">{pr.title}</td>
                      <td className="text-sm">{pr.department || '-'}</td>
                      <td className="text-sm">{pr.quantity}</td>
                      <td className="text-sm">{formatCurrency(pr.estimated_cost)}</td>
                      <td><Badge variant="outline" className="capitalize">{pr.priority}</Badge></td>
                      <td><Badge className={prStatusColors[pr.status] || 'bg-muted'}>{pr.status.replace(/_/g, ' ')}</Badge></td>
                      <td>
                        <div className="flex gap-1">
                          {[
                            { key: 'manager', label: 'M', status: pr.manager_status },
                            { key: 'head_manager', label: 'HM', status: pr.head_manager_status },
                            { key: 'it_manager', label: 'IT', status: pr.it_manager_status },
                            { key: 'finance_manager', label: 'F', status: pr.finance_manager_status },
                          ].map(step => (
                            <div key={step.key} className="flex flex-col items-center" title={step.key.replace(/_/g, ' ')}>
                              {step.status === 'approved' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : step.status === 'rejected' ? <XCircle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                              <span className="text-[10px] text-muted-foreground">{step.label}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {purchaseRequests.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t('No requests', 'لا طلبات')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ASSIGNMENTS */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>{t('Asset', 'الأصل')}</th><th>{t('Assigned To', 'مخصص لـ')}</th><th>{t('Department', 'القسم')}</th><th>{t('Date', 'التاريخ')}</th><th>{t('Return', 'الإرجاع')}</th><th>{t('Status', 'الحالة')}</th><th>{t('Actions', 'الإجراءات')}</th></tr></thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td className="text-sm">{a.assets?.asset_code} - {a.assets?.name}</td>
                      <td className="text-sm">{a.employees ? `${a.employees.first_name} ${a.employees.last_name}` : a.assigned_to_user_name || '-'}</td>
                      <td className="text-sm">{a.assigned_to_department || '-'}</td>
                      <td className="text-sm">{a.assignment_date}</td>
                      <td className="text-sm">{a.expected_return_date || '-'}</td>
                      <td><Badge className={a.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>{a.status}</Badge></td>
                      <td>{a.status === 'active' && <Button size="sm" variant="outline" onClick={async () => { try { await returnAssignment.mutateAsync({ id: a.id, asset_id: a.asset_id }); toast({ title: t('Success', 'نجاح') }); } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); } }}><RotateCcw className="h-3 w-3 mr-1" />{t('Return', 'إرجاع')}</Button>}</td>
                    </tr>
                  ))}
                  {assignments.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{t('No assignments', 'لا تخصيصات')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TRANSFERS */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>{t('Code', 'الكود')}</th><th>{t('Asset', 'الأصل')}</th><th>{t('From', 'من')}</th><th>{t('To', 'إلى')}</th><th>{t('Reason', 'السبب')}</th><th>{t('Status', 'الحالة')}</th><th>{t('Actions', 'الإجراءات')}</th></tr></thead>
                <tbody>
                  {transfers.map(tr => (
                    <tr key={tr.id}>
                      <td className="font-mono text-sm">{tr.transfer_code}</td>
                      <td className="text-sm">{tr.assets?.asset_code} - {tr.assets?.name}</td>
                      <td className="text-sm">{tr.from_user_name || tr.from_department || '-'}</td>
                      <td className="text-sm">{tr.to_user_name || tr.to_department || '-'}</td>
                      <td className="text-sm">{tr.reason || '-'}</td>
                      <td><Badge className={tr.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{tr.status}</Badge></td>
                      <td>{tr.status === 'pending' && <Button size="sm" variant="outline" onClick={async () => { try { await completeTransfer.mutateAsync({ id: tr.id, asset_id: tr.asset_id, to_location: tr.to_location, to_department: tr.to_department }); toast({ title: t('Success', 'نجاح') }); } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); } }}><CheckCircle className="h-3 w-3 mr-1" />{t('Complete', 'إكمال')}</Button>}</td>
                    </tr>
                  ))}
                  {transfers.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{t('No transfers', 'لا تحويلات')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* MAINTENANCE */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>{t('Code', 'الكود')}</th><th>{t('Asset', 'الأصل')}</th><th>{t('Type', 'النوع')}</th><th>{t('Priority', 'الأولوية')}</th><th>{t('Vendor', 'المورد')}</th><th>{t('Cost', 'التكلفة')}</th><th>{t('Status', 'الحالة')}</th><th>{t('Actions', 'الإجراءات')}</th></tr></thead>
                <tbody>
                  {maintenanceRecords.map(m => (
                    <tr key={m.id}>
                      <td className="font-mono text-sm">{m.maintenance_code}</td>
                      <td className="text-sm">{m.assets?.asset_code} - {m.assets?.name}</td>
                      <td className="text-sm capitalize">{m.maintenance_type}</td>
                      <td><Badge variant="outline" className="capitalize">{m.priority}</Badge></td>
                      <td className="text-sm">{m.vendor_service_provider || '-'}</td>
                      <td className="text-sm">{formatCurrency(m.cost)}</td>
                      <td><Badge className={m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>{m.status}</Badge></td>
                      <td>{(m.status === 'open' || m.status === 'in_progress') && <Button size="sm" variant="outline" onClick={async () => { try { await completeMaintenance.mutateAsync({ id: m.id, asset_id: m.asset_id, cost: m.cost }); toast({ title: t('Success', 'نجاح') }); } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); } }}><CheckCircle className="h-3 w-3 mr-1" />{t('Complete', 'إكمال')}</Button>}</td>
                    </tr>
                  ))}
                  {maintenanceRecords.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t('No records', 'لا سجلات')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* DISPOSALS */}
        <TabsContent value="disposals" className="space-y-4">
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>{t('Asset', 'الأصل')}</th><th>{t('Type', 'النوع')}</th><th>{t('Reason', 'السبب')}</th><th>{t('Date', 'التاريخ')}</th><th>{t('Residual', 'المتبقي')}</th><th>{t('Status', 'الحالة')}</th></tr></thead>
                <tbody>
                  {disposals.map(d => (
                    <tr key={d.id}>
                      <td className="text-sm">{d.assets?.asset_code} - {d.assets?.name}</td>
                      <td className="text-sm capitalize">{d.disposal_type}</td>
                      <td className="text-sm">{d.disposal_reason || '-'}</td>
                      <td className="text-sm">{d.disposal_date}</td>
                      <td className="text-sm">{formatCurrency(d.residual_value)}</td>
                      <td><Badge className={d.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{d.status}</Badge></td>
                    </tr>
                  ))}
                  {disposals.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t('No disposals', 'لا يوجد')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}
      <AssetFormDialog open={assetFormOpen} onOpenChange={setAssetFormOpen} asset={editingAsset} categories={categories} onSave={handleSaveAsset} />
      <AssetDetailsDialog open={!!detailsAsset} onOpenChange={() => setDetailsAsset(null)} asset={detailsAsset} />
      <AssetQRPrint open={!!qrAsset} onOpenChange={() => setQrAsset(null)} asset={qrAsset} />

      {/* Depreciation Detail Dialog */}
      <Dialog open={!!depAsset} onOpenChange={() => setDepAsset(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{t('Depreciation Details', 'تفاصيل الاستهلاك')}</DialogTitle></DialogHeader>
          {depAsset && depInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                  {getCategoryIcon(depAsset.asset_categories?.name)}
                </div>
                <div>
                  <p className="font-bold">{depAsset.asset_code} — {depAsset.name}</p>
                  <p className="text-xs text-muted-foreground">{depAsset.serial_number || 'No S/N'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('Purchase Value', 'قيمة الشراء'), value: formatCurrency(depAsset.purchase_value) },
                  { label: t('Salvage Value', 'القيمة الإنقاذية'), value: formatCurrency(depInfo.salvage) },
                  { label: t('Method', 'الطريقة'), value: depInfo.method.replace(/_/g, ' ') },
                  { label: t('Useful Life', 'العمر الإنتاجي'), value: `${depInfo.usefulLife} years` },
                  { label: t('Annual Depreciation', 'الاستهلاك السنوي'), value: formatCurrency(depInfo.annualDep) },
                  { label: t('Monthly Depreciation', 'الاستهلاك الشهري'), value: formatCurrency(depInfo.monthlyDep) },
                ].map((item, i) => (
                  <div key={i} className="p-2 border rounded">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-sm">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Accumulated Depreciation', 'الاستهلاك المتراكم')}</span>
                  <span className="font-bold text-amber-600">{formatCurrency(depInfo.accumulatedDep)}</span>
                </div>
                <Progress value={depInfo.depPercent} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{depInfo.depPercent}% {t('depreciated', 'مستهلك')}</span>
                  <span>{Math.round(depInfo.remainingMonths / 12)} {t('years remaining', 'سنة متبقية')}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/20 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-sm">{t('Net Book Value', 'صافي القيمة الدفترية')}</span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(depInfo.netBookValue)}</span>
              </div>
            </div>
          )}
          {depAsset && !depInfo && <p className="text-center py-8 text-muted-foreground">{t('No purchase data available', 'لا تتوفر بيانات شراء')}</p>}
        </DialogContent>
      </Dialog>

      {/* Purchase Request Dialog */}
      <Dialog open={prDialogOpen} onOpenChange={setPrDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{t('New Asset Purchase Request', 'طلب شراء أصل جديد')}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1"><Label>{t('Title', 'العنوان')} *</Label><Input value={prForm.title} onChange={e => setPrForm({ ...prForm, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('Description', 'الوصف')}</Label><Textarea value={prForm.description} onChange={e => setPrForm({ ...prForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('Department', 'القسم')}</Label><Input value={prForm.department} onChange={e => setPrForm({ ...prForm, department: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>{t('Category', 'الفئة')}</Label>
                <Select value={prForm.category_id} onValueChange={v => setPrForm({ ...prForm, category_id: v })}><SelectTrigger><SelectValue placeholder={t('Select', 'اختر')} /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>{t('Qty', 'الكمية')}</Label><Input type="number" value={prForm.quantity} onChange={e => setPrForm({ ...prForm, quantity: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('Cost', 'التكلفة')}</Label><Input type="number" value={prForm.estimated_cost} onChange={e => setPrForm({ ...prForm, estimated_cost: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>{t('Priority', 'الأولوية')}</Label>
                <Select value={prForm.priority} onValueChange={v => setPrForm({ ...prForm, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">{t('Low', 'منخفض')}</SelectItem><SelectItem value="medium">{t('Medium', 'متوسط')}</SelectItem><SelectItem value="high">{t('High', 'عالي')}</SelectItem><SelectItem value="urgent">{t('Urgent', 'عاجل')}</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="space-y-1"><Label>{t('Justification', 'المبرر')}</Label><Textarea value={prForm.justification} onChange={e => setPrForm({ ...prForm, justification: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPrDialogOpen(false)}>{t('Cancel', 'إلغاء')}</Button><Button onClick={handleCreatePR} disabled={!prForm.title}>{t('Submit', 'إرسال')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>{t('Assign Asset', 'تخصيص الأصل')}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1"><Label>{t('Assigned To', 'مخصص لـ')} *</Label><Input value={assignForm.assigned_to_user_name} onChange={e => setAssignForm({ ...assignForm, assigned_to_user_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('Department', 'القسم')}</Label><Input value={assignForm.assigned_to_department} onChange={e => setAssignForm({ ...assignForm, assigned_to_department: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('Expected Return', 'الإرجاع المتوقع')}</Label><Input type="date" value={assignForm.expected_return_date} onChange={e => setAssignForm({ ...assignForm, expected_return_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('Notes', 'ملاحظات')}</Label><Textarea value={assignForm.handover_notes} onChange={e => setAssignForm({ ...assignForm, handover_notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAssignDialogOpen(false)}>{t('Cancel', 'إلغاء')}</Button><Button onClick={handleAssign} disabled={!assignForm.assigned_to_user_name}>{t('Assign', 'تخصيص')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{t('Transfer Asset', 'تحويل الأصل')}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('From User', 'من')}</Label><Input value={transferForm.from_user_name} onChange={e => setTransferForm({ ...transferForm, from_user_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('To User', 'إلى')}</Label><Input value={transferForm.to_user_name} onChange={e => setTransferForm({ ...transferForm, to_user_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('From Dept', 'من القسم')}</Label><Input value={transferForm.from_department} onChange={e => setTransferForm({ ...transferForm, from_department: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('To Dept', 'إلى القسم')}</Label><Input value={transferForm.to_department} onChange={e => setTransferForm({ ...transferForm, to_department: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('From Location', 'من الموقع')}</Label><Input value={transferForm.from_location} onChange={e => setTransferForm({ ...transferForm, from_location: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('To Location', 'إلى الموقع')}</Label><Input value={transferForm.to_location} onChange={e => setTransferForm({ ...transferForm, to_location: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>{t('Reason', 'السبب')}</Label><Textarea value={transferForm.reason} onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTransferDialogOpen(false)}>{t('Cancel', 'إلغاء')}</Button><Button onClick={handleTransfer}>{t('Create Transfer', 'إنشاء تحويل')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{t('Maintenance Request', 'طلب صيانة')}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('Type', 'النوع')}</Label>
                <Select value={maintForm.maintenance_type} onValueChange={v => setMaintForm({ ...maintForm, maintenance_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">{t('Corrective', 'تصحيحي')}</SelectItem><SelectItem value="preventive">{t('Preventive', 'وقائي')}</SelectItem><SelectItem value="upgrade">{t('Upgrade', 'ترقية')}</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1">
                <Label>{t('Priority', 'الأولوية')}</Label>
                <Select value={maintForm.priority} onValueChange={v => setMaintForm({ ...maintForm, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">{t('Low', 'منخفض')}</SelectItem><SelectItem value="medium">{t('Medium', 'متوسط')}</SelectItem><SelectItem value="high">{t('High', 'عالي')}</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="space-y-1"><Label>{t('Issue', 'المشكلة')}</Label><Textarea value={maintForm.issue_description} onChange={e => setMaintForm({ ...maintForm, issue_description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('Vendor', 'المورد')}</Label><Input value={maintForm.vendor_service_provider} onChange={e => setMaintForm({ ...maintForm, vendor_service_provider: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('Cost', 'التكلفة')}</Label><Input type="number" value={maintForm.cost} onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>{t('Cancel', 'إلغاء')}</Button><Button onClick={handleMaintenance}>{t('Submit', 'إرسال')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disposal Dialog */}
      <Dialog open={disposalDialogOpen} onOpenChange={setDisposalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{t('Dispose Asset', 'التخلص من الأصل')}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>{t('Disposal Type', 'نوع التخلص')}</Label>
              <Select value={disposalForm.disposal_type} onValueChange={v => setDisposalForm({ ...disposalForm, disposal_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="obsolete">{t('Obsolete', 'متقادم')}</SelectItem><SelectItem value="sold">{t('Sold', 'مباع')}</SelectItem><SelectItem value="donated">{t('Donated', 'تبرع')}</SelectItem><SelectItem value="scrapped">{t('Scrapped', 'تالف')}</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1"><Label>{t('Reason', 'السبب')}</Label><Textarea value={disposalForm.disposal_reason} onChange={e => setDisposalForm({ ...disposalForm, disposal_reason: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t('Residual Value', 'القيمة المتبقية')}</Label><Input type="number" value={disposalForm.residual_value} onChange={e => setDisposalForm({ ...disposalForm, residual_value: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDisposalDialogOpen(false)}>{t('Cancel', 'إلغاء')}</Button><Button onClick={handleDisposal} variant="destructive">{t('Dispose', 'تخلص')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
