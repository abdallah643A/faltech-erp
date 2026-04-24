import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Target, TrendingUp, DollarSign, Users, Plus, Search, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Briefcase } from 'lucide-react';
import { useTargets } from '@/hooks/useTargets';
import { TargetFormDialog } from '@/components/targets/TargetFormDialog';
import { TargetCharts } from '@/components/targets/TargetCharts';
import { TargetLeaderboard } from '@/components/targets/TargetLeaderboard';
import { TargetFilters } from '@/components/targets/TargetFilters';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import { useSAPSync } from '@/hooks/useSAPSync';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const targetColumns: ColumnDef[] = [
  { key: 'user_name', header: 'User' },
  { key: 'sales_employee_name', header: 'Sales Employee' },
  { key: 'period', header: 'Period' },
  { key: 'period_start', header: 'Start Date' },
  { key: 'period_end', header: 'End Date' },
  { key: 'target_type', header: 'Type' },
  { key: 'sales_target', header: 'Sales Target' },
  { key: 'sales_actual', header: 'Sales Actual' },
  { key: 'collection_target', header: 'Collection Target' },
  { key: 'collection_actual', header: 'Collection Actual' },
  { key: 'business_line_name', header: 'Business Line' },
];

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export default function Targets() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [period, setPeriod] = useState<Period>('monthly');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  // Filter states
  const [salesEmployeeId, setSalesEmployeeId] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [businessLineId, setBusinessLineId] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  const { data: targets = [], isLoading, createTarget, updateTarget, deleteTarget } = useTargets({
    period,
    salesEmployeeId: salesEmployeeId || undefined,
    branchIds: selectedBranches.length > 0 ? selectedBranches : undefined,
    companyIds: selectedCompanies.length > 0 ? selectedCompanies : undefined,
    regionIds: selectedRegions.length > 0 ? selectedRegions : undefined,
    businessLineId: businessLineId || undefined,
    targetType: targetType !== 'all' ? targetType : undefined,
  });
  const { sync } = useSAPSync();

  const filtered = targets.filter(t =>
    t.user_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.sales_employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.business_line_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSalesTarget = filtered.reduce((s, t) => s + Number(t.sales_target), 0);
  const totalSalesActual = filtered.reduce((s, t) => s + Number(t.sales_actual), 0);
  const totalCollTarget = filtered.reduce((s, t) => s + Number(t.collection_target), 0);
  const totalCollActual = filtered.reduce((s, t) => s + Number(t.collection_actual), 0);

  const fmt = (v: number) => new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  const handleCreate = (data: any) => {
    createTarget.mutate(data, { onSuccess: () => setFormOpen(false) });
  };

  const handleUpdate = (data: any) => {
    if (editTarget) {
      updateTarget.mutate({ id: editTarget.id, ...data }, { onSuccess: () => setEditTarget(null) });
    }
  };

  const salesPct = totalSalesTarget > 0 ? (totalSalesActual / totalSalesTarget) * 100 : 0;
  const collPct = totalCollTarget > 0 ? (totalCollActual / totalCollTarget) * 100 : 0;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'الأهداف' : 'Sales & Collection Targets'}</h1>
          <p className="text-muted-foreground">{isAr ? 'تتبع أهداف المبيعات والتحصيل حسب موظف المبيعات، الفرع، الشركة، المنطقة والمنتج' : 'Track sales & collection targets by employee, branch, company, region & product'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
          <ExportImportButtons
            data={filtered}
            columns={targetColumns}
            filename="sales-targets"
            title="Sales & Collection Targets"
            onImport={async (rows) => {
              for (const row of rows) {
                await createTarget.mutateAsync({
                  user_name: row['User'] || row['user_name'] || '',
                  sales_employee_name: row['Sales Employee'] || row['sales_employee_name'] || null,
                  period: row['Period'] || row['period'] || 'monthly',
                  period_start: row['Start Date'] || row['period_start'] || '',
                  period_end: row['End Date'] || row['period_end'] || '',
                  target_type: row['Type'] || row['target_type'] || 'revenue',
                  sales_target: Number(row['Sales Target'] || row['sales_target']) || 0,
                  sales_actual: Number(row['Sales Actual'] || row['sales_actual']) || 0,
                  collection_target: Number(row['Collection Target'] || row['collection_target']) || 0,
                  collection_actual: Number(row['Collection Actual'] || row['collection_actual']) || 0,
                  business_line_name: row['Business Line'] || row['business_line_name'] || null,
                });
              }
            }}
          />
          <SAPSyncButton entity="sales_target" />
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAr ? 'إضافة هدف' : 'Add Target'}
          </Button>
        </div>
      </div>

      {/* Dimension Filters */}
      <TargetFilters
        salesEmployeeId={salesEmployeeId}
        onSalesEmployeeChange={setSalesEmployeeId}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        businessLineId={businessLineId}
        onBusinessLineChange={setBusinessLineId}
        selectedRegions={selectedRegions}
        selectedCompanies={selectedCompanies}
        selectedBranches={selectedBranches}
        onRegionsChange={setSelectedRegions}
        onCompaniesChange={setSelectedCompanies}
        onBranchesChange={setSelectedBranches}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/10"
          label={isAr ? 'هدف المبيعات' : 'Sales Target'}
          value={fmt(totalSalesTarget)}
          progress={salesPct}
          footer={`${salesPct.toFixed(1)}% ${isAr ? 'مُنجز' : 'achieved'}`}
        />
        <SummaryCard
          icon={<DollarSign className="h-5 w-5 text-chart-2" />}
          iconBg="bg-chart-2/10"
          label={isAr ? 'المبيعات الفعلية' : 'Sales Actual'}
          value={fmt(totalSalesActual)}
          diff={totalSalesActual - totalSalesTarget}
          fmt={fmt}
          isAr={isAr}
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-chart-3" />}
          iconBg="bg-chart-3/10"
          label={isAr ? 'هدف التحصيل' : 'Collection Target'}
          value={fmt(totalCollTarget)}
          progress={collPct}
          footer={`${collPct.toFixed(1)}% ${isAr ? 'تم تحصيله' : 'collected'}`}
        />
        <SummaryCard
          icon={<Target className="h-5 w-5 text-chart-4" />}
          iconBg="bg-chart-4/10"
          label={isAr ? 'الفترة' : 'Period'}
          value={<span className="capitalize">{period}</span>}
          footer={`${filtered.length} ${isAr ? 'سجلات' : 'records'}`}
        />
      </div>

      {/* Charts */}
      <TargetCharts targets={filtered} />

      {/* Period Tabs + Table + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="daily">{isAr ? 'يومي' : 'Daily'}</TabsTrigger>
              <TabsTrigger value="weekly">{isAr ? 'أسبوعي' : 'Weekly'}</TabsTrigger>
              <TabsTrigger value="monthly">{isAr ? 'شهري' : 'Monthly'}</TabsTrigger>
              <TabsTrigger value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</TabsTrigger>
              <TabsTrigger value="yearly">{isAr ? 'سنوي' : 'Yearly'}</TabsTrigger>
            </TabsList>

            {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as Period[]).map(p => (
              <TabsContent key={p} value={p} className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{isAr ? 'لا توجد أهداف لهذه الفترة' : 'No targets for this period'}</p>
                        <Button variant="outline" className="mt-3" onClick={() => setFormOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />{isAr ? 'إضافة هدف' : 'Add Target'}
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{isAr ? 'موظف المبيعات' : 'Sales Employee'}</TableHead>
                              <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                              <TableHead>{isAr ? 'خط الأعمال' : 'Business Line'}</TableHead>
                              <TableHead>{isAr ? 'هدف المبيعات' : 'Sales Target'}</TableHead>
                              <TableHead>{isAr ? 'المبيعات الفعلية' : 'Sales Actual'}</TableHead>
                              <TableHead>{isAr ? 'التقدم' : 'Progress'}</TableHead>
                              <TableHead>{isAr ? 'هدف التحصيل' : 'Coll. Target'}</TableHead>
                              <TableHead>{isAr ? 'التحصيل الفعلي' : 'Coll. Actual'}</TableHead>
                              <TableHead>{isAr ? 'SAP' : 'SAP'}</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map(target => {
                              const sPct = Number(target.sales_target) > 0 ? (Number(target.sales_actual) / Number(target.sales_target)) * 100 : 0;
                              return (
                                <TableRow key={target.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs font-medium text-primary">
                                          {(target.sales_employee_name || target.user_name).split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-sm block">{target.sales_employee_name || target.user_name}</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs capitalize">{target.target_type}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {target.business_line_name ? (
                                      <span className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {target.business_line_name}
                                      </span>
                                    ) : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm">{fmt(Number(target.sales_target))}</TableCell>
                                  <TableCell className={`text-sm ${sPct >= 100 ? 'text-green-600 font-medium' : ''}`}>{fmt(Number(target.sales_actual))}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Progress value={Math.min(sPct, 100)} className="w-20 h-2" />
                                      <Badge variant={sPct >= 100 ? 'default' : sPct >= 75 ? 'secondary' : 'destructive'} className="text-xs">
                                        {sPct.toFixed(0)}%
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{fmt(Number(target.collection_target))}</TableCell>
                                  <TableCell className="text-sm">{fmt(Number(target.collection_actual))}</TableCell>
                                  <TableCell><SyncStatusBadge syncStatus={target.sync_status || 'pending'} /></TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditTarget(target)}>
                                          <Pencil className="mr-2 h-4 w-4" />{isAr ? 'تعديل' : 'Edit'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => sync('sales_target', 'to_sap', target.id)}>
                                          <ArrowUp className="mr-2 h-4 w-4" />{isAr ? 'دفع إلى SAP' : 'Push to SAP'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => sync('sales_target', 'from_sap', target.id)}>
                                          <ArrowDown className="mr-2 h-4 w-4" />{isAr ? 'سحب من SAP' : 'Pull from SAP'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => deleteTarget.mutate(target.id)}>
                                          <Trash2 className="mr-2 h-4 w-4" />{isAr ? 'حذف' : 'Delete'}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div>
          <TargetLeaderboard targets={filtered} />
        </div>
      </div>

      {/* Dialogs */}
      <TargetFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} isLoading={createTarget.isPending} />
      {editTarget && (
        <TargetFormDialog open={!!editTarget} onOpenChange={() => setEditTarget(null)} onSubmit={handleUpdate} isLoading={updateTarget.isPending} initialData={editTarget} />
      )}
    </div>
  );
}

// Summary card sub-component
function SummaryCard({ icon, iconBg, label, value, progress, footer, diff, fmt: fmtFn, isAr }: any) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
        {progress !== undefined && (
          <>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">{footer}</p>
          </>
        )}
        {diff !== undefined && fmtFn && (
          <div className={`text-sm flex items-center gap-1 ${diff >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            {diff >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {fmtFn(Math.abs(diff))} {diff >= 0 ? (isAr ? 'فوق' : 'above') : (isAr ? 'تحت' : 'below')}
          </div>
        )}
        {diff === undefined && progress === undefined && footer && (
          <p className="text-sm text-muted-foreground">{footer}</p>
        )}
      </CardContent>
    </Card>
  );
}
