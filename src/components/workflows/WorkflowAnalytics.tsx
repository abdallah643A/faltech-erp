import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Clock, CheckCircle2, XCircle, TrendingUp, Users, Layers } from 'lucide-react';
import { format } from 'date-fns';

interface WorkflowAnalyticsProps {
  requests: any[];
  templates: any[];
  isAr: boolean;
}

export default function WorkflowAnalytics({ requests, templates, isAr }: WorkflowAnalyticsProps) {
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Avg approval time (days) for approved requests
  const approvedWithTime = requests.filter(r => r.status === 'approved' && r.final_approved_at && r.created_at);
  const avgApprovalDays = approvedWithTime.length > 0
    ? (approvedWithTime.reduce((sum, r) => {
        const diff = new Date(r.final_approved_at).getTime() - new Date(r.created_at).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0) / approvedWithTime.length).toFixed(1)
    : '—';

  // Status distribution for pie chart
  const statusData = [
    { name: isAr ? 'قيد الانتظار' : 'Pending', value: pending, color: 'hsl(var(--chart-3))' },
    { name: isAr ? 'معتمد' : 'Approved', value: approved, color: 'hsl(var(--chart-2))' },
    { name: isAr ? 'مرفوض' : 'Rejected', value: rejected, color: 'hsl(var(--chart-5))' },
  ].filter(d => d.value > 0);

  // By document type
  const byDocType = requests.reduce((acc: any, r: any) => {
    acc[r.document_type] = (acc[r.document_type] || 0) + 1;
    return acc;
  }, {});
  const docTypeData = Object.entries(byDocType).map(([name, value]) => ({ name, value }));

  // Recent activity (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const label = format(d, 'EEE');
    const count = requests.filter(r => r.created_at?.startsWith(dateStr)).length;
    return { name: label, count };
  });

  // Top bottleneck stages
  const pendingByStage = requests
    .filter(r => r.status === 'pending')
    .reduce((acc: any, r: any) => {
      const key = `Stage ${r.current_stage}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const bottleneckData = Object.entries(pendingByStage)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: isAr ? 'إجمالي الطلبات' : 'Total Requests', value: total, icon: Layers, color: 'text-primary' },
          { label: isAr ? 'قيد الانتظار' : 'Pending', value: pending, icon: Clock, color: 'text-amber-600' },
          { label: isAr ? 'معتمد' : 'Approved', value: approved, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: isAr ? 'مرفوض' : 'Rejected', value: rejected, icon: XCircle, color: 'text-destructive' },
          { label: isAr ? 'معدل الموافقة' : 'Approval Rate', value: `${approvalRate}%`, icon: TrendingUp, color: 'text-primary' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
              </div>
              <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'توزيع الحالات' : 'Status Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px]">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'النشاط الأسبوعي' : 'Weekly Activity'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Document Type */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'حسب نوع المستند' : 'By Document Type'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docTypeData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'اختناقات' : 'Bottleneck Stages'}</CardTitle></CardHeader>
          <CardContent>
            {bottleneckData.length > 0 ? (
              <div className="space-y-2">
                {bottleneckData.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-xs">{b.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{b.count as number} {isAr ? 'معلق' : 'pending'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">{isAr ? 'لا توجد اختناقات' : 'No bottlenecks detected'}</p>
            )}
            <div className="mt-4 p-2 bg-muted/30 rounded">
              <p className="text-[10px] text-muted-foreground">{isAr ? 'متوسط وقت الموافقة' : 'Avg. Approval Time'}</p>
              <p className="text-sm font-bold">{avgApprovalDays} {isAr ? 'أيام' : 'days'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
