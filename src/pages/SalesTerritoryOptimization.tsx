import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { MapPin, Users, BarChart2, TrendingUp, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function SalesTerritoryOptimization() {
  const { t } = useLanguage();

  const { activeCompanyId } = useActiveCompany();

  const { data: salesReps = [] } = useQuery({
    queryKey: ['reps-territory', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, email');
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-territory', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('branches').select('id, name, code, city');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opp-territory', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('opportunities').select('id, owner_id, owner_name, value, stage');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['inv-territory', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('sales_rep_id, branch_id, total');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
  });

  const repPerformance = useMemo(() => {
    return salesReps.map((rep: any) => {
      const repOpps = opportunities.filter((o: any) => o.owner_id === rep.user_id);
      const repInv = invoices.filter((i: any) => i.sales_rep_id === rep.user_id);
      const totalPipeline = repOpps.reduce((s: number, o: any) => s + (o.value || 0), 0);
      const totalRevenue = repInv.reduce((s: number, i: any) => s + (i.total || 0), 0);
      const dealCount = repOpps.length;
      const invoiceCount = repInv.length;
      const workload = dealCount + invoiceCount;
      const utilization = Math.min(100, workload * 8);

      return {
        id: rep.user_id, name: rep.full_name || rep.email,
        totalPipeline, totalRevenue, dealCount, invoiceCount, workload, utilization,
      };
    }).filter(r => r.workload > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [salesReps, opportunities, invoices]);

  const branchPerformance = useMemo(() => {
    return branches.map((b: any) => {
      const branchInv = invoices.filter((i: any) => i.branch_id === b.id);
      const revenue = branchInv.reduce((s: number, i: any) => s + (i.total || 0), 0);
      return { name: b.name || b.code, city: b.city, revenue, invoiceCount: branchInv.length };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [branches, invoices]);

  const avgWorkload = repPerformance.length > 0 ? Math.round(repPerformance.reduce((s, r) => s + r.workload, 0) / repPerformance.length) : 0;
  const overloaded = repPerformance.filter(r => r.utilization > 80).length;
  const underloaded = repPerformance.filter(r => r.utilization < 30).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales Territory Optimization</h1>
        <p className="text-muted-foreground">Optimize territory assignments based on skills, location & workload</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TooltipProvider>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{repPerformance.length}</div>
              <p className="text-sm text-muted-foreground">Active Reps</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Sales reps with at least one deal or invoice</p></TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <Briefcase className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{avgWorkload}</div>
              <p className="text-sm text-muted-foreground">Avg Workload</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Average deals + invoices per rep</p></TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{overloaded}</div>
              <p className="text-sm text-muted-foreground">Overloaded</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Reps with utilization above 80%</p></TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <BarChart2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{underloaded}</div>
              <p className="text-sm text-muted-foreground">Underloaded</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Reps with utilization below 30% — available for more work</p></TooltipContent></UITooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Revenue by Rep</CardTitle></CardHeader>
          <CardContent className="h-64">
            {repPerformance.length === 0 ? (
              <EmptyChartState message="No revenue data available" height={240} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repPerformance.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue by Branch</CardTitle></CardHeader>
          <CardContent className="h-64">
            {branchPerformance.length === 0 ? (
              <EmptyChartState message="No branch data available" height={240} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={branchPerformance.slice(0, 7)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {branchPerformance.slice(0, 7).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Rep Workload & Utilization</h2>
        {repPerformance.map(rep => (
          <Card key={rep.id}>
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{rep.name}</span>
                  <Badge variant="outline" className="text-xs">{rep.dealCount} deals</Badge>
                  <Badge variant="outline" className="text-xs">{rep.invoiceCount} invoices</Badge>
                  {rep.utilization > 80 && <Badge className="bg-red-500/10 text-red-600 text-xs">Overloaded</Badge>}
                  {rep.utilization < 30 && <Badge className="bg-blue-500/10 text-blue-600 text-xs">Available</Badge>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Pipeline: {rep.totalPipeline.toLocaleString()}</span>
                  <span>Revenue: {rep.totalRevenue.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-40">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-medium text-foreground">{rep.utilization}%</span>
                </div>
                <Progress value={rep.utilization} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
        {repPerformance.length === 0 && <p className="text-center text-muted-foreground py-8">No sales rep data available</p>}
      </div>
    </div>
  );
}
