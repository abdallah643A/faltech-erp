import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FlaskConical, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const DEFAULT_ASSUMPTIONS = [
  { key: 'margin_change', label: 'Margin Change %', value: 0, min: -50, max: 50 },
  { key: 'collection_delay_days', label: 'Collection Delay (days)', value: 0, min: 0, max: 90 },
  { key: 'project_overrun_pct', label: 'Project Cost Overrun %', value: 0, min: 0, max: 50 },
  { key: 'supplier_price_change', label: 'Supplier Price Change %', value: 0, min: -20, max: 30 },
  { key: 'overtime_increase_pct', label: 'Overtime Increase %', value: 0, min: 0, max: 100 },
];

export default function ScenarioPlanning() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS.map(a => ({ ...a })));
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenario-plans', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('scenario_plans' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async () => {
      // Simulate impact calculation
      const marginChange = assumptions.find(a => a.key === 'margin_change')?.value || 0;
      const collectionDelay = assumptions.find(a => a.key === 'collection_delay_days')?.value || 0;
      const projectOverrun = assumptions.find(a => a.key === 'project_overrun_pct')?.value || 0;
      const supplierChange = assumptions.find(a => a.key === 'supplier_price_change')?.value || 0;
      const overtimeIncrease = assumptions.find(a => a.key === 'overtime_increase_pct')?.value || 0;

      const baseRevenue = 10000000;
      const baseCost = 7000000;
      const baseProfit = baseRevenue - baseCost;

      const adjustedCost = baseCost * (1 + supplierChange / 100) * (1 + projectOverrun / 100) * (1 + overtimeIncrease / 500);
      const adjustedRevenue = baseRevenue * (1 + marginChange / 100);
      const adjustedProfit = adjustedRevenue - adjustedCost;
      const cashFlowImpact = -(collectionDelay * baseRevenue / 365);

      const results = {
        base_revenue: baseRevenue, adjusted_revenue: adjustedRevenue,
        base_cost: baseCost, adjusted_cost: adjustedCost,
        base_profit: baseProfit, adjusted_profit: adjustedProfit,
        cash_flow_impact: cashFlowImpact,
        profit_change_pct: ((adjustedProfit - baseProfit) / baseProfit) * 100,
      };

      const { error } = await (supabase.from('scenario_plans' as any).insert({
        name, description, scenario_type: 'custom',
        assumptions: assumptions.map(a => ({ key: a.key, label: a.label, value: a.value })),
        results, status: 'draft', created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario-plans'] });
      toast({ title: 'Scenario created' });
      setShowNew(false);
      setName(''); setDescription('');
      setAssumptions(DEFAULT_ASSUMPTIONS.map(a => ({ ...a })));
    },
  });

  const comparisonData = scenarios
    .filter((s: any) => selectedScenarios.includes(s.id))
    .map((s: any) => ({
      name: s.name,
      Revenue: s.results?.adjusted_revenue || 0,
      Cost: s.results?.adjusted_cost || 0,
      Profit: s.results?.adjusted_profit || 0,
    }));

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><FlaskConical className="h-6 w-6" /> Scenario Planning</h1>
          <p className="text-sm text-muted-foreground">Test what-if cases and compare impact on financials</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Scenario</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create What-If Scenario</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div><Label>Scenario Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Pessimistic Q3" /></div>
              <div><Label>{t('common.description')}</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
              <div className="space-y-4">
                <p className="text-sm font-medium">Assumptions</p>
                {assumptions.map((a, i) => (
                  <div key={a.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{a.label}</span>
                      <span className="font-medium">{a.value > 0 ? '+' : ''}{a.value}{a.key.includes('days') ? ' days' : '%'}</span>
                    </div>
                    <Slider value={[a.value]} min={a.min} max={a.max} step={1}
                      onValueChange={([v]) => setAssumptions(prev => prev.map((p, j) => j === i ? { ...p, value: v } : p))} />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => createScenario.mutate()} disabled={!name}>Create & Calculate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {comparisonData.length >= 2 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Scenario Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => `SAR ${v.toLocaleString()}`} />
                <Legend /><Bar dataKey="Revenue" fill="hsl(var(--primary))" /><Bar dataKey="Cost" fill="hsl(25 95% 53%)" /><Bar dataKey="Profit" fill="hsl(142 76% 36%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-auto">
        <Table><TableHeader><TableRow>
          <TableHead className="w-8"></TableHead><TableHead>Scenario</TableHead><TableHead>{t('common.status')}</TableHead>
          <TableHead className="text-right">Adj. Revenue</TableHead><TableHead className="text-right">Adj. Cost</TableHead>
          <TableHead className="text-right">Profit Impact</TableHead><TableHead className="text-right">Cash Flow</TableHead><TableHead>Created</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {scenarios.map((s: any) => {
            const profitChange = s.results?.profit_change_pct || 0;
            return (
              <TableRow key={s.id}>
                <TableCell><input type="checkbox" checked={selectedScenarios.includes(s.id)} onChange={e => setSelectedScenarios(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} /></TableCell>
                <TableCell><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.description}</p></div></TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{s.status}</Badge></TableCell>
                <TableCell className="text-right text-sm">SAR {(s.results?.adjusted_revenue || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm">SAR {(s.results?.adjusted_cost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={`text-sm font-medium ${profitChange >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {profitChange >= 0 ? '+' : ''}{profitChange.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm">SAR {(s.results?.cash_flow_impact || 0).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{s.created_at ? format(new Date(s.created_at), 'PP') : '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody></Table>
      </div>
    </div>
  );
}
