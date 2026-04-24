import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, FileText, ShoppingCart, Package, Receipt, TrendingUp, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';
import { useProjectProcurement } from '@/hooks/useProjectProcurement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  posted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  closed: 'bg-muted text-muted-foreground',
  partially_delivered: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  fully_delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function formatCurrency(v: number) {
  const { t } = useLanguage();

  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);
}

export default function ProjectProcurementDashboard() {
  const { t } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const hook = useProjectProcurement(selectedProjectId);

  const budget = useMemo(() => hook.getBudgetSummary(), [
    selectedProjectId, hook.purchaseOrders.data, hook.apInvoices.data, hook.cbsItems.data, hook.projects.data,
  ]);

  const phaseProcurement = useMemo(() => hook.getPhaseProcurement(), [hook.purchaseOrders.data]);

  const selectedProject = hook.projects.data?.find((p: any) => p.id === selectedProjectId);
  const prs = hook.purchaseRequests.data || [];
  const pqs = hook.quotations.data || [];
  const pos = hook.purchaseOrders.data || [];
  const grpos = hook.goodsReceipts.data || [];
  const invoices = hook.apInvoices.data || [];
  const cbs = hook.cbsItems.data || [];

  // PO status distribution for pie chart
  const poStatusDist = useMemo(() => {
    const map: Record<string, number> = {};
    pos.forEach((po: any) => { map[po.status] = (map[po.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [pos]);

  // CBS budget vs actual for bar chart
  const cbsChart = useMemo(() => {
    return cbs.slice(0, 10).map((c: any) => ({
      name: c.code || c.description?.slice(0, 15) || 'Item',
      budget: c.budget_amount || 0,
      actual: c.actual_amount || 0,
    }));
  }, [cbs]);

  const budgetHealthColor = budget.utilizationPct > 100 ? 'text-destructive' : budget.utilizationPct > 85 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Project Procurement Dashboard</h1>
          <p className="text-xs text-muted-foreground">Link procurement documents to construction projects with budget tracking</p>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Building2 className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Construction Project</label>
              <Select value={selectedProjectId || ''} onValueChange={(v) => setSelectedProjectId(v || null)}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {(hook.projects.data || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-medium">{p.name}</span>
                      {p.code && <span className="text-muted-foreground ml-2">({p.code})</span>}
                      <Badge variant="outline" className="ml-2 text-[10px]">{p.status}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Phase</p>
                <Badge variant="secondary">{selectedProject.current_phase || 'N/A'}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a project to view procurement data</p>
            <p className="text-sm">All purchase requests, orders, quotations, goods receipts, and invoices linked to the project will be displayed.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Budget KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Budget</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(budget.totalBudget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Committed (POs)</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(budget.committedPO)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoiced</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(budget.invoicedAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</p>
                <p className={`text-lg font-bold ${budget.remainingBudget < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(budget.remainingBudget)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Utilization</p>
                <p className={`text-lg font-bold ${budgetHealthColor}`}>{budget.utilizationPct.toFixed(1)}%</p>
                <Progress value={Math.min(budget.utilizationPct, 100)} className="h-1.5 mt-1" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Documents</p>
                <p className="text-lg font-bold text-foreground">{prs.length + pqs.length + pos.length + grpos.length + invoices.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Budget Alert */}
          {budget.utilizationPct > 85 && (
            <Card className={budget.utilizationPct > 100 ? 'border-destructive bg-destructive/5' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'}>
              <CardContent className="py-3 flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${budget.utilizationPct > 100 ? 'text-destructive' : 'text-yellow-600'}`} />
                <p className="text-sm font-medium">
                  {budget.utilizationPct > 100
                    ? `Budget overrun! Committed POs exceed budget by ${formatCurrency(Math.abs(budget.remainingBudget))}. Change Order may be required.`
                    : `Budget utilization at ${budget.utilizationPct.toFixed(1)}%. Approaching limit.`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CBS Budget vs Actual */}
            {cbsChart.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    CBS Budget vs Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={cbsChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" fill="hsl(var(--chart-3))" name="Actual" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* PO Status Distribution */}
            {poStatusDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    PO Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={poStatusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {poStatusDist.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Document Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pr">PRs ({prs.length})</TabsTrigger>
              <TabsTrigger value="pq">Quotations ({pqs.length})</TabsTrigger>
              <TabsTrigger value="po">POs ({pos.length})</TabsTrigger>
              <TabsTrigger value="grpo">Receipts ({grpos.length})</TabsTrigger>
              <TabsTrigger value="ap">AP Invoices ({invoices.length})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Document Flow Summary */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Purchase Requests', count: prs.length, icon: FileText, color: 'text-blue-500', open: prs.filter((p: any) => p.status === 'open').length },
                  { label: 'Quotations', count: pqs.length, icon: ClipboardIcon, color: 'text-emerald-500', open: pqs.filter((p: any) => p.status === 'open').length },
                  { label: 'Purchase Orders', count: pos.length, icon: ShoppingCart, color: 'text-amber-500', open: pos.filter((p: any) => !['cancelled', 'closed', 'fully_delivered'].includes(p.status)).length },
                  { label: 'Goods Receipts', count: grpos.length, icon: Package, color: 'text-purple-500', open: grpos.filter((p: any) => p.status === 'draft').length },
                  { label: 'AP Invoices', count: invoices.length, icon: Receipt, color: 'text-red-500', open: invoices.filter((p: any) => ['draft', 'open'].includes(p.status)).length },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="pt-4 pb-3 text-center">
                      <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
                      <p className="text-xl font-bold text-foreground">{item.count}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      {item.open > 0 && <Badge variant="secondary" className="mt-1 text-[10px]">{item.open} active</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* CBS Budget Tracking Table */}
              {cbs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      CBS Budget Allocation Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>{t('common.description')}</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Usage %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cbs.map((item: any) => {
                          const variance = (item.budget_amount || 0) - (item.actual_amount || 0);
                          const pct = item.budget_amount > 0 ? ((item.actual_amount || 0) / item.budget_amount) * 100 : 0;
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-xs">{item.code}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.budget_amount || 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.actual_amount || 0)}</TableCell>
                              <TableCell className={`text-right font-medium ${variance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {formatCurrency(variance)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <Progress value={Math.min(pct, 100)} className="h-1.5 w-16" />
                                  <span className={`text-xs ${pct > 100 ? 'text-destructive font-bold' : ''}`}>{pct.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-bold border-t-2">
                          <TableCell colSpan={2}>{t('common.total')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.cbsBudget)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.cbsActual)}</TableCell>
                          <TableCell className={`text-right ${budget.cbsVariance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(budget.cbsVariance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {budget.cbsBudget > 0 ? ((budget.cbsActual / budget.cbsBudget) * 100).toFixed(0) : 0}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Phase Procurement Breakdown */}
              {phaseProcurement.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Procurement by Phase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phase</TableHead>
                          <TableHead className="text-right">PO Count</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead>Status Breakdown</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {phaseProcurement.map((p: any) => (
                          <TableRow key={p.phase}>
                            <TableCell className="font-medium">{p.phase}</TableCell>
                            <TableCell className="text-right">{p.poCount}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(p.totalValue)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(p.statuses).map(([status, count]) => (
                                  <Badge key={status} variant="outline" className="text-[10px]">{status}: {count as number}</Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* PR Tab */}
            <TabsContent value="pr">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Purchase Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocTable
                    data={prs}
                    columns={[
                      { key: 'pr_number', label: 'PR #' },
                      { key: 'doc_date', label: 'Date' },
                      { key: 'requester_name', label: 'Requester' },
                      { key: 'department', label: 'Department' },
                      { key: 'status', label: 'Status', badge: true },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* PQ Tab */}
            <TabsContent value="pq">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Purchase Quotations</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocTable
                    data={pqs}
                    columns={[
                      { key: 'pq_number', label: 'PQ #' },
                      { key: 'doc_date', label: 'Date' },
                      { key: 'vendor_name', label: 'Vendor' },
                      { key: 'total', label: 'Total', currency: true },
                      { key: 'status', label: 'Status', badge: true },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* PO Tab */}
            <TabsContent value="po">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocTable
                    data={pos}
                    columns={[
                      { key: 'po_number', label: 'PO #' },
                      { key: 'doc_date', label: 'Date' },
                      { key: 'vendor_name', label: 'Vendor' },
                      { key: 'total', label: 'Total', currency: true },
                      { key: 'approval_status', label: 'Approval', badge: true },
                      { key: 'status', label: 'Status', badge: true },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* GRPO Tab */}
            <TabsContent value="grpo">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Goods Receipts</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocTable
                    data={grpos}
                    columns={[
                      { key: 'grpo_number', label: 'GRPO #' },
                      { key: 'doc_date', label: 'Date' },
                      { key: 'vendor_name', label: 'Vendor' },
                      { key: 'total', label: 'Total', currency: true },
                      { key: 'status', label: 'Status', badge: true },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* AP Invoice Tab */}
            <TabsContent value="ap">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AP Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocTable
                    data={invoices}
                    columns={[
                      { key: 'invoice_number', label: 'Invoice #' },
                      { key: 'doc_date', label: 'Date' },
                      { key: 'vendor_name', label: 'Vendor' },
                      { key: 'total', label: 'Total', currency: true },
                      { key: 'status', label: 'Status', badge: true },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Clipboard icon stand-in
function ClipboardIcon({ className }: { className?: string }) {
  return <FileText className={className} />;
}

// Reusable document table component
interface DocColumn {
  key: string;
  label: string;
  badge?: boolean;
  currency?: boolean;
}

function DocTable({ data, columns }: { data: any[]; columns: DocColumn[] }) {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">No documents found for this project.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.currency ? 'text-right' : ''}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row: any) => (
          <TableRow key={row.id}>
            {columns.map((col) => (
              <TableCell key={col.key} className={col.currency ? 'text-right font-medium' : ''}>
                {col.badge ? (
                  <Badge className={STATUS_COLORS[row[col.key]] || 'bg-muted text-muted-foreground'} variant="secondary">
                    {row[col.key]}
                  </Badge>
                ) : col.currency ? (
                  formatCurrency(row[col.key] || 0)
                ) : (
                  row[col.key] || '—'
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
