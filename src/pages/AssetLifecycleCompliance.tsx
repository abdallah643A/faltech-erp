import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssetLifecycle } from '@/hooks/useAssetLifecycle';
import { useAssets } from '@/hooks/useAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Clock, Shield, AlertTriangle, FileCheck, Plus, CheckCircle2,
  Calendar, DollarSign, TrendingDown, ClipboardCheck, Archive,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-700',
  approved: 'bg-green-500/20 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/20 text-destructive',
  pending: 'bg-yellow-500/20 text-yellow-700',
  active: 'bg-green-500/20 text-green-700',
  expired: 'bg-destructive/20 text-destructive',
  draft: 'bg-muted text-muted-foreground',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AssetLifecycleCompliance() {
  const { t } = useLanguage();
  const { assets } = useAssets();
  const {
    retirements, insurancePolicies, impairments, complianceRecords,
    expiringInsurance, upcomingRetirements, overdueCompliance,
    totalInsurancePremiums, totalCoverageAmount, totalImpairmentLoss,
    createRetirement, approveRetirement, executeRetirement,
    createInsurance, createImpairment,
    createComplianceRecord, completeCompliance,
  } = useAssetLifecycle();

  const [retDialog, setRetDialog] = useState(false);
  const [insDialog, setInsDialog] = useState(false);
  const [impDialog, setImpDialog] = useState(false);
  const [compDialog, setCompDialog] = useState(false);
  const [retForm, setRetForm] = useState<Record<string, any>>({});
  const [insForm, setInsForm] = useState<Record<string, any>>({});
  const [impForm, setImpForm] = useState<Record<string, any>>({});
  const [compForm, setCompForm] = useState<Record<string, any>>({});

  // Charts
  const retirementByMethod = ['sale', 'scrap', 'donation', 'trade_in'].map(m => ({
    name: m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: retirements.filter(r => r.disposal_method === m).length,
  })).filter(d => d.value > 0);

  const complianceByStatus = ['pending', 'in_progress', 'completed', 'overdue'].map(s => ({
    name: s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: s === 'overdue' ? overdueCompliance.length : complianceRecords.filter(c => c.status === s).length,
  })).filter(d => d.value > 0);

  const insuranceByType = ['comprehensive', 'fire', 'theft', 'liability', 'all_risk'].map(ct => ({
    name: ct.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: insurancePolicies.filter(p => p.coverage_type === ct).length,
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.lifecycleCompliance')}</h1>
          <p className="text-sm text-muted-foreground">Retirement scheduling, insurance tracking, impairment testing & compliance audits</p>
        </div>
      </div>

      {/* Alert Banners */}
      {(expiringInsurance.length > 0 || overdueCompliance.length > 0 || upcomingRetirements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {expiringInsurance.length > 0 && (
            <Card className="border-orange-500/50 bg-orange-500/5">
              <CardContent className="pt-3 pb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{expiringInsurance.length} insurance polic{expiringInsurance.length > 1 ? 'ies' : 'y'} expiring within 30 days</span>
              </CardContent>
            </Card>
          )}
          {overdueCompliance.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-3 pb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{overdueCompliance.length} overdue compliance item{overdueCompliance.length > 1 ? 's' : ''}</span>
              </CardContent>
            </Card>
          )}
          {upcomingRetirements.length > 0 && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardContent className="pt-3 pb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{upcomingRetirements.length} retirement{upcomingRetirements.length > 1 ? 's' : ''} planned within 90 days</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Archive className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Retirements</span></div>
          <p className="text-2xl font-bold mt-1">{retirements.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Active Policies</span></div>
          <p className="text-2xl font-bold mt-1">{insurancePolicies.filter(p => p.status === 'active').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Total Premiums</span></div>
          <p className="text-2xl font-bold mt-1">{totalInsurancePremiums.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Coverage</span></div>
          <p className="text-2xl font-bold mt-1">{totalCoverageAmount.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Impairment Loss</span></div>
          <p className="text-2xl font-bold mt-1">{totalImpairmentLoss.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Compliance Items</span></div>
          <p className="text-2xl font-bold mt-1">{complianceRecords.length}</p>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Retirement by Method</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={retirementByMethod.length > 0 ? retirementByMethod : [{ name: 'None', value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {(retirementByMethod.length > 0 ? retirementByMethod : [{ name: 'None', value: 1 }]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complianceByStatus.length > 0 ? complianceByStatus : [{ name: 'No Data', value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Insurance by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={insuranceByType.length > 0 ? insuranceByType : [{ name: 'None', value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {(insuranceByType.length > 0 ? insuranceByType : [{ name: 'None', value: 1 }]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="retirement">
        <TabsList>
          <TabsTrigger value="retirement"><Archive className="h-3 w-3 mr-1" /> Retirement</TabsTrigger>
          <TabsTrigger value="insurance"><Shield className="h-3 w-3 mr-1" /> Insurance</TabsTrigger>
          <TabsTrigger value="impairment"><TrendingDown className="h-3 w-3 mr-1" /> Impairment</TabsTrigger>
          <TabsTrigger value="compliance"><FileCheck className="h-3 w-3 mr-1" /> Compliance</TabsTrigger>
        </TabsList>

        {/* Retirement Tab */}
        <TabsContent value="retirement">
          <div className="flex justify-end mb-3">
            <Dialog open={retDialog} onOpenChange={setRetDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Schedule Retirement</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Asset Retirement</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Asset</Label>
                    <Select onValueChange={v => setRetForm({ ...retForm, asset_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Retirement Date</Label><Input type="date" value={retForm.planned_retirement_date || ''} onChange={e => setRetForm({ ...retForm, planned_retirement_date: e.target.value })} /></div>
                    <div><Label>Disposal Method</Label>
                      <Select onValueChange={v => setRetForm({ ...retForm, disposal_method: v })}>
                        <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">Sale</SelectItem>
                          <SelectItem value="scrap">Scrap</SelectItem>
                          <SelectItem value="donation">Donation</SelectItem>
                          <SelectItem value="trade_in">Trade-In</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Est. Salvage Value</Label><Input type="number" value={retForm.estimated_salvage_value || ''} onChange={e => setRetForm({ ...retForm, estimated_salvage_value: +e.target.value })} /></div>
                    <div><Label>Compliance Deadline</Label><Input type="date" value={retForm.compliance_deadline || ''} onChange={e => setRetForm({ ...retForm, compliance_deadline: e.target.value })} /></div>
                  </div>
                  <div><Label>Reason</Label><Textarea value={retForm.retirement_reason || ''} onChange={e => setRetForm({ ...retForm, retirement_reason: e.target.value })} /></div>
                  <Button onClick={() => { createRetirement.mutate(retForm); setRetDialog(false); setRetForm({}); }} disabled={!retForm.asset_id || !retForm.planned_retirement_date}>Schedule</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Asset</TableHead><TableHead>Retirement Date</TableHead><TableHead>Method</TableHead>
                <TableHead>Salvage Value</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {retirements.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No retirements scheduled</TableCell></TableRow>}
                {retirements.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.assets?.asset_code} - {r.assets?.name}</TableCell>
                    <TableCell>{r.planned_retirement_date}</TableCell>
                    <TableCell><Badge variant="outline">{r.disposal_method}</Badge></TableCell>
                    <TableCell>{r.estimated_salvage_value.toLocaleString()} SAR</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => approveRetirement.mutate(r.id)}>Approve</Button>}
                        {r.status === 'approved' && <Button size="sm" variant="outline" onClick={() => executeRetirement.mutate({ id: r.id, asset_id: r.asset_id })}>Execute</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance">
          <div className="flex justify-end mb-3">
            <Dialog open={insDialog} onOpenChange={setInsDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Policy</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Asset</Label>
                    <Select onValueChange={v => setInsForm({ ...insForm, asset_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Policy Number</Label><Input value={insForm.policy_number || ''} onChange={e => setInsForm({ ...insForm, policy_number: e.target.value })} /></div>
                    <div><Label>Provider</Label><Input value={insForm.provider || ''} onChange={e => setInsForm({ ...insForm, provider: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Coverage Type</Label>
                      <Select onValueChange={v => setInsForm({ ...insForm, coverage_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                          <SelectItem value="fire">Fire</SelectItem>
                          <SelectItem value="theft">Theft</SelectItem>
                          <SelectItem value="liability">Liability</SelectItem>
                          <SelectItem value="all_risk">All Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Premium</Label><Input type="number" value={insForm.premium_amount || ''} onChange={e => setInsForm({ ...insForm, premium_amount: +e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Coverage Amount</Label><Input type="number" value={insForm.coverage_amount || ''} onChange={e => setInsForm({ ...insForm, coverage_amount: +e.target.value })} /></div>
                    <div><Label>Deductible</Label><Input type="number" value={insForm.deductible || ''} onChange={e => setInsForm({ ...insForm, deductible: +e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Date</Label><Input type="date" value={insForm.start_date || ''} onChange={e => setInsForm({ ...insForm, start_date: e.target.value })} /></div>
                    <div><Label>End Date</Label><Input type="date" value={insForm.end_date || ''} onChange={e => setInsForm({ ...insForm, end_date: e.target.value })} /></div>
                  </div>
                  <Button onClick={() => { createInsurance.mutate(insForm); setInsDialog(false); setInsForm({}); }} disabled={!insForm.asset_id || !insForm.policy_number || !insForm.provider || !insForm.start_date || !insForm.end_date}>Add Policy</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Asset</TableHead><TableHead>Policy #</TableHead><TableHead>Provider</TableHead>
                <TableHead>Type</TableHead><TableHead>Premium</TableHead><TableHead>Coverage</TableHead>
                <TableHead>Expiry</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {insurancePolicies.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No insurance policies</TableCell></TableRow>}
                {insurancePolicies.map(p => {
                  const daysLeft = Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000);
                  const isExpiring = daysLeft >= 0 && daysLeft <= 30;
                  const isExpired = daysLeft < 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{p.assets?.asset_code} - {p.assets?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.policy_number}</TableCell>
                      <TableCell>{p.provider}</TableCell>
                      <TableCell><Badge variant="outline">{p.coverage_type}</Badge></TableCell>
                      <TableCell>{p.premium_amount.toLocaleString()} SAR</TableCell>
                      <TableCell>{p.coverage_amount.toLocaleString()} SAR</TableCell>
                      <TableCell>
                        <span className={isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-orange-500 font-medium' : ''}>{p.end_date}</span>
                        {isExpiring && <span className="text-xs text-orange-500 ml-1">({daysLeft}d)</span>}
                      </TableCell>
                      <TableCell><Badge className={STATUS_COLORS[isExpired ? 'expired' : p.status]}>{isExpired ? 'expired' : p.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Impairment Tab */}
        <TabsContent value="impairment">
          <div className="flex justify-end mb-3">
            <Dialog open={impDialog} onOpenChange={setImpDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Impairment Test</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Impairment Test</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Asset</Label>
                    <Select onValueChange={v => {
                      const asset = assets.find(a => a.id === v);
                      setImpForm({ ...impForm, asset_id: v, book_value_before: asset?.current_value || asset?.purchase_value || 0 });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name} (BV: {(a.current_value || a.purchase_value || 0).toLocaleString()})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Test Date</Label><Input type="date" value={impForm.test_date || ''} onChange={e => setImpForm({ ...impForm, test_date: e.target.value })} /></div>
                    <div><Label>Book Value</Label><Input type="number" value={impForm.book_value_before || ''} onChange={e => setImpForm({ ...impForm, book_value_before: +e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Fair Value</Label><Input type="number" value={impForm.fair_value || ''} onChange={e => setImpForm({ ...impForm, fair_value: +e.target.value })} /></div>
                    <div><Label>Value in Use</Label><Input type="number" value={impForm.value_in_use || ''} onChange={e => setImpForm({ ...impForm, value_in_use: +e.target.value })} /></div>
                  </div>
                  <div><Label>Reason</Label><Textarea value={impForm.reason || ''} onChange={e => setImpForm({ ...impForm, reason: e.target.value })} /></div>
                  {impForm.book_value_before > 0 && (impForm.fair_value > 0 || impForm.value_in_use > 0) && (
                    <div className="p-3 bg-muted/50 rounded text-sm">
                      <p>Recoverable: <strong>{Math.max(impForm.fair_value || 0, impForm.value_in_use || 0).toLocaleString()}</strong></p>
                      <p>Impairment Loss: <strong className="text-destructive">{Math.max(0, (impForm.book_value_before || 0) - Math.max(impForm.fair_value || 0, impForm.value_in_use || 0)).toLocaleString()}</strong></p>
                    </div>
                  )}
                  <Button onClick={() => { createImpairment.mutate(impForm); setImpDialog(false); setImpForm({}); }} disabled={!impForm.asset_id || !impForm.test_date}>Record Test</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Asset</TableHead><TableHead>Test Date</TableHead><TableHead>Book Value</TableHead>
                <TableHead>Fair Value</TableHead><TableHead>Recoverable</TableHead><TableHead>Impairment Loss</TableHead>
                <TableHead>After</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {impairments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No impairment tests</TableCell></TableRow>}
                {impairments.map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-xs">{imp.assets?.asset_code} - {imp.assets?.name}</TableCell>
                    <TableCell>{imp.test_date}</TableCell>
                    <TableCell>{imp.book_value_before.toLocaleString()}</TableCell>
                    <TableCell>{imp.fair_value.toLocaleString()}</TableCell>
                    <TableCell>{imp.recoverable_amount.toLocaleString()}</TableCell>
                    <TableCell className={imp.impairment_loss > 0 ? 'text-destructive font-medium' : ''}>{imp.impairment_loss.toLocaleString()}</TableCell>
                    <TableCell>{imp.book_value_after.toLocaleString()}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[imp.status]}>{imp.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="flex justify-end mb-3">
            <Dialog open={compDialog} onOpenChange={setCompDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Record</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Compliance Record</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Asset (optional)</Label>
                    <Select onValueChange={v => setCompForm({ ...compForm, asset_id: v === 'none' ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General (no asset)</SelectItem>
                        {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Title</Label><Input value={compForm.title || ''} onChange={e => setCompForm({ ...compForm, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select onValueChange={v => setCompForm({ ...compForm, record_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="audit">Audit</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="certification">Certification</SelectItem>
                          <SelectItem value="regulatory">Regulatory</SelectItem>
                          <SelectItem value="tax">Tax</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Due Date</Label><Input type="date" value={compForm.due_date || ''} onChange={e => setCompForm({ ...compForm, due_date: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Regulatory Body</Label><Input value={compForm.regulatory_body || ''} onChange={e => setCompForm({ ...compForm, regulatory_body: e.target.value })} /></div>
                    <div><Label>Assigned To</Label><Input value={compForm.assigned_to_name || ''} onChange={e => setCompForm({ ...compForm, assigned_to_name: e.target.value })} /></div>
                  </div>
                  <div><Label>Description</Label><Textarea value={compForm.description || ''} onChange={e => setCompForm({ ...compForm, description: e.target.value })} /></div>
                  <Button onClick={() => { createComplianceRecord.mutate(compForm); setCompDialog(false); setCompForm({}); }} disabled={!compForm.title}>Create Record</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Asset</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead>
                <TableHead>Regulatory Body</TableHead><TableHead>Due Date</TableHead><TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {complianceRecords.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No compliance records</TableCell></TableRow>}
                {complianceRecords.map(c => {
                  const isOverdue = c.status !== 'completed' && c.due_date && new Date(c.due_date) < new Date();
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{c.assets?.asset_code ? `${c.assets.asset_code} - ${c.assets.name}` : 'General'}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell><Badge variant="outline">{c.record_type}</Badge></TableCell>
                      <TableCell className="text-xs">{c.regulatory_body || '-'}</TableCell>
                      <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>{c.due_date || '-'}</TableCell>
                      <TableCell className="text-xs">{c.assigned_to_name || '-'}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[isOverdue ? 'cancelled' : c.status]}>{isOverdue ? 'overdue' : c.status}</Badge></TableCell>
                      <TableCell>
                        {c.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => completeCompliance.mutate({ id: c.id })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
