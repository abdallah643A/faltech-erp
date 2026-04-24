import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingDown, Clock, AlertCircle, Briefcase } from 'lucide-react';
import { useCollectionCases, useDisputes, useCreditProfiles } from '@/hooks/useQuoteToCash';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--success))'];

export default function CashCollectionAnalytics() {
  const { cases, stats: caseStats } = useCollectionCases();
  const { disputes, stats: disputeStats } = useDisputes();
  const { stats: creditStats } = useCreditProfiles();

  // Mock aging buckets derived from cases
  const agingData = [
    { bucket: '0-30 days', amount: caseStats.totalOverdue * 0.4 },
    { bucket: '31-60 days', amount: caseStats.totalOverdue * 0.3 },
    { bucket: '61-90 days', amount: caseStats.totalOverdue * 0.2 },
    { bucket: '90+ days', amount: caseStats.totalOverdue * 0.1 },
  ];

  const priorityBreakdown = [
    { name: 'High', value: cases.filter((c: any) => c.priority === 'high').length },
    { name: 'Medium', value: cases.filter((c: any) => c.priority === 'medium').length },
    { name: 'Low', value: cases.filter((c: any) => c.priority === 'low').length },
  ].filter((d) => d.value > 0);

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Cash Collection Analytics</h1>
        <p className="text-sm text-muted-foreground">DSO, aging, dispute impact, collector performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Total Overdue</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{caseStats.totalOverdue.toLocaleString()} SAR</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Open Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{caseStats.open}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Active Disputes</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{disputeStats.open}</p><p className="text-xs text-muted-foreground">{disputeStats.totalAmount.toLocaleString()} SAR blocked</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Credit On Hold</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{creditStats.onHold}</p><p className="text-xs text-muted-foreground">of {creditStats.totalCustomers} customers</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Aging Waterfall</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cases by Priority</CardTitle></CardHeader>
          <CardContent>
            {priorityBreakdown.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">No cases yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={priorityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {priorityBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Key Insights</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border-l-2 border-primary pl-3">
            <p className="font-medium">DSO Trend</p>
            <p className="text-muted-foreground text-xs">{caseStats.totalCases > 0 ? 'Monitor weekly to spot deterioration' : 'No data'}</p>
          </div>
          <div className="border-l-2 border-warning pl-3">
            <p className="font-medium">Promise-to-Pay Ratio</p>
            <p className="text-muted-foreground text-xs">{caseStats.totalCases > 0 ? `${((caseStats.promised / caseStats.totalCases) * 100).toFixed(0)}% of cases have a PTP` : 'No data'}</p>
          </div>
          <div className="border-l-2 border-destructive pl-3">
            <p className="font-medium">Dispute Impact</p>
            <p className="text-muted-foreground text-xs">{disputeStats.totalAmount.toLocaleString()} SAR locked in active disputes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
