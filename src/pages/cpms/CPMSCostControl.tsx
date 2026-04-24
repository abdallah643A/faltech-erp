import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Lock, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { useCBS, useIFRS15 } from '@/hooks/useConstructionCostControl';
import { useCPMS } from '@/hooks/useCPMS';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CostControlPage() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { items, createItem, checkBudgetLock } = useCBS(selectedProjectId);
  const { entries: ifrs15Entries, createEntry: createIFRS15 } = useIFRS15(selectedProjectId);
  const [showCBSDialog, setShowCBSDialog] = useState(false);
  const [showIFRSDialog, setShowIFRSDialog] = useState(false);
  const [cbsForm, setCbsForm] = useState({ code: '', name: '', cost_category: 'direct', budget_amount: 0, lock_threshold_pct: 10 });
  const [ifrsForm, setIfrsForm] = useState({ period: '', total_expected_cost: 0, costs_incurred_to_date: 0, contract_revenue: 0, previous_revenue_recognized: 0 });

  const cbsData = items.data || [];
  const ifrsData = ifrs15Entries.data || [];
  const totalBudget = cbsData.reduce((s: number, i: any) => s + (i.budget_amount || 0), 0);
  const totalActual = cbsData.reduce((s: number, i: any) => s + (i.actual_amount || 0), 0);
  const totalCommitted = cbsData.reduce((s: number, i: any) => s + (i.committed_amount || 0), 0);
  const lockedItems = cbsData.filter((i: any) => checkBudgetLock(i).locked);

  const handleCreateCBS = () => {
    if (!selectedProjectId) return;
    createItem.mutate({ ...cbsForm, project_id: selectedProjectId });
    setShowCBSDialog(false);
    setCbsForm({ code: '', name: '', cost_category: 'direct', budget_amount: 0, lock_threshold_pct: 10 });
  };

  const handleCreateIFRS = () => {
    if (!selectedProjectId) return;
    createIFRS15.mutate({ ...ifrsForm, project_id: selectedProjectId });
    setShowIFRSDialog(false);
    setIfrsForm({ period: '', total_expected_cost: 0, costs_incurred_to_date: 0, contract_revenue: 0, previous_revenue_recognized: 0 });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Cost Control</h1>
            <p className="text-muted-foreground">CBS, Budget vs Actual & IFRS 15 Revenue Recognition</p>
          </div>
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold text-foreground">{totalBudget.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Actual Costs</p>
            <p className="text-2xl font-bold text-foreground">{totalActual.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Committed</p>
            <p className="text-2xl font-bold text-foreground">{totalCommitted.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Locked Items</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{lockedItems.length}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="cbs">
          <TabsList>
            <TabsTrigger value="cbs">Cost Breakdown Structure</TabsTrigger>
            <TabsTrigger value="ifrs15">IFRS 15 Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="cbs" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showCBSDialog} onOpenChange={setShowCBSDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedProjectId}><Plus className="h-4 w-4 mr-2" />Add CBS Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Cost Breakdown Item</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Code</Label><Input value={cbsForm.code} onChange={e => setCbsForm({ ...cbsForm, code: e.target.value })} /></div>
                      <div><Label>{t('common.name')}</Label><Input value={cbsForm.name} onChange={e => setCbsForm({ ...cbsForm, name: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Category</Label>
                        <Select value={cbsForm.cost_category} onValueChange={v => setCbsForm({ ...cbsForm, cost_category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="indirect">Indirect</SelectItem>
                            <SelectItem value="overhead">Overhead</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Budget Amount</Label><Input type="number" value={cbsForm.budget_amount} onChange={e => setCbsForm({ ...cbsForm, budget_amount: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Lock Threshold %</Label><Input type="number" value={cbsForm.lock_threshold_pct} onChange={e => setCbsForm({ ...cbsForm, lock_threshold_pct: Number(e.target.value) })} /></div>
                    <Button onClick={handleCreateCBS} className="w-full">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Var %</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cbsData.map((item: any) => {
                    const lock = checkBudgetLock(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell><Badge variant="outline">{item.cost_category}</Badge></TableCell>
                        <TableCell className="text-right">{(item.budget_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(item.actual_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(item.variance_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(item.variance_pct || 0).toFixed(1)}%</TableCell>
                        <TableCell>
                          {lock.locked ? (
                            <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" />Locked</Badge>
                          ) : (
                            <Badge variant="secondary">{t('common.active')}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {cbsData.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Select a project and add CBS items</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="ifrs15" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showIFRSDialog} onOpenChange={setShowIFRSDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedProjectId}><FileText className="h-4 w-4 mr-2" />Record IFRS 15 Entry</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>IFRS 15 Revenue Recognition (Input Method)</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Period (YYYY-MM)</Label><Input value={ifrsForm.period} onChange={e => setIfrsForm({ ...ifrsForm, period: e.target.value })} placeholder="2026-03" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Total Expected Cost</Label><Input type="number" value={ifrsForm.total_expected_cost} onChange={e => setIfrsForm({ ...ifrsForm, total_expected_cost: Number(e.target.value) })} /></div>
                      <div><Label>Costs Incurred To Date</Label><Input type="number" value={ifrsForm.costs_incurred_to_date} onChange={e => setIfrsForm({ ...ifrsForm, costs_incurred_to_date: Number(e.target.value) })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Contract Revenue</Label><Input type="number" value={ifrsForm.contract_revenue} onChange={e => setIfrsForm({ ...ifrsForm, contract_revenue: Number(e.target.value) })} /></div>
                      <div><Label>Previous Revenue Recognized</Label><Input type="number" value={ifrsForm.previous_revenue_recognized} onChange={e => setIfrsForm({ ...ifrsForm, previous_revenue_recognized: Number(e.target.value) })} /></div>
                    </div>
                    {ifrsForm.total_expected_cost > 0 && (
                      <Card className="bg-muted p-3">
                        <p className="text-sm">% Complete: <strong>{((ifrsForm.costs_incurred_to_date / ifrsForm.total_expected_cost) * 100).toFixed(1)}%</strong></p>
                        <p className="text-sm">Revenue to Recognize: <strong>{(ifrsForm.contract_revenue * (ifrsForm.costs_incurred_to_date / ifrsForm.total_expected_cost) - ifrsForm.previous_revenue_recognized).toLocaleString()}</strong></p>
                      </Card>
                    )}
                    <Button onClick={handleCreateIFRS} className="w-full">Record Entry</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Expected Cost</TableHead>
                    <TableHead className="text-right">Costs Incurred</TableHead>
                    <TableHead className="text-right">% Complete</TableHead>
                    <TableHead className="text-right">Revenue Recognized</TableHead>
                    <TableHead className="text-right">This Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ifrsData.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.period}</TableCell>
                      <TableCell className="text-right">{(e.total_expected_cost || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(e.costs_incurred_to_date || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(e.pct_complete || 0).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{(e.revenue_recognized || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{(e.revenue_this_period || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {ifrsData.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No IFRS 15 entries yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
