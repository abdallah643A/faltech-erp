import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Building2, TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle,
  FileText, Clock, ShoppingCart, Briefcase, BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

export default function BranchCompanyHealthDashboard() {
  const { profile } = useAuth();
  const activeCompanyId = (profile as any)?.active_company_id;
  const [viewLevel, setViewLevel] = useState<'company' | 'branch'>('branch');

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['health-branches', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('branches').select('id, name, code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Fetch sales metrics by branch
  const { data: salesByBranch = [] } = useQuery({
    queryKey: ['health-sales', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('branch_id, total, status, doc_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      if (!data) return [];
      const map = new Map<string, { total: number; count: number; open: number }>();
      data.forEach(so => {
        const key = so.branch_id || 'unassigned';
        const cur = map.get(key) || { total: 0, count: 0, open: 0 };
        cur.total += so.total || 0;
        cur.count++;
        if (so.status === 'open' || so.status === 'pending') cur.open++;
        map.set(key, cur);
      });
      return Array.from(map.entries()).map(([branchId, stats]) => ({
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unassigned',
        ...stats,
      }));
    },
    enabled: branches.length > 0,
  });

  // Fetch receivables
  const { data: receivables = [] } = useQuery({
    queryKey: ['health-receivables', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('branch_id, total, paid_amount, balance_due, status, doc_due_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      if (!data) return [];
      const map = new Map<string, { totalReceivable: number; overdue: number; overdueCount: number }>();
      const now = new Date();
      data.forEach(inv => {
        const key = inv.branch_id || 'unassigned';
        const cur = map.get(key) || { totalReceivable: 0, overdue: 0, overdueCount: 0 };
        const balance = inv.balance_due || (inv.total || 0) - (inv.paid_amount || 0);
        if (balance > 0) {
          cur.totalReceivable += balance;
          if (inv.doc_due_date && new Date(inv.doc_due_date) < now) {
            cur.overdue += balance;
            cur.overdueCount++;
          }
        }
        map.set(key, cur);
      });
      return Array.from(map.entries()).map(([branchId, stats]) => ({
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unassigned',
        ...stats,
      }));
    },
    enabled: branches.length > 0,
  });

  // Fetch procurement spend
  const { data: procurementByBranch = [] } = useQuery({
    queryKey: ['health-procurement', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_orders').select('branch_id, total, status');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      if (!data) return [];
      const map = new Map<string, { spend: number; count: number; pending: number }>();
      data.forEach(po => {
        const key = po.branch_id || 'unassigned';
        const cur = map.get(key) || { spend: 0, count: 0, pending: 0 };
        cur.spend += po.total || 0;
        cur.count++;
        if (po.status === 'pending' || po.status === 'open') cur.pending++;
        map.set(key, cur);
      });
      return Array.from(map.entries()).map(([branchId, stats]) => ({
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unassigned',
        ...stats,
      }));
    },
    enabled: branches.length > 0,
  });

  // Attendance issues
  const { data: attendanceIssues = [] } = useQuery({
    queryKey: ['health-attendance', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('attendance').select('company_id, status, employee_id').eq('status', 'absent');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(500);
      if (!data) return [];
      const map = new Map<string, number>();
      data.forEach(r => {
        const key = (r as any).company_id || 'unassigned';
        map.set(key, (map.get(key) || 0) + 1);
      });
      return Array.from(map.entries()).map(([branchId, absentCount]) => ({
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unassigned',
        absentCount,
      }));
    },
    enabled: branches.length > 0,
  });

  // Compose chart data
  const chartData = branches.map(b => {
    const sales = salesByBranch.find(s => s.branchId === b.id);
    const recv = receivables.find(r => r.branchId === b.id);
    const proc = procurementByBranch.find(p => p.branchId === b.id);
    return {
      name: b.name || b.code || 'N/A',
      sales: sales?.total || 0,
      procurement: proc?.spend || 0,
      overdue: recv?.overdue || 0,
    };
  });

  const totalSales = salesByBranch.reduce((a, b) => a + b.total, 0);
  const totalOverdue = receivables.reduce((a, b) => a + b.overdue, 0);
  const totalProcurement = procurementByBranch.reduce((a, b) => a + b.spend, 0);
  const totalAbsent = attendanceIssues.reduce((a, b) => a + b.absentCount, 0);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold">Branch & Company Health</h1>
          <p className="text-xs text-muted-foreground">Cross-functional performance by branch</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Total Sales</div>
            <p className="text-xl font-bold mt-1">{fmt(totalSales)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Overdue AR</div>
            <p className="text-xl font-bold mt-1 text-destructive">{fmt(totalOverdue)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="h-3.5 w-3.5" /> Procurement</div>
            <p className="text-xl font-bold mt-1">{fmt(totalProcurement)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5 text-warning" /> Absent Today</div>
            <p className="text-xl font-bold mt-1">{totalAbsent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Branch Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => fmt(v) + ' SAR'} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" radius={[4, 4, 0, 0]} />
              <Bar dataKey="procurement" fill="hsl(var(--info))" name="Procurement" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" fill="hsl(var(--destructive))" name="Overdue AR" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Branch Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {branches.map(branch => {
          const sales = salesByBranch.find(s => s.branchId === branch.id);
          const recv = receivables.find(r => r.branchId === branch.id);
          const proc = procurementByBranch.find(p => p.branchId === branch.id);
          const absent = attendanceIssues.find(a => a.branchId === branch.id);
          const overdueRatio = recv && recv.totalReceivable > 0 ? (recv.overdue / recv.totalReceivable * 100) : 0;
          const health = overdueRatio > 50 ? 'critical' : overdueRatio > 25 ? 'warning' : 'healthy';

          return (
            <Card key={branch.id} className={health === 'critical' ? 'border-destructive/30' : health === 'warning' ? 'border-warning/30' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">{branch.name}</CardTitle>
                  <Badge variant={health === 'critical' ? 'destructive' : health === 'warning' ? 'outline' : 'default'} className="text-[10px] ml-auto">
                    {health}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales</span>
                  <span className="font-medium">{fmt(sales?.total || 0)} SAR ({sales?.count || 0} orders)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Procurement</span>
                  <span className="font-medium">{fmt(proc?.spend || 0)} SAR ({proc?.pending || 0} pending)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receivables</span>
                  <span className="font-medium">{fmt(recv?.totalReceivable || 0)} SAR</span>
                </div>
                {recv && recv.overdue > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Overdue ({recv.overdueCount})</span>
                    <span className="font-medium">{fmt(recv.overdue)} SAR</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Absent Staff</span>
                  <span className="font-medium">{absent?.absentCount || 0}</span>
                </div>
                {recv && recv.totalReceivable > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Collection Health</span>
                      <span>{(100 - overdueRatio).toFixed(0)}%</span>
                    </div>
                    <Progress value={100 - overdueRatio} className="h-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
