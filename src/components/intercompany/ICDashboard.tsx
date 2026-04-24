import { useICTransactions, useICExceptions, useICSettlements } from '@/hooks/useIntercompany';
import { useICRelationships } from '@/hooks/useIntercompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, AlertTriangle, CheckCircle, Clock, DollarSign, Link2 } from 'lucide-react';

export default function ICDashboard() {
  const { t } = useLanguage();
  const { transactions } = useICTransactions();
  const { exceptions } = useICExceptions();
  const { settlements } = useICSettlements();
  const { relationships } = useICRelationships();

  const pending = transactions.filter((tx: any) => tx.mirror_status === 'pending').length;
  const completed = transactions.filter((tx: any) => tx.mirror_status === 'completed').length;
  const failed = transactions.filter((tx: any) => tx.mirror_status === 'failed').length;
  const openExceptions = exceptions.filter((e: any) => e.status === 'open').length;
  const totalVolume = transactions.reduce((s: number, tx: any) => s + Number(tx.total_amount || 0), 0);
  const activeRelationships = relationships.filter((r: any) => r.is_active).length;

  const stats = [
    { label: t('ic.activeRelationships'), value: activeRelationships, icon: Link2, color: 'text-blue-500' },
    { label: t('ic.totalTransactions'), value: transactions.length, icon: ArrowLeftRight, color: 'text-primary' },
    { label: t('ic.pending'), value: pending, icon: Clock, color: 'text-amber-500' },
    { label: t('ic.completed'), value: completed, icon: CheckCircle, color: 'text-green-500' },
    { label: t('ic.failed'), value: failed, icon: AlertTriangle, color: 'text-destructive' },
    { label: t('ic.openExceptions'), value: openExceptions, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ic.recentTransactions')}</CardTitle></CardHeader>
          <CardContent>
            {transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{tx.transaction_number}</p>
                  <p className="text-xs text-muted-foreground">{tx.transaction_type?.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{Number(tx.total_amount || 0).toLocaleString()}</p>
                  <Badge variant={tx.mirror_status === 'completed' ? 'default' : tx.mirror_status === 'failed' ? 'destructive' : 'outline'} className="text-[10px]">{tx.mirror_status}</Badge>
                </div>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">{t('ic.noTransactions')}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ic.recentExceptions')}</CardTitle></CardHeader>
          <CardContent>
            {exceptions.filter((e: any) => e.status === 'open').slice(0, 5).map((ex: any) => (
              <div key={ex.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{ex.title}</p>
                  <p className="text-xs text-muted-foreground">{ex.exception_type?.replace(/_/g, ' ')}</p>
                </div>
                <Badge variant={ex.severity === 'critical' ? 'destructive' : 'secondary'}>{ex.severity}</Badge>
              </div>
            ))}
            {exceptions.filter((e: any) => e.status === 'open').length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">{t('ic.noExceptions')}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
