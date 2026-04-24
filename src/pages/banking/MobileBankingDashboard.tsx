import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, DollarSign, Clock, AlertTriangle, ArrowDownLeft, ArrowUpRight, Bell, CheckCircle, XCircle, MessageSquare, TrendingUp } from 'lucide-react';
import { useIncomingPayments } from '@/hooks/useIncomingPayments';
import { useOutgoingPayments } from '@/hooks/useOutgoingPayments';
import { useBankStatements } from '@/hooks/useBanking';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MobileBankingDashboard() {
  const { t } = useLanguage();
  const { payments: incoming, totalReceived, pendingCount: inPending } = useIncomingPayments();
  const { payments: outgoing, totalPaid, pendingCount: outPending } = useOutgoingPayments();
  const { data: statements } = useBankStatements();
  const [activeTab, setActiveTab] = useState('overview');

  const netBalance = totalReceived - totalPaid;
  const pendingApprovals = [
    { id: '1', vendor: 'Al Faisaliah Steel', amount: 45000, currency: 'SAR', dueDate: '2026-03-20', type: 'Bank Transfer', urgency: 'high' },
    { id: '2', vendor: 'Gulf Supplies Co.', amount: 12500, currency: 'SAR', dueDate: '2026-03-22', type: 'Check', urgency: 'medium' },
    { id: '3', vendor: 'National Electric', amount: 78000, currency: 'SAR', dueDate: '2026-03-18', type: 'Bank Transfer', urgency: 'critical' },
  ];

  const alerts = [
    { id: '1', type: 'warning', message: 'Cash balance projected below threshold in 5 days', time: '2h ago' },
    { id: '2', type: 'info', message: '3 reconciliation exceptions pending review', time: '4h ago' },
    { id: '3', type: 'error', message: 'Payment to Vendor X failed - insufficient funds', time: '6h ago' },
    { id: '4', type: 'success', message: 'Bank statement auto-reconciled (98% matched)', time: '1d ago' },
  ];

  const sparkData = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    balance: netBalance + (Math.random() - 0.5) * netBalance * 0.3,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mobile Banking</h1>
          <p className="text-sm text-muted-foreground">Touch-optimized banking dashboard</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="quick">Quick Pay</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Balance Cards - Touch Friendly */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <ArrowDownLeft className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Received</p>
                <p className="text-lg font-bold text-green-600">{totalReceived.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">SAR</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800">
              <CardContent className="p-4 text-center">
                <ArrowUpRight className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Paid</p>
                <p className="text-lg font-bold text-red-600">{totalPaid.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">SAR</p>
              </CardContent>
            </Card>
          </div>

          {/* Net Balance */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Net Cash Balance</span>
                <Badge variant={netBalance >= 0 ? 'default' : 'destructive'}>
                  {netBalance >= 0 ? 'Positive' : 'Negative'}
                </Badge>
              </div>
              <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netBalance.toLocaleString()} SAR
              </p>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="url(#balanceGrad)" strokeWidth={2} />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => [v.toLocaleString() + ' SAR', 'Balance']} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold">{inPending + outPending}</p>
                <p className="text-[9px] text-muted-foreground">{t('common.pending')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-500" />
                <p className="text-lg font-bold">{pendingApprovals.length}</p>
                <p className="text-[9px] text-muted-foreground">Approvals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold">{(statements || []).length}</p>
                <p className="text-[9px] text-muted-foreground">Statements</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">Swipe or tap to approve/reject payments</p>
          {pendingApprovals.map(item => (
            <Card key={item.id} className={`border-l-4 ${item.urgency === 'critical' ? 'border-l-red-500' : item.urgency === 'high' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{item.vendor}</p>
                    <p className="text-xs text-muted-foreground">{item.type} · Due {item.dueDate}</p>
                  </div>
                  <Badge variant={item.urgency === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">
                    {item.urgency}
                  </Badge>
                </div>
                <p className="text-xl font-bold mb-3">{item.amount.toLocaleString()} {item.currency}</p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1">
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-2 mt-4">
          {alerts.map(alert => (
            <Card key={alert.id}>
              <CardContent className="p-3 flex items-start gap-3">
                {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />}
                {alert.type === 'error' && <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
                {alert.type === 'info' && <Bell className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />}
                {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground">{alert.time}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="quick" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">QR Code Scanner</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="w-48 h-48 mx-auto border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center mb-4">
                <div className="text-center">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">Scan QR code to auto-populate payment details</p>
                </div>
              </div>
              <Button className="w-full">
                <Smartphone className="h-4 w-4 mr-2" /> Open Camera Scanner
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2">Supports invoice QR codes, payment references, and IBAN barcodes</p>
            </CardContent>
          </Card>

          {/* Recent scans */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { ref: 'INV-2026-0045', vendor: 'Al Rajhi Steel', amount: 23400 },
                { ref: 'PO-2026-0112', vendor: 'Saudi Electric', amount: 8900 },
              ].map((scan, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-xs font-medium">{scan.ref}</p>
                    <p className="text-[10px] text-muted-foreground">{scan.vendor}</p>
                  </div>
                  <span className="text-xs font-mono">{scan.amount.toLocaleString()} SAR</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
