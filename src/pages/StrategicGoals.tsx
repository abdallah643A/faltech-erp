import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StrategicGoals() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ goal_name: '', category: 'sales', period_type: 'annual', period_start: new Date().getFullYear() + '-01-01', period_end: new Date().getFullYear() + '-12-31', target_value: 0, owner_name: '' });

  const { data: goals = [] } = useQuery({
    queryKey: ['strategic-goals', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('strategic_goals' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('strategic_goals' as any).insert({ ...form, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategic-goals'] }); setShowCreate(false); toast({ title: 'Goal created' }); },
  });

  const CATEGORIES = ['sales', 'margin', 'collections', 'procurement_savings', 'project_completion', 'safety', 'turnover', 'productivity', 'revenue', 'customer_acquisition'];

  const statusColor = (s: string) => s === 'on_track' ? 'default' : s === 'at_risk' ? 'destructive' : s === 'achieved' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" />Strategic Goals</h1>
          <p className="text-muted-foreground">Track annual and quarterly targets across the organization</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Goal</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Total Goals', value: goals.length, icon: Target },
          { label: 'On Track', value: goals.filter((g: any) => g.status === 'on_track').length, icon: TrendingUp },
          { label: 'At Risk', value: goals.filter((g: any) => g.status === 'at_risk').length, icon: TrendingDown },
          { label: 'Achieved', value: goals.filter((g: any) => g.status === 'achieved').length, icon: CheckCircle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-3">
        {goals.map((g: any) => {
          const pct = g.target_value > 0 ? Math.min(100, Math.round((g.actual_value / g.target_value) * 100)) : 0;
          return (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.goal_name}</span>
                    <Badge variant="outline">{g.category}</Badge>
                    <Badge variant={statusColor(g.status)}>{g.status}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{g.owner_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={pct} className="flex-1" />
                  <span className="text-sm font-bold w-12 text-right">{pct}%</span>
                  <span className="text-xs text-muted-foreground">{Number(g.actual_value).toLocaleString()} / {Number(g.target_value).toLocaleString()} {g.unit}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {goals.length === 0 && <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="py-12 text-center text-muted-foreground">No strategic goals defined yet</CardContent></Card>}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Strategic Goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Goal Name</Label><Input value={form.goal_name} onChange={e => setForm(p => ({ ...p, goal_name: e.target.value }))} placeholder="e.g. Achieve 50M SAR revenue" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Period</Label><Select value={form.period_type} onValueChange={v => setForm(p => ({ ...p, period_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="annual">Annual</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Target Value</Label><Input type="number" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => createGoal.mutate()} disabled={!form.goal_name || !form.target_value}>Create Goal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
