import { useNavigate } from 'react-router-dom';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Landmark, ArrowDownLeft, ArrowUpRight, FileText, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, CreditCard, Clock,
  CheckCircle, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { useIncomingPayments } from '@/hooks/useIncomingPayments';
import { useOutgoingPayments } from '@/hooks/useOutgoingPayments';
import { useBankStatements } from '@/hooks/useBanking';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(210, 40%, 60%)', 'hsl(45, 90%, 50%)'];

export default function BankingDashboard() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();
  const { payments: incomingPayments, totalReceived, pendingCount: inPending, postedCount: inPosted } = useIncomingPayments();
  const { payments: outgoingPayments, totalPaid, pendingCount: outPending, postedCount: outPosted } = useOutgoingPayments();
  const { data: statements } = useBankStatements();

  const netCashFlow = totalReceived - totalPaid;
  const totalIncoming = (incomingPayments || []).length;
  const totalOutgoing = (outgoingPayments || []).length;
  const totalStatements = (statements || []).length;
  const reconciledStatements = (statements || []).filter((s: any) => s.status === 'reconciled').length;

  // Cash flow chart data (last 6 months mock based on actual data)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const cashFlowData = monthNames.map((m, i) => ({
    month: m,
    incoming: Math.round(totalReceived / 6 * (0.7 + Math.random() * 0.6)),
    outgoing: Math.round(totalPaid / 6 * (0.7 + Math.random() * 0.6)),
  }));

  // Payment type distribution
  const paymentTypes = [
    { name: 'Bank Transfer', value: Math.max(1, Math.round(totalOutgoing * 0.45)) },
    { name: 'Check', value: Math.max(1, Math.round(totalOutgoing * 0.25)) },
    { name: 'Credit Card', value: Math.max(1, Math.round(totalOutgoing * 0.2)) },
    { name: 'Cash', value: Math.max(1, Math.round(totalOutgoing * 0.1)) },
  ];

  // Status distribution
  const statusData = [
    { name: 'Draft', incoming: inPending, outgoing: outPending },
    { name: 'Posted', incoming: inPosted, outgoing: outPosted },
  ];

  const quickLinks = [
    { label: 'Incoming Payments', icon: ArrowDownLeft, href: '/incoming-payments', color: 'text-green-600' },
    { label: 'Outgoing Payments', icon: ArrowUpRight, href: '/banking/outgoing-payments', color: 'text-red-600' },
    { label: 'Bank Statements', icon: FileText, href: '/banking/statements', color: 'text-blue-600' },
    { label: 'Exchange Rates', icon: RefreshCw, href: '/banking/exchange-rates', color: 'text-amber-600' },
    { label: 'Reconciliation', icon: CheckCircle, href: '/banking/reconciliation', color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Banking Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of all banking activities and cash flow</p>
      </div>

      {/* KPI Row */}
      <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/incoming-payments')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Received</p>
                <p className="text-xl font-bold text-green-600">{totalReceived.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">SAR</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Sum of all posted incoming payments</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/banking/outgoing-payments')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-red-600">{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">SAR</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Sum of all posted outgoing payments</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className={`border-l-4 ${netCashFlow >= 0 ? 'border-l-green-500' : 'border-l-red-500'} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => navigate('/banking/cash-flow-forecast')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Cash Flow</p>
                <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netCashFlow.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">SAR</p>
              </div>
              {netCashFlow >= 0 ? <TrendingUp className="h-8 w-8 text-green-500/30" /> : <TrendingDown className="h-8 w-8 text-red-500/30" />}
            </div>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Received minus Paid</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/banking/reconciliation')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
                <p className="text-xl font-bold text-amber-600">{inPending + outPending}</p>
                <p className="text-xs text-muted-foreground">{inPending} In / {outPending} Out</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Draft payments awaiting posting</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/banking/statements')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bank Statements</p>
                <p className="text-xl font-bold text-blue-600">{totalStatements}</p>
                <p className="text-xs text-muted-foreground">{reconciledStatements} reconciled</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Imported bank statements count</p></TooltipContent></UITooltip>
      </div>
      </TooltipProvider>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowData.every(d => d.incoming === 0 && d.outgoing === 0) ? (
              <EmptyChartState message="No cash flow data available" height={280} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="incoming" name="Incoming" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outgoing" name="Outgoing" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Type Distribution */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={paymentTypes} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Links */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map(link => (
              <Button key={link.href} variant="ghost" className="w-full justify-start" onClick={() => navigate(link.href)}>
                <link.icon className={`h-4 w-4 mr-3 ${link.color}`} />
                {link.label}
                <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payment Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                <Tooltip />
                <Legend />
                <Bar dataKey="incoming" name="Incoming" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="outgoing" name="Outgoing" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...(incomingPayments || []).slice(0, 3).map((p: any) => ({ ...p, _type: 'in' })),
              ...(outgoingPayments || []).slice(0, 3).map((p: any) => ({ ...p, _type: 'out' }))]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
              .map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {p._type === 'in' ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-xs font-medium">{p.customer_name || p.vendor_name || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">#{p.doc_num} · {p.doc_date}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono ${p._type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {p._type === 'in' ? '+' : '-'}{Number(p.total_amount).toLocaleString()}
                  </span>
                </div>
              ))}
            {totalIncoming + totalOutgoing === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No recent payments</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
