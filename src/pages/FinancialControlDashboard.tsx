import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';
import { useEVM } from '@/hooks/useEVM';
import {
  useBudgetTransfers, useContingencyReserves, useFinancialCommitments,
} from '@/hooks/useProjectControl';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, ArrowRightLeft, Shield, Package, Plus, CheckCircle,
  XCircle, Clock, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(0 84% 60%)', 'hsl(45 93% 47%)'];

export default function FinancialControlDashboard() {
  const { t } = useLanguage();
  const { projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { snapshots } = useEVM(selectedProjectId);
  const { transfers, createTransfer, approveTransfer, rejectTransfer } = useBudgetTransfers(selectedProjectId);
  const { reserves, releases, createReserve, requestRelease, approveRelease } = useContingencyReserves(selectedProjectId);
  const { commitments, addCommitment } = useFinancialCommitments(selectedProjectId);

  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [showCommitmentDialog, setShowCommitmentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('budget');

  const snapshotData = snapshots.data || [];
  const latest = snapshotData[snapshotData.length - 1];
  const transfersData = transfers.data || [];
  const reservesData = reserves.data || [];
  const commitmentsData = commitments.data || [];
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Budget vs Actual vs Committed
  const totalBudget = selectedProject?.budget || latest?.bac || 0;
  const totalActual = selectedProject?.actual_cost || latest?.ac || 0;
  const totalCommitted = commitmentsData.reduce((s, c) => s + (c.remaining_amount || (c.committed_amount - c.invoiced_amount) || 0), 0);
  const totalAvailable = totalBudget - totalActual - totalCommitted;

  const budgetBreakdown = [
    { name: 'Actual Spent', value: totalActual },
    { name: 'Committed', value: totalCommitted },
    { name: 'Available', value: Math.max(0, totalAvailable) },
  ];

  const reserveSummary = reservesData.reduce((acc, r) => {
    acc.total += r.original_amount;
    acc.current += r.current_amount;
    acc.released += r.released_amount;
    return acc;
  }, { total: 0, current: 0, released: 0 });

  const handleCreateTransfer = (e: React.FormEvent<HTMLFormElement>) => {
  const { t } = useLanguage();

    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTransfer.mutate({
      project_id: selectedProjectId,
      from_cost_code: fd.get('from_cost_code'),
      from_cost_name: fd.get('from_cost_name'),
      to_cost_code: fd.get('to_cost_code'),
      to_cost_name: fd.get('to_cost_name'),
      amount: Number(fd.get('amount')),
      reason: fd.get('reason'),
    });
    setShowTransferDialog(false);
  };

  const handleCreateReserve = (e: React.FormEvent<HTMLFormElement>) => {
  const { t } = useLanguage();

    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createReserve.mutate({
      project_id: selectedProjectId,
      reserve_type: fd.get('reserve_type'),
      original_amount: Number(fd.get('original_amount')),
      description: fd.get('description'),
    });
    setShowReserveDialog(false);
  };

  const handleAddCommitment = (e: React.FormEvent<HTMLFormElement>) => {
  const { t } = useLanguage();

    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addCommitment.mutate({
      project_id: selectedProjectId,
      commitment_type: fd.get('commitment_type'),
      reference_number: fd.get('reference_number'),
      vendor_name: fd.get('vendor_name'),
      description: fd.get('description'),
      committed_amount: Number(fd.get('committed_amount')),
      invoiced_amount: Number(fd.get('invoiced_amount')) || 0,
      cost_code: fd.get('cost_code'),
      expected_invoice_date: fd.get('expected_invoice_date') || null,
    });
    setShowCommitmentDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Control</h1>
          <p className="text-sm text-muted-foreground">Budget management, commitments, contingency & transfers</p>
        </div>
        <Select value={selectedProjectId || ''} onValueChange={v => setSelectedProjectId(v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Project" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <>
          {/* Budget Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
                <p className="text-2xl font-bold">{(totalBudget / 1e3).toFixed(0)}K</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Actual Spent</div>
                <p className="text-2xl font-bold text-red-600">{(totalActual / 1e3).toFixed(0)}K</p>
                <Progress value={totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0} className="h-1.5 mt-1" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Committed</div>
                <p className="text-2xl font-bold text-amber-600">{(totalCommitted / 1e3).toFixed(0)}K</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Available</div>
                <p className={`text-2xl font-bold ${totalAvailable < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {(totalAvailable / 1e3).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Contingency</div>
                <p className="text-2xl font-bold">{(reserveSummary.current / 1e3).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">of {(reserveSummary.total / 1e3).toFixed(0)}K</p>
              </CardContent>
            </Card>
          </div>

          {/* Budget Breakdown Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Budget Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={budgetBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {budgetBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Contingency Reserves */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Contingency Reserves</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowReserveDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </CardHeader>
              <CardContent>
                {reservesData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No reserves configured</p>
                ) : (
                  <div className="space-y-3">
                    {reservesData.map((r: any) => (
                      <div key={r.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant="outline">{r.reserve_type === 'management_reserve' ? 'MR' : 'CR'}</Badge>
                          <span className="text-xs text-muted-foreground">{r.description}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Original: {r.original_amount?.toLocaleString()}</span>
                          <span className="font-bold">Remaining: {r.current_amount?.toLocaleString()}</span>
                        </div>
                        <Progress value={r.original_amount > 0 ? ((r.original_amount - r.current_amount) / r.original_amount) * 100 : 0} className="h-1.5 mt-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Transfer & Commitment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span className="text-sm">Budget Transfers</span>
                  </div>
                  <Badge>{transfersData.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm">Open Commitments</span>
                  </div>
                  <Badge>{commitmentsData.filter(c => c.status === 'open').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm">Reserve Released</span>
                  </div>
                  <span className="text-sm font-bold">{reserveSummary.released.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="budget">Budget Transfers</TabsTrigger>
              <TabsTrigger value="commitments">Commitments</TabsTrigger>
            </TabsList>

            <TabsContent value="budget">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Budget Transfer Requests</CardTitle>
                  <Button size="sm" onClick={() => setShowTransferDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />New Transfer
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer #</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>{t('common.amount')}</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfersData.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">{t.transfer_number}</TableCell>
                          <TableCell className="text-sm">{t.from_cost_code} {t.from_cost_name && `(${t.from_cost_name})`}</TableCell>
                          <TableCell className="text-sm">{t.to_cost_code} {t.to_cost_name && `(${t.to_cost_name})`}</TableCell>
                          <TableCell className="font-bold">{t.amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">{t.reason}</TableCell>
                          <TableCell>
                            <Badge variant={t.status === 'approved' ? 'default' : t.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {t.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => approveTransfer.mutate(t.id)}>
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => rejectTransfer.mutate({ id: t.id, reason: 'Rejected' })}>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {transfersData.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No budget transfers</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commitments">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Financial Commitments</CardTitle>
                  <Button size="sm" onClick={() => setShowCommitmentDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />Track Commitment
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.type')}</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Committed</TableHead>
                        <TableHead>Invoiced</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commitmentsData.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell><Badge variant="outline">{c.commitment_type}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{c.reference_number || '-'}</TableCell>
                          <TableCell className="text-sm">{c.vendor_name || '-'}</TableCell>
                          <TableCell>{c.committed_amount?.toLocaleString()}</TableCell>
                          <TableCell>{c.invoiced_amount?.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-amber-600">
                            {(c.remaining_amount || (c.committed_amount - c.invoiced_amount))?.toLocaleString()}
                          </TableCell>
                          <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {commitmentsData.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No commitments tracked</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!selectedProjectId && (
        <Card><CardContent className="py-16 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Select a Project</h3>
          <p className="text-muted-foreground">Choose a project to view financial controls</p>
        </CardContent></Card>
      )}

      {/* Budget Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Budget Transfer</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>From Cost Code *</Label><Input name="from_cost_code" required /></div>
              <div><Label>From Name</Label><Input name="from_cost_name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>To Cost Code *</Label><Input name="to_cost_code" required /></div>
              <div><Label>To Name</Label><Input name="to_cost_name" /></div>
            </div>
            <div><Label>Amount *</Label><Input name="amount" type="number" step="0.01" required /></div>
            <div><Label>Reason *</Label><Textarea name="reason" required rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reserve Dialog */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Contingency Reserve</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateReserve} className="space-y-4">
            <div>
              <Label>Reserve Type *</Label>
              <Select name="reserve_type" defaultValue="contingency_reserve">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="management_reserve">Management Reserve (MR)</SelectItem>
                  <SelectItem value="contingency_reserve">Contingency Reserve (CR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount *</Label><Input name="original_amount" type="number" step="0.01" required /></div>
            <div><Label>{t('common.description')}</Label><Textarea name="description" rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowReserveDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit">Create Reserve</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Commitment Dialog */}
      <Dialog open={showCommitmentDialog} onOpenChange={setShowCommitmentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Track Financial Commitment</DialogTitle></DialogHeader>
          <form onSubmit={handleAddCommitment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select name="commitment_type" defaultValue="purchase_order">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase_order">Purchase Order</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="labor_booking">Labor Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference #</Label><Input name="reference_number" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Vendor</Label><Input name="vendor_name" /></div>
              <div><Label>Cost Code</Label><Input name="cost_code" /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Input name="description" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Committed Amount *</Label><Input name="committed_amount" type="number" step="0.01" required /></div>
              <div><Label>Invoiced So Far</Label><Input name="invoiced_amount" type="number" step="0.01" defaultValue="0" /></div>
            </div>
            <div><Label>Expected Invoice Date</Label><Input name="expected_invoice_date" type="date" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCommitmentDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit">Track Commitment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
