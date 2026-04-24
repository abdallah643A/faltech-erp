import { useState } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSChangeOrders, ChangeOrder, CO_REASONS, CO_STATUSES } from '@/hooks/useCPMSChangeOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Plus, DollarSign, Calendar, CheckCircle2, XCircle, AlertTriangle,
  ArrowRightLeft, Trash2, Eye, FileText, Send, Clock, Receipt, Download,
  TrendingUp, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: FileText, label: 'Draft' },
  submitted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Send, label: 'Submitted' },
  approved: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle, label: 'Rejected' },
  invoiced: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', icon: Receipt, label: 'Invoiced' },
};

const PIE_COLORS = ['hsl(var(--muted-foreground))', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)', 'hsl(262, 80%, 50%)'];

const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function CPMSChangeOrders() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const co = useCPMSChangeOrders(selectedProjectId || undefined);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState<Partial<ChangeOrder>>({
    status: 'draft', priority: 'medium', amount: 0, cost_impact: 0, schedule_impact_days: 0,
    original_budget: 0, revised_budget: 0, approval_level: 'pm',
  });

  const stats = co.getStats();
  const project = projects.find(p => p.id === selectedProjectId);
  const originalContract = project?.contract_value || 0;
  const approvedCOValue = stats.totalCOValue;
  const revisedContract = originalContract + approvedCOValue;
  const contractGrowth = originalContract > 0 ? ((approvedCOValue / originalContract) * 100) : 0;

  const profitOnCO = (form.amount || 0) - (form.cost_impact || 0);

  const handleCreate = async () => {
    if (!selectedProjectId || !form.title) return;
    await co.createChangeOrder({ ...form, project_id: selectedProjectId });
    setShowDialog(false);
    resetForm();
  };

  const resetForm = () => setForm({
    status: 'draft', priority: 'medium', amount: 0, cost_impact: 0, schedule_impact_days: 0,
    original_budget: 0, revised_budget: 0, approval_level: 'pm',
  });

  const handleApprove = async (c: ChangeOrder) => {
    await co.approveChangeOrder(c.id!, 'Current User');
  };

  const handleReject = async () => {
    if (selectedCO) {
      await co.rejectChangeOrder(selectedCO.id!, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedCO(null);
    }
  };

  const handleSubmit = async (c: ChangeOrder) => {
    await co.updateChangeOrder(c.id!, {
      status: 'submitted',
      submitted_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleExportCSV = () => {
  const { t } = useLanguage();

    const filtered = getFilteredOrders();
    const headers = ['CO #', 'Title', 'Reason', 'Status', 'Amount', 'Cost Impact', 'Profit', 'Schedule Days', 'Requested By', 'Submitted', 'Approved'];
    const rows = filtered.map(c => [
      c.co_number, c.title, c.reason || '', c.status, c.amount, c.cost_impact,
      (c.amount || 0) - (c.cost_impact || 0), c.schedule_impact_days, c.requested_by || '',
      c.submitted_date || '', c.approved_date || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `change-orders-${selectedProjectId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredOrders = () => {
    if (statusFilter === 'all') return co.changeOrders;
    return co.changeOrders.filter(c => c.status === statusFilter);
  };

  // Chart data
  const statusDistribution = Object.entries(
    co.changeOrders.reduce((acc: Record<string, number>, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: statusConfig[name]?.label || name, value }));

  const costImpactData = co.changeOrders
    .filter(c => c.amount !== 0 || c.cost_impact !== 0)
    .slice(0, 10)
    .map(c => ({ name: c.co_number, amount: c.amount || 0, cost: c.cost_impact || 0, profit: (c.amount || 0) - (c.cost_impact || 0) }));

  // CO trend over time (cumulative)
  const trendData = [...co.changeOrders]
    .filter(c => c.status === 'approved' || c.status === 'invoiced')
    .sort((a, b) => (a.approved_date || a.created_at || '').localeCompare(b.approved_date || b.created_at || ''))
    .reduce((acc: { date: string; cumulative: number }[], c) => {
      const d = c.approved_date || c.created_at?.split('T')[0] || '';
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({ date: d, cumulative: prev + (c.amount || 0) });
      return acc;
    }, []);

  const filtered = getFilteredOrders();

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Change Order Management
          </h1>
          <p className="text-sm text-muted-foreground">إدارة أوامر التغيير – Track scope changes & protect profitability</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProjectId && (
            <>
              <Button onClick={() => setShowDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Change Order
              </Button>
              <Button onClick={handleExportCSV} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a project to manage change orders</p>
          <p className="text-sm mt-1">Change orders track scope changes and their financial/schedule impacts</p>
        </CardContent></Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total COs', value: stats.total, icon: BarChart3, border: 'border-l-primary' },
              { label: 'Draft', value: stats.draft, icon: FileText, border: 'border-l-muted-foreground' },
              { label: 'Pending', value: stats.pending, icon: Clock, border: 'border-l-blue-500', sub: stats.pendingValue > 0 ? `${fmt(stats.pendingValue)} SAR` : undefined },
              { label: 'Approved', value: stats.approved, icon: CheckCircle2, border: 'border-l-emerald-500' },
              { label: 'CO Value', value: `${fmt(stats.totalCOValue)}`, icon: DollarSign, border: 'border-l-amber-500', sub: 'SAR (approved)' },
              { label: 'Schedule Impact', value: `${stats.totalScheduleImpact > 0 ? '+' : ''}${stats.totalScheduleImpact}`, icon: Calendar, border: 'border-l-orange-500', sub: 'days' },
            ].map((kpi, i) => (
              <Card key={i} className={cn('border-l-4', kpi.border)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{kpi.label}</p>
                    <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contract Impact Summary */}
          {originalContract > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Contract Impact Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Original Contract</p>
                    <p className="text-lg font-bold">{fmt(originalContract)} SAR</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Approved COs</p>
                    <p className={cn('text-lg font-bold', approvedCOValue >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {approvedCOValue >= 0 ? '+' : ''}{fmt(approvedCOValue)} SAR
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revised Contract</p>
                    <p className="text-lg font-bold text-primary">{fmt(revisedContract)} SAR</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contract Growth</p>
                    <p className={cn('text-lg font-bold', contractGrowth > 10 ? 'text-amber-600' : contractGrowth > 0 ? 'text-emerald-600' : '')}>
                      {contractGrowth > 0 ? '+' : ''}{contractGrowth.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <Progress value={originalContract > 0 ? Math.min(120, (revisedContract / originalContract) * 100) : 0} className="h-2 mt-3" />
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value" paddingAngle={3}>
                        {statusDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-sm text-muted-foreground">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Financial Impact by CO</CardTitle></CardHeader>
              <CardContent>
                {costImpactData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={costImpactData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => `${fmt(v)} SAR`} />
                      <Bar dataKey="amount" fill="hsl(142, 71%, 45%)" name="Client Amount" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" fill="hsl(0, 84%, 60%)" name="Your Cost" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-sm text-muted-foreground">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">CO Value Trend (Cumulative)</CardTitle></CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => `${fmt(v)} SAR`} />
                      <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-sm text-muted-foreground">No trend data yet</p>}
              </CardContent>
            </Card>
          </div>

          {/* Filters + Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Change Orders</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {CO_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{statusConfig[s]?.label || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">CO #</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">{t('common.amount')}</TableHead>
                    <TableHead className="text-xs">Cost</TableHead>
                    <TableHead className="text-xs">Profit</TableHead>
                    <TableHead className="text-xs">Schedule</TableHead>
                    <TableHead className="text-xs">{t('common.status')}</TableHead>
                    <TableHead className="text-xs">Submitted</TableHead>
                    <TableHead className="text-xs">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No change orders found</TableCell></TableRow>
                  ) : (
                    filtered.map(c => {
                      const profit = (c.amount || 0) - (c.cost_impact || 0);
                      const sc = statusConfig[c.status] || statusConfig.draft;
                      return (
                        <TableRow key={c.id} className="cursor-pointer" onClick={() => { setSelectedCO(c); setShowDetailDialog(true); }}>
                          <TableCell className="text-xs font-mono font-medium">{c.co_number}</TableCell>
                          <TableCell className="text-xs font-medium max-w-[180px] truncate">{c.title}</TableCell>
                          <TableCell className="text-xs">{c.reason || '—'}</TableCell>
                          <TableCell className={cn('text-xs font-medium', (c.amount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {(c.amount || 0) >= 0 ? '+' : ''}{fmt(c.amount || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-red-600">{fmt(c.cost_impact || 0)}</TableCell>
                          <TableCell className={cn('text-xs font-medium', profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {profit >= 0 ? '+' : ''}{fmt(profit)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.schedule_impact_days > 0 ? `+${c.schedule_impact_days}d` : c.schedule_impact_days === 0 ? '—' : `${c.schedule_impact_days}d`}
                          </TableCell>
                          <TableCell><Badge className={cn('text-[10px]', sc.color)}>{sc.label}</Badge></TableCell>
                          <TableCell className="text-xs">{c.submitted_date || '—'}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {c.status === 'draft' && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600"
                                  onClick={() => handleSubmit(c)} title="Submit">
                                  <Send className="h-3 w-3" />
                                </Button>
                              )}
                              {c.status === 'submitted' && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-emerald-600"
                                    onClick={() => handleApprove(c)} title="Approve">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-600"
                                    onClick={() => { setSelectedCO(c); setShowRejectDialog(true); }} title="Reject">
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {c.status === 'approved' && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-purple-600"
                                  onClick={() => co.markInvoiced(c.id!)} title="Mark Invoiced">
                                  <Receipt className="h-3 w-3" />
                                </Button>
                              )}
                              {['draft', 'submitted'].includes(c.status) && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive"
                                  onClick={() => co.deleteChangeOrder(c.id!)} title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Change Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs">Title *</Label><Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Additional electrical outlets on 2nd floor" /></div>
              <div className="col-span-2"><Label className="text-xs">{t('common.description')}</Label><Textarea rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Reason</Label>
                <Select value={form.reason || ''} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {CO_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('common.status')}</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Requested By</Label><Input value={form.requested_by || ''} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} /></div>
            </div>

            {/* Financial Impact */}
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1"><DollarSign className="h-3 w-3" /> Financial Impact</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Amount to Bill Client (SAR)</Label>
                    <Input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="Can be negative for credits" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Positive = bill client, Negative = credit</p>
                  </div>
                  <div>
                    <Label className="text-xs">Your Additional Cost (SAR)</Label>
                    <Input type="number" value={form.cost_impact || ''} onChange={e => setForm(f => ({ ...f, cost_impact: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Your Profit on CO</Label>
                    <div className={cn('text-lg font-bold mt-1 px-3 py-1.5 rounded-md border', profitOnCO >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200' : 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200')}>
                      {profitOnCO >= 0 ? '+' : ''}{fmt(profitOnCO)} SAR
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Impact */}
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule Impact</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Days Added/Subtracted</Label>
                    <Input type="number" value={form.schedule_impact_days || ''} onChange={e => setForm(f => ({ ...f, schedule_impact_days: parseInt(e.target.value) || 0 }))} placeholder="+/- days" />
                  </div>
                  <div><Label className="text-xs">Original End Date</Label><Input type="date" value={form.original_end_date || ''} onChange={e => setForm(f => ({ ...f, original_end_date: e.target.value }))} /></div>
                  <div><Label className="text-xs">Revised End Date</Label><Input type="date" value={form.revised_end_date || ''} onChange={e => setForm(f => ({ ...f, revised_end_date: e.target.value }))} /></div>
                </div>
              </CardContent>
            </Card>

            <div><Label className="text-xs">Notes / Justification</Label><Textarea rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Explain why this change is needed..." /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Approval Level</Label>
                <Select value={form.approval_level} onValueChange={v => setForm(f => ({ ...f, approval_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">PM</SelectItem>
                    <SelectItem value="pm_manager">PM Manager</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full" disabled={!form.title}>
              {form.status === 'draft' ? 'Save as Draft' : 'Submit Change Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCO && (() => {
            const profit = (selectedCO.amount || 0) - (selectedCO.cost_impact || 0);
            const sc = statusConfig[selectedCO.status] || statusConfig.draft;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="font-mono">{selectedCO.co_number}</span> – {selectedCO.title}
                    <Badge className={cn('text-[10px]', sc.color)}>{sc.label}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedCO.description && <div><Label className="text-xs text-muted-foreground">{t('common.description')}</Label><p className="text-sm">{selectedCO.description}</p></div>}
                  {selectedCO.reason && <div><Label className="text-xs text-muted-foreground">Reason</Label><Badge variant="outline">{selectedCO.reason}</Badge></div>}

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200"><CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Client Amount</p>
                      <p className="text-lg font-bold text-emerald-600">{(selectedCO.amount || 0) >= 0 ? '+' : ''}{fmt(selectedCO.amount || 0)} SAR</p>
                    </CardContent></Card>
                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200"><CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Your Cost</p>
                      <p className="text-lg font-bold text-red-600">{fmt(selectedCO.cost_impact || 0)} SAR</p>
                    </CardContent></Card>
                    <Card className={cn('border', profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200')}>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Profit on CO</p>
                        <p className={cn('text-lg font-bold', profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {profit >= 0 ? '+' : ''}{fmt(profit)} SAR
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-muted/30"><CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Schedule Impact</p>
                      <p className="text-lg font-bold">{selectedCO.schedule_impact_days > 0 ? '+' : ''}{selectedCO.schedule_impact_days} days</p>
                    </CardContent></Card>
                    <Card className="bg-muted/30"><CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Priority / Approval</p>
                      <p className="text-sm font-medium capitalize">{selectedCO.priority} / {selectedCO.approval_level}</p>
                    </CardContent></Card>
                  </div>

                  {selectedCO.notes && (
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Notes / Justification</p>
                      <p className="text-sm">{selectedCO.notes}</p>
                    </div>
                  )}

                  {selectedCO.rejection_reason && (
                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200">
                      <p className="text-xs text-red-600 font-medium">Rejection Reason</p>
                      <p className="text-sm">{selectedCO.rejection_reason}</p>
                    </div>
                  )}

                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Requested by: {selectedCO.requested_by || '—'}</p>
                    {selectedCO.submitted_date && <p>Submitted: {selectedCO.submitted_date}</p>}
                    {selectedCO.approved_by && <p>Approved by: {selectedCO.approved_by} on {selectedCO.approved_date}</p>}
                    <p>Created: {selectedCO.created_at ? format(new Date(selectedCO.created_at), 'PPp') : '—'}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {selectedCO.status === 'draft' && (
                      <Button size="sm" onClick={() => { handleSubmit(selectedCO); setShowDetailDialog(false); }}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Submit for Approval
                      </Button>
                    )}
                    {selectedCO.status === 'submitted' && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApprove(selectedCO); setShowDetailDialog(false); }}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setShowDetailDialog(false); setShowRejectDialog(true); }}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {selectedCO.status === 'approved' && (
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => { co.markInvoiced(selectedCO.id!); setShowDetailDialog(false); }}>
                        <Receipt className="h-3.5 w-3.5 mr-1" /> Mark as Invoiced
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-red-600">Reject Change Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Rejecting <span className="font-medium">{selectedCO?.co_number}</span> – {selectedCO?.title}
            </p>
            <div>
              <Label className="text-xs">Rejection Reason *</Label>
              <Textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this change order is rejected..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
