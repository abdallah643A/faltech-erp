import { useState, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { FolderTree, Plus, LayoutDashboard, TreePine, BarChart3, Map, Rocket } from 'lucide-react';

export default function ProcurementCategoryManagement() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['procurement-categories', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('procurement_categories' as any).select('*') as any).order('category_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: initiatives = [] } = useQuery({
    queryKey: ['sourcing-initiatives', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('sourcing_initiatives' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [catDialog, setCatDialog] = useState(false);
  const [initDialog, setInitDialog] = useState(false);

  const [catForm, setCatForm] = useState({ category_code: '', category_name: '', parent_id: '', description: '', strategy_notes: '', annual_spend_target: 0, savings_target_pct: 0, category_manager: '', risk_level: 'low' });
  const [initForm, setInitForm] = useState({ category_id: '', initiative_name: '', description: '', wave: '', target_savings: 0, start_date: '', end_date: '', owner_name: '' });

  const createCategory = useMutation({
    mutationFn: async (d: any) => {
      const payload = { ...d, company_id: activeCompanyId, created_by: user?.id };
      if (!payload.parent_id) delete payload.parent_id;
      await (supabase.from('procurement_categories' as any).insert(payload) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurement-categories'] }); setCatDialog(false); toast({ title: 'Category Created' }); },
  });

  const createInitiative = useMutation({
    mutationFn: async (d: any) => {
      const payload = { ...d, company_id: activeCompanyId, created_by: user?.id };
      if (!payload.category_id) delete payload.category_id;
      await (supabase.from('sourcing_initiatives' as any).insert(payload) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sourcing-initiatives'] }); setInitDialog(false); toast({ title: 'Initiative Created' }); },
  });

  const stats = useMemo(() => ({
    totalCategories: categories.length,
    totalSpendTarget: categories.reduce((s: number, c: any) => s + Number(c.annual_spend_target || 0), 0),
    avgSavingsTarget: categories.length > 0 ? (categories.reduce((s: number, c: any) => s + Number(c.savings_target_pct || 0), 0) / categories.length).toFixed(1) : '0',
    totalSavingsAchieved: categories.reduce((s: number, c: any) => s + Number(c.savings_achieved || 0), 0),
    highRisk: categories.filter((c: any) => c.risk_level === 'high' || c.risk_level === 'critical').length,
    activeInitiatives: initiatives.filter((i: any) => i.status === 'in_progress').length,
  }), [categories, initiatives]);

  const riskColor = (r: string) => r === 'critical' ? 'destructive' : r === 'high' ? 'destructive' : r === 'medium' ? 'secondary' : 'outline';

  // Build tree
  const roots = categories.filter((c: any) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c: any) => c.parent_id === parentId);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderTree className="h-6 w-6" /> Procurement Category Management</h1>
          <p className="text-sm text-muted-foreground">Strategic sourcing, spend analysis, and category management</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="tree" className="gap-1.5"><TreePine className="h-3.5 w-3.5" /> Category Tree</TabsTrigger>
          <TabsTrigger value="spend" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Spend Cube</TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1.5"><Map className="h-3.5 w-3.5" /> Contract Coverage</TabsTrigger>
          <TabsTrigger value="sourcing" className="gap-1.5"><Rocket className="h-3.5 w-3.5" /> Sourcing Initiatives</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Categories</div><div className="text-2xl font-bold">{stats.totalCategories}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Annual Spend Target</div><div className="text-xl font-bold">{stats.totalSpendTarget.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Savings Achieved</div><div className="text-xl font-bold text-green-600">{stats.totalSavingsAchieved.toLocaleString()} SAR</div></CardContent></Card>
            <Card className={stats.highRisk > 0 ? 'border-destructive' : ''}><CardContent className="pt-6"><div className="text-xs text-muted-foreground">High Risk Categories</div><div className="text-2xl font-bold text-destructive">{stats.highRisk}</div></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-sm">Category Overview</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Category</TableHead><TableHead>Spend Target</TableHead><TableHead>Savings Target</TableHead><TableHead>Savings Achieved</TableHead><TableHead>Suppliers</TableHead><TableHead>Contract Coverage</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-mono">{c.category_code}</TableCell>
                    <TableCell className="text-sm font-medium">{c.category_name}</TableCell>
                    <TableCell className="text-sm">{Number(c.annual_spend_target || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{c.savings_target_pct || 0}%</TableCell>
                    <TableCell className="text-sm text-green-600">{Number(c.savings_achieved || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{c.supplier_count || 0}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={Number(c.contract_coverage_pct || 0)} className="w-16 h-2" /><span className="text-xs">{c.contract_coverage_pct || 0}%</span></div></TableCell>
                    <TableCell><Badge variant={riskColor(c.risk_level) as any}>{c.risk_level}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Category Tree */}
        <TabsContent value="tree" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setCatDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Category</Button></div>
          <Card><CardContent className="pt-4">
            {roots.length > 0 ? roots.map((root: any) => (
              <div key={root.id} className="mb-4">
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <FolderTree className="h-4 w-4" />
                  <span className="font-medium text-sm">{root.category_code} - {root.category_name}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{root.category_manager || 'No manager'}</Badge>
                  <Badge variant={riskColor(root.risk_level) as any} className="text-[10px]">{root.risk_level}</Badge>
                </div>
                {getChildren(root.id).map((child: any) => (
                  <div key={child.id} className="ml-8 mt-1">
                    <div className="flex items-center gap-2 p-2 border-l-2 pl-4">
                      <span className="text-sm">{child.category_code} - {child.category_name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{child.supplier_count || 0} suppliers</Badge>
                    </div>
                    {getChildren(child.id).map((gc: any) => (
                      <div key={gc.id} className="ml-8 mt-1 flex items-center gap-2 p-1.5 pl-4 border-l">
                        <span className="text-xs text-muted-foreground">{gc.category_code} - {gc.category_name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )) : <p className="text-sm text-muted-foreground py-8 text-center">No categories configured</p>}
          </CardContent></Card>
        </TabsContent>

        {/* Spend Cube */}
        <TabsContent value="spend" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Spend by Category</CardTitle></CardHeader><CardContent>
            {categories.sort((a: any, b: any) => Number(b.annual_spend_target || 0) - Number(a.annual_spend_target || 0)).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{c.category_name}</p><p className="text-xs text-muted-foreground">Top supplier: {c.top_supplier_concentration_pct || 0}% concentration</p></div>
                <div className="text-right"><p className="text-sm font-bold">{Number(c.annual_spend_target || 0).toLocaleString()} SAR</p><p className="text-xs text-muted-foreground">{c.supplier_count || 0} suppliers</p></div>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No spend data</p>}
          </CardContent></Card>
        </TabsContent>

        {/* Contract Coverage */}
        <TabsContent value="coverage" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Contract Coverage by Category</CardTitle></CardHeader><CardContent>
            {categories.map((c: any) => {
              const cov = Number(c.contract_coverage_pct || 0);
              return (
                <div key={c.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex-1"><p className="text-sm font-medium">{c.category_name}</p></div>
                  <div className="flex items-center gap-3 w-48">
                    <Progress value={cov} className="flex-1 h-3" />
                    <span className={`text-sm font-bold w-12 text-right ${cov >= 80 ? 'text-green-600' : cov >= 50 ? 'text-orange-600' : 'text-destructive'}`}>{cov}%</span>
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No categories</p>}
          </CardContent></Card>
        </TabsContent>

        {/* Sourcing Initiatives */}
        <TabsContent value="sourcing" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setInitDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Initiative</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Initiative</TableHead><TableHead>Category</TableHead><TableHead>Wave</TableHead><TableHead>Target Savings</TableHead><TableHead>Actual Savings</TableHead><TableHead>Timeline</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {initiatives.map((i: any) => {
                  const cat = categories.find((c: any) => c.id === i.category_id);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm font-medium">{i.initiative_name}</TableCell>
                      <TableCell className="text-xs">{cat?.category_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{i.wave || '-'}</Badge></TableCell>
                      <TableCell className="text-sm">{Number(i.target_savings || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-green-600">{Number(i.actual_savings || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{i.start_date || '?'} → {i.end_date || '?'}</TableCell>
                      <TableCell className="text-xs">{i.owner_name || '-'}</TableCell>
                      <TableCell><Badge variant={i.status === 'completed' ? 'default' : i.status === 'in_progress' ? 'secondary' : 'outline'}>{i.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {initiatives.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sourcing initiatives</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Procurement Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code *</Label><Input value={catForm.category_code} onChange={e => setCatForm({ ...catForm, category_code: e.target.value })} /></div>
              <div><Label>Name *</Label><Input value={catForm.category_name} onChange={e => setCatForm({ ...catForm, category_name: e.target.value })} /></div>
            </div>
            {categories.length > 0 && <div><Label>Parent Category</Label><Select value={catForm.parent_id} onValueChange={v => setCatForm({ ...catForm, parent_id: v })}><SelectTrigger><SelectValue placeholder="None (Root)" /></SelectTrigger><SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.category_code} - {c.category_name}</SelectItem>)}</SelectContent></Select></div>}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Annual Spend Target</Label><Input type="number" value={catForm.annual_spend_target} onChange={e => setCatForm({ ...catForm, annual_spend_target: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Savings Target %</Label><Input type="number" value={catForm.savings_target_pct} onChange={e => setCatForm({ ...catForm, savings_target_pct: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category Manager</Label><Input value={catForm.category_manager} onChange={e => setCatForm({ ...catForm, category_manager: e.target.value })} /></div>
              <div><Label>Risk Level</Label><Select value={catForm.risk_level} onValueChange={v => setCatForm({ ...catForm, risk_level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Strategy Notes</Label><Textarea value={catForm.strategy_notes} onChange={e => setCatForm({ ...catForm, strategy_notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button><Button onClick={() => createCategory.mutate(catForm)} disabled={!catForm.category_code || !catForm.category_name}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Initiative Dialog */}
      <Dialog open={initDialog} onOpenChange={setInitDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Sourcing Initiative</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={initForm.initiative_name} onChange={e => setInitForm({ ...initForm, initiative_name: e.target.value })} /></div>
            {categories.length > 0 && <div><Label>Category</Label><Select value={initForm.category_id} onValueChange={v => setInitForm({ ...initForm, category_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.category_name}</SelectItem>)}</SelectContent></Select></div>}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Wave</Label><Input value={initForm.wave} onChange={e => setInitForm({ ...initForm, wave: e.target.value })} placeholder="e.g. Wave 1" /></div>
              <div><Label>Target Savings</Label><Input type="number" value={initForm.target_savings} onChange={e => setInitForm({ ...initForm, target_savings: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={initForm.start_date} onChange={e => setInitForm({ ...initForm, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={initForm.end_date} onChange={e => setInitForm({ ...initForm, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Owner</Label><Input value={initForm.owner_name} onChange={e => setInitForm({ ...initForm, owner_name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={initForm.description} onChange={e => setInitForm({ ...initForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setInitDialog(false)}>Cancel</Button><Button onClick={() => createInitiative.mutate(initForm)} disabled={!initForm.initiative_name}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
