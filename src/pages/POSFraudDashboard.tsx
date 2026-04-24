import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOSExceptions } from '@/hooks/usePOSExceptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, Shield, Eye, UserX, TrendingUp, XCircle, RotateCcw, CheckCircle } from 'lucide-react';

export default function POSFraudDashboard() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { exceptions, rules, riskScores, stats, isLoading, investigateException } = usePOSExceptions();
  const [tab, setTab] = useState('overview');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filtered = (exceptions || []).filter(e => severityFilter === 'all' || e.severity === severityFilter);

  const severityBadge = (s: string) => {
    switch (s) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      default: return <Badge variant="outline">Low</Badge>;
    }
  };

  const riskBadge = (r: string) => {
    switch (r) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      default: return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-destructive" />
            {t('POS Fraud & Exception Dashboard', 'لوحة الاحتيال والاستثناءات')}
          </h1>
          <p className="text-muted-foreground">{t('Monitor suspicious POS activity and cashier behavior', 'مراقبة النشاط المشبوه وسلوك الصرافين')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: t('Open Cases', 'حالات مفتوحة'), value: stats.totalOpen, icon: AlertTriangle, color: 'text-warning' },
          { label: t('Critical', 'حرجة'), value: stats.totalCritical, icon: XCircle, color: 'text-destructive' },
          { label: t('Voids', 'إلغاءات'), value: stats.totalVoids, icon: RotateCcw, color: 'text-orange-500' },
          { label: t('Refunds', 'مرتجعات'), value: stats.totalRefunds, icon: RotateCcw, color: 'text-blue-500' },
          { label: t('Overrides', 'تجاوزات'), value: stats.totalOverrides, icon: TrendingUp, color: 'text-purple-500' },
          { label: t('High Risk Cashiers', 'صرافون عالي الخطورة'), value: stats.highRiskCashiers, icon: UserX, color: 'text-destructive' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-7 w-7 ${s.color}`} /><div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('Exceptions', 'الاستثناءات')}</TabsTrigger>
          <TabsTrigger value="risk">{t('Cashier Risk', 'مخاطر الصرافين')}</TabsTrigger>
          <TabsTrigger value="rules">{t('Rules', 'القواعد')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Severity', 'جميع المستويات')}</SelectItem>
                    <SelectItem value="critical">{t('Critical', 'حرجة')}</SelectItem>
                    <SelectItem value="high">{t('High', 'عالية')}</SelectItem>
                    <SelectItem value="medium">{t('Medium', 'متوسطة')}</SelectItem>
                    <SelectItem value="low">{t('Low', 'منخفضة')}</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary">{filtered.length} {t('events', 'حدث')}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Time', 'الوقت')}</TableHead>
                      <TableHead>{t('Type', 'النوع')}</TableHead>
                      <TableHead>{t('Severity', 'الخطورة')}</TableHead>
                      <TableHead>{t('Cashier', 'الصراف')}</TableHead>
                      <TableHead>{t('Amount', 'المبلغ')}</TableHead>
                      <TableHead>{t('Status', 'الحالة')}</TableHead>
                      <TableHead>{t('Actions', 'الإجراءات')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 100).map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{new Date(e.event_timestamp).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                        <TableCell>{severityBadge(e.severity)}</TableCell>
                        <TableCell>{e.cashier_name || '-'}</TableCell>
                        <TableCell>{e.transaction_amount?.toFixed(2) || '-'}</TableCell>
                        <TableCell><Badge variant={e.status === 'open' ? 'destructive' : e.status === 'resolved' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                        <TableCell>
                          {e.status === 'open' && (
                            <Button size="sm" variant="outline" onClick={() => investigateException.mutate({ id: e.id, status: 'investigating' })}>
                              <Eye className="h-3 w-3 mr-1" />{t('Investigate', 'تحقيق')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Cashier', 'الصراف')}</TableHead>
                    <TableHead>{t('Risk Score', 'نقاط الخطورة')}</TableHead>
                    <TableHead>{t('Risk Level', 'مستوى الخطورة')}</TableHead>
                    <TableHead>{t('Voids', 'إلغاءات')}</TableHead>
                    <TableHead>{t('Refunds', 'مرتجعات')}</TableHead>
                    <TableHead>{t('Overrides', 'تجاوزات')}</TableHead>
                    <TableHead>{t('Total Exceptions', 'إجمالي الاستثناءات')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(riskScores || []).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.cashier_name}</TableCell>
                      <TableCell className="font-bold">{Number(r.risk_score).toFixed(1)}</TableCell>
                      <TableCell>{riskBadge(r.risk_level || 'low')}</TableCell>
                      <TableCell>{r.void_count}</TableCell>
                      <TableCell>{r.refund_count}</TableCell>
                      <TableCell>{r.price_override_count}</TableCell>
                      <TableCell>{r.total_exceptions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Rule', 'القاعدة')}</TableHead>
                    <TableHead>{t('Type', 'النوع')}</TableHead>
                    <TableHead>{t('Threshold', 'الحد')}</TableHead>
                    <TableHead>{t('Period', 'الفترة')}</TableHead>
                    <TableHead>{t('Severity', 'الخطورة')}</TableHead>
                    <TableHead>{t('Active', 'مفعل')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rules || []).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.rule_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.rule_type}</Badge></TableCell>
                      <TableCell>{r.threshold_value || '-'}</TableCell>
                      <TableCell>{r.threshold_period_hours}h</TableCell>
                      <TableCell>{severityBadge(r.severity)}</TableCell>
                      <TableCell>{r.is_active ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

